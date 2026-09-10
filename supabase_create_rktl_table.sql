-- ============================================================
-- SQL SCRIPT: PASTIKAN TABEL rktl (Rencana Kerja & Tindak Lanjut)
-- Route server.js: /api/rktl (GET + POST/sync)
--   - GET  /api/rktl?tahun=XXXX
--   - POST /api/rktl/sync  body: { tahun, data: [{ no_urut, uraian,
--        tanggal_tempat, keterangan, tanggal_ttd, ketua_tim,
--        kepala_desa, fasilitator_nama, fasilitator_jabatan,
--        fasilitator, tim_penyusun }] }
--
-- STRUKTUR: SATU BARIS PER TAHUN. Semua agenda disimpan di kolom
-- jsonb `rktl_items` dan tim penyusun di kolom jsonb `tim_penyusun`.
--
-- CARA PAKAI: Supabase Dashboard -> SQL Editor -> tempel & RUN.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rktl (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tahun         integer NOT NULL UNIQUE,
    rktl_items    jsonb NOT NULL DEFAULT '[]'::jsonb,
    tanggal_ttd   date,
    ketua_tim     text,
    tim_penyusun  jsonb NOT NULL DEFAULT '[]'::jsonb,
    fasilitator   text,
    created_at    timestamp with time zone DEFAULT now(),
    updated_at    timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rktl_tahun ON public.rktl (tahun);

ALTER TABLE public.rktl ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rktl_all" ON public.rktl;
DROP POLICY IF EXISTS "Allow read all" ON public.rktl;
DROP POLICY IF EXISTS "Allow insert all" ON public.rktl;
DROP POLICY IF EXISTS "Allow update all" ON public.rktl;
DROP POLICY IF EXISTS "Allow delete all" ON public.rktl;
CREATE POLICY "Allow read all"   ON public.rktl FOR SELECT USING (true);
CREATE POLICY "Allow insert all" ON public.rktl FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update all" ON public.rktl FOR UPDATE USING (true);
CREATE POLICY "Allow delete all" ON public.rktl FOR DELETE USING (true);
GRANT ALL ON TABLE public.rktl TO anon, authenticated, service_role;

-- Pastikan tabel tim_penyusun juga ada
CREATE TABLE IF NOT EXISTS public.tim_penyusun (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tahun        integer NOT NULL DEFAULT 2027,
    nama         text,
    jabatan_tim  text DEFAULT 'Anggota',
    created_at   timestamp with time zone DEFAULT now(),
    updated_at   timestamp with time zone DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tim_penyusun_tahun ON public.tim_penyusun (tahun);
ALTER TABLE public.tim_penyusun ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tim_penyusun_all" ON public.tim_penyusun;
CREATE POLICY "tim_penyusun_all" ON public.tim_penyusun
    FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.tim_penyusun TO anon, authenticated, service_role;
