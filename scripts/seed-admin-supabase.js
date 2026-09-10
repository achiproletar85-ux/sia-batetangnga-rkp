const supabase = require('../backend/config/supabase.js');
const bcrypt = require('bcryptjs');

async function seedAdminViaSupabase() {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || process.argv[2] || 'admin123';
    const name = process.env.ADMIN_NAME || 'Administrator Desa Batetangnga';

    const hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
        .from('users')
        .upsert({ username, password: hash, name, role: 'admin', is_active: true }, { onConflict: 'username' })
        .select('id, username, role');

    if (error) {
        console.error('❌ Seed (via Supabase API) error:', error.message);
        process.exit(1);
    }
    console.log('✅ Akun admin disiapkan via Supabase API:', JSON.stringify(data));
    console.log('\n=== KREDENSIAL LOGIN ===');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log('========================\n');
    process.exit(0);
}

seedAdminViaSupabase();