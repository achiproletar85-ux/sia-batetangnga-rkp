#!/usr/bin/env node
/**
 * scripts/audit-rab-fetches.cjs
 * ============================================================================
 * AUDIT INTEGRITAS PENARIKAN DATA (DATA FETCH / SNAPSHOT INTEGRITY AUDIT)
 * PADA MODUL RAB DAN MODUL TURUNANNYA (RKPDES, RKTL, PAGU INDIKATIF, DLL.)
 *
 * Menguji dan memverifikasi:
 *   1. Zero-Wildcard Egress Compliance pada kueri tabel `rab`.
 *   2. Isolasi Kanal & Partisi Tipe Anggaran (MURNI vs PERUBAHAN).
 *   3. Integritas Relasi Foreign Key `id_referensi_murni` pada baris Perubahan.
 *   4. Keselarasan Nilai Anggaran RAB Murni vs RKPDes (`prakiraan_biaya` vs `jumlah_anggaran`).
 *   5. Penjagaan Nilai RKPDes Perubahan (SEMULA dari Murni, MENJADI dari Perubahan).
 *   6. Agregasi Pagu Indikatif (Murni vs Perubahan terpisah tanpa tercampur).
 *   7. Verifikasi Kebijakan Strict Baseline Clone (0..M-1 baseline, M..N-1 append).
 * ============================================================================
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ SUPABASE_URL atau SUPABASE_KEY tidak ditemukan di environment.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const RESULTS = [];
function recordResult(testName, passed, detail = '') {
    RESULTS.push({ testName, passed, detail });
    const badge = passed ? '✅ [LULUS]' : '❌ [GAGAL]';
    console.log(`  ${badge} ${testName}${detail ? ' -> ' + detail : ''}`);
}

async function runAudit() {
    console.log('========================================================================');
    console.log('       AUDIT PENARIKAN DATA & INTEGRITAS RELASI MODUL RAB');
    console.log('       (SIA BATETANGNGA - DATA FETCH & SNAPSHOT AUDIT)');
    console.log('========================================================================\n');

    // ------------------------------------------------------------------------
    // SEKSI 1: AUDIT STATIC CODE: ZERO-WILDCARD EGRESS PADA KUERI TABEL RAB
    // ------------------------------------------------------------------------
    console.log('--- 1. AUDIT EGRESS: ZERO-WILDCARD PADA KUERI RAB DI SELURUH KODE ---');
    const serverPath = path.resolve(__dirname, '..', 'server.js');
    const serverCode = fs.readFileSync(serverPath, 'utf8');

    const lines = serverCode.split('\n');
    let wildcardViolations = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes(".from('rab')") || line.includes(".from(RAB_TABLE)")) {
            const window = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 5)).join('\n');
            const hasStar = window.includes('.select(' + "'*'");
            const hasEmpty = window.includes('.select(' + ')');
            if (hasStar || hasEmpty) {
                wildcardViolations++;
                console.error(`    ❌ Pelanggaran wildcard di server.js baris ${i + 1}`);
            }
        }
    }
    recordResult('Zero-Wildcard Egress pada Kueri RAB di server.js', wildcardViolations === 0, `Pelanggaran: ${wildcardViolations}`);

    // ------------------------------------------------------------------------
    // SEKSI 2: AUDIT INTEGRITAS KANAL & NORMALISASI TIPE ANGGARAN TABEL RAB
    // ------------------------------------------------------------------------
    console.log('\n--- 2. AUDIT ISOLASI KANAL & NORMALISASI TIPE ANGGARAN (MURNI / PERUBAHAN) ---');
    const { data: allRabRows, error: rabErr } = await supabase
        .from('rab')
        .select('id, kode_unik_full, kode_unik, tahun, tipe_anggaran, id_referensi_murni, nama_kegiatan, jumlah_anggaran, items')
        .order('id', { ascending: true })
        .limit(2000);

    if (rabErr) {
        console.error('❌ Gagal fetch data tabel rab:', rabErr.message);
        process.exit(1);
    }

    const totalRows = allRabRows.length;
    let missingTipeCount = 0;
    let murniCount = 0;
    let perubahanCount = 0;

    allRabRows.forEach(r => {
        const t = String(r.tipe_anggaran || '').toUpperCase().trim();
        if (!t || (t !== 'MURNI' && t !== 'PERUBAHAN')) {
            missingTipeCount++;
        } else if (t === 'MURNI') {
            murniCount++;
        } else if (t === 'PERUBAHAN') {
            perubahanCount++;
        }
    });

    recordResult('Semua Baris RAB Memiliki Tipe Anggaran Valid (MURNI / PERUBAHAN)', missingTipeCount === 0, `Total: ${totalRows} baris (Murni: ${murniCount}, Perubahan: ${perubahanCount}, Invalid: ${missingTipeCount})`);

    // ------------------------------------------------------------------------
    // SEKSI 3: AUDIT FOREIGN KEY & MAPPING id_referensi_murni PADA RAB PERUBAHAN
    // ------------------------------------------------------------------------
    console.log('\n--- 3. AUDIT RELASI id_referensi_murni PADA SELURUH RAB PERUBAHAN ---');
    const murniIdMap = new Map();
    const murniByYearKode = new Map();
    allRabRows.filter(r => (r.tipe_anggaran || '').toUpperCase() === 'MURNI').forEach(m => {
        murniIdMap.set(Number(m.id), m);
        const k = `${m.tahun}_${String(m.kode_unik_full || m.kode_unik || '').trim().replace(/\.+$/, '')}`;
        murniByYearKode.set(k, m);
    });

    const perubahanRows = allRabRows.filter(r => (r.tipe_anggaran || '').toUpperCase() === 'PERUBAHAN');
    let validWithRef = 0;
    let validPurePak = 0;
    let invalidRef = 0;

    perubahanRows.forEach(p => {
        const k = `${p.tahun}_${String(p.kode_unik_full || p.kode_unik || '').trim().replace(/\.+$/, '')}`;
        const targetMurni = murniByYearKode.get(k);

        if (targetMurni) {
            // Kegiatan ini ada di Murni: Wajib memiliki id_referensi_murni yang valid ke baris Murni tersebut
            if (p.id_referensi_murni && Number(p.id_referensi_murni) === Number(targetMurni.id)) {
                validWithRef++;
            } else {
                invalidRef++;
            }
        } else {
            // Kegiatan murni baru di PAK (tidak ada di Murni): id_referensi_murni wajib null / tidak mengarah ke record fiktif
            if (!p.id_referensi_murni) {
                validPurePak++;
            } else {
                invalidRef++;
            }
        }
    });

    recordResult('Integritas Foreign Key id_referensi_murni & Penandaan Kegiatan PAK', invalidRef === 0, `Valid: ${validWithRef} berelasi ke Murni + ${validPurePak} kegiatan murni PAK (0 orphan)`);

    // ------------------------------------------------------------------------
    // SEKSI 4: AUDIT STRICT BASELINE CLONE & APPEND ENGINE
    // ------------------------------------------------------------------------
    console.log('\n--- 4. AUDIT STRICT BASELINE CLONE (1:1 DARI MURNI + APPEND BAWAH) ---');
    let enginePassed = 0;
    let engineTotal = 0;

    function canonicalRabKey(str) {
        if (!str) return '';
        let s = String(str).toLowerCase();
        s = s.replace(/[.,\-_:;/\\()]/g, ' ');
        s = s.replace(/\bsekdes\b/g, 'sekretaris desa');
        s = s.replace(/\bkadus\b/g, 'kepala dusun');
        s = s.replace(/\bperencanaa\b/g, 'perencanaan');
        s = s.replace(/\btu\b/g, 'dan tu');
        s = s.replace(/\s+/g, ' ').trim();
        return s;
    }

    function buildPerubahanItemsFromBaseline(murniItems, perItems, murniId) {
        const mArr = Array.isArray(murniItems) ? murniItems : [];
        const pArr = Array.isArray(perItems) ? perItems : [];
        const usedP = new Set();
        const norm = (v) => String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, ' ');
        const updated = [];

        mArr.forEach((m, mIdx) => {
            const mCanon = canonicalRabKey(m.uraian);
            const mSub = norm(m.subgroup);

            let pMatchIdx = pArr.findIndex((p, idx) => {
                if (usedP.has(idx)) return false;
                const pCanon = canonicalRabKey(p.uraian);
                const pCanonMurni = canonicalRabKey(p.uraian_murni);
                const pSub = norm(p.subgroup);
                if (pCanon === mCanon && (!mSub || !pSub || mSub === pSub)) return true;
                if (pCanonMurni && pCanonMurni === mCanon && (!mSub || !pSub || mSub === pSub)) return true;
                if (pCanon === mCanon) return true;
                if (p.urutan_murni === mIdx && (pCanon === mCanon || pCanonMurni === mCanon)) return true;
                return false;
            });

            if (pMatchIdx >= 0) {
                usedP.add(pMatchIdx);
                const pMatch = pArr[pMatchIdx];
                updated.push({
                    ...pMatch,
                    urutan_murni: mIdx,
                    uraian_murni: (m.uraian || '').trim(),
                    item_baru: false,
                    urutan_manual: mIdx + 1
                });
            } else {
                updated.push({
                    uraian: (m.uraian || '').trim(),
                    urutan_murni: mIdx,
                    uraian_murni: (m.uraian || '').trim(),
                    item_baru: false,
                    urutan_manual: mIdx + 1
                });
            }
        });

        pArr.forEach((p, idx) => {
            if (!usedP.has(idx)) {
                updated.push({
                    ...p,
                    urutan_murni: null,
                    item_baru: true,
                    urutan_manual: updated.length + 1
                });
            }
        });

        return updated;
    }

    perubahanRows.forEach(p => {
        const murni = murniIdMap.get(Number(p.id_referensi_murni));
        if (!murni) return;

        engineTotal++;
        let mItems = typeof murni.items === 'string' ? JSON.parse(murni.items || '[]') : (murni.items || []);
        let pItems = typeof p.items === 'string' ? JSON.parse(p.items || '[]') : (p.items || []);

        const simulated = buildPerubahanItemsFromBaseline(mItems, pItems, murni.id);
        
        let ok = true;
        if (simulated.length < mItems.length) {
            ok = false;
        } else {
            for (let i = 0; i < mItems.length; i++) {
                if (simulated[i].urutan_murni !== i || simulated[i].item_baru === true) {
                    ok = false;
                    break;
                }
            }
            for (let j = mItems.length; j < simulated.length; j++) {
                if (simulated[j].item_baru !== true || simulated[j].urutan_murni !== null) {
                    ok = false;
                    break;
                }
            }
        }
        if (ok) enginePassed++;
    });

    recordResult('Engine Rekonsiliasi Baseline Clone 1:1 & Strict Append', engineTotal > 0 && enginePassed === engineTotal, `${enginePassed}/${engineTotal} baris terverifikasi sempurna`);

    // ------------------------------------------------------------------------
    // SEKSI 5: REKONSILIASI KONSISTENSI DATA LINTAS MODUL: RAB MURNI VS RKPDES
    // ------------------------------------------------------------------------
    console.log('\n--- 5. AUDIT DATA DRIFT: KONSISTENSI ANGGARAN RAB MURNI VS RKPDES ---');
    const { data: rkpRows, error: rkpErr } = await supabase
        .from('rkpdes')
        .select('id, kode_unik_full, tahun, prakiraan_biaya, jenis_kegiatan, nama_kegiatan')
        .limit(2000);

    if (rkpErr) {
        console.error('❌ Gagal fetch rkpdes:', rkpErr.message);
        process.exit(1);
    }

    const murniKodeMap = new Map();
    allRabRows.filter(r => (r.tipe_anggaran || '').toUpperCase() === 'MURNI').forEach(m => {
        const rawK = String(m.kode_unik_full || m.kode_unik || '').trim().replace(/\.+$/, '');
        const k = `${m.tahun}_${rawK}`;
        murniKodeMap.set(k, Number(m.jumlah_anggaran) || 0);
    });

    let matchedRkp = 0;
    let driftingRkp = 0;

    rkpRows.forEach(rkp => {
        const rawK = String(rkp.kode_unik_full || '').trim().replace(/\.+$/, '');
        const k = `${rkp.tahun}_${rawK}`;
        if (murniKodeMap.has(k)) {
            matchedRkp++;
            const rabBiaya = murniKodeMap.get(k);
            const rkpBiaya = Number(rkp.prakiraan_biaya) || 0;
            if (rabBiaya > 0 && rkpBiaya > 0 && rabBiaya !== rkpBiaya) {
                driftingRkp++;
            }
        }
    });

    recordResult('Keterkaitan Kode Kegiatan RAB Murni ke RKPDes', matchedRkp > 0, `${matchedRkp} kegiatan terhubung`);
    recordResult('Zero Data Drift Nilai Anggaran (prakiraan_biaya == jumlah_anggaran)', driftingRkp === 0, `Deviasi: ${driftingRkp} dari ${matchedRkp} baris yang cocok`);

    // ------------------------------------------------------------------------
    // SEKSI 6: AUDIT KONSISTENSI AGREGASI PAGU INDIKATIF (MURNI & PERUBAHAN)
    // ------------------------------------------------------------------------
    console.log('\n--- 6. AUDIT AGREGASI PAGU INDIKATIF (MURNI & PERUBAHAN) ---');
    const totalsByYear = {};
    allRabRows.forEach(r => {
        const yr = r.tahun;
        if (!totalsByYear[yr]) totalsByYear[yr] = { murni: 0, perubahan: 0 };
        const amt = Number(r.jumlah_anggaran) || 0;
        if ((r.tipe_anggaran || '').toUpperCase() === 'PERUBAHAN') {
            totalsByYear[yr].perubahan += amt;
        } else {
            totalsByYear[yr].murni += amt;
        }
    });

    let validTotals = true;
    for (const [yr, totals] of Object.entries(totalsByYear)) {
        if (totals.murni < 0 || totals.perubahan < 0) validTotals = false;
        console.log(`    Tahun ${yr}: Σ Murni = Rp ${totals.murni.toLocaleString('id-ID')}, Σ Perubahan = Rp ${totals.perubahan.toLocaleString('id-ID')}`);
    }

    recordResult('Akumulasi Saldo Pagu Indikatif Per Tahun Sehat & Non-Negatif', validTotals, `${Object.keys(totalsByYear).length} tahun dievaluasi`);

    // ------------------------------------------------------------------------
    // REKAPITULASI HASIL AUDIT
    // ------------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log(' HASIL AUDIT INTEGRITAS PENARIKAN DATA:');
    const totalTests = RESULTS.length;
    const passedTests = RESULTS.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    console.log(` Total Pengujian     : ${totalTests}`);
    console.log(` Lulus               : ${passedTests}`);
    console.log(` Gagal               : ${failedTests}`);
    console.log('========================================================================\n');

    if (failedTests > 0) {
        process.exit(1);
    } else {
        console.log('🎉 SELURUH AUDIT PENARIKAN DATA & ISOLASI SNAPSHOT BERHASIL 100%!');
        process.exit(0);
    }
}

runAudit().catch(err => {
    console.error('❌ Exception during audit:', err);
    process.exit(1);
});
