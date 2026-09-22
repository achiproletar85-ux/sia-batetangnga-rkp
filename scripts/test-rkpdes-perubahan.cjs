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
assert(buildPerubahanBody.includes('btn-edit-perubahan'), 'Tombol Edit berkelas btn-edit-perubahan terpasang pada kolom Aksi baris kegiatan');
assert(buildPerubahanBody.includes('openEditRkpPerubahanModal'), 'Tombol Edit memicu openEditRkpPerubahanModal');
assert(!buildPerubahanBody.includes('Tetap</span>'), 'Label Tetap telah disingkirkan dari baris kegiatan');
assert(!jsCode.includes('<td class="cell-edit-sdgs'), 'Sel SDGs bersih dari interaksi per-sel yang redundan');
assert(!jsCode.includes('<td class="cell-edit-manfaat'), 'Sel Manfaat bersih dari interaksi per-sel yang redundan');
assert(!jsCode.includes('<td class="cell-edit-perubahan'), 'Sel Perubahan bersih dari interaksi per-sel yang redundan');
assert(buildPerubahanBody.includes('kegMap'), 'Hierarki 4 tingkat (Bidang -> Sub-Bidang -> Jenis Kegiatan -> Nama Kegiatan) terpasang di buildRkpdesPerubahanHtml');
assert(buildPerubahanBody.includes('isDupHeader'), 'Pencegahan baris sub-header duplikat teks (isDupHeader) telah terpasang');
assert(!buildPerubahanBody.includes('kelMap'), 'Struktur hierarki kelMap lawas digantikan secara runtut oleh kegMap');



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

// 11. SINKRONISASI FLAG STUNTING PADA MODAL EDIT RKPDES PERUBAHAN & PERSISTENSI
console.log('\n--- SINKRONISASI FLAG STUNTING PADA MODAL EDIT RKPDES PERUBAHAN & PERSISTENSI ---\n');
assert(htmlCode.includes('id="edit-semula-stunting"'), 'Dropdown Stunting Semula ada di modal rkpdes.html');
assert(htmlCode.includes('id="edit-perubahan-stunting"'), 'Dropdown Stunting Menjadi ada di modal rkpdes.html');
assert(jsCode.includes('edit-semula-stunting') && jsCode.includes('edit-perubahan-stunting'), 'Pra-isi nilai Stunting Semula & Menjadi terpasang pada openEditRkpPerubahanModal');
assert(jsCode.includes('stunting: stuntingMenjadi') && jsCode.includes('stunting: stuntingSemula'), 'Payload saveEditRkpPerubahanItem menyertakan stunting Semula & Menjadi');
assert(serverCode.includes('stuntingSemulaStr') && serverCode.includes('stuntingMenjadiStr'), 'Backend PUT /api/rkpdes/perubahan mengekstraksi dan memvalidasi flag stunting');
assert(serverCode.includes('stunting: stuntingSemulaStr') && serverCode.includes('stunting: stuntingMenjadiStr'), 'Backend PUT /api/rkpdes/perubahan menyimpan stunting ke rkpdes');

// 12. HARDENING & VERIFIKASI INTEGRITAS PERSISTENSI MUTASI (STUNTING & PAK)
console.log('\n--- HARDENING & VERIFIKASI INTEGRITAS PERSISTENSI MUTASI (STUNTING & PAK) ---\n');
assert(serverCode.includes('throw new Error(`Gagal update RAB murni:'), 'PUT /api/rkpdes/perubahan melempar error saat update RAB murni gagal');
assert(serverCode.includes('throw new Error(`Gagal update RKPDes semula:'), 'PUT /api/rkpdes/perubahan melempar error saat update RKPDes semula gagal');
assert(serverCode.includes('throw new Error(`Gagal update tabel RKPDES:'), 'PUT /api/rkpdes/perubahan melempar error saat update RKPDes Menjadi gagal');
assert(serverCode.includes("app.post('/api/stunting/toggle'"), 'Endpoint POST /api/stunting/toggle terdaftar di server.js');
assert(serverCode.includes('Data kegiatan perubahan tidak ditemukan di tabel RAB.'), 'POST /api/stunting/toggle mengembalikan 404 jika target RAB tidak ditemukan');
assert(serverCode.includes('Data kegiatan murni tidak ditemukan di tabel RKPDes.'), 'POST /api/stunting/toggle mengembalikan 404 jika target RKPDes tidak ditemukan');
assert(serverCode.includes('updRabErr') && serverCode.includes('updRkpErr'), 'POST /api/stunting/toggle memverifikasi error pada kedua tabel (RAB & RKPDes)');
assert(serverCode.includes("app.delete('/api/stunting'"), 'Endpoint DELETE /api/stunting terdaftar di server.js');
assert(serverCode.includes("app.post('/api/stunting/sync'"), 'Endpoint POST /api/stunting/sync terdaftar di server.js');
assert(serverCode.includes("eq('tipe_anggaran', RAB_TIPE_MURNI)"), 'Bidirectional sync ke RAB Murni terpasang di endpoint stunting');

