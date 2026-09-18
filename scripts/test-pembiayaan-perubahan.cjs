#!/usr/bin/env node
/**
 * Uji otomatis fitur PEMBIAYAAN PERUBAHAN (PAK APBDes)
 *
 * Memverifikasi:
 *  1. Kepatuhan Zero-Wildcard & Kolom Eksplisit pada endpoint pembiayaan di server.js
 *  2. Arsitektur endpoint GET /api/pembiayaan dan POST /api/pembiayaan (dukungan mode MURNI & PERUBAHAN)
 *  3. Perhitungan komparasi Semula vs Menjadi (Penerimaan, Pengeluaran, Netto)
 *  4. Kontrol Tab Switcher dan elemen UI di frontend/pembiayaan.html
 *  5. Terminologi baku DEFENITIF dan sterilisasi cetak @media print
 *  6. Logika Controller, State, dan Export di frontend/pembiayaan.js
 *
 * Jalankan: node scripts/test-pembiayaan-perubahan.cjs
 */

const fs = require('fs');
const path = require('path');

let pass = 0;
let fail = 0;

function check(nama, kondisi, info = '') {
    if (kondisi) {
        pass++;
        console.log(`  ✅ ${nama}`);
    } else {
        fail++;
        console.log(`  ❌ ${nama} ${info ? `-> ${info}` : ''}`);
    }
}

const rootDir = path.resolve(__dirname, '..');
const serverPath = path.join(rootDir, 'server.js');
const pembiayaanHtmlPath = path.join(rootDir, 'frontend', 'pembiayaan.html');
const pembiayaanJsPath = path.join(rootDir, 'frontend', 'pembiayaan.js');

const serverContent = fs.readFileSync(serverPath, 'utf8');
const pembiayaanHtmlContent = fs.readFileSync(pembiayaanHtmlPath, 'utf8');
const pembiayaanJsContent = fs.readFileSync(pembiayaanJsPath, 'utf8');

console.log('\n=== UJI FITUR PEMBIAYAAN PERUBAHAN (PAK APBDes) ===\n');

// -------------------------------------------------------------
// 1. Kepatuhan Zero-Wildcard & Kolom Eksplisit
// -------------------------------------------------------------
console.log('--- 1. Kepatuhan Zero-Wildcard & Kolom Eksplisit ---');

