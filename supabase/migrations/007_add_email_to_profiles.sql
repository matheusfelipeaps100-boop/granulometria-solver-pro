-- ============================================================
-- MIGRATION 007 — Adiciona coluna email na tabela profiles
-- Necessário para que a Edge Function create-user possa
-- armazenar o email junto ao perfil do usuário.
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
