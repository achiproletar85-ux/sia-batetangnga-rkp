-- ============================================================
-- SQL SCRIPT: BUAT TABEL users (Manajemen Pengguna/Sistem)
-- ============================================================
-- Tabel ini menyimpan akun pengguna untuk sistem SIA Desa
-- Batetangnga. Password disimpan sebagai bcrypt hash.
-- ============================================================

-- 1. BUAT TABEL
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

-- 2. INDEKS
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users (username);
CREATE INDEX IF NOT EXISTS idx_users_role     ON public.users (role);

-- 3. ROW LEVEL SECURITY + POLICY
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read all"  ON public.users;
DROP POLICY IF EXISTS "Allow insert all" ON public.users;
DROP POLICY IF EXISTS "Allow update all" ON public.users;
DROP POLICY IF EXISTS "Allow delete all" ON public.users;

CREATE POLICY "Allow read all"  ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow insert all" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update all" ON public.users FOR UPDATE USING (true);
CREATE POLICY "Allow delete all" ON public.users FOR DELETE USING (true);

-- 4. GRANT AKSES
GRANT ALL ON TABLE public.users TO anon, authenticated, service_role;
GRANT ALL ON SEQUENCE public.users_id_seq TO anon, authenticated, service_role;
