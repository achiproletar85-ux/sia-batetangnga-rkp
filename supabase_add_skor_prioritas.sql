-- ============================================================
-- SQL: TAMBAH KOLOM SKOR PADA TABEL RANCANGAN_RKPDES & PRIORITAS_RKPDES
-- Jalankan di Supabase SQL Editor (sesudah: idempoten).
-- ============================================================

-- Kolom skor & ranking pada rancangan_rkpdes (tempat skor dari tab Prioritas disimpan)
ALTER TABLE public.rancangan_rkpdes
    ADD COLUMN IF NOT EXISTS skor_kewenangan INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS skor_sdgs INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS skor_kabupaten INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS skor_sumber_daya INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_skor INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ranking TEXT;

ALTER TABLE public.prioritas_rkpdes
    ADD COLUMN IF NOT EXISTS skor_kewenangan INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS skor_sdgs INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS skor_kabupaten INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS skor_sumber_daya INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ranking TEXT;

CREATE INDEX IF NOT EXISTS idx_rancangan_rkpdes_skor_tahun ON public.rancangan_rkpdes(tahun);