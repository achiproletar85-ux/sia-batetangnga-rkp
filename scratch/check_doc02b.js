const supabase = require('../backend/config/supabase');

async function checkDoc02b() {
  console.log('🔍 Memeriksa data tabel DOC-02B di Supabase...');

  const { data: rows, error } = await supabase
    .from('dokumen_form_data')
    .select('*')
    .eq('doc_code', 'DOC-02B');

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  rows.forEach(r => {
    console.log(`\n📄 DOC-02B (Tahun ${r.tahun}) - ID: ${r.id}`);
    console.log(`   Tables Keys:`, Object.keys(r.tables || {}));
    if (r.tables && r.tables.tabel_sk_tim_penyusun) {
      console.log(`   Total Baris di tabel_sk_tim_penyusun: ${r.tables.tabel_sk_tim_penyusun.length}`);
    }
  });
}

checkDoc02b();
