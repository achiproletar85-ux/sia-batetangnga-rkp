require('dotenv').config();
const supabase = require('../backend/config/supabase');

async function syncTahunGloballySupabase() {
    console.log('=== SINKRONISASI TAHUN GLOBALLY DI SUPABASE CLOUD ===\n');

    const { data: allDocs, error } = await supabase
        .from('dokumen_form_data')
        .select('*');

    if (error) {
        console.error('Error fetching docs:', error.message);
        return;
    }

    console.log(`Total Records to Audit: ${allDocs.length}`);
    let updatedCount = 0;

    for (const doc of allDocs) {
        const fields = doc.fields || {};
        const yearVal = doc.tahun || '2027';

        let changed = false;
        ['tahun', 'tahun1', 'tahun2', 'tahun_anggaran', 'tahun_rkp'].forEach(tk => {
            if (fields[tk] !== yearVal) {
                fields[tk] = yearVal;
                changed = true;
            }
        });

        if (changed) {
            updatedCount++;
            await supabase
                .from('dokumen_form_data')
                .update({ fields: fields, updated_at: new Date().toISOString() })
                .eq('id', doc.id);
            console.log(`✅ Updated doc ${doc.doc_code} (Year: ${doc.tahun}) fields to yearVal ${yearVal}`);
        }
    }

    console.log(`\n🎉 SINKRONISASI TAHUN SELESAI! Total ${updatedCount} records di-update!`);
}

syncTahunGloballySupabase();
