-- ============================================================
-- SUPABASE SQL: KOREKSI JENIS_KEGIATAN yang SALAH (== nama_kegiatan)
-- Jalankan di Supabase SQL Editor (aman, idempotent).
-- memperbaiki kolom jenis_kegiatan agar berisi level-3
-- (item.jenis_kegiatan) bukan nama_kegiatan (level-4).
-- Berlaku untuk du_rkpdes (juga prioritas_rkpdes bila ada).
-- ============================================================

-- 1) du_rkpdes: perbaiki jenis_kegiatan dari rpjmdes_standar
UPDATE public.du_rkpdes d
SET jenis_kegiatan = r.jenis_kegiatan
FROM public.rpjmdes_standar r
WHERE r.nama_kegiatan = d.nama_kegiatan
  AND r.jenis_kegiatan IS NOT NULL AND r.jenis_kegiatan <> '';

-- 2) prioritas_rkpdes: perbaiki jenis_kegiatan bila kolom ada
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='prioritas_rkpdes' AND column_name='jenis_kegiatan')
     AND EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='prioritas_rkpdes' AND column_name='nama_kegiatan') THEN
    UPDATE public.prioritas_rkpdes p
    SET jenis_kegiatan = r.jenis_kegiatan
    FROM public.rpjmdes_standar r
    WHERE r.nama_kegiatan = p.nama_kegiatan
      AND r.jenis_kegiatan IS NOT NULL AND r.jenis_kegiatan <> '';
  END IF;
END $$;

-- 3) Verifikasi: hitung baris yang masih JENIS == NAMA (harus mendekati 0)
SELECT 'du_rkpdes' AS tabel, COUNT(*) AS masih_sama
FROM public.du_rkpdes
WHERE jenis_kegiatan IS NOT NULL AND nama_kegiatan IS NOT NULL
  AND jenis_kegiatan = nama_kegiatan AND jenis_kegiatan <> '';

SELECT 'prioritas_rkpdes' AS tabel, COUNT(*) AS masih_sama
FROM public.prioritas_rkpdes
WHERE jenis_kegiatan IS NOT NULL AND nama_kegiatan IS NOT NULL
  AND jenis_kegiatan = nama_kegiatan AND jenis_kegiatan <> '';