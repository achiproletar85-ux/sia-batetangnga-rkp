const supabase = require('../backend/config/supabase');

async function inspectAllSupabaseTables() {
  console.log('🔍 Memeriksa seluruh tabel di Supabase database...');

  const tableNames = [
    'dokumen_form_data',
    'dokumen_templates',
    'dokumen_fields',
    'dokumen_generations',
    'documents',
    'templates',
    'form_data'
  ];

  for (const name of tableNames) {
    try {
      const { data, error, count } = await supabase
        .from(name)
        .select('*', { count: 'exact', head: false })
        .limit(5);

      if (error) {
        console.log(`ℹ️ Tabel "${name}": Tidak ada / Error (${error.message})`);
      } else {
        console.log(`\n==================================================`);
        console.log(`📋 Tabel "${name}": Total ${count !== null ? count : data.length} Record`);
        console.log(`==================================================`);
        if (data && data.length > 0) {
          console.log(`   Sample Record 1 Keys:`, Object.keys(data[0]));
          console.log(`   Sample Record 1:`, JSON.stringify(data[0]).substring(0, 200) + '...');
        }
      }
    } catch (e) {
      console.log(`ℹ️ Tabel "${name}": Tidak dapat diakses.`);
    }
  }
}

inspectAllSupabaseTables();
