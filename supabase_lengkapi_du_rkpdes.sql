-- ============================================================
-- SUPABASE SQL: LENGKAPI KOLOM & DATA DU-RKP Desa
-- Jalankan di Supabase SQL Editor.
-- Tujuan:
--   1. Tambah kolom jenis_bidang, nama_kegiatan, kode_unik_full
--   2. Isi ulang (backfill) dari rpjmdes_standar yang lengkap
--   3. Ikut lengkapi mendukung_sdgs / jenis_bidang / nama_kegiatan
-- ============================================================

-- 1. Tambahkan kolom yang belum ada (aman bila sudah ada)
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS jenis_bidang TEXT;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS nama_kegiatan TEXT;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS kode_unik_full TEXT;

-- 2. Backfill kolom hierarki dari rpjmdes_standar.
--    Pencocokan berdasarkan NAMA KEGIATAN (nilai yang selama ini
--    tersimpan di kolom jenis_kegiatan du_rkpdes = nama_kegiatan rpjmdes).
UPDATE public.du_rkpdes d
SET
    jenis_bidang    = r.jenis_bidang,
    nama_kegiatan   = r.nama_kegiatan,
    kode_unik_full  = r.kode_unik_full
FROM public.rpjmdes_standar r
WHERE r.nama_kegiatan = d.jenis_kegiatan;

-- 3. Backfill jenis_bidang pendamping: untuk baris yang masih kosong,
--    coba cocokkan melalui nama_kegiatan yang sama (fallback 2).
UPDATE public.du_rkpdes d
SET jenis_bidang = COALESCE(d.jenis_bidang, r.jenis_bidang)
FROM public.rpjmdes_standar r
WHERE d.jenis_bidang IS NULL OR d.jenis_bidang = ''
  AND r.nama_kegiatan = d.nama_kegiatan;

-- 4. Tambahan: untuk baris yang nama_kegiatan masih kosong tapi
--    jenis_kegiatan punya nilai, biarkan seperti apa adanya
--    (sinkron berikutnya akan mengisi dari rpjmdes_standar).

-- 5. Verifikasi hasil
SELECT
  COUNT(*)                                                              AS total,
  COUNT(*) FILTER (WHERE jenis_bidang IS NOT NULL AND jenis_bidang <> '') AS ada_jenis_bidang,
  COUNT(*) FILTER (WHERE nama_kegiatan IS NOT NULL AND nama_kegiatan <> '') AS ada_nama_kegiatan,
  COUNT(*) FILTER (WHERE kode_unik_full IS NOT NULL AND kode_unik_full <> '') AS ada_kode_unik
FROM public.du_rkpdes;

-- 6. Cek sebaran per tahun
SELECT tahun, COUNT(*)
FROM public.du_rkpdes
GROUP BY tahun
ORDER BY tahun;