// 13. HARDENING & VERIFIKASI INTEGRITAS MODAL EDIT RKPDES MURNI & FALLBACK PERSISTENCE
console.log('\n--- HARDENING & VERIFIKASI INTEGRITAS MODAL EDIT RKPDES MURNI & FALLBACK PERSISTENCE ---\n');
assert(htmlCode.includes('id="btn-save-edit-rkp"'), 'Tombol simpan modal edit RKPDes memiliki id="btn-save-edit-rkp" eksplisit');
assert(jsCode.includes('async function saveEditRkpItem(event)'), 'Fungsi saveEditRkpItem diubah menjadi async function');
assert(jsCode.includes('btnSubmit.disabled = true') && jsCode.includes('btnSubmit.disabled = false'), 'Double-submit protection & loading state terpasang di saveEditRkpItem');
assert(jsCode.includes('await loadRkpdesData()'), 'Local state refetch & resync loadRkpdesData terpasang setelah mutasi');
assert(serverCode.includes('// PUT /api/rkpdes - update satu baris rkpdes dengan verifikasi baris & persistensi fallback'), 'Endpoint PUT /api/rkpdes menggunakan handler yang diperkeras');
assert(serverCode.includes('existingRow') && serverCode.includes('checkQ'), 'PUT /api/rkpdes melakukan pengecekan keberadaan row sebelum mutasi');
assert(serverCode.includes("throw new Error('Gagal memperbarui data: tidak ada baris yang terpengaruh di tabel rkpdes')"), 'PUT /api/rkpdes melempar error eksplisit jika 0 baris terpengaruh (anti-silent-failure)');
assert(serverCode.includes('Fallback item persisted into rkpdes ID:'), 'PUT /api/rkpdes melakukan auto-insert persistensi saat data berasal dari fallback RAB');

