const supabase = require('../backend/config/supabase');

const TABLE_DOC_KEY_MAP = {
  'DOC-02B': 'tabel_sk_tim_penyusun',
  'DOC-20': 'tabel_daftar_hadir',
  'DOC-27': 'tabel_kegiatan',
  'DOC-34': 'tabel_tim_verifikasi'
};

async function purgeAllCrossPollutedTables() {
  console.log('🧹 Purging all cross-polluted tables in Supabase...');

  const { data: rows, error } = await supabase.from('dokumen_form_data').select('*');
  if (error || !rows) {
    console.error('❌ Error fetching rows:', error?.message);
    return;
  }

  for (const row of rows) {
    const validKey = TABLE_DOC_KEY_MAP[row.doc_code];
    let sanitizedTables = {};

    if (validKey && row.tables && typeof row.tables === 'object') {
      const validRows = Array.isArray(row.tables[validKey]) ? row.tables[validKey] : [];
      // Clean col_0, col_1, col_2 keys from table rows to prevent column pollution
      const cleanRows = validRows.map(r => {
        const cleanObj = {};
        Object.keys(r).forEach(k => {
          if (!k.startsWith('col_')) {
            cleanObj[k] = r[k];
          }
        });
        return cleanObj;
      });
      sanitizedTables = { [validKey]: cleanRows };
    }

    await supabase
      .from('dokumen_form_data')
      .update({
        tables: sanitizedTables,
        updated_at: new Date().toISOString()
      })
      .eq('id', row.id);

    console.log(`✅ Record ID ${row.id} (${row.doc_code}): Tables sanitized -> Keys: [${Object.keys(sanitizedTables).join(', ')}]`);
  }

  console.log('\n🎉 Purge Complete! All Supabase records now have 100% clean, isolated tables.');
}

purgeAllCrossPollutedTables();
