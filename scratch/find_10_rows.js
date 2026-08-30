require('dotenv').config();
const supabase = require('../backend/config/supabase');

async function find10Rows() {
    console.log('=== SEARCHING FOR 10 ROWS IN SUPABASE DOKUMEN_FORM_DATA ===\n');
    const { data, error } = await supabase
        .from('dokumen_form_data')
        .select('*');

    if (error) {
        console.error('Error fetching data:', error.message);
        return;
    }

    let foundCount = 0;
    data.forEach(r => {
        const tables = r.tables || {};
        Object.keys(tables).forEach(tk => {
            const arr = tables[tk];
            if (Array.isArray(arr) && arr.length >= 5) {
                foundCount++;
                console.log(`FOUND IN DOC: ${r.doc_code} | Year: ${r.tahun} | Table Key: "${tk}" | Row Count: ${arr.length}`);
            }
        });
    });

    if (foundCount === 0) {
        console.log('❌ NO DOCUMENT RECORD HAS 5+ ROWS IN SUPABASE TABLES!');
    }
}

find10Rows();
