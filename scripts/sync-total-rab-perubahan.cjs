#!/usr/bin/env node
/**
 * SINKRONISASI TOTAL RAB PERUBAHAN vs RINCIAN ITEM
 * ---------------------------------------------------------------------------
 * Kasus: sebuah kegiatan di dokumen RAB PERUBAHAN sudah "ditiadakan" (seluruh
 * item bervolume 0) tetapi kolom header `rab.jumlah_anggaran` masih menyimpan
 * angka lama — mis. 02.02.02.02. (Rp 107.720.500) dan 02.02.02.03. (Rp 95.816.000).
 * Akibatnya RKPDes Perubahan menampilkan "Menjadi" sebesar angka basi itu.
 *
 * Aturan yang diterapkan (hanya untuk baris yang rinciannya SUDAH disimpan
 * eksplisit oleh admin, ditandai `rpjm_data.rincian_override = true`):
 *   semua item bervolume 0  →  jumlah_anggaran = 0, harga_satuan = 0
 *
 * Baris all-zero TANPA penanda tidak disentuh (menunggu keputusan admin) —
 * hanya dilaporkan sebagai catatan di akhir agar tidak ada perubahan tak diminta.
 *
 * Jaminan keamanan:
 *   1. DRY-RUN default; hanya `--apply` yang menulis.
 *   2. Satu TRANSAKSI + cadangan ke scripts/backup_migration/data/ (bisa --restore).
 *   3. Delta total dihitung dan DIBANDINGKAN dengan yang diharapkan; meleset → ROLLBACK.
 *   4. IDEMPOTEN.
 *   5. Zero-Wildcard Egress: daftar kolom eksplisit, tanpa wildcard select.
 *
 * Pemakaian:
 *   node scripts/sync-total-rab-perubahan.cjs                  # tinjau (tahun 2026)
 *   node scripts/sync-total-rab-perubahan.cjs --apply
 *   node scripts/sync-total-rab-perubahan.cjs --tahun=2026 --apply
 *   node scripts/sync-total-rab-perubahan.cjs --restore
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
// Aturan volume yang sama dengan server & halaman (nol/kosong vs teks dimensi).
const VolumeTeks = require('../frontend/volumeTeks.js');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const RESTORE = args.includes('--restore');
const dariArg = args.find((a) => a.startsWith('--dari='));
const tahunArg = args.find((a) => a.startsWith('--tahun='));
const TAHUN = tahunArg ? Number(tahunArg.split('=')[1]) : 2026;

const ROOT = path.resolve(__dirname, '..');
const BACKUP_DIR = path.join(ROOT, 'scripts', 'backup_migration', 'data');

const norm = (v) => String(v == null ? '' : v).trim().toLowerCase();

(async () => {
    const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await c.connect();

    const total = async () => {
        const { rows } = await c.query(
            `select coalesce(sum(jumlah_anggaran),0) as perubahan
             from public.rab where tahun = $1 and tipe_anggaran = 'PERUBAHAN'`, [TAHUN]);
        return Number(rows[0].perubahan);
    };

    if (RESTORE) {
        const berkas = dariArg
            ? path.resolve(ROOT, dariArg.split('=')[1])
            : (() => {
                if (!fs.existsSync(BACKUP_DIR)) return null;
                const k = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith(`sync-total-rab-perubahan-${TAHUN}-`) && f.endsWith('.json')).sort().reverse();
                return k.length ? path.join(BACKUP_DIR, k[0]) : null;
            })();
        if (!berkas || !fs.existsSync(berkas)) {
            console.error(`❌ Cadangan tidak ditemukan. Gunakan --dari=<berkas>.`);
            process.exit(1);
        }
        const isi = JSON.parse(fs.readFileSync(berkas, 'utf8'));
        const sebelum = await total();
        await c.query('begin');
        try {
            for (const r of isi.baris || []) {
                const res = await c.query(
                    `update public.rab set jumlah_anggaran = $1, harga_satuan = $2 where id = $3`,
                    [r.jumlah_anggaran, r.harga_satuan, r.id]);
                if (res.rowCount !== 1) throw new Error(`rowCount=${res.rowCount} (id ${r.id})`);
            }
            await c.query('commit');
            console.log(`✅ RESTORED dari ${path.relative(ROOT, berkas)} — total PERUBAHAN: ${sebelum} → ${await total()}`);
        } catch (e) {
            await c.query('rollback');
            console.error(`❌ ROLLBACK: ${e.message}`);
            process.exit(1);
        }
        await c.end();
        return;
    }

    console.log(`\n=== SINKRONISASI TOTAL RAB PERUBAHAN vs RINCIAN — TAHUN ${TAHUN} (${APPLY ? 'APPLY' : 'DRY-RUN'}) ===\n`);

    const { rows } = await c.query(
        `select id, kode_unik_full, tipe_anggaran, nama_kegiatan, volume, satuan, harga_satuan, jumlah_anggaran, items,
                rpjm_data->>'rincian_override' as rincian_override
         from public.rab where tahun = $1 and tipe_anggaran = 'PERUBAHAN' order by kode_unik_full`, [TAHUN]);

    const rencana = [];
    const catatan = [];
    for (const r of rows) {
        const items = Array.isArray(r.items) ? r.items : [];
        if (!items.length) continue;
        // Volume boleh berupa TEKS DIMENSI ("250mX4mX0,15m3") yang BUKAN nol — memakai
        // Number() mentah akan menganggapnya 0 dan keliru meniadakan anggaran kegiatan.
        const semuaNol = items.every((it) => VolumeTeks.isVolumeKosong(it && it.volume));
        if (!semuaNol) continue;
        const ditandai = r.rincian_override === 'true' || r.rincian_override === true;
        const totalHeader = Number(r.jumlah_anggaran) || 0;
        if (!ditandai) {
            catatan.push(`  ℹ️  #${r.id} ${r.kode_unik_full} tanpa penanda rincian_override (header ${totalHeader}) — TIDAK diubah, menunggu keputusan admin`);
            continue;
        }
        if (totalHeader === 0 && Number(r.harga_satuan || 0) === 0) continue; // sudah sinkron
        rencana.push({
            id: r.id, kode: r.kode_unik_full, nama: r.nama_kegiatan,
            dari: totalHeader, ke: 0, hargaDari: Number(r.harga_satuan) || 0
        });
    }

    console.log(`Baris PERUBAHAN diperiksa : ${rows.length}`);
    console.log(`Perlu disinkronkan        : ${rencana.length}\n`);
    for (const p of rencana) {
        console.log(`  #${p.id} ${p.kode} ${JSON.stringify(norm(p.nama) ? p.nama : '')}\n      jumlah_anggaran ${p.dari} → 0 (harga_satuan ${p.hargaDari} → 0)`);
    }
    for (const t of catatan) console.log(t);

    if (!rencana.length) {
        console.log('\n✅ Sudah sinkron — tidak ada yang perlu diubah (idempoten).\n');
        await c.end();
        process.exit(0);
    }

    const deltaDiharapkan = -rencana.reduce((s, p) => s + p.dari, 0);
    const sebelum = await total();
    console.log(`\nTotal PERUBAHAN SEBELUM : ${sebelum}`);
    console.log(`Delta yang diharapkan   : ${deltaDiharapkan}`);

    if (!APPLY) {
        console.log('\n(dry-run) Tidak ada perubahan ditulis. Jalankan dengan --apply.\n');
        await c.end();
        process.exit(0);
    }

    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const stempel = new Date().toISOString().replace(/[:.]/g, '-');
    const berkasCadangan = path.join(BACKUP_DIR, `sync-total-rab-perubahan-${TAHUN}-${stempel}.json`);
    const barisCadangan = rows
        .filter((r) => rencana.some((p) => p.id === r.id))
        .map((r) => ({ id: r.id, kode_unik_full: r.kode_unik_full, jumlah_anggaran: r.jumlah_anggaran, harga_satuan: r.harga_satuan }));
    fs.writeFileSync(berkasCadangan, JSON.stringify({ tahun: TAHUN, baris: barisCadangan, rencana }, null, 2));
    console.log(`\nCadangan                : ${path.relative(ROOT, berkasCadangan)}`);

    await c.query('begin');
    try {
        for (const p of rencana) {
            const res = await c.query(
                `update public.rab set jumlah_anggaran = 0, harga_satuan = 0, updated_at = now() where id = $1`, [p.id]);
            if (res.rowCount !== 1) throw new Error(`jumlah baris terpengaruh = ${res.rowCount} (id ${p.id})`);
        }
        const sesudah = await total();
        const deltaNyata = sesudah - sebelum;
        console.log(`Total PERUBAHAN SESUDAH  : ${sesudah}`);
        console.log(`Delta nyata              : ${deltaNyata}`);
        if (deltaNyata !== deltaDiharapkan) {
            throw new Error(`DELTA TIDAK SESUAI: diharapkan ${deltaDiharapkan}, nyata ${deltaNyata}`);
        }
        await c.query('commit');
        console.log('\n✅ APPLIED: total RAB PERUBAHAN kini mengikuti rincian item (kegiatan ditiadakan = Rp 0).\n');
    } catch (e) {
        await c.query('rollback');
        console.error(`\n❌ ROLLBACK: ${e.message}\n`);
        await c.end();
        process.exit(1);
    }

    await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
