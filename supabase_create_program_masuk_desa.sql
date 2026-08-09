-- ============================================================
-- SQL SCRIPT: CREATE TABLE PROGRAM_MASUK_DESA IN SUPABASE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.program_masuk_desa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tahun INTEGER NOT NULL,
    bidang INTEGER NOT NULL CHECK (bidang BETWEEN 1 AND 4),
    sub_kegiatan TEXT,
    instansi_pemberi TEXT, -- Pemerintah/Prov/Kabupaten
    mendukung_sdgs TEXT,
    tahun_pelaksanaan INTEGER,
    lokasi TEXT,
    volume TEXT,
    satuan TEXT,
    total_pagu BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_program_masuk_desa_tahun ON public.program_masuk_desa(tahun);

ALTER TABLE public.program_masuk_desa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read all" ON public.program_masuk_desa;
DROP POLICY IF EXISTS "Allow insert all" ON public.program_masuk_desa;
DROP POLICY IF EXISTS "Allow update all" ON public.program_masuk_desa;
DROP POLICY IF EXISTS "Allow delete all" ON public.program_masuk_desa;

CREATE POLICY "Allow read all" ON public.program_masuk_desa FOR SELECT USING (true);
CREATE POLICY "Allow insert all" ON public.program_masuk_desa FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update all" ON public.program_masuk_desa FOR UPDATE USING (true);
CREATE POLICY "Allow delete all" ON public.program_masuk_desa FOR DELETE USING (true);
