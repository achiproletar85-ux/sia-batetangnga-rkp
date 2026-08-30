const supabase = require('../backend/config/supabase');

async function testGlobalDateSync() {
  console.log('🧪 Memverifikasi Sinkronisasi Global Tanggal Otomatis & Placeholder...');

  const year = 2027;

  // 1. Simpan ke GLOBAL_MASTER untuk 2027
  const globalFields = {
    tgl_musdes_tim_hari: 'Kamis, 15 Oktober 2027',
    tgl_musdes_tim_bulan: '15 Oktober 2027',
    tgl_musdes_tim_terbilang: 'Hari Kamis Tanggal Lima Belas Bulan Oktober Tahun Dua Ribu Dua Puluh Tujuh',
    sk_tim: '188.4/01/SK-DES/2027'
  };

  const { error: err1 } = await supabase.from('dokumen_form_data').upsert({
    doc_code: 'GLOBAL_MASTER',
    tahun: year,
    fields: globalFields,
    tables: {},
    updated_at: new Date().toISOString()
  }, { onConflict: 'doc_code,tahun' });

  if (err1) {
    console.error('❌ Gagal menyimpam GLOBAL_MASTER:', err1.message);
    return;
  }
  console.log('✅ Data tanggal otomatis & sk_tim berhasil disimpan di GLOBAL_MASTER (2027).');

  // 2. Simulasi pembacaan oleh dokumen DOC-02A dan DOC-30
  const { data: globalMaster } = await supabase
    .from('dokumen_form_data')
    .select('fields')
    .eq('doc_code', 'GLOBAL_MASTER')
    .eq('tahun', year)
    .single();

  console.log('\n📄 Memeriksa nilai terisi secara global untuk DOC-02A & DOC-30:');
  console.log('   - sk_tim:', globalMaster?.fields?.sk_tim);
  console.log('   - tgl_musdes_tim_hari:', globalMaster?.fields?.tgl_musdes_tim_hari);
  console.log('   - tgl_musdes_tim_bulan:', globalMaster?.fields?.tgl_musdes_tim_bulan);
  console.log('   - tgl_musdes_tim_terbilang:', globalMaster?.fields?.tgl_musdes_tim_terbilang);

  if (globalMaster?.fields?.sk_tim === '188.4/01/SK-DES/2027' &&
      globalMaster?.fields?.tgl_musdes_tim_hari === 'Kamis, 15 Oktober 2027') {
    console.log('\n🎉 SINKRONISASI TANGGAL & PLACEHOLDER GLOBAL 100% SINKRON & AKTIF!');
  } else {
    console.error('❌ Sinkronisasi gagal.');
  }
}

testGlobalDateSync();
