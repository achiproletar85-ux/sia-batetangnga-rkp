const supabase = require('../backend/config/supabase');

async function purgeCrossTablePollution() {
  console.log('🧹 Memulai Pembersihan Total Pencemaran Tabel Silang di Supabase...');

  const { data: rows, error } = await supabase.from('dokumen_form_data').select('*');
  if (error) {
    console.error('❌ Error fetching dokumen_form_data:', error.message);
    return;
  }

  let cleanedCount = 0;

  for (const row of rows) {
    const code = row.doc_code;
    const year = row.tahun;
    let tables = row.tables || {};
    let modified = false;

    if (code === 'DOC-02B') {
      // DOC-02B adalah dokumen SK Tim Penyusun.
      // Hanya pertahankan tabel_sk_tim_penyusun dan hapus pencemaran tabel_kegiatan, tabel_daftar_hadir, susunan_tim, dll.
      const skRows = tables.tabel_sk_tim_penyusun || tables.susunan_tim || tables.tabel_tim_penyusun || [];
      const newTables = {
        tabel_sk_tim_penyusun: skRows
      };
      if (JSON.stringify(tables) !== JSON.stringify(newTables)) {
        tables = newTables;
        modified = true;
        console.log(`✅ Membersihkan pencemaran tabel di DOC-02B (${year}): Hanya menyimpan tabel_sk_tim_penyusun.`);
      }
    } else if (code === 'DOC-20') {
      // DOC-20 adalah BA Musdes (Daftar Hadir)
      const dhRows = tables.tabel_daftar_hadir || [];
      // Hapus jika dhRows hanya salinan dari SK Tim Penyusun (10 nama SUMAILA DAMANG dll)
      const isSkCopy = Array.isArray(dhRows) && dhRows.length === 10 && dhRows[0]?.Nama === 'SUMAILA DAMANG';
      const cleanRows = isSkCopy ? [] : dhRows;
      const newTables = { tabel_daftar_hadir: cleanRows };
      if (JSON.stringify(tables) !== JSON.stringify(newTables)) {
        tables = newTables;
        modified = true;
        console.log(`✅ Membersihkan pencemaran tabel di DOC-20 (${year}): Hanya menyisakan tabel_daftar_hadir yang bersih.`);
      }
    } else if (code === 'DOC-27') {
      // DOC-27 adalah BA Musrenbang (Tabel Kegiatan)
      const kgRows = tables.tabel_kegiatan || [];
      const isSkCopy = Array.isArray(kgRows) && kgRows.length === 10 && kgRows[0]?.Nama === 'SUMAILA DAMANG';
      const cleanRows = isSkCopy ? [] : kgRows;
      const newTables = { tabel_kegiatan: cleanRows };
      if (JSON.stringify(tables) !== JSON.stringify(newTables)) {
        tables = newTables;
        modified = true;
        console.log(`✅ Membersihkan pencemaran tabel di DOC-27 (${year}): Hanya menyisakan tabel_kegiatan yang bersih.`);
      }
    } else if (code === 'DOC-34') {
      // DOC-34 adalah Tim Verifikasi
      const tvRows = tables.tabel_tim_verifikasi || [];
      const isSkCopy = Array.isArray(tvRows) && tvRows.length === 10 && tvRows[0]?.Nama === 'SUMAILA DAMANG';
      const cleanRows = isSkCopy ? [] : tvRows;
      const newTables = { tabel_tim_verifikasi: cleanRows };
      if (JSON.stringify(tables) !== JSON.stringify(newTables)) {
        tables = newTables;
        modified = true;
        console.log(`✅ Membersihkan pencemaran tabel di DOC-34 (${year}): Hanya menyisakan tabel_tim_verifikasi yang bersih.`);
      }
    } else {
      // Semua dokumen non-tabel lainnya: Kosongkan tables = {}
      if (Object.keys(tables).length > 0) {
        tables = {};
        modified = true;
        console.log(`🗑️ Mengosongkan tabel liar dari dokumen non-tabel: ${code} (${year})`);
      }
    }

    if (modified) {
      const { error: updateErr } = await supabase
        .from('dokumen_form_data')
        .update({ tables, updated_at: new Date().toISOString() })
        .eq('id', row.id);

      if (!updateErr) cleanedCount++;
    }
  }

  console.log(`\n🎉 Pembersihan Total Selesai: ${cleanedCount} dokumen telah disterilkan dari pencemaran tabel silang.`);
}

purgeCrossTablePollution();
