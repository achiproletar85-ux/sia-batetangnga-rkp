const supabase = require('../backend/config/supabase');

async function fixDoc02bTablesPermanently() {
  console.log('🧹 Memangkas Kunci Tabel Berganda pada DOC-02B di Supabase...');

  const { data: doc, error } = await supabase
    .from('dokumen_form_data')
    .select('*')
    .eq('doc_code', 'DOC-02B')
    .eq('tahun', 2027)
    .single();

  if (error || !doc) {
    console.error('❌ Error fetching DOC-02B:', error?.message);
    return;
  }

  const existingTables = doc.tables || {};
  const cleanSkRows = existingTables.tabel_sk_tim_penyusun || existingTables.susunan_tim || [];

  // Pangkas 4 kunci duplikat (susunan_tim, tabel_kegiatan, tabel_daftar_hadir, tabel_tim_penyusun)
  // Menyisakan HANYA 1 kunci resmi: tabel_sk_tim_penyusun
  const sanitizedTables = {
    tabel_sk_tim_penyusun: cleanSkRows
  };

  const { error: updateErr } = await supabase
    .from('dokumen_form_data')
    .update({
      tables: sanitizedTables,
      updated_at: new Date().toISOString()
    })
    .eq('id', doc.id);

  if (updateErr) {
    console.error('❌ Gagal update DOC-02B:', updateErr.message);
  } else {
    console.log('✅ DOC-02B Berhasil Dipangkas: 4 kunci tabel duplikat dibuang, hanya menyisakan `tabel_sk_tim_penyusun`.');
  }
}

fixDoc02bTablesPermanently();
