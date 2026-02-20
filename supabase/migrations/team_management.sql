-- ============================================================
-- Team Management Migration
-- Run this in Supabase: SQL Editor → New query → Paste → Run
-- ============================================================

-- 1. Add columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email       TEXT,
  ADD COLUMN IF NOT EXISTS company_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS role        TEXT NOT NULL DEFAULT 'owner'
                                         CHECK (role IN ('owner', 'admin', 'member'));

-- 2. Create team_invitations table
CREATE TABLE IF NOT EXISTS team_invitations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_by  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  role        TEXT        NOT NULL DEFAULT 'member'
                            CHECK (role IN ('admin', 'member')),
  token       TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status      TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'accepted', 'cancelled')),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Helper function: returns effective company_id for a given user
--    For owners (company_id IS NULL): returns their own profile id
--    For members: returns the owner's profile id they belong to
CREATE OR REPLACE FUNCTION effective_company_id(uid UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(company_id, id) FROM profiles WHERE id = uid
$$;

-- 4. RLS on team_invitations
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Members can see their company's invitations
CREATE POLICY "company members can view invitations"
  ON team_invitations FOR SELECT
  TO authenticated
  USING (company_id = effective_company_id(auth.uid()));

-- Owners and admins can send invitations
CREATE POLICY "owners and admins can insert invitations"
  ON team_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = effective_company_id(auth.uid())
    AND invited_by = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin')
  );

-- Owners and admins can cancel invitations
CREATE POLICY "owners and admins can update invitations"
  ON team_invitations FOR UPDATE
  TO authenticated
  USING (
    company_id = effective_company_id(auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin')
  );

-- 5. Update profiles RLS — replace existing select/update policies
--    The names below cover common Supabase defaults; adjust if yours differ.
DROP POLICY IF EXISTS "Users can view own profile"                        ON profiles;
DROP POLICY IF EXISTS "Users can update own profile"                      ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile"                ON profiles;
DROP POLICY IF EXISTS "users can see own profile"                         ON profiles;
DROP POLICY IF EXISTS "users can update own profile"                      ON profiles;
DROP POLICY IF EXISTS "users can insert own profile"                      ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by the user who owns them"   ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile."               ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile."               ON profiles;

-- View: own row OR any row that shares the same effective company
CREATE POLICY "users can view company profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR COALESCE(company_id, id) = effective_company_id(auth.uid())
  );

-- Insert: only own row (unchanged from before)
CREATE POLICY "users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Update: only own row (owner/admin role changes are done via service role)
CREATE POLICY "users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- 6. monitored_ingredients — company-wide access
--    Drop old single-user policies (safe even if names differ)
DROP POLICY IF EXISTS "Users can view their own ingredients"   ON monitored_ingredients;
DROP POLICY IF EXISTS "Users can insert their own ingredients" ON monitored_ingredients;
DROP POLICY IF EXISTS "Users can delete their own ingredients" ON monitored_ingredients;
DROP POLICY IF EXISTS "users can view own ingredients"         ON monitored_ingredients;
DROP POLICY IF EXISTS "users can insert own ingredients"       ON monitored_ingredients;
DROP POLICY IF EXISTS "users can delete own ingredients"       ON monitored_ingredients;

CREATE POLICY "company members can view ingredients"
  ON monitored_ingredients FOR SELECT
  TO authenticated
  USING (effective_company_id(user_id) = effective_company_id(auth.uid()));

CREATE POLICY "authenticated users can insert ingredients"
  ON monitored_ingredients FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users can delete own ingredients"
  ON monitored_ingredients FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 7. regulatory_alerts — company-wide access
DROP POLICY IF EXISTS "Users can view their own alerts"   ON regulatory_alerts;
DROP POLICY IF EXISTS "Users can update their own alerts" ON regulatory_alerts;
DROP POLICY IF EXISTS "users can view own alerts"         ON regulatory_alerts;
DROP POLICY IF EXISTS "users can update own alerts"       ON regulatory_alerts;

CREATE POLICY "company members can view alerts"
  ON regulatory_alerts FOR SELECT
  TO authenticated
  USING (effective_company_id(user_id) = effective_company_id(auth.uid()));

CREATE POLICY "company members can update alerts"
  ON regulatory_alerts FOR UPDATE
  TO authenticated
  USING (effective_company_id(user_id) = effective_company_id(auth.uid()));
