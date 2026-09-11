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

console.log(`\n========================================`);
console.log(`  LULUS : ${pass}`);
console.log(`  GAGAL : ${fail}`);
console.log(`========================================\n`);

process.exit(fail === 0 ? 0 : 1);
