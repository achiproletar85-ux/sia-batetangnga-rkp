require('dotenv').config();
const supabase = require('../backend/config/supabase.js');
const app = require('../server.js');
const { getRabItemRekening, sortRabItems, compareKodeUnikFull } = app.rabPerubahan;

async function main() {
  console.log('=== MEMULAI SINKRONISASI MUTLAK URUTAN RAB SUPABASE (MASTER SKELETON SISKEUDES DIAWALI KERTAS F4) ===');

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

  // Standarisasi dan update MURNI agar urutan item diawali Kertas f4 (#1)
  const murniMap = new Map();

  for (const m of murniList) {
    const originalItems = Array.isArray(m.items) ? m.items : [];
    if (originalItems.length > 0) {
      const sorted = sortRabItems(originalItems);
      const renumbered = sorted.map((it, idx) => ({
        ...it,
        kode_rekening: it.kode_rekening || (getRabItemRekening(it) ? getRabItemRekening(it) + '.' : undefined),
        no: idx + 1,
        urutan: idx + 1
      }));

      // Cek apakah ada perubahan urutan atau properti
      const hasChanged = originalItems.some((it, idx) => {
        const s = renumbered[idx];
        return !s || (it.uraian || it.nama_barang) !== (s.uraian || s.nama_barang) || it.no !== s.no;
      }) || originalItems.length !== renumbered.length;

      if (hasChanged) {
        console.log(`Menstandarkan urutan RAB Murni ID ${m.id} (${m.kode_unik_full || m.kode_unik}) -> Baris 1: ${renumbered[0]?.uraian || renumbered[0]?.nama_barang}`);
        const { error: updErr } = await supabase
          .from('rab')
          .update({
            items: renumbered,
            updated_at: new Date().toISOString()
          })
          .eq('id', m.id);

        if (updErr) {
          console.error(`Gagal update RAB Murni ID ${m.id}:`, updErr.message);
        }
        murniMap.set(m.id, renumbered);
        if (m.kode_unik_full) murniMap.set(m.kode_unik_full, renumbered);
        if (m.kode_unik) murniMap.set(m.kode_unik, renumbered);
      } else {
        murniMap.set(m.id, renumbered);
        if (m.kode_unik_full) murniMap.set(m.kode_unik_full, renumbered);
        if (m.kode_unik) murniMap.set(m.kode_unik, renumbered);
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
      // Jika tidak ada murni persis, urutkan dengan sortRabItems
      const sorted = sortRabItems(rawPItems).map((it, idx) => ({
        ...it,
        kode_rekening: it.kode_rekening || (getRabItemRekening(it) ? getRabItemRekening(it) + '.' : undefined),
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
          urutan_murni: mIdx,
          kode_rekening: targetP.kode_rekening || mItem.kode_rekening || (mRekening ? mRekening + '.' : undefined)
        });
      } else {
        // Item ada di Murni tapi belum ada di Perubahan
        matchedPItems.push({
          ...mItem,
          id_referensi_murni: mItem.id || null,
          urutan_murni: mIdx,
          kode_rekening: mItem.kode_rekening || (mRekening ? mRekening + '.' : undefined)
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

  console.log(`=== SINKRONISASI SELESAI: ${totalUpdatedPerubahan} RAB Perubahan diperbarui dengan Kertas f4 di nomor 1. ===`);
}

main().catch((err) => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
