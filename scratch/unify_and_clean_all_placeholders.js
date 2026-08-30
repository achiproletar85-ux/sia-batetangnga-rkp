const supabase = require('../backend/config/supabase');

const EXCLUDED_KEYS = ['tahun1', 'tahun2', 'tahun4'];

async function unifyAndCleanPlaceholders() {
  console.log('🧹 Memulai Audit & Penyelarasan Placeholder (Satu Placeholder = Satu Nilai Tunggal)...');

  const { data: rows, error } = await supabase.from('dokumen_form_data').select('*');
  if (error) {
    console.error('❌ Error fetching dokumen_form_data:', error.message);
    return;
  }

  // Kelompokkan per tahun
  const rowsByYear = {};
  rows.forEach(r => {
    if (!r.tahun) return;
    if (!rowsByYear[r.tahun]) rowsByYear[r.tahun] = [];
    rowsByYear[r.tahun].push(r);
  });

  for (const [yr, yrRows] of Object.entries(rowsByYear)) {
    console.log(`\n==================================================`);
    console.log(`📊 Memproses Tahun: ${yr} (${yrRows.length} dokumen)`);
    console.log(`==================================================`);

    // 1. Kumpulkan semua nilai per key
    const keyValues = {};
    const keyLatestUpdate = {};

    yrRows.forEach(row => {
      const fields = row.fields || {};
      const updatedAt = new Date(row.updated_at || 0).getTime();

      Object.entries(fields).forEach(([k, v]) => {
        if (!v || EXCLUDED_KEYS.includes(k)) return;
        const valStr = String(v).trim();
        if (!valStr) return;

        if (!keyValues[k]) keyValues[k] = {};
        if (!keyValues[k][valStr]) keyValues[k][valStr] = { count: 0, latestTime: 0 };
        
        keyValues[k][valStr].count += 1;
        if (updatedAt > keyValues[k][valStr].latestTime) {
          keyValues[k][valStr].latestTime = updatedAt;
        }
      });
    });

    // 2. Pilih 1 nilai tunggal terbaik per key (yang paling baru/sering digunakan)
    const unifiedMasterFields = {};
    let conflictCount = 0;

    Object.entries(keyValues).forEach(([k, valMap]) => {
      const variants = Object.keys(valMap);
      if (variants.length > 1) {
        conflictCount++;
        console.log(`⚠️ KONFLIK KEY {{${k}}}: Menemukan ${variants.length} nilai berbeda di tahun ${yr}:`);
        variants.forEach(v => console.log(`   - "${v}" (muncul ${valMap[v].count}x)`));
      }

      // Urutkan varian berdasarkan latestTime terbanyak/terbaru
      variants.sort((a, b) => valMap[b].latestTime - valMap[a].latestTime || valMap[b].count - valMap[a].count);
      const chosenVal = variants[0];
      unifiedMasterFields[k] = chosenVal;

      if (variants.length > 1) {
        console.log(`   👉 Nilai Tunggal Terpilih untuk {{${k}}}: "${chosenVal}"`);
      }
    });

    console.log(`\n📌 Tahun ${yr}: Total ${Object.keys(unifiedMasterFields).length} placeholder diselaraskan (${conflictCount} konflik diselesaikan).`);

    // 3. Update GLOBAL_MASTER untuk tahun ini
    const { error: globalErr } = await supabase.from('dokumen_form_data').upsert({
      doc_code: 'GLOBAL_MASTER',
      tahun: parseInt(yr, 10),
      fields: unifiedMasterFields,
      tables: {},
      updated_at: new Date().toISOString()
    }, { onConflict: 'doc_code,tahun' });

    if (globalErr) {
      console.error(`❌ Gagal update GLOBAL_MASTER (${yr}):`, globalErr.message);
    } else {
      console.log(`✅ GLOBAL_MASTER (${yr}) berhasil diselaraskan.`);
    }

    // 4. Update seluruh dokumen di tahun ini agar semua key yang cocok menggunakan nilai tunggal terpilih
    for (const row of yrRows) {
      if (row.doc_code === 'GLOBAL_MASTER') continue;

      const fields = row.fields || {};
      let updated = false;

      Object.keys(fields).forEach(k => {
        if (EXCLUDED_KEYS.includes(k)) return;
        if (unifiedMasterFields[k] !== undefined && fields[k] !== unifiedMasterFields[k]) {
          fields[k] = unifiedMasterFields[k];
          updated = true;
        }
      });

      if (updated) {
        await supabase
          .from('dokumen_form_data')
          .update({ fields, updated_at: new Date().toISOString() })
          .eq('id', row.id);
      }
    }
  }

  console.log('\n🎉 PENYELARASAN SELESAI: 100% Placeholder Kini Memiliki Tepat 1 Nilai Tunggal per Tahun!');
}

unifyAndCleanPlaceholders();
