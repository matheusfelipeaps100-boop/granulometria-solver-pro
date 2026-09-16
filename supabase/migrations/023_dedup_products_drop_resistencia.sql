-- Remove duplicidade de produtos (mesmo nome + tipo + dimensões cadastrados várias vezes,
-- diferindo apenas pelo MPa) e remove o campo resistencia_referencia do catálogo.
-- Motivo: a resistência prevista passou a ser informada por análise (campo
-- "Resistência Prevista (MPa)" na etapa de Identificação), evitando o erro de
-- selecionar sem querer o registro de produto com o MPa errado.
--
-- Seguro para rodar mais de uma vez (idempotente) e reversível: mantém uma cópia
-- completa da tabela products (com resistencia_referencia) em products_backup_pre_dedup
-- antes de qualquer DELETE/ALTER.

BEGIN;

-- 0) Backup de segurança (só cria se ainda não existir, para não sobrescrever
--    um backup de uma execução anterior).
CREATE TABLE IF NOT EXISTS products_backup_pre_dedup AS
SELECT * FROM products WHERE false;

INSERT INTO products_backup_pre_dedup
SELECT p.* FROM products p
WHERE NOT EXISTS (
  SELECT 1 FROM products_backup_pre_dedup b WHERE b.id = p.id
);

-- 1) Deduplicar: manter apenas 1 produto por (organization_id, nome, tipo_produto, dimensoes),
--    preferindo o registro ativo mais antigo (menor created_at) como canônico.
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY organization_id, nome, tipo_produto, COALESCE(dimensoes, '')
      ORDER BY ativo DESC, created_at ASC
    ) AS rn
  FROM products
)
DELETE FROM products
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2) Remover a coluna de resistência de referência do produto.
ALTER TABLE products DROP COLUMN IF EXISTS resistencia_referencia;

COMMIT;

-- Para conferir o resultado depois de rodar:
--   SELECT nome, tipo_produto, dimensoes, count(*) FROM products
--   GROUP BY 1,2,3 HAVING count(*) > 1;   -- deve retornar 0 linhas
--
-- Para reverter (caso algo saia errado), com o backup ainda presente:
--   BEGIN;
--   ALTER TABLE products ADD COLUMN resistencia_referencia numeric;
--   DELETE FROM products;
--   INSERT INTO products SELECT * FROM products_backup_pre_dedup;
--   COMMIT;
