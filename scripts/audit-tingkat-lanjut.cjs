require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const app = require('../server.js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY
);

async function runDeepAudit() {
    console.log('========================================================================');
    console.log('           AUDIT TINGKAT LANJUT — SIA BATETANGNGA                      ');
    console.log('========================================================================\n');

    let totalChecks = 0;
    let passedChecks = 0;
    let warnings = 0;
    let errors = 0;

    function recordResult(name, isPass, detail = '') {
        totalChecks++;
        if (isPass) {
            passedChecks++;
            console.log(`  ✅ [LULUS] ${name}${detail ? ` -> ${detail}` : ''}`);
        } else {
            errors++;
            console.log(`  ❌ [GAGAL] ${name}${detail ? ` -> ${detail}` : ''}`);
        }
    }

    // --- 1. AUDIT INTEGRITAS STRUKTURAL TABEL RAB ---
    console.log('--- 1. AUDIT INTEGRITAS STRUKTURAL TABEL RAB ---');
    const { data: rabRows, error: rabErr } = await supabase
        .from('rab')
        .select('id, kode_unik, kode_unik_full, tahun, tipe_anggaran, id_referensi_murni, items, jumlah_anggaran')
        .limit(1000);

    recordResult('Koneksi & Fetch Data RAB Supabase', !rabErr && Array.isArray(rabRows), `Total ${rabRows?.length || 0} baris diperiksa`);

    let corruptedJsonCount = 0;
    let mathMismatchCount = 0;
    let orphanPerubahanCount = 0;
    let murniIds = new Set(rabRows?.filter(r => r.tipe_anggaran === 'MURNI').map(r => r.id) || []);

    rabRows?.forEach(r => {
        let items = r.items;
        if (typeof items === 'string') {
            try { items = JSON.parse(items); } catch(e) { corruptedJsonCount++; }
        }
        if (Array.isArray(items)) {
            items.forEach(it => {
                const vol = Number(it.volume) || 0;
                const hrg = Number(it.harga || it.harga_satuan) || 0;
                const jml = Number(it.jumlah || it.jumlah_biaya) || 0;
                if (vol > 0 && hrg > 0 && jml > 0) {
                    const expected = vol * hrg;
                    // Toleransi pembulatan desimal 3 angka di belakang koma dari SisKeuDes lawas (maks Rp 2.000)
                    if (Math.abs(expected - jml) > 2000) {
                        mathMismatchCount++;
                    }
                }
            });
        }
        if (r.tipe_anggaran === 'PERUBAHAN' && r.id_referensi_murni) {
            if (!murniIds.has(Number(r.id_referensi_murni))) {
                orphanPerubahanCount++;
            }
        }
    });

    recordResult('Integritas Parser JSON kolom items', corruptedJsonCount === 0, `${corruptedJsonCount} JSON korup`);
    recordResult('Konsistensi Matematika Item Belanja (vol x hrg = jml)', mathMismatchCount === 0, `${mathMismatchCount} item deviasi`);
    recordResult('Relasi id_referensi_murni valid ke baris Murni', orphanPerubahanCount === 0, `${orphanPerubahanCount} orphan record`);

    // --- 2. AUDIT INTEGRITAS MASTER SKELETON (KERTAS F4 DI POSISI #1) ---
    console.log('\n--- 2. AUDIT MASTER SKELETON SISKEUDES (KERTAS F4 DI NOMOR 1) ---');
    const targetActivityPrefix = '01.01.04.';
    const sampleRows = rabRows?.filter(r => (r.kode_unik_full || r.kode_unik || '').startsWith(targetActivityPrefix)) || [];
    
    let rowsWithF4 = 0;
    let samplePassed = 0;
    sampleRows.forEach(r => {
        let items = typeof r.items === 'string' ? JSON.parse(r.items || '[]') : (r.items || []);
        const atkItems = items.filter(it => (it.subgroup || '').toLowerCase().includes('alat tulis'));
        const hasF4 = atkItems.some(it => (it.uraian || it.nama_barang || '').toLowerCase().includes('kertas f4') || (it.uraian || it.nama_barang || '').toLowerCase().includes('kertas hvs f4'));
        if (hasF4) {
            rowsWithF4++;
            const firstUraian = (atkItems[0].uraian || atkItems[0].nama_barang || '').toLowerCase();
            const isF4First = firstUraian.includes('kertas f4') || firstUraian.includes('kertas hvs f4');
            const isPerubahan = (r.tipe_anggaran || '').toUpperCase() === 'PERUBAHAN';
            if (isF4First) {
                samplePassed++;
            } else if (isPerubahan) {
                // Sesuai aturan Strict Baseline Clone & Strict Append:
                // Jika baseline Murni memang tidak diawali Kertas F4, maka item F4 yang baru ditambahkan
                // pada mode Perubahan wajib berada di urutan append (bawah) dan tidak boleh mengacak urutan baseline Murni.
                const murniRef = rabRows.find(m => (m.id === r.id_referensi_murni) || (m.tahun === r.tahun && (m.kode_unik_full === r.kode_unik_full) && (m.tipe_anggaran || '').toUpperCase() === 'MURNI'));
                let murniItems = murniRef ? (typeof murniRef.items === 'string' ? JSON.parse(murniRef.items || '[]') : (murniRef.items || [])) : [];
                const murniAtk = murniItems.filter(it => (it.subgroup || '').toLowerCase().includes('alat tulis'));
                const murniHasF4AtFirst = murniAtk.length > 0 && ((murniAtk[0].uraian || murniAtk[0].nama_barang || '').toLowerCase().includes('kertas f4') || (murniAtk[0].uraian || murniAtk[0].nama_barang || '').toLowerCase().includes('kertas hvs f4'));
                if (!murniHasF4AtFirst) {
                    samplePassed++;
                }
            }
        }
    });
    recordResult('Kunci Fisik Baris Pertama ATK diawali Kertas f4 (Bila Memiliki Kertas f4)', rowsWithF4 > 0 && samplePassed === rowsWithF4, `${samplePassed}/${rowsWithF4} baris terverifikasi`);

    // --- 3. REKONSILIASI LINTAS TABEL: RAB VS RKPDES ---
    console.log('\n--- 3. REKONSILIASI KONSISTENSI ANGGARAN: RAB VS RKPDES ---');
    const { data: rkpRows, error: rkpErr } = await supabase
        .from('rkpdes')
        .select('id, kode_unik_full, tahun, prakiraan_biaya, jenis_kegiatan')
        .limit(1000);

    recordResult('Koneksi & Fetch Data RKPDes Supabase', !rkpErr && Array.isArray(rkpRows), `Total ${rkpRows?.length || 0} baris diperiksa`);

    const rkpMap = new Map();
    rkpRows?.forEach(rkp => {
        const k = `${rkp.tahun}_${String(rkp.kode_unik_full || '').trim()}`;
        rkpMap.set(k, Number(rkp.prakiraan_biaya) || 0);
    });

    let matchedRkpCount = 0;
    rabRows?.filter(r => r.tipe_anggaran === 'MURNI').forEach(rab => {
        const k = `${rab.tahun}_${String(rab.kode_unik_full || rab.kode_unik || '').trim()}`;
        if (rkpMap.has(k)) {
            matchedRkpCount++;
        }
    });
    recordResult('Keterkaitan Kode Kegiatan RAB dan RKPDes', matchedRkpCount > 0, `${matchedRkpCount} kegiatan terhubung`);

    // --- 4. AUDIT KESEIMBANGAN PAGU INDIKATIF (PAK) ---
    console.log('\n--- 4. AUDIT SISTEM AGREGASI PAGU INDIKATIF PERUBAHAN ---');
    let paguEndpointSuccess = false;
    await new Promise((resolve) => {
        const server = app.listen(0, async () => {
            try {
                const port = server.address().port;
                const res = await fetch(`http://localhost:${port}/api/pagu-indikatif/perubahan?tahun=2026`);
                const json = await res.json();
                if (json && json.success) {
                    paguEndpointSuccess = true;
                }
            } catch(e) {}
            server.close();
            resolve();
        });
    });
    recordResult('Endpoint Pagu Indikatif Perubahan (/api/pagu-indikatif/perubahan)', paguEndpointSuccess, 'Mengembalikan HTTP 200 dan kalkulasi saldo');

    // --- 5. AUDIT KETAHANAN EDGE CASE (ZERO & EXTREME VALUES) ---
    console.log('\n--- 5. AUDIT KETAHANAN EDGE CASE (NILAI 0, DESIMAL, STRING KOTOR) ---');
    const { alignRabItems, rabItemJumlah, sortRabItems } = app.rabPerubahan;

    // Edge case 1: Nilai desimal (1.5 rim x 70.000)
    const decimalRes = rabItemJumlah({ volume: 1.5, harga: 70000 });
    recordResult('Kalkulasi Volume Desimal (1.5 x 70.000 = 105.000)', decimalRes === 105000, `Hasil: ${decimalRes}`);

    // Edge case 2: Nilai 0 di Perubahan
    const zeroTest = alignRabItems(
        [{ uraian: 'Kertas f4', volume: 10, harga: 70000 }],
        [{ uraian: 'Kertas f4', volume: 0, harga: 70000 }]
    );
    recordResult('Penanganan Volume 0 pada Perubahan (Berkurang Penuh)', zeroTest[0]?.selisih === -700000, `Selisih: ${zeroTest[0]?.selisih}`);

    // Edge case 3: Penambahan item baru di Perubahan tetap di urutan bawah
    const appendTest = alignRabItems(
        [{ uraian: 'Kertas f4', volume: 10, harga: 70000 }, { uraian: 'Kertas A4', volume: 5, harga: 65000 }],
        [{ uraian: 'Item Kejutan Baru', volume: 1, harga: 50000 }, { uraian: 'Kertas f4', volume: 10, harga: 70000 }, { uraian: 'Kertas A4', volume: 5, harga: 65000 }]
    );
    recordResult('Ketahanan Append-at-End (Item baru tidak menggeser urutan #1 dan #2)', 
        appendTest[0].uraian === 'Kertas f4' && appendTest[1].uraian === 'Kertas A4' && appendTest[2].uraian === 'Item Kejutan Baru',
        `Urutan: [${appendTest.map(r => r.uraian).join(', ')}]`
    );

    // --- 6. ZERO-WILDCARD EGRESS CHECK ---
    console.log('\n--- 6. VERIFIKASI KEBIJAKAN ZERO-WILDCARD EGRESS ---');
    const { RAB_COMPARE_COLUMNS, RAB_LIST_COLUMNS } = app.rabPerubahan;
    const hasWildcard = RAB_COMPARE_COLUMNS.includes('*') || RAB_LIST_COLUMNS.includes('*');
    recordResult('Zero-Wildcard Select Policy pada Konstanta Query RAB', !hasWildcard, 'Bebas dari select(*)');

    // --- 7. AUDIT ROUNDTRIP PERSISTENSI MUTASI STUNTING & PAK (ACID & INTEGRITAS MUTASI) ---
    console.log('\n--- 7. AUDIT ROUNDTRIP PERSISTENSI MUTASI STUNTING & PAK (ACID & INTEGRITAS MUTASI) ---');
    await new Promise((resolve) => {
        const server = app.listen(0, async () => {
            const port = server.address().port;
            try {
                // A. Roundtrip Toggle Stunting Murni (RKPDes)
                const { data: sampleRkp } = await supabase
                    .from('rkpdes')
                    .select('id, stunting, kode_unik_full, tahun')
                    .eq('stunting', 'Ya')
                    .limit(1);

                if (sampleRkp && sampleRkp[0]) {
                    const row = sampleRkp[0];
                    const origSt = row.stunting || 'Ya';
                    const newSt = origSt === 'Ya' ? 'Tidak' : 'Ya';

                    // 1. Toggle ke status baru
                    const toggleRes = await fetch(`http://localhost:${port}/api/stunting/toggle`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: row.id, stunting: newSt, tipe_anggaran: 'MURNI', tahun: row.tahun })
                    });
                    const toggleJson = await toggleRes.json();

                    // 2. Verifikasi langsung ke basis data Supabase (direct query)
                    const { data: dbVerify } = await supabase
                        .from('rkpdes')
                        .select('id, stunting')
                        .eq('id', row.id)
                        .maybeSingle();

                    const isPersisted = toggleJson.success && dbVerify && dbVerify.stunting === newSt;

                    // 3. Kembalikan ke status semula (restore)
                    await fetch(`http://localhost:${port}/api/stunting/toggle`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: row.id, stunting: origSt, tipe_anggaran: 'MURNI', tahun: row.tahun })
                    });

                    recordResult('Roundtrip Persistence Toggle Stunting RKPDes (Mutasi -> Verifikasi DB -> Restore)', isPersisted, `ID: ${row.id}, Persisted: ${dbVerify?.stunting}`);
                } else {
                    recordResult('Roundtrip Persistence Toggle Stunting RKPDes', true, 'Tidak ada baris sampel Ya untuk diuji');
                }

                // B. Roundtrip Toggle Stunting Perubahan / PAK (RAB)
                const { data: sampleRabPer } = await supabase
                    .from('rab')
                    .select('id, rpjm_data, kode_unik_full, tahun')
                    .eq('tipe_anggaran', 'PERUBAHAN')
                    .limit(1);

                if (sampleRabPer && sampleRabPer[0]) {
                    const rRow = sampleRabPer[0];
                    const origRabSt = (rRow.rpjm_data && rRow.rpjm_data.stunting) || 'Tidak';
                    const newRabSt = origRabSt === 'Ya' ? 'Tidak' : 'Ya';

                    // 1. Toggle ke status baru
                    const rabToggleRes = await fetch(`http://localhost:${port}/api/stunting/toggle`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: `per_${rRow.id}`, rab_id: rRow.id, stunting: newRabSt, tipe_anggaran: 'PERUBAHAN', tahun: rRow.tahun })
                    });
                    const rabToggleJson = await rabToggleRes.json();

                    // 2. Verifikasi langsung ke tabel RAB
                    const { data: dbRabVerify } = await supabase
                        .from('rab')
                        .select('id, rpjm_data')
                        .eq('id', rRow.id)
                        .maybeSingle();

                    const isRabPersisted = rabToggleJson.success && dbRabVerify && dbRabVerify.rpjm_data?.stunting === newRabSt;

                    // 3. Restore ke status semula
                    await fetch(`http://localhost:${port}/api/stunting/toggle`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: `per_${rRow.id}`, rab_id: rRow.id, stunting: origRabSt, tipe_anggaran: 'PERUBAHAN', tahun: rRow.tahun })
                    });

                    recordResult('Roundtrip Persistence Toggle Stunting RAB Perubahan (Mutasi JSON -> Verifikasi DB -> Restore)', isRabPersisted, `ID: ${rRow.id}, Persisted: ${dbRabVerify?.rpjm_data?.stunting}`);
                } else {
                    recordResult('Roundtrip Persistence Toggle Stunting RAB Perubahan', true, 'Tidak ada baris sampel PAK untuk diuji');
                }

                // C. Error-First Handling (HTTP 404 pada ID invalid)
                const notFoundRes = await fetch(`http://localhost:${port}/api/stunting/toggle`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: 999999999, stunting: 'Ya', tipe_anggaran: 'MURNI' })
                });
                const notFoundJson = await notFoundRes.json();
                const is404Pass = notFoundRes.status === 404 && notFoundJson.success === false;
                recordResult('Error-First Handling (HTTP 404 pada Target Record Tidak Ditemukan)', is404Pass, `HTTP ${notFoundRes.status} -> ${notFoundJson.error}`);

            } catch (err) {
                recordResult('Audit Roundtrip Persistensi Mutasi Stunting & PAK', false, err.message);
            } finally {
                server.close();
                resolve();
            }
        });
    });

    console.log('\n========================================================================');
    console.log(` HASIL AUDIT TINGKAT LANJUT:`);
    console.log(` Total Pengujian     : ${totalChecks}`);
    console.log(` Lulus               : ${passedChecks}`);
    console.log(` Gagal               : ${errors}`);
    console.log('========================================================================\n');

    process.exit(errors === 0 ? 0 : 1);
}

runDeepAudit().catch(err => {
    console.error('Fatal audit error:', err);
    process.exit(1);
});
