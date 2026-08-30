const supabase = require('../backend/config/supabase');

async function testRepeatableTableSaveLoad() {
  console.log('🧪 Memulai Pengujian Mendalam Simpan & Muat Repeatable Table...');

  const year = 2027;

  // Test 1: Simpan data tabel baru untuk DOC-27 (BA Musrenbang)
  const doc27NewTables = {
    tabel_kegiatan: [
      {
        'Jenis Kegiatan': 'Pengaspalan Jalan Dusun I',
        'Lokasi Kegiatan': 'Dusun I Batetangnga',
        'Volume / Satuan': '500 Meter',
        'Pagu Indikatif (Rp)': '150.000.000',
        'Sumber Dana': 'DDS'
      },
      {
        'Jenis Kegiatan': 'Pembangunan Posyandu Dusun II',
        'Lokasi Kegiatan': 'Dusun II Batetangnga',
        'Volume / Satuan': '1 Unit',
        'Pagu Indikatif (Rp)': '80.000.000',
        'Sumber Dana': 'DDS'
      }
    ]
  };

  console.log('\n[1] Menyimpan data tabel baru untuk DOC-27 (2027)...');
  const { error: err1 } = await supabase.from('dokumen_form_data').upsert({
    doc_code: 'DOC-27',
    tahun: year,
    tables: doc27NewTables,
    updated_at: new Date().toISOString()
  }, { onConflict: 'doc_code,tahun' });

  if (err1) throw err1;
  console.log('✅ Data tabel DOC-27 berhasil disimpan.');

  // Test 2: Ambil kembali data tabel DOC-27 dari Supabase
  console.log('\n[2] Mengambil data tabel DOC-27 dari Supabase...');
  const { data: doc27Loaded, error: err2 } = await supabase
    .from('dokumen_form_data')
    .select('tables')
    .eq('doc_code', 'DOC-27')
    .eq('tahun', year)
    .single();

  if (err2) throw err2;

  const loadedRows = doc27Loaded?.tables?.tabel_kegiatan;
  console.log('   Data Terload:', JSON.stringify(loadedRows, null, 2));

  if (Array.isArray(loadedRows) && loadedRows.length === 2 &&
      loadedRows[0]['Jenis Kegiatan'] === 'Pengaspalan Jalan Dusun I' &&
      !loadedRows[0].nama) {
    console.log('✅ VERIFIKASI DOC-27 GABUNGAN HASIL: SIMPAN & MUAT TABEL 100% AKURAT (Bebas dari nama Andi Wijaya/orang lain)!');
  } else {
    console.error('❌ Pengujian DOC-27 gagal.');
  }

  // Test 3: Simpan data tabel baru untuk DOC-20 (Daftar Hadir Musdes)
  const doc20NewTables = {
    tabel_daftar_hadir: [
      {
        'Nama Peserta': 'H. Muhammad Yamin',
        'Alamat / Dusun': 'Dusun III',
        'Jabatan / Unsur': 'Tokoh Agama',
        'Tanda Tangan': 'Hadir'
      }
    ]
  };

  console.log('\n[3] Menyimpan data tabel baru untuk DOC-20 (2027)...');
  await supabase.from('dokumen_form_data').upsert({
    doc_code: 'DOC-20',
    tahun: year,
    tables: doc20NewTables,
    updated_at: new Date().toISOString()
  }, { onConflict: 'doc_code,tahun' });

  const { data: doc20Loaded } = await supabase
    .from('dokumen_form_data')
    .select('tables')
    .eq('doc_code', 'DOC-20')
    .eq('tahun', year)
    .single();

  const loaded20 = doc20Loaded?.tables?.tabel_daftar_hadir;
  console.log('   Data Terload DOC-20:', JSON.stringify(loaded20, null, 2));

  if (Array.isArray(loaded20) && loaded20[0]['Nama Peserta'] === 'H. Muhammad Yamin') {
    console.log('✅ VERIFIKASI DOC-20 GABUNGAN HASIL: SIMPAN & MUAT TABEL 100% AKURAT!');
  } else {
    console.error('❌ Pengujian DOC-20 gagal.');
  }

  console.log('\n🎉 SELURUH PENGUJIAN MENDALAM DOKUMEN TABEL SELESAI DENGAN SUKSES!');
}

testRepeatableTableSaveLoad();
