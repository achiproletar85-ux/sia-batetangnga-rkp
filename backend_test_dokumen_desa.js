const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5500';

// Data contoh yang akan kita gunakan untuk pengujian
const testData = {
    doc_code: 'TEST-01',
    tahun: 2027,
    google_docs_id: 'test-google-id',
    fields: {
        nama_kepala_desa: 'Budi Santoso',
        tanggal_sk: '2027-01-15'
    },
    tables: {
        tabel_tim_penyusun: [
            {
                no: '1',
                nama: 'Andi Wijaya',
                jabatan: 'Ketua',
                unsur: 'Pemerintah Desa'
            },
            {
                no: '2',
                nama: 'Siti Aminah',
                jabatan: 'Sekretaris',
                unsur: 'LPM'
            },
            {
                no: '3',
                nama: 'Joko Susilo',
                jabatan: 'Anggota',
                unsur: 'Tokoh Masyarakat'
            }
        ]
    }
};

async function runTest() {
    console.log('🚀 Memulai pengujian backend untuk dokumen desa (versi CommonJS)...');

    try {
        // --- Langkah 1: Menyimpan data ke backend ---
        console.log(`\n[1] Mengirim data ke POST /api/sync-document untuk tahun ${testData.tahun}...`);
        const saveResponse = await fetch(`${BASE_URL}/api/sync-document`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData)
        });

        const saveResult = await saveResponse.json();

        if (!saveResponse.ok || !saveResult.success) {
            console.error('❌ GAGAL pada langkah penyimpanan.');
            console.error('Status Code:', saveResponse.status);
            console.error('Response Body:', JSON.stringify(saveResult, null, 2));
            return;
        }

        console.log('✅ Data berhasil disimpan ke server.');
        console.log('   Pesan Server:', saveResult.message);

        // --- Langkah 2: Mengambil kembali data dari backend ---
        console.log(`\n[2] Mengambil data dari GET /api/dokumen-form-data/${testData.doc_code}/${testData.tahun}...`);
        const loadResponse = await fetch(`${BASE_URL}/api/dokumen-form-data/${testData.doc_code}/${testData.tahun}`);
        
        const loadResult = await loadResponse.json();

        if (!loadResponse.ok || !loadResult.success) {
            console.error('❌ GAGAL pada langkah pengambilan data.');
            console.error('Status Code:', loadResponse.status);
            console.error('Response Body:', JSON.stringify(loadResult, null, 2));
            return;
        }

        console.log('✅ Data berhasil diambil dari server.');

        // --- Langkah 3: Verifikasi data ---
        console.log('\n[3] Memverifikasi data tabel yang berulang...');
        
        const originalTableData = testData.tables.tabel_tim_penyusun;
        const loadedTableData = loadResult.tables?.tabel_tim_penyusun;

        if (!loadedTableData || !Array.isArray(loadedTableData)) {
            console.error('❌ VERIFIKASI GAGAL: Data tabel tidak ditemukan pada respons server.');
            console.error('   Data yang diterima:', JSON.stringify(loadResult.tables, null, 2));
            return;
        }

        // Periksa jumlah baris
        if (originalTableData.length !== loadedTableData.length) {
            console.error(`❌ VERIFIKASI GAGAL: Jumlah baris tabel tidak cocok.`);
            console.error(`   - Diharapkan: ${originalTableData.length} baris`);
            console.error(`   - Diterima:   ${loadedTableData.length} baris`);
            return;
        }
        console.log('   - Jumlah baris... OK');

        // Periksa konten setiap baris
        for (let i = 0; i < originalTableData.length; i++) {
            const originalRow = originalTableData[i];
            const loadedRow = loadedTableData[i];
            if (originalRow.nama !== loadedRow.nama || originalRow.jabatan !== loadedRow.jabatan) {
                 console.error(`❌ VERIFIKASI GAGAL: Konten baris ke-${i + 1} tidak cocok.`);
                 console.error(`   - Diharapkan:`, originalRow);
                 console.error(`   - Diterima:  `, loadedRow);
                 return;
            }
        }
        console.log('   - Konten tabel... OK');

        console.log('\n\n🎉 SELAMAT! Pengujian berhasil.');
        console.log('   Backend berhasil menyimpan dan memuat kembali data dari tabel yang berulang.');

    } catch (error) {
        console.error('\n\n🚨 Terjadi error saat menjalankan pengujian:', error.message);
        console.error('   Pastikan server backend Anda berjalan di', BASE_URL);
    }
}

runTest();