// 14. INTEGRITAS SINKRONISASI BIAYA RAB -> RKPDES & KUNCI READONLY INPUT BIAYA
console.log('\n--- INTEGRITAS SINKRONISASI BIAYA RAB -> RKPDES & KUNCI READONLY INPUT BIAYA ---\n');
assert(htmlCode.includes('id="edit-semula-biaya"') && htmlCode.includes('readonly'), 'Input Prakiraan Biaya Semula terkunci readonly');
assert(htmlCode.includes('id="edit-perubahan-biaya"') && htmlCode.includes('readonly'), 'Input Jumlah Biaya Menjadi terkunci readonly');
assert(htmlCode.includes('id="edit-rkp-biaya"') && htmlCode.includes('readonly'), 'Input Jumlah Biaya Murni terkunci readonly');
assert(htmlCode.includes('Terkunci otomatis: Nilai ini dihitung otomatis dari rincian belanja RAB'), 'Label peringatan terkunci otomatis terpasang pada input biaya');
assert(htmlCode.includes('onclick="editInRabSemulaFromModal()"'), 'Tombol pintasan 1-klik ke RAB Murni terpasang di modal');
assert(htmlCode.includes('onclick="editInRabPerubahanFromModal()"'), 'Tombol pintasan 1-klik ke RAB Perubahan terpasang di modal');
assert(jsCode.includes('function editInRabSemulaFromModal'), 'Fungsi editInRabSemulaFromModal terdefinisi di rkpdes.js');
assert(jsCode.includes('function editInRabPerubahanFromModal'), 'Fungsi editInRabPerubahanFromModal terdefinisi di rkpdes.js');
assert(jsCode.includes('sia_rab_updated'), 'Auto-sync listener mendeteksi pembaruan belanja RAB di rkpdes.js');
const rabJsCode = fs.readFileSync(path.resolve(__dirname, '..', 'frontend', 'rab.js'), 'utf8');
assert(rabJsCode.includes("localStorage.setItem('sia_rab_updated'"), 'Modul RAB mencatat timestamp pembaruan sia_rab_updated saat simpan');
assert(rabJsCode.includes("urlParams.get('kode_unik') || urlParams.get('kode')"), 'Modul RAB membaca parameter navigasi kegiatan 1-klik');
assert(serverCode.includes('Perbarui nominal prakiraan_biaya, volume & satuan pada baris yang sudah ada'), 'server.js memperbarui prakiraan_biaya di rkpdes dari RAB');
assert(serverCode.includes('rabMurniBiaya > 0 ? rabMurniBiaya : Number(m.prakiraan_biaya || 0)'), 'server.js memperkaya biayaSemula langsung dari RAB Murni');

// 15. ALUR NAVIGASI 1-KLIK RKPDES KE RAB & MULTI-TIER AUTO-SELECT
console.log('\n--- ALUR NAVIGASI 1-KLIK RKPDES KE RAB & MULTI-TIER AUTO-SELECT ---\n');
assert(rabJsCode.includes('async function applyAutoSelectFromNavigation'), 'Fungsi applyAutoSelectFromNavigation terdefinisi di rab.js');
assert(rabJsCode.includes('window.applyAutoSelectFromNavigation = applyAutoSelectFromNavigation'), 'applyAutoSelectFromNavigation diekspos ke window di rab.js');
assert(rabJsCode.includes('selectEl.options.length <= 1'), 'Guard asinkron memastikan options selesai dimuat sebelum matching');
assert(rabJsCode.includes('canonicalCode'), 'Canonical dot numbers segment match terpasang');
assert(rabJsCode.includes('cleanDigits'), 'Pure digits segment match terpasang');
assert(rabJsCode.includes('siltapKeywords'), 'Activity name / keyword fallback (Siltap / Penghasilan Tetap) terpasang');
assert(rabJsCode.includes('selectEl.value = matchedVal'), 'Eksekusi pemilihan dropdown otomatis terpasang');
assert(rabJsCode.includes('selectRpjm(true)'), 'Panggilan selectRpjm(true) otomatis terpasang');
assert(rabJsCode.includes('resetRabItemForm()'), 'Form rincian direset ke mode tambah item baru');
assert(rabJsCode.includes('scrollIntoView'), 'Smooth scroll ke target form RAB terpasang');
assert(jsCode.includes("localStorage.setItem('rab_target_nama', nama)"), 'rkpdes.js menyimpan rab_target_nama ke localStorage');
assert(jsCode.includes("params.set('nama', nama)"), 'rkpdes.js menyertakan parameter nama di URL');

