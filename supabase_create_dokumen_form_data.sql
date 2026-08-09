-- ============================================================
-- SQL SCRIPT: BUAT TABEL dokumen_form_data
-- Penyimpanan persisten isian form dokumen desa per doc_code
-- (buffer sebelum/ketika sinkronisasi Google Apps Script)
--
-- Frontend: frontend/dokumen-desa.js
--   GET    /api/dokumen-desa/form-data/:code
--   POST   /api/dokumen-desa/form-data         { doc_code, google_docs_id, title, tahun, fields, tables }
--   GET    /api/sync-status/:code              { syncing, last_doc_id, preview_url }
--   DELETE /api/dokumen-desa/reset-form-data/:code
--
-- CARA PAKAI: Supabase Dashboard -> SQL Editor -> tempel & RUN.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.dokumen_form_data (
    id                    bigserial PRIMARY KEY,
    doc_code              text NOT NULL,
    google_docs_id        text,
    title                 text,
    tahun                 integer DEFAULT 2026,
    fields                jsonb DEFAULT '{}'::jsonb,
    tables                jsonb DEFAULT '{}'::jsonb,
    last_generated_doc_id text,
    last_generated_pdf_url text,
    syncing               boolean DEFAULT false,
    synced_at             timestamp without time zone,
    created_at            timestamp without time zone DEFAULT now(),
    updated_at            timestamp without time zone DEFAULT now()
);

-- Satu isian per doc_code (upsert berdasarkan doc_code)
CREATE UNIQUE INDEX IF NOT EXISTS idx_dokumen_form_data_code
    ON public.dokumen_form_data (doc_code);

ALTER TABLE public.dokumen_form_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dokumen_form_data_all" ON public.dokumen_form_data;
CREATE POLICY "dokumen_form_data_all" ON public.dokumen_form_data
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.dokumen_form_data TO anon, authenticated, service_role;
GRANT ALL ON SEQUENCE public.dokumen_form_data_id_seq TO anon, authenticated, service_role;