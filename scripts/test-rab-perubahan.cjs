#!/usr/bin/env node
/**
 * Uji otomatis logika RAB PERUBAHAN (tanpa menyentuh database).
 *
 * Memverifikasi:
 *  1. Penjajaran item MURNI (SEMULA) <-> PERUBAHAN (MENJADI)
 *  2. Item baru (hanya ada di PERUBAHAN) -> SEMULA = 0
 *  3. Item dihapus (hanya ada di MURNI)   -> MENJADI = 0
 *  4. BERTAMBAH/(BERKURANG) = JUMLAH_MENJADI - JUMLAH_SEMULA
 *  5. Pergantian uraian tetap berpasangan lewat `urutan_murni`
 *  6. Daftar kolom eksplisit (zero-wildcard) pada konstanta RAB
 *
 * Jalankan: node scripts/test-rab-perubahan.cjs
 */
const path = require('path');
const app = require(path.resolve(__dirname, '..', 'server.js'));
const { alignRabItems, rabItemJumlah, normalizeRabTipe } = app.rabPerubahan;

let pass = 0;
let fail = 0;

function check(nama, aktual, harapan) {
    const a = JSON.stringify(aktual);
    const h = JSON.stringify(harapan);
    if (a === h) {
        pass++;
        console.log(`  ✅ ${nama}`);
    } else {
        fail++;
        console.log(`  ❌ ${nama}\n      harapan : ${h}\n      aktual  : ${a}`);
    }
}

const item = (uraian, volume, satuan, harga, extra = {}) => ({
    group: 'Belanja Barang dan Jasa',
    subgroup: 'Belanja Bahan/Material',
    uraian,
    volume,
    satuan,
    harga,
    jumlah: Number(volume) * Number(harga),
    sumber: 'DDS',
    ...extra
});

console.log('\n=== UJI LOGIKA RAB PERUBAHAN ===\n');

console.log('1) rabItemJumlah (volume x harga / kolom jumlah)');
check('hitung volume x harga', rabItemJumlah({ volume: 12, harga: 540000 }), 6480000);
check('pakai kolom jumlah bila ada', rabItemJumlah({ volume: 1, harga: 5, jumlah: 999 }), 999);
check('volume desimal koma', rabItemJumlah({ volume: '2,5', harga: 1000 }), 2500);
check('item kosong -> 0', rabItemJumlah(null), 0);

console.log('\n2) normalizeRabTipe');
check('"perubahan" -> PERUBAHAN', normalizeRabTipe('perubahan'), 'PERUBAHAN');
check('default -> MURNI', normalizeRabTipe(undefined), 'MURNI');
check('sampah -> MURNI', normalizeRabTipe('xxx'), 'MURNI');

