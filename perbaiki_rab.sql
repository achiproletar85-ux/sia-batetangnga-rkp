-- =============================================================
-- PERBAIKAN SKEMA TABEL "rab" (Supabase / PostgreSQL)
-- Jalankan di: SQL Editor project kymmbb
-- Tujuan: biarkan kolom id otomatis + unik (kode_unik_full, tahun)
--         sehingga server bisa memakai upsert(ON CONFLICT).
-- =============================================================

BEGIN;

-- 1) Buat sequence khusus untuk id rab (jika belum ada)
CREATE SEQUENCE IF NOT EXISTS public.rab_id_seq;

-- 2) Sinkronkan sequence ke nilai tertinggi saat ini
SELECT setval('public.rab_id_seq', COALESCE((SELECT MAX(id) FROM public.rab), 1))
WHERE EXISTS (SELECT 1 FROM public.rab);

-- 3) Set default id otomatis dari sequence
ALTER TABLE public.rab ALTER COLUMN id SET DEFAULT nextval('public.rab_id_seq');

-- 4) Tambah constraint UNIQUE pada (kode_unik_full, tahun)
--    sehingga upsert ON CONFLICT berfungsi. Guard: hanya tambah jika belum ada.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'rab_kode_unik_full_tahun_key'
      AND conrelid = 'public.rab'::regclass
  ) THEN
    ALTER TABLE public.rab
      ADD CONSTRAINT rab_kode_unik_full_tahun_key UNIQUE (kode_unik_full, tahun);
  END IF;
END $$;

-- Bonus: pastikan kolom id tidak boleh null (tambahkan NOT NULL jika belum)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='rab'
      AND column_name='id' AND is_nullable='YES'
  ) THEN
    ALTER TABLE public.rab ALTER COLUMN id SET NOT NULL;
  END IF;
END $$;

COMMIT;

-- =============================================================
-- Verifikasi (jalankan setelah COMMIT)
-- =============================================================
SELECT
  column_default AS id_default,
  is_nullable    AS id_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='rab' AND column_name='id';

SELECT conname, contype, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.rab'::regclass AND contype='u';