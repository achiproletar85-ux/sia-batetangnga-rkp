-- ============================================================
-- SETUP DATABASE BARU: SIA BATETANGNGA (SUPABASE REF: kzvnzgoxzaplaztbvzjy)
-- DDL Otomatis & Lengkap untuk Migrasi Database
-- ============================================================

-- Ekstensi pgcrypto untuk gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ────────────────────────────────────────────────────────────
-- TABEL: users
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.users CASCADE;
CREATE TABLE IF NOT EXISTS public.users (
    id              bigserial PRIMARY KEY,
    username        text NOT NULL UNIQUE,
    password        text NOT NULL,
    name            text NOT NULL,
    role            text NOT NULL DEFAULT 'admin',
    is_active       boolean NOT NULL DEFAULT true,
    login_at        timestamptz,
    last_login_ip   text,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users (username);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);

-- RLS & Permissions untuk users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_all_policy" ON public.users;
CREATE POLICY "users_all_policy" ON public.users FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.users TO anon, authenticated, service_role;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_class where relname = 'users_id_seq') THEN
        GRANT ALL ON SEQUENCE public.users_id_seq TO anon, authenticated, service_role;
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- TABEL: rab
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.rab CASCADE;
CREATE TABLE IF NOT EXISTS public.rab (
    id                  bigserial PRIMARY KEY,
    kode_unik           text,
    kode_unik_full      text,
    tahun               integer,
    nama_kegiatan       text,
    uraian              text,
    bidang              text,
    status              text DEFAULT 'Terencana',
    group_nama          text,
    sub_group_nama      text,
    lokasi              text,
    volume              numeric,
    satuan              text,
    harga_satuan        numeric,
    jumlah_anggaran     numeric,
    sumber_dana         text,
    items               jsonb DEFAULT '[]'::jsonb,
    rpjm_data           jsonb DEFAULT '{}'::jsonb,
    lokasi_kegiatan     text,
    jenis_kegiatan      text,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now(),
    saved_at            timestamptz,
    tipe_anggaran       text NOT NULL DEFAULT 'MURNI',
    id_referensi_murni  bigint,
    CONSTRAINT rab_kode_unik_full_tahun_tipe_key UNIQUE (kode_unik_full, tahun, tipe_anggaran)
);
CREATE INDEX IF NOT EXISTS idx_rab_kode_unik_full ON public.rab (kode_unik_full);
CREATE INDEX IF NOT EXISTS idx_rab_tahun ON public.rab (tahun);
CREATE INDEX IF NOT EXISTS idx_rab_tipe_anggaran ON public.rab (tipe_anggaran);

-- RLS & Permissions untuk rab
ALTER TABLE public.rab ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rab_all_policy" ON public.rab;
CREATE POLICY "rab_all_policy" ON public.rab FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.rab TO anon, authenticated, service_role;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_class where relname = 'rab_id_seq') THEN
        GRANT ALL ON SEQUENCE public.rab_id_seq TO anon, authenticated, service_role;
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- TABEL: rkpdes
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.rkpdes CASCADE;
CREATE TABLE IF NOT EXISTS public.rkpdes (
    id                  bigserial PRIMARY KEY,
    tahun               integer,
    kode_bidang         text,
    kode_sub            text,
    kode_kegiatan       text,
    kode_unik_full      text,
    nama_kegiatan       text,
    lokasi_kegiatan     text,
    volume_kegiatan     text,
    manfaat_l           numeric,
    manfaat_p           numeric,
    manfaat_rtm         numeric,
    total_manfaat       numeric,
    waktu_pelaksanaan   text,
    prakiraan_biaya     numeric,
    sumber_pembiayaan   text,
    pola_pelaksanaan    text,
    rencana_pelaksana   text,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now(),
    sdgs                text,
    verifikasi_proposal text,
    stunting            text,
    bidang              text,
    jenis_kegiatan      text,
    lokasi              text,
    volume              text,
    satuan              text DEFAULT 'Kegiatan',
    sasaran_manfaat     text,
    penerima_manfaat    text,
    target_capaian      text,
    status_rab          text DEFAULT 'Belum Dibuat',
    data_eksisting      text,
    mendukung_sdgs      text
);
CREATE INDEX IF NOT EXISTS idx_rkpdes_tahun ON public.rkpdes (tahun);

