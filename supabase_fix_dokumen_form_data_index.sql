-- Hapus index lama yang hanya di 'doc_code'
DROP INDEX IF EXISTS public.idx_dokumen_form_data_code;

-- Buat index composite baru di ('doc_code', 'tahun')
-- Ini akan memastikan setiap dokumen untuk setiap tahun adalah unik.
CREATE UNIQUE INDEX IF NOT EXISTS idx_dokumen_form_data_code_tahun_unique
    ON public.dokumen_form_data (doc_code, tahun);

-- Set RLS (Row Level Security) lagi untuk keamanan
ALTER TABLE public.dokumen_form_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dokumen_form_data_all" ON public.dokumen_form_data;
CREATE POLICY "dokumen_form_data_all" ON public.dokumen_form_data
    FOR ALL USING (true) WITH CHECK (true);

-- Berikan izin lagi (best practice)
GRANT ALL ON TABLE public.dokumen_form_data TO anon, authenticated, service_role;
