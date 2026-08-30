const supabase = require('../backend/config/supabase');

async function purgeDoc19Table() {
  console.log('🧹 Mengosongkan total kolom `tables` pada DOC-19 di Supabase...');

  const { data: rows, error } = await supabase
    .from('dokumen_form_data')
    .select('*')
    .eq('doc_code', 'DOC-19');

  if (error) {
    console.error('❌ Error fetching DOC-19:', error.message);
    return;
  }

  let count = 0;
  for (const row of rows) {
    const { error: updateErr } = await supabase
      .from('dokumen_form_data')
      .update({
        tables: {},
        updated_at: new Date().toISOString()
      })
      .eq('id', row.id);

    if (updateErr) {
      console.error(`❌ Gagal update row id ${row.id}:`, updateErr.message);
    } else {
      console.log(`✅ [DOC-19 - ${row.tahun}] Kolom tables BERHASIL DIKOSONGKAN TOTAL (tables = {}).`);
      count++;
    }
  }

  console.log(`\n🎉 Pembersihan DOC-19 Selesai Total: ${count} record DOC-19 telah dikosongkan dari tabel.`);
}

purgeDoc19Table();
