-- ============================================================
-- HAPUS TABEL BACKUP RAB (Yang TIDAK DIPAKAI)
-- Jalankan di Supabase SQL Editor (project kymmbb)
--
-- Catatan: HANYA `rab` yang dipakai oleh aplikasi.
-- `rab_bak` dan `rab_lama` adalah backup lama hasil migrasi
-- dan tidak pernah dibaca/ditulis oleh server.js.
-- ============================================================

-- 1) Hapus tabel backup lama
DROP TABLE IF EXISTS public.rab_lama;
DROP TABLE IF EXISTS public.rab_bak;

-- 2) Verifikasi: hanya menyisakan tabel `rab` (dan lainnya yang berawalan rab)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'rab%'
ORDER BY table_name;