#!/usr/bin/env node
/**
 * UJI MANDIRI PENJAGA NO-UNDEF (scripts/audit-undeclared-vars.cjs)
 * ---------------------------------------------------------------------------
 * Penjaga variabel tak terdeklarasi tidak boleh "membusuk diam-diam": bila
 * tokenizer-nya longgar, ia akan meloloskan bug seperti `activeRkpTab` lagi.
 * Uji ini membuktikan dua arah sekaligus:
 *
 *   A. HARUS GAGAL — konstruksi hantu (variabel hantu, ternary, implicit global,
 *      template + regex) benar-benar terdeteksi dan keluar dengan exit code 1.
 *   B. HARUS LOLOS — konstruksi sah yang dulu sempat jadi false positive
 *      (destructuring default, catch param, arrow/method param, kunci objek,
 *      regex sesudah `||`, multi-deklarator, helper global dari <script> inline)
 *      TIDAK dilaporkan sebagai hantu.
 *
 * Fixture ditulis sementara di scratch/self-test-no-undef/ lalu dihapus lagi
 * (scratch/ sudah diabaikan .gitignore dan audit egress).
 *
 * Dipakai lewat: `npm run test:undeclared` (bagian dari `npm run check:all`).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const GUARD = path.join('scripts', 'audit-undeclared-vars.cjs');
const FIX_DIR = path.join(ROOT, 'scratch', 'self-test-no-undef');

let pass = 0;
let fail = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ ${message}`);
        pass++;
    } else {
        console.error(`  ❌ GAGAL: ${message}`);
        fail++;
    }
}

// Tanpa `target` → jalankan terhadap seluruh target baku (frontend/*.js + server.js).
function jalankan(target) {
    const arg = target ? [GUARD, target] : [GUARD];
    const res = spawnSync(process.execPath, arg, { cwd: ROOT, encoding: 'utf8' });
    return { code: res.status, out: `${res.stdout || ''}${res.stderr || ''}` };
}

function tulisFixture(nama, isi) {
    const rel = path.join('scratch', 'self-test-no-undef', nama);
    fs.writeFileSync(path.join(ROOT, rel), isi, 'utf8');
    return rel.split(path.sep).join('/');
}

console.log('\n=== UJI MANDIRI PENJAGA NO-UNDEF (audit-undeclared-vars) ===\n');
fs.mkdirSync(FIX_DIR, { recursive: true });

try {
    // -----------------------------------------------------------------------
    // A. Fixture BERISI hantu → wajib exit 1 dan nama hantu dilaporkan
    // -----------------------------------------------------------------------
    console.log('A. Konstruksi hantu harus TERDETEKSI (exit 1)');

    const kasusHantu = [
        ['hantu-referror.js',
            "function f() {\n    if (activeRkpTab === 'perubahan') { return 1; }\n    return 0;\n}\n",
            ['activeRkpTab'], 'bug asli: state tab hantu `activeRkpTab`'],
        ['hantu-implicit-global.js',
            'function f() {\n    hantuAngka = 5;\n    const a = hantuLain + 1;\n    return a + hantuAngka;\n}\n',
            ['hantuAngka', 'hantuLain'], 'implicit global + variabel hantu'],
        ['hantu-ternary.js',
            "function f(x) {\n    const rx = /^ADD\\b/i.test('add') ? ghostTernary : 0;\n    if (x || ghostOperator) { return rx; }\n    return 0;\n}\n",
            ['ghostTernary', 'ghostOperator'], 'cabang ternary & logika setelah `||`'],
        ['hantu-template-regex.js',
            "function f(list) {\n    return list.map((v) => `${v.replace(/\"/g, '')}${hantuTemplate}`).join(String(bulanHantu.length));\n}\n",
            ['hantuTemplate', 'bulanHantu'], 'template literal berisi regex & interpolasi'],
        ['hantu-handler.js',
            'function f(event) {\n    event.preventDefault();\n    toggleHantu(event);\n}\n',
            ['toggleHantu'], 'pemanggilan handler yang tidak pernah dideklarasikan'],
    ];

    for (const [nama, isi, harusAda, deskripsi] of kasusHantu) {
        const rel = tulisFixture(nama, isi);
        const { code, out } = jalankan(rel);
        const semuaTerlapor = harusAda.every((n) => out.includes(n));
        assert(code === 1 && semuaTerlapor,
            `terdeteksi: ${deskripsi} → ${harusAda.join(', ')} (exit=${code})`);
    }

    // -----------------------------------------------------------------------
    // B. Fixture SAH → wajib exit 0 (anti false positive)
    // -----------------------------------------------------------------------
    console.log('\nB. Konstruksi sah harus LOLOS (exit 0)');

    const kasusSah = [
        ['sah-destructuring-default.js',
            'function simpan(opts) {\n' +
            '    const { silent = false, reload = true } = opts || {};\n' +
            '    if (reload) { return silent ? 1 : 2; }\n' +
            '    return 0;\n' +
            '}\n' +
            'function ganda(ka, kb) {\n' +
            '    const da = ka[0] || 0, db = kb[0] || 0;\n' +
            '    return da + db;\n' +
            '}\n',
            'destructuring default + multi-deklarator'],
        ['sah-params.js',
            'function f(a, b = 1, ...sisa) {\n' +
            '    try { return a + b + sisa.length; }\n' +
            '    catch (errSync) { return String(errSync.message); }\n' +
            '}\n' +
            'const arrow = (x, { y = 1 } = {}) => x + y;\n' +
            'const satu = (z) => z * 2;\n' +
            'const o = {\n' +
            '    metode(p, q) { return p + q; },\n' +
            '};\n' +
            'function loop(peta) {\n' +
            '    const hasil = [];\n' +
            '    for (const [nama, isi] of Object.entries(peta)) { hasil.push(nama + arrow(1, { y: isi })); }\n' +
            '    for (const { kode } of hasil) { hasil.push(o.metode(1, 2)); }\n' +
            '    return hasil;\n' +
            '}\n',
            'parameter fungsi/arrow/metode, catch, for-of destructuring'],
        ['sah-objek-regex.js',
            'function f(error, tanggal) {\n' +
            '    const fmt = tanggal.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });\n' +
            '    const g = { day: 1, month: 2, year: 3 };\n' +
            '    const perlu = error.code === "X" || /Could not find the \\u0027fields\\u0027 column/.test(error.message);\n' +
            '    return fmt + g.day + String(perlu);\n' +
            '}\n',
            'kunci objek literal + regex sesudah `||`'],
        ['sah-global-html.js',
            "function f() {\n" +
            "    if (typeof syncAccSection === 'function') { syncAccSection('rab-form-panel'); }\n" +
            "    return 1;\n" +
            "}\n",
            'helper global dari <script> inline rab.html'],
    ];

    for (const [nama, isi, deskripsi] of kasusSah) {
        const rel = tulisFixture(nama, isi);
        const { code, out } = jalankan(rel);
        // NB: pesan "LOLOS" juga memuat frasa 'identifier tanpa deklarasi', jadi
        // ekstraksi harus memakai pola bernoktah dua, bukan sekadar includes().
        const cocok = out.match(/identifier tanpa deklarasi: (.+)/);
        const laporan = cocok ? ` → ${cocok[1].trim()}` : '';
        assert(code === 0, `bersih: ${deskripsi} (exit=${code})${laporan}`);
    }

    // -----------------------------------------------------------------------
    // C. Integrasi pipeline & kondisi nyata repo
    // -----------------------------------------------------------------------
    console.log('\nC. Integrasi pipeline & kondisi repo nyata');

    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const skrip = pkg.scripts || {};
    assert(typeof skrip['audit:undeclared'] === 'string' && skrip['audit:undeclared'].includes('audit-undeclared-vars.cjs'),
        'npm run audit:undeclared terdaftar di package.json');
    assert(typeof skrip['check:all'] === 'string' && skrip['check:all'].includes('audit:undeclared'),
        'penjaga no-undef tersambung ke npm run check:all (exit code 1 bila ada hantu)');

    const repo = jalankan(); // tanpa argumen → seluruh target baku (frontend/*.js + server.js)
    assert(repo.code === 0, `seluruh berkas target repo BERSIH dari variabel hantu (exit=${repo.code})`);

    const rkpdes = fs.readFileSync(path.join(ROOT, 'frontend', 'rkpdes.js'), 'utf8');
    // NB: `//[^\n]*` (bukan `//.*$`) karena berkas ini ber-CRLF — `.` tidak
    // mencocokkan `\r`, sehingga pola `.*$` gagal membuang komentar di baris CRLF.
    const dipakaiSebagaiKode = rkpdes.split('\n').some((baris) => {
        const tanpaKomentar = baris.replace(/\/\/[^\n]*/g, '');
        return /\bactiveRkpTab\b/.test(tanpaKomentar);
    });
    assert(!dipakaiSebagaiKode, 'regresi `activeRkpTab` tidak kembali sebagai kode (hanya boleh di komentar) di frontend/rkpdes.js');

    const rabHtml = fs.readFileSync(path.join(ROOT, 'frontend', 'rab.html'), 'utf8');
    assert(rabHtml.includes('window.syncAccSection = syncAccSection'),
        'helper global cross-file (syncAccSection) memang dideklarasikan di <script> inline rab.html');
} finally {
    fs.rmSync(FIX_DIR, { recursive: true, force: true });
}

console.log(`\n=== HASIL: ${pass} LULUS / ${fail} GAGAL ===\n`);
process.exit(fail === 0 ? 0 : 1);
