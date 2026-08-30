const supabase = require('../backend/config/supabase');

async function align2027YearFields() {
  console.log('🧹 Menyelaraskan seluruh field tahun pada record 2027 di Supabase...');

  const { data: rows, error } = await supabase
    .from('dokumen_form_data')
    .select('*')
    .eq('tahun', 2027);

  if (error) {
    console.error('❌ Error fetching 2027 rows:', error.message);
    return;
  }

  let count = 0;

  for (const row of rows) {
    const fields = row.fields || {};
    let modified = false;

    // Pastikan key tahun utama bernilai '2027'
    ['tahun', 'tahun_anggaran', 'tahun_rkp'].forEach(k => {
      if (fields[k] && fields[k] !== '2027') {
        console.log(`🔧 [${row.doc_code}] Mengubah {{${k}}}: "${fields[k]}" -> "2027"`);
        fields[k] = '2027';
        modified = true;
      }
    });

    if (modified) {
      await supabase
        .from('dokumen_form_data')
        .update({ fields, updated_at: new Date().toISOString() })
        .eq('id', row.id);
      count++;
    }
  }

  console.log(`\n🎉 Berhasil menyelaraskan field tahun pada ${count} dokumen 2027.`);
}

align2027YearFields();
