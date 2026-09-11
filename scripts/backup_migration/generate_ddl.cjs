#!/usr/bin/env node
/**
 * GENERATE DDL UNTUK SUPABASE BARU
 * Membaca data JSON hasil ekspor dan skema standar proyek,
 * menghasilkan file scripts/setup_new_database.sql
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, 'data');
const OUTPUT_FILE = path.resolve(__dirname, '../setup_new_database.sql');

// Schema definitions dengan tipe kolom presisi
const SCHEMAS = {
    users: `
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
`,

    rab: `
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
`,

    rkpdes: `
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
    stunting            text
);
CREATE INDEX IF NOT EXISTS idx_rkpdes_tahun ON public.rkpdes (tahun);
`,

    du_rkpdes: `
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
`,

    rpjmdes_standar: `
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
`,

    rancangan_rkpdes: `
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
`,

    prioritas_rkpdes: `
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
`,

    prioritas_usulan: `
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
`,

    usulan: `
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
`,

    master_klasifikasi: `
CREATE TABLE IF NOT EXISTS public.master_klasifikasi (
    id                  bigserial PRIMARY KEY,
    bidang              text,
    sub_bidang          text,
    jenis_kegiatan      text,
    kode_klasifikasi    text,
    created_at          timestamptz DEFAULT now()
);
`,

    pagu_anggaran: `
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
`,

    anggaran: `
CREATE TABLE IF NOT EXISTS public.anggaran (
    id                  bigserial PRIMARY KEY,
    sumber              text,
    kode_unik           text,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);
`,

    dokumen_templates: `
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
`,

    dokumen_desa: `
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
`,

    dokumen_form_data: `
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
`,

    dropdown_sdgs: `
CREATE TABLE IF NOT EXISTS public.dropdown_sdgs (
    id          bigserial PRIMARY KEY,
    no          integer,
    sdgs        text,
    created_at  timestamptz DEFAULT now()
);
`,

    kerjasama_pihak_ketiga: `
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
`,

    pembiayaan: `
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
`,

    rktl: `
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
`,

    laporan_komponen_manual: `
CREATE TABLE IF NOT EXISTS public.laporan_komponen_manual (
    id          bigserial PRIMARY KEY,
    tahun       integer NOT NULL,
    tipe        text NOT NULL,
    uraian      text,
    keterangan  text,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);
`,

    program_masuk_desa: `
CREATE TABLE IF NOT EXISTS public.program_masuk_desa (
    id                  bigserial PRIMARY KEY,
    tahun               integer,
    nama_kegiatan       text,
    lokasi_kegiatan     text,
    volume_kegiatan     text,
    sasaran_manfaat     text,
    pagu_anggaran       numeric,
    sumber_anggaran     text,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);
`
};

let sqlOutput = `-- ============================================================
-- SETUP DATABASE BARU: SIA BATETANGNGA (SUPABASE REF: kzvnzgoxzaplaztbvzjy)
-- DDL Otomatis & Lengkap untuk Migrasi Database
-- ============================================================

-- Ekstensi pgcrypto untuk gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

`;

const allTables = Object.keys(SCHEMAS);

for (const t of allTables) {
    sqlOutput += `-- ────────────────────────────────────────────────────────────\n`;
    sqlOutput += `-- TABEL: ${t}\n`;
    sqlOutput += `-- ────────────────────────────────────────────────────────────\n`;
    sqlOutput += `DROP TABLE IF EXISTS public.${t} CASCADE;\n`;
    sqlOutput += SCHEMAS[t].trim() + `\n\n`;
    sqlOutput += `-- RLS & Permissions untuk ${t}\n`;
    sqlOutput += `ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY;\n`;
    sqlOutput += `DROP POLICY IF EXISTS "${t}_all_policy" ON public.${t};\n`;
    sqlOutput += `CREATE POLICY "${t}_all_policy" ON public.${t} FOR ALL USING (true) WITH CHECK (true);\n`;
    sqlOutput += `GRANT ALL ON TABLE public.${t} TO anon, authenticated, service_role;\n`;
    sqlOutput += `DO $$ BEGIN\n`;
    sqlOutput += `    IF EXISTS (SELECT 1 FROM pg_class where relname = '${t}_id_seq') THEN\n`;
    sqlOutput += `        GRANT ALL ON SEQUENCE public.${t}_id_seq TO anon, authenticated, service_role;\n`;
    sqlOutput += `    END IF;\n`;
    sqlOutput += `END $$;\n\n`;
}

fs.writeFileSync(OUTPUT_FILE, sqlOutput, 'utf-8');
console.log(`✅ DDL berhasil dibuat di: ${OUTPUT_FILE}`);
console.log(`   Total tabel yang didefinisikan: ${allTables.length}`);
