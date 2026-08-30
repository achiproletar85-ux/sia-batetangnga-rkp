-- Menambahkan Unique Constraint gabungan pada kolom (doc_code, tahun)
-- Hal ini mengatasi error 400 Bad Request saat melakukan upsert dengan on_conflict="doc_code,tahun"

ALTER TABLE dokumen_form_data
ADD CONSTRAINT unique_doc_code_tahun UNIQUE (doc_code, tahun);
