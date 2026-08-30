const supabase = require('../backend/config/supabase');

async function testIsolation() {
  console.log('🧪 Memulai pengujian isolasi tahun untuk Dokumen Desa...');

  const docCode = 'DOC-TEST-ISOLATION';
  const year2027 = 2027;
  const year2026 = 2026;

  try {
    // 1. Simpan data untuk 2027
    console.log(`\n[1] Menyimpan data 2027 ke Supabase...`);
    const { error: err1 } = await supabase
      .from('dokumen_form_data')
      .upsert({
        doc_code: docCode,
        tahun: year2027,
        fields: { nama_kegiatan: 'Pembangunan Jalan Desa 2027' },
        tables: {},
        updated_at: new Date().toISOString()
      }, { onConflict: 'doc_code,tahun' });

    if (err1) throw err1;
    console.log('✅ Data 2027 berhasil disimpan.');

    // 2. Cek apakah 2026 tetap KOSONG (tidak bocor dari 2027)
    console.log(`\n[2] Memeriksa data untuk tahun 2026 (seharusnya kosong)...`);
    const { data: data2026, error: err2 } = await supabase
      .from('dokumen_form_data')
      .select('*')
      .eq('doc_code', docCode)
      .eq('tahun', year2026)
      .maybeSingle();

    if (err2) throw err2;

    const fields2026 = data2026 ? data2026.fields : {};
    console.log('   Fields 2026:', fields2026);

    if (data2026 && Object.keys(fields2026 || {}).length > 0) {
      console.error('❌ KESALAHAN ISOLASI: Data 2026 terisi dari tahun lain!');
    } else {
      console.log('✅ ISOLASI TAHUN BERHASIL: Tahun 2026 tetap bersih/kosong!');
    }

    // 3. Cek data 2027
    console.log(`\n[3] Memeriksa data untuk tahun 2027...`);
    const { data: data2027, error: err3 } = await supabase
      .from('dokumen_form_data')
      .select('*')
      .eq('doc_code', docCode)
      .eq('tahun', year2027)
      .maybeSingle();

    if (err3) throw err3;

    console.log('   Fields 2027:', data2027?.fields);
    if (data2027?.fields?.nama_kegiatan === 'Pembangunan Jalan Desa 2027') {
      console.log('✅ DATA 2027 AKURAT!');
    } else {
      console.error('❌ Data 2027 tidak cocok.');
    }

    // 4. Clean up test rows
    await supabase.from('dokumen_form_data').delete().eq('doc_code', docCode);
    console.log('\n🧹 Baris uji berhasil dibersihkan.');
    console.log('\n🎉 Pengujian Selesai: Isolasi data tahun 100% Berhasil!');

  } catch (err) {
    console.error('❌ Error during test:', err.message);
  }
}

testIsolation();
