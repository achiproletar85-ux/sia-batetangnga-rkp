-- ============================================================
-- SUPABASE SQL: LENGKAPI KODE HIERARKI du_rkpdes
-- Jalankan di Supabase SQL Editor (aman, idempotent).
-- Tujuan: isi kode_bidang / kode_sub / kode_kegiatan / kode_unik,
--         jenis_bidang, nama_kegiatan dari rpjmdes_standar.
-- Data di du_rkpdes.jenis_kegiatan berisi NAMA KEGIATAN rpjmdes,
-- jadi pencocokan utama memakai jenis_kegiatan, fallback nama_kegiatan.
-- ============================================================

-- 1. Pastikan semua kolom ada
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS kode_bidang      TEXT;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS kode_sub         TEXT;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS kode_kegiatan    TEXT;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS kode_unik        TEXT;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS kode_unik_full   TEXT;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS jenis_bidang     TEXT;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS nama_kegiatan    TEXT;

-- 2. Backfill: cocokkan rpjmdes_standar.nama_kegiatan
--    dengan du_rkpdes.jenis_kegiatan (nilai yang memang tersimpan)
UPDATE public.du_rkpdes d
SET
    kode_bidang    = r.kode_bidang,
    kode_sub       = r.kode_sub,
    kode_kegiatan  = r.kode_kegiatan,
    kode_unik_full = COALESCE(d.kode_unik_full, r.kode_unik_full),
    kode_unik      = COALESCE(d.kode_unik, r.kode_unik_full),
    jenis_bidang   = COALESCE(d.jenis_bidang, r.jenis_bidang),
    nama_kegiatan  = COALESCE(d.nama_kegiatan, r.nama_kegiatan)
FROM public.rpjmdes_standar r
WHERE r.nama_kegiatan = d.jenis_kegiatan
   OR (d.nama_kegiatan IS NOT NULL AND d.nama_kegiatan <> '' AND r.nama_kegiatan = d.nama_kegiatan);

-- 3. Isi kode_unik bila masih kosong (ambil kode_kegiatan sebagai fallback)
UPDATE public.du_rkpdes
SET kode_unik = COALESCE(kode_unik, kode_kegiatan, kode_sub, kode_bidang)
WHERE (kode_unik IS NULL OR kode_unik = '');

-- 4. Verifikasi
SELECT
  COUNT(*)                                                              AS total,
  COUNT(*) FILTER (WHERE kode_bidang   IS NOT NULL AND kode_bidang    <> '') AS kode_bidang,
  COUNT(*) FILTER (WHERE kode_sub      IS NOT NULL AND kode_sub       <> '') AS kode_sub,
  COUNT(*) FILTER (WHERE kode_kegiatan IS NOT NULL AND kode_kegiatan  <> '') AS kode_kegiatan,
  COUNT(*) FILTER (WHERE kode_unik_full IS NOT NULL AND kode_unik_full <> '') AS kode_unik_full,
  COUNT(*) FILTER (WHERE jenis_bidang  IS NOT NULL AND jenis_bidang   <> '') AS jenis_bidang,
  COUNT(*) FILTER (WHERE nama_kegiatan IS NOT NULL AND nama_kegiatan  <> '') AS nama_kegiatan
FROM public.du_rkpdes;