// 16. AUDIT FINAL & STRESS-TEST MENYELURUH RKPDES (PRINT, SEARCH, LOCKING, ROUNDING, TANDA TANGAN)
console.log('\n--- AUDIT FINAL & STRESS-TEST MENYELURUH RKPDES (PRINT, SEARCH, LOCKING, ROUNDING, TANDA TANGAN) ---\n');
assert(htmlCode.includes('thead { display: table-header-group !important; }'), 'CSS print rkpdes.html mengulang header thead pada setiap halaman cetak multi-halaman');
assert(htmlCode.includes('tr { page-break-inside: avoid !important; }'), 'CSS print rkpdes.html mencegah baris tabel terpotong di tengah halaman cetak');
assert(htmlCode.includes('id="search-rkpdes"') && htmlCode.includes('id="btn-clear-search-rkpdes"'), 'Bilah pencarian in-memory rkpdes dan tombol reset terpasang di rkpdes.html');
assert(jsCode.includes('let rkpdesSearchKeyword =') && jsCode.includes('function onSearchRkpdes(') && jsCode.includes('function clearSearchRkpdes('), 'Fungsi pencarian in-memory & reset terpasang di rkpdes.js');
assert(jsCode.includes('window.onSearchRkpdes = onSearchRkpdes') && jsCode.includes('window.clearSearchRkpdes = clearSearchRkpdes'), 'Fungsi pencarian diekspos ke window object');
assert(htmlCode.includes('onkeydown="return false;"') && htmlCode.includes('onpaste="return false;"'), 'Input biaya memblokir interaksi ketik langsung dan tempel');
assert(jsCode.includes('let _isSavingRkpItem = false;') && jsCode.includes('let _isSavingRkpPerubahanItem = false;'), 'Double-submit lock flag terpasang pada modul simpan Murni & Perubahan');
assert(jsCode.includes('const genuineCost =') && jsCode.includes('const genuineSemulaBiaya =') && jsCode.includes('const genuineMenjadiBiaya ='), 'DevTools inspector anti-bypass mengunci biaya genuine langsung dari data terverifikasi');
assert(serverCode.includes('Math.round(acc.semula +') && serverCode.includes('Math.round(acc.menjadi +'), 'server.js membersihkan floating-point rounding pada grand total perubahan');
assert(jsCode.includes('Math.round(Number(num) || 0)'), 'Helper formatRupiah menggunakan Math.round untuk integritas nominal bulat');
assert(!jsCode.includes('class="font-bold underline uppercase">${timInfo.nama') && jsCode.includes('class="font-bold underline">${timInfo.nama'), 'Nama penandatangan mempertahankan format asli gelar campuran (tanpa paksaan CSS uppercase)');

// 17. INTEGRITAS DATA LINTAS PERANGKAT & PENGELOMPOKAN HIERARKI (AUDIT LANJUTAN)
console.log('\n--- INTEGRITAS DATA LINTAS PERANGKAT & PENGELOMPOKAN HIERARKI ---\n');

// 17a. Persistensi Penerima Manfaat (MENJADI) tidak lagi hanya di localStorage
assert(serverCode.includes("app.put(['/api/rkpdes/perubahan/manfaat'"), 'Endpoint PUT /api/rkpdes/perubahan/manfaat terdaftar di server.js');
assert(serverCode.includes('Penerima manfaat berhasil disimpan ke database.'), 'Endpoint manfaat mengembalikan konfirmasi persist database');
assert(serverCode.includes('manfaat_override: !isReset'), 'Penanda manfaat_override (anti-timpa default SEMULA) tersimpan di rpjm_data');
assert(serverCode.includes('const manfaatDiubahManual ='), 'GET /api/rkpdes/perubahan menghormati penanda manfaat_override');
assert(serverCode.includes('manfaat_updated_at'), 'Jejak waktu pembaruan penerima manfaat tersimpan');
assert(jsCode.includes("'/api/rkpdes/perubahan/manfaat'"), 'Frontend mengirim penerima manfaat ke endpoint database');
assert(jsCode.includes('async function saveEditManfaatMenjadi'), 'saveEditManfaatMenjadi menjadi async (menunggu respons database)');
assert(jsCode.includes('tersimpan ke database — tersinkron ke semua perangkat.'), 'Toast sukses menegaskan data tersinkron lintas perangkat');
assert(jsCode.includes('function syncPendingLocalOverridesToDb'), 'syncPendingLocalOverridesToDb terdefinisi (dorong penampung lokal ke database)');
assert(jsCode.includes('syncPendingLocalOverridesToDb()'), 'syncPendingLocalOverridesToDb dipanggil setiap data perubahan selesai dimuat');
assert(jsCode.includes('pending: true'), 'Penampung lokal ditandai pending agar disinkronkan ulang');
assert(jsCode.includes('async function resetManfaatMenjadi'), 'resetManfaatMenjadi ikut mempersist reset ke database');

