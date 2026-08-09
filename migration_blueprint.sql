-- Tambah kolom flags di rkpdes
ALTER TABLE public.rkpdes 
ADD COLUMN IF NOT EXISTS sdgs text,
ADD COLUMN IF NOT EXISTS verifikasi_proposal text,
ADD COLUMN IF NOT EXISTS stunting text;

-- Tabel untuk form manual Laporan Perkembangan & Evaluasi APBDes
CREATE TABLE IF NOT EXISTS public.laporan_komponen_manual (
  id bigserial PRIMARY KEY,
  tahun integer NOT NULL,
  tipe text NOT NULL, 
  uraian text,
  keterangan text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
