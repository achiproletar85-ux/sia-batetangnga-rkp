-- ============================================================
-- SQL: TABEL DOKUMEN ENGINE (dokumen_templates)
-- Untuk menyimpan konfigurasi template + documentId + hasil scan
-- Jalankan di Supabase Dashboard -> SQL Editor -> RUN
-- ============================================================

CREATE TABLE IF NOT EXISTS public.dokumen_templates (
    id           bigserial PRIMARY KEY,
    code         text NOT NULL UNIQUE,
    name         text,
    stage        text,
    documentId   text,
    is_real      boolean DEFAULT false,
    created_at   timestamptz DEFAULT now(),
    updated_at   timestamptz DEFAULT now()
);

ALTER TABLE public.dokumen_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dokumen_templates_all" ON public.dokumen_templates;
CREATE POLICY "dokumen_templates_all" ON public.dokumen_templates
    FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.dokumen_templates TO anon, authenticated, service_role;
GRANT ALL ON SEQUENCE public.dokumen_templates_id_seq TO anon, authenticated, service_role;

-- ============================================================
-- Tabel dokumen_form_data (isian form + hasil scan placeholder)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dokumen_form_data (
    id                    bigserial PRIMARY KEY,
    doc_code              text NOT NULL,
    google_docs_id        text,
    title                 text,
    tahun                 integer DEFAULT 2026,
    fields                jsonb DEFAULT '{}'::jsonb,
    tables                jsonb DEFAULT '{}'::jsonb,
    scanned_fields        jsonb DEFAULT '[]'::jsonb,
    last_generated_doc_id text,
    last_generated_pdf_url text,
    syncing               boolean DEFAULT false,
    synced_at             timestamp without time zone,
    created_at            timestamp without time zone DEFAULT now(),
    updated_at            timestamp without time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dokumen_form_data_code
    ON public.dokumen_form_data (doc_code);

ALTER TABLE public.dokumen_form_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dokumen_form_data_all" ON public.dokumen_form_data;
CREATE POLICY "dokumen_form_data_all" ON public.dokumen_form_data
    FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.dokumen_form_data TO anon, authenticated, service_role;
GRANT ALL ON SEQUENCE public.dokumen_form_data_id_seq TO anon, authenticated, service_role;

-- ============================================================
-- Verifikasi
-- ============================================================
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND table_name IN ('dokumen_templates','dokumen_form_data');