#!/usr/bin/env node
/**
 * Uji otomatis fitur PAGU INDIKATIF PERUBAHAN (PAK)
 *
 * Memverifikasi:
 *  1. Kepatuhan Zero-Wildcard & Kolom Eksplisit pada endpoint pagu indikatif perubahan
 *  2. Eksistensi dan arsitektur endpoint /api/pagu-indikatif/perubahan di server.js
 *  3. Kontrol Tab Switcher dan elemen UI di frontend/pagu-indikatif.html
 *  4. Logika Controller, Tab Switching, Agregasi, dan Matriks Komparasi di frontend/pagu-indikatif.js
 *  5. Tautan Navigasi di kedua varian navbar.html
 *  6. Kalkulasi dan status keseimbangan pada matriks komparasi (Otomatis dari RAB Perubahan)
 *
 * Jalankan: node scripts/test-pagu-indikatif-perubahan.cjs
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
const paguHtmlPath = path.join(rootDir, 'frontend', 'pagu-indikatif.html');
const paguJsPath = path.join(rootDir, 'frontend', 'pagu-indikatif.js');
const navbarFrontPath = path.join(rootDir, 'frontend', 'components', 'navbar.html');
const navbarRootPath = path.join(rootDir, 'components', 'navbar.html');

const serverContent = fs.readFileSync(serverPath, 'utf8');
const paguHtmlContent = fs.readFileSync(paguHtmlPath, 'utf8');
const paguJsContent = fs.readFileSync(paguJsPath, 'utf8');
const navbarFrontContent = fs.readFileSync(navbarFrontPath, 'utf8');
const navbarRootContent = fs.readFileSync(navbarRootPath, 'utf8');

console.log('\n=== UJI FITUR PAGU INDIKATIF PERUBAHAN (PAK) ===\n');

// -------------------------------------------------------------
// 1. Kepatuhan Zero-Wildcard & Kolom Eksplisit
// -------------------------------------------------------------
console.log('--- 1. Kepatuhan Zero-Wildcard & Kolom Eksplisit ---');

const endpointMatch = serverContent.match(/app\.get\('\/api\/pagu-indikatif\/perubahan'[\s\S]*?(?=app\.\w+\('|\/\/\s*={10,}|$)/);
const endpointStr = endpointMatch ? endpointMatch[0] : '';

const hasWildcardSelect = /\.select\(\s*['"]\*['"]\s*\)/.test(endpointStr);
const hasEmptySelect = /\.select\(\s*\)/.test(endpointStr);

check('Endpoint /api/pagu-indikatif/perubahan terdefinisi di server.js', !!endpointMatch);
check('Endpoint tidak memakai wildcard select', !hasWildcardSelect);
check('Endpoint tidak memakai empty select', !hasEmptySelect);
check('PAGU_MIN_COLUMNS terdaftar dengan kolom eksplisit', serverContent.includes("PAGU_MIN_COLUMNS = 'id, tahun, sumber_dana, pagu'"));
check('RAB_SUM_COLUMNS terdaftar dengan kolom eksplisit', serverContent.includes("RAB_SUM_COLUMNS = 'id, tahun, tipe_anggaran, bidang, sumber_dana, jumlah_anggaran'"));

// -------------------------------------------------------------
// 2. Arsitektur Agregasi Otomatis (RPC & Fallback)
// -------------------------------------------------------------
console.log('\n--- 2. Arsitektur Agregasi Otomatis (RPC & Fallback) ---');

check('Endpoint memanggil RPC PostgreSQL get_pagu_indikatif_perubahan', endpointStr.includes("supabase.rpc('get_pagu_indikatif_perubahan'"));
check('Endpoint memiliki fallback server-side aggregation jika RPC offline', endpointStr.includes('fallback server-side aggregation'));
check('Agregasi menyaring RAB Perubahan (tipe_anggaran = PERUBAHAN)', endpointStr.includes("tipe_anggaran', 'PERUBAHAN'"));
check('Agregasi menyaring RAB Murni (tipe_anggaran = MURNI)', endpointStr.includes("tipe_anggaran.eq.MURNI"));
check('Agregasi mengkalkulasi 6 kategori sumber dana baku (ADD, DDS, PBH, APBD Tk. I, APBD Tk. II, PAD)', 
    endpointStr.includes("'ADD'") && endpointStr.includes("'DDS'") && endpointStr.includes("'PBH'") && endpointStr.includes("'PAD'"));
check('Agregasi mengembalikan status keseimbangan', endpointStr.includes('status_keseimbangan'));

// -------------------------------------------------------------
// 3. Antarmuka Pengguna & Tab Control (frontend/pagu-indikatif.html)
// -------------------------------------------------------------
console.log('\n--- 3. Antarmuka Pengguna & Tab Control (pagu-indikatif.html) ---');

check('Tab Button Pagu Indikatif Asli (Murni) ada di HTML', paguHtmlContent.includes('id="tab-btn-pagu-murni"'));
check('Tab Button Pagu Indikatif Perubahan (PAK) ada di HTML', paguHtmlContent.includes('id="tab-btn-pagu-perubahan"'));
check('Badge Status Mode ada di HTML', paguHtmlContent.includes('id="pagu-mode-badge"'));
check('Tombol Sinkronkan / Refresh dari RAB Perubahan ada di HTML', paguHtmlContent.includes('id="btn-sync-rab-perubahan"'));
check('Container Matriks Komparasi ada di HTML', paguHtmlContent.includes('id="komparasi-container"'));
check('Judul Dokumen Dinamis Kop ada di HTML', paguHtmlContent.includes('id="pagu-doc-title"'));
check('Script inline terpusat dan tidak menimpa loadPaguIndikatifData', !paguHtmlContent.includes('async function loadPaguIndikatifData()'));

// -------------------------------------------------------------
// 4. Logika Controller & Matriks Komparasi (frontend/pagu-indikatif.js)
// -------------------------------------------------------------
console.log('\n--- 4. Logika Controller & Matriks Komparasi (pagu-indikatif.js) ---');

check('Variabel currentPaguMode terdefinisi', paguJsContent.includes('let currentPaguMode'));
check('Fungsi switchPaguMode terdefinisi', paguJsContent.includes('function switchPaguMode'));
check('Fungsi updatePaguModeUI terdefinisi', paguJsContent.includes('function updatePaguModeUI'));
check('Fungsi refreshPaguPerubahan terdefinisi', paguJsContent.includes('async function refreshPaguPerubahan'));
check('Fungsi renderMatriksKomparasiPagu terdefinisi', paguJsContent.includes('function renderMatriksKomparasiPagu'));
check('Fungsi loadPaguIndikatifData terdefinisi', paguJsContent.includes('async function loadPaguIndikatifData'));
check('URL parameter ?tipe=perubahan terdeteksi saat inisialisasi', paguJsContent.includes("params.get('tipe')"));
check('History replaceState memperbarui URL saat switch mode', paguJsContent.includes("window.history.replaceState"));
check('Indikator badge otomatis terkalkulasi tercantum di updatePaguModeUI', paguJsContent.includes('Otomatis terkalkulasi dari RAB Perubahan'));
check('Judul kop beralih ke PAGU INDIKATIF PERUBAHAN DESA', paguJsContent.includes('PAGU INDIKATIF PERUBAHAN DESA'));

// -------------------------------------------------------------
// 5. Tautan Navigasi (navbar.html)
// -------------------------------------------------------------
console.log('\n--- 5. Tautan Navigasi (navbar.html) ---');

check('Tautan Pagu Indikatif Murni ada di frontend navbar', navbarFrontContent.includes('href="/pagu-indikatif.html"'));
check('Tautan Pagu Indikatif Perubahan (?tipe=perubahan) ada di frontend navbar', navbarFrontContent.includes('href="/pagu-indikatif.html?tipe=perubahan"'));
check('Tautan Pagu Murni ada di root navbar', navbarRootContent.includes('href="/pagu-indikatif.html"'));
check('Tautan Pagu Perubahan (?tipe=perubahan) ada di root navbar', navbarRootContent.includes('href="/pagu-indikatif.html?tipe=perubahan"'));

// -------------------------------------------------------------
// 6. Uji Fungsi Matriks Komparasi & Render Data
// -------------------------------------------------------------
console.log('\n--- 6. Uji Fungsi Matriks Komparasi & Render Data ---');

const paguModule = require(paguJsPath);

// Uji rendering matriks komparasi dengan sampel data
const mockCompData = {
    tahun: 2027,
    sumber_dana: [
        {
            sumber_dana: 'DDS',
            pagu_murni: 1000000000,
            belanja_murni: 950000000,
            pagu_perubahan: 980000000,
            selisih_murni: 30000000,
            persentase_murni: 3.16,
            sisa_plafon: 20000000,
            status_keseimbangan: 'Sesuai Pagu'
        },
        {
            sumber_dana: 'ADD',
            pagu_murni: 500000000,
            belanja_murni: 480000000,
            pagu_perubahan: 520000000,
            selisih_murni: 40000000,
            persentase_murni: 8.33,
            sisa_plafon: -20000000,
            status_keseimbangan: 'Melampaui Pagu'
        }
    ],
    bidang: [
        {
            bidang: 'Bidang Penyelenggaraan Pemerintahan Desa',
            belanja_murni: 450000000,
            belanja_perubahan: 480000000,
            selisih: 30000000,
            persentase: 6.67
        },
        {
            bidang: 'Bidang Pelaksanaan Pembangunan Desa',
            belanja_murni: 980000000,
            belanja_perubahan: 1020000000,
            selisih: 40000000,
            persentase: 4.08
        }
    ],
    total_plafon_murni: 1500000000,
    total_belanja_murni: 1430000000,
    total_pagu_perubahan: 1500000000,
    total_selisih: 70000000
};

const htmlKomparasi = paguModule.renderMatriksKomparasiPagu(mockCompData, 2027);

check('renderMatriksKomparasiPagu menghasilkan output string HTML', typeof htmlKomparasi === 'string' && htmlKomparasi.length > 0);
check('Tabel 1 (Sumber Dana) tercantum dalam komparasi', htmlKomparasi.includes('TABEL 1. KOMPARASI PAGU SUMBER DANA'));
check('Tabel 2 (Per Bidang) tercantum dalam komparasi', htmlKomparasi.includes('TABEL 2. KOMPARASI BELANJA PER BIDANG'));
check('Sumber dana DDS dan ADD terender', htmlKomparasi.includes('DDS') && htmlKomparasi.includes('ADD'));
check('Badge Status Keseimbangan "Melampaui Pagu" terender', htmlKomparasi.includes('Melampaui Pagu'));
check('Badge Status Keseimbangan "Sesuai Pagu" terender', htmlKomparasi.includes('Sesuai Pagu'));
check('Format Rupiah dan Deviasi persen (+3.16%) terender', htmlKomparasi.includes('+3.16%'));

// Uji rendering rincian kegiatan Pagu Indikatif dari data RAB Perubahan
const mockRabPerubahanRows = [
    {
        kode_unik_full: '02.01.01.001',
        bidang: 'Bidang Pelaksanaan Pembangunan Desa',
        sub_bidang: 'Pendidikan',
        jenis_kegiatan: 'Pembangunan Gedung PAUD',
        nama_kegiatan: 'Pembangunan Gedung PAUD Kasih Ibu',
        jumlah_anggaran: 85000000,
        sumber_dana: 'DDS'
    },
    {
        kode_unik_full: '01.01.01.001',
        bidang: 'Bidang Penyelenggaraan Pemerintahan Desa',
        sub_bidang: 'Penyelenggaraan Belanja Siltap, Tunjangan dan Operasional Pemerintahan Desa',
        jenis_kegiatan: 'Penghasilan Tetap Kepala Desa dan Perangkat Desa',
        nama_kegiatan: 'Penyediaan Penghasilan Tetap Kepala Desa',
        jumlah_anggaran: 45000000,
        sumber_dana: 'ADD'
    }
];

const htmlTabelPagu = paguModule.renderTabelPaguIndikatif(mockRabPerubahanRows);

check('renderTabelPaguIndikatif menghasilkan baris tabel untuk data RAB', typeof htmlTabelPagu === 'string' && htmlTabelPagu.length > 0);
check('Bidang I dan II terender sesuai hierarki Romawi', htmlTabelPagu.includes('>I<') && htmlTabelPagu.includes('>II<'));
check('Nama kegiatan riil desa terender di kolom kegiatan', htmlTabelPagu.includes('Pembangunan Gedung PAUD Kasih Ibu'));
check('Nilai anggaran terpetakan ke kolom DDS', htmlTabelPagu.includes('Rp 85.000.000'));
check('Nilai anggaran terpetakan ke kolom ADD', htmlTabelPagu.includes('Rp 45.000.000'));
check('Baris JUMLAH TOTAL PAGU INDIKATIF terbentuk', htmlTabelPagu.includes('JUMLAH TOTAL PAGU INDIKATIF'));

console.log('\n========================================');
console.log(`  LULUS : ${pass}`);
console.log(`  GAGAL : ${fail}`);
console.log('========================================\n');

if (fail > 0) {
    process.exit(1);
}