const endpointGetMatch = serverContent.match(/app\.get\('\/api\/pembiayaan'[\s\S]*?(?=app\.\w+\(|POST \/api\/rkpdes-data|$)/);
const endpointGetStr = endpointGetMatch ? endpointGetMatch[0] : '';

const endpointPostMatch = serverContent.match(/app\.post\(\s*\[?'\/api\/pembiayaan'[\s\S]*?(?=app\.\w+\(|POST \/api\/rkpdes-data|$)/);
const endpointPostStr = endpointPostMatch ? endpointPostMatch[0] : '';

const hasWildcardGet = /\.select\(\s*['"]\*['"]\s*\)/.test(endpointGetStr);
const hasEmptySelectGet = /\.select\(\s*\)/.test(endpointGetStr);
const hasWildcardPost = /\.select\(\s*['"]\*['"]\s*\)/.test(endpointPostStr);
const hasEmptySelectPost = /\.select\(\s*\)/.test(endpointPostStr);

check('Endpoint GET /api/pembiayaan terdefinisi di server.js', !!endpointGetMatch);
check('Endpoint GET /api/pembiayaan tidak memakai wildcard select', !hasWildcardGet);
check('Endpoint GET /api/pembiayaan tidak memakai empty select', !hasEmptySelectGet);
check('Endpoint POST /api/pembiayaan terdefinisi dan mendukung alias /api/pembiayaan/save', 
    serverContent.includes("app.post(['/api/pembiayaan', '/api/pembiayaan/save']") ||
    serverContent.includes("app.post('/api/pembiayaan'")
);
check('Endpoint POST /api/pembiayaan tidak memakai wildcard select', !hasWildcardPost);
check('Endpoint POST /api/pembiayaan tidak memakai empty select', !hasEmptySelectPost);
check('PEMBIAYAAN_COLUMNS memuat kolom tipe_anggaran eksplisit', 
    serverContent.includes("'tipe_anggaran'") && serverContent.includes("PEMBIAYAAN_COLUMNS")
);

// -------------------------------------------------------------
// 2. Arsitektur Komparasi Semula vs Menjadi di Backend
// -------------------------------------------------------------
console.log('\n--- 2. Arsitektur Komparasi Semula vs Menjadi di Backend ---');

check('GET /api/pembiayaan membaca parameter tipe / tipe_anggaran', endpointGetStr.includes('tipeAnggaran'));
check('GET /api/pembiayaan mendukung cabang PERUBAHAN', endpointGetStr.includes("tipeAnggaran === 'PERUBAHAN'"));
check('GET /api/pembiayaan mengambil row MURNI sebagai baseline komparasi', 
    endpointGetStr.includes("tipe_anggaran.eq.MURNI") || endpointGetStr.includes("rowMurni")
);
check('GET /api/pembiayaan menghitung komparasi Penerimaan Pembiayaan (SILPA, Pencairan, Penjualan)', 
    endpointGetStr.includes('silpa') && endpointGetStr.includes('pencairan') && endpointGetStr.includes('penjualan')
);
check('GET /api/pembiayaan menghitung komparasi Pengeluaran Pembiayaan (Dana Cadangan & Modal BUMDes)', 
    endpointGetStr.includes('pembentukan') && endpointGetStr.includes('penyertaan')
);
check('GET /api/pembiayaan menghitung Pembiayaan Netto (Penerimaan - Pengeluaran)', 
    endpointGetStr.includes('nettoSemula') && endpointGetStr.includes('nettoMenjadi')
);
check('POST /api/pembiayaan mendukung upsert dengan conflict key tahun & tipe_anggaran', 
    endpointPostStr.includes("onConflict: ['tahun', 'tipe_anggaran']")
);

// -------------------------------------------------------------
// 3. Antarmuka Tab Control & Sterilisasi Cetak (pembiayaan.html)
// -------------------------------------------------------------
console.log('\n--- 3. Antarmuka Tab Control & Sterilisasi Cetak (pembiayaan.html) ---');

check('Tab Button Pembiayaan Asli (Murni) ada di HTML', pembiayaanHtmlContent.includes('id="tab-btn-pembiayaan-murni"'));
check('Tab Button Pembiayaan Defenitif Perubahan (PAK) ada di HTML', pembiayaanHtmlContent.includes('id="tab-btn-pembiayaan-perubahan"'));
check('Badge Status Mode Pembiayaan ada di HTML', pembiayaanHtmlContent.includes('id="pembiayaan-mode-badge"'));
check('Badge Mode Anggaran pada Modal Kelola Pembiayaan ada di HTML', pembiayaanHtmlContent.includes('id="modal-pembiayaan-tipe-badge"'));
check('Label Sumber Dana pada Modal Tambah Uraian menggunakan terminologi Defenitif', 
    pembiayaanHtmlContent.includes('Sumber Dana (Defenitif):')
);
check('Teks "Indikatif" tidak lagi muncul di pembiayaan.html', !pembiayaanHtmlContent.toLowerCase().includes('indikatif'));
check('Rule @media print menyembunyikan class .no-print secara absolut', 
    pembiayaanHtmlContent.includes('.no-print { display: none !important; }') ||
    pembiayaanHtmlContent.includes('.no-print, .no-print *')
);

// -------------------------------------------------------------
// 4. Logika Controller, State & Rendering Komparasi (pembiayaan.js)
// -------------------------------------------------------------
console.log('\n--- 4. Logika Controller, State & Rendering Komparasi (pembiayaan.js) ---');

check('Variabel currentPembiayaanMode terdefinisi di pembiayaan.js', pembiayaanJsContent.includes('currentPembiayaanMode'));
check('Fungsi switchPembiayaanMode terdefinisi di pembiayaan.js', typeof pembiayaanJsContent === 'string' && pembiayaanJsContent.includes('function switchPembiayaanMode('));
check('Fungsi renderKomparasiPembiayaanHtml terdefinisi di pembiayaan.js', pembiayaanJsContent.includes('function renderKomparasiPembiayaanHtml('));
check('Fungsi formatSelisih terdefinisi untuk format + / - mata uang', pembiayaanJsContent.includes('function formatSelisih('));
check('Fungsi formatPersen terdefinisi untuk deviasi persen', pembiayaanJsContent.includes('function formatPersen('));
check('Matriks komparasi dibungkus class no-print agar steril saat cetak/PDF', 
    pembiayaanJsContent.includes('no-print') && pembiayaanJsContent.includes('Matriks Komparasi Pembiayaan Netto Perubahan')
);
check('injectToDOM menggunakan judul dinamis DEFENITIF PERUBAHAN DESA', 
    pembiayaanJsContent.includes('DATA DAN INFORMASI TENTANG RENCANA PEMBIAYAAN DEFENITIF PERUBAHAN DESA')
);
check('injectToDOM menggunakan header kolom kedinasan Jumlah Dana Defenitif', 
    pembiayaanJsContent.includes('Jumlah Dana Defenitif')
);
check('Teks "Indikatif" tidak lagi muncul di pembiayaan.js', !pembiayaanJsContent.toLowerCase().includes('indikatif'));
check('loadPembiayaanNettoData memanggil API dengan parameter tipe', 
    pembiayaanJsContent.includes('/api/pembiayaan?tahun=') && pembiayaanJsContent.includes('&tipe=')
);
check('simpanPembiayaanForm menyertakan tipe: currentPembiayaanMode dalam payload POST', 
    pembiayaanJsContent.includes('tipe: currentPembiayaanMode')
);
check('Fungsi switchPembiayaanMode dan helper diekspos ke window', 
    pembiayaanJsContent.includes('window.switchPembiayaanMode = switchPembiayaanMode') &&
    pembiayaanJsContent.includes('window.renderKomparasiPembiayaanHtml = renderKomparasiPembiayaanHtml')
);

// -------------------------------------------------------------
// Hasil Akhir
// -------------------------------------------------------------
console.log('\n=============================================================');
console.log(`TOTAL PENGUJIAN: ${pass + fail} | LULUS: ${pass} | GAGAL: ${fail}`);
console.log('=============================================================\n');

if (fail > 0) {
    process.exit(1);
} else {
    console.log('🎉 SELURUH PENGUJIAN PEMBIAYAAN PERUBAHAN (PAK APBDes) LULUS 100%!\n');
    process.exit(0);
}
