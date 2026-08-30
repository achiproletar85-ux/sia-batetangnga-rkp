const supabase = require('../backend/config/supabase');

const TABLE_DOC_CODES = ['DOC-02B', 'DOC-20', 'DOC-27', 'DOC-34'];

async function audit4TableDocs2027() {
  console.log('🔍 Audit Mendalam 4 Dokumen Bertabel di Supabase (Tahun 2027)...');

  for (const code of TABLE_DOC_CODES) {
    const { data: doc, error } = await supabase
      .from('dokumen_form_data')
      .select('*')
      .eq('doc_code', code)
      .eq('tahun', 2027)
      .maybeSingle();

    console.log(`\n==================================================`);
    console.log(`📄 DOKUMEN: ${code} (Tahun 2027)`);
    console.log(`==================================================`);

    if (error || !doc) {
      console.log(`ℹ️ Record ${code} (2027) belum ada di Supabase.`);
      continue;
    }

    console.log(`   ID Record: ${doc.id}`);
    console.log(`   Google Docs ID: ${doc.google_docs_id}`);
    console.log(`   Total Fields: ${Object.keys(doc.fields || {}).length}`);
    console.log(`   Object Tables:`, JSON.stringify(doc.tables, null, 2));
  }
}

audit4TableDocs2027();
