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
const { alignRabItems, parseRabItemsSafely, rabItemJumlah, normalizeRabTipe, sortRabItems, compareKodeUnikFull, sortHierarchical, getKode, getRabGroupCode, getRabSubgroupCode, getRabItemRekening } = app.rabPerubahan;

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

console.log('\n9) Penolakan False-Positive Matching (Kasus Printer vs Kertas f4)');
{
    // Simulasi kasus Murni: Kertas f4 (Belanja Barang Perlengkapan)
    // dan Perubahan: Perbaikan Printer (Belanja Pemeliharaan) yang tidak sengaja membawa urutan_murni: 0
    const murni = [{
        group: 'Belanja Barang Perlengkapan',
        subgroup: 'Belanja Alat Tulis Kantor dan Benda Pos',
        uraian: 'Kertas f4',
        volume: 70,
        satuan: 'Rim',
        harga: 70000,
        jumlah: 4900000
    }];
    const perubahan = [{
        group: 'Belanja Pemeliharaan',
        subgroup: 'Belanja Pemeliharaan Peralatan',
        uraian: 'Perbaikan Printer',
        volume: 5,
        satuan: 'Bh',
        harga: 500000,
        jumlah: 2500000,
        urutan_murni: 0 // urutan_murni usang/keliru
    }];

    const rows = alignRabItems(murni, perubahan);
    check('jumlah baris = 2 (printer baru + kertas f4 dihapus, bukan digabung)', rows.length, 2);

    const printer = rows.find(r => r.uraian === 'Perbaikan Printer');
    check('printer adalah item baru (item_baru = true)', printer.item_baru, true);
    check('printer SEMULA bernilai bersih 0', printer.semula.jumlah, 0);
    check('printer MENJADI bernilai 2.500.000', printer.menjadi.jumlah, 2500000);
    check('printer selisih bertambah = +2.500.000', printer.selisih, 2500000);

    const kertas = rows.find(r => r.uraian === 'Kertas f4');
    check('kertas f4 adalah item dihapus (item_dihapus = true)', kertas.item_dihapus, true);
    check('kertas f4 SEMULA bernilai 4.900.000', kertas.semula.jumlah, 4900000);
    check('kertas f4 MENJADI bernilai 0', kertas.menjadi.jumlah, 0);
    check('kertas f4 selisih berkurang = -4.900.000', kertas.selisih, -4900000);
}

console.log('\n10) Pengurutan Kode Unik Hierarkis (compareKodeUnikFull & sortHierarchical)');
{
    check('01.01.01.01. < 01.01.01.02.', compareKodeUnikFull('01.01.01.01.', '01.01.01.02.') < 0, true);
    check('01.01.01.02. < 01.01.01.10. (numeric segment sort, bukan string)', compareKodeUnikFull('01.01.01.02.', '01.01.01.10.') < 0, true);
    check('prefix PEM.01.01.01.02. sama peringkat dengan 01.01.01.02.', compareKodeUnikFull('PEM.01.01.01.02.', '01.01.01.02.'), 0);
    check('01.01.01.09. < PEM.01.01.01.10.', compareKodeUnikFull('01.01.01.09.', 'PEM.01.01.01.10.') < 0, true);

    const mockActivities = [
        { kode_unik_full: '01.02.01.01.', nama: 'Kegiatan B' },
        { kode_unik_full: '01.01.01.10.', nama: 'Kegiatan A10' },
        { kode_unik_full: '01.01.01.02.', nama: 'Kegiatan A2' },
        { kode_unik_full: '01.01.01.01.', nama: 'Kegiatan A1' }
    ];
    sortHierarchical(mockActivities);
    check('sortHierarchical urutkan kode_unik_full secara ascending numerik',
        mockActivities.map(a => a.kode_unik_full),
        ['01.01.01.01.', '01.01.01.02.', '01.01.01.10.', '01.02.01.01.']
    );
}