-- RLS & Permissions untuk rkpdes
ALTER TABLE public.rkpdes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rkpdes_all_policy" ON public.rkpdes;
CREATE POLICY "rkpdes_all_policy" ON public.rkpdes FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.rkpdes TO anon, authenticated, service_role;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_class where relname = 'rkpdes_id_seq') THEN
        GRANT ALL ON SEQUENCE public.rkpdes_id_seq TO anon, authenticated, service_role;
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- TABEL: du_rkpdes
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.du_rkpdes CASCADE;
CREATE TABLE IF NOT EXISTS public.du_rkpdes (
    id                  bigserial PRIMARY KEY,
    tahun               integer NOT NULL,
    bidang              text NOT NULL,
    jenis_kegiatan      text NOT NULL,
    created_at          timestamptz DEFAULT now(),
    kode_unik_full      text,
    kode_unik           text,
    jenis_bidang        text,
    nama_kegiatan       text,
    sub_kegiatan        text,
    volume_satuan       text,
    mendukung_sdgs      text,
    data_eksisting      text,
    lokasi              text,
    volume              text,
    penerima_manfaat    text,
    waktu_pelaksanaan   text,
    prakiraan_biaya     numeric DEFAULT 0,
    sumber_pembiayaan   text,
    pagu_rpjm           numeric DEFAULT 0,
    total_manfaat       numeric DEFAULT 0,
    skor_kewenangan     numeric DEFAULT 0,
    skor_sdgs           numeric DEFAULT 0,
    skor_kabupaten      numeric DEFAULT 0,
    skor_sumber_daya    numeric DEFAULT 0,
    total_skor          numeric DEFAULT 0,
    updated_at          timestamptz,
    kode_bidang         text,
    kode_sub            text,
    kode_kegiatan       text,
    ketua               text,
    jabatan_ketua       text,
    updated_by          text,
    urutan_prioritas    text,
    penerima_laki       numeric,
    penerima_perempuan  numeric,
    penerima_rtm        numeric
);
CREATE INDEX IF NOT EXISTS idx_du_rkpdes_tahun ON public.du_rkpdes (tahun);
CREATE INDEX IF NOT EXISTS idx_du_rkpdes_kode_unik_full ON public.du_rkpdes (kode_unik_full);

