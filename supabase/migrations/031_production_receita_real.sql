-- Receita real utilizada na produção de laje (opcional): nº de traços da pista
-- e, por material, o previsto, o real pesado e o custo.
ALTER TABLE production_batches
  ADD COLUMN IF NOT EXISTS num_tracos INTEGER,
  ADD COLUMN IF NOT EXISTS receita_real JSONB;
