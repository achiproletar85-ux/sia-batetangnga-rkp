require('dotenv').config();
const path = require('path');
const supabase = require('../backend/config/supabase');

async function testAllTables() {
    console.log('=== MEMERIKSA SEMUA TABEL SUPABASE DATABASE ===\n');
    const tables = [
        'dokumen_form_data',
        'dokumen_templates',
        'rkpdes',
        'rab',
        'du_rkpdes',
        'usulan',
        'prioritas_usulan',
        'stunting',
        'evaluasi',
        'kerjasama_pihak_ketiga',
        'pembiayaan',
        'laporan_perkembangan',
        'pagu_indikatif',
        'rktl',
        'users'
    ];

    for (const t of tables) {
        try {
            const { data, error, count } = await supabase
                .from(t)
                .select('*', { count: 'exact' });
            if (error) {
                console.error(`❌ Table '${t}': ERROR ->`, error.message);
            } else {
                console.log(`✅ Table '${t}': Total Records = ${count !== null ? count : data ? data.length : 0}`);
                if (data && data.length > 0) {
                    console.log(`   Sample Data:`, JSON.stringify(data[0]).substring(0, 120) + '...');
                }
            }
        } catch (err) {
            console.error(`❌ Table '${t}': EXCEPTION ->`, err.message);
        }
    }
}

testAllTables();
