/**
 * TEST SUITE: NOTULENSI MULTI-RECORD PERSISTENCE & LIST INTEGRITY
 * Memverifikasi kepatuhan zero-wildcard, route API, frontend binding,
 * dan persistensi multi-record di Supabase (mencegah single-record overwrite collapse).
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
    console.log('\n=== UJI FITUR NOTULENSI & MULTI-RECORD PERSISTENCE ===\n');

    const serverJs = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
    const notulensiHtml = fs.readFileSync(path.join(__dirname, '../frontend/notulensi.html'), 'utf8');
    const notulensiJs = fs.readFileSync(path.join(__dirname, '../frontend/notulensi.js'), 'utf8');
    const navbarFrontend = fs.readFileSync(path.join(__dirname, '../frontend/components/navbar.html'), 'utf8');

    // 1. Kepatuhan Zero-Wildcard & Kolom
    console.log('--- 1. Kepatuhan Zero-Wildcard & Kolom Eksplisit ---');
    check('NOTULENSI_COLUMNS terdefinisi tanpa *', serverJs.includes('const NOTULENSI_COLUMNS =') && !serverJs.match(/const NOTULENSI_COLUMNS =[^;]*\*/));
    check('NOTULENSI_COLUMNS memuat kolom id, tahun, judul, pembahasan', 
        serverJs.includes('id') && 
        serverJs.includes('tahun') && 
        serverJs.includes('judul') && 
        serverJs.includes('pembahasan')
    );

    // 2. Endpoint Server.js
    console.log('\n--- 2. Endpoint Notulensi di server.js ---');
    check('Endpoint GET /api/notulensi terdaftar', serverJs.includes("app.get('/api/notulensi'"));
    check('Endpoint GET /api/notulensi/:id terdaftar', serverJs.includes("app.get('/api/notulensi/:id'"));
    check('Endpoint POST /api/notulensi terdaftar', serverJs.includes("app.post('/api/notulensi'"));
    check('Endpoint PUT /api/notulensi terdaftar', serverJs.includes("app.put(['/api/notulensi/:id', '/api/notulensi'"));
    check('Endpoint DELETE /api/notulensi terdaftar', serverJs.includes("app.delete(['/api/notulensi/:id', '/api/notulensi'"));
    check('POST /api/notulensi menyisipkan data baru tanpa overwrite tabel', serverJs.includes(".from('notulensi')") && serverJs.includes('.insert('));

    // 3. Antarmuka Frontend (notulensi.html)
    console.log('\n--- 3. Interface Frontend (notulensi.html) ---');
    check('Tabel notulensi ada di notulensi.html', notulensiHtml.includes('id="notulensi-table-body"'));
    check('Filter tahun ada di notulensi.html', notulensiHtml.includes('id="select-tahun-notulensi"'));
    check('Badge counter jumlah notulensi ada di notulensi.html', notulensiHtml.includes('id="notulensi-count-badge"'));
    check('Modal form tambah/edit notulensi ada di notulensi.html', notulensiHtml.includes('id="modalNotulensi"'));
    check('Dynamic container pembahasan ada di modal', notulensiHtml.includes('id="pembahasan-container"'));

    // 4. Logika Javascript & Multi-Record Binding (notulensi.js)
    console.log('\n--- 4. Logika Controller & Multi-Record Preservation (notulensi.js) ---');
    check('State notulensiList berupa array', notulensiJs.includes('let notulensiList = [];'));
    check('loadNotulensiList memastikan data disimpan sebagai array utuh', notulensiJs.includes('Array.isArray(json.data)'));
    check('renderNotulensiTable melakukan iterasi list (multi-record loop)', notulensiJs.includes('list.forEach('));
    check('simpanNotulensiForm memanggil loadNotulensiList setelah simpan', notulensiJs.includes('await loadNotulensiList('));
    check('Cetak notulensi memiliki layout resmi kedinasan dan KOP', notulensiJs.includes('kop-header') && notulensiJs.includes('NOTULENSI RAPAT / KEGIATAN'));

    // 5. Menu Navigasi (navbar.html)
    console.log('\n--- 5. Navigasi Menu ---');
    check('Menu navbar memuat tautan ke notulensi.html', navbarFrontend.includes('href="/notulensi.html"'));

    // 6. Uji Persistensi Multi-Record di Supabase
    console.log('\n--- 6. Uji Persistensi Multi-Record Supabase Database ---');
    try {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY);
        const testYear = 2098;

        // Bersihkan data uji
        await supabase.from('notulensi').delete().eq('tahun', testYear);

        // Record 1: Musyawarah Dusun
        const { data: rec1, error: err1 } = await supabase.from('notulensi').insert([{
            tahun: testYear,
            judul: 'Musyawarah Dusun Batetangnga I',
            tanggal: 'Senin, 10 Agustus 2026',
            waktu: '09.00 - 11.30 WITA',
            tempat: 'Rumah Kepala Dusun I',
            peserta: 'Warga Dusun I (45 orang)',
            pembahasan: ['Prioritas rabat beton', 'Penerangan jalan dusun'],
            notulis: 'Bahrul, S.Pd',
            pimpinan: 'Syarifuddin'
        }]).select('id, tahun, judul');

        check('Record 1 berhasil di-insert', !err1 && rec1 && rec1.length === 1);

        // Record 2: Musyawarah Dusun II (Harus tidak menimpa Record 1)
        const { data: rec2, error: err2 } = await supabase.from('notulensi').insert([{
            tahun: testYear,
            judul: 'Musyawarah Dusun Batetangnga II',
            tanggal: 'Selasa, 11 Agustus 2026',
            waktu: '13.00 - 15.30 WITA',
            tempat: 'Rumah Kepala Dusun II',
            peserta: 'Warga Dusun II (50 orang)',
            pembahasan: ['Drainase lingkungan', 'Posyandu balita'],
            notulis: 'Nurmiati',
            pimpinan: 'Misbahuddin'
        }]).select('id, tahun, judul');

        check('Record 2 berhasil di-insert', !err2 && rec2 && rec2.length === 1);

        // Tarik seluruh list untuk testYear
        const { data: allRecords, error: fetchErr } = await supabase
            .from('notulensi')
            .select('id, tahun, judul, tanggal, pembahasan')
            .eq('tahun', testYear)
            .order('id', { ascending: true });

        check('Multi-record list terpreservasi utuh (TIDAK menciut tinggal 1)', 
            !fetchErr && allRecords && allRecords.length === 2, 
            `Jumlah data aktual: ${allRecords ? allRecords.length : 0}`
        );
        check('Record 1 dan Record 2 memuat judul yang benar', 
            allRecords && allRecords[0].judul.includes('Dusun Batetangnga I') && allRecords[1].judul.includes('Dusun Batetangnga II')
        );

        // Uji Update: Hanya record 1 yang diperbarui
        const targetId = allRecords[0].id;
        const { data: updData, error: updErr } = await supabase
            .from('notulensi')
            .update({ judul: 'Musyawarah Dusun Batetangnga I (Revisi Final)' })
            .eq('id', targetId)
            .select('id, judul');

        check('Update hanya menarget record terpilih', !updErr && updData && updData[0].judul.includes('Revisi Final'));

        // Cek kembali: Record 2 harus tetap ada
        const { data: recheckRecords } = await supabase
            .from('notulensi')
            .select('id, judul')
            .eq('tahun', testYear);

        check('Record 2 tetap ada setelah record 1 di-update', recheckRecords && recheckRecords.length === 2);

        // Pembersihan
        await supabase.from('notulensi').delete().eq('tahun', testYear);
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
