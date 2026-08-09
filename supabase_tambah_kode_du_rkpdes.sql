-- ============================================================
-- SUPABASE SQL: TAMBAH KOLOM KODE HIERARKI du_rkpdes
-- Jalankan di Supabase SQL Editor (aman, idempotent).
-- Memastikan kolom kode (bidang/sub/kegiatan) LENGKAP di tabel.
-- ============================================================
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS kode_bidang      TEXT;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS kode_sub         TEXT;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS kode_kegiatan    TEXT;

-- Backfill kode mengikuti rpjmdes_standar (cocok via nama_kegiatan)
UPDATE public.du_rkpdes d
SET
  kode_bidang   = r.kode_bidang,
  kode_sub      = r.kode_sub,
  kode_kegiatan = r.kode_kegiatan,
  kode_unik_full = COALESCE(d.kode_unik_full, r.kode_unik_full),
  kode_unik     = COALESCE(d.kode_unik, r.kode_unik_full)
FROM public.rpjmdes_standar r
WHERE r.nama_kegiatan = d.nama_kegiatan;

-- Verifikasi kelengkapan
SELECT COUNT(*) AS total,
  COUNT(*) FILTER (WHERE kode_bidang   IS NOT NULL AND kode_bidang   <> '') AS kode_bidang,
  COUNT(*) FILTER (WHERE kode_sub      IS NOT NULL AND kode_sub      <> '') AS kode_sub,
  COUNT(*) FILTER (WHERE kode_kegiatan IS NOT NULL AND kode_kegiatan <> '') AS kode_kegiatan,
  COUNT(*) FILTER (WHERE kode_unik_full IS NOT NULL AND kode_unik_full <> '') AS kode_unik_full,
  COUNT(*) FILTER (WHERE nama_kegiatan  IS NOT NULL AND nama_kegiatan  <> '') AS nama_kegiatan
FROM public.du_rkpdes;