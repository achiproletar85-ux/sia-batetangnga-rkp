require('dotenv').config();
const { Client } = require('pg');

async function createUsersTable() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        console.log('✅ Connected to PostgreSQL');

        await client.query(`
            CREATE TABLE IF NOT EXISTS public.users (
                id bigserial PRIMARY KEY,
                username text UNIQUE NOT NULL,
                password text NOT NULL,
                name text NOT NULL,
                role text NOT NULL DEFAULT 'admin',
                is_active boolean NOT NULL DEFAULT true,
                login_at timestamp without time zone,
                last_login_ip text,
                created_at timestamp without time zone DEFAULT now(),
                updated_at timestamp without time zone DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS idx_users_username ON public.users (username);
            CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);
            ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Allow read all" ON public.users;
            DROP POLICY IF EXISTS "Allow insert all" ON public.users;
            DROP POLICY IF EXISTS "Allow update all" ON public.users;
            DROP POLICY IF EXISTS "Allow delete all" ON public.users;
            CREATE POLICY "Allow read all" ON public.users FOR SELECT USING (true);
            CREATE POLICY "Allow insert all" ON public.users FOR INSERT WITH CHECK (true);
            CREATE POLICY "Allow update all" ON public.users FOR UPDATE USING (true);
            CREATE POLICY "Allow delete all" ON public.users FOR DELETE USING (true);
            GRANT ALL ON TABLE public.users TO anon, authenticated, service_role;
            GRANT ALL ON SEQUENCE public.users_id_seq TO anon, authenticated, service_role;
        `);
        console.log('✅ Table users created successfully');

        const res = await client.query('SELECT COUNT(*) FROM public.users');
        console.log('Existing users:', res.rows[0].count);
    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await client.end();
    }
}

createUsersTable();
