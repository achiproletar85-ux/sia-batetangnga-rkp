#!/usr/bin/env node
/**
 * PREFLIGHT CHECK — Migrasi RAB Perubahan (read-only).
 *
 * Memverifikasi bahwa kolom `tipe_anggaran` + `id_referensi_murni` benar-benar
 * ada di database Supabase yang dipakai aplikasi (.env), dan melaporkan
 * project ref yang sedang ditembak — supaya mudah memastikan SQL Editor
 * dijalankan pada project yang SAMA.
 *
 * Tidak menulis / mengubah data apa pun. Nol baris tabel yang ditarik.
 *
 * Jalankan: node scripts/check-rab-migration.cjs
 * Exit code: 0 = migrasi OK, 1 = belum diterapkan.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });

const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_KEY || '';
const ref = (url.match(/https:\/\/([a-z0-9]+)\./) || [])[1] || '(tidak terbaca)';
const H = { apikey: key, Authorization: 'Bearer ' + key };

async function columnExists(col) {
    const r = await fetch(`${url}/rest/v1/rab?select=id,${encodeURIComponent(col)}&limit=0`, { headers: H });
    if (r.status < 400) return { ok: true };
    const body = await r.json().catch(() => ({}));
    return { ok: false, code: body.code, message: body.message || String(r.status) };
}

async function countBy(expr) {
    const r = await fetch(`${url}/rest/v1/rab?select=id&${expr}&limit=0`, {
        method: 'HEAD',
        headers: { ...H, Prefer: 'count=exact' }
    });
    if (r.status >= 400) return null;
    const range = r.headers.get('content-range') || '';
    return range.includes('/') ? Number(range.split('/')[1]) : null;
}

(async () => {
    console.log('\n============================================================');
    console.log('  PREFLIGHT — MIGRASI RAB PERUBAHAN');
    console.log('============================================================');
    console.log(`  Supabase project ref : ${ref}`);
    console.log(`  SUPABASE_URL         : ${url.replace(/\/\/.*@/, '//')}`);
    console.log(`  SUPABASE_KEY         : ${key ? '(' + key.length + ' karakter, disamarkan)' : 'KOSONG!'}`);

    if (!url || !key) {
        console.log('\n  ❌ SUPABASE_URL / SUPABASE_KEY tidak terbaca dari .env\n');
        process.exit(1);
    }

    const checks = [
        ['tipe_anggaran', await columnExists('tipe_anggaran')],
        ['id_referensi_murni', await columnExists('id_referensi_murni')]
    ];

    console.log('\n  Kolom wajib:');
    let allOk = true;
    for (const [name, res] of checks) {
        if (res.ok) {
            console.log(`    ✅ rab.${name}`);
        } else {
            allOk = false;
            console.log(`    ❌ rab.${name}  → ${res.code || '?'} ${res.message}`);
        }
    }

    if (allOk) {
        const mur = await countBy('tipe_anggaran=eq.MURNI');
        const per = await countBy('tipe_anggaran=eq.PERUBAHAN');
        const lon = await countBy('tipe_anggaran=is.null');
        console.log('\n  Sebaran versi:');
        console.log(`    MURNI      : ${mur === null ? '?' : mur}`);
        console.log(`    PERUBAHAN  : ${per === null ? '?' : per}`);
        console.log(`    (null)     : ${lon === null ? '?' : lon}${lon ? '  ⚠️ ada baris tanpa versi' : ''}`);
    }

    console.log('\n------------------------------------------------------------');
    if (allOk) {
        console.log('  ✅ MIGRASI TERAPAN. Fitur RAB Perubahan siap dipakai.');
        console.log('     (/api/rab/versi-status → migration_required: false)');
        console.log('------------------------------------------------------------\n');
        process.exit(0);
    } else {
        console.log('  ❌ MIGRASI BELUM TERAPAN di project di atas.');
        console.log('------------------------------------------------------------');
        console.log('  Yang perlu dilakukan:');
        console.log('   1. Buka Supabase Dashboard → pilih project dengan ref:');
        console.log(`        ${ref}`);
        console.log('      (pastikan project ini yang aktif, bukan project lain)');
        console.log('   2. SQL Editor → tempel SELURUH isi berkas');
        console.log('        supabase_add_tipe_anggaran_rab.sql');
        console.log('      lalu Run. Skrip dibungkus BEGIN/COMMIT: bila satu');
        console.log('      statement gagal, SEMUANYA di-rollback tanpa jejak.');
        console.log('   3. Jalankan ulang: node scripts/check-rab-migration.cjs');
        console.log('');
        console.log('  Catatan: kode 42703 ("column ... does not exist") berasal dari');
        console.log('  PostgreSQL itu sendiri — bukan cache PostgREST yang basi, jadi');
        console.log('  ini bukan soal tunggu/refresh.');
        console.log('------------------------------------------------------------\n');
        process.exit(1);
    }
})();
