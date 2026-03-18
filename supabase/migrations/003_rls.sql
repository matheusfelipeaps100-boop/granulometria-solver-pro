-- ============================================================
-- MIGRATION 003 — ROW LEVEL SECURITY (RLS)
-- Granulometria Solver Pro
-- Garante isolamento total de dados entre organizações
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE organizations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invites           ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials              ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_gradations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE standard_curves        ENABLE ROW LEVEL SECURITY;
ALTER TABLE standard_curve_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses               ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_materials     ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_material_gradations ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_gradation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_dosage        ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_batches     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rupture_schedules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rupture_tests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rupture_samples        ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_reports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_configs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_settings     ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Funções auxiliares (SECURITY DEFINER — rodam com permissões
-- do owner, não do usuário logado, para evitar recursão RLS)
-- ============================================================

-- Retorna organization_id do usuário logado
CREATE OR REPLACE FUNCTION my_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Retorna role do usuário logado
CREATE OR REPLACE FUNCTION my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================
-- POLÍTICAS DE ISOLAMENTO POR ORGANIZAÇÃO
-- ============================================================

-- Organizations: usuário vê somente a sua
CREATE POLICY "org_own" ON organizations
  FOR SELECT USING (id = my_org_id());

-- Profiles: usuário vê perfis da mesma organização
CREATE POLICY "same_org_profiles" ON profiles
  FOR SELECT USING (organization_id = my_org_id());

CREATE POLICY "own_profile_update" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- User Invites: somente da própria org
CREATE POLICY "org_isolation" ON user_invites
  USING (organization_id = my_org_id());

-- Materials
CREATE POLICY "org_isolation" ON materials
  USING (organization_id = my_org_id());

-- Material Gradations (via join com materials)
CREATE POLICY "org_isolation" ON material_gradations
  USING (
    material_id IN (
      SELECT id FROM materials WHERE organization_id = my_org_id()
    )
  );

-- Standard Curves
CREATE POLICY "org_isolation" ON standard_curves
  USING (organization_id = my_org_id());

-- Standard Curve Items
CREATE POLICY "org_isolation" ON standard_curve_items
  USING (
    curve_id IN (
      SELECT id FROM standard_curves WHERE organization_id = my_org_id()
    )
  );

-- Analyses
CREATE POLICY "org_isolation" ON analyses
  USING (organization_id = my_org_id());

-- Analysis Materials
CREATE POLICY "org_isolation" ON analysis_materials
  USING (
    analysis_id IN (
      SELECT id FROM analyses WHERE organization_id = my_org_id()
    )
  );

-- Analysis Gradation Results
CREATE POLICY "org_isolation" ON analysis_gradation_results
  USING (
    analysis_id IN (
      SELECT id FROM analyses WHERE organization_id = my_org_id()
    )
  );

-- Analysis Material Gradations
CREATE POLICY "org_isolation" ON analysis_material_gradations
  USING (
    analysis_material_id IN (
      SELECT am.id FROM analysis_materials am
      JOIN analyses a ON a.id = am.analysis_id
      WHERE a.organization_id = my_org_id()
    )
  );

-- Analysis Dosage
CREATE POLICY "org_isolation" ON analysis_dosage
  USING (
    analysis_id IN (
      SELECT id FROM analyses WHERE organization_id = my_org_id()
    )
  );

-- Production Batches
CREATE POLICY "org_isolation" ON production_batches
  USING (organization_id = my_org_id());

-- Rupture Schedules (via batch)
CREATE POLICY "org_isolation" ON rupture_schedules
  USING (
    batch_id IN (
      SELECT id FROM production_batches WHERE organization_id = my_org_id()
    )
  );

-- Rupture Tests (via schedule > batch)
CREATE POLICY "org_isolation" ON rupture_tests
  USING (
    schedule_id IN (
      SELECT rs.id FROM rupture_schedules rs
      JOIN production_batches pb ON pb.id = rs.batch_id
      WHERE pb.organization_id = my_org_id()
    )
  );

-- Rupture Samples (via test > schedule > batch)
CREATE POLICY "org_isolation" ON rupture_samples
  USING (
    test_id IN (
      SELECT rt.id FROM rupture_tests rt
      JOIN rupture_schedules rs ON rs.id = rt.schedule_id
      JOIN production_batches pb ON pb.id = rs.batch_id
      WHERE pb.organization_id = my_org_id()
    )
  );

-- Quality Reports
CREATE POLICY "org_isolation" ON quality_reports
  USING (organization_id = my_org_id());

-- Webhooks: somente admin pode criar/alterar
CREATE POLICY "org_isolation" ON webhook_configs
  USING (organization_id = my_org_id());

CREATE POLICY "admin_only_write" ON webhook_configs
  FOR INSERT WITH CHECK (my_role() = 'admin');

-- Webhook Logs
CREATE POLICY "org_isolation" ON webhook_logs
  USING (
    webhook_id IN (
      SELECT id FROM webhook_configs WHERE organization_id = my_org_id()
    )
  );

-- Notifications: usuário vê somente as suas
CREATE POLICY "own_notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "own_notifications_update" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Notification Preferences: somente o próprio usuário
CREATE POLICY "own_preferences" ON notification_preferences
  USING (user_id = auth.uid());

-- Technical Settings: org + somente admin/gestor alteram
CREATE POLICY "org_isolation" ON technical_settings
  USING (organization_id = my_org_id());

CREATE POLICY "gestor_write" ON technical_settings
  FOR UPDATE USING (organization_id = my_org_id())
  WITH CHECK (my_role() IN ('admin', 'gestor'));

-- ============================================================
-- Sieves: leitura pública (dados técnicos globais)
-- ============================================================
ALTER TABLE sieves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON sieves FOR SELECT USING (true);
