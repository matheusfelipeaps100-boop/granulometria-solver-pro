-- ============================================================================
-- SETUP STORAGE BUCKET - Quality Reports
-- ============================================================================
--
-- INSTRUÇÕES:
-- 1. Vá para: https://app.supabase.com/project/lhfxcjwpsjnpmgyyhbxi/sql
-- 2. Cole este código no SQL Editor
-- 3. Clique em "RUN"
-- 4. Pronto! Storage está configurado com RLS
--
-- ============================================================================

-- ============================================================================
-- 1. CREATE STORAGE BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('quality-reports', 'quality-reports', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. ENABLE RLS ON STORAGE.OBJECTS
-- ============================================================================

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. RLS POLICIES
-- ============================================================================

-- Policy 1: Users can upload to their org folder
CREATE POLICY "Users can upload to their org folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'quality-reports'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id::text FROM profiles WHERE id = auth.uid()
  )
);

-- Policy 2: Users can read their org reports
CREATE POLICY "Users can read their org reports"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'quality-reports'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id::text FROM profiles WHERE id = auth.uid()
  )
);

-- Policy 3: Users can delete their org reports
CREATE POLICY "Users can delete their org reports"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'quality-reports'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id::text FROM profiles WHERE id = auth.uid()
  )
);

-- Policy 4: Público pode ler via signed URLs
CREATE POLICY "Public can read reports via signed URLs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'quality-reports'
);

-- ============================================================================
-- ✅ PRONTO! Storage está configurado
-- ============================================================================
