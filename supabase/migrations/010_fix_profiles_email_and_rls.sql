-- ============================================================
-- MIGRATION 010 — Corrige emails e RLS de profiles
-- 1. Backfill de email para perfis existentes sem email
-- 2. Permite admin atualizar qualquer perfil da sua org
-- ============================================================

-- 1. Cria perfis faltantes para auth users que não têm perfil
INSERT INTO public.profiles (id, nome, email, role, organization_id, ativo)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'nome', split_part(u.email, '@', 1)),
       u.email,
       lower(COALESCE(u.raw_user_meta_data->>'role', 'laboratorio')),
       (SELECT id FROM public.organizations LIMIT 1),
       COALESCE((u.raw_user_meta_data->>'ativo')::boolean, true)
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 2. Backfill: popula email dos perfis existentes a partir de auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 2. Remove policy restritiva e recria com suporte a admin
DROP POLICY IF EXISTS "own_profile_update" ON profiles;

-- Usuário pode atualizar o próprio perfil
CREATE POLICY "own_profile_update" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Admin pode atualizar qualquer perfil da sua organização
CREATE POLICY "admin_update_org_profiles" ON profiles
  FOR UPDATE USING (
    organization_id = my_org_id()
    AND my_role() = 'admin'
  );
