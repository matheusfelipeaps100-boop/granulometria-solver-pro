-- Permite marcar um agendamento de rompimento como "sem expediente" (não foi
-- possível romper porque a data caiu em fim de semana/feriado, sem operação no
-- laboratório) em vez de forçar o usuário a inventar um resultado só para
-- conseguir salvar a tela.
--
-- Esse status ("sem_expediente") não gera rupture_test/rupture_samples, então
-- fica automaticamente fora de todas as médias, mínimos/máximos e contagens de
-- não conformidade dos relatórios (que só agregam schedules com tests
-- vinculados). Guardamos o motivo para rastreabilidade.

ALTER TABLE rupture_schedules
  ADD COLUMN IF NOT EXISTS motivo_nao_realizado TEXT;

COMMENT ON COLUMN rupture_schedules.motivo_nao_realizado IS
  'Motivo informado quando status = sem_expediente (ex.: rompimento caiu em dia sem expediente)';
