require('dotenv').config();
const supabase = require('../backend/config/supabase');

async function inspectGlobalMaster() {
    console.log('=== INSPECT GLOBAL_MASTER IN SUPABASE ===');
    const { data, error } = await supabase
        .from('dokumen_form_data')
        .select('*')
        .eq('doc_code', 'GLOBAL_MASTER');

    if (error) {
        console.error('Error fetching GLOBAL_MASTER:', error.message);
        return;
    }

    console.log(`Found ${data.length} records for GLOBAL_MASTER:`);
    data.forEach(r => {
        console.log(`\nYear: ${r.tahun} | Updated: ${r.updated_at}`);
        console.log('Fields count:', Object.keys(r.fields || {}).length);
        console.log('Tables:', JSON.stringify(r.tables, null, 2));
    });
}

inspectGlobalMaster();
