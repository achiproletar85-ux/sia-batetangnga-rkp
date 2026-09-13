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

// 1. Cek file server.js memiliki endpoint /api/rkpdes/perubahan dan alias /perubahan
const serverCode = fs.readFileSync(path.resolve(__dirname, '..', 'server.js'), 'utf8');
assert(serverCode.includes("'/api/rkpdes/perubahan'") && serverCode.includes("'/perubahan'"), 'Endpoint /api/rkpdes/perubahan dan alias /perubahan terdaftar di server.js');
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
assert(jsCode.includes('function printRkpdesPerubahan'), 'Fungsi printRkpdesPerubahan terdefinisi mandiri');
assert(jsCode.includes('function printRkpdesMurni'), 'Fungsi printRkpdesMurni terdefinisi mandiri');
assert(htmlCode.includes('type="button" id="btn-cetak-perubahan"'), 'Tombol cetak perubahan memiliki type="button" eksplisit');
assert(jsCode.includes("e.target.closest('#btn-cetak-perubahan')"), 'Event delegation listener mendengarkan #btn-cetak-perubahan');
assert(jsCode.includes("btnCetakPerubahan.addEventListener('click'"), 'Event listener eksplisit terpasang pada btn-cetak-perubahan');

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
assert(serverCode.includes('penerima_l_menjadi: lpRtmMenjadi.l'), 'Properti penerima_l_menjadi terdaftar di server.js');
assert(serverCode.includes('penerima_p_menjadi: lpRtmMenjadi.p'), 'Properti penerima_p_menjadi terdaftar di server.js');
assert(serverCode.includes('penerima_rtm_menjadi: lpRtmMenjadi.rtm'), 'Properti penerima_rtm_menjadi terdaftar di server.js');

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
assert(jsCode.includes('item.penerima_l_menjadi = penerimaL') || jsCode.includes('item.penerima_l_menjadi = mL'), 'Auto-fallback penerima_l_menjadi terdefinisi di frontend/rkpdes.js');
assert(jsCode.includes('penerimaL =') && jsCode.includes('item.penerima_l_menjadi ?? item.penerima_l_semula'), 'Logika fallback aktif penerimaL terdefinisi di frontend/rkpdes.js');
assert(serverCode.includes('manfaat_l: matched ? matched.manfaat_l : null'), 'resolveRpjmStandar mengembalikan manfaat_l dari matchedStd di server.js');

// 5. Cek Event Delegation & Dataset Attributes untuk Tahun 2026 & Dinamis
assert(jsCode.includes('btn-edit-perubahan'), 'Class btn-edit-perubahan ada pada tombol render preview');
assert(jsCode.includes('cell-edit-manfaat'), 'Class cell-edit-manfaat ada pada sel render preview');
assert(jsCode.includes('data-item-key'), 'Atribut data-item-key ada pada elemen baris/tombol');
assert(jsCode.includes('data-kode'), 'Atribut data-kode ada pada elemen baris/tombol');
assert(jsCode.includes('data-id'), 'Atribut data-id ada pada elemen baris/tombol');
assert(jsCode.includes("e.target.closest('.btn-edit-perubahan')"), 'Event delegation document listener mendengarkan .btn-edit-perubahan');
assert(jsCode.includes("e.target.closest('.cell-edit-manfaat')"), 'Event delegation document listener mendengarkan .cell-edit-manfaat');
// 6. Cek Defensive Error Handling & Fallback Tanpa 500
assert(serverCode.includes('Query rkpdes error (fallback to rab)'), 'Query rkpdes memiliki fallback ramah tanpa throw 500 di server.js');
assert(serverCode.includes('Query rab perubahan error:'), 'Query rab perubahan memiliki logging warning tanpa throw 500 di server.js');
assert(jsCode.includes('if (!res.ok)'), 'Pemeriksaan status HTTP response eksplisit pada loadRkpdesPerubahanData di frontend/rkpdes.js');
assert(jsCode.includes('Gagal Memuat Data RKPDes Perubahan'), 'UI error banner ramah dengan tombol coba lagi terpasang di frontend/rkpdes.js');

// 7. ZERO-DEFAULT SDGs: tidak boleh ada default tebakan 'SDGs 17' / '17'
//    di backend maupun frontend, dan fitur edit SDGs harus tersedia.
console.log('\n--- ZERO-DEFAULT SDGs & FITUR EDIT ---\n');
assert(!serverCode.includes("|| '17'"), 'server.js tidak lagi memakai fallback \'|| 17\'');
assert(!serverCode.includes("'SDGs 17'"), 'server.js tidak lagi memakai hardcode \'SDGs 17\'');
assert(serverCode.includes('function cleanSdgsRaw'), 'Helper cleanSdgsRaw terdefinisi di server.js');
assert(serverCode.includes('function formatSdgsLabel'), 'Helper formatSdgsLabel terdefinisi di server.js');
assert(serverCode.includes('sdgs_semula_label') && serverCode.includes('sdgs_menjadi_label'), 'Endpoint perubahan mengekspos label sdgs_semula/sdgs_menjadi');
assert(serverCode.includes("app.put('/api/rkpdes/perubahan/sdgs'"), 'Endpoint PUT /api/rkpdes/perubahan/sdgs tersedia untuk persist');
assert(serverCode.includes('mendukung_sdgs: \'-\''), 'Fallback mapping RAB murni memakai \'-\' bukan SDGs 17');

