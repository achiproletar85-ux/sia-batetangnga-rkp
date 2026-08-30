require('dotenv').config();
const supabase = require('../backend/config/supabase');

async function verifyAllRowsUnified() {
  const { data: rows } = await supabase
    .from('dokumen_form_data')
    .select('doc_code, tahun, fields')
    .in('doc_code', ['DOC-19', 'DOC-03', 'DOC-02B', 'DOC-25']);

  console.log('⚡ === VERIFIKASI HASIL UPDATE SUPABASE === ⚡');
  rows.forEach(r => {
    console.log(`📌 ${r.doc_code} (${r.tahun}):`);
    console.log(`   tahun0: ${r.fields?.tahun0}`);
    console.log(`   tahun : ${r.fields?.tahun}`);
    console.log(`   tahun1: ${r.fields?.tahun1}`);
    console.log(`   tahun2: ${r.fields?.tahun2}`);
    console.log(`   rpjmdes1: ${r.fields?.rpjmdes1?.substring(0, 30)}...`);
  });
}

verifyAllRowsUnified();
