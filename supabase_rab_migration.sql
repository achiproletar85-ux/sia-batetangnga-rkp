-- ============================================================
-- MIGRATION: SIA Batetangnga - RAB Database Fix
-- Jalankan script ini di Supabase SQL Editor
-- https://supabase.com/dashboard → SQL Editor
-- ============================================================

-- ─── 1. BUAT TABEL pagu_anggaran ──────────────────────────
CREATE TABLE IF NOT EXISTS public.pagu_anggaran (
  id          bigserial   PRIMARY KEY,
  tahun       integer     NOT NULL,
  sumber_dana text        NOT NULL,
  pagu        bigint      NOT NULL DEFAULT 0,
  keterangan  text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (tahun, sumber_dana)
);

-- Enable Row Level Security
ALTER TABLE public.pagu_anggaran ENABLE ROW LEVEL SECURITY;

-- Buat policy akses publik (sesuai tabel lain di proyek ini)
DROP POLICY IF EXISTS "allow_all_pagu_anggaran" ON public.pagu_anggaran;
CREATE POLICY "allow_all_pagu_anggaran" ON public.pagu_anggaran
  FOR ALL USING (true) WITH CHECK (true);

-- ─── 2. BACKFILL: Isi kolom NULL di tabel rab ─────────────
-- Isi bidang, sub_bidang, sumber_dana dari rpjm_data (JSON)
UPDATE public.rab
SET 
  bidang      = COALESCE(bidang,     rpjm_data->>'bidang'),
  sub_bidang  = COALESCE(sub_bidang, rpjm_data->>'jenis_bidang'),
  sumber_dana = COALESCE(sumber_dana, sumber_dana_rab),
  jumlah_anggaran = CASE 
    WHEN jumlah_anggaran IS NULL OR jumlah_anggaran = 0 
    THEN COALESCE(total_biaya, pagu_rab, 0)
    ELSE jumlah_anggaran
  END,
  updated_at  = now()
WHERE (bidang IS NULL OR sumber_dana IS NULL OR jumlah_anggaran IS NULL OR jumlah_anggaran = 0)
  AND rpjm_data IS NOT NULL
  AND rpjm_data::text NOT IN ('{}', 'null', '');

-- ─── 3. VERIFIKASI ────────────────────────────────────────
-- Jalankan query ini setelah migration untuk verifikasi:
-- SELECT COUNT(*) FROM public.pagu_anggaran;
-- SELECT kode_unik_full, bidang, sumber_dana, jumlah_anggaran FROM public.rab LIMIT 10;
