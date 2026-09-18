const supabase = require('../backend/config/supabase.js');

function canonicalRabKey(str) {
  if (!str) return '';
  let s = String(str).toLowerCase();
  s = s.replace(/[.,\-_:;/\\()]/g, ' ');
  s = s.replace(/\bsekdes\b/g, 'sekretaris desa');
  s = s.replace(/\bkadus\b/g, 'kepala dusun');
  s = s.replace(/\bperencanaa\b/g, 'perencanaan');
  s = s.replace(/\btu\b/g, 'dan tu');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

const norm = (v) => String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, ' ');

const RAB_COLS = 'id, kode_unik_full, kode_unik, tahun, tipe_anggaran, id_referensi_murni, jumlah_anggaran, items';

async function migrate() {
  console.log('=== MEMULAI RE-ALIGNMENT DATA PERUBAHAN vs MURNI (SUPABASE) ===');

  const { data: rows, error } = await supabase
    .from('rab')
    .select(RAB_COLS)
    .order('id');

  if (error) {
    console.error('Gagal mengambil data rab:', error);
    process.exit(1);
  }

  const murni = rows.filter(r => (r.tipe_anggaran || '').toUpperCase() === 'MURNI');
  const perub = rows.filter(r => (r.tipe_anggaran || '').toUpperCase() === 'PERUBAHAN');
  const mById = new Map(murni.map(r => [Number(r.id), r]));
  const mByKode = new Map(murni.map(r => [r.tahun + '_' + String(r.kode_unik_full || r.kode_unik).trim(), r]));

  let updatedCount = 0;

  for (const p of perub) {
    const m = p.id_referensi_murni
      ? mById.get(Number(p.id_referensi_murni))
      : mByKode.get(p.tahun + '_' + String(p.kode_unik_full || p.kode_unik).trim());
    if (!m) continue;

    const mItems = typeof m.items === 'string' ? JSON.parse(m.items) : (m.items || []);
    let pItems = typeof p.items === 'string' ? JSON.parse(p.items) : (p.items || []);
    if (!pItems.length || !mItems.length) continue;

    // Bersihkan duplikat identik pada ID 791 (Sekretaris Desa duplikat)
    if (p.id === 791 && pItems.length > 15) {
      pItems = pItems.slice(0, 15);
    }

    const mItemsCanon = mItems.map((it, idx) => ({
      idx,
      item: it,
      canon: canonicalRabKey(it.uraian),
      subgroup: norm(it.subgroup || it.sub_kelompok || '')
    }));

    const usedMIndices = new Set();
    let rowChanged = false;

    const newPItems = pItems.map((pIt, pIdx) => {
      const pCanon = canonicalRabKey(pIt.uraian);
      const pCanonMurni = canonicalRabKey(pIt.uraian_murni);
      const pSub = norm(pIt.subgroup || pIt.sub_kelompok || '');

      let matchedM = null;

      // 1. Exact canonical within same subgroup
      matchedM = mItemsCanon.find(mC => !usedMIndices.has(mC.idx) && mC.subgroup === pSub && mC.canon === pCanon);

      // 2. Exact canonical within activity
      if (!matchedM) {
        matchedM = mItemsCanon.find(mC => !usedMIndices.has(mC.idx) && mC.canon === pCanon);
      }

      // 3. Match via pCanonMurni
      if (!matchedM && pCanonMurni) {
        matchedM = mItemsCanon.find(mC => !usedMIndices.has(mC.idx) && mC.canon === pCanonMurni);
      }

      if (matchedM) {
        usedMIndices.add(matchedM.idx);
        const mObj = matchedM.item;
        const newUrut = matchedM.idx;
        const newMan = matchedM.idx + 1;
        if (pIt.urutan_murni !== newUrut || pIt.urutan_manual !== newMan || pIt.item_baru) {
          rowChanged = true;
        }
        return {
          ...pIt,
          urutan_murni: newUrut,
          urutan_manual: newMan,
          uraian_murni: mObj.uraian,
          volume_murni: Number(mObj.volume || 1),
          satuan_murni: mObj.satuan || pIt.satuan || '',
          harga_murni: Number(mObj.harga || mObj.harga_satuan || 0),
          jumlah_murni: Number(mObj.jumlah !== undefined ? mObj.jumlah : (Number(mObj.volume || 1) * Number(mObj.harga || 0))),
          item_baru: false
        };
      } else {
        if (pIt.urutan_murni !== null || !pIt.item_baru) {
          rowChanged = true;
        }
        return {
          ...pIt,
          urutan_murni: null,
          item_baru: true,
          urutan_manual: 999000 + pIdx
        };
      }
    });

    // Urutkan item Perubahan secara logis mengikuti urutan Murni
    newPItems.sort((a, b) => {
      const uA = Number(a.urutan_manual !== undefined && a.urutan_manual !== null ? a.urutan_manual : 999999);
      const uB = Number(b.urutan_manual !== undefined && b.urutan_manual !== null ? b.urutan_manual : 999999);
      return uA - uB;
    });

    // Periksa apakah urutan array berubah
    const orderChanged = newPItems.some((it, i) => it !== pItems[i]);
    if (orderChanged) rowChanged = true;

    if (rowChanged || p.id === 791) {
      const totalPer = newPItems.reduce((s, it) => s + (Number(it.jumlah) || 0), 0);
      const { error: updErr } = await supabase
        .from('rab')
        .update({
          items: newPItems,
          jumlah_anggaran: totalPer,
          updated_at: new Date().toISOString()
        })
        .eq('id', p.id);

      if (updErr) {
        console.error(`Gagal update baris ID=${p.id}:`, updErr.message);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`\n✅ SUKSES: ${updatedCount} baris RAB Perubahan berhasil diselaraskan 1:1 dengan master Murni.`);
}

migrate().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