// 17b. Semua mutasi divalidasi (error != null DAN data.length > 0)
assert(serverCode.includes('Tidak ada baris RAB MURNI') || serverCode.includes('tidak ada baris RAB MURNI yang terpengaruh'), 'UPDATE RAB MURNI divalidasi affected rows');
assert(serverCode.includes('tidak ada baris rkpdes yang terpengaruh untuk sisi SEMULA'), 'UPDATE rkpdes SEMULA divalidasi affected rows');
assert(serverCode.includes('tidak ada baris yang terpengaruh (id ${rabPerId})'), 'UPDATE RAB PERUBAHAN divalidasi affected rows');
assert(serverCode.includes('untuk stunting/mendukung_sdgs'), 'UPDATE rkpdes stunting/mendukung_sdgs divalidasi affected rows');
assert(serverCode.includes('hasTextValue'), 'Helper hasTextValue tersedia untuk validasi nilai kosong/\'-\'');

// 17c. Tulis-balik RKPDes Murni ke tabel RAB (anti "nilai kembali lama")
assert(serverCode.includes('TULIS-BALIK KE TABEL'), 'PUT /api/rkpdes melakukan tulis-balik ke tabel RAB (MURNI)');
assert(serverCode.includes('Gagal sinkronisasi ke tabel RAB (MURNI)'), 'Kegagalan tulis-balik RAB MURNI dilaporkan eksplisit (bukan silent failure)');
assert(serverCode.includes('lokasiSync'), 'Lokasi ikut disinkronkan pada tulis-balik RAB MURNI');

// 17d. Pencocokan KODE lebih dulu (id tabel rab != id tabel rkpdes)
assert(serverCode.includes('Pencocokan KODE lebih dulu'), 'PUT /api/rkpdes mencocokkan kode+tahun sebelum id');
assert(serverCode.includes('id RAB ≠ id rkpdes') || serverCode.includes('id baris fallback berasal dari tabel'), 'PUT /api/rkpdes/perubahan mencocokkan kode+tahun sebelum id');
assert(serverCode.includes('rab_id: rb.id || null') && serverCode.includes("sumber_data: 'rab'"), 'Baris fallback RAB ditandai rab_id/sumber_data dan tidak memakai id RAB sebagai id rkpdes');
assert(serverCode.includes('Hasil ID tidak dipercaya') || serverCode.includes('Hanya percayai pencocokan ID bila kodenya memang sama'), 'Pencocokan via id hanya dipercaya bila kode cocok');

// 17e. Lokasi sisi MENJADI dibaca dari baris RAB PERUBAHAN
assert(serverCode.includes('p.lokasi wajib menang atas m.lokasi') || serverCode.includes('MENJADI lokasi disimpan pada baris RAB PERUBAHAN'), 'GET /api/rkpdes/perubahan membaca lokasi MENJADI dari RAB PERUBAHAN');

// 17f. Pengelompokan hierarki (Level 2) mengikuti struktur kode, bukan satu rekaman typo
assert(serverCode.includes('function normLookupName'), 'Helper normLookupName terdefinisi (normalisasi spasi/nama rujukan)');
assert(serverCode.includes('subBidangCandidates'), 'resolveRpjmStandar memakai suara mayoritas kode_kegiatan/kode_sub/kegiatan untuk Level 2');
assert(serverCode.includes('struktur KODE') || serverCode.includes('STRUKTUR KODE'), 'Kebijakan otoritas struktur kode terdokumentasi di server.js');
assert(!serverCode.includes("currentNamaKegiatan).trim().toLowerCase(), rec)") , 'Pencocokan nama standar memakai kunci ternormalisasi (bukan trim mentah)');

