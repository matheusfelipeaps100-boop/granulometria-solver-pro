-- ============================================================
-- MIGRATION 005 — CRON JOBS (pg_cron)
-- Granulometria Solver Pro
-- ============================================================

-- Habilitar extensão pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================
-- Job 1: Todo dia às 06:00 BRT (09:00 UTC) — rompimentos do dia
-- Marca como "rupture_due_today" e cria notificações
-- ============================================================
SELECT cron.schedule(
  'rupture-due-today',
  '0 9 * * *',
  $$
    INSERT INTO notifications (organization_id, user_id, tipo, titulo, mensagem, link, dados)
    SELECT DISTINCT
      pb.organization_id,
      p.id,
      'rupture_due_today',
      'Rompimento hoje: Lote ' || pb.batch_code,
      'O lote ' || pb.batch_code || ' tem rompimento de ' || rs.idade_dias || ' dias previsto para hoje.',
      '/ruptures',
      jsonb_build_object('schedule_id', rs.id, 'batch_code', pb.batch_code, 'idade_dias', rs.idade_dias)
    FROM rupture_schedules rs
    JOIN production_batches pb ON pb.id = rs.batch_id
    JOIN profiles p ON p.organization_id = pb.organization_id
    WHERE rs.data_prevista = CURRENT_DATE
      AND rs.status = 'pendente'
      AND p.role IN ('admin', 'gestor', 'laboratorio')
      AND p.ativo = true;
  $$
);

-- ============================================================
-- Job 2: Todo dia às 07:00 BRT (10:00 UTC) — marcar atrasados
-- ============================================================
SELECT cron.schedule(
  'rupture-overdue',
  '0 10 * * *',
  $$
    -- Marcar como atrasado
    UPDATE rupture_schedules
    SET status = 'atrasado'
    WHERE status = 'pendente'
      AND data_prevista < CURRENT_DATE;

    -- Notificar gestores sobre atrasados
    INSERT INTO notifications (organization_id, user_id, tipo, titulo, mensagem, link, dados)
    SELECT DISTINCT
      pb.organization_id,
      p.id,
      'rupture_overdue',
      'Rompimento em atraso: Lote ' || pb.batch_code,
      'O lote ' || pb.batch_code || ' tem rompimento de ' || rs.idade_dias || ' dias em atraso (previsto: ' || rs.data_prevista || ').',
      '/ruptures',
      jsonb_build_object('schedule_id', rs.id, 'batch_code', pb.batch_code, 'idade_dias', rs.idade_dias, 'data_prevista', rs.data_prevista)
    FROM rupture_schedules rs
    JOIN production_batches pb ON pb.id = rs.batch_id
    JOIN profiles p ON p.organization_id = pb.organization_id
    WHERE rs.status = 'atrasado'
      AND rs.data_prevista >= CURRENT_DATE - INTERVAL '1 day'
      AND p.role IN ('admin', 'gestor')
      AND p.ativo = true;
  $$
);
