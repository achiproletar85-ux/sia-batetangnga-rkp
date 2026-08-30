const supabase = require('../backend/config/supabase');

const CANONICAL_TABLE_DOCS = {
  'DOC-02B': ['No', 'Nama', 'Tempat, Tanggal Lahir', 'Jabatan', 'Unsur'],
  'DOC-20': ['No', 'Nama Peserta', 'Alamat / Dusun', 'Jabatan / Unsur', 'Tanda Tangan'],
  'DOC-27': ['No', 'Jenis Kegiatan', 'Lokasi Kegiatan', 'Volume / Satuan', 'Pagu Indikatif (Rp)', 'Sumber Dana'],
  'DOC-34': ['No', 'Nama Tim Verifikasi', 'Jabatan / Instansi', 'Keterangan']
};

async function fixDokumenTemplatesHeadersInSupabase() {
  console.log('🧹 Sterilisasi Tabel `dokumen_templates` di Supabase Cloud...');

  const { data: templates, error } = await supabase.from('dokumen_templates').select('*');
  if (error || !templates) {
    console.error('❌ Error fetching dokumen_templates:', error?.message);
    return;
  }

  for (const tpl of templates) {
    const isTableDoc = CANONICAL_TABLE_DOCS.hasOwnProperty(tpl.code);
    const correctHeaders = isTableDoc ? CANONICAL_TABLE_DOCS[tpl.code] : [];

    const { error: updateErr } = await supabase
      .from('dokumen_templates')
      .update({
        table_headers: correctHeaders,
        updated_at: new Date().toISOString()
      })
      .eq('id', tpl.id);

    if (updateErr) {
      console.error(`❌ Gagal update template ${tpl.code}:`, updateErr.message);
    } else {
      console.log(`✅ Template ${tpl.code}: table_headers = [${correctHeaders.join(', ')}]`);
    }
  }

  console.log('\n🎉 Sterilisasi `dokumen_templates` di Supabase Selesai 100%!');
}

fixDokumenTemplatesHeadersInSupabase();
