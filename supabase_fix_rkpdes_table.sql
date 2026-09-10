-- ============================================================
-- SUPABASE SQL: FIX RKPDES TABLE COLUMNS
-- Jalankan di Supabase SQL Editor.
-- Menambahkan kolom yang dibutuhkan frontend tapi belum ada di tabel
-- ============================================================

-- 1. Tambahkan kolom yang hilang untuk mendukung edit modal RKPDes
ALTER TABLE public.rkpdes ADD COLUMN IF NOT EXISTS data_eksisting     TEXT;
ALTER TABLE public.rkpdes ADD COLUMN IF NOT EXISTS target_capaian      TEXT;
ALTER TABLE public.rkpdes ADD COLUMN IF NOT EXISTS mendukung_sdgs      TEXT;
ALTER TABLE public.rkpdes ADD COLUMN IF NOT EXISTS verifikasi_proposal TEXT DEFAULT 'Belum';
ALTER TABLE public.rkpdes ADD COLUMN IF NOT EXISTS stunting            TEXT DEFAULT 'Tidak';
ALTER TABLE public.rkpdes ADD COLUMN IF NOT EXISTS satuan              TEXT DEFAULT 'Kegiatan';
ALTER TABLE public.rkpdes ADD COLUMN IF NOT EXISTS total_manfaat       BIGINT DEFAULT 0;
ALTER TABLE public.rkpdes ADD COLUMN IF NOT EXISTS penerima_manfaat    TEXT;

-- 2. Pastikan kolom volume bisa menampung string (sudah TEXT, OK)
-- 3. Pastikan kolom kode_unik_full sudah ada (sudah ada)

-- 4. Verifikasi struktur tabel
SELECT column_name || ' : ' || data_type AS kolom
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'rkpdes'
ORDER BY ordinal_position;

-- 5. Cek data contoh
SELECT * FROM public.rkpdes LIMIT 5;