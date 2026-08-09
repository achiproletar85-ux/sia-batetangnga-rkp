-- ============================================================
-- SQL: TANDAM KOLOM SKOR MENJADI NULLABLE & RESET KE NULL
-- Agar tab Prioritas menampilkan nilai dari kolom header
-- (visi_misi, pokok_bpd, program_masyarakat, prioritas_sdgs_skor)
-- untuk data yang BELUM pernah diubah, dan menampilkan nilai
-- skor_* (hasil simpan user) untuk data yang SUDAH diubah.
-- Jalankan di Supabase SQL Editor. Idempotent.
-- ============================================================

-- RANCANGAN_RKPDES
ALTER TABLE public.rancangan_rkpdes
    ALTER COLUMN skor_kewenangan DROP DEFAULT,
    ALTER COLUMN skor_sdgs DROP DEFAULT,
    ALTER COLUMN skor_kabupaten DROP DEFAULT,
    ALTER COLUMN skor_sumber_daya DROP DEFAULT,
    ALTER COLUMN total_skor DROP DEFAULT;

ALTER TABLE public.rancangan_rkpdes
    ALTER COLUMN skor_kewenangan TYPE INTEGER,
    ALTER COLUMN skor_sdgs TYPE INTEGER,
    ALTER COLUMN skor_kabupaten TYPE INTEGER,
    ALTER COLUMN skor_sumber_daya TYPE INTEGER,
    ALTER COLUMN total_skor TYPE INTEGER;

ALTER TABLE public.rancangan_rkpdes
    ALTER COLUMN skor_kewenangan SET DEFAULT NULL,
    ALTER COLUMN skor_sdgs SET DEFAULT NULL,
    ALTER COLUMN skor_kabupaten SET DEFAULT NULL,
    ALTER COLUMN skor_sumber_daya SET DEFAULT NULL;

-- Kosongkan nilai lama agar tampil header (hanya utk kolom skor, bukan total/ranking)
UPDATE public.rancangan_rkpdes SET
    skor_kewenangan = NULL,
    skor_sdgs = NULL,
    skor_kabupaten = NULL,
    skor_sumber_daya = NULL;

-- PRIORITAS_RKPDES (jika kolom ada)
ALTER TABLE public.prioritas_rkpdes
    ALTER COLUMN skor_kewenangan DROP DEFAULT,
    ALTER COLUMN skor_sdgs DROP DEFAULT,
    ALTER COLUMN skor_kabupaten DROP DEFAULT,
    ALTER COLUMN skor_sumber_daya DROP DEFAULT;

ALTER TABLE public.prioritas_rkpdes
    ALTER COLUMN skor_kewenangan SET DEFAULT NULL,
    ALTER COLUMN skor_sdgs SET DEFAULT NULL,
    ALTER COLUMN skor_kabupaten SET DEFAULT NULL,
    ALTER COLUMN skor_sumber_daya SET DEFAULT NULL;

UPDATE public.prioritas_rkpdes SET
    skor_kewenangan = NULL,
    skor_sdgs = NULL,
    skor_kabupaten = NULL,
    skor_sumber_daya = NULL;