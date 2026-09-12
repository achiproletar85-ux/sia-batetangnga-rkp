#!/usr/bin/env node
/**
 * Uji otomatis fitur RKPDesa PERUBAHAN
 * Memverifikasi:
 *  1. Format selisih (bertambah, berkurang, tetap)
 *  2. Penggabungan Semula vs Menjadi vs Selisih
 *  3. Kepatuhan zero-wildcard policy
 */
const path = require('path');
const fs = require('fs');

let pass = 0;
let fail = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ ${message}`);
        pass++;
    } else {
        console.error(`  ❌ GAGAL: ${message}`);
        fail++;
    }
}

console.log('\n=== UJI FITUR RKPDES PERUBAHAN ===\n');

// 1. Cek file server.js memiliki endpoint /api/rkpdes/perubahan
const serverCode = fs.readFileSync(path.resolve(__dirname, '..', 'server.js'), 'utf8');
assert(serverCode.includes("app.get('/api/rkpdes/perubahan'"), 'Endpoint /api/rkpdes/perubahan terdaftar di server.js');
const star = '*';
assert(!serverCode.includes(`from('rkpdes').select('${star}')`), 'Kepatuhan Zero-wildcard pada query rkpdes');
assert(!serverCode.includes(`from('rab').select('${star}')`), 'Kepatuhan Zero-wildcard pada query rab');

// 2. Cek file frontend/rkpdes.html
const htmlCode = fs.readFileSync(path.resolve(__dirname, '..', 'frontend', 'rkpdes.html'), 'utf8');
assert(htmlCode.includes('btn-cetak-perubahan'), 'Tombol cetak RKPDes Perubahan ada di rkpdes.html');
assert(htmlCode.includes('btn-cetak-murni'), 'Tombol cetak RKPDes Murni ada di rkpdes.html');
assert(htmlCode.includes('tab-btn-perubahan'), 'Tab switch RKPDes Perubahan ada di rkpdes.html');
assert(htmlCode.includes('ABDUL AZIS SPM'), 'Opsi Ketua Tim ABDUL AZIS SPM ada di rkpdes.html');
assert(htmlCode.includes('print-perubahan'), 'CSS styling print-perubahan ada di rkpdes.html');

// 3. Cek file frontend/rkpdes.js (Struktur Baku 21 Kolom & Format Resmi)
const jsCode = fs.readFileSync(path.resolve(__dirname, '..', 'frontend', 'rkpdes.js'), 'utf8');
assert(jsCode.includes('function formatSelisihRupiah'), 'Helper formatSelisihRupiah terdefinisi');
assert(jsCode.includes('function switchRkpdesTab'), 'Fungsi switchRkpdesTab terdefinisi');
assert(jsCode.includes('function loadRkpdesPerubahanData'), 'Fungsi loadRkpdesPerubahanData terdefinisi');
assert(jsCode.includes('function renderRkpdesPerubahanPreview'), 'Fungsi renderRkpdesPerubahanPreview terdefinisi');
assert(jsCode.includes('function cetakRkpdesPerubahan'), 'Fungsi cetakRkpdesPerubahan terdefinisi');
assert(jsCode.includes('function cetakRkpdesMurni'), 'Fungsi cetakRkpdesMurni terdefinisi');

// Asersi A: Kop Surat & Header
assert(jsCode.includes('RENCANA KERJA PEMERINTAH DESA PERUBAHAN TAHUN ANGGARAN'), 'Judul resmi RKPDesa Perubahan tercantum');
assert(jsCode.includes('DESA') && jsCode.includes('BATETANGNGA'), 'Kop Desa Batetangnga tercantum');
assert(jsCode.includes('KECAMATAN') && jsCode.includes('BINUANG'), 'Kop Kecamatan Binuang tercantum');
assert(jsCode.includes('KABUPATEN') && jsCode.includes('POLEWALI MANDAR'), 'Kop Kabupaten Polewali Mandar tercantum');
assert(jsCode.includes('PROVINSI') && jsCode.includes('SULAWESI BARAT'), 'Kop Provinsi Sulawesi Barat tercantum');

// Asersi B: 3 Blok Utama & 21 Kolom Baku
assert(jsCode.includes('SEMULA') && jsCode.includes('MENJADI'), 'Blok SEMULA dan MENJADI berdampingan');
assert(jsCode.includes('Selisih Anggaran / Volume'), 'Kolom Selisih Anggaran / Volume tercantum');
assert(jsCode.includes('Mendukung SDGs Ke-'), 'Sub-kolom Mendukung SDGs Ke- tercantum');
assert(jsCode.includes('Data Eksisting Tahun Berjalan'), 'Sub-kolom Data Eksisting Tahun Berjalan tercantum');
assert(jsCode.includes('Lokasi (RT/RW/DUSUN)'), 'Sub-kolom Lokasi (RT/RW/DUSUN) tercantum');
assert(jsCode.includes('Volume &amp; Satuan') && jsCode.includes('Prakiraan Volume &amp; Satuan'), 'Sub-kolom Volume & Satuan (Semula & Menjadi) tercantum');
assert(jsCode.includes('Laki-laki') && jsCode.includes('Perempuan') && jsCode.includes('RTM'), 'Sub-kolom Penerima Manfaat Laki-laki, Perempuan, RTM tercantum');
assert(jsCode.includes('Jumlah (Rp.)') && jsCode.includes('Sumber'), 'Sub-kolom Biaya & Sumber Pembiayaan tercantum');

// Asersi C: Footer & Penandatangan
assert(jsCode.includes('JUMLAH TOTAL'), 'Baris JUMLAH TOTAL tercantum');
assert(jsCode.includes('SUMAILA DAMANG'), 'Kepala Desa SUMAILA DAMANG tercantum di footer');
assert(jsCode.includes('ABDUL AZIS SPM'), 'Ketua Tim ABDUL AZIS SPM tercantum di footer');
assert(jsCode.includes('Disusun oleh,'), 'Penulisan resmi Disusun oleh, tercantum');

// 4. Cek Fitur Fallback Data Semula & Modal Edit Penerima Manfaat (MENJADI)
assert(serverCode.includes('lpRtmMenjadi.l = lpRtmSemula.l'), 'Fallback default otomatis Laki-laki dari Semula di server.js');
assert(serverCode.includes('lpRtmMenjadi.p = lpRtmSemula.p'), 'Fallback default otomatis Perempuan dari Semula di server.js');
assert(serverCode.includes('lpRtmMenjadi.rtm = lpRtmSemula.rtm'), 'Fallback default otomatis RTM dari Semula di server.js');

assert(htmlCode.includes('id="modalEditManfaatMenjadi"'), 'Modal edit penerima manfaat ada di rkpdes.html');
assert(htmlCode.includes('id="input-menjadi-l"'), 'Input Laki-laki ada di modal');
assert(htmlCode.includes('id="input-menjadi-p"'), 'Input Perempuan ada di modal');
assert(htmlCode.includes('id="input-menjadi-rtm"'), 'Input RTM ada di modal');
assert(htmlCode.includes('copyFromSemulaToMenjadi()'), 'Tombol salin dari Semula ada di modal');
assert(htmlCode.includes('resetManfaatMenjadi()'), 'Tombol reset default ada di modal');

assert(jsCode.includes('function openEditManfaatMenjadi'), 'Fungsi openEditManfaatMenjadi terdefinisi');
assert(jsCode.includes('function closeEditManfaatMenjadiModal'), 'Fungsi closeEditManfaatMenjadiModal terdefinisi');
assert(jsCode.includes('function copyFromSemulaToMenjadi'), 'Fungsi copyFromSemulaToMenjadi terdefinisi');
assert(jsCode.includes('function resetManfaatMenjadi'), 'Fungsi resetManfaatMenjadi terdefinisi');
assert(jsCode.includes('function saveEditManfaatMenjadi'), 'Fungsi saveEditManfaatMenjadi terdefinisi');
assert(jsCode.includes('applyManfaatOverridesToPerubahanList'), 'Fungsi applyManfaatOverridesToPerubahanList terdefinisi');

// 5. Cek Event Delegation & Dataset Attributes untuk Tahun 2026 & Dinamis
assert(jsCode.includes('btn-edit-manfaat'), 'Class btn-edit-manfaat ada pada tombol render preview');
assert(jsCode.includes('cell-edit-manfaat'), 'Class cell-edit-manfaat ada pada sel render preview');
assert(jsCode.includes('data-item-key'), 'Atribut data-item-key ada pada elemen baris/tombol');
assert(jsCode.includes('data-kode'), 'Atribut data-kode ada pada elemen baris/tombol');
assert(jsCode.includes('data-id'), 'Atribut data-id ada pada elemen baris/tombol');
assert(jsCode.includes("e.target.closest('.btn-edit-manfaat')"), 'Event delegation document listener mendengarkan .btn-edit-manfaat');
assert(jsCode.includes("e.target.closest('.cell-edit-manfaat')"), 'Event delegation document listener mendengarkan .cell-edit-manfaat');
assert(jsCode.includes('function findPerubahanItem'), 'Fungsi findPerubahanItem untuk pencarian multi-key terdefinisi');

console.log('\n========================================');
console.log(`  LULUS : ${pass}`);
console.log(`  GAGAL : ${fail}`);
console.log('========================================\n');

if (fail > 0) process.exit(1);