const jsLower = jsCode;
assert(!jsLower.includes("|| 'SDGs 17'"), 'frontend rkpdes.js tidak memakai fallback \'SDGs 17\'');
assert(jsLower.includes('ZERO-DEFAULT'), 'frontend rkpdes.js menandai kebijakan ZERO-DEFAULT');
assert(jsLower.includes('function openEditSdgsModal'), 'Fungsi openEditSdgsModal terdefinisi');
assert(jsLower.includes('function saveEditSdgs'), 'Fungsi saveEditSdgs terdefinisi');
assert(jsLower.includes('function closeEditSdgsModal'), 'Fungsi closeEditSdgsModal terdefinisi');
assert(jsLower.includes('cleanSdgsDisplay'), 'Helper cleanSdgsDisplay terdefinisi (strip label SDGs)');
assert(jsLower.includes("e.target.closest('.cell-edit-sdgs')"), 'Event delegation mendengarkan sel .cell-edit-sdgs');
assert(jsLower.includes('data-sdgs-side'), 'Atribut data-sdgs-side (semula/menjadi) pada sel SDGs');
assert(jsLower.includes("'/api/rkpdes/perubahan/sdgs'"), 'saveEditSdgs mengirim ke endpoint persist database');
assert(htmlCode.includes('id="modalEditSdgs"'), 'Modal edit SDGs ada di rkpdes.html');
assert(htmlCode.includes('id="input-sdgs-semula"'), 'Input SDGs SEMULA ada di modal');
assert(htmlCode.includes('id="input-sdgs-menjadi"'), 'Input SDGs MENJADI ada di modal');
assert(jsLower.includes('__sdgs__'), 'Fallback localStorage SDGs tersedia');

// 8. FITUR EDIT RINCIAN KEGIATAN RKPDES / RAB PERUBAHAN
console.log('\n--- FITUR EDIT RINCIAN KEGIATAN RKPDES / RAB PERUBAHAN ---\n');
assert(htmlCode.includes('id="modalEditRkpPerubahan"'), 'Modal modalEditRkpPerubahan ada di rkpdes.html');
assert(htmlCode.includes('id="edit-perubahan-volume"'), 'Input Volume Menjadi ada di modal rkpdes.html');
assert(htmlCode.includes('id="edit-perubahan-biaya"'), 'Input Biaya Menjadi ada di modal rkpdes.html');
assert(htmlCode.includes('id="edit-perubahan-lokasi"'), 'Input Lokasi Menjadi ada di modal rkpdes.html');
assert(htmlCode.includes('id="edit-perubahan-sumber-biaya"'), 'Dropdown Sumber Biaya Menjadi ada di modal rkpdes.html');
assert(htmlCode.includes('copyAllFromSemulaToMenjadi()'), 'Tombol Salin Semua Nilai Semula ada di modal');
assert(htmlCode.includes('editInRabPerubahanFromModal()'), 'Tombol Buka di Modul RAB ada di modal');

assert(jsCode.includes('btn-edit-perubahan'), 'Class btn-edit-perubahan ada pada baris tabel RKPDes Perubahan');
assert(jsCode.includes('cell-edit-perubahan'), 'Class cell-edit-perubahan ada pada sel tabel RKPDes Perubahan');
assert(jsCode.includes('function openEditRkpPerubahanModal'), 'Fungsi openEditRkpPerubahanModal terdefinisi di rkpdes.js');
assert(jsCode.includes('function closeEditRkpPerubahanModal'), 'Fungsi closeEditRkpPerubahanModal terdefinisi di rkpdes.js');
assert(jsCode.includes('function copyAllFromSemulaToMenjadi'), 'Fungsi copyAllFromSemulaToMenjadi terdefinisi di rkpdes.js');
assert(jsCode.includes('function editInRabPerubahanFromModal'), 'Fungsi editInRabPerubahanFromModal terdefinisi di rkpdes.js');
assert(jsCode.includes('function saveEditRkpPerubahanItem'), 'Fungsi saveEditRkpPerubahanItem terdefinisi di rkpdes.js');
assert(jsCode.includes("e.target.closest('.btn-edit-perubahan')"), 'Event delegation mendengarkan .btn-edit-perubahan');
assert(jsCode.includes("e.target.closest('.cell-edit-perubahan')"), 'Event delegation mendengarkan .cell-edit-perubahan');

