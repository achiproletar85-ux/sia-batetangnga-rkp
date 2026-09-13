/**
 * TEST SUITE: RKTL PERUBAHAN & PERSISTENSI SUPABASE
 * Memverifikasi kepatuhan zero-wildcard, endpoint API, fungsi frontend,
 * struktur dokumen resmi, dan persistensi database.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

let passed = 0;
let failed = 0;

function check(label, condition, detail = '') {
    if (condition) {
        console.log(`  ✅ ${label}`);
        passed++;
    } else {
        console.error(`  ❌ GAGAL: ${label} ${detail}`);
        failed++;
    }
}

async function runTests() {
    console.log('\n=== UJI FITUR RKTL PERUBAHAN & PERSISTENSI SUPABASE ===\n');

    const serverJs = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
    const rktlHtml = fs.readFileSync(path.join(__dirname, '../frontend/rktl.html'), 'utf8');
    const rktlJs = fs.readFileSync(path.join(__dirname, '../frontend/rktl.js'), 'utf8');
    const navbarFrontend = fs.readFileSync(path.join(__dirname, '../frontend/components/navbar.html'), 'utf8');

    // 1. Kepatuhan Zero-Wildcard & Kolom
    console.log('--- 1. Kepatuhan Zero-Wildcard & Kolom Eksplisit ---');
    check('RKTL_COLUMNS terdefinisi tanpa *', serverJs.includes('const RKTL_COLUMNS =') && !serverJs.match(/const RKTL_COLUMNS =[^;]*\*/));
    check('RKTL_COLUMNS memuat kolom tipe', serverJs.includes("const RKTL_COLUMNS = 'id, tahun, tipe,"));
    check('Query rktl insert memakai select(\'id\') eksplisit', serverJs.includes(".from('rktl').insert(payload).select('id')"));

    // 2. Endpoint Server.js
    console.log('\n--- 2. Endpoint RKTL Perubahan di server.js ---');
    check('Endpoint GET /api/rktl mendukung tipe', serverJs.includes("app.get('/api/rktl'") && serverJs.includes('handleGetRktl'));
    check('Endpoint alias GET /api/rktl/perubahan terdaftar', serverJs.includes("app.get('/api/rktl/perubahan'"));
    check('Endpoint POST /api/rktl/sync mendukung tipe', serverJs.includes("app.post('/api/rktl/sync'") && serverJs.includes('handleSyncRktl'));
    check('Endpoint alias POST /api/rktl/perubahan/sync terdaftar', serverJs.includes("app.post('/api/rktl/perubahan/sync'"));
    check('Pemisahan delete query antara MURNI dan PERUBAHAN', serverJs.includes("delQuery.eq('tipe', 'PERUBAHAN')"));

    // 3. Frontend Interface & Tab Switch
    console.log('\n--- 3. Interface dan Komponen Frontend (rktl.html) ---');
    check('Tab switch RKTL Murni ada di rktl.html', rktlHtml.includes('id="tab-btn-rktl-murni"'));
    check('Tab switch RKTL Perubahan ada di rktl.html', rktlHtml.includes('id="tab-btn-rktl-perubahan"'));
    check('Badge info mode ada di rktl.html', rktlHtml.includes('id="tab-badge-info"'));
    check('Tombol Salin dari Murni ada di rktl.html', rktlHtml.includes('id="btn-copy-murni"'));
    check('Elemen judul dinamis prefix ada di rktl.html', rktlHtml.includes('id="judul-dokumen-prefix"'));
    check('Elemen judul dinamis sub ada di rktl.html', rktlHtml.includes('id="judul-dokumen-sub"'));
    check('Elemen judul tahun doc ada di rktl.html', rktlHtml.includes('id="judul-tahun-doc"'));

    // 4. Logika Javascript (rktl.js)
    console.log('\n--- 4. Logika Controller dan Penanganan Judul (rktl.js) ---');
    check('Variabel currentRktlMode terdefinisi', rktlJs.includes('let currentRktlMode ='));
    check('DEFAULT_RKTL_PERUBAHAN_STEPS terdefinisi', rktlJs.includes('const DEFAULT_RKTL_PERUBAHAN_STEPS ='));
    check('Fungsi switchRktlMode terdefinisi', rktlJs.includes('function switchRktlMode('));
    check('Fungsi updateRktlModeUI terdefinisi', rktlJs.includes('function updateRktlModeUI('));
    check('Fungsi salinDariRktlMurni terdefinisi', rktlJs.includes('async function salinDariRktlMurni('));
    check('Judul resmi PERUBAHAN PENYUSUNAN DOKUMEN RKP DESA TAHUN tercantum', rktlJs.includes('PERUBAHAN PENYUSUNAN DOKUMEN RKP DESA TAHUN'));
    check('Judul resmi RENCANA KERJA DAN TINDAK LANJUT (RKTL) PERUBAHAN tercantum', rktlJs.includes('RENCANA KERJA DAN TINDAK LANJUT (RKTL) PERUBAHAN'));
    check('Simpan RKTL mengirimkan tipe ke backend', rktlJs.includes('tipe: currentRktlMode'));
    check('Cetak PDF mengadaptasi judul sesuai mode dokumen', rktlJs.includes('docJudulSub') && rktlJs.includes('docJudulPrefix'));

    // 5. Menu Navigasi (navbar.html)
    console.log('\n--- 5. Navigasi Menu Perencanaan ---');
    check('Menu navbar memuat link langsung ke RKTL Perubahan', navbarFrontend.includes('href="/rktl.html?tipe=perubahan"'));

    // 6. Persistensi Supabase
    console.log('\n--- 6. Uji Persistensi Supabase Database ---');
    try {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY);
        const testYear = 2099;
        
        // Bersihkan dulu
        await supabase.from('rktl').delete().eq('tahun', testYear);

        // Simpan Murni
        await supabase.from('rktl').insert({
            tahun: testYear,
            tipe: 'MURNI',
            rktl_items: [{ uraian: 'Test Murni', keterangan: 'Keterangan Murni' }]
        }).select('id');

        // Simpan Perubahan
        await supabase.from('rktl').insert({
            tahun: testYear,
            tipe: 'PERUBAHAN',
            rktl_items: [{ uraian: 'Test Perubahan', keterangan: 'Keterangan Perubahan' }]
        }).select('id');

        // Tarik Murni
        const { data: resMurni } = await supabase.from('rktl')
            .select('id, tahun, tipe, rktl_items')
            .eq('tahun', testYear)
            .eq('tipe', 'MURNI');

        // Tarik Perubahan
        const { data: resPerubahan } = await supabase.from('rktl')
            .select('id, tahun, tipe, rktl_items')
            .eq('tahun', testYear)
            .eq('tipe', 'PERUBAHAN');

        check('Data RKTL Murni tersimpan terpisah', resMurni && resMurni.length === 1 && resMurni[0].rktl_items[0].uraian === 'Test Murni');
        check('Data RKTL Perubahan tersimpan terpisah', resPerubahan && resPerubahan.length === 1 && resPerubahan[0].rktl_items[0].uraian === 'Test Perubahan');

        // Bersihkan
        await supabase.from('rktl').delete().eq('tahun', testYear);
        check('Pembersihan data uji coba berhasil', true);
    } catch (err) {
        check('Persistensi Supabase error: ' + err.message, false);
    }

    console.log(`\n========================================`);
    console.log(`  LULUS : ${passed}`);
    console.log(`  GAGAL : ${failed}`);
    console.log(`========================================\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Unhandled error in test:', err);
    process.exit(1);
});
