-- ============================================================
-- SUPABASE SQL: PASTIKAN TABEL du_rkpdes LENGKAP
-- Jalankan di Supabase SQL Editor (aman, bisa diulang).
-- Menjamin semua kolom yang dikirim Prioritas/RPJMDes tersimpan utuh.
-- ============================================================

-- 1) Pastikan kolom inti sudah ada (kalau tabel belum pernah dibuat)
CREATE TABLE IF NOT EXISTS public.du_rkpdes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tahun               INTEGER NOT NULL,
  bidang              TEXT NOT NULL,
  jenis_kegiatan      TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_du_rkpdes_tahun ON public.du_rkpdes(tahun);

-- 2) Tambahkan SEMUA kolom yang dibutuhkan (IDEMPOTEN, aman)
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS kode_unik_full     TEXT;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS kode_unik          TEXT;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS jenis_bidang       TEXT;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS nama_kegiatan      TEXT;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS sub_kegiatan       TEXT;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS volume_satuan      TEXT;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS mendukung_sdgs     TEXT;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS data_eksisting     TEXT;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS lokasi             TEXT;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS volume             TEXT;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS penerima_manfaat   TEXT;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS waktu_pelaksanaan  TEXT;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS prakiraan_biaya    BIGINT DEFAULT 0;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS sumber_pembiayaan  TEXT;

-- 3) Kolom pendukung (jika data Prioritas mengirimkan skor/rincian)
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS pagu_rpjm          BIGINT DEFAULT 0;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS total_manfaat      BIGINT DEFAULT 0;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS skor_kewenangan    NUMERIC DEFAULT 0;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS skor_sdgs          NUMERIC DEFAULT 0;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS skor_kabupaten     NUMERIC DEFAULT 0;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS skor_sumber_daya   NUMERIC DEFAULT 0;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS total_skor         NUMERIC DEFAULT 0;
ALTER TABLE public.du_rkpdes ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ;

-- 4) Verifikasi: daftar kolom tabel du_rkpdes
SELECT column_name || ' : ' || data_type AS kolom
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'du_rkpdes'
ORDER BY ordinal_position;

-- 5) Verifikasi sebaran per tahun (agar yakin masih penuh)
SELECT tahun, COUNT(*) FROM public.du_rkpdes GROUP BY tahun ORDER BY tahun;