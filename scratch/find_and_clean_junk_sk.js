const supabase = require('../backend/config/supabase');

const TARGET_JUNK_STRING = '188.4/05/SK-DES/X/2024';

async function findAndCleanJunkSk() {
  console.log(`🔍 Memulai pencarian dan pembersihan nilai "${TARGET_JUNK_STRING}" di Supabase...`);

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
      if (v.includes(TARGET_JUNK_STRING) || v.includes('188.4/05/SK-DES') || (v.includes('SK-DES') && v.includes('2024'))) {
        console.log(`🗑️ Menghapus nilai sampah di doc_code: ${row.doc_code} | tahun: ${row.tahun} | key: ${k} | val: "${fields[k]}"`);
        delete fields[k]; // Hapus key sampah tersebut
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
        console.log(`✅ Berhasil membersihkan row id ${row.id} (${row.doc_code} - ${row.tahun})`);
      }
    }
  }

  console.log(`\n🎉 Pembersihan Selesai! Total ${cleanedCount} dokumen dibersihkan dari nilai sampah.`);
}

findAndCleanJunkSk();
