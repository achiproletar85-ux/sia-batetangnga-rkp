-- ============================================================
-- SQL: TAMBAH KOLOM KONFIGURASI TEMPLATE (fields & table_headers)
-- Agar "Tambah Field", "Edit Field", "Simpan Konfigurasi Field",
-- dan header tabel repeatable tersimpan PERMANEN di database
-- (bukan hanya di memori server yang hilang saat restart).
--
-- CARA PAKAI: Supabase Dashboard -> SQL Editor -> tempel & RUN (sekali saja).
-- ============================================================

ALTER TABLE public.dokumen_templates
    ADD COLUMN IF NOT EXISTS fields       jsonb DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS table_headers jsonb DEFAULT '[]'::jsonb;