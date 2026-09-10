-- ============================================================
-- MIGRASI RAPIKAN TABEL rab (sku: SIA Batetangnga)
-- Jalankan di: Supabase Dashboard -> SQL Editor -> Run
-- Aman: data lama dicadangkan ke rab_bak terlebih dahulu.
-- ============================================================

-- 0) Back up data lama
CREATE TABLE IF NOT EXISTS rab_bak AS SELECT * FROM rab;

-- 1) Buat tabel rab versi BARU (struktur kanonik, 1 kolom per makna)
DROP TABLE IF EXISTS rab_new;
CREATE TABLE rab_new (
    id               bigint PRIMARY KEY,
    kode_unik        text,
    kode_unik_full   text,
    tahun            integer,
    nama_kegiatan    text,
    uraian           text,
    bidang           text,
    status           text DEFAULT 'Terencana',
    group_nama       text,
    sub_group_nama   text,
    lokasi           text,
    volume           numeric,
    satuan           text,
    harga_satuan     numeric,
    jumlah_anggaran  numeric,
    sumber_dana      text,
    items            jsonb DEFAULT '[]',
    rpjm_data        jsonb DEFAULT '{}',
    lokasi_kegiatan  text,
    jenis_kegiatan   text,
    created_at       timestamptz DEFAULT now(),
    updated_at       timestamptz DEFAULT now(),
    saved_at         timestamptz
);

-- 2) Pindahkan & rafikan data lama ke struktur baru
INSERT INTO rab_new (
    id, kode_unik, kode_unik_full, tahun,
    nama_kegiatan, uraian, bidang, status,
    group_nama, sub_group_nama, lokasi,
    volume, satuan, harga_satuan, jumlah_anggaran, sumber_dana,
    items, rpjm_data,
    created_at, updated_at, saved_at
)
SELECT
    id,
    kode_unik,
    kode_unik_full,
    tahun,
    uraian,
    uraian,
    bidang,
    COALESCE(status, 'Terencana'),
    group_nama,
    sub_group_nama,
    rpjm_data->>'lokasi_kegiatan',
    COALESCE(volume, volume_rab),
    COALESCE(satuan, satuan_rab),
    COALESCE(harga_satuan, harga_satuan_rab),
    COALESCE(jumlah_anggaran, pagu_rab, total_biaya, total_harga, jumlah_biaya, pagu_anggaran, total_anggaran, 0),
    COALESCE(sumber_dana, sumber_dana_rab, sumber_biaya),
    items,
    rpjm_data,
    created_at,
    updated_at,
    saved_at
FROM rab;

-- 3) Ganti tabel lama dengan yang baru
ALTER TABLE rab RENAME TO rab_lama;
ALTER TABLE rab_new RENAME TO rab;

-- 4) Indeks pendukung
CREATE INDEX IF NOT EXISTS idx_rab_tahun        ON rab(tahun);
CREATE INDEX IF NOT EXISTS idx_rab_kode_unik    ON rab(kode_unik_full);

-- 5) Aktifkan RLS untuk tabel baru & beri akses anon/service (sesuaikan kebijakan project Anda)
ALTER TABLE rab ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rab' AND policyname = 'rab_public_all') THEN
        CREATE POLICY rab_public_all ON rab FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Catatan:
--   * Ganti nama tabel rab_lama jadi rab_bak jika ingin dipakai sebagai backup bernama tetap:
--     ALTER TABLE rab_lama RENAME TO rab_bak;
--   * Jika ada constraint unik kode_unik_full+tahun, bisa tambahkan:
--     ALTER TABLE rab ADD CONSTRAINT rab_unique UNIQUE (kode_unik_full, tahun);
--   * Setelah yakin, tabel rab_lama / rab_bak boleh di-drop manual.