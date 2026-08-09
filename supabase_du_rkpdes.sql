-- ============================================================
-- SUPABASE SQL MIGRATION SCRIPT FOR DU-RKPDES
-- Tabel: public.du_rkpdes
-- ============================================================

-- 1. BUAT TABEL DATABASE
CREATE TABLE IF NOT EXISTS public.du_rkpdes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tahun INTEGER NOT NULL,
    bidang TEXT NOT NULL,
    jenis_kegiatan TEXT NOT NULL,
    mendukung_sdgs TEXT,
    data_eksisting TEXT,
    lokasi TEXT,
    volume TEXT,
    penerima_manfaat TEXT,
    waktu_pelaksanaan TEXT,
    prakiraan_biaya BIGINT DEFAULT 0,
    sumber_pembiayaan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexing untuk pencarian cepat berdasarkan tahun
CREATE INDEX IF NOT EXISTS idx_du_rkpdes_tahun ON public.du_rkpdes(tahun);

-- Row Level Security (RLS)
ALTER TABLE public.du_rkpdes ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses (RLS Policies)
CREATE POLICY "Allow read all" ON public.du_rkpdes FOR SELECT USING (true);
CREATE POLICY "Allow insert all" ON public.du_rkpdes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update all" ON public.du_rkpdes FOR UPDATE USING (true);
CREATE POLICY "Allow delete all" ON public.du_rkpdes FOR DELETE USING (true);

-- 2. INSERT DATA CONTOH (TAHUN ANGGARAN 2027)
INSERT INTO public.du_rkpdes (
    tahun, bidang, jenis_kegiatan, mendukung_sdgs, 
    data_eksisting, lokasi, volume, penerima_manfaat,
    waktu_pelaksanaan, prakiraan_biaya, sumber_pembiayaan
) VALUES 
(
    2027,
    'Bidang Penyelenggaraan Pemerintahan Desa',
    'Penyediaan Penghasilan Tetap dan Tunjangan Kepala Desa',
    'Desa Tanpa Kemiskinan',
    'Perlu Peningkatan Siltap & Tunjangan',
    'Desa Batetangnga',
    '12 Bulan',
    'Kepala Desa & Perangkat Desa',
    '12 Bulan',
    0,
    'ADD'
);
