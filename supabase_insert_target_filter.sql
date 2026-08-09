-- ============================================================
-- SQL SCRIPT: INSERT DU_RKPDES FILTER TARGET_YYYY = 'YYYY' OR 'Ya'
-- (KOLOM SUMBER DISESUAIKAN DENGAN SKEMA rpjmdes_standar)
-- ============================================================

-- 1. Bersihkan Data Lama
TRUNCATE TABLE public.du_rkpdes CASCADE;

-- 2. Insert Ulang Berdasarkan Target Per Tahun
-- 2023
INSERT INTO public.du_rkpdes (tahun, bidang, jenis_kegiatan, mendukung_sdgs, data_eksisting, lokasi, volume, penerima_manfaat, waktu_pelaksanaan, prakiraan_biaya, sumber_pembiayaan)
SELECT 2023, bidang, nama_kegiatan, sdgs, data_existing, lokasi_kegiatan, volume_kegiatan, penerima_manfaat_bg, waktu_pelaksanaan, pagu_rpjm, sumber_dana
FROM public.rpjmdes_standar
WHERE target_2023 = '2023' OR LOWER(TRIM(target_2023)) = 'ya';

-- 2024
INSERT INTO public.du_rkpdes (tahun, bidang, jenis_kegiatan, mendukung_sdgs, data_eksisting, lokasi, volume, penerima_manfaat, waktu_pelaksanaan, prakiraan_biaya, sumber_pembiayaan)
SELECT 2024, bidang, nama_kegiatan, sdgs, data_existing, lokasi_kegiatan, volume_kegiatan, penerima_manfaat_bg, waktu_pelaksanaan, pagu_rpjm, sumber_dana
FROM public.rpjmdes_standar
WHERE target_2024 = '2024' OR LOWER(TRIM(target_2024)) = 'ya';

-- 2025
INSERT INTO public.du_rkpdes (tahun, bidang, jenis_kegiatan, mendukung_sdgs, data_eksisting, lokasi, volume, penerima_manfaat, waktu_pelaksanaan, prakiraan_biaya, sumber_pembiayaan)
SELECT 2025, bidang, nama_kegiatan, sdgs, data_existing, lokasi_kegiatan, volume_kegiatan, penerima_manfaat_bg, waktu_pelaksanaan, pagu_rpjm, sumber_dana
FROM public.rpjmdes_standar
WHERE target_2025 = '2025' OR LOWER(TRIM(target_2025)) = 'ya';

-- 2026
INSERT INTO public.du_rkpdes (tahun, bidang, jenis_kegiatan, mendukung_sdgs, data_eksisting, lokasi, volume, penerima_manfaat, waktu_pelaksanaan, prakiraan_biaya, sumber_pembiayaan)
SELECT 2026, bidang, nama_kegiatan, sdgs, data_existing, lokasi_kegiatan, volume_kegiatan, penerima_manfaat_bg, waktu_pelaksanaan, pagu_rpjm, sumber_dana
FROM public.rpjmdes_standar
WHERE target_2026 = '2026' OR LOWER(TRIM(target_2026)) = 'ya';

-- 2027
INSERT INTO public.du_rkpdes (tahun, bidang, jenis_kegiatan, mendukung_sdgs, data_eksisting, lokasi, volume, penerima_manfaat, waktu_pelaksanaan, prakiraan_biaya, sumber_pembiayaan)
SELECT 2027, bidang, nama_kegiatan, sdgs, data_existing, lokasi_kegiatan, volume_kegiatan, penerima_manfaat_bg, waktu_pelaksanaan, pagu_rpjm, sumber_dana
FROM public.rpjmdes_standar
WHERE target_2027 = '2027' OR LOWER(TRIM(target_2027)) = 'ya';

-- 2028
INSERT INTO public.du_rkpdes (tahun, bidang, jenis_kegiatan, mendukung_sdgs, data_eksisting, lokasi, volume, penerima_manfaat, waktu_pelaksanaan, prakiraan_biaya, sumber_pembiayaan)
SELECT 2028, bidang, nama_kegiatan, sdgs, data_existing, lokasi_kegiatan, volume_kegiatan, penerima_manfaat_bg, waktu_pelaksanaan, pagu_rpjm, sumber_dana
FROM public.rpjmdes_standar
WHERE target_2028 = '2028' OR LOWER(TRIM(target_2028)) = 'ya';

-- 2029
INSERT INTO public.du_rkpdes (tahun, bidang, jenis_kegiatan, mendukung_sdgs, data_eksisting, lokasi, volume, penerima_manfaat, waktu_pelaksanaan, prakiraan_biaya, sumber_pembiayaan)
SELECT 2029, bidang, nama_kegiatan, sdgs, data_existing, lokasi_kegiatan, volume_kegiatan, penerima_manfaat_bg, waktu_pelaksanaan, pagu_rpjm, sumber_dana
FROM public.rpjmdes_standar
WHERE target_2029 = '2029' OR LOWER(TRIM(target_2029)) = 'ya';

-- 2030
INSERT INTO public.du_rkpdes (tahun, bidang, jenis_kegiatan, mendukung_sdgs, data_eksisting, lokasi, volume, penerima_manfaat, waktu_pelaksanaan, prakiraan_biaya, sumber_pembiayaan)
SELECT 2030, bidang, nama_kegiatan, sdgs, data_existing, lokasi_kegiatan, volume_kegiatan, penerima_manfaat_bg, waktu_pelaksanaan, pagu_rpjm, sumber_dana
FROM public.rpjmdes_standar
WHERE target_2030 = '2030' OR LOWER(TRIM(target_2030)) = 'ya';

-- 3. Verifikasi Jumlah per Tahun
SELECT tahun, COUNT(*)
FROM public.du_rkpdes
GROUP BY tahun
ORDER BY tahun;