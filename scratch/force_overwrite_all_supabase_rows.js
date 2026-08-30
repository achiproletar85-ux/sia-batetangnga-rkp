require('dotenv').config();
const supabase = require('../backend/config/supabase');

const EXACT_FIELDS_TO_FORCE = {
  tahun0: '2025',
  tahun: '2026',
  tahun1: '2027',
  tahun2: '2028',
  rpjmdes1: '02 Tahun 2025 Tahun Anggaran 2023-2030 tentang Perubahan Atas Peraturan Rencana Pembangunan Jangka Menengah Desa (RPJMDesa) Tahun Anggaran 2022-2029 Batetangnga (Lembaran DesaBatetangnga Tahun 2025 Nomor 02);',
  kewenangan1: '07 Tahun 2022 Tentang kewenangan Desa berdasarkan Hak Asal Usul dan kewenangan Lokal Berskala Desa (Lembaran Desa Batetangnga Tahun 2022 Nomor 07;',
  rkpdes1: '06 tahun 2025 tentang tentang Rencana Kerja Pemerintah Desa Tahun Anggaran 2026 (Lembaran Desa Datetangnga Tahun 2025 Nomor 06);',
  apbdes1: '09 Tahun 2025 tentang Anggaran Pendapatan Belanja Desa Tahun 2026 (Lembaran Desa Batetangnga Tahun 2025 Nomor 9).',
  nama_desa: 'Desa Batetangnga',
  kades: 'SUMAILA DAMANG',
  nama_kepala_desa: 'SUMAILA DAMANG',
  nama_ketua_bpd: 'HAERUDDIN, S.Pd.',
  tempat: 'Aula Kantor Desa Batetangnga',
  tempat_musrembang: 'Aula Kantor Desa Batetangnga'
};

async function forceOverwriteAllRowsInSupabase() {
  console.log('⚡ === PAKSA UPDATE TINGKAT DATABASE SUPABASE UNTUK SELURUH BARIS === ⚡\n');

  // Fetch ALL rows from dokumen_form_data
  const { data: allRows, error: fetchErr } = await supabase
    .from('dokumen_form_data')
    .select('id, doc_code, tahun, fields');

  if (fetchErr) {
    console.error('❌ Gagal mengambil baris dari Supabase:', fetchErr.message);
    return;
  }

  console.log(`📡 Ditemukan ${allRows.length} total baris di tabel dokumen_form_data.`);
  let updatedCount = 0;

  for (const row of allRows) {
    const currentFields = row.fields || {};
    // Overwrite with exact master fields
    const newFields = {
      ...currentFields,
      ...EXACT_FIELDS_TO_FORCE
    };

    const { error: updateErr } = await supabase
      .from('dokumen_form_data')
      .update({ fields: newFields, updated_at: new Date().toISOString() })
      .eq('id', row.id);

    if (updateErr) {
      console.error(`❌ Gagal update row ID ${row.id} (${row.doc_code}):`, updateErr.message);
    } else {
      updatedCount++;
    }
  }

  console.log(`\n🎉 SUKSES TOTAL! ${updatedCount} dari ${allRows.length} baris di Supabase telah DIPAKSA SERAGAM 100%!`);
}

forceOverwriteAllRowsInSupabase();
