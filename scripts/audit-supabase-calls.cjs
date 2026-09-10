#!/usr/bin/env node
/**
 * audit-supabase-calls.cjs
 * =========================
 * Audit mandiri efisiensi egress Supabase (ZERO-WILDCARD EGRESS policy).
 *
 * Memindai semua berkas kode sumber proyek dan GAGAL (exit 1) jika menemukan:
 *   1. `.select('*')`          — wildcard select (menarik semua kolom)
 *   2. `.select()`             — select tanpa argumen (sama dengan wildcard)
 *
 * Dipakai lewat: `npm run audit:egress` (bagian dari `npm run check:all`).
 *
 * Catatan:
 * - Hanya membaca berkas, tidak melakukan koneksi jaringan.
 * - Direktori node_modules, dist, .git, dan artefak build diabaikan.
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Konfigurasi direktori yang dipindai & yang diabaikan
// ---------------------------------------------------------------------------
const PROJECT_ROOT = path.resolve(__dirname, '..');

const SCAN_DIRS = ['src', 'frontend', 'backend', 'components', 'scripts', 'test', 'tests', 'sync-surat-tanah/public'];
const SCAN_FILES = ['server.js', 'main.js', 'preload.js'];
const SCAN_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|html)$/i;

const IGNORE_DIRS = new Set([
  'node_modules', 'dist', 'dist-electron', 'release', 'build', 'out',
  '.git', '.freebuff', '.vercel', 'uploads', 'templates', 'scratch'
]);

// Berkas yang sengaja dikecualikan (bukan kode runtime aplikasi)
const IGNORE_FILES = new Set([
  path.join('sync-surat-tanah', '.vercel', 'output', 'functions', 'api', 'index.func', 'server.js'),
  path.join('sync-surat-tanah', '.vercel', 'output', 'functions', 'index.func', 'server.js'),
  // Skrip audit ini sendiri — berisi contoh pola terlarang di pesan/komentar
  path.join('scripts', 'audit-supabase-calls.cjs')
]);

// ---------------------------------------------------------------------------
// Pola pelanggaran
// ---------------------------------------------------------------------------
// 1) .select('*') — wildcard eksplisit (boleh diikuti argumen opsi kedua)
const WILDCARD_STAR = /\.select\(\s*['"`]\*['"`]/;
// 2) .select() — tanpa argumen sama sekali.
//    Hanya dianggap pelanggaran jika baris tsb bagian dari chain Supabase:
//    ada `.from(` di sekitarnya, atau `.insert(`/`.update(`/`.upsert(`
//    (returning). `elem.select()` (DOM <input>) bukan pelanggaran.
const EMPTY_SELECT = /\.select\(\s*\)/;

function isSupabaseChain(lines, i) {
  // lihat 4 baris sebelum & sesudah baris berisi .select()
  const lo = Math.max(0, i - 4);
  const hi = Math.min(lines.length, i + 2);
  const window = lines.slice(lo, hi).join('\n');
  return /\.from\(['"`]?[\w_]+['"`]?\)|\b(insert|update|upsert)\(/.test(window);
}

// ---------------------------------------------------------------------------
// Kumpulkan daftar berkas
// ---------------------------------------------------------------------------
function collectFiles(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      collectFiles(full, out);
    } else if (entry.isFile()) {
      if (!SCAN_EXT.test(entry.name)) continue;
      const rel = path.relative(PROJECT_ROOT, full);
      if (IGNORE_FILES.has(rel)) continue;
      out.push(full);
    }
  }
}

const files = [];
for (const d of SCAN_DIRS) {
  const abs = path.join(PROJECT_ROOT, d);
  if (fs.existsSync(abs)) collectFiles(abs, files);
}
for (const f of SCAN_FILES) {
  const abs = path.join(PROJECT_ROOT, f);
  if (fs.existsSync(abs) && !files.includes(abs)) files.push(abs);
}

// ---------------------------------------------------------------------------
// Pindai setiap berkas
// ---------------------------------------------------------------------------
const violations = [];
let scannedCount = 0;

for (const file of files) {
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  scannedCount++;
  const relPath = path.relative(PROJECT_ROOT, file).replace(/\\/g, '/');

  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Lewati baris komentar yang mencontohkan pola terlarang
    const codePart = line.replace(/\/\/.*$/, '').trim();
    if (!codePart) continue;

    if (WILDCARD_STAR.test(codePart)) {
      violations.push({
        file: relPath,
        line: i + 1,
        rule: 'ZERO-WILDCARD EGRESS',
        reason: "`.select('*')` dilarang — sebutkan daftar kolom eksplisit",
        snippet: line.trim().slice(0, 160)
      });
    }
    if (EMPTY_SELECT.test(codePart) && isSupabaseChain(lines, i)) {
      violations.push({
        file: relPath,
        line: i + 1,
        rule: 'ZERO-WILDCARD EGRESS',
        reason: '`.select()` tanpa parameter dilarang — sebutkan daftar kolom eksplisit',
        snippet: line.trim().slice(0, 160)
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Laporan
// ---------------------------------------------------------------------------
console.log('='.repeat(72));
console.log(' AUDIT EGRESS SUPABASE — ZERO-WILDCARD SELECT POLICY');
console.log('='.repeat(72));
console.log(` Berkas dipindai : ${scannedCount}`);
console.log(` Pelanggaran     : ${violations.length}`);
console.log('-'.repeat(72));

if (violations.length > 0) {
  for (const v of violations) {
    console.log(`\n✗ ${v.file}:${v.line}`);
    console.log(`  Aturan : ${v.rule}`);
    console.log(`  Alasan : ${v.reason}`);
    console.log(`  Kode   : ${v.snippet}`);
  }
  console.log('\n' + '='.repeat(72));
  console.log(`❌ GAGAL: ${violations.length} pelanggaran pola select ditemukan.`);
  console.log('   Perbaiki dengan daftar kolom eksplisit (lihat agent_rules.md §1).');
  console.log('='.repeat(72));
  process.exit(1);
}

console.log('✅ LOLOS: tidak ada .select(\'*\') atau .select() kosong di seluruh kode sumber.');
console.log('='.repeat(72));
process.exit(0);
