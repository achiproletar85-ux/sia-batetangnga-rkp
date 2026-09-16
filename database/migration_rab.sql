-- =============================================================================
-- MIGRATION: PEROMBAKAN TOTAL ARSITEKTUR TABEL `rab` (SIA BATETANGNGA)
-- =============================================================================
-- Skrip migrasi ini mengunci integritas tabel `rab` di Supabase PostgreSQL:
-- 1. Pembersihan data duplikat jika ada (menyisakan baris terbaru dengan rincian items terbanyak).
-- 2. Sinkronisasi sequence primary key `rab_id_seq` dengan MAX(id).
-- 3. Penerapan Composite Unique Constraint pada (kode_unik_full, tahun, tipe_anggaran).
-- 4. Penerapan Foreign Key Constraint pada id_referensi_murni -> rab(id) ON DELETE SET NULL.
-- 5. Normalisasi nilai kolom inti, default JSON, dan tipe anggaran.
-- =============================================================================

BEGIN;

-- 1. PEMBERSIHAN DATA DUPLIKAT / ANOMALI (DEDUPLIKASI CERDAS)
-- Menghapus rekaman duplikat berdasarkan (kode_unik_full, tahun, tipe_anggaran),
-- dengan memprioritaskan baris yang memiliki item belanja paling lengkap dan id terbaru.
WITH ranked_duplicates AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY kode_unik_full, tahun, COALESCE(tipe_anggaran, 'MURNI')
            ORDER BY 
                CASE 
                    WHEN items IS NOT NULL AND jsonb_typeof(items) = 'array' THEN jsonb_array_length(items)
                    ELSE 0 
                END DESC,
                COALESCE(jumlah_anggaran, 0) DESC,
                id DESC
        ) AS rn
    FROM public.rab
    WHERE kode_unik_full IS NOT NULL AND tahun IS NOT NULL
)
DELETE FROM public.rab
WHERE id IN (
    SELECT id FROM ranked_duplicates WHERE rn > 1
);

-- 2. NORMALISASI NILAI NULL PADA KOLOM-KOLOM INTI
UPDATE public.rab
SET 
    tipe_anggaran = 'MURNI'
WHERE tipe_anggaran IS NULL OR tipe_anggaran = '';

UPDATE public.rab
SET 
    items = '[]'::jsonb
WHERE items IS NULL;

UPDATE public.rab
SET 
    rpjm_data = '{}'::jsonb
WHERE rpjm_data IS NULL;

UPDATE public.rab
SET 
    jumlah_anggaran = 0
WHERE jumlah_anggaran IS NULL;

UPDATE public.rab
SET 
    status = 'Terencana'
WHERE status IS NULL OR status = '';

-- 3. SINKRONISASI SEQUENCE PRIMARY KEY (rab_id_seq)
-- Memastikan auto-increment sequence selaras dengan ID tertinggi di tabel rab
SELECT setval(
    pg_get_serial_sequence('public.rab', 'id'),
    COALESCE((SELECT MAX(id) FROM public.rab), 1),
    true
);

-- 4. PENGUNCIAN COMPOSITE UNIQUE CONSTRAINT
-- Menjamin tidak ada duplikasi kegiatan pada tahun dan tipe anggaran yang sama
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conrelid = 'public.rab'::regclass 
          AND conname = 'rab_kode_unik_full_tahun_tipe_key'
    ) THEN
        ALTER TABLE public.rab 
        ADD CONSTRAINT rab_kode_unik_full_tahun_tipe_key 
        UNIQUE (kode_unik_full, tahun, tipe_anggaran);
    END IF;
END $$;

-- 5. PENGUNCIAN FOREIGN KEY INTEGRITY (id_referensi_murni -> rab.id)
-- Membersihkan id_referensi_murni yang menunjuk ke id murni yang sudah tidak ada
UPDATE public.rab p
SET id_referensi_murni = NULL
WHERE p.tipe_anggaran = 'PERUBAHAN'
  AND p.id_referensi_murni IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.rab m WHERE m.id = p.id_referensi_murni
  );

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conrelid = 'public.rab'::regclass 
          AND conname = 'fk_rab_id_referensi_murni'
    ) THEN
        ALTER TABLE public.rab 
        ADD CONSTRAINT fk_rab_id_referensi_murni 
        FOREIGN KEY (id_referensi_murni) 
        REFERENCES public.rab(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- 6. NORMALISASI DEFAULTS & NOT NULL PADA KOLOM UTAMA
ALTER TABLE public.rab 
    ALTER COLUMN tipe_anggaran SET DEFAULT 'MURNI',
    ALTER COLUMN tipe_anggaran SET NOT NULL,
    ALTER COLUMN items SET DEFAULT '[]'::jsonb,
    ALTER COLUMN rpjm_data SET DEFAULT '{}'::jsonb,
    ALTER COLUMN status SET DEFAULT 'Terencana';

-- 7. PENGOPTIMALAN INDEKS PENCARIAN (COMPOSITE & FILTERED INDEXES)
CREATE INDEX IF NOT EXISTS idx_rab_tahun_tipe ON public.rab (tahun, tipe_anggaran);
CREATE INDEX IF NOT EXISTS idx_rab_kode_unik_full ON public.rab (kode_unik_full);
CREATE INDEX IF NOT EXISTS idx_rab_ref_murni ON public.rab (id_referensi_murni) WHERE id_referensi_murni IS NOT NULL;

COMMIT;
