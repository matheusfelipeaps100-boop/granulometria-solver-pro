-- Corrige os ensaios de rompimento lançados com força = 1.000 kN como
-- placeholder (usado enquanto não existia a opção "sem expediente"), que
-- geravam não conformidade falsa nos relatórios porque não era um resultado
-- real de ensaio, e sim um valor mínimo só para conseguir salvar a tela em
-- dias sem expediente (fins de semana).
--
-- Ação: apaga os rupture_tests/rupture_samples fabricados desses agendamentos
-- e marca o rupture_schedule correspondente como "sem_expediente", preservando
-- o motivo para rastreabilidade. Faz backup de tudo antes de apagar.

BEGIN;

-- Backup de segurança dos tests/samples que serão removidos.
CREATE TABLE IF NOT EXISTS rupture_tests_backup_placeholder_fix AS
SELECT * FROM rupture_tests WHERE false;

CREATE TABLE IF NOT EXISTS rupture_samples_backup_placeholder_fix AS
SELECT * FROM rupture_samples WHERE false;

-- Identifica os testes cujas 3 amostras têm todas força = 1.000 kN
-- (padrão de placeholder, força real nunca se repete exatamente assim
-- em 3 corpos de prova de um rompimento de verdade).
WITH testes_placeholder AS (
  SELECT rt.id AS test_id, rt.schedule_id
  FROM rupture_tests rt
  JOIN rupture_samples rs ON rs.test_id = rt.id
  GROUP BY rt.id, rt.schedule_id
  HAVING count(*) FILTER (WHERE rs.forca_kn = 1.000) = count(*)
     AND count(*) > 0
)
INSERT INTO rupture_tests_backup_placeholder_fix
SELECT rt.* FROM rupture_tests rt
JOIN testes_placeholder tp ON tp.test_id = rt.id
WHERE NOT EXISTS (
  SELECT 1 FROM rupture_tests_backup_placeholder_fix b WHERE b.id = rt.id
);

WITH testes_placeholder AS (
  SELECT rt.id AS test_id
  FROM rupture_tests rt
  JOIN rupture_samples rs ON rs.test_id = rt.id
  GROUP BY rt.id
  HAVING count(*) FILTER (WHERE rs.forca_kn = 1.000) = count(*)
     AND count(*) > 0
)
INSERT INTO rupture_samples_backup_placeholder_fix
SELECT rs.* FROM rupture_samples rs
JOIN testes_placeholder tp ON tp.test_id = rs.test_id
WHERE NOT EXISTS (
  SELECT 1 FROM rupture_samples_backup_placeholder_fix b WHERE b.id = rs.id
);

-- Marca os schedules afetados como sem_expediente (antes de apagar os tests,
-- enquanto ainda temos o schedule_id à mão).
WITH testes_placeholder AS (
  SELECT rt.id AS test_id, rt.schedule_id
  FROM rupture_tests rt
  JOIN rupture_samples rs ON rs.test_id = rt.id
  GROUP BY rt.id, rt.schedule_id
  HAVING count(*) FILTER (WHERE rs.forca_kn = 1.000) = count(*)
     AND count(*) > 0
)
UPDATE rupture_schedules sch
SET status = 'sem_expediente',
    motivo_nao_realizado = 'Rompimento caiu em dia sem expediente (fim de semana). Corrigido retroativamente — força de 1.000 kN era um valor placeholder, não um resultado real de ensaio.'
FROM testes_placeholder tp
WHERE sch.id = tp.schedule_id;

-- Remove os tests placeholder (cascade remove os samples também).
WITH testes_placeholder AS (
  SELECT rt.id AS test_id
  FROM rupture_tests rt
  JOIN rupture_samples rs ON rs.test_id = rt.id
  GROUP BY rt.id
  HAVING count(*) FILTER (WHERE rs.forca_kn = 1.000) = count(*)
     AND count(*) > 0
)
DELETE FROM rupture_tests rt
USING testes_placeholder tp
WHERE rt.id = tp.test_id;

COMMIT;

-- Para conferir depois:
--   SELECT id, status, motivo_nao_realizado FROM rupture_schedules WHERE status = 'sem_expediente';
--
-- Para reverter (com os backups ainda presentes):
--   BEGIN;
--   INSERT INTO rupture_tests SELECT * FROM rupture_tests_backup_placeholder_fix;
--   INSERT INTO rupture_samples SELECT * FROM rupture_samples_backup_placeholder_fix;
--   UPDATE rupture_schedules SET status = 'concluido', motivo_nao_realizado = NULL
--   WHERE id IN (SELECT schedule_id FROM rupture_tests_backup_placeholder_fix);
--   COMMIT;
