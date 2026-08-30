const supabase = require('../backend/config/supabase');

const DUMMY_STRINGS = [
  'SUMAILA DAMANG',
  'Aula Kantor Desa Batetangnga',
  'Jl. Poros Batetangnga No. 01, Desa Batetangnga',
  'Kamis, 15 Oktober 2024',
  '15 Oktober 2024',
  'Lima belas bulan Oktober tahun dua ribu dua puluh empat',
  'Hari Selasa Tanggal Lima Belas Bulan Oktober Tahun Dua Ribu Dua Puluh Empat',
  'Kamis, 24 Oktober 2024',
  '24 Oktober 2024',
  '188.4/05/SK-DES/X/2024',
  '188.4/01/SK-DES/2027'
];

async function purgeAllDummyFieldsInSupabase() {
  console.log('🧹 Memulai Pembersihan Total Teks Dummy/Bawaan dari `fields` di Supabase...');

  const { data: rows, error } = await supabase.from('dokumen_form_data').select('*');
  if (error) {
    console.error('❌ Error fetching dokumen_form_data:', error.message);
    return;
  }

  let cleanedRows = 0;
  let cleanedKeysTotal = 0;

  for (const row of rows) {
    let modified = false;
    const fields = row.fields || {};

    Object.keys(fields).forEach(k => {
      const v = String(fields[k] || '').trim();
      
      // Deteksi jika v sama dengan DUMMY_STRINGS atau mengandung tanggal tua 2024
      const isDummy = DUMMY_STRINGS.some(d => v.toLowerCase() === d.toLowerCase()) ||
                      v.includes('15 Oktober 2024') ||
                      v.includes('24 Oktober 2024') ||
                      v.includes('dua ribu dua puluh empat');

      if (isDummy) {
        console.log(`🗑️ [${row.doc_code} - ${row.tahun}] Key "${k}": "${fields[k]}" -> ""`);
        fields[k] = '';
        modified = true;
        cleanedKeysTotal++;
      }
    });

    if (modified) {
      const { error: updateErr } = await supabase
        .from('dokumen_form_data')
        .update({ fields, updated_at: new Date().toISOString() })
        .eq('id', row.id);

      if (updateErr) {
        console.error(`❌ Gagal update row id ${row.id}:`, updateErr.message);
      } else {
        cleanedRows++;
      }
    }
  }

  console.log(`\n🎉 Pembersihan Selesai Total: ${cleanedKeysTotal} field pada ${cleanedRows} dokumen telah dikosongkan dari data dummy!`);
}

purgeAllDummyFieldsInSupabase();