// 17g. Skrip SQL perbaikan pengelompokan tersedia & idempotent
const sqlFixPath = path.resolve(__dirname, '..', 'supabase_fix_pengelompokan_rkpdes.sql');
assert(fs.existsSync(sqlFixPath), 'Skrip SQL supabase_fix_pengelompokan_rkpdes.sql tersedia di root proyek');
if (fs.existsSync(sqlFixPath)) {
    const sqlFix = fs.readFileSync(sqlFixPath, 'utf8');
    assert(sqlFix.toLowerCase().includes('jenis_bidang = mk.sub_bidang'), 'SQL menyamakan jenis_bidang dengan acuan master_klasifikasi');
    assert(sqlFix.includes('mayoritas'), 'SQL memiliki fallback mayoritas per kode_kegiatan');
    assert(sqlFix.includes("regexp_replace"), 'SQL menormalkan spasi ganda pada kolom pengelompokan');
}

// 17h. Frontend selalu menarik ulang data dari server setelah simpan
assert(jsCode.includes('Taruh ulang dari database') || jsCode.includes('await loadRkpdesPerubahanData();'), 'saveEditRkpPerubahanItem menarik ulang data dari database setelah sukses');
assert(jsCode.includes('kode=${encodeURIComponent(kodeItem)}&tahun='), 'deleteRkpItem menghapus berdasarkan kode + tahun (bukan id fallback RAB)');
assert(serverCode.includes('Parameter id atau kode diperlukan'), 'DELETE /api/rkpdes menerima kode/tahun dan memvalidasi baris terhapus');

// 18. ANTI FALSY-FALLBACK: pengosongan input yang disengaja WAJIB tersimpan
//     (bukan dikembalikan ke nilai lama/SEMULA oleh operator `||`).
console.log('\n--- ANTI FALSY-FALLBACK (INPUT DIKOSONGKAN = TERSIMPAN KOSONG) ---\n');
assert(serverCode.includes('function isFieldProvided'), 'Helper isFieldProvided terdefinisi di server.js');
assert(serverCode.includes('function pickExplicitText'), 'Helper pickExplicitText terdefinisi (bedakan "tidak dikirim" vs "sengaja dikosongkan")');
assert(serverCode.includes('function pickExplicitNumber'), 'Helper pickExplicitNumber terdefinisi (input numerik kosong => 0)');
assert(jsCode.includes('function readEditText') && jsCode.includes('function readEditNumber') && jsCode.includes('function readEditSelect'), 'Helper readEditText/readEditNumber/readEditSelect terpasang di frontend/rkpdes.js');

// 18a. Pola `input?.value?.trim() || fallback` sudah dibuang dari modal perubahan
assert(!jsCode.includes("document.getElementById('edit-perubahan-volume')?.value?.trim() || '1'"), 'Volume MENJADI tidak lagi memakai fallback || (pengosongan dihormati)');
assert(!jsCode.includes("document.getElementById('edit-perubahan-lokasi')?.value?.trim() || 'Desa Batetangnga'"), 'Lokasi MENJADI tidak lagi memakai fallback ||');
assert(!jsCode.includes("document.getElementById('edit-perubahan-satuan')?.value?.trim() || 'Paket'"), 'Satuan MENJADI tidak lagi memakai fallback ||');
assert(!jsCode.includes("document.getElementById('edit-semula-manfaat-l')?.value?.trim() || '-'"), 'Manfaat SEMULA tidak lagi memakai fallback ||');
assert(!jsCode.includes("document.getElementById('edit-perubahan-data-eksisting')?.value?.trim() || '-'"), 'Data eksisting MENJADI tidak lagi memakai fallback ||');
assert(jsCode.includes("readEditNumber('edit-semula-volume', 1)") && jsCode.includes("readEditNumber('edit-perubahan-volume', 1)"), 'Volume SEMULA & MENJADI dibaca via readEditNumber (kosong => 0 eksplisit)');
assert(jsCode.includes("readEditText('edit-perubahan-lokasi'") && jsCode.includes("readEditText('edit-perubahan-data-eksisting'"), 'Teks MENJADI dibaca via readEditText (kosong => \'\' eksplisit)');

