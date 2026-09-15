require('dotenv').config();
const supabase = require('../backend/config/supabase.js');

// Helper pembanding kode unik / rekening
const compareKodeUnikFull = (a, b) => {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const cleanA = String(a).trim().replace(/\.+$/, '');
  const cleanB = String(b).trim().replace(/\.+$/, '');
  const partsA = cleanA.split('.');
  const partsB = cleanB.split('.');
  const maxLen = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < maxLen; i++) {
    const partA = partsA[i];
    const partB = partsB[i];
    if (partA === undefined) return -1;
    if (partB === undefined) return 1;
    const numA = parseInt(partA, 10);
    const numB = parseInt(partB, 10);
    const isNumA = !isNaN(numA) && String(numA) === partA;
    const isNumB = !isNaN(numB) && String(numB) === partB;
    if (isNumA && isNumB) {
      if (numA !== numB) return numA - numB;
    } else {
      const cmp = partA.localeCompare(partB, 'id', { numeric: true, sensitivity: 'base' });
      if (cmp !== 0) return cmp;
    }
  }
  return 0;
};

const getRabItemRekening = (item) => {
  const code = String(
    item.kode_rekening ||
    item.rekening ||
    item.kode_kegiatan ||
    item.kode_unik ||
    item.kode_unik_full ||
    ''
  ).trim();
  return code.replace(/\.+$/, '');
};

const sortRabItems = (items) => {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a, b) => {
    const codeA = getRabItemRekening(a);
    const codeB = getRabItemRekening(b);
    const cmpCode = compareKodeUnikFull(codeA, codeB);
    if (cmpCode !== 0) return cmpCode;
    const nameA = String(a.uraian || a.nama_barang || a.nama || '').trim();
    const nameB = String(b.uraian || b.nama_barang || b.nama || '').trim();
    return nameA.localeCompare(nameB, 'id', { numeric: true, sensitivity: 'base' });
  });
};

