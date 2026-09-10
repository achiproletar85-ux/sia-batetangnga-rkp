-- ============================================================
-- SQL SCRIPT: BUAT TABEL laporan_manual
-- Komponen manual pada Laporan Perkembangan (Evaluasi Komponen)
-- Frontend: frontend/laporan-perkembangan.js
--   - renderManualTable(tipe)      : PROGRAM_MASUK_DESA | PIHAK_KETIGA | VERIFIKASI_PROPOSAL | KERJASAMA_DESA
--   - loadManualData()   GET  /api/laporan-manual?tahun=
--   - addManualRow()     POST /api/laporan-manual  { tahun, tipe, uraian, keterangan }
--   - saveManualRow()    PUT  /api/laporan-manual  { id, tipe?, uraian?, keterangan? }
--   - deleteManualRow()  DELETE /api/laporan-manual?id=1
--
-- CARA PAKAI:
--   Supabase Dashboard -> SQL Editor -> tempel & RUN.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.laporan_manual (
    id           bigserial PRIMARY KEY,
    tahun        integer NOT NULL DEFAULT 2027,
    tipe         text NOT NULL DEFAULT 'KERJASAMA_DESA',
    uraian       text,
    keterangan   text,
    created_at   timestamp without time zone DEFAULT now(),
    updated_at   timestamp without time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_laporan_manual_tahun ON public.laporan_manual (tahun);
CREATE INDEX IF NOT EXISTS idx_laporan_manual_tipe  ON public.laporan_manual (tipe);

ALTER TABLE public.laporan_manual ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laporan_manual_all" ON public.laporan_manual;
CREATE POLICY "laporan_manual_all" ON public.laporan_manual
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.laporan_manual TO anon, authenticated, service_role;
GRANT ALL ON SEQUENCE public.laporan_manual_id_seq TO anon, authenticated, service_role;