const supabase = require('../backend/config/supabase');

const NON_TABLE_DOCS = [
  'DOC-01', 'DOC-02A', 'DOC-03', 'DOC-19', 'DOC-21', 'DOC-22',
  'DOC-24', 'DOC-25', 'DOC-28', 'DOC-29', 'DOC-30', 'DOC-31',
  'DOC-33', 'DOC-39'
];

async function cleanTableData() {
  console.log('🧹 Memulai pembersihan header tabel & data tabel untuk dokumen non-tabel...');

  // 1. Bersihkan table_headers di dokumen_templates untuk dokumen non-tabel
  for (const docCode of NON_TABLE_DOCS) {
    const { error: err1 } = await supabase
      .from('dokumen_templates')
      .update({ table_headers: [] })
      .eq('code', docCode);

    if (err1) {
      console.warn(`⚠️ Gagal membersihkan dokumen_templates (${docCode}):`, err1.message);
    } else {
      console.log(`✅ dokumen_templates (${docCode}) table_headers dikosongkan.`);
    }

    // 2. Kosongkan kolom tables di dokumen_form_data untuk dokumen non-tabel
    const { error: err2 } = await supabase
      .from('dokumen_form_data')
      .update({ tables: {} })
      .eq('doc_code', docCode);

    if (err2) {
      console.warn(`⚠️ Gagal membersihkan dokumen_form_data (${docCode}):`, err2.message);
    } else {
      console.log(`✅ dokumen_form_data (${docCode}) tables dikosongkan.`);
    }
  }

  console.log('\n🎉 Pembersihan Selesai: Seluruh dokumen non-tabel kini 100% bersih dari data tabel!');
}

cleanTableData();
