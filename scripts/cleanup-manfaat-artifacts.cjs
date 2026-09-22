#!/usr/bin/env node
/**
 * CLEANUP ARTEFAK TEKS MANFAAT (BARIS TAHUN TERTENTU)
 * ---------------------------------------------------------------------------
 * Menyeragamkan nilai warisan penulisan lama pada kolom manfaat agar bersih
 * mengikuti standar baris acuan (mis. RKPDes 01.02.01.05. / "Pengadaan
 * Peralatan Komputer"): nilai NOL tidak lagi disimpan sebagai "0 KK"/"0 Org"
 * dan satuan tidak lagi menempel tanpa spasi ("144Org").
 *
 * PENTING — mengapa nol di rpjm_data ditulis "0", bukan "-":
 *   `server.js` GET /api/rkpdes/perubahan memakai pola
 *   `if (pRpjm.manfaat_x && pRpjm.manfaat_x !== '-') { … = formatManfaatRpjm(...) }`.
 *   Nilai "0 KK" LOLOS gerbang itu sehingga dikosongkan menjadi '-', sedangkan
 *   "-" TIDAK lolos sehingga nilai hasil tebakan (mis. heuristik nama kegiatan
 *   "keamanan" → 10 KK) muncul kembali. Menulis "-" karena itu MENGUBAH tampilan
 *   (dari '-' menjadi angka tebakan). Nilai "0" tetap lolos gerbang → tampilan
 *   identik seperti sebelum dibersihkan, tanpa embel-embel unit yang aneh.
 *   Untuk kolom TEKS rkpdes (sasaran_manfaat / penerima_manfaat) dipakai bentuk
 *   standar baris acuan ('-' dan "L: 0, P: 0, RTM: 0 (Total: 0 Orang)") karena
 *   kolom itu bukan sumber tampilan saat nilai nol eksplisit sudah tersimpan.
 *
 * Jaminan keamanan:
 *   1. DRY-RUN secara default. Perubahan dieksekusi hanya dengan `--apply`.
 *   2. Satu TRANSAKSI. Paritas angka diperiksa SEBELUM commit; bila total
 *      belanja bergeser sedikit pun → ROLLBACK + exit 1.
 *   3. IDEMPOTEN: dijalankan dua kali tidak mengubah apa pun pada kali kedua.
 *   4. Cadangan baris asli ditulis ke scripts/backup_migration/data/ (gitignored)
 *      dan bisa dikembalikan dengan `--restore`.
 *   5. Zero-Wildcard Egress: semua kueri memakai daftar kolom eksplisit (tanpa
 *      wildcard select sesuai agent_rules.md §1) dan hanya menyentuh kolom teks
 *      (bukan nominal).
 *
 * Pemakaian:
 *   node scripts/cleanup-manfaat-artifacts.cjs                     # tinjau (dry-run)
 *   node scripts/cleanup-manfaat-artifacts.cjs --apply
 *   node scripts/cleanup-manfaat-artifacts.cjs --restore           # pakai cadangan terbaru
 *   node scripts/cleanup-manfaat-artifacts.cjs --restore --dari=scripts/backup_migration/data/xxxx.json
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const RESTORE = args.includes('--restore');
const tahunArg = args.find((a) => a.startsWith('--tahun='));
const dariArg = args.find((a) => a.startsWith('--dari='));
const TAHUN = tahunArg ? Number(tahunArg.split('=')[1]) : 2026;

const ROOT = path.resolve(__dirname, '..');
const BACKUP_DIR = path.join(ROOT, 'scripts', 'backup_migration', 'data');

// Nilai NOL yang masih memakai unit tambahan → dianggap artefak.
const NOL_ARTEFAK = /^\s*(0|0\s*(Org|KK|Orang|orang|Jiwa|Unit|Paket|Bulan))\s*$/;
// Satuan menempel tanpa spasi: "144Org" → "144 Org".
const TANPA_SPASI = /^\s*(\d+)\s*(Org|KK|Orang|orang)\s*$/;

const KOL_MANFAAT_JSON = ['manfaat_l', 'manfaat_p', 'manfaat_rtm', 'total_manfaat'];
const NOL_JSON = '0';                                    // rpjm_data: nol eksplisit tanpa unit
const NOL_TEKS = '-';                                    // kolom teks rkpdes: bentuk standar acuan
const SASARAN_NOL_STANDAR = 'L: 0, P: 0, RTM: 0 (Total: 0 Orang)';

let perubahan = [];   // { tabel, id, kode, kolom, dari, ke }

function rencanakan(rkpdesRows, rabRows) {
    for (const r of rabRows) {
        const d = { ...(r.rpjm_data || {}) };
        let berubah = false;
        for (const k of KOL_MANFAAT_JSON) {
            const v = d[k];
            if (typeof v !== 'string') continue;
            // Nilai yang SUDAH berbentuk standar ("0") tidak boleh masuk rencana,
            // supaya skrip benar-benar idempoten (dijalankan ulang = 0 perubahan).
            if (NOL_ARTEFAK.test(v) && v.trim() !== NOL_JSON) {
                perubahan.push({ tabel: 'rab', id: r.id, kode: r.kode_unik_full, kolom: `rpjm_data.${k}`, dari: v, ke: NOL_JSON });
                d[k] = NOL_JSON;
                berubah = true;
            } else if (TANPA_SPASI.test(v)) {
                const m = v.trim().match(TANPA_SPASI);
                const rapi = `${m[1]} ${m[2]}`;
                if (rapi !== v.trim()) {
                    perubahan.push({ tabel: 'rab', id: r.id, kode: r.kode_unik_full, kolom: `rpjm_data.${k}`, dari: v, ke: rapi });
                    d[k] = rapi;
                    berubah = true;
                }
            }
        }
        if (berubah) r.__rpjmBaru = d;
    }

    for (const r of rkpdesRows) {
        if (typeof r.sasaran_manfaat === 'string' && NOL_ARTEFAK.test(r.sasaran_manfaat) && r.sasaran_manfaat.trim() !== SASARAN_NOL_STANDAR) {
            perubahan.push({ tabel: 'rkpdes', id: r.id, kode: r.kode_unik_full, kolom: 'sasaran_manfaat', dari: r.sasaran_manfaat, ke: SASARAN_NOL_STANDAR });
            r.__sasaranBaru = SASARAN_NOL_STANDAR;
        }
        if (typeof r.penerima_manfaat === 'string' && NOL_ARTEFAK.test(r.penerima_manfaat) && r.penerima_manfaat.trim() !== NOL_TEKS) {
            perubahan.push({ tabel: 'rkpdes', id: r.id, kode: r.kode_unik_full, kolom: 'penerima_manfaat', dari: r.penerima_manfaat, ke: NOL_TEKS });
            r.__penerimaBaru = NOL_TEKS;
        }
    }
}

async function totalBelanja(c) {
    const { rows } = await c.query(`
        select
          (select coalesce(sum(jumlah_anggaran),0) from public.rab where tipe_anggaran = 'MURNI' and tahun = $1) as rab_murni,
          (select coalesce(sum(jumlah_anggaran),0) from public.rab where tipe_anggaran = 'PERUBAHAN' and tahun = $1) as rab_perubahan,
          (select coalesce(sum(jumlah_anggaran),0) from public.rab where tahun = $1) as rab_total,
          (select coalesce(sum(prakiraan_biaya),0) from public.rkpdes where tahun = $1) as rkpdes_biaya,
          (select count(*) from public.rab where tahun = $1) as rab_baris,
          (select count(*) from public.rkpdes where tahun = $1) as rkpdes_baris
    `, [TAHUN]);
    return rows[0];
}

function paritasSama(a, b) {
    return a.rab_murni === b.rab_murni && a.rab_perubahan === b.rab_perubahan && a.rab_total === b.rab_total
        && a.rkpdes_biaya === b.rkpdes_biaya && a.rab_baris === b.rab_baris && a.rkpdes_baris === b.rkpdes_baris;
}

async function muatData(c) {
    const { rows: rkpdesRows } = await c.query(
        `select id, kode_unik_full, sasaran_manfaat, penerima_manfaat, manfaat_l, manfaat_p, manfaat_rtm, total_manfaat, prakiraan_biaya
         from public.rkpdes where tahun = $1 order by kode_unik_full`, [TAHUN]);
    const { rows: rabRows } = await c.query(
        `select id, kode_unik_full, tipe_anggaran, rpjm_data, jumlah_anggaran
         from public.rab where tahun = $1 order by kode_unik_full, tipe_anggaran`, [TAHUN]);
    return { rkpdesRows, rabRows };
}

function cadanganTerbaru() {
    if (dariArg) return path.resolve(ROOT, dariArg.split('=')[1]);
    if (!fs.existsSync(BACKUP_DIR)) return null;
    const kandidat = fs.readdirSync(BACKUP_DIR)
        .filter((f) => f.startsWith(`cleanup-manfaat-${TAHUN}-`) && f.endsWith('.json'))
        .sort()
        .reverse();
    return kandidat.length ? path.join(BACKUP_DIR, kandidat[0]) : null;
}

async function jalankanRestore(c) {
    const berkas = cadanganTerbaru();
    if (!berkas || !fs.existsSync(berkas)) {
        console.error(`❌ Cadangan tidak ditemukan untuk tahun ${TAHUN}. Gunakan --dari=<berkas>.`);
        process.exit(1);
    }
    const isi = JSON.parse(fs.readFileSync(berkas, 'utf8'));
    console.log(`\n=== RESTORE DARI CADANGAN ===\n${path.relative(ROOT, berkas)}\n`);
    console.log(`Baris cadangan: rkpdes=${(isi.rkpdes || []).length}, rab=${(isi.rab || []).length}`);

    const sebelum = await totalBelanja(c);
    await c.query('begin');
    try {
        let n = 0;
        for (const r of isi.rkpdes || []) {
            const res = await c.query(
                `update public.rkpdes set sasaran_manfaat = $1, penerima_manfaat = $2 where id = $3`,
                [r.sasaran_manfaat, r.penerima_manfaat, r.id]);
            if (res.rowCount !== 1) throw new Error(`rowCount rkpdes ${res.rowCount} (id ${r.id})`);
            n += res.rowCount;
        }
        for (const r of isi.rab || []) {
            const res = await c.query(`update public.rab set rpjm_data = $1::jsonb where id = $2`, [JSON.stringify(r.rpjm_data), r.id]);
            if (res.rowCount !== 1) throw new Error(`rowCount rab ${res.rowCount} (id ${r.id})`);
            n += res.rowCount;
        }
        const sesudah = await totalBelanja(c);
        if (!paritasSama(sebelum, sesudah)) throw new Error('PARITAS ANGKA BERGESER — restore dibatalkan');
        await c.query('commit');
        console.log(`✅ RESTORED: ${n} baris dikembalikan ke kondisi cadangan, paritas total identik.\n`);
    } catch (e) {
        await c.query('rollback');
        console.error(`\n❌ ROLLBACK: ${e.message}\n`);
        await c.end();
        process.exit(1);
    }
}

(async () => {
    const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await c.connect();

    if (RESTORE) {
        await jalankanRestore(c);
        await c.end();
        return;
    }

    console.log(`\n=== CLEANUP ARTEFAK TEKS MANFAAT — TAHUN ${TAHUN} (${APPLY ? 'APPLY' : 'DRY-RUN'}) ===\n`);

    const { rkpdesRows, rabRows } = await muatData(c);
    rencanakan(rkpdesRows, rabRows);

    console.log(`Baris diperiksa   : rkpdes=${rkpdesRows.length}, rab=${rabRows.length}`);
    console.log(`Perubahan rencana : ${perubahan.length} kolom\n`);

    if (!perubahan.length) {
        console.log('✅ Sudah bersih & seragam — tidak ada yang perlu diubah (idempoten).\n');
        await c.end();
        process.exit(0);
    }

    for (const p of perubahan) {
        console.log(`  ${p.tabel} #${p.id} ${p.kode} ${p.kolom}\n      ${JSON.stringify(p.dari)} → ${JSON.stringify(p.ke)}`);
    }

    const sebelum = await totalBelanja(c);
    console.log(`\nTotal SEBELUM : ${JSON.stringify(sebelum)}`);

    if (!APPLY) {
        console.log('\n(dry-run) Tidak ada perubahan ditulis. Jalankan dengan --apply untuk menerapkan.\n');
        await c.end();
        process.exit(0);
    }

    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const stempel = new Date().toISOString().replace(/[:.]/g, '-');
    const berkasCadangan = path.join(BACKUP_DIR, `cleanup-manfaat-${TAHUN}-${stempel}.json`);
    fs.writeFileSync(berkasCadangan, JSON.stringify({ tahun: TAHUN, perubahan, rkpdes: rkpdesRows, rab: rabRows }, null, 2));
    console.log(`\nCadangan       : ${path.relative(ROOT, berkasCadangan)}`);

    await c.query('begin');
    try {
        for (const r of rkpdesRows) {
            if (r.__sasaranBaru === undefined && r.__penerimaBaru === undefined) continue;
            const set = [];
            const val = [];
            if (r.__sasaranBaru !== undefined) { val.push(r.__sasaranBaru); set.push(`sasaran_manfaat = $${val.length}`); }
            if (r.__penerimaBaru !== undefined) { val.push(r.__penerimaBaru); set.push(`penerima_manfaat = $${val.length}`); }
            val.push(r.id);
            const res = await c.query(`update public.rkpdes set ${set.join(', ')} where id = $${val.length}`, val);
            if (res.rowCount !== 1) throw new Error(`jumlah baris rkpdes terpengaruh = ${res.rowCount} (id ${r.id})`);
        }
        for (const r of rabRows) {
            if (!r.__rpjmBaru) continue;
            const res = await c.query(`update public.rab set rpjm_data = $1::jsonb where id = $2`, [JSON.stringify(r.__rpjmBaru), r.id]);
            if (res.rowCount !== 1) throw new Error(`jumlah baris rab terpengaruh = ${res.rowCount} (id ${r.id})`);
        }

        const sesudah = await totalBelanja(c);
        console.log(`Total SESUDAH : ${JSON.stringify(sesudah)}`);
        if (!paritasSama(sebelum, sesudah)) throw new Error('PARITAS ANGKA BERGESER — transaksi dibatalkan');

        await c.query('commit');
        console.log('\n✅ APPLIED: artefak teks bersih, paritas total belanja identik.\n');
    } catch (e) {
        await c.query('rollback');
        console.error(`\n❌ ROLLBACK: ${e.message}\n`);
        await c.end();
        process.exit(1);
    }

    await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
