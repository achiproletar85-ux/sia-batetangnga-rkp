const supabase = require('../backend/config/supabase');

async function auditTableMultiplication() {
  console.log('🔍 Memeriksa Seluruh Tabel & Data di Supabase (dokumen_form_data)...');

  const { data: rows, error } = await supabase
    .from('dokumen_form_data')
    .select('id, doc_code, tahun, fields, tables, updated_at')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`\n📊 Total Record di dokumen_form_data: ${rows.length}`);

  // 1. Cek Duplikasi Composite (doc_code, tahun)
  const codeYearMap = {};
  const duplicates = [];
  rows.forEach(r => {
    const key = `${r.doc_code}_${r.tahun}`;
    if (!codeYearMap[key]) {
      codeYearMap[key] = [];
    }
    codeYearMap[key].push(r);
    if (codeYearMap[key].length > 1) {
      duplicates.push(key);
    }
  });

  if (duplicates.length > 0) {
    console.log(`⚠️ MENEMUKAN DUPLIKASI RECORD (doc_code, tahun):`, [...new Set(duplicates)]);
  } else {
    console.log(`✅ Tidak ada duplikasi record (doc_code, tahun). Total unique keys: ${Object.keys(codeYearMap).length}`);
  }

  // 2. Cek Isi Kolom `tables` di Setiap Record
  console.log('\n==================================================');
  console.log('📋 AUDIT KOLOM `tables` PER DOKUMEN & TAHUN:');
  console.log('==================================================');

  let totalRowsInTables = 0;
  rows.forEach(r => {
    const tablesObj = r.tables || {};
    const keys = Object.keys(tablesObj);

    if (keys.length > 0) {
      console.log(`\n📄 [ID: ${r.id}] ${r.doc_code} (${r.tahun}) - updated_at: ${r.updated_at}`);
      keys.forEach(k => {
        const arr = tablesObj[k];
        const len = Array.isArray(arr) ? arr.length : 0;
        totalRowsInTables += len;
        console.log(`   └─ Key: "${k}" -> ${len} baris`);
        if (len > 0 && Array.isArray(arr)) {
          console.log(`      Contoh Baris #1:`, JSON.stringify(arr[0]));
        }
      });
    }
  });

  console.log(`\n📊 Total Baris Tabel di Seluruh Supabase: ${totalRowsInTables}`);
}

auditTableMultiplication();
