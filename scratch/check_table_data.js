require('dotenv').config();
const supabase = require('../backend/config/supabase');

async function checkTableData() {
    console.log('=== AUDIT DATA TABEL DI SUPABASE ===\n');
    
    const { data: allDocs, error } = await supabase
        .from('dokumen_form_data')
        .select('doc_code, tahun, tables, updated_at')
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching tables:', error.message);
        return;
    }

    console.log(`Total Dokumen Tersimpan: ${allDocs.length}`);
    allDocs.forEach(doc => {
        const tables = doc.tables || {};
        const keys = Object.keys(tables);
        if (keys.length > 0) {
            console.log(`\n📄 [${doc.doc_code} | Tahun: ${doc.tahun} | Updated: ${doc.updated_at}]`);
            keys.forEach(k => {
                const arr = tables[k];
                if (Array.isArray(arr)) {
                    console.log(`   - Table Key "${k}": ${arr.length} baris`);
                    arr.slice(0, 3).forEach((r, idx) => {
                        console.log(`     Row ${idx + 1}:`, JSON.stringify(r));
                    });
                }
            });
        }
    });
}

checkTableData();