-- RLS & Permissions untuk du_rkpdes
ALTER TABLE public.du_rkpdes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "du_rkpdes_all_policy" ON public.du_rkpdes;
CREATE POLICY "du_rkpdes_all_policy" ON public.du_rkpdes FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.du_rkpdes TO anon, authenticated, service_role;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_class where relname = 'du_rkpdes_id_seq') THEN
        GRANT ALL ON SEQUENCE public.du_rkpdes_id_seq TO anon, authenticated, service_role;
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- TABEL: rpjmdes_standar
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.rpjmdes_standar CASCADE;
CREATE TABLE IF NOT EXISTS public.rpjmdes_standar (
    id                  bigserial PRIMARY KEY,
    kode_bidang         text,
    kode_sub            text,
    kode_kegiatan       text,
    kode_unik_full      text,
    nama_kegiatan       text,
    pagu_rpjm           numeric,
    sifat_kegiatan      text,
    kode_unik_h         text,
    no_urut             integer,
    volume_kegiatan     text,
    lokasi_kegiatan     text,
    usulan_berdasarkan  text,
    bidang              text,
    jenis_bidang        text,
    jenis_kegiatan      text,
    sdgs                text,
    data_existing       text,
    nama_pengusul       text,
    manfaat_l           numeric,
    manfaat_p           numeric,
    manfaat_rtm         numeric,
    waktu_pelaksanaan   text,
    total_manfaat       numeric,
    anggaran_perubahan  numeric,
    sumber_dana         text,
    pola_pelaksanaan    text,
    skala_prioritas     text,
    urutan_prioritas    text,
    masalah             text,
    penyebab            text,
    potensi             text,
    alternatif_pemecahan text,
    tindakan_masalah    text,
    tindakan_layak      text,
    target_2023         text,
    target_2024         text,
    target_2025         text,
    target_2026         text,
    target_2027         text,
    target_2028         text,
    target_2029         text,
    target_2030         text,
    dirasakan           numeric,
    parah               numeric,
    hambat              numeric,
    sering              numeric,
    potensi_skor        numeric,
    jumlah_nilai_total  numeric,
    uraian_peringkat    text,
    visi_misi           numeric,
    pokok_bpd           numeric,
    program_masyarakat  numeric,
    prioritas_sdgs_skor numeric,
    total_kesesuaian    numeric,
    ranking             text,
    penerima_manfaat_bg numeric,
    status_sembunyi     text,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now(),
    kode_unik           text,
    uraian_rab          text,
    volume_rab          text,
    satuan_rab          text,
    harga_satuan_rab    numeric,
    total_rab           numeric,
    sudah_ditarik_tahun jsonb DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_rpjmdes_standar_kode_unik_full ON public.rpjmdes_standar (kode_unik_full);

-- RLS & Permissions untuk rpjmdes_standar
ALTER TABLE public.rpjmdes_standar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rpjmdes_standar_all_policy" ON public.rpjmdes_standar;
CREATE POLICY "rpjmdes_standar_all_policy" ON public.rpjmdes_standar FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.rpjmdes_standar TO anon, authenticated, service_role;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_class where relname = 'rpjmdes_standar_id_seq') THEN
        GRANT ALL ON SEQUENCE public.rpjmdes_standar_id_seq TO anon, authenticated, service_role;
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- TABEL: rancangan_rkpdes
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.rancangan_rkpdes CASCADE;
CREATE TABLE IF NOT EXISTS public.rancangan_rkpdes (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tahun               integer,
    bidang              numeric,
    sub_kegiatan        text,
    mendukung_sdgs      text,
    data_eksisting      text,
    lokasi              text,
    volume_satuan       text,
    penerima_laki       numeric,
    penerima_perempuan  numeric,
    penerima_rtm        numeric,
    prakiraan_biaya     numeric,
    sumber_pembiayaan   text,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now(),
    id_rpjm_ref         text,
    kode_bidang         text,
    kode_sub            text,
    kode_kegiatan       text,
    kode_unik_full      text,
    kode_unik           text,
    nama_kegiatan       text,
    pagu_rpjm           numeric,
    sifat_kegiatan      text,
    kode_unik_h         text,
    no_urut             integer,
    volume_kegiatan     text,
    lokasi_kegiatan     text,
    usulan_berdasarkan  text,
    jenis_bidang        text,
    jenis_kegiatan      text,
    sdgs                text,
    data_existing       text,
    nama_pengusul       text,
    manfaat_l           numeric,
    manfaat_p           numeric,
    manfaat_rtm         numeric,
    waktu_pelaksanaan   text,
    total_manfaat       numeric,
    anggaran_perubahan  numeric,
    sumber_dana         text,
    pola_pelaksanaan    text,
    skala_prioritas     text,
    urutan_prioritas    text,
    masalah             text,
    penyebab            text,
    potensi             text,
    alternatif_pemecahan text,
    tindakan_masalah    text,
    tindakan_layak      text,
    target_2023         text,
    target_2024         text,
    target_2025         text,
    target_2026         text,
    target_2027         text,
    target_2028         text,
    target_2029         text,
    target_2030         text,
    dirasakan           numeric,
    parah               numeric,
    hambat              numeric,
    sering              numeric,
    potensi_skor        numeric,
    jumlah_nilai_total  numeric,
    uraian_peringkat    text,
    visi_misi           numeric,
    pokok_bpd           numeric,
    program_masyarakat  numeric,
    prioritas_sdgs_skor numeric,
    total_kesesuaian    numeric,
    ranking             text,
    penerima_manfaat_bg numeric,
    status_sembunyi     text,
    uraian_rab          text,
    volume_rab          text,
    satuan_rab          text,
    harga_satuan_rab    numeric,
    total_rab           numeric,
    skor_kewenangan     numeric,
    skor_sdgs           numeric,
    skor_kabupaten      numeric,
    skor_sumber_daya    numeric,
    total_skor          numeric
);
CREATE INDEX IF NOT EXISTS idx_rancangan_rkpdes_tahun ON public.rancangan_rkpdes (tahun);
CREATE INDEX IF NOT EXISTS idx_rancangan_rkpdes_kode_unik_full ON public.rancangan_rkpdes (kode_unik_full);

