#!/usr/bin/env node
/**
 * scripts/backfill_and_clone_rab_2026.cjs
 * ========================================
 * 1. Backfill relasi id_referensi_murni pada 3 baris RAB PERUBAHAN 2026 eksisting:
 *    - ID 746 -> id_referensi_murni = 96 (kode: 01.01.01.02.)
 *    - ID 747 -> id_referensi_murni = 95 (kode: 01.01.01.01.)
 *    - ID 750 -> id_referensi_murni = 748 (kode: 01.01.01.06.)
 *
 * 2. Kloning sisa 41 kegiatan dari RAB Murni 2026 ke RAB Perubahan 2026:
 *    - Menghasilkan total 44 baris PERUBAHAN 2026 (1:1 dengan 44 baris MURNI).
 *    - Melewati kegiatan yang sudah ada (skip existing, idempoten).
 *    - Menautkan id_referensi_murni pada tingkat baris maupun pada array items.
 *
 * Kepatuhan: Zero-Wildcard Egress Policy Supabase (seluruh kueri eksplisit kolom).
 */

const supabase = require('../backend/config/supabase');

async function runBackfillAndClone() {
    console.log('============================================================');
    console.log(' EKSEKUSI BACKFILL & KLONING RAB PERUBAHAN TAHUN 2026');
    console.log('============================================================\n');

    // ------------------------------------------------------------
    // LANGKAH 1: BACKFILL 3 BARIS PERUBAHAN 2026 EKSISTING
    // ------------------------------------------------------------
    console.log('--- LANGKAH 1: Backfill id_referensi_murni baris 746, 747, 750 ---');

    const backfillMap = [
        { idPerubahan: 746, idMurni: 96, kode: '01.01.01.02.' },
        { idPerubahan: 747, idMurni: 95, kode: '01.01.01.01.' },
        { idPerubahan: 750, idMurni: 748, kode: '01.01.01.06.' }
    ];

    for (const b of backfillMap) {
        // Ambil items baris perubahan untuk menautkan id_referensi_murni pada sub-item
        const { data: rowData, error: fetchErr } = await supabase
            .from('rab')
            .select('id, items, kode_unik_full')
            .eq('id', b.idPerubahan)
            .limit(1);

        if (fetchErr) {
            console.error(`❌ Gagal mengambil baris ID ${b.idPerubahan}:`, fetchErr.message);
            process.exit(1);
        }

        if (!rowData || rowData.length === 0) {
            console.warn(`⚠️ Baris ID ${b.idPerubahan} tidak ditemukan di database.`);
            continue;
        }

        const currentItems = Array.isArray(rowData[0].items) ? rowData[0].items : [];
        const updatedItems = currentItems.map((it, idx) => ({
            ...it,
            urutan_murni: it.urutan_murni !== undefined ? it.urutan_murni : idx,
            id_referensi_murni: b.idMurni
        }));

        const { error: updErr } = await supabase
            .from('rab')
            .update({
                id_referensi_murni: b.idMurni,
                items: updatedItems,
                updated_at: new Date().toISOString()
            })
            .eq('id', b.idPerubahan)
            .select('id');

        if (updErr) {
            console.error(`❌ Gagal memperbarui baris ID ${b.idPerubahan}:`, updErr.message);
            process.exit(1);
        }

        console.log(`  ✅ Baris PERUBAHAN ID ${b.idPerubahan} (${b.kode}) berhasil ditautkan ke MURNI ID ${b.idMurni}.`);
    }

    // ------------------------------------------------------------
    // LANGKAH 2: KLONING KEGIATAN MURNI 2026 KE PERUBAHAN 2026
    // ------------------------------------------------------------
    console.log('\n--- LANGKAH 2: Kloning Sisa Kegiatan Murni 2026 ke Perubahan ---');

    const cloneSelectCols = 'id, kode_unik, kode_unik_full, tahun, nama_kegiatan, uraian, bidang, status, group_nama, sub_group_nama, lokasi, lokasi_kegiatan, jenis_kegiatan, volume, satuan, harga_satuan, jumlah_anggaran, sumber_dana, items, rpjm_data, tipe_anggaran';

    // 1. Ambil semua baris MURNI 2026
    const { data: murniRows, error: murniErr } = await supabase
        .from('rab')
        .select(cloneSelectCols)
        .eq('tahun', 2026)
        .eq('tipe_anggaran', 'MURNI')
        .order('id', { ascending: true });

    if (murniErr) {
        console.error('❌ Gagal mengambil data RAB Murni 2026:', murniErr.message);
        process.exit(1);
    }

    console.log(`  📦 Total kegiatan RAB Murni 2026 ditemukan: ${murniRows.length} baris.`);

    // 2. Ambil baris PERUBAHAN 2026 yang sudah ada (untuk pencegahan duplikasi)
    const { data: existingPerubahan, error: perubErr } = await supabase
        .from('rab')
        .select('id, kode_unik_full, tipe_anggaran')
        .eq('tahun', 2026)
        .eq('tipe_anggaran', 'PERUBAHAN');

    if (perubErr) {
        console.error('❌ Gagal mengambil data RAB Perubahan 2026:', perubErr.message);
        process.exit(1);
    }

    const existingKodes = new Set(existingPerubahan.map(r => String(r.kode_unik_full || '').trim()));
    console.log(`  📦 Kegiatan PERUBAHAN 2026 yang sudah ada: ${existingPerubahan.length} baris.`);

    // 3. Saring kegiatan yang belum ada
    const toClone = murniRows.filter(m => !existingKodes.has(String(m.kode_unik_full || '').trim()));
    console.log(`  🎯 Kegiatan yang perlu dikloning: ${toClone.length} baris.`);

    if (toClone.length === 0) {
        console.log('  ℹ️ Semua kegiatan MURNI 2026 sudah memiliki pasangan PERUBAHAN. Tidak ada baris yang disalin ulang.');
    } else {
        // Ambil ID tertinggi untuk penomoran ID baru
        const { data: maxRow, error: maxErr } = await supabase
            .from('rab')
            .select('id')
            .order('id', { ascending: false })
            .limit(1);

        if (maxErr) {
            console.error('❌ Gagal mengambil MAX(id):', maxErr.message);
            process.exit(1);
        }

        let nextId = (maxRow && maxRow[0] && Number(maxRow[0].id)) ? Number(maxRow[0].id) : 1000;
        console.log(`  🔢 ID terakhir di tabel rab: ${nextId}. Penomoran baru dimulai dari ${nextId + 1}.`);

        const nowIso = new Date().toISOString();
        const newPayloads = toClone.map(m => {
            nextId += 1;
            const clonedItems = (Array.isArray(m.items) ? m.items : []).map((it, idx) => ({
                ...it,
                urutan_murni: it.urutan_murni !== undefined ? it.urutan_murni : idx,
                id_referensi_murni: m.id
            }));

            return {
                id: nextId,
                kode_unik: String(m.kode_unik || m.kode_unik_full || '').trim(),
                kode_unik_full: String(m.kode_unik_full || m.kode_unik || '').trim(),
                tahun: 2026,
                nama_kegiatan: m.nama_kegiatan || '-',
                uraian: m.uraian || m.nama_kegiatan || '-',
                bidang: m.bidang || '',
                status: 'perubahan',
                group_nama: m.group_nama || '',
                sub_group_nama: m.sub_group_nama || '',
                lokasi: m.lokasi || 'Desa Batetangnga',
                lokasi_kegiatan: m.lokasi_kegiatan || '',
                jenis_kegiatan: m.jenis_kegiatan || '',
                volume: Number(m.volume || 1),
                satuan: m.satuan || 'Paket',
                harga_satuan: Number(m.harga_satuan || 0),
                jumlah_anggaran: Number(m.jumlah_anggaran || 0),
                sumber_dana: m.sumber_dana || 'DDS',
                items: clonedItems,
                rpjm_data: m.rpjm_data || {},
                tipe_anggaran: 'PERUBAHAN',
                id_referensi_murni: m.id,
                saved_at: nowIso,
                updated_at: nowIso
            };
        });

        // Insert ke Supabase dalam batch (misal per 15 baris)
        const batchSize = 15;
        let totalInserted = 0;
        for (let i = 0; i < newPayloads.length; i += batchSize) {
            const batch = newPayloads.slice(i, i + batchSize);
            const { data: insData, error: insErr } = await supabase
                .from('rab')
                .insert(batch)
                .select('id');

            if (insErr) {
                console.error(`❌ Gagal insert batch ${Math.floor(i / batchSize) + 1}:`, insErr.message);
                process.exit(1);
            }
            totalInserted += (insData ? insData.length : batch.length);
            console.log(`  ✓ Berhasil insert batch ${Math.floor(i / batchSize) + 1} (${insData ? insData.length : batch.length} baris).`);
        }

        console.log(`\n  🎉 Selesai menyalin ${totalInserted} baris kegiatan Murni ke Perubahan 2026.`);
    }

    // ------------------------------------------------------------
    // LANGKAH 3: VERIFIKASI AKHIR HASIL EKSEKUSI
    // ------------------------------------------------------------
    console.log('\n--- LANGKAH 3: Verifikasi Integritas Data Tahun 2026 ---');

    const { data: verifyMurni } = await supabase
        .from('rab')
        .select('id, kode_unik_full')
        .eq('tahun', 2026)
        .eq('tipe_anggaran', 'MURNI');

    const { data: verifyPerubahan } = await supabase
        .from('rab')
        .select('id, kode_unik_full, id_referensi_murni')
        .eq('tahun', 2026)
        .eq('tipe_anggaran', 'PERUBAHAN');

    console.log(`  ✓ Baris MURNI 2026    : ${verifyMurni.length}`);
    console.log(`  ✓ Baris PERUBAHAN 2026: ${verifyPerubahan.length}`);

    const murniIdSet = new Set(verifyMurni.map(m => m.id));
    let unreferencedCount = 0;
    let invalidRefCount = 0;

    verifyPerubahan.forEach(p => {
        if (!p.id_referensi_murni) {
            unreferencedCount++;
        } else if (!murniIdSet.has(p.id_referensi_murni)) {
            invalidRefCount++;
        }
    });

    console.log(`  ✓ PERUBAHAN tanpa id_referensi_murni: ${unreferencedCount}`);
    console.log(`  ✓ PERUBAHAN dengan ref target invalid: ${invalidRefCount}`);

    if (verifyMurni.length === 44 && verifyPerubahan.length === 44 && unreferencedCount === 0 && invalidRefCount === 0) {
        console.log('\n============================================================');
        console.log('✅ EKSEKUSI BERHASIL 100%: Seluruh 44 kegiatan RAB 2026');
        console.log('   telah memiliki pasangan PERUBAHAN yang tertaut sempurna!');
        console.log('============================================================\n');
        process.exit(0);
    } else {
        console.error('\n⚠️ Verifikasi menemukan ketidaksesuaian jumlah atau tautan!');
        process.exit(1);
    }
}

runBackfillAndClone().catch(err => {
    console.error('Terjadi galat tak terduga:', err);
    process.exit(1);
});
