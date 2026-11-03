-- ============================================================
-- MIGRATION 032 — Links de notificação de rompimento por categoria
-- Rompimentos de laje têm lista própria (/ruptures-laje).
-- ============================================================

-- 1) Corrige notificações já existentes de lotes de laje
UPDATE notifications n
SET link = '/ruptures-laje'
FROM rupture_schedules rs
JOIN production_batches pb ON pb.id = rs.batch_id
JOIN analyses a ON a.id = pb.analysis_id
WHERE n.link = '/ruptures'
  AND n.tipo IN ('rupture_due_today', 'rupture_overdue')
  AND n.dados->>'schedule_id' = rs.id::text
  AND a.tipo = 'laje';

-- 2) Reagenda os jobs (mesmo nome substitui o job existente) com o link por categoria
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
      CASE WHEN a.tipo = 'laje' THEN '/ruptures-laje' ELSE '/ruptures' END,
      jsonb_build_object('schedule_id', rs.id, 'batch_code', pb.batch_code, 'idade_dias', rs.idade_dias)
    FROM rupture_schedules rs
    JOIN production_batches pb ON pb.id = rs.batch_id
    LEFT JOIN analyses a ON a.id = pb.analysis_id
    JOIN profiles p ON p.organization_id = pb.organization_id
    WHERE rs.data_prevista = CURRENT_DATE
      AND rs.status = 'pendente'
      AND p.role IN ('admin', 'gestor', 'laboratorio')
      AND p.ativo = true;
  $$
);

SELECT cron.schedule(
  'rupture-overdue',
  '0 10 * * *',
  $$
    UPDATE rupture_schedules
    SET status = 'atrasado'
    WHERE status = 'pendente'
      AND data_prevista < CURRENT_DATE;

    INSERT INTO notifications (organization_id, user_id, tipo, titulo, mensagem, link, dados)
    SELECT DISTINCT
      pb.organization_id,
      p.id,
      'rupture_overdue',
      'Rompimento em atraso: Lote ' || pb.batch_code,
      'O lote ' || pb.batch_code || ' tem rompimento de ' || rs.idade_dias || ' dias em atraso (previsto: ' || rs.data_prevista || ').',
      CASE WHEN a.tipo = 'laje' THEN '/ruptures-laje' ELSE '/ruptures' END,
      jsonb_build_object('schedule_id', rs.id, 'batch_code', pb.batch_code, 'idade_dias', rs.idade_dias, 'data_prevista', rs.data_prevista)
    FROM rupture_schedules rs
    JOIN production_batches pb ON pb.id = rs.batch_id
    LEFT JOIN analyses a ON a.id = pb.analysis_id
    JOIN profiles p ON p.organization_id = pb.organization_id
    WHERE rs.status = 'atrasado'
      AND rs.data_prevista >= CURRENT_DATE - INTERVAL '1 day'
      AND p.role IN ('admin', 'gestor')
      AND p.ativo = true;
  $$
);
