-- ============================================================
-- SQL SCRIPT: CREATE TABEL PEMBIAYAAN (Pembiayaan Netto APBDes)
-- Kolom mengikuti payload frontend pembiayaan.js:
--   silpa_tahun_sebelumnya, pencairan_dana_cadangan,
--   hasil_penjualan_kekayaan, pembentukan_dana_cadangan,
--   penyertaan_modal_desa
-- ============================================================
-- Jalankan sekali di Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.pembiayaan (
    id BIGSERIAL PRIMARY KEY,
    tahun INTEGER NOT NULL UNIQUE,
    silpa_tahun_sebelumnya NUMERIC DEFAULT 0,
    pencairan_dana_cadangan NUMERIC DEFAULT 0,
    hasil_penjualan_kekayaan NUMERIC DEFAULT 0,
    pembentukan_dana_cadangan NUMERIC DEFAULT 0,
    penyertaan_modal_desa NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: aktifkan dan izinkan ALL untuk role anon/authenticated
ALTER TABLE public.pembiayaan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pembiayaan_all" ON public.pembiayaan;
CREATE POLICY "pembiayaan_all"
    ON public.pembiayaan
    FOR ALL
    USING (true)
    WITH CHECK (true);

GRANT ALL PRIVILEGES ON TABLE public.pembiayaan TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.pembiayaan_id_seq TO anon, authenticated;