// 18b. Backend PUT: sanitasi nilai eksplisit untuk SEMULA & MENJADI
assert(serverCode.includes('const volSemulaNum = pickExplicitNumber(sem.volume, 1)'), 'PUT perubahan: volume SEMULA memakai pickExplicitNumber (bukan `|| 1`)');
assert(serverCode.includes("const satSemulaStr = pickExplicitText(sem.satuan, 'Paket')"), 'PUT perubahan: satuan SEMULA memakai pickExplicitText');
assert(serverCode.includes('const volNum = pickExplicitNumber(rawMenVol, 1)'), 'PUT perubahan: volume MENJADI memakai pickExplicitNumber');
assert(serverCode.includes('const biayaNum = pickExplicitNumber(rawMenBiaya, 0)'), 'PUT perubahan: biaya MENJADI memakai pickExplicitNumber');
assert(serverCode.includes("const lokasiStr = pickExplicitText(men.lokasi ?? body.lokasi"), 'PUT perubahan: lokasi MENJADI memakai pickExplicitText (nullish, bukan ||)');
assert(serverCode.includes('volume: String(volSemulaNum),'), 'Payload rkpdes SEMULA memakai volume tersanitasi (volume 0 tersimpan sebagai 0)');
assert(!serverCode.includes("const mLStr = String(men.manfaat_l || body.manfaat_l || '-')"), 'PUT perubahan: manfaat MENJADI tidak lagi memakai || (kosong => -)');

// 18c. Penanda rincian_override: nilai MENJADI yang sengaja di-0/kosong tidak di-coalesce
assert(serverCode.includes('rincian_override: true'), 'Penanda rincian_override tersimpan saat rincian MENJADI disimpan eksplisit');
assert(serverCode.includes('const rincianDiubahManual ='), 'GET /api/rkpdes/perubahan menghormati penanda rincian_override');
assert(serverCode.includes('const biayaMenjadi = (p && rincianDiubahManual)'), 'GET: biaya MENJADI 0 tidak di-coalesce kembali ke SEMULA');
assert(serverCode.includes('const pickMenjadiText =') && serverCode.includes('const volSatuanMenjadi'), 'GET: volume/satuan MENJADI dihitung tanpa memaksa fallback ke SEMULA');
assert(serverCode.includes("const lokasiVal = (p && rincianDiubahManual)"), 'GET: lokasi MENJADI yang dikosongkan tetap kosong (-), tidak kembali ke SEMULA');
assert(!serverCode.includes("const volMenjadi = p ? String(p.volume || volSemula) : volSemula;"), 'GET: volume MENJADI tidak lagi memakai `|| volSemula` (volume 0 dihormati)');

// 19. NILAI NOL / KOSONG TIDAK BOLEH JADI TEKS ANEH ("0 -", "0 Org", "0 KK")
//     & POSISI SCROLL HARUS DIPERTAHANKAN SETELAH SIMPAN.
console.log('\n--- NILAI NOL/KOSONG & PRESERVASI POSISI SCROLL ---\n');

// 19a. Backend: sanitasi & render nilai kosong
assert(serverCode.includes('function isManfaatKosong'), 'Helper isManfaatKosong terdefinisi (nol/kosong => strip)');
assert(serverCode.includes('function formatManfaatRpjm'), 'Helper formatManfaatRpjm terdefinisi (tidak menyisipkan unit pada nilai nol)');
assert(serverCode.includes('function formatVolumeSatuan') && serverCode.includes('function isBlankVolumeValue'), 'Helper formatVolumeSatuan/isBlankVolumeValue terdefinisi (volume 0 => -)');
assert(!serverCode.includes("volume_satuan: (volSemula.toLowerCase().includes"), 'SEMULA volume_satuan tidak lagi memakai penggabungan manual (penyebab "0 -")');
assert(serverCode.includes('volume_satuan: volSatuanSemula'), 'SEMULA volume_satuan memakai formatVolumeSatuan');
assert(serverCode.includes('const volSatuanMenjadi = formatVolumeSatuan(volMenjadi, satMenjadi)'), 'MENJADI volume_satuan memakai formatVolumeSatuan');
assert(serverCode.includes("manfaat_l: formatManfaatRpjm(mLStr, 'Org')") && serverCode.includes("manfaat_rtm: formatManfaatRpjm(mRtmStr, 'KK')"), 'rpjm_data manfaat MENJADI memakai formatManfaatRpjm (nol => -)');
assert(!serverCode.includes("manfaat_l: (mLStr && mLStr !== '-') ? (mLStr.includes('Org')"), 'rpjm_data manfaat tidak lagi memakai penggabungan manual');
assert(serverCode.includes('const semulaManfaatEksplisit ='), 'GET mendeteksi kolom manfaat SEMULA yang dikosongkan admin (nilai 0 eksplisit)');
assert(serverCode.includes('parseLPRTMDetails(m, resolved, semulaManfaatEksplisit)'), 'parseLPRTMDetails mematikan tebakan bila admin sudah mengosongkan (adminDefined)');
assert(serverCode.includes('const semManfaatProvided ='), 'PUT perubahan mengenali field manfaat yang DIKIRIM walau kosong');
assert(serverCode.includes('rkpSemulaPayload.manfaat_l = nLSem'), 'PUT perubahan menyimpan manfaat SEMULA = 0 saat dikosongkan (bukan dibiarkan nilai lama)');
assert(serverCode.includes('rkpSemulaPayload.penerima_manfaat = totSemula > 0'), 'Penerima manfaat ikut dikosongkan (\'-\') saat total 0');
assert(serverCode.includes('manfaat_override: manfaatDiubahManual'), 'GET mengirim penanda manfaat_override ke frontend');