-- RLS & Permissions untuk rancangan_rkpdes
ALTER TABLE public.rancangan_rkpdes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rancangan_rkpdes_all_policy" ON public.rancangan_rkpdes;
CREATE POLICY "rancangan_rkpdes_all_policy" ON public.rancangan_rkpdes FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.rancangan_rkpdes TO anon, authenticated, service_role;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_class where relname = 'rancangan_rkpdes_id_seq') THEN
        GRANT ALL ON SEQUENCE public.rancangan_rkpdes_id_seq TO anon, authenticated, service_role;
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- TABEL: prioritas_rkpdes
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.prioritas_rkpdes CASCADE;
CREATE TABLE IF NOT EXISTS public.prioritas_rkpdes (
    id                  bigserial PRIMARY KEY,
    tahun               integer,
    bidang_kode         text,
    sub_bidang          text,
    jenis_kegiatan      text,
    lokasi              text,
    volume              text,
    skor_kewenangan     numeric,
    skor_sdgs           numeric,
    skor_kabupaten      numeric,
    skor_sumber_daya    numeric,
    total_skor          numeric,
    ranking             text,
    created_at          timestamptz DEFAULT now(),
    kode_unik           text,
    kode_unik_full      text,
    kode_bidang         text,
    kode_sub            text,
    kode_kegiatan       text,
    nama_bidang         text,
    bidang              text,
    jenis_bidang        text,
    nama_kegiatan       text,
    sub_kegiatan        text,
    mendukung_sdgs      text,
    data_eksisting      text,
    volume_satuan       text,
    penerima_manfaat    text,
    waktu_pelaksanaan   text,
    prakiraan_biaya     numeric,
    pagu_rpjm           numeric,
    total_manfaat       numeric,
    sumber_pembiayaan   text,
    updated_at          timestamptz
);
CREATE INDEX IF NOT EXISTS idx_prioritas_rkpdes_tahun ON public.prioritas_rkpdes (tahun);
CREATE INDEX IF NOT EXISTS idx_prioritas_rkpdes_kode_unik_full ON public.prioritas_rkpdes (kode_unik_full);

