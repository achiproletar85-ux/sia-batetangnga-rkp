const supabase = require('../backend/config/supabase');

const TABLE_DOC_HEADERS = {
  'DOC-02B': ['No', 'Nama', 'Tempat, Tanggal Lahir', 'Jabatan', 'Unsur'],
  'DOC-20': ['No', 'Nama Peserta', 'Alamat / Dusun', 'Jabatan / Unsur', 'Tanda Tangan'],
  'DOC-27': ['No', 'Jenis Kegiatan', 'Lokasi Kegiatan', 'Volume / Satuan', 'Pagu Indikatif (Rp)', 'Sumber Dana'],
  'DOC-34': ['No', 'Nama Tim Verifikasi', 'Jabatan / Instansi', 'Keterangan']
};

async function fixDocumentTables() {
  console.log('🧹 Memulai Uji & Pembersihan Data Tabel di Supabase...');

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

    // Jika dokumen non-tabel, kosongkan tables
    if (!TABLE_DOC_HEADERS[code]) {
      if (Object.keys(tables).length > 0) {
        tables = {};
        modified = true;
        console.log(`🗑️ Mengosongkan tabel pada dokumen non-tabel: ${code} (${year})`);
      }
    } else {
      // Dokumen bertabel: periksa apakah ada pencemaran data kolom (misal Andi Wijaya/Budi Santoso di DOC-20/DOC-27/DOC-34)
      const allowedHeaders = TABLE_DOC_HEADERS[code];
      const dataHeaders = allowedHeaders.filter(h => h.toLowerCase() !== 'no');

      // Periksa semua keys pada object tables
      Object.keys(tables).forEach(tKey => {
        let arr = tables[tKey];
        if (Array.isArray(arr)) {
          let arrModified = false;
          const cleanedArr = arr.map(item => {
            if (!item || typeof item !== 'object') return item;

            // Jika dokumen ini BUKAN DOC-02B, hapus property dummy 'nama', 'ttl', 'jabatan', 'unsur' jika tidak sesuai header
            const isDoc02B = (code === 'DOC-02B');
            const newObj = { ...item };

            if (!isDoc02B) {
              // Jika ini DOC-27 / DOC-20 / DOC-34, dan berisi nama dummy Andi Wijaya/Budi Santoso dari DOC-02B
              if (newObj.nama === 'Andi Wijaya' || newObj.nama === 'Siti Aminah' || newObj.nama === 'Joko Susilo' || newObj.nama === 'Budi Santoso') {
                delete newObj.nama;
                delete newObj.ttl;
                delete newObj.jabatan;
                delete newObj.unsur;
                arrModified = true;
              }
            }

            return newObj;
          });

          if (arrModified) {
            tables[tKey] = cleanedArr;
            modified = true;
          }
        }
      });
    }

    if (modified) {
      await supabase
        .from('dokumen_form_data')
        .update({ tables, updated_at: new Date().toISOString() })
        .eq('id', row.id);
      cleanedCount++;
    }
  }

  console.log(`\n🎉 Pembersihan Selesai: ${cleanedCount} record tabel berhasil diperbaiki & disterilkan.`);
}

fixDocumentTables();