assert(serverCode.includes("app.put(['/api/rkpdes/perubahan', '/api/perubahan']"), 'Endpoint PUT /api/rkpdes/perubahan terdaftar di server.js');
assert(serverCode.includes("tipe_anggaran: 'PERUBAHAN'") || serverCode.includes('tipe_anggaran: RAB_TIPE_PERUBAHAN'), 'Persist RAB Perubahan disetel tipe_anggaran PERUBAHAN');
assert(!serverCode.includes(`from(RAB_TABLE).select('${star}')`), 'Zero-wildcard query pada RAB_TABLE');

// 9. PEMBERSIHAN ELEMEN REDUNDAN & DUPLIKAT DI TABEL RKPDES PERUBAHAN
console.log('\n--- PEMBERSIHAN ELEMEN REDUNDAN & DUPLIKAT ---\n');
const buildPerubahanMatch = jsCode.match(/function buildRkpdesPerubahanHtml\(\) \{([\s\S]*?)\nfunction /);
const buildPerubahanBody = buildPerubahanMatch ? buildPerubahanMatch[1] : '';

assert(!jsCode.includes('btn-edit-manfaat text-slate-400'), 'Tombol redundan "Manfaat" telah disingkirkan dari baris tabel RKPDes Perubahan');
assert(!jsCode.includes('pointer-events-none"><i class="fas fa-pen"></i></span>'), 'Seluruh ikon pensil duplikat telah dibersihkan dari sel tabel RKPDes Perubahan');
assert(!buildPerubahanBody.includes('btn-edit-perubahan'), 'Tombol teks [✎ Edit] inline telah dibersihkan dari baris kegiatan');
assert(!buildPerubahanBody.includes('Tetap</span>'), 'Label Tetap telah disingkirkan dari baris kegiatan');
assert(!jsCode.includes('<td class="cell-edit-sdgs'), 'Sel SDGs bersih dari interaksi per-sel yang redundan');
assert(!jsCode.includes('<td class="cell-edit-manfaat'), 'Sel Manfaat bersih dari interaksi per-sel yang redundan');
assert(!jsCode.includes('<td class="cell-edit-perubahan'), 'Sel Perubahan bersih dari interaksi per-sel yang redundan');
assert(!buildPerubahanBody.includes('kelMap'), 'Hierarki ganda kelMap telah dihilangkan dari buildRkpdesPerubahanHtml');
assert(!buildPerubahanBody.includes('fa-caret-right'), 'Baris sub-header bergaris miring duplikat (fa-caret-right) telah disingkirkan');



// 10. MODAL EDIT TERPADU SEMULA & MENJADI SERTA PERSISTENSI DATABASE
console.log('\n--- MODAL EDIT TERPADU SEMULA & MENJADI SERTA PERSISTENSI DATABASE ---\n');
assert(htmlCode.includes('id="edit-semula-volume"'), 'Input Volume Semula ada di modal rkpdes.html');
assert(htmlCode.includes('id="edit-semula-biaya"'), 'Input Biaya Semula ada di modal rkpdes.html');
assert(htmlCode.includes('id="edit-semula-lokasi"'), 'Input Lokasi Semula ada di modal rkpdes.html');
assert(htmlCode.includes('id="edit-semula-sumber-biaya"'), 'Dropdown Sumber Biaya Semula ada di modal rkpdes.html');
assert(htmlCode.includes('id="edit-semula-sdgs"'), 'Input SDGs Semula ada di modal rkpdes.html');
assert(htmlCode.includes('id="edit-semula-manfaat-l"'), 'Input Manfaat L Semula ada di modal rkpdes.html');
assert(htmlCode.includes('id="summary-semula-biaya"') && htmlCode.includes('id="summary-menjadi-biaya"'), 'Live summary badge Semula & Menjadi ada di modal');
assert(jsCode.includes('function updateModalLiveDifference'), 'Helper updateModalLiveDifference terdefinisi di rkpdes.js');
assert(jsCode.includes('edit-semula-volume') && jsCode.includes('edit-semula-biaya'), 'Pra-isi nilai Semula terpasang pada openEditRkpPerubahanModal');
assert(serverCode.includes('body.semula') && serverCode.includes('RAB_TIPE_MURNI'), 'Persistensi sisi Semula ke rab murni & rkpdes terdaftar di server.js');
assert(serverCode.includes('const RAB_PERUBAHAN_COLUMNS'), 'Konstanta RAB_PERUBAHAN_COLUMNS dengan kolom eksplisit terdaftar di server.js');

console.log('\n========================================');
console.log(`  LULUS : ${pass}`);
console.log(`  GAGAL : ${fail}`);
console.log('========================================\n');

if (fail > 0) process.exit(1);
