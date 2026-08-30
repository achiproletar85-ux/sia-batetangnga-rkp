require('dotenv').config();
const supabase = require('../backend/config/supabase');

const NON_TABLE_DOC_CODES = [
  'DOC-01', 'DOC-02A', 'DOC-03',
  'DOC-19', 'DOC-21', 'DOC-22',
  'DOC-24', 'DOC-25', 'DOC-28',
  'DOC-29', 'DOC-30', 'DOC-31', 'DOC-39',
  'DOC-33'
];

async function clearNonTableDocsInSupabase() {
  console.log('⚡ === MEMBERSIHKAN TABEL KOSONG PADA DOKUMEN NON-TABEL IN SUPABASE === ⚡\n');

  let clearedCount = 0;
  for (const code of NON_TABLE_DOC_CODES) {
    const { error } = await supabase
      .from('dokumen_form_data')
      .update({
        tables: {},
        updated_at: new Date().toISOString()
      })
      .eq('doc_code', code);

    if (error) {
      console.error(`❌ Gagal bersihkan tabel ${code}:`, error.message);
    } else {
      clearedCount++;
      console.log(`✅ [SUCCESS] Bersihkan tabel untuk dokumen non-tabel ${code}`);
    }
  }

  console.log(`\n🎉 SELESAI TOTAL! Tabel untuk ${clearedCount} dokumen non-tabel (seperti DOC-19) berhasil dikosongkan di Supabase Cloud!`);
}

clearNonTableDocsInSupabase();
