#!/usr/bin/env node
/**
 * IMPORT ALL DATA KE SUPABASE BARU
 * Membaca data JSON dari scripts/backup_migration/data/<table_name>.json
 * dan memasukkannya ke database Supabase baru via pg client (batch 100 baris).
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const NEW_DB_URL = 'postgresql://postgres:buajalekkong@db.kzvnzgoxzaplaztbvzjy.supabase.co:5432/postgres';
const DATA_DIR = path.resolve(__dirname, 'data');

const TABLES = [
    'users',
    'master_klasifikasi',
    'dropdown_sdgs',
    'anggaran',
    'pagu_anggaran',
    'dokumen_templates',
    'pembiayaan',
    'kerjasama_pihak_ketiga',
    'usulan',
    'prioritas_usulan',
    'rpjmdes_standar',
    'rancangan_rkpdes',
    'prioritas_rkpdes',
    'du_rkpdes',
    'rkpdes',
    'rab',
    'dokumen_desa',
    'dokumen_form_data',
    'rktl',
    'laporan_komponen_manual',
    'program_masuk_desa'
];

async function importTable(client, table) {
    const jsonPath = path.join(DATA_DIR, `${table}.json`);
    if (!fs.existsSync(jsonPath)) {
        return { table, imported: 0, status: 'SKIPPED (no file)' };
    }

    const rows = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    if (rows.length === 0) {
        return { table, imported: 0, status: 'SKIPPED (0 rows)' };
    }

    // Ambil kolom yang ada pada tabel target di database
    const colRes = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1;
    `, [table]);

    const dbCols = new Set(colRes.rows.map(r => r.column_name));
    const dbTypeMap = new Map(colRes.rows.map(r => [r.column_name, r.data_type]));

    // Saring kolom row agar hanya kolom yang ada di database
    const sample = rows[0];
    const targetCols = Object.keys(sample).filter(c => dbCols.has(c));

    if (targetCols.length === 0) {
        return { table, imported: 0, status: 'ERROR (no matching columns)' };
    }

    // Kosongkan tabel dulu jika ada data (idempoten)
    await client.query(`TRUNCATE TABLE public.${table} CASCADE;`);

    const batchSize = 100;
    let totalImported = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const valuePlaceholders = [];
        const values = [];
        let paramIdx = 1;

        for (const row of batch) {
            const rowPlaceholders = [];
            for (const col of targetCols) {
                let val = row[col];
                const colType = dbTypeMap.get(col);

                if (colType === 'jsonb' || colType === 'json') {
                    if (val !== null && val !== undefined && typeof val === 'object') {
                        val = JSON.stringify(val);
                    }
                }
                values.push(val);
                rowPlaceholders.push(`$${paramIdx++}`);
            }
            valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
        }

        const query = `
            INSERT INTO public.${table} (${targetCols.join(', ')})
            VALUES ${valuePlaceholders.join(', ')};
        `;

        await client.query(query, values);
        totalImported += batch.length;
    }

    // Sinkronisasi PostgreSQL sequence jika ada kolom serial id
    try {
        await client.query(`
            DO $$
            DECLARE
                seq_name text;
            BEGIN
                seq_name := pg_get_serial_sequence('public.${table}', 'id');
                IF seq_name IS NOT NULL THEN
                    EXECUTE format('SELECT setval(%L, COALESCE((SELECT MAX(id) FROM public.%I), 1))', seq_name, '${table}');
                END IF;
            END $$;
        `);
    } catch (seqErr) {
        // Abaikan jika tabel tidak memiliki sequence 'id'
    }

    return { table, imported: totalImported, status: 'OK' };
}

(async () => {
    console.log('============================================================');
    console.log('  IMPOR DATA KE SUPABASE BARU (kzvnzgoxzaplaztbvzjy)');
    console.log('============================================================\n');

    const client = new Client({
        connectionString: NEW_DB_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔌 Menghubungkan ke PostgreSQL Supabase baru...');
        await client.connect();
        console.log('✅ Terhubung!\n');

        let grandTotal = 0;
        for (const table of TABLES) {
            process.stdout.write(`  Mengimpor ${table.padEnd(25)} ... `);
            const res = await importTable(client, table);
            if (res.status === 'OK') {
                console.log(`✅ ${res.imported.toString().padStart(5)} baris`);
                grandTotal += res.imported;
            } else {
                console.log(`ℹ️  ${res.status}`);
            }
        }

        console.log('\n------------------------------------------------------------');
        console.log(`  TOTAL BARIS BERHASIL DIIMPOR: ${grandTotal.toLocaleString('id-ID')} baris`);
        console.log('============================================================\n');

        // Verifikasi perbandingan row count
        console.log('🔍 VERIFIKASI PERBANDINGAN DATA LAMA VS BARU:');
        for (const table of TABLES) {
            const countRes = await client.query(`SELECT COUNT(*) FROM public.${table};`);
            const dbCount = parseInt(countRes.rows[0].count);

            const jsonPath = path.join(DATA_DIR, `${table}.json`);
            let jsonCount = 0;
            if (fs.existsSync(jsonPath)) {
                jsonCount = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')).length;
            }

            const match = dbCount === jsonCount;
            const icon = match ? '✅' : '❌ MISMATCH';
            console.log(`   ${table.padEnd(25)} : Backup=${jsonCount.toString().padStart(4)} | New DB=${dbCount.toString().padStart(4)} ${icon}`);
        }

    } catch (e) {
        console.error('\n❌ Gagal saat impor data:', e);
        process.exit(1);
    } finally {
        await client.end();
    }
    console.log('\n============================================================');
})();