console.log('\n3) Penjajaran & selisih');
{
    const murni = [
        item('Tunjangan Kepala Desa', 12, 'OB', 540000),
        item('Belanja ATK', 5, 'Rim', 50000),
        item('Belanja Listrik', 12, 'Bulan', 100000)
    ];
    const perubahan = [
        // naik harga: 12 x 600.000
        item('Tunjangan Kepala Desa', 12, 'OB', 600000, { urutan_murni: 0 }),
        // turun volume: 3 x 50.000
        item('Belanja ATK', 3, 'Rim', 50000, { urutan_murni: 1 }),
        // item BARU (tidak ada di MURNI) -> SEMULA 0
        item('Belanja Cetak Spanduk', 2, 'Lbr', 75000, { urutan_murni: null })
        // 'Belanja Listrik' hilang -> MENJADI 0
    ];

    const rows = alignRabItems(murni, perubahan);
    check('jumlah baris = 4 (3 murni + 1 baru)', rows.length, 4);

    const naik = rows.find(r => r.uraian === 'Tunjangan Kepala Desa');
    check('selisih bertambah = +720.000', naik.selisih, 12 * 600000 - 12 * 540000);
    check('semula naik terisi', naik.semula.jumlah, 12 * 540000);
    check('menjadi naik terisi', naik.menjadi.jumlah, 12 * 600000);

    const turun = rows.find(r => r.uraian === 'Belanja ATK');
    check('selisih berkurang = -100.000', turun.selisih, 3 * 50000 - 5 * 50000);
    check('tidak ditandai item_baru', turun.item_baru, false);

    const baru = rows.find(r => r.uraian === 'Belanja Cetak Spanduk');
    check('item baru: item_baru = true', baru.item_baru, true);
    check('item baru: SEMULA volume = 0', baru.semula.volume, 0);
    check('item baru: SEMULA harga = 0', baru.semula.harga, 0);
    check('item baru: SEMULA jumlah = 0', baru.semula.jumlah, 0);
    check('item baru: MENJADI = 150.000', baru.menjadi.jumlah, 150000);
    check('item baru: selisih = +150.000', baru.selisih, 150000);

    const hapus = rows.find(r => r.uraian === 'Belanja Listrik');
    check('item dihapus: item_dihapus = true', hapus.item_dihapus, true);
    check('item dihapus: MENJADI jumlah = 0', hapus.menjadi.jumlah, 0);
    check('item dihapus: selisih = -1.200.000', hapus.selisih, -1200000);

    const totalSelisih = rows.reduce((s, r) => s + r.selisih, 0);
    check('total selisih = Σ baris', totalSelisih, 720000 - 100000 + 150000 - 1200000);
}

console.log('\n4) Uraian diubah, tetap berpasangan via urutan_murni');
{
    const murni = [item('Belanja ATK', 5, 'Rim', 50000)];
    const perubahan = [{
        group: 'Belanja Barang dan Jasa',
        subgroup: 'Belanja Bahan/Material',
        uraian: 'Belanja Alat Tulis Kantor (nama direvisi)',
        volume: 5, satuan: 'Rim', harga: 50000, jumlah: 250000,
        urutan_murni: 0
    }];
    const rows = alignRabItems(murni, perubahan);
    check('tetap 1 baris (bukan hapus+baru)', rows.length, 1);
    check('tidak dianggap item baru', rows[0].item_baru, false);
    check('tidak dianggap item dihapus', rows[0].item_dihapus, false);
    check('semula tetap terisi', rows[0].semula.jumlah, 250000);
}

console.log('\n5) Padanan via kunci komposit (tanpa urutan_murni)');
{
    const murni = [item('Belanja ATK', 5, 'Rim', 50000)];
    const perubahan = [{
        group: 'Belanja Barang dan Jasa',
        subgroup: 'Belanja Bahan/Material',
        uraian: 'Belanja ATK', volume: 8, satuan: 'Rim', harga: 50000, jumlah: 400000
    }];
    const rows = alignRabItems(murni, perubahan);
    check('berpasangan = 1 baris', rows.length, 1);
    check('selisih = +150.000', rows[0].selisih, 150000);
}

console.log('\n6) Kepatuhan zero-wildcard pada konstanta kolom');
{
    const { RAB_COMPARE_COLUMNS, RAB_LIST_COLUMNS } = app.rabPerubahan;
    check('RAB_COMPARE_COLUMNS tanpa "*"', /\*/.test(RAB_COMPARE_COLUMNS), false);
    check('RAB_LIST_COLUMNS tanpa "*"', /\*/.test(RAB_LIST_COLUMNS), false);
    check('RAB_COMPARE_COLUMNS memuat tipe_anggaran', RAB_COMPARE_COLUMNS.includes('tipe_anggaran'), true);
    check('RAB_LIST_COLUMNS memuat tipe_anggaran', RAB_LIST_COLUMNS.includes('tipe_anggaran'), true);
}

