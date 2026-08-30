require('dotenv').config();
const supabase = require('../backend/config/supabase');

async function auditGlobalFields() {
    console.log('=== AUDIT FIELD SINKRONISASI DI SUPABASE ===\n');
    
    const { data: allDocs, error } = await supabase
        .from('dokumen_form_data')
        .select('doc_code, tahun, fields, updated_at')
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching dokumen_form_data:', error.message);
        return;
    }

    console.log(`Total Dokumen Tersimpan: ${allDocs.length}`);
    const keyFrequency = {};
    const keyValues = {};

    allDocs.forEach(doc => {
        const fields = doc.fields || {};
        Object.keys(fields).forEach(key => {
            keyFrequency[key] = (keyFrequency[key] || 0) + 1;
            if (!keyValues[key]) keyValues[key] = [];
            keyValues[key].push({
                doc_code: doc.doc_code,
                tahun: doc.tahun,
                value: fields[key],
                updated_at: doc.updated_at
            });
        });
    });

    console.log('\n📌 Daftar Key Field yang Digunakan Lebih dari 1 Dokumen (Shared Fields):');
    Object.keys(keyFrequency).forEach(key => {
        if (keyFrequency[key] > 1 || key.includes('kewenangan') || key.includes('apbdes') || key.includes('kades')) {
            console.log(`\n🔹 Key: {{${key}}} (Muncul di ${keyFrequency[key]} dokumen)`);
            keyValues[key].slice(0, 5).forEach(item => {
                console.log(`   - [${item.doc_code} | ${item.tahun} | ${item.updated_at}]: "${item.value}"`);
            });
        }
    });
}

auditGlobalFields();
