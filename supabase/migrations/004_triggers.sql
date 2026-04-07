-- ============================================================
-- MIGRATION 004 — TRIGGERS PL/pgSQL
-- Granulometria Solver Pro
-- ============================================================

-- ============================================================
-- Trigger 1: Perfil automático ao criar usuário Supabase Auth
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, role, organization_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    'laboratorio',
    (SELECT id FROM public.organizations LIMIT 1)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Trigger 2: Ao aprovar análise → dispara webhook (assíncrono)
-- ============================================================
CREATE OR REPLACE FUNCTION on_analysis_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'aprovado' AND OLD.status != 'aprovado' THEN
    -- Inserir notificação in-app
    INSERT INTO notifications (organization_id, user_id, tipo, titulo, mensagem, link, dados)
    SELECT
      NEW.organization_id,
      p.id,
      'trace_approved',
      'Análise aprovada: ' || NEW.codigo,
      'A análise ' || NEW.nome || ' foi aprovada e está disponível para produção.',
      '/analyses/' || NEW.id,
      jsonb_build_object('analysis_id', NEW.id, 'codigo', NEW.codigo)
    FROM profiles p
    WHERE p.organization_id = NEW.organization_id
      AND p.role IN ('admin', 'gestor', 'producao')
      AND p.ativo = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER analysis_approved_trigger
  AFTER UPDATE ON analyses
  FOR EACH ROW EXECUTE FUNCTION on_analysis_approved();

-- ============================================================
-- Trigger 3: Ao criar lote → gera 4 rupture_schedules automáticos
-- ============================================================
CREATE OR REPLACE FUNCTION on_batch_created()
RETURNS TRIGGER AS $$
DECLARE
  ages INTEGER[] := ARRAY[1, 3, 7, 28];
  age  INTEGER;
BEGIN
  FOREACH age IN ARRAY ages LOOP
    INSERT INTO rupture_schedules (batch_id, idade_dias, data_prevista)
    VALUES (
      NEW.id,
      age,
      (NEW.produced_at::date + age)
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER batch_created_trigger
  AFTER INSERT ON production_batches
  FOR EACH ROW EXECUTE FUNCTION on_batch_created();

-- ============================================================
-- Trigger 4: Ao concluir rompimento → recalcula status do lote
-- ============================================================
CREATE OR REPLACE FUNCTION on_rupture_completed()
RETURNS TRIGGER AS $$
DECLARE
  batch_uuid          UUID;
  total_schedules     INTEGER;
  completed_schedules INTEGER;
  non_conformities    INTEGER;
BEGIN
  IF NEW.status = 'concluido' AND OLD.status != 'concluido' THEN

    -- Buscar lote associado
    SELECT rs.batch_id INTO batch_uuid
    FROM rupture_schedules rs WHERE rs.id = NEW.id;

    -- Contar totais
    SELECT COUNT(*) INTO total_schedules
    FROM rupture_schedules WHERE batch_id = batch_uuid;

    SELECT COUNT(*) INTO completed_schedules
    FROM rupture_schedules WHERE batch_id = batch_uuid AND status = 'concluido';

    -- Se todos concluídos → atualizar status do lote
    IF completed_schedules = total_schedules THEN
      SELECT COUNT(*) INTO non_conformities
      FROM rupture_tests rt
      JOIN rupture_schedules rs ON rs.id = rt.schedule_id
      WHERE rs.batch_id = batch_uuid AND rt.status = 'nao_conforme';

      UPDATE production_batches SET status =
        CASE
          WHEN non_conformities = 0  THEN 'aprovado'
          WHEN non_conformities <= 1 THEN 'aprovado_com_ressalva'
          ELSE 'reprovado'
        END
      WHERE id = batch_uuid;
    END IF;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rupture_completed_trigger
  AFTER UPDATE ON rupture_schedules
  FOR EACH ROW EXECUTE FUNCTION on_rupture_completed();

-- ============================================================
-- Trigger 5: updated_at automático em tabelas relevantes
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_materials
  BEFORE UPDATE ON materials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_analyses
  BEFORE UPDATE ON analyses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_technical_settings
  BEFORE UPDATE ON technical_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
