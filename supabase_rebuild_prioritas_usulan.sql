-- ============================================================
-- SQL SCRIPT: REBUILD TABEL prioritas_usulan
-- Agar skema sesuai dengan rpjmdes_standar (bersih, tidak ada
-- kolom aneh seperti sub_kegiatan / volume_satuan / rangking).
--
-- CARA PAKAI:
--   Buka Supabase Dashboard -> SQL Editor
--   Tempel seluruh script ini, lalu klik RUN.
--
-- PERHATIAN:
--   Script ini MENGHAPUS (DROP) tabel prioritas_usulan beserta
--   seluruh isinya, lalu membuat ulang dengan struktur yang benar.
--   Pastikan Anda sudah punya backup data bila perlu.
-- ============================================================

-- ============================================================
-- 1. HAPUS TABEL LAMA (CASCADE ikut menghapus policy/indeks)
-- ============================================================
DROP TABLE IF EXISTS public.prioritas_usulan CASCADE;

-- ============================================================
-- 2. BUAT ULANG TABEL prioritas_usulan
--    Struktur meniru rpjmdes_standar + kolom `tahun`
--    (karena prioritas usulan difilter per tahun anggaran)
-- ============================================================
CREATE TABLE public.prioritas_usulan (
    id                   bigserial PRIMARY KEY,
    tahun                integer NOT NULL DEFAULT 2027,

    -- Kode & identitas kegiatan
    kode_bidang          text,
    kode_sub             text,
    kode_kegiatan        text,
    kode_unik_full       text,
    kode_unik_h          text,
    kode_unik            character varying,
    no_urut              integer,

    -- Nama & klasifikasi
    nama_kegiatan        text,
    jenis_bidang         text,
    jenis_kegiatan       text,
    urutan_prioritas     text,
    skala_prioritas      text,
    ranking              text,
    sifat_kegiatan       text,
    pola_pelaksanaan     text,

    -- Bidang (teks, contoh: 'Bidang Penyelenggaraan Pemerintah Desa')
    bidang               text,

    -- Data perencanaan
    data_existing        text,
    lokasi_kegiatan      text,
    volume_kegiatan      text,
    waktu_pelaksanaan    text,
    usulan_berdasarkan   text,
    nama_pengusul        text,

    -- SDGs
    sdgs                 text,

    -- Penerima manfaat
    manfaat_l            integer,
    manfaat_p            integer,
    manfaat_rtm          integer,
    total_manfaat        integer,
    penerima_manfaat_bg  integer,

    -- Anggaran
    pagu_rpjm            numeric,
    anggaran_perubahan   numeric,
    sumber_dana          text,

    -- Analisis masalah & potensi
    masalah              text,
    penyebab             text,
    potensi              text,
    alternatif_pemecahan text,
    tindakan_masalah     text,
    tindakan_layak       text,

    -- Target per tahun (teks: bisa 'Ya', '2027', '-', kosong)
    target_2023          text,
    target_2024          text,
    target_2025          text,
    target_2026          text,
    target_2027          text,
    target_2028          text,
    target_2029          text,
    target_2030          text,

    -- Penilaian / skoring
    dirasakan            integer,
    parah                integer,
    hambat               integer,
    sering               integer,
    potensi_skor         integer,
    jumlah_nilai_total   integer,
    uraian_peringkat     text,
    visi_misi            integer,
    pokok_bpd            integer,
    program_masyarakat   integer,
    prioritas_sdgs_skor  integer,
    total_kesesuaian     integer,
    status_sembunyi      text,

    -- Data RAB
    uraian_rab           text,
    volume_rab           numeric,
    satuan_rab           text,
    harga_satuan_rab     numeric,
    total_rab            numeric,

    -- Timestamp
    created_at           timestamp without time zone DEFAULT now(),
    updated_at           timestamp without time zone DEFAULT now()
);

-- ============================================================
-- 3. INDEKS (pencarian cepat berdasarkan tahun)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_prioritas_usulan_tahun ON public.prioritas_usulan (tahun);

-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS) + POLICY AKSES BEBAS
--    (sesuai kebutuhan aplikasi yang memakai anon key)
-- ============================================================
ALTER TABLE public.prioritas_usulan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read all"  ON public.prioritas_usulan;
DROP POLICY IF EXISTS "Allow insert all" ON public.prioritas_usulan;
DROP POLICY IF EXISTS "Allow update all" ON public.prioritas_usulan;
DROP POLICY IF EXISTS "Allow delete all" ON public.prioritas_usulan;

CREATE POLICY "Allow read all"  ON public.prioritas_usulan FOR SELECT USING (true);
CREATE POLICY "Allow insert all" ON public.prioritas_usulan FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update all" ON public.prioritas_usulan FOR UPDATE USING (true);
CREATE POLICY "Allow delete all" ON public.prioritas_usulan FOR DELETE USING (true);

-- ============================================================
-- 5. BERI AKSES KE SERVICE ROLE / ANON (opsional tapi aman)
-- ============================================================
GRANT ALL ON TABLE public.prioritas_usulan TO anon, authenticated, service_role;
GRANT ALL ON SEQUENCE public.prioritas_usulan_id_seq TO anon, authenticated, service_role;

-- ============================================================
-- 6. RELOAD SCHEMA CACHE PostgREST
-- ============================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- SELESAI
-- ============================================================