async function main() {
  console.log('=== MEMULAI SINKRONISASI MUTLAK URUTAN RAB SUPABASE ===');

  if (!supabase) {
    console.error('Koneksi Supabase tidak tersedia!');
    process.exit(1);
  }

  // 1. Ambil data RAB MURNI (Eksplisit kolom, Zero-Wildcard)
  const { data: murniList, error: murniErr } = await supabase
    .from('rab')
    .select('id, kode_unik_full, kode_unik, tahun, tipe_anggaran, items')
    .eq('tipe_anggaran', 'MURNI');

  if (murniErr) {
    console.error('Gagal mengambil data RAB Murni:', murniErr);
    process.exit(1);
  }

  console.log(`Ditemukan ${murniList.length} baris RAB Murni.`);

  // Standarisasi dan update MURNI jika urutan item belum sesuai alfabetis/rekening
  const murniMap = new Map();

  for (const m of murniList) {
    const originalItems = Array.isArray(m.items) ? m.items : [];
    if (originalItems.length > 0) {
      const sorted = sortRabItems(originalItems);
      const renumbered = sorted.map((it, idx) => ({
        ...it,
        no: idx + 1,
        urutan: idx + 1
      }));

      // Cek apakah ada perubahan urutan
      const hasChanged = originalItems.some((it, idx) => {
        const s = renumbered[idx];
        return !s || (it.uraian || it.nama_barang) !== (s.uraian || s.nama_barang);
      });

      if (hasChanged) {
        console.log(`Menstandarkan urutan RAB Murni ID ${m.id} (${m.kode_unik_full || m.kode_unik})...`);
        const { error: updErr } = await supabase
          .from('rab')
          .update({
            items: renumbered,
            updated_at: new Date().toISOString()
          })
          .eq('id', m.id);

        if (updErr) {
          console.error(`Gagal update RAB Murni ID ${m.id}:`, updErr.message);
        } else {
          console.log(`Berhasil standarisasi RAB Murni ID ${m.id}.`);
        }
        murniMap.set(m.id, renumbered);
        if (m.kode_unik_full) murniMap.set(m.kode_unik_full, renumbered);
        if (m.kode_unik) murniMap.set(m.kode_unik, renumbered);
      } else {
        murniMap.set(m.id, originalItems);
        if (m.kode_unik_full) murniMap.set(m.kode_unik_full, originalItems);
        if (m.kode_unik) murniMap.set(m.kode_unik, originalItems);
      }
    }
  }

  // 2. Ambil data RAB PERUBAHAN
  const { data: perubahanList, error: perubErr } = await supabase
    .from('rab')
    .select('id, kode_unik_full, kode_unik, tahun, tipe_anggaran, id_referensi_murni, items')
    .eq('tipe_anggaran', 'PERUBAHAN');

  if (perubErr) {
    console.error('Gagal mengambil data RAB Perubahan:', perubErr);
    process.exit(1);
  }

  console.log(`Ditemukan ${perubahanList.length} baris RAB Perubahan.`);

  let totalUpdatedPerubahan = 0;

  for (const p of perubahanList) {
    const rawPItems = Array.isArray(p.items) ? p.items : [];
    if (rawPItems.length === 0) continue;

    // Cari master skeleton MURNI yang bersesuaian
    let masterItems = null;
    if (p.id_referensi_murni && murniMap.has(p.id_referensi_murni)) {
      masterItems = murniMap.get(p.id_referensi_murni);
    } else if (p.kode_unik_full && murniMap.has(p.kode_unik_full)) {
      masterItems = murniMap.get(p.kode_unik_full);
    } else if (p.kode_unik && murniMap.has(p.kode_unik)) {
      masterItems = murniMap.get(p.kode_unik);
    }

    if (!masterItems || masterItems.length === 0) {
      // Jika tidak ada murni persis, urutkan dengan sortRabItems saja
      const sorted = sortRabItems(rawPItems).map((it, idx) => ({
        ...it,
        no: idx + 1,
        urutan: idx + 1
      }));
      const { error: updErr } = await supabase
        .from('rab')
        .update({
          items: sorted,
          updated_at: new Date().toISOString()
        })
        .eq('id', p.id);

      if (!updErr) totalUpdatedPerubahan++;
      continue;
    }

    // Bangun skeleton urutan dari masterItems
    const matchedPItems = [];
    const usedPIndices = new Set();

    masterItems.forEach((mItem, mIdx) => {
      const mRekening = getRabItemRekening(mItem);
      const mName = String(mItem.uraian || mItem.nama_barang || mItem.nama || '').trim().toLowerCase();

      // Cari item di rawPItems yang cocok
      let foundIdx = -1;
      // Coba 1: cocokkan id_referensi_murni jika ada
      if (mItem.id) {
        foundIdx = rawPItems.findIndex((pItem, pIdx) => {
          if (usedPIndices.has(pIdx)) return false;
          return pItem.id_referensi_murni && String(pItem.id_referensi_murni) === String(mItem.id);
        });
      }

      // Coba 2: cocokkan rekening dan nama persis
      if (foundIdx === -1) {
        foundIdx = rawPItems.findIndex((pItem, pIdx) => {
          if (usedPIndices.has(pIdx)) return false;
          const pRekening = getRabItemRekening(pItem);
          const pName = String(pItem.uraian || pItem.nama_barang || pItem.nama || '').trim().toLowerCase();
          return pRekening === mRekening && pName === mName;
        });
      }

      // Coba 3: cocokkan nama saja
      if (foundIdx === -1) {
        foundIdx = rawPItems.findIndex((pItem, pIdx) => {
          if (usedPIndices.has(pIdx)) return false;
          const pName = String(pItem.uraian || pItem.nama_barang || pItem.nama || '').trim().toLowerCase();
          return pName === mName;
        });
      }

      if (foundIdx !== -1) {
        usedPIndices.add(foundIdx);
        const targetP = rawPItems[foundIdx];
        matchedPItems.push({
          ...targetP,
          id_referensi_murni: targetP.id_referensi_murni || mItem.id || null,
          urutan_murni: mIdx + 1,
          kode_rekening: mItem.kode_rekening || targetP.kode_rekening
        });
      }
    });

    // Item baru di perubahan (yang tidak ada di Murni)
    const newItems = [];
    rawPItems.forEach((pItem, pIdx) => {
      if (!usedPIndices.has(pIdx)) {
        newItems.push(pItem);
      }
    });

    // Urutkan newItems secara tertib juga
    const sortedNewItems = sortRabItems(newItems);

    // Gabungkan: matchedPItems (sesuai kerangka murni) + sortedNewItems di paling akhir
    const finalItems = [...matchedPItems, ...sortedNewItems].map((it, idx) => ({
      ...it,
      no: idx + 1,
      urutan: idx + 1
    }));

    console.log(`Mengupdate RAB Perubahan ID ${p.id} (${p.kode_unik_full || p.kode_unik}) -> ${finalItems.length} items. Baris 1: ${finalItems[0]?.uraian || finalItems[0]?.nama_barang}`);

    const { error: updErr } = await supabase
      .from('rab')
      .update({
        items: finalItems,
        updated_at: new Date().toISOString()
      })
      .eq('id', p.id);

    if (updErr) {
      console.error(`Gagal update RAB Perubahan ID ${p.id}:`, updErr.message);
    } else {
      totalUpdatedPerubahan++;
    }
  }

  console.log(`=== SINKRONISASI SELESAI: ${totalUpdatedPerubahan} RAB Perubahan diperbarui. ===`);
}

main().catch((err) => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
