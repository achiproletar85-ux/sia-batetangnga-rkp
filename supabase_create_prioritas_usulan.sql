-- ============================================================
-- SQL SCRIPT: CREATE TABLE PRIORITAS_USULAN IN SUPABASE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.prioritas_usulan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tahun INTEGER NOT NULL,
    bidang INTEGER NOT NULL CHECK (bidang BETWEEN 1 AND 5),
    urutan_prioritas TEXT,
    sub_kegiatan TEXT,
    mendukung_sdgs TEXT,
    data_eksisting TEXT,
    lokasi TEXT,
    volume_satuan TEXT,
    penerima_laki INTEGER DEFAULT 0,
    penerima_perempuan INTEGER DEFAULT 0,
    penerima_rtm INTEGER DEFAULT 0,
    prakiraan_biaya BIGINT DEFAULT 0,
    sumber_pembiayaan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prioritas_usulan_tahun ON public.prioritas_usulan(tahun);

ALTER TABLE public.prioritas_usulan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read all" ON public.prioritas_usulan;
DROP POLICY IF EXISTS "Allow insert all" ON public.prioritas_usulan;
DROP POLICY IF EXISTS "Allow update all" ON public.prioritas_usulan;
DROP POLICY IF EXISTS "Allow delete all" ON public.prioritas_usulan;

CREATE POLICY "Allow read all" ON public.prioritas_usulan FOR SELECT USING (true);
CREATE POLICY "Allow insert all" ON public.prioritas_usulan FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update all" ON public.prioritas_usulan FOR UPDATE USING (true);
CREATE POLICY "Allow delete all" ON public.prioritas_usulan FOR DELETE USING (true);
