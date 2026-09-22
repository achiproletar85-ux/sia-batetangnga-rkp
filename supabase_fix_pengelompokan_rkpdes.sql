-- ============================================================
-- SUPABASE SQL: PERBAIKAN PENGELOMPOKAN RKPDes (Level 2 & Level 3)
-- Kasus nyata: "Kegiatan Lomba Senam Tingkat Desa" (kode 01.01.08.04.)
-- tampil terpisah di bawah kelompok "Penyediaan Sarana Prasarana
-- Pemerintahan Desa", padahal 3 kegiatan sekelompoknya
-- (01.01.08.01 Biaya Koordinasi, 01.01.08.02 Ceremonial,
-- 01.01.08.03 Turnamen Olahraga) berada di sub-bidang
-- "Penyelenggaran Belanja Siltap, Tunjangan dan Operasional
-- Pemerintahan Desa".
--
-- Sebab: kolom `jenis_bidang` pada baris rpjmdes_standar 01.01.08.04.
-- salah (berisi nama kelompok lain), dan beberapa `nama_kegiatan`
-- mengandung spasi ganda sehingga pencocokan berbasis nama meleset.
--
-- Aman & idempotent: hanya menyentuh baris yang MEMANG berbeda dari
-- acuan kode_kegiatan (master_klasifikasi) atau mayoritas kelompoknya.
-- ============================================================

-- 1) Samakan Level 2 (jenis_bidang) dengan acuan master_klasifikasi
--    untuk setiap kode_kegiatan (hierarki kode = otoritas pengelompokan).
UPDATE public.rpjmdes_standar AS r
SET jenis_bidang = mk.sub_bidang
FROM public.master_klasifikasi AS mk
WHERE btrim(mk.kode_kegiatan) = btrim(r.kode_kegiatan)
  AND mk.sub_bidang IS NOT NULL
  AND btrim(mk.sub_bidang) <> ''
  AND r.jenis_bidang IS DISTINCT FROM mk.sub_bidang;

-- 2) Untuk kelompok yang tidak ada di master_klasifikasi: rapikan baris yang
--    menyimpang dari mayoritas kode_kegiatan-nya (mencegah satu baris typo
--    memecah kelompok).
WITH vote AS (
    SELECT btrim(kode_kegiatan) AS kode_kegiatan,
           jenis_bidang,
           COUNT(*) AS jumlah
    FROM public.rpjmdes_standar
    WHERE kode_kegiatan IS NOT NULL
      AND btrim(kode_kegiatan) <> ''
      AND jenis_bidang IS NOT NULL
      AND btrim(jenis_bidang) <> ''
    GROUP BY btrim(kode_kegiatan), jenis_bidang
),
mayoritas AS (
    SELECT DISTINCT ON (kode_kegiatan) kode_kegiatan, jenis_bidang
    FROM vote
    WHERE jumlah > 1              -- hanya nilai yang benar-benar mayoritas
    ORDER BY kode_kegiatan, jumlah DESC, jenis_bidang
)
UPDATE public.rpjmdes_standar AS r
SET jenis_bidang = m.jenis_bidang
FROM mayoritas AS m
WHERE btrim(r.kode_kegiatan) = m.kode_kegiatan
  AND r.jenis_bidang IS DISTINCT FROM m.jenis_bidang;

-- 3) Normalisasi spasi ganda / spasi tak-putus pada teks pengelompokan & nama,
--    supaya pencocokan nama (byName) tidak meleset karena typo spasi.
UPDATE public.rpjmdes_standar
SET nama_kegiatan = btrim(regexp_replace(replace(nama_kegiatan, chr(160), ' '), '\s+', ' ', 'g'))
WHERE nama_kegiatan IS NOT NULL
  AND nama_kegiatan <> btrim(regexp_replace(replace(nama_kegiatan, chr(160), ' '), '\s+', ' ', 'g'));

UPDATE public.rpjmdes_standar
SET jenis_kegiatan = btrim(regexp_replace(replace(jenis_kegiatan, chr(160), ' '), '\s+', ' ', 'g'))
WHERE jenis_kegiatan IS NOT NULL
  AND jenis_kegiatan <> btrim(regexp_replace(replace(jenis_kegiatan, chr(160), ' '), '\s+', ' ', 'g'));

UPDATE public.rpjmdes_standar
SET jenis_bidang = btrim(regexp_replace(replace(jenis_bidang, chr(160), ' '), '\s+', ' ', 'g'))
WHERE jenis_bidang IS NOT NULL
  AND jenis_bidang <> btrim(regexp_replace(replace(jenis_bidang, chr(160), ' '), '\s+', ' ', 'g'));

-- 4) VERIFIKASI: tidak boleh ada kode_kegiatan dengan lebih dari satu jenis_bidang.
SELECT btrim(kode_kegiatan) AS kode_kegiatan,
       COUNT(DISTINCT jenis_bidang) AS varian_jenis_bidang,
       COUNT(*) AS jumlah_baris
FROM public.rpjmdes_standar
WHERE kode_kegiatan IS NOT NULL AND btrim(kode_kegiatan) <> ''
GROUP BY btrim(kode_kegiatan)
HAVING COUNT(DISTINCT jenis_bidang) > 1;
-- (harus 0 baris)

-- 5) VERIFIKASI kasus yang dilaporkan: 4 kegiatan operasional DDS harus satu grup.
SELECT kode_unik_full, nama_kegiatan, jenis_bidang, jenis_kegiatan
FROM public.rpjmdes_standar
WHERE btrim(kode_kegiatan) = '01.01.08.'
ORDER BY kode_unik_full;