console.log('\n11) Pengurutan Sub-Item Belanja SisKeuDes (sortRabItems)');
{
    const rawItems = [
        { group: 'Belanja Modal lainnya', subgroup: 'Belanja Modal Tumbuhan/Tanaman', uraian: 'Bibit Pohon' },
        { group: 'Penghasilan Tetap dan Tunjangan Kepala Desa', subgroup: 'Penghasilan Tetap Kepala Desa', uraian: 'Siltap Kades' },
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Alat Tulis Kantor dan Benda Pos', uraian: 'Kertas A4' },
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Alat Tulis Kantor dan Benda Pos', uraian: 'Amplop' }
    ];
    const sortedItems = sortRabItems(rawItems);
    check('item 1 adalah 5.1 (Siltap Kades)', sortedItems[0].uraian, 'Siltap Kades');
    check('item 1 memiliki no = 1', sortedItems[0].no, 1);
    check('item 2 adalah Kertas A4 (SisKeuDes dalam 5.2.1)', sortedItems[1].uraian, 'Kertas A4');
    check('item 3 adalah Amplop (dalam 5.2.1)', sortedItems[2].uraian, 'Amplop');
    check('item 4 adalah 5.3 (Bibit Pohon)', sortedItems[3].uraian, 'Bibit Pohon');
    check('item 4 memiliki no = 4', sortedItems[3].no, 4);
}

console.log('\n11b) Fitur Kustomisasi / Urutan Manual RAB Item (urutan_manual)');
{
    const manualItems = [
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Alat Tulis Kantor dan Benda Pos', uraian: 'Kertas f4', urutan_manual: 2 },
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Alat Tulis Kantor dan Benda Pos', uraian: 'Amplop', urutan_manual: 1 }
    ];
    const sortedManual = sortRabItems(manualItems);
    check('Amplop di urutan 1 karena urutan_manual = 1', sortedManual[0].uraian, 'Amplop');
    check('Amplop memiliki no = 1', sortedManual[0].no, 1);
    check('Amplop memiliki urutan_manual = 1', sortedManual[0].urutan_manual, 1);
    check('Kertas f4 di urutan 2 karena urutan_manual = 2', sortedManual[1].uraian, 'Kertas f4');
    check('Kertas f4 memiliki no = 2', sortedManual[1].no, 2);
    check('Kertas f4 memiliki urutan_manual = 2', sortedManual[1].urutan_manual, 2);
}

