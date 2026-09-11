#!/usr/bin/env node
/**
 * EXPORT ALL DATA DARI SUPABASE LAMA (HEMAT EGRESS - 1 TARIKAN PER TABEL)
 * 
 * Mengambil seluruh data dari Supabase lama dan menyimpannya ke berkas JSON lokal di:
 * scripts/backup_migration/data/<table_name>.json
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ SUPABASE_URL atau SUPABASE_KEY tidak ditemukan di .env');
    process.exit(1);
}

const TABLES = [
    'rab',
    'rkpdes',
    'du_rkpdes',
    'rpjmdes_standar',
    'rancangan_rkpdes',
    'pagu_anggaran',
    'anggaran',
    'dokumen_templates',
    'prioritas_usulan',
    'usulan',
    'master_klasifikasi',
    'dokumen_desa',
    'dokumen_form_data',
    'dropdown_sdgs',
    'prioritas_rkpdes',
    'users',
    'laporan_komponen_manual',
    'kerjasama_pihak_ketiga',
    'program_masuk_desa',
    'rktl',
    'pembiayaan'
];

const DATA_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function exportTable(table) {
    let allRows = [];
    let offset = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
        const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&order=id.asc&offset=${offset}&limit=${limit}`;
        const res = await fetch(url, {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
                Accept: 'application/json'
            }
        });

        if (!res.ok) {
            // Coba tanpa order=id.asc jika id bukan nama kolom utama
            if (res.status === 400 && offset === 0) {
                const fallbackUrl = `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=${limit}`;
                const fbRes = await fetch(fallbackUrl, {
                    headers: {
                        apikey: SUPABASE_KEY,
                        Authorization: `Bearer ${SUPABASE_KEY}`,
                        Accept: 'application/json'
                    }
                });
                if (!fbRes.ok) {
                    const errTxt = await fbRes.text();
                    return { table, count: 0, error: `${fbRes.status}: ${errTxt}` };
                }
                const data = await fbRes.json();
                allRows = data;
                hasMore = false;
                break;
            }
            const errTxt = await res.text();
            return { table, count: 0, error: `${res.status}: ${errTxt}` };
        }

        const rows = await res.json();
        allRows.push(...rows);

        if (rows.length < limit) {
            hasMore = false;
        } else {
            offset += limit;
        }
    }

    const filePath = path.join(DATA_DIR, `${table}.json`);
    fs.writeFileSync(filePath, JSON.stringify(allRows, null, 2), 'utf-8');
    const sizeKb = (fs.statSync(filePath).size / 1024).toFixed(1);

    return { table, count: allRows.length, sizeKb, path: filePath };
}

(async () => {
    console.log('============================================================');
    console.log('  EKSPOR DATA SUPABASE LAMA KE JSON LOKAL');
    console.log(`  Source: ${SUPABASE_URL}`);
    console.log(`  Output: ${DATA_DIR}`);
    console.log('============================================================\n');

    let totalRows = 0;
    let totalSizeKb = 0;
    const results = [];

    for (const table of TABLES) {
        process.stdout.write(`  Mengekspor ${table.padEnd(25)} ... `);
        try {
            const res = await exportTable(table);
            if (res.error) {
                console.log(`❌ GAGAL (${res.error})`);
                results.push(res);
            } else {
                console.log(`✅ ${res.count.toString().padStart(5)} baris (${res.sizeKb} KB)`);
                totalRows += res.count;
                totalSizeKb += parseFloat(res.sizeKb);
                results.push(res);
            }
        } catch (e) {
            console.log(`❌ ERROR: ${e.message}`);
            results.push({ table, count: 0, error: e.message });
        }
    }

    console.log('\n------------------------------------------------------------');
    console.log(`  TOTAL BARIS BERHASIL DIEKSPOR : ${totalRows.toLocaleString('id-ID')} baris`);
    console.log(`  TOTAL UKURAN PAYLOAD          : ${(totalSizeKb / 1024).toFixed(2)} MB`);
    console.log('============================================================\n');
})();
