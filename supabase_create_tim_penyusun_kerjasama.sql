-- ============================================================
-- SQL SCRIPT: BUAT TABEL tim_penyusun
-- Route server.js: /api/tim-penyusun (GET + POST/sync)
--   - GET  /api/tim-penyusun?tahun=XXXX
--   - POST /api/tim-penyusun/sync  body: { tahun, data: [{nama, jabatan_tim}] }
--
-- CARA PAKAI: Supabase Dashboard -> SQL Editor -> tempel & RUN.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tim_penyusun (
    id           bigserial PRIMARY KEY,
    tahun        integer NOT NULL DEFAULT 2027,
    nama         text,
    jabatan_tim  text DEFAULT 'Anggota',
    created_at   timestamp without time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tim_penyusun_tahun ON public.tim_penyusun (tahun);

ALTER TABLE public.tim_penyusun ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tim_penyusun_all" ON public.tim_penyusun;
CREATE POLICY "tim_penyusun_all" ON public.tim_penyusun
    FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.tim_penyusun TO anon, authenticated, service_role;
GRANT ALL ON SEQUENCE public.tim_penyusun_id_seq TO anon, authenticated, service_role;