-- ============================================================
-- SQL SCRIPT: BUAT TABEL usulan (usulan prioritas pembangunan)
-- Struktur mengakomodasi BOTH:
--   1) Data lama usulan-storage.json (bidang, kode_unik_full,
--      prioritas, nama_kegiatan, sdgs, data_eksisting, lokasi,
--      volume, laki_laki, perempuan, rtm, biaya, sumber_dana)
--   2) Form usulan.html saat ini (kegiatan, lokasi, volume,
--      biaya, sasaran, pengusul)
--
-- CARA PAKAI:
--   Supabase Dashboard -> SQL Editor -> tempel & RUN.
-- ============================================================

-- ============================================================
-- 1. BUAT TABEL (IDEMPOTEN)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.usulan (
    id                 bigserial PRIMARY KEY,
    tahun              integer NOT NULL DEFAULT 2027,
    tahun_usulan       integer,

    -- Identitas & klasifikasi (dari data lama)
    bidang             text,
    kode_unik_full     text,
    kode_unik          text,
    prioritas          integer,
    nama_kegiatan      text,
    sdgs               text,
    data_eksisting     text,

    -- Data formulir usulan.html (kanonik)
    kegiatan           text,
    lokasi             text,
    volume             text,
    biaya              numeric DEFAULT 0,
    sasaran            text,
    pengusul           text,

    -- Penerima manfaat (dari data lama)
    laki_laki          integer DEFAULT 0,
    perempuan          integer DEFAULT 0,
    rtm                integer DEFAULT 0,

    -- Sumber dana
    sumber_dana        text,

    -- Timestamp
    created_at         timestamp without time zone DEFAULT now(),
    updated_at         timestamp without time zone DEFAULT now()
);

-- ============================================================
-- 2. INDEKS
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_usulan_tahun ON public.usulan (tahun);

-- ============================================================
-- 3. ROW LEVEL SECURITY + POLICY AKSES BEBAS
-- ============================================================
ALTER TABLE public.usulan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read all"  ON public.usulan;
DROP POLICY IF EXISTS "Allow insert all" ON public.usulan;
DROP POLICY IF EXISTS "Allow update all" ON public.usulan;
DROP POLICY IF EXISTS "Allow delete all" ON public.usulan;

CREATE POLICY "Allow read all"  ON public.usulan FOR SELECT USING (true);
CREATE POLICY "Allow insert all" ON public.usulan FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update all" ON public.usulan FOR UPDATE USING (true);
CREATE POLICY "Allow delete all" ON public.usulan FOR DELETE USING (true);

-- ============================================================
-- 4. GRANT AKSES (anon / authenticated / service_role)
-- ============================================================
GRANT ALL ON TABLE public.usulan TO anon, authenticated, service_role;
GRANT ALL ON SEQUENCE public.usulan_id_seq TO anon, authenticated, service_role;