console.log('\n12) Pengurutan Cetak Hierarkis RAB Perubahan & Helper Universal getKode');
{
    // Uji helper universal getKode
    check('getKode membaca kode_unik_full', getKode({ kode_unik_full: '01.01.01.01.' }), '01.01.01.01.');
    check('getKode membaca fallback kode_unik', getKode({ kode_unik: '01.01.01.02.' }), '01.01.01.02.');
    check('getKode membaca fallback uraian_kode', getKode({ uraian_kode: '01.01.01.03.' }), '01.01.01.03.');
    check('getKode menerima string murni', getKode('01.01.01.04.'), '01.01.01.04.');

    // Uji compareKodeUnikFull dengan objek campuran properti
    const mixedComps = [
        { uraian_kode: '01.01.01.03.', nama_kegiatan: 'Kegiatan 3' },
        { kode_unik: '01.01.01.01.', nama_kegiatan: 'Kegiatan 1' },
        { kode_unik_full: '01.01.01.02.', nama_kegiatan: 'Kegiatan 2' },
        { kode_unik_full: '01.01.01.10.', nama_kegiatan: 'Kegiatan 10' }
    ];
    mixedComps.sort(compareKodeUnikFull);
    check('Objek dengan properti kode campuran terurut hierarkis (01 < 02 < 03 < 10)',
        mixedComps.map(c => getKode(c)),
        ['01.01.01.01.', '01.01.01.02.', '01.01.01.03.', '01.01.01.10.']
    );

    // Uji alignRabItems memastikan rincian item terurut rapi
    const murni = [
        item('Siltap Kades', 12, 'OB', 3000000, { group: 'Penghasilan Tetap dan Tunjangan Kepala Desa', subgroup: 'Penghasilan Tetap Kepala Desa', urutan: 1 }),
        item('Tunjangan Kades', 12, 'OB', 500000, { group: 'Penghasilan Tetap dan Tunjangan Kepala Desa', subgroup: 'Tunjangan Kepala Desa', urutan: 2 })
    ];
    const per = [
        item('Tunjangan Kades (Revisi)', 12, 'OB', 600000, { group: 'Penghasilan Tetap dan Tunjangan Kepala Desa', subgroup: 'Tunjangan Kepala Desa', urutan_murni: 1 }),
        item('Item Baru Operasional', 1, 'Paket', 1000000, { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Perlengkapan Alat Tulis Kantor dan Benda Pos' }),
        item('Siltap Kades', 12, 'OB', 3000000, { group: 'Penghasilan Tetap dan Tunjangan Kepala Desa', subgroup: 'Penghasilan Tetap Kepala Desa', urutan_murni: 0 })
    ];
    const aligned = alignRabItems(murni, per);
    check('aligned item 1 adalah Siltap Kades (5.1.1.01)', aligned[0].uraian, 'Siltap Kades');
    check('aligned item 2 adalah Tunjangan Kades (5.1.1.02)', aligned[1].uraian, 'Tunjangan Kades (Revisi)');
    check('aligned item 3 adalah Item Baru Operasional (5.2.1.01)', aligned[2].uraian, 'Item Baru Operasional');
}

console.log('\n13) Hierarki Kelompok & Sub-Kelompok Belanja SisKeuDes (Cetak RAB Murni & Perubahan)');
{
    // Resolusi kode rekening kelompok dan sub-kelompok
    const codeGroupPerlengkapan = getRabGroupCode('Belanja Barang Perlengkapan');
    check('Group Belanja Barang Perlengkapan -> 5.2.1', codeGroupPerlengkapan, '5.2.1');

    const codeATKPenuh = getRabSubgroupCode('Belanja Perlengkapan Alat Tulis Kantor dan Benda Pos', 'Belanja Barang Perlengkapan');
    check('Subgroup ATK versi lengkap -> 5.2.1.01', codeATKPenuh, '5.2.1.01');

    const codeATKStandar = getRabSubgroupCode('Belanja Alat Tulis Kantor dan Benda Pos', 'Belanja Barang Perlengkapan');
    check('Subgroup ATK standar SisKeuDes -> 5.2.1.01', codeATKStandar, '5.2.1.01');

    const codePerlengkapanGen = getRabSubgroupCode('Belanja Barang Perlengkapan', 'Belanja Barang Perlengkapan');
    check('Subgroup generic Belanja Barang Perlengkapan -> 5.2.1.99', codePerlengkapanGen, '5.2.1.99');

    // Uji pembanding hierarki rekening: ATK (5.2.1.01) HARUS muncul sebelum generic Perlengkapan (5.2.1.99)
    const cmpAtkVsGen = compareKodeUnikFull(codeATKStandar, codePerlengkapanGen);
    check('ATK (5.2.1.01) lebih dulu daripada generic Perlengkapan (5.2.1.99)', cmpAtkVsGen < 0, true);

    // Uji sortRabItems memastikan urutan fisik item belanja sesuai rekening SisKeuDes
    const itemsBelanja = [
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Barang Perlengkapan', uraian: 'Perlengkapan Umum Kantor' },
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Alat Tulis Kantor dan Benda Pos', uraian: 'Kertas HVS' },
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Perlengkapan Alat-alat Listrik', uraian: 'Lampu LED' },
        { group: 'Belanja Jasa Honorarium', subgroup: 'Belanja Jasa Honorarium Tim yang Melaksanakan Kegiatan', uraian: 'Honor TPK' }
    ];
    const sortedBelanja = sortRabItems(itemsBelanja);
    check('Urutan 1 adalah Kertas HVS (5.2.1.01)', sortedBelanja[0].uraian, 'Kertas HVS');
    check('Urutan 2 adalah Lampu LED (5.2.1.02)', sortedBelanja[1].uraian, 'Lampu LED');
    check('Urutan 3 adalah Perlengkapan Umum Kantor (5.2.1.99)', sortedBelanja[2].uraian, 'Perlengkapan Umum Kantor');
    check('Urutan 4 adalah Honor TPK (5.2.2.01)', sortedBelanja[3].uraian, 'Honor TPK');
}

console.log('\n14) Kunci Urutan Master RAB Murni sebagai Kerangka Utama RAB Perubahan');
{
    // Susunan asli di RAB Murni tidak alfabetis dan tidak menurut rekening:
    // 0: Z - Buku Tulis (5.2.1.01)
    // 1: A - Servis Printer (5.2.6.01)
    // 2: M - Lampu Bohlam (5.2.1.02)
    const murni = [
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Alat Tulis Kantor dan Benda Pos', uraian: 'Z - Buku Tulis', volume: 10, satuan: 'Buah', harga: 5000 },
        { group: 'Belanja Pemeliharaan', subgroup: 'Belanja Pemeliharaan Peralatan', uraian: 'A - Servis Printer', volume: 1, satuan: 'Unit', harga: 200000 },
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Perlengkapan Alat-alat Listrik', uraian: 'M - Lampu Bohlam', volume: 5, satuan: 'Buah', harga: 25000 }
    ];

    // Di draf Perubahan, item diacak urutan inputnya, 1 item dihapus, dan 2 item baru ditambahkan:
    const perubahan = [
        { group: 'Belanja Pemeliharaan', subgroup: 'Belanja Pemeliharaan Peralatan', uraian: 'A - Servis Printer (Naik)', volume: 2, satuan: 'Unit', harga: 200000, urutan_murni: 1 },
        { group: 'Belanja Modal lainnya', subgroup: 'Belanja Modal Lainnya', uraian: 'Item Tambahan 1', volume: 1, satuan: 'Paket', harga: 1000000 },
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Alat Tulis Kantor dan Benda Pos', uraian: 'Z - Buku Tulis', volume: 15, satuan: 'Buah', harga: 5000, urutan_murni: 0 },
        { group: 'Belanja Jasa Honorarium', subgroup: 'Belanja Jasa Honorarium Petugas', uraian: 'Item Tambahan 2', volume: 1, satuan: 'Orang', harga: 500000 }
    ];

    const aligned = alignRabItems(murni, perubahan);

    // 1. Total baris = 3 (master murni) + 2 (tambahan) = 5
    check('Total baris perbandingan = 5', aligned.length, 5);

    // 2. Baris 0 harus terkunci mati pada murni[0] (Z - Buku Tulis)
    check('Baris 0 terkunci pada murni[0] (Z - Buku Tulis)', aligned[0].uraian, 'Z - Buku Tulis');
    check('Baris 0 SEMULA volume = 10', aligned[0].semula.volume, 10);
    check('Baris 0 MENJADI volume = 15', aligned[0].menjadi.volume, 15);
    check('Baris 0 bukan item baru', aligned[0].item_baru, false);

    // 3. Baris 1 harus terkunci mati pada murni[1] (A - Servis Printer)
    check('Baris 1 terkunci pada murni[1] (A - Servis Printer)', aligned[1].uraian, 'A - Servis Printer (Naik)');
    check('Baris 1 SEMULA volume = 1', aligned[1].semula.volume, 1);
    check('Baris 1 MENJADI volume = 2', aligned[1].menjadi.volume, 2);

    // 4. Baris 2 harus terkunci mati pada murni[2] (M - Lampu Bohlam) walau dihapus di Perubahan
    check('Baris 2 terkunci pada murni[2] (M - Lampu Bohlam)', aligned[2].uraian, 'M - Lampu Bohlam');
    check('Baris 2 SEMULA volume = 5', aligned[2].semula.volume, 5);
    check('Baris 2 MENJADI jumlah = 0 (item dihapus)', aligned[2].menjadi.jumlah, 0);
    check('Baris 2 ditandai item_dihapus = true', aligned[2].item_dihapus, true);

    // 5. Item tambahan dari Perubahan WAJIB ditempatkan di paling bawah
    check('Baris 3 adalah Item Tambahan 1 di paling bawah master', aligned[3].uraian, 'Item Tambahan 1');
    check('Baris 3 ditandai item_baru = true', aligned[3].item_baru, true);
    check('Baris 4 adalah Item Tambahan 2 di paling bawah master', aligned[4].uraian, 'Item Tambahan 2');
    check('Baris 4 ditandai item_baru = true', aligned[4].item_baru, true);

    // 6. Nomor urut rapi 1..5
    check('Nomor urut baris 1 s/d 5 terurut rapi', aligned.map(r => r.no), [1, 2, 3, 4, 5]);
}

// ============================================================
// 15. Safe Parser JSON & Penjajaran Stringified Items
// ============================================================
console.log('\n15) Safe Parser JSON & Penjajaran Stringified Items');
{
    // Uji parseRabItemsSafely
    const arr = [{ uraian: 'Test 1' }];
    check('Array murni tetap array', parseRabItemsSafely(arr), arr);
    check('JSON string array diparse dengan benar', parseRabItemsSafely(JSON.stringify(arr)), arr);
    check('String rusak/invalid JSON fallback ke array kosong []', parseRabItemsSafely('bukan json'), []);
    check('Object non-array fallback ke array kosong []', parseRabItemsSafely('{"uraian":"obj"}'), []);
    check('null / undefined fallback ke array kosong []', parseRabItemsSafely(null), []);

    // alignRabItems dengan input stringified JSON
    const murniJson = JSON.stringify([
        { uraian: 'Kertas F4', volume: 5, satuan: 'Rim', harga: 50000, group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Alat Tulis Kantor dan Benda Pos' },
        { uraian: 'Spidol', volume: 2, satuan: 'Kotak', harga: 25000, group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Alat Tulis Kantor dan Benda Pos' }
    ]);
    const perJson = JSON.stringify([
        { uraian: 'Spidol', volume: 4, satuan: 'Kotak', harga: 25000, group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Alat Tulis Kantor dan Benda Pos' },
        { uraian: 'Kertas F4', volume: 5, satuan: 'Rim', harga: 55000, group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Alat Tulis Kantor dan Benda Pos' },
        { uraian: 'Map Arsip', volume: 10, satuan: 'Buah', harga: 5000, group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Alat Tulis Kantor dan Benda Pos' }
    ]);

    const res = alignRabItems(murniJson, perJson);
    check('Total baris dengan stringified items = 3', res.length, 3);
    check('Master item 0 tetap Kertas F4', res[0].uraian, 'Kertas F4');
    check('Master item 0 MENJADI harga terupdate', res[0].menjadi.harga, 55000);
    check('Master item 1 tetap Spidol', res[1].uraian, 'Spidol');
    check('Master item 1 MENJADI volume terupdate', res[1].menjadi.volume, 4);
    check('Item baru Map Arsip di paling bawah', res[2].uraian, 'Map Arsip');
    check('Item baru ditandai item_baru = true', res[2].item_baru, true);
}

// ============================================================
// 16. Standardisasi Urutan Raw Database: Master Skeleton Diawali Amplop (#1)
// ============================================================
console.log('\n16) Standardisasi Urutan Raw Database: Master Skeleton Diawali Amplop (#1)');
{
    // Raw items dari database tanpa nomor urut eksplisit di mana Kertas f4 masuk bersama Amplop:
    const rawMurni = [
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Alat Tulis Kantor dan Benda Pos', uraian: 'Kertas f4', volume: 70, satuan: 'Rim', harga: 70000 },
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Alat Tulis Kantor dan Benda Pos', uraian: 'Amplop', volume: 4, satuan: 'Doz', harga: 35000 },
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Alat Tulis Kantor dan Benda Pos', uraian: 'Buku Polio', volume: 12, satuan: 'Buah', harga: 45000 }
    ];

    const sortedMurni = sortRabItems(rawMurni);
    check('Kertas f4 di urutan 1 (SisKeuDes dalam 5.2.1.01)', sortedMurni[0].uraian, 'Kertas f4');
    check('Kertas f4 mendapat no = 1', sortedMurni[0].no, 1);
    check('Buku Polio di urutan 2', sortedMurni[1].uraian, 'Buku Polio');
    check('Buku Polio mendapat no = 2', sortedMurni[1].no, 2);
    check('Amplop di urutan 3', sortedMurni[2].uraian, 'Amplop');
    check('Amplop mendapat no = 3', sortedMurni[2].no, 3);

    // Di draf perubahan, urutan master murni tetap dikunci
    const per = [
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Alat Tulis Kantor dan Benda Pos', uraian: 'Kertas f4', volume: 70, satuan: 'Rim', harga: 70000 },
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Alat Tulis Kantor dan Benda Pos', uraian: 'Amplop', volume: 6, satuan: 'Doz', harga: 35000 },
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Alat Tulis Kantor dan Benda Pos', uraian: 'Buku Polio', volume: 12, satuan: 'Buah', harga: 45000 }
    ];

    const aligned = alignRabItems(sortedMurni, per);
    check('Row 0 terlock pada Kertas f4 di nomor 1', aligned[0].uraian, 'Kertas f4');
    check('Row 1 terlock pada Buku Polio di nomor 2', aligned[1].uraian, 'Buku Polio');
    check('Row 2 terlock pada Amplop di nomor 3', aligned[2].uraian, 'Amplop');
    check('Row 2 MENJADI volume Amplop = 6', aligned[2].menjadi.volume, 6);
    check('Nomor urut baris 1 s/d 3', aligned.map(r => r.no), [1, 2, 3]);
}

console.log('\n17) Penempatan Item Baru Sesuai Sub-Kelompok Rekening (Kasus Baju Batik Tidak Boleh Melompat ke Atas)');
{
    const murni = [
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Alat Tulis Kantor dan Benda Pos', uraian: 'Kertas f4', volume: 70, satuan: 'Rim', harga: 70000 },
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Alat Tulis Kantor dan Benda Pos', uraian: 'Kertas A4', volume: 20, satuan: 'Rim', harga: 65000 },
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Pakaian Dinas/Seragam/Atribut', uraian: 'Baju Keki', volume: 8, satuan: 'Pasang', harga: 650000 },
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Pakaian Dinas/Seragam/Atribut', uraian: 'Baju Seragam', volume: 13, satuan: 'Pasang', harga: 650000 }
    ];

    // Di Perubahan, admin menginput item baru "Baju Batik" di bawah Pakaian Dinas
    // dan secara tidak sengaja item tersebut memiliki urutan_murni = 1 atau uraian_murni = "Kertas f4"
    const per = [
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Alat Tulis Kantor dan Benda Pos', uraian: 'Kertas f4', volume: 70, satuan: 'Rim', harga: 70000 },
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Alat Tulis Kantor dan Benda Pos', uraian: 'Kertas A4', volume: 20, satuan: 'Rim', harga: 65000 },
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Pakaian Dinas/Seragam/Atribut', uraian: 'Baju Keki', volume: 8, satuan: 'Pasang', harga: 650000 },
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Pakaian Dinas/Seragam/Atribut', uraian: 'Baju Seragam', volume: 13, satuan: 'Pasang', harga: 650000 },
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Pakaian Dinas/Seragam/Atribut', uraian: 'Baju Batik', volume: 5, satuan: 'Pasang', harga: 450000, urutan_murni: 1, uraian_murni: 'Kertas f4' }
    ];

    const aligned = alignRabItems(murni, per);
    check('Baris 1 tetap Kertas f4 (ATK)', aligned[0].uraian, 'Kertas f4');
    check('Baris 1 subgroup adalah ATK', aligned[0].subgroup, 'Belanja Alat Tulis Kantor dan Benda Pos');
    check('Baris 2 tetap Kertas A4 (ATK)', aligned[1].uraian, 'Kertas A4');
    check('Baris 3 adalah Baju Keki (Pakaian Dinas)', aligned[2].uraian, 'Baju Keki');
    check('Baris 4 adalah Baju Seragam (Pakaian Dinas)', aligned[3].uraian, 'Baju Seragam');
    check('Baris 5 adalah Baju Batik (Pakaian Dinas, tidak melompat ke atas)', aligned[4].uraian, 'Baju Batik');
    check('Baju Batik adalah item baru', aligned[4].item_baru, true);
    check('Baju Batik SEMULA volume = 0', aligned[4].semula.volume, 0);
    check('Baju Batik MENJADI volume = 5', aligned[4].menjadi.volume, 5);
    check('Baju Batik selisih bertambah = +2.250.000', aligned[4].selisih, 2250000);
}

// ============================================================
// 18. Konsistensi Penjumlahan Total Semula & Menjadi (Zero Loss Aggregation)
// ============================================================
console.log('\n18) Konsistensi Penjumlahan Total Semula & Menjadi (Zero Loss Aggregation)');
{
    const murni = [
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Alat Tulis Kantor dan Benda Pos', uraian: 'Kertas f4', volume: 70, harga: 70000, jumlah: 4900000 },
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Alat Tulis Kantor dan Benda Pos', uraian: 'Kertas A4', volume: 20, harga: 65000, jumlah: 1300000 },
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Pakaian Dinas/Seragam/Atribut', uraian: 'Baju Keki', volume: 8, harga: 650000, jumlah: 5200000 },
        { group: 'Belanja Pemeliharaan', subgroup: 'Belanja Pemeliharaan Peralatan', uraian: 'Perbaikan StandInfografis', volume: 1, harga: 2000000, jumlah: 2000000 }
    ];

    // Di Perubahan:
    // - Kertas f4 tetap
    // - Kertas A4 dinaikkan harganya (1.300.000 -> 1.500.000)
    // - Perbaikan StandInfografis dihapus
    // - Baju Batik baru ditambahkan (2.250.000)
    const per = [
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Alat Tulis Kantor dan Benda Pos', uraian: 'Kertas f4', volume: 70, harga: 70000, jumlah: 4900000 },
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Alat Tulis Kantor dan Benda Pos', uraian: 'Kertas A4', volume: 20, harga: 75000, jumlah: 1500000 },
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Pakaian Dinas/Seragam/Atribut', uraian: 'Baju Keki', volume: 8, harga: 650000, jumlah: 5200000 },
        { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Pakaian Dinas/Seragam/Atribut', uraian: 'Baju Batik', volume: 5, harga: 450000, jumlah: 2250000, item_baru: true }
    ];

    const aligned = alignRabItems(murni, per);

    const murniExpectedTotal = murni.reduce((s, it) => s + it.jumlah, 0); // 13.400.000
    const perExpectedTotal = per.reduce((s, it) => s + it.jumlah, 0);     // 13.850.000

    const totalSemulaAggregated = aligned.reduce((s, r) => s + r.semula.jumlah, 0);
    const totalMenjadiAggregated = aligned.reduce((s, r) => s + r.menjadi.jumlah, 0);
    const totalSelisihAggregated = aligned.reduce((s, r) => s + r.selisih, 0);

    check('Total Semula hasil penjajaran = 100% total Murni asli', totalSemulaAggregated, murniExpectedTotal);
    check('Total Menjadi hasil penjajaran = 100% total Perubahan asli', totalMenjadiAggregated, perExpectedTotal);
    check('Total Selisih hasil penjajaran = Menjadi - Semula', totalSelisihAggregated, perExpectedTotal - murniExpectedTotal);
    check('Item terhapus (Perbaikan StandInfografis) tetap terhitung di Total Semula', aligned.find(r => r.uraian === 'Perbaikan StandInfografis').semula.jumlah, 2000000);
}

console.log(`\n========================================`);
console.log(`  LULUS : ${pass}`);
console.log(`  GAGAL : ${fail}`);
console.log(`========================================\n`);

process.exit(fail === 0 ? 0 : 1);


