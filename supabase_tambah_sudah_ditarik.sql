-- ============================================================
-- TAMBAH KOLOM PENANDA 'sudah_ditarik_tahun' di rpjmdes_standar
-- ------------------------------------------------------------
-- Menandai untuk TAHUN BERAPA sebuah baris RPJMDes sudah ditarik
-- ke prioritas_usulan. Berisi array tahun, misal: {"2027","2028"}.
--
-- Manfaat:
--   * Data BARU (belum punya penanda tahun) -> ikut ditarik.
--   * Data yang sudah ditarik untuk tahun X -> TIDAK ditarik ulang
--     untuk tahun X (data yang dihapus di prioritas_usulan pun
--     tidak akan muncul kembali).
--   * Multi-tahun aman: baris bisa ditarik untuk tahun yang berbeda.
--
-- Jalankan di Supabase SQL Editor (project kymmbbngwlfglamirdwg).
-- ============================================================

ALTER TABLE public.rpjmdes_standar
ADD COLUMN IF NOT EXISTS sudah_ditarik_tahun text[] NOT NULL DEFAULT '{}';

-- (Opsional) Indeks kode_unik_full agar pencocokan saat menandai lebih cepat
CREATE INDEX IF NOT EXISTS idx_rpjmdes_standar_kode_unik_full
ON public.rpjmdes_standar (kode_unik_full);

-- ============================================================
-- CATATAN UNTUK DATA LAMA (opsional)
-- ============================================================
-- Jika sudah ada data di prioritas_usulan tahun tertentu yang TIDAK ingin
-- ditarik ulang, tandai baris sumbernya. Contoh menandai data tahun 2027:
--
-- UPDATE public.rpjmdes_standar
-- SET sudah_ditarik_tahun = ARRAY_APPEND(
--       COALESCE(sudah_ditarik_tahun, '{}'),
--       '2027'
--     )
-- WHERE kode_unik_full IN (
--   SELECT DISTINCT kode_unik_full FROM public.prioritas_usulan WHERE tahun = 2027
-- );
--
-- Tanpa langkah ini, semua baris yang target_YYYY-nya terisi akan dianggap
-- "baru" dan ikut ditarik pada penarikan pertama setelah kolom ditambahkan.