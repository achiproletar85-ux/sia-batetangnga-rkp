-- ============================================================
-- SQL SCRIPT: TAMBAH KOLOM KODE UNIK PADA TABEL PRIORITAS_RKPDES
-- Jalankan di Supabase SQL Editor.
-- ============================================================

ALTER TABLE public.prioritas_rkpdes
    ADD COLUMN IF NOT EXISTS kode_unik TEXT,
    ADD COLUMN IF NOT EXISTS kode_unik_full TEXT;

CREATE INDEX IF NOT EXISTS idx_prioritas_rkpdes_tahun ON public.prioritas_rkpdes(tahun);
CREATE INDEX IF NOT EXISTS idx_prioritas_rkpdes_kode ON public.prioritas_rkpdes(kode_unik_full);