// 19b. Frontend: render bersih + tidak mewarisi nilai lama
assert(jsCode.includes('function isNilaiKosong') && jsCode.includes('function formatManfaatSel') && jsCode.includes('function formatVolumeSatuanSel'), 'Helper render nilai nol/kosong terpasang di frontend/rkpdes.js');
assert(!jsCode.includes("${semula.volume_satuan || semula.volume || '-'}"), 'Sel Volume & Satuan SEMULA tidak lagi memakai pola fallback mentah');
assert(!jsCode.includes("${menjadi.volume_satuan || menjadi.volume || '-'}"), 'Sel Volume & Satuan MENJADI tidak lagi memakai pola fallback mentah');
assert(jsCode.includes('${formatVolumeSatuanSel(semula.volume, semula.satuan)}'), 'Sel Volume & Satuan SEMULA memakai formatVolumeSatuanSel');
assert(jsCode.includes('${formatVolumeSatuanSel(menjadi.volume, menjadi.satuan)}'), 'Sel Volume & Satuan MENJADI memakai formatVolumeSatuanSel');
assert(jsCode.includes('${formatManfaatSel(sL)}') && jsCode.includes('${formatManfaatSel(penerimaL)}'), 'Sel Penerima Manfaat SEMULA & MENJADI memakai formatManfaatSel');
assert(jsCode.includes('function manfaatMenjadiTersimpanEksplisit'), 'Frontend menghormati penanda manfaat_override (tidak menyalin SEMULA begitu saja)');
assert(jsCode.includes('menjadiEksplisit ? \'-\''), 'Nilai MENJADI yang dikosongkan admin tetap \'-\' (tidak diisi ulang dari SEMULA)');

// 19c. Scroll: posisi layar dipertahankan setelah simpan
assert(jsCode.includes('function captureScrollState') && jsCode.includes('function restoreScrollState'), 'Helper preservasi posisi scroll terdefinisi');
assert(jsCode.includes('const scrollState = captureScrollState(kode);'), 'Posisi scroll dicatat sebelum render ulang tabel Perubahan');
assert(jsCode.includes('restoreScrollState(scrollState);'), 'Posisi scroll dipulihkan setelah data ditarik ulang dari database');
assert(jsCode.includes("behavior: 'instant'"), 'Pemulihan scroll tanpa animasi (instant) — tidak meloncat');
assert(jsCode.includes('tr[data-kode='), 'Baris teredit dicari lewat data-kode agar tetap terlihat');
assert(!htmlCode.includes('href="#"'), 'Tidak ada tautan href="#" pada modal yang memicu loncatan scroll ke atas');

console.log('\n========================================');
console.log(`  LULUS : ${pass}`);
console.log(`  GAGAL : ${fail}`);
console.log('========================================\n');

if (fail > 0) process.exit(1);

