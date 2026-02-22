-- ============================================================
-- Document Management Migration
-- Run in Supabase: SQL Editor → New query → Paste → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS documents (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ingredient_id UUID        REFERENCES monitored_ingredients(id) ON DELETE SET NULL,
  file_name     TEXT        NOT NULL,
  file_path     TEXT        NOT NULL UNIQUE,
  file_type     TEXT        NOT NULL,
  file_size     INTEGER     NOT NULL,
  document_type TEXT        NOT NULL
                              CHECK (document_type IN ('sds', 'certificate', 'test_report', 'reach_dossier', 'other')),
  description   TEXT,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_user       ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_ingredient ON documents(ingredient_id);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Company members can view all documents in their company
CREATE POLICY "company members can view documents"
  ON documents FOR SELECT
  TO authenticated
  USING (effective_company_id(user_id) = effective_company_id(auth.uid()));

-- Any authenticated user can upload (user_id must equal their own id)
CREATE POLICY "users can upload documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Only the uploader can delete their own documents
CREATE POLICY "users can delete own documents"
  ON documents FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- Storage: create the "regulatory-documents" bucket via the
-- Supabase Dashboard → Storage → New bucket:
--   Name: regulatory-documents
--   Public: OFF
--   File size limit: 10485760 (10 MB)
-- ============================================================
