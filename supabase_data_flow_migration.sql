-- ============================================================
-- MIGRATION: SIA Batetangnga - Alur Data RKPDes & Pembiayaan
-- Jalankan script ini di Supabase SQL Editor
-- ============================================================

-- ─── 1. TABEL PEMBIAYAAN DESA ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.pembiayaan_desa (
  id                        bigserial PRIMARY KEY,
  tahun                     integer NOT NULL UNIQUE,
  silpa_tahun_sebelumnya    bigint DEFAULT 0,
  pencairan_dana_cadangan   bigint DEFAULT 0,
  hasil_penjualan_kekayaan  bigint DEFAULT 0,
  pembentukan_dana_cadangan bigint DEFAULT 0,
  penyertaan_modal_desa     bigint DEFAULT 0,
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);

ALTER TABLE public.pembiayaan_desa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_pembiayaan" ON public.pembiayaan_desa;
CREATE POLICY "allow_all_pembiayaan" ON public.pembiayaan_desa FOR ALL USING (true) WITH CHECK (true);

-- ─── 2. TABEL EVALUASI RKP ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.evaluasi_rkp (
  id                bigserial PRIMARY KEY,
  tahun             integer NOT NULL,
  kode_unik_full    text NOT NULL,
  uraian_kegiatan   text,
  anggaran          bigint DEFAULT 0,
  realisasi         bigint DEFAULT 0,
  sisa_anggaran     bigint DEFAULT 0,
  progres_persen    integer DEFAULT 0,
  kendala           text,
  keterangan        text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  UNIQUE(tahun, kode_unik_full)
);

ALTER TABLE public.evaluasi_rkp ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_evaluasi" ON public.evaluasi_rkp;
CREATE POLICY "allow_all_evaluasi" ON public.evaluasi_rkp FOR ALL USING (true) WITH CHECK (true);

-- ─── 3. TABEL RKPDES (Recreate for Clean Flow) ────────────
-- Karena tabel rkpdes sebelumnya kosong, kita pastikan strukturnya benar
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
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  UNIQUE(tahun, kode_unik_full)
);

ALTER TABLE public.rkpdes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_rkpdes" ON public.rkpdes;
CREATE POLICY "allow_all_rkpdes" ON public.rkpdes FOR ALL USING (true) WITH CHECK (true);
