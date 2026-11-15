-- MediRead AI - Migration 001: Add user_credentials table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/iapinjfckvbclssmhqel/editor
--
-- Description: Creates the user_credentials table for password-based authentication.
--              This is a one-time migration; the backend will fall back to legacy
--              (password-less) mode gracefully if this table does not yet exist.

CREATE TABLE IF NOT EXISTS public.user_credentials (
    user_id  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone    TEXT        UNIQUE,
    password_hash TEXT   NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS) - service-role key bypasses this
ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;

-- Only service role (backend) can read/write credentials
-- (no policies = all client-role access denied; service_role key still allowed)

-- Index for fast phone lookups
CREATE INDEX IF NOT EXISTS idx_user_credentials_phone ON public.user_credentials (phone);

-- Grant to service_role (the FastAPI backend uses this key)
GRANT ALL ON public.user_credentials TO service_role;
