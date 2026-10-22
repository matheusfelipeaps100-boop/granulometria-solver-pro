-- Ao editar a data de produção de um lote (produced_at), os rupture_schedules
-- já criados mantinham a data_prevista antiga (o trigger on_batch_created só
-- roda no INSERT). Resultado: rompimentos que deveriam estar atrasados seguiam
-- como "pendente" porque a data prevista ainda apontava para o futuro.
--
-- 1) Trigger que recalcula data_prevista quando produced_at muda.
-- 2) Correção dos lotes já existentes que ficaram dessincronizados.

CREATE OR REPLACE FUNCTION on_batch_produced_at_changed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.produced_at IS DISTINCT FROM OLD.produced_at THEN
    UPDATE rupture_schedules
    SET data_prevista = (NEW.produced_at::date + idade_dias)
    WHERE batch_id = NEW.id
      AND status IN ('pendente', 'atrasado', 'em_andamento');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS batch_produced_at_changed_trigger ON production_batches;
CREATE TRIGGER batch_produced_at_changed_trigger
  AFTER UPDATE OF produced_at ON production_batches
  FOR EACH ROW EXECUTE FUNCTION on_batch_produced_at_changed();

-- Backfill: só rompimentos ainda não executados
UPDATE rupture_schedules rs
SET data_prevista = (pb.produced_at::date + rs.idade_dias)
FROM production_batches pb
WHERE pb.id = rs.batch_id
  AND rs.status IN ('pendente', 'atrasado', 'em_andamento')
  AND rs.data_prevista IS DISTINCT FROM (pb.produced_at::date + rs.idade_dias);
