const supabase = require('../backend/config/supabase');

async function cleanAllSkDummies() {
  console.log('🧹 Memulai Pembersihan Total seluruh dummy Nomor SK (188.4/...) dari Supabase...');

  const { data: rows, error } = await supabase.from('dokumen_form_data').select('*');
  if (error) {
    console.error('❌ Error fetching dokumen_form_data:', error.message);
    return;
  }

  let cleanedCount = 0;

  for (const row of rows) {
    let modified = false;
    const fields = row.fields || {};

    Object.keys(fields).forEach(k => {
      const v = String(fields[k] || '');
      // Deteksi segala bentuk dummy/sampah nomor SK (mengandung 188.4 atau SK-DES atau SK/2024 dll)
      if (v.includes('188.4') || v.includes('SK-DES') || (k.includes('sk') && (v.includes('2024') || v.includes('2027')))) {
        console.log(`🗑️ Membersihkan key "${k}" di ${row.doc_code} (${row.tahun}): "${fields[k]}" -> ""` );
        fields[k] = ''; // Kosongkan nilai agar bersih 100%
        modified = true;
      }
    });

    if (modified) {
      const { error: updateErr } = await supabase
        .from('dokumen_form_data')
        .update({ fields, updated_at: new Date().toISOString() })
        .eq('id', row.id);

      if (updateErr) {
        console.error(`❌ Gagal update row id ${row.id}:`, updateErr.message);
      } else {
        cleanedCount++;
      }
    }
  }

  console.log(`\n🎉 Pembersihan Total Selesai: ${cleanedCount} dokumen telah dikosongkan dari nomor SK dummy/sampah.`);
}

cleanAllSkDummies();
