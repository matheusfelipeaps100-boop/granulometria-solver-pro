-- ============================================================
-- MIGRATION 008 — Corrige trigger handle_new_user
-- Problemas anteriores:
--   1. Role era sempre 'laboratorio' (ignorava metadata)
--   2. organization_id usava LIMIT 1 (org errada)
--   3. Não persistia email, ativo ou role correto
-- Agora usa os metadados passados pela Edge Function create-user.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, role, organization_id, ativo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'laboratorio'),
    COALESCE(
      (NEW.raw_user_meta_data->>'organization_id')::UUID,
      (SELECT id FROM public.organizations LIMIT 1)
    ),
    COALESCE((NEW.raw_user_meta_data->>'ativo')::boolean, true)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
