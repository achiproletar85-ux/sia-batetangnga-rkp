-- ============================================================
-- SIA BATETANGNGA — FITUR "RAB PERUBAHAN" (Snapshot Versi)
-- ============================================================
-- Menambahkan penanda versi pada tabel `rab` yang sudah ada.
-- Metode: SNAPSHOT VERSI (baris PERUBAHAN adalah salinan baris MURNI),
-- bukan tabel terpisah — agar tidak menggandakan endpoint & konstanta kolom.
--
-- CARA PAKAI
--   1. Supabase Dashboard → project ref: kymmbbngwlfglamirdwg
--      (pastikan project INI yang aktif, bukan project lain)
--   2. SQL Editor → tempel SELURUH berkas ini → Run
--   3. Verifikasi dari terminal proyek:
--        node scripts/check-rab-migration.cjs      (exit 0 = siap)
--
-- CATATAN PENTING
--   * TIDAK memakai BEGIN/COMMIT. Setiap statement berdiri sendiri dan
--     idempoten (aman dijalankan berulang). Bila salah satu gagal, statement
--     lain tetap terlaksana dan pesan error tampil jelas — tidak ada
--     rollback senyap yang bisa membuat migrasi "tampak sukses" padahal gagal.
--   * Statement 1 & 2 WAJIB. Statement 3 & 4 hanya perapian data.
-- ============================================================


-- ------------------------------------------------------------
-- [WAJIB] 1. Penanda versi anggaran: 'MURNI' (default) atau 'PERUBAHAN'
-- ------------------------------------------------------------
ALTER TABLE public.rab
    ADD COLUMN IF NOT EXISTS tipe_anggaran text NOT NULL DEFAULT 'MURNI';


-- ------------------------------------------------------------
-- [WAJIB] 2. Jejak balik ke baris MURNI asal (NULL untuk baris MURNI)
-- ------------------------------------------------------------
ALTER TABLE public.rab
    ADD COLUMN IF NOT EXISTS id_referensi_murni bigint;


-- ------------------------------------------------------------
-- [WAJIB] 2b. Sesuaikan UNIQUE constraint agar versi MURNI dan
--             PERUBAHAN dapat berdampingan untuk kode_unik_full & tahun yang sama.
-- ------------------------------------------------------------
ALTER TABLE public.rab
    DROP CONSTRAINT IF EXISTS rab_kode_unik_full_tahun_key;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'rab_kode_unik_full_tahun_tipe_key'
          AND conrelid = 'public.rab'::regclass
    ) THEN
        ALTER TABLE public.rab
            ADD CONSTRAINT rab_kode_unik_full_tahun_tipe_key UNIQUE (kode_unik_full, tahun, tipe_anggaran);
    END IF;
END $$;


-- ------------------------------------------------------------
-- [OPSIONAL] 3. Perapian nilai versi pada data lama
--   (ADD COLUMN ... DEFAULT 'MURNI' sudah mengisi baris lama, jadi ini
--    hanya jaring pengaman bila ada nilai di luar dua nilai baku.)
-- ------------------------------------------------------------
UPDATE public.rab SET tipe_anggaran = 'MURNI'
 WHERE tipe_anggaran IS NULL
    OR UPPER(TRIM(tipe_anggaran)) NOT IN ('MURNI', 'PERUBAHAN');

UPDATE public.rab SET tipe_anggaran = UPPER(TRIM(tipe_anggaran))
 WHERE tipe_anggaran <> UPPER(TRIM(tipe_anggaran));


-- ------------------------------------------------------------
-- [OPSIONAL] 4. Indeks bantu (kueri selalu difilter tahun + versi)
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_rab_tahun_tipe
    ON public.rab (tahun, tipe_anggaran);
CREATE INDEX IF NOT EXISTS idx_rab_kode_tahun_tipe
    ON public.rab (kode_unik_full, tahun, tipe_anggaran);


-- ============================================================
-- VERIFIKASI — jalankan setelah di atas. Harapan: kedua kolom terisi.
-- ============================================================
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name   = 'rab'
   AND column_name IN ('tipe_anggaran', 'id_referensi_murni')
 ORDER BY column_name;

-- Harapan: MURNI = 21, PERUBAHAN = 0
SELECT tipe_anggaran, COUNT(*) AS jumlah
  FROM public.rab
 GROUP BY tipe_anggaran
 ORDER BY tipe_anggaran;

-- Harapan: 0 (tidak ada baris tanpa versi)
SELECT COUNT(*) AS baris_tanpa_versi
  FROM public.rab
 WHERE tipe_anggaran IS NULL;


-- ============================================================
-- ROLLBACK — bila perlu membatalkan seluruh fitur
-- ============================================================
-- DROP INDEX IF EXISTS public.idx_rab_kode_tahun_tipe;
-- DROP INDEX IF EXISTS public.idx_rab_tahun_tipe;
-- ALTER TABLE public.rab DROP COLUMN IF EXISTS id_referensi_murni;
-- ALTER TABLE public.rab DROP COLUMN IF EXISTS tipe_anggaran;
