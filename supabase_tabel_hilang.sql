-- ============================================================
-- SQL: LENGKAPI TABEL YANG HILANG DI SUPABASE (proyek kymmbbngwlfglamirdwg)
-- Hasil audit: tabel di bawah ini TIDAK ADA di database, padahal
-- dipakai oleh aplikasi. Jalankan skrip ini di Supabase Dashboard
-- -> SQL Editor -> RUN.
-- ============================================================
-- Yang hilang:
--   1. public.users            -> dipakai /api/login, /api/users
--   2. public.dokumen_templates-> dipakai fitur Dokumen Engine (/api/templates)
-- ============================================================

-- ─── 1. TABEL users ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
    id              bigserial PRIMARY KEY,
    username        text    NOT NULL UNIQUE,
    password        text    NOT NULL,            -- bcrypt hash
    name            text    NOT NULL,
    role            text    NOT NULL DEFAULT 'admin',
    is_active       boolean NOT NULL DEFAULT true,
    login_at        timestamp without time zone,
    last_login_ip   text,
    created_at      timestamp without time zone DEFAULT now(),
    updated_at      timestamp without time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON public.users (username);
CREATE INDEX IF NOT EXISTS idx_users_role     ON public.users (role);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read all"   ON public.users;
DROP POLICY IF EXISTS "Allow insert all" ON public.users;
DROP POLICY IF EXISTS "Allow update all" ON public.users;
DROP POLICY IF EXISTS "Allow delete all" ON public.users;
CREATE POLICY "Allow read all"   ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow insert all" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update all" ON public.users FOR UPDATE USING (true);
CREATE POLICY "Allow delete all" ON public.users FOR DELETE USING (true);
GRANT ALL ON TABLE public.users TO anon, authenticated, service_role;
GRANT ALL ON SEQUENCE public.users_id_seq TO anon, authenticated, service_role;

-- ─── 2. TABEL dokumen_templates ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.dokumen_templates (
    id           bigserial PRIMARY KEY,
    code         text NOT NULL UNIQUE,
    name         text,
    stage        text,
    documentId   text,
    is_real      boolean DEFAULT false,
    created_at   timestamptz DEFAULT now(),
    updated_at   timestamptz DEFAULT now()
);

ALTER TABLE public.dokumen_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dokumen_templates_all" ON public.dokumen_templates;
CREATE POLICY "dokumen_templates_all" ON public.dokumen_templates
    FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.dokumen_templates TO anon, authenticated, service_role;
GRANT ALL ON SEQUENCE public.dokumen_templates_id_seq TO anon, authenticated, service_role;

-- ─── 3. SEED: TEMPLATE DEFAULT (agar halaman Dokumen tidak kosong) ──
-- ⚠️ ID Google Docs hanya diisi untuk yang BENAR-BENAR sudah punya dokumen asli.
--    Sisanya DIKOSONGKAN (''). Bila kolom documentId kosong, template otomatis
--    dianggap BELUM punya ID dan tidak bikin preview/sync palsu.
INSERT INTO public.dokumen_templates (code, stage, name, documentId, is_real) VALUES
    ('DOC-01', 'A', 'Kata Pengantar RKP Desa', '', false),
    ('DOC-02A', 'A', 'BA Pembentukan Tim', '', false),
    ('DOC-02B', 'A', 'SK Tim Penyusun', '1MQJsTZCMPoYNFD8dg6J0g5tY-KEf8Iu0U6uNRZJ-MnY', true),
    ('DOC-03', 'A', 'SK Kades Tim Penyusun', '', false),
    ('DOC-19', 'B', 'SK BPD Panitia Musdes', '', false),
    ('DOC-20', 'B', 'BA Daftar Hadir Musdes', '', false),
    ('DOC-21', 'B', 'Pandangan Resmi BPD', '', false),
    ('DOC-22', 'B', 'BA Musdes Penetapan RKP', '', false),
    ('DOC-24', 'C', 'SK Kades Panitia Musrenbang', '', false),
    ('DOC-25', 'C', 'Tata Tertib Musrenbang', '', false),
    ('DOC-27', 'C', 'BA Musrenbang', '', false),
    ('DOC-28', 'D', 'Rancangan Perdes RKPDesa', '', false),
    ('DOC-29', 'D', 'SK BPD Panitia Perdes', '', false),
    ('DOC-30', 'D', 'Berita Kesepakatan BPD', '', false),
    ('DOC-31', 'D', 'Perdes RKPDesa Final', '', false),
    ('DOC-33', 'E', 'SK Kades Tim Verifikasi', '', false),
    ('DOC-34', 'E', 'BA Pembentukan Tim Verifikasi', '', false),
    ('DOC-39', 'D', 'SK BPD Persetujuan Perdes', '', false)
ON CONFLICT (code) DO NOTHING;

-- ─── 3b. Bersihkan/Dikosongkan sisa documentId palsu yang mungkin sudah terlanjur tersimpan.
--    Hanya DOC-02B (yang ID aslinya benar) yang dipertahankan.
UPDATE public.dokumen_templates
SET documentId = '', is_real = false
WHERE code <> 'DOC-02B'
  AND documentId IS NOT NULL
  AND documentId <> '';

-- ─── 4. VERIFIKASI ──────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema='public'
  AND table_name IN ('users','dokumen_templates')
ORDER BY table_name;