console.log('\n7) Penanganan nilai 0 (nol) pada volume, harga, dan jumlah');
{
    check('rabItemJumlah volume 0 -> 0', rabItemJumlah({ volume: 0, harga: 50000 }), 0);
    check('rabItemJumlah harga 0 -> 0', rabItemJumlah({ volume: 10, harga: 0 }), 0);
    check('rabItemJumlah volume "0" -> 0', rabItemJumlah({ volume: '0', harga: 50000 }), 0);
    check('rabItemJumlah eksplisit jumlah 0 -> 0', rabItemJumlah({ volume: 0, harga: 0, jumlah: 0 }), 0);

    const murni = [{ group: 'G', subgroup: 'S', uraian: 'Kegiatan Awal Nol', volume: 0, satuan: 'Paket', harga: 0, jumlah: 0 }];
    const perubahan = [{ group: 'G', subgroup: 'S', uraian: 'Kegiatan Awal Nol', volume: 1, satuan: 'Paket', harga: 100000, jumlah: 100000, urutan_murni: 0 }];
    const rows = alignRabItems(murni, perubahan);
    check('penjajaran murni 0 dengan perubahan 100rb: 1 baris', rows.length, 1);
    check('semula jumlah = 0', rows[0].semula.jumlah, 0);
    check('semula volume = 0', rows[0].semula.volume, 0);
    check('menjadi jumlah = 100.000', rows[0].menjadi.jumlah, 100000);
    check('selisih bertambah = +100.000', rows[0].selisih, 100000);
}

console.log('\n8) Pencegahan Duplikasi Row & Double-Count Pagu saat Edit RAB Perubahan');
{
    const normKode = (k) => String(k || '').trim().replace(/\.+$/, '').replace(/^PEM\./i, '');

    check('normKode buang titik akhir "01.01.01.01."', normKode('01.01.01.01.'), '01.01.01.01');
    check('normKode buang prefix PEM. "PEM.01.01.01.01."', normKode('PEM.01.01.01.01.'), '01.01.01.01');
    check('normKode cocokkan variasi format kode', normKode('01.01.01.01.') === normKode('PEM.01.01.01.01'), true);

    // Simulasi pencegahan double-count dalam alokasi pagu
    const mockSavedRabList = [
        { id: 751, kode_unik_full: '01.01.01.01.', tahun: 2026, jumlah_anggaran: 50000000, sumber_dana: 'DDS' },
        { id: 752, kode_unik_full: '01.01.01.02.', tahun: 2026, jumlah_anggaran: 30000000, sumber_dana: 'DDS' }
    ];
    const selectedRpjm = { kode_unik_full: '01.01.01.01', tahun: 2026 };
    const currentRabId = 751;
    const th = '2026';

    let totalAllocatedWithoutDoubleCount = 0;
    mockSavedRabList.forEach(rab => {
        if (String(rab.tahun) === th) {
            const rabKode = normKode(rab.kode_unik_full || rab.kode_unik);
            const curKode = normKode(selectedRpjm?.kode_unik_full || selectedRpjm?.kode_unik);
            const isSameId = (currentRabId && rab.id && String(rab.id) === String(currentRabId));
            const isSameKode = (curKode && rabKode && curKode === rabKode);

            if (isSameId || isSameKode) {
                return; // baris yang sedang diedit dilewati
            }
            totalAllocatedWithoutDoubleCount += Number(rab.jumlah_anggaran || 0);
        }
    });

    check('kegiatan yang sedang diedit dilewati dari savedRabList (hanya kegiatan lain 30jt dihitung)', totalAllocatedWithoutDoubleCount, 30000000);

    // Simulasi penambahan nominal baru setelah diedit (misal naik menjadi 55jt)
    const newJumlah = 55000000;
    const finalAllocated = totalAllocatedWithoutDoubleCount + newJumlah;
    check('total alokasi akurat (30jt + 55jt = 85jt, bukan 135jt double-count)', finalAllocated, 85000000);
}

console.log(`\n========================================`);
console.log(`  LULUS : ${pass}`);
console.log(`  GAGAL : ${fail}`);
console.log(`========================================\n`);

process.exit(fail === 0 ? 0 : 1);
