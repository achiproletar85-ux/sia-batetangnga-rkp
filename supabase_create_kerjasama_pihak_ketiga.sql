-- ============================================================
-- SQL SCRIPT: CREATE TABLE KERJASAMA_PIHAK_KETIGA IN SUPABASE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.kerjasama_pihak_ketiga (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tahun INTEGER NOT NULL,
    bidang INTEGER NOT NULL CHECK (bidang BETWEEN 1 AND 5),
    sub_kegiatan TEXT,
    mendukung_sdgs TEXT,
    lokasi TEXT,
    volume TEXT,
    penerima_manfaat TEXT,
    biaya_desa BIGINT DEFAULT 0,
    biaya_pihak_ketiga BIGINT DEFAULT 0,
    nama_pihak_ketiga TEXT,
    jenis_pihak_ketiga TEXT, -- Swasta/BUMN/LSM/Instansi Lain
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kerjasama_pihak_ketiga_tahun ON public.kerjasama_pihak_ketiga(tahun);

ALTER TABLE public.kerjasama_pihak_ketiga ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read all" ON public.kerjasama_pihak_ketiga;
DROP POLICY IF EXISTS "Allow insert all" ON public.kerjasama_pihak_ketiga;
DROP POLICY IF EXISTS "Allow update all" ON public.kerjasama_pihak_ketiga;
DROP POLICY IF EXISTS "Allow delete all" ON public.kerjasama_pihak_ketiga;

CREATE POLICY "Allow read all" ON public.kerjasama_pihak_ketiga FOR SELECT USING (true);
CREATE POLICY "Allow insert all" ON public.kerjasama_pihak_ketiga FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update all" ON public.kerjasama_pihak_ketiga FOR UPDATE USING (true);
CREATE POLICY "Allow delete all" ON public.kerjasama_pihak_ketiga FOR DELETE USING (true);
