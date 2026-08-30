const supabase = require('../backend/config/supabase');

async function auditSupabaseTables() {
  console.log('🔍 Memeriksa Seluruh Tabel & Data di Supabase...');

  // 1. Audit dokumen_form_data
  const { data: formRows, error: err1 } = await supabase.from('dokumen_form_data').select('*');
  if (err1) {
    console.error('❌ Error reading dokumen_form_data:', err1.message);
  } else {
    console.log(`\n📋 [Tabel 1: dokumen_form_data] Total Record: ${formRows.length}`);
    const years = {};
    formRows.forEach(r => {
      years[r.tahun] = (years[r.tahun] || 0) + 1;
    });
    console.log('   Distribusi Tahun:', years);
  }

  // 2. Audit dokumen_templates
  const { data: tplRows, error: err2 } = await supabase.from('dokumen_templates').select('*');
  if (err2) {
    console.log('ℹ️ Tabel dokumen_templates error/tidak diakses:', err2.message);
  } else {
    console.log(`\n📋 [Tabel 2: dokumen_templates] Total Record: ${tplRows.length}`);
  }

  // 3. Cek tabel-tabel lainnya jika ada
  console.log('\n🗑️ Melakukan Pembersihan Record Tahun (Hapus SEMUA yang BUKAN 2027)...');
  const { data: deleted, error: deleteErr } = await supabase
    .from('dokumen_form_data')
    .delete()
    .neq('tahun', 2027);

  if (deleteErr) {
    console.error('❌ Error menghapus record tahun non-2027:', deleteErr.message);
  } else {
    console.log('✅ Berhasil menghapus seluruh record tahun selain 2027!');
  }

  // 4. Verifikasi sisa data di dokumen_form_data
  const { data: remainingRows } = await supabase.from('dokumen_form_data').select('*');
  console.log(`\n📊 Record Tersisa di dokumen_form_data (Hanya Tahun 2027): ${remainingRows ? remainingRows.length : 0}`);

  if (remainingRows) {
    console.log('\n📄 Daftar Dokumen Tahun 2027 yang Tersimpan di Supabase:');
    remainingRows.forEach(r => {
      const tableKeys = Object.keys(r.tables || {});
      const fieldCount = Object.keys(r.fields || {}).length;
      console.log(`   - ID ${r.id} | ${r.doc_code} (${r.tahun}) | ${fieldCount} fields | Tables: [${tableKeys.join(', ')}]`);
    });
  }
}

auditSupabaseTables();
