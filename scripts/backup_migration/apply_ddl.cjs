#!/usr/bin/env node
/**
 * EKSEKUSI DDL KE SUPABASE BARU MENGGUNAKAN PG CLIENT
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const NEW_DB_URL = 'postgresql://postgres:buajalekkong@db.kzvnzgoxzaplaztbvzjy.supabase.co:5432/postgres';
const DDL_PATH = path.resolve(__dirname, '../setup_new_database.sql');

(async () => {
    console.log('============================================================');
    console.log('  APPLY DDL KE SUPABASE BARU (kzvnzgoxzaplaztbvzjy)');
    console.log('============================================================\n');

    const ddl = fs.readFileSync(DDL_PATH, 'utf-8');
    const client = new Client({
        connectionString: NEW_DB_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔌 Menghubungkan ke database PostgreSQL Supabase baru...');
        await client.connect();
        console.log('✅ Berhasil terhubung!');

        console.log('🚀 Menjalankan DDL SQL...');
        await client.query(ddl);
        console.log('✅ Seluruh skema DDL berhasil dieksekusi!');

        // Verifikasi tabel yang terbentuk
        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);
        console.log('\n📋 Daftar Tabel yang terbentuk di Supabase baru:');
        res.rows.forEach(r => console.log(`   - ${r.table_name}`));

        // Verifikasi constraint unik pada rab
        const cRes = await client.query(`
            SELECT conname, pg_get_constraintdef(oid) 
            FROM pg_constraint 
            WHERE conrelid = 'public.rab'::regclass;
        `);
        console.log('\n🔒 Constraints pada tabel rab:');
        cRes.rows.forEach(r => console.log(`   - ${r.conname}: ${r.pg_get_constraintdef}`));

    } catch (e) {
        console.error('❌ Gagal menjalankan DDL:', e);
        process.exit(1);
    } finally {
        await client.end();
    }
    console.log('\n============================================================');
})();