-- RLS & Permissions untuk prioritas_rkpdes
ALTER TABLE public.prioritas_rkpdes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prioritas_rkpdes_all_policy" ON public.prioritas_rkpdes;
CREATE POLICY "prioritas_rkpdes_all_policy" ON public.prioritas_rkpdes FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.prioritas_rkpdes TO anon, authenticated, service_role;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_class where relname = 'prioritas_rkpdes_id_seq') THEN
        GRANT ALL ON SEQUENCE public.prioritas_rkpdes_id_seq TO anon, authenticated, service_role;
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- TABEL: prioritas_usulan
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.prioritas_usulan CASCADE;
CREATE TABLE IF NOT EXISTS public.prioritas_usulan (
    id                  bigserial PRIMARY KEY,
    tahun               integer,
    kode_bidang         text,
    kode_sub            text,
    kode_kegiatan       text,
    kode_unik_full      text,
    kode_unik_h         text,
    kode_unik           text,
    no_urut             integer,
    nama_kegiatan       text,
    jenis_bidang        text,
    jenis_kegiatan      text,
    urutan_prioritas    text,
    skala_prioritas     text,
    ranking             text,
    sifat_kegiatan      text,
    pola_pelaksanaan    text,
    bidang              text,
    data_existing       text,
    lokasi_kegiatan     text,
    volume_kegiatan     text,
    waktu_pelaksanaan   text,
    usulan_berdasarkan  text,
    nama_pengusul       text,
    sdgs                text,
    manfaat_l           numeric,
    manfaat_p           numeric,
    manfaat_rtm         numeric,
    total_manfaat       numeric,
    penerima_manfaat_bg numeric,
    pagu_rpjm           numeric,
    anggaran_perubahan  numeric,
    sumber_dana         text,
    masalah             text,
    penyebab            text,
    potensi             text,
    alternatif_pemecahan text,
    tindakan_masalah    text,
    tindakan_layak      text,
    target_2023         text,
    target_2024         text,
    target_2025         text,
    target_2026         text,
    target_2027         text,
    target_2028         text,
    target_2029         text,
    target_2030         text,
    dirasakan           numeric,
    parah               numeric,
    hambat              numeric,
    sering              numeric,
    potensi_skor        numeric,
    jumlah_nilai_total  numeric,
    uraian_peringkat    text,
    visi_misi           numeric,
    pokok_bpd           numeric,
    program_masyarakat  numeric,
    prioritas_sdgs_skor numeric,
    total_kesesuaian    numeric,
    status_sembunyi     text,
    uraian_rab          text,
    volume_rab          text,
    satuan_rab          text,
    harga_satuan_rab    numeric,
    total_rab           numeric,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now(),
    ketua               text,
    jabatan_ketua       text,
    updated_by          text,
    volume              text,
    penerima_manfaat    text
);
CREATE INDEX IF NOT EXISTS idx_prioritas_usulan_tahun ON public.prioritas_usulan (tahun);
CREATE INDEX IF NOT EXISTS idx_prioritas_usulan_kode_unik_full ON public.prioritas_usulan (kode_unik_full);

-- RLS & Permissions untuk prioritas_usulan
ALTER TABLE public.prioritas_usulan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prioritas_usulan_all_policy" ON public.prioritas_usulan;
CREATE POLICY "prioritas_usulan_all_policy" ON public.prioritas_usulan FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.prioritas_usulan TO anon, authenticated, service_role;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_class where relname = 'prioritas_usulan_id_seq') THEN
        GRANT ALL ON SEQUENCE public.prioritas_usulan_id_seq TO anon, authenticated, service_role;
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- TABEL: usulan
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.usulan CASCADE;
CREATE TABLE IF NOT EXISTS public.usulan (
    id              bigserial PRIMARY KEY,
    tahun           integer,
    tahun_usulan    integer,
    bidang          text,
    kode_unik_full  text,
    kode_unik       text,
    prioritas       integer,
    nama_kegiatan   text,
    sdgs            text,
    data_eksisting  text,
    kegiatan        text,
    lokasi          text,
    volume          text,
    biaya           numeric,
    sasaran         text,
    pengusul        text,
    laki_laki       numeric,
    perempuan       numeric,
    rtm             numeric,
    sumber_dana     text,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_usulan_tahun ON public.usulan (tahun);

-- RLS & Permissions untuk usulan
ALTER TABLE public.usulan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "usulan_all_policy" ON public.usulan;
CREATE POLICY "usulan_all_policy" ON public.usulan FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.usulan TO anon, authenticated, service_role;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_class where relname = 'usulan_id_seq') THEN
        GRANT ALL ON SEQUENCE public.usulan_id_seq TO anon, authenticated, service_role;
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- TABEL: master_klasifikasi
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.master_klasifikasi CASCADE;
CREATE TABLE IF NOT EXISTS public.master_klasifikasi (
    id                  bigserial PRIMARY KEY,
    bidang              text,
    sub_bidang          text,
    jenis_kegiatan      text,
    kode_klasifikasi    text,
    created_at          timestamptz DEFAULT now()
);

