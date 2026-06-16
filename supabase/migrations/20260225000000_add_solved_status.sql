-- Migration to add 'solved' status to complaint_status enum
-- NOTE: In Postgres, ADD VALUE cannot be executed in a transaction block with other statements usually,
-- but since this is a migration file for Supabase, we list it here.

ALTER TYPE public.complaint_status ADD VALUE IF NOT EXISTS 'solved';
ALTER TYPE public.complaint_status ADD VALUE IF NOT EXISTS 'dismissed';
