-- ============================================================
-- Stripe Subscription Migration
-- Run in Supabase: SQL Editor → New query → Paste → Run
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS subscription_plan   TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id  TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
