-- ============================================================
-- SUPABASE SQL: SAMAKAN HEADER PRIORITAS_RKPDES = DU_RKPDES
-- Jalankan di Supabase SQL Editor (aman, idempotent).
-- Menambah kolom yang belum ada agar struktur prioritas_rkpdes
-- = du_rkpdes, sehingga "Tetapkan ke DU-RKP" terkirim lengkap.
-- ============================================================
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS kode_bidang        TEXT;
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS kode_sub           TEXT;
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS kode_kegiatan      TEXT;
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS kode_unik          TEXT;
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS kode_unik_full     TEXT;
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS nama_bidang        TEXT;
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS bidang             TEXT;
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS jenis_bidang       TEXT;
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS sub_bidang         TEXT;
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS jenis_kegiatan     TEXT;
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS nama_kegiatan      TEXT;
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS sub_kegiatan       TEXT;
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS mendukung_sdgs     TEXT;
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS data_eksisting     TEXT;
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS lokasi             TEXT;
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS volume             TEXT;
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS volume_satuan      TEXT;
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS penerima_manfaat   TEXT;
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS waktu_pelaksanaan  TEXT;
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS prakiraan_biaya    BIGINT DEFAULT 0;
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS pagu_rpjm          BIGINT DEFAULT 0;
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS total_manfaat      BIGINT DEFAULT 0;
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS sumber_pembiayaan  TEXT;
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS skor_kewenangan    NUMERIC DEFAULT 0;
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS skor_sdgs          NUMERIC DEFAULT 0;
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS skor_kabupaten     NUMERIC DEFAULT 0;
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS skor_sumber_daya   NUMERIC DEFAULT 0;
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS total_skor         NUMERIC DEFAULT 0;
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS ranking            TEXT;
ALTER TABLE public.prioritas_rkpdes ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ;

-- Verifikasi
SELECT column_name || ' : ' || data_type AS kolom
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'prioritas_rkpdes'
ORDER BY ordinal_position;