-- RLS & Permissions untuk master_klasifikasi
ALTER TABLE public.master_klasifikasi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "master_klasifikasi_all_policy" ON public.master_klasifikasi;
CREATE POLICY "master_klasifikasi_all_policy" ON public.master_klasifikasi FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.master_klasifikasi TO anon, authenticated, service_role;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_class where relname = 'master_klasifikasi_id_seq') THEN
        GRANT ALL ON SEQUENCE public.master_klasifikasi_id_seq TO anon, authenticated, service_role;
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- TABEL: pagu_anggaran
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.pagu_anggaran CASCADE;
CREATE TABLE IF NOT EXISTS public.pagu_anggaran (
    id          bigserial PRIMARY KEY,
    tahun       integer NOT NULL,
    sumber_dana text NOT NULL,
    pagu        numeric NOT NULL DEFAULT 0,
    keterangan  text,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now(),
    CONSTRAINT pagu_anggaran_tahun_sumber_dana_key UNIQUE (tahun, sumber_dana)
);
CREATE INDEX IF NOT EXISTS idx_pagu_anggaran_tahun ON public.pagu_anggaran (tahun);

-- RLS & Permissions untuk pagu_anggaran
ALTER TABLE public.pagu_anggaran ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pagu_anggaran_all_policy" ON public.pagu_anggaran;
CREATE POLICY "pagu_anggaran_all_policy" ON public.pagu_anggaran FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.pagu_anggaran TO anon, authenticated, service_role;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_class where relname = 'pagu_anggaran_id_seq') THEN
        GRANT ALL ON SEQUENCE public.pagu_anggaran_id_seq TO anon, authenticated, service_role;
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- TABEL: anggaran
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.anggaran CASCADE;
CREATE TABLE IF NOT EXISTS public.anggaran (
    id                  bigserial PRIMARY KEY,
    sumber              text,
    kode_unik           text,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-- RLS & Permissions untuk anggaran
ALTER TABLE public.anggaran ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anggaran_all_policy" ON public.anggaran;
CREATE POLICY "anggaran_all_policy" ON public.anggaran FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.anggaran TO anon, authenticated, service_role;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_class where relname = 'anggaran_id_seq') THEN
        GRANT ALL ON SEQUENCE public.anggaran_id_seq TO anon, authenticated, service_role;
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- TABEL: dokumen_templates
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.dokumen_templates CASCADE;
CREATE TABLE IF NOT EXISTS public.dokumen_templates (
    id              bigserial PRIMARY KEY,
    code            text NOT NULL UNIQUE,
    name            text,
    stage           text,
    documentId      text,
    is_real         boolean DEFAULT false,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now(),
    fields          jsonb DEFAULT '[]'::jsonb,
    table_headers   jsonb DEFAULT '[]'::jsonb
);

-- RLS & Permissions untuk dokumen_templates
ALTER TABLE public.dokumen_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dokumen_templates_all_policy" ON public.dokumen_templates;
CREATE POLICY "dokumen_templates_all_policy" ON public.dokumen_templates FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.dokumen_templates TO anon, authenticated, service_role;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_class where relname = 'dokumen_templates_id_seq') THEN
        GRANT ALL ON SEQUENCE public.dokumen_templates_id_seq TO anon, authenticated, service_role;
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- TABEL: dokumen_desa
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.dokumen_desa CASCADE;
CREATE TABLE IF NOT EXISTS public.dokumen_desa (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    docid       text,
    tahun       integer,
    nama_dokumen text,
    kategori    text,
    content     text,
    template_id text,
    data        jsonb,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dokumen_desa_tahun ON public.dokumen_desa (tahun);

-- RLS & Permissions untuk dokumen_desa
ALTER TABLE public.dokumen_desa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dokumen_desa_all_policy" ON public.dokumen_desa;
CREATE POLICY "dokumen_desa_all_policy" ON public.dokumen_desa FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.dokumen_desa TO anon, authenticated, service_role;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_class where relname = 'dokumen_desa_id_seq') THEN
        GRANT ALL ON SEQUENCE public.dokumen_desa_id_seq TO anon, authenticated, service_role;
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- TABEL: dokumen_form_data
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.dokumen_form_data CASCADE;
CREATE TABLE IF NOT EXISTS public.dokumen_form_data (
    id                      bigserial PRIMARY KEY,
    doc_code                text,
    google_docs_id          text,
    title                   text,
    tahun                   integer,
    fields                  jsonb DEFAULT '{}'::jsonb,
    tables                  jsonb DEFAULT '{}'::jsonb,
    last_generated_doc_id   text,
    last_generated_pdf_url  text,
    syncing                 boolean DEFAULT false,
    synced_at               timestamptz,
    created_at              timestamptz DEFAULT now(),
    updated_at              timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dokumen_form_data_lookup ON public.dokumen_form_data (doc_code, tahun);

-- RLS & Permissions untuk dokumen_form_data
ALTER TABLE public.dokumen_form_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dokumen_form_data_all_policy" ON public.dokumen_form_data;
CREATE POLICY "dokumen_form_data_all_policy" ON public.dokumen_form_data FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.dokumen_form_data TO anon, authenticated, service_role;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_class where relname = 'dokumen_form_data_id_seq') THEN
        GRANT ALL ON SEQUENCE public.dokumen_form_data_id_seq TO anon, authenticated, service_role;
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- TABEL: dropdown_sdgs
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.dropdown_sdgs CASCADE;
CREATE TABLE IF NOT EXISTS public.dropdown_sdgs (
    id          bigserial PRIMARY KEY,
    no          integer,
    sdgs        text,
    created_at  timestamptz DEFAULT now()
);

