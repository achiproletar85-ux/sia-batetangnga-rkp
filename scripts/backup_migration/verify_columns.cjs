#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, 'data');
const DDL_PATH = path.resolve(__dirname, '../setup_new_database.sql');

const ddl = fs.readFileSync(DDL_PATH, 'utf-8');

let hasMissing = false;

fs.readdirSync(DATA_DIR).forEach(f => {
    if (!f.endsWith('.json')) return;
    const table = f.replace('.json', '');
    const rows = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f)));
    if (rows.length === 0) return;

    // Cari blok create table untuk table ini
    const tableRegex = new RegExp(`CREATE TABLE[\\s\\S]*?public\\.${table}\\s*\\(([\\s\\S]*?)\\);`, 'i');
    const match = ddl.match(tableRegex);
    if (!match) {
        console.error(`❌ Tabel ${table} tidak ditemukan di DDL!`);
        hasMissing = true;
        return;
    }

    const tableDef = match[1];
    const missingCols = [];

    const keys = new Set();
    rows.forEach(r => Object.keys(r).forEach(k => keys.add(k)));

    keys.forEach(k => {
        // Regex cari nama kolom sebagai kata terpisah di tableDef
        const colRegex = new RegExp(`\\b${k}\\b`, 'i');
        if (!colRegex.test(tableDef)) {
            missingCols.push(k);
        }
    });

    if (missingCols.length > 0) {
        console.log(`⚠️ Tabel ${table.padEnd(25)} kurang kolom: ${missingCols.join(', ')}`);
        hasMissing = true;
    } else {
        console.log(`✅ Tabel ${table.padEnd(25)} semua ${keys.size} kolom lengkap di DDL.`);
    }
});

if (!hasMissing) {
    console.log('\n🎉 SEMUA KOLOM 100% LENGKAP & COCOK DENGAN DDL!');
}
