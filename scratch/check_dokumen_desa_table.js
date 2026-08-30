const supabase = require('../backend/config/supabase');

async function checkDokumenDesaTable() {
  console.log('🔍 Memeriksa apakah tabel `dokumen_desa` ada di Supabase...');

  try {
    const { data, error, count } = await supabase
      .from('dokumen_desa')
      .select('*', { count: 'exact' });

    if (error) {
      console.log('ℹ️ Tabel `dokumen_desa` di Supabase:', error.message);
    } else {
      console.log(`📋 Tabel \`dokumen_desa\` DI SUPABASE: Ada total ${count} record.`);
      if (data && data.length > 0) {
        console.log('   Sample row 1:', JSON.stringify(data[0]).substring(0, 150));
      }
    }
  } catch (e) {
    console.log('ℹ️ Error:', e.message);
  }
}

checkDokumenDesaTable();