-- RLS & Permissions untuk dropdown_sdgs
ALTER TABLE public.dropdown_sdgs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dropdown_sdgs_all_policy" ON public.dropdown_sdgs;
CREATE POLICY "dropdown_sdgs_all_policy" ON public.dropdown_sdgs FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.dropdown_sdgs TO anon, authenticated, service_role;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_class where relname = 'dropdown_sdgs_id_seq') THEN
        GRANT ALL ON SEQUENCE public.dropdown_sdgs_id_seq TO anon, authenticated, service_role;
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- TABEL: kerjasama_pihak_ketiga
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.kerjasama_pihak_ketiga CASCADE;
CREATE TABLE IF NOT EXISTS public.kerjasama_pihak_ketiga (
    id                  bigserial PRIMARY KEY,
    tahun               integer,
    bidang_ke           integer,
    nomor_urut          integer,
    nama_kegiatan       text,
    sdgs_desa           text,
    lokasi              text,
    volume_satuan       text,
    penerima_manfaat    text,
    biaya_desa          numeric,
    sumber_dana         text,
    biaya_pihak_ketiga  numeric,
    nama_pihak_ketiga   text,
    created_at          timestamptz DEFAULT now()
);

-- RLS & Permissions untuk kerjasama_pihak_ketiga
ALTER TABLE public.kerjasama_pihak_ketiga ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kerjasama_pihak_ketiga_all_policy" ON public.kerjasama_pihak_ketiga;
CREATE POLICY "kerjasama_pihak_ketiga_all_policy" ON public.kerjasama_pihak_ketiga FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.kerjasama_pihak_ketiga TO anon, authenticated, service_role;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_class where relname = 'kerjasama_pihak_ketiga_id_seq') THEN
        GRANT ALL ON SEQUENCE public.kerjasama_pihak_ketiga_id_seq TO anon, authenticated, service_role;
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- TABEL: pembiayaan
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.pembiayaan CASCADE;
CREATE TABLE IF NOT EXISTS public.pembiayaan (
    id                          bigserial PRIMARY KEY,
    tahun                       integer,
    silpa_tahun_sebelumnya      numeric,
    pencairan_dana_cadangan     numeric,
    hasil_penjualan_kekayaan    numeric,
    pembentukan_dana_cadangan   numeric,
    penyertaan_modal_desa       numeric,
    created_at                  timestamptz DEFAULT now(),
    updated_at                  timestamptz DEFAULT now()
);

