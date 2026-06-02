CREATE TABLE granulometry_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  materiais JSONB NOT NULL,
  dna_selecionado TEXT,
  limites_curva JSONB,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE granulometry_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_can_manage_presets"
  ON granulometry_presets
  FOR ALL
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
