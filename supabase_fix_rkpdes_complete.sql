-- ============================================================
-- FIX RKPDES TABLE - Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Buat ulang tabel rkpdes dengan struktur yang benar
DROP TABLE IF EXISTS public.rkpdes CASCADE;

CREATE TABLE public.rkpdes (
  id                bigserial PRIMARY KEY,
  tahun             integer NOT NULL,
  kode_unik_full    text NOT NULL,
  bidang            text,
  jenis_kegiatan    text,
  lokasi            text,
  volume            text,
  sasaran_manfaat   text,
  waktu_pelaksanaan text,
  prakiraan_biaya   bigint DEFAULT 0,
  sumber_pembiayaan text,
  pola_pelaksanaan  text DEFAULT 'Swakelola',
  status_rab        text DEFAULT 'Belum Dibuat',
  -- Kolom tambahan untuk edit modal
  data_eksisting     TEXT,
  target_capaian     TEXT,
  mendukung_sdgs     TEXT,
  verifikasi_proposal TEXT DEFAULT 'Belum',
  stunting            TEXT DEFAULT 'Tidak',
  satuan              TEXT DEFAULT 'Kegiatan',
  total_manfaat       BIGINT DEFAULT 0,
  penerima_manfaat    TEXT,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  UNIQUE(tahun, kode_unik_full)
);

ALTER TABLE public.rkpdes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_rkpdes" ON public.rkpdes;
CREATE POLICY "allow_all_rkpdes" ON public.rkpdes FOR ALL USING (true) WITH CHECK (true);

-- 2. Verifikasi struktur
SELECT column_name || ' : ' || data_type AS kolom
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'rkpdes'
ORDER BY ordinal_position;