-- RLS & Permissions untuk pembiayaan
ALTER TABLE public.pembiayaan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pembiayaan_all_policy" ON public.pembiayaan;
CREATE POLICY "pembiayaan_all_policy" ON public.pembiayaan FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.pembiayaan TO anon, authenticated, service_role;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_class where relname = 'pembiayaan_id_seq') THEN
        GRANT ALL ON SEQUENCE public.pembiayaan_id_seq TO anon, authenticated, service_role;
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- TABEL: rktl
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.rktl CASCADE;
CREATE TABLE IF NOT EXISTS public.rktl (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tahun           integer,
    rktl_items      jsonb DEFAULT '[]'::jsonb,
    tanggal_ttd     text,
    ketua_tim       text,
    tim_penyusun    jsonb DEFAULT '[]'::jsonb,
    fasilitator     text,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

-- RLS & Permissions untuk rktl
ALTER TABLE public.rktl ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rktl_all_policy" ON public.rktl;
CREATE POLICY "rktl_all_policy" ON public.rktl FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.rktl TO anon, authenticated, service_role;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_class where relname = 'rktl_id_seq') THEN
        GRANT ALL ON SEQUENCE public.rktl_id_seq TO anon, authenticated, service_role;
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- TABEL: laporan_komponen_manual
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.laporan_komponen_manual CASCADE;
CREATE TABLE IF NOT EXISTS public.laporan_komponen_manual (
    id          bigserial PRIMARY KEY,
    tahun       integer NOT NULL,
    tipe        text NOT NULL,
    uraian      text,
    keterangan  text,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);

-- RLS & Permissions untuk laporan_komponen_manual
ALTER TABLE public.laporan_komponen_manual ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "laporan_komponen_manual_all_policy" ON public.laporan_komponen_manual;
CREATE POLICY "laporan_komponen_manual_all_policy" ON public.laporan_komponen_manual FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.laporan_komponen_manual TO anon, authenticated, service_role;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_class where relname = 'laporan_komponen_manual_id_seq') THEN
        GRANT ALL ON SEQUENCE public.laporan_komponen_manual_id_seq TO anon, authenticated, service_role;
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- TABEL: program_masuk_desa
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.program_masuk_desa CASCADE;
CREATE TABLE IF NOT EXISTS public.program_masuk_desa (
    id                  bigserial PRIMARY KEY,
    tahun               integer NOT NULL,
    bidang              integer,
    sub_kegiatan        text,
    nama_program        text,
    nama_kegiatan       text,
    instansi_pemberi    text,
    pelaksana           text,
    sumber_dana         text,
    mendukung_sdgs      text,
    tahun_pelaksanaan   integer,
    lokasi              text,
    lokasi_kegiatan     text,
    volume              text,
    volume_kegiatan     text,
    satuan              text,
    sasaran_manfaat     text,
    total_pagu          numeric DEFAULT 0,
    anggaran            numeric DEFAULT 0,
    pagu_anggaran       numeric DEFAULT 0,
    sumber_anggaran     text,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_program_masuk_desa_tahun ON public.program_masuk_desa (tahun);

-- RLS & Permissions untuk program_masuk_desa
ALTER TABLE public.program_masuk_desa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "program_masuk_desa_all_policy" ON public.program_masuk_desa;
CREATE POLICY "program_masuk_desa_all_policy" ON public.program_masuk_desa FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.program_masuk_desa TO anon, authenticated, service_role;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_class where relname = 'program_masuk_desa_id_seq') THEN
        GRANT ALL ON SEQUENCE public.program_masuk_desa_id_seq TO anon, authenticated, service_role;
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- TABEL: tim_penyusun
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.tim_penyusun CASCADE;
CREATE TABLE IF NOT EXISTS public.tim_penyusun (
    id           bigserial PRIMARY KEY,
    tahun        integer NOT NULL DEFAULT 2027,
    nama         text,
    jabatan_tim  text DEFAULT 'Anggota',
    created_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tim_penyusun_tahun ON public.tim_penyusun (tahun);

-- RLS & Permissions untuk tim_penyusun
ALTER TABLE public.tim_penyusun ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tim_penyusun_all" ON public.tim_penyusun;
CREATE POLICY "tim_penyusun_all" ON public.tim_penyusun FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.tim_penyusun TO anon, authenticated, service_role;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'tim_penyusun_id_seq') THEN
        GRANT ALL ON SEQUENCE public.tim_penyusun_id_seq TO anon, authenticated, service_role;
    END IF;
END $$;


