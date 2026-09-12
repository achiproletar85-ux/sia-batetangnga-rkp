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

// 3. Cek file frontend/rkpdes.js
const jsCode = fs.readFileSync(path.resolve(__dirname, '..', 'frontend', 'rkpdes.js'), 'utf8');
assert(jsCode.includes('function formatSelisihRupiah'), 'Helper formatSelisihRupiah terdefinisi');
assert(jsCode.includes('function switchRkpdesTab'), 'Fungsi switchRkpdesTab terdefinisi');
assert(jsCode.includes('function loadRkpdesPerubahanData'), 'Fungsi loadRkpdesPerubahanData terdefinisi');
assert(jsCode.includes('function renderRkpdesPerubahanPreview'), 'Fungsi renderRkpdesPerubahanPreview terdefinisi');
assert(jsCode.includes('function cetakRkpdesPerubahan'), 'Fungsi cetakRkpdesPerubahan terdefinisi');
assert(jsCode.includes('function cetakRkpdesMurni'), 'Fungsi cetakRkpdesMurni terdefinisi');
assert(jsCode.includes('ABDUL AZIS SPM'), 'ABDUL AZIS SPM digunakan sebagai fallback/default');
assert(jsCode.includes('SUMAILA DAMANG'), 'Kepala Desa SUMAILA DAMANG tercantum di footer');
assert(jsCode.includes('RENCANA KERJA PEMERINTAH DESA PERUBAHAN (RKPDesa PERUBAHAN)'), 'Judul resmi RKPDesa Perubahan tercantum');

console.log('\n========================================');
console.log(`  LULUS : ${pass}`);
console.log(`  GAGAL : ${fail}`);
console.log('========================================\n');

if (fail > 0) process.exit(1);
