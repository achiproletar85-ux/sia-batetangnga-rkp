#!/usr/bin/env node
/**
 * AUDIT VARIABEL TAK TERDEKLARASI (NO-UNDEF GUARD) — tanpa dependensi tambahan.
 * ---------------------------------------------------------------------------
 * Latar belakang: `node --check` hanya memvalidasi sintaks. Identifier yang tidak
 * pernah dideklarasikan (mis. `activeRkpTab` di frontend/rkpdes.js) baru meletus
 * sebagai ReferenceError saat runtime, menghentikan sisa eksekusi event handler.
 * Skrip ini memindai kode dan GAGAL (exit 1) bila menemukan identifier yang
 * dipakai tetapi tidak dideklarasikan di mana pun pada modul frontend/backend.
 *
 * Cara kerja (tokenizer + analisis deklarasi, bukan sekadar regex):
 *   1. Buang komentar & literal string/template/regex dengan tokenizer sadar-nested
 *      (`${...}` di dalam template ikut dipindai sebagai kode).
 *   2. Kumpulkan semua nama yang dideklarasikan: let/const/var (termasuk
 *      destructuring), function, class, parameter (fungsi & arrow), catch, import,
 *      serta properti `window.x = ...`.
 *   3. Kumpulkan referensi identifier (bukan `obj.prop`, bukan kunci objek `key:`).
 *   4. Himpunan deklarasi digabung lintas berkas karena halaman memuat beberapa
 *      skrip yang saling berbagi variabel global (mis. showToast di rab.js).
 *   5. Sisanya harus ada di daftar global bawaan browser/Node atau daftar library
 *      eksternal (CDN) di bawah — kalau tidak: VIOLASI.
 *
 * Pemakaian:
 *   node scripts/audit-undeclared-vars.cjs                # seluruh target baku
 *   node scripts/audit-undeclared-vars.cjs frontend/rab.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Target yang diperiksa (berkas JS kritis aplikasi).
const DEFAULT_TARGETS = [
    'frontend/rkpdes.js',
    'frontend/rab.js',
    'frontend/rktl.js',
    'frontend/notulensi.js',
    'frontend/pagu-indikatif.js',
    'frontend/pembiayaan.js',
    'frontend/rpjmdesModule.js',
    'frontend/prioritas.js',
    'frontend/prioritas-usulan.js',
    'frontend/rancangan-rkpdes.js',
    'frontend/du-rkpdes.js',
    'frontend/usulan.js',
    'frontend/stunting.js',
    'frontend/verifikasi-proposal.js',
    'frontend/evaluasi.js',
    'frontend/kerjasama.js',
    'frontend/kerjasama-pihak-ketiga.js',
    'frontend/laporan-perkembangan.js',
    'frontend/program-masuk-desa.js',
    'frontend/dokumen-desa.js',
    'frontend/data-perencanaan.js',
    'frontend/normalisasi-rkpdes.js',
    'frontend/index.js',
    'frontend/auth.js',
    'frontend/sdgs.js',
    'server.js'
];

// Deklarasi lintas berkas: baca semua berkas frontend/*.js + server.js agar
// variabel global yang dibagikan antar skrip halaman tidak dianggap hantu.
const DECL_SOURCES = [
    ...fs.readdirSync(path.join(ROOT, 'frontend')).filter((f) => f.endsWith('.js')).map((f) => `frontend/${f}`),
    'server.js'
];

// Halaman HTML memuat <script> inline yang mendeklarasikan helper global
// (mis. `window.syncAccSection = syncAccSection` di frontend/rab.html). Tanpa
// memindai blok tersebut, helper halaman yang SAH akan dilaporkan sebagai hantu.
const HTML_SOURCES = [
    ...fs.readdirSync(path.join(ROOT, 'frontend')).filter((f) => f.endsWith('.html')).map((f) => `frontend/${f}`),
    'index.html'
];

function extractInlineScripts(html) {
    const blocks = [];
    const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
        const attrs = (m[1] || '').toLowerCase();
        if (/\bsrc\s*=/.test(attrs)) continue;                       // skrip eksternal
        const typeMatch = attrs.match(/\btype\s*=\s*["']([^"']+)["']/);
        const type = typeMatch ? typeMatch[1].toLowerCase() : 'text/javascript';
        if (!(type.includes('javascript') || type.includes('module') || type === 'text/babel')) continue;
        blocks.push(m[2]);
    }
    return blocks;
}

const KEYWORDS = new Set(['break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
    'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'function', 'if', 'import', 'in',
    'instanceof', 'let', 'new', 'return', 'super', 'switch', 'this', 'throw', 'try', 'typeof', 'var',
    'void', 'while', 'with', 'yield', 'async', 'await', 'static', 'get', 'set', 'of', 'as', 'from',
    'true', 'false', 'null', 'undefined', 'NaN', 'Infinity', 'arguments', 'eval']);

// Global bawaan browser + Node + library CDN yang dipakai halaman.
const BUILTIN_GLOBALS = new Set([
    // Browser
    'window', 'document', 'navigator', 'location', 'history', 'screen', 'console', 'localStorage',
    'sessionStorage', 'indexedDB', 'fetch', 'Headers', 'Request', 'Response', 'AbortController',
    'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame',
    'cancelAnimationFrame', 'requestIdleCallback', 'queueMicrotask', 'alert', 'confirm', 'prompt',
    'Number', 'String', 'Boolean', 'Math', 'Array', 'Object', 'JSON', 'Date', 'RegExp', 'Error',
    'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError', 'EvalError', 'URIError', 'AggregateError',
    'Map', 'Set', 'WeakMap', 'WeakSet', 'Promise', 'Symbol', 'Proxy', 'WeakRef', 'FinalizationRegistry',
    'Reflect', 'BigInt', 'Intl', 'URL', 'URLSearchParams', 'FormData', 'Blob', 'File', 'FileReader',
    'FileList', 'Image', 'Audio', 'Video', 'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent',
    'EventTarget', 'Node', 'NodeList', 'Element', 'HTMLElement', 'HTMLInputElement', 'CSS', 'CSSStyleSheet',
    'MutationObserver', 'IntersectionObserver', 'ResizeObserver', 'DOMParser', 'XMLHttpRequest',
    'TextEncoder', 'TextDecoder', 'isNaN', 'isFinite', 'parseInt', 'parseFloat', 'encodeURI',
    'encodeURIComponent', 'decodeURI', 'decodeURIComponent', 'btoa', 'atob', 'structuredClone',
    'getComputedStyle', 'matchMedia', 'performance', 'crypto', 'CanvasRenderingContext2D',
    'WebSocket', 'Worker', 'Notification', 'ClipboardItem', 'Text', 'Comment', 'DocumentFragment',
    'scrollTo', 'scrollBy', 'open', 'close', 'print', 'focus', 'blur', 'self', 'top', 'parent',
    'frames', 'globalThis', 'devicePixelRatio', 'innerWidth', 'innerHeight', 'isSecureContext',
    // Node.js
    'process', 'require', 'module', 'exports', '__dirname', '__filename', 'Buffer', 'global',
    'setImmediate', 'clearImmediate', 'URLSearchParams', 'TextEncoder', 'TextDecoder',
    // Library CDN (index.html)
    'supabase', 'createClient', 'tailwind', 'Chart', 'XLSX', 'jspdf', 'html2canvas', 'Swal', 'L',
    'Sortable', 'Quill', 'Flatpickr', 'flatpickr', 'bootstrap', 'moment', 'pdfjsLib', 'JSZip', '$',
    'jQuery', 'axios', 'dayjs', 'Choices', 'TomSelect', 'select2'
]);

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------
function tokenize(src, out = [], offset = 0) {
    let i = 0;
    const n = src.length;
    const push = (tok, at) => { out.push({ ...tok, pos: offset + at }); };
    const last = () => out[out.length - 1];
    // Token bermakna terakhir (lewati newline) — dipakai untuk membedakan
    // literal regex `/.../` dari operator pembagian `/`.
    const prevSignificant = () => {
        for (let k = out.length - 1; k >= 0; k--) if (out[k].t !== 'nl') return out[k];
        return null;
    };
    // Tanda yang boleh mendahului literal regex (bukan pembagian). Mencakup operator
    // multi-karakter (mis. `||`, `&&`, `===`) supaya `/…/` setelah `||` tidak dibaca
    // sebagai pembagian — inilah yang dulu memunculkan hantu "Could not find the".
    const regexPreceding = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '=>', '+', '-', '*', '%', '<', '>', 'return', 'typeof', 'case', 'in', 'of', 'do', 'else', 'void', 'delete', 'new',
        '||', '&&', '??', '==', '===', '!=', '!==', '<=', '>=', '+=', '-=', '*=', '/=', '%=']);
    // Token yang MENGAKHIRI sebuah nilai; `/` sesudahnya adalah pembagian.
    const valueEnding = new Set([')', ']', '}', '++', '--']);

    // Tumpukan konteks template literal: { mode: 'text' | 'code', depth }
    // Saat 'text', isi template diabaikan. Saat `${`, mode berubah menjadi 'code'
    // sehingga ekspresi di dalamnya dipindai dengan aturan JS normal (string, regex,
    // komentar, kurung ikut dihitung) — inilah yang membuat `replace(/"/g, ...)`
    // di dalam template tidak lagi merusak pemindaian.
    const stack = [];

    while (i < n) {
        const c = src[i];
        const c2 = src[i + 1];
        const frame = stack[stack.length - 1];

        // mode teks template: konsumsi teks mentah
        if (frame && frame.mode === 'text') {
            if (c === '\\') { i += 2; continue; }
            if (c === '`') { stack.pop(); i++; continue; }
            if (c === '$' && c2 === '{') {
                frame.mode = 'code';
                frame.depth = 1;
                i += 2;
                continue;
            }
            i++;
            continue;
        }

        // komentar
        if (c === '/' && c2 === '/') {
            while (i < n && src[i] !== '\n') i++;
            continue;
        }
        if (c === '/' && c2 === '*') {
            i += 2;
            while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
            i += 2;
            continue;
        }
        // spasi / newline
        if (c === '\n') { push({ t: 'nl', v: '\n' }, i); i++; continue; }
        if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }

        // string
        if (c === "'" || c === '"') {
            const start = i;
            const quote = c;
            i++;
            while (i < n && src[i] !== quote) {
                if (src[i] === '\\') i++;
                i++;
            }
            i++;
            push({ t: 'lit', v: 'str' }, start);
            continue;
        }

        // awal template literal → masuk mode teks
        if (c === '`') {
            const tmplStart = i;
            stack.push({ mode: 'text', depth: 0 });
            push({ t: 'lit', v: 'template' }, tmplStart);
            i++;
            continue;
        }

        // regex literal
        if (c === '/') {
            const p = prevSignificant();
            const bolehRegex = !p
                || (p.t === 'k' && regexPreceding.has(p.v))
                || (p.t === 'p' && (regexPreceding.has(p.v) || !valueEnding.has(p.v)))
                || (p.t === 'lit' && p.v === 'num');
            if (bolehRegex) {
                const rxStart = i;
                i++;
                let inClass = false;
                while (i < n) {
                    const ch = src[i];
                    if (ch === '\\') { i += 2; continue; }
                    if (ch === '[') inClass = true;
                    else if (ch === ']') inClass = false;
                    else if (ch === '/' && !inClass) break;
                    else if (ch === '\n') break;
                    i++;
                }
                i++;
                while (i < n && /[a-z]/i.test(src[i])) i++;
                push({ t: 'lit', v: 'regex' }, rxStart);
                continue;
            }
            push({ t: 'p', v: '/' }, i);
            i++;
            continue;
        }

        // number
        if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(c2 || ''))) {
            const numStart = i;
            while (i < n && /[0-9a-fxXoObBeE._]/.test(src[i])) i++;
            push({ t: 'lit', v: 'num' }, numStart);
            continue;
        }

        // identifier / keyword
        if (/[A-Za-z_$]/.test(c)) {
            const start = i;
            while (i < n && /[\w$]/.test(src[i])) i++;
            const word = src.slice(start, i);
            push({ t: KEYWORDS.has(word) ? 'k' : 'id', v: word }, start);
            continue;
        }

        // operator / punctuation (multi-char sederhana)
        const three = src.slice(i, i + 3);
        const two = src.slice(i, i + 2);
        if (['?.', '=>', '===', '!==', '??='].includes(three)) { push({ t: 'p', v: three }, i); i += 3; continue; }
        if (['?.', '=>', '==', '!=', '<=', '>=', '&&', '||', '??', '++', '--', '+=', '-=', '*=', '/=', '...', '**'].includes(two)) {
            push({ t: 'p', v: two }, i);
            i += 2;
            continue;
        }
        // Di dalam ekspresi ${ ... }, hitung kurung agar tahu kapan kembali ke teks template.
        if (frame && frame.mode === 'code') {
            if (c === '{') frame.depth++;
            else if (c === '}' && --frame.depth <= 0) frame.mode = 'text';
        }
        push({ t: 'p', v: c }, i);
        i++;
    }
    return out;
}

// ---------------------------------------------------------------------------
// Analisis deklarasi & referensi
// ---------------------------------------------------------------------------
function collectDeclarations(tokens, declared) {
    // pola binding: id | {a, b: c, ...d} | [x, ...y]
    // Pola binding deklarasi: id | {a, b: c, ...d} | [x, ...y] — berhenti di `;`
    // (initializer dilewati dengan pelacakan kedalaman kurung agar `f(a, b)` tidak
    // dianggap sebagai variabel berikutnya).
    // `collectPattern` memindai bagian kiri sebuah deklarasi dan mengumpulkan
    // nama binding. Ia harus membedakan dua konteks:
    //   • 'pattern' — posisi nama boleh diambil (`const { a: b, c = 1 } = …`)
    //   • 'value'   — ekspresi/initializer, semua identifier adalah referensi
    // Tumpukan `modeStack` menyimpan mode tiap kedalaman sehingga `,` di dalam
    // pola tetap memisahkan binding, sedangkan `,` di dalam pemanggilan/objek
    // literal tidak pernah dianggap deklarasi.
    function collectPattern(startIdx) {
        let i = startIdx;
        let expectName = true;
        let seenAssign = false; // sudah mencapai initializer di kedalaman 0
        let depth = 0;
        const modeStack = [];
        const mode = () => (modeStack.length ? modeStack[modeStack.length - 1] : 'pattern');
        while (i < tokens.length) {
            const tk = tokens[i];
            if (tk.t === 'nl') { i++; continue; }
            if (tk.t === 'p' && tk.v === '(') { depth++; modeStack.push('value'); expectName = false; i++; continue; }
            if (tk.t === 'p' && tk.v === ')') { depth = Math.max(0, depth - 1); modeStack.pop(); expectName = false; i++; continue; }
            // `{`/`[` adalah pola bila nama masih diharapkan, selain itu nilai
            // (mis. objek literal pada nilai default: `const { a = { x: 1 } } = o`).
            if (tk.t === 'p' && (tk.v === '{' || tk.v === '[')) {
                const asPattern = expectName && !seenAssign;
                depth++;
                modeStack.push(asPattern ? 'pattern' : 'value');
                expectName = asPattern;
                i++;
                continue;
            }
            if (tk.t === 'p' && (tk.v === '}' || tk.v === ']')) { depth = Math.max(0, depth - 1); modeStack.pop(); expectName = false; i++; continue; }
            if (tk.t === 'p' && tk.v === ',') {
                if (depth === 0) { seenAssign = false; expectName = true; }        // deklarator berikutnya
                else if (mode() === 'pattern') expectName = true;                  // binding berikutnya
                else expectName = false;                                           // argumen/properti berikutnya
                i++;
                continue;
            }
            // `{ a: b }` → `b` adalah binding; `{ x: 1 }` pada posisi nilai bukan binding.
            if (tk.t === 'p' && tk.v === ':') { expectName = mode() === 'pattern'; i++; continue; }
            if (tk.t === 'p' && tk.v === '...') { expectName = mode() === 'pattern'; i++; continue; }
            if (tk.t === 'p' && tk.v === '=') {
                if (depth === 0) seenAssign = true; // initializer deklarasi
                expectName = false;                 // nilai default / ekspresi
                i++;
                continue;
            }
            // berhenti di akhir statement/kontrol: sisa di dalam body fungsi akan
            // dipindai oleh loop utama sehingga `const` di dalam arrow body tidak hilang
            if (tk.t === 'p' && tk.v === ';') return i + 1;
            if (tk.t === 'k' && (tk.v === 'of' || tk.v === 'in')) return i + 1; // for (const x of ...)
            if (tk.t === 'k' && ['let', 'const', 'var', 'function', 'class', 'return', 'if', 'for', 'while', 'switch', 'try', 'catch', 'throw'].includes(tk.v)) {
                return i; // statement baru tanpa `;` sebelumnya
            }
            if (tk.t === 'id' && expectName && !seenAssign && mode() === 'pattern') { declared.add(tk.v); expectName = false; i++; continue; }
            expectName = false;
            i++;
        }
        return i;
    }

    for (let i = 0; i < tokens.length; i++) {
        const tk = tokens[i];
        if (tk.t === 'k' && ['let', 'const', 'var'].includes(tk.v)) {
            i = collectPattern(i + 1) - 1;
            continue;
        }
        if (tk.t === 'k' && tk.v === 'function') {
            let j = i + 1;
            while (tokens[j] && tokens[j].t === 'nl') j++;
            if (tokens[j] && tokens[j].t === 'id') { declared.add(tokens[j].v); j++; }
            if (tokens[j] && tokens[j].t === 'p' && tokens[j].v === '*') j++; // generator
            // NB: bandingkan `.v`, bukan `.t` — token kurung bertipe 'p'.
            while (tokens[j] && !(tokens[j].t === 'p' && tokens[j].v === '(')) j++;
            if (tokens[j] && tokens[j].v === '(') {
                // kumpulkan seluruh daftar parameter lalu catat nama binding-nya
                let depth = 0;
                let k = j;
                const buf = [];
                while (k < tokens.length) {
                    const t2 = tokens[k];
                    if (t2.t === 'p' && t2.v === '(') { depth++; if (depth === 1) { k++; continue; } }
                    if (t2.t === 'p' && t2.v === ')') { depth--; if (depth === 0) break; }
                    if (depth === 1) buf.push(t2);
                    k++;
                }
                if (buf.length) collectNames(buf, declared);
            }
            continue;
        }
        if (tk.t === 'k' && tk.v === 'class') {
            let j = i + 1;
            while (tokens[j] && tokens[j].t === 'nl') j++;
            if (tokens[j] && tokens[j].t === 'id') { declared.add(tokens[j].v); }
            continue;
        }
        if (tk.t === 'k' && tk.v === 'catch') {
            let j = i + 1;
            // NB: bandingkan `.v` (token kurung bertipe 'p'), bukan `.t`.
            while (tokens[j] && !(tokens[j].t === 'p' && tokens[j].v === '(')) {
                if (tokens[j].t === 'p' && tokens[j].v === '{') break; // catch tanpa binding
                if (tokens[j].t === 'p' && tokens[j].v === ';') break;
                j++;
            }
            if (tokens[j] && tokens[j].v === '(') {
                let d = 0;
                const buf = [];
                for (let k = j; k < tokens.length; k++) {
                    if (tokens[k].t === 'p' && tokens[k].v === '(') { d++; if (d === 1) continue; }
                    if (tokens[k].t === 'p' && tokens[k].v === ')') { d--; if (d === 0) break; }
                    if (d === 1) buf.push(tokens[k]);
                }
                if (buf.length) collectNames(buf, declared);
            }
            continue;
        }
        if (tk.t === 'k' && tk.v === 'import') {
            // import default / named / namespace
            let j = i + 1;
            while (tokens[j] && !(tokens[j].t === 'k' && tokens[j].v === 'from') && !(tokens[j].t === 'p' && tokens[j].v === ';') && tokens[j].t !== 'nl') {
                if (tokens[j].t === 'id') declared.add(tokens[j].v);
                j++;
            }
            if (tokens[j] && tokens[j].t === 'k' && tokens[j].v === 'from') { /* sumber modul, bukan binding */ }
            continue;
        }
        // Parameter arrow function & definisi metode (butuh pass tersendiri karena
        // `const f = (a, b) => …` menyembunyikan `a`/`b` di dalam initializer).
        // (dijalankan di akhir fungsi ini)
        // window.x = ...  atau  window['x'] = ...
        if (tk.t === 'id' && tk.v === 'window') {
            const j = i + 1;
            if (tokens[j] && tokens[j].t === 'p' && ['.', '?.'].includes(tokens[j].v)) {
                if (tokens[j + 1] && tokens[j + 1].t === 'id' && tokens[j + 2] && tokens[j + 2].t === 'p' && tokens[j + 2].v === '=') {
                    declared.add(tokens[j + 1].v);
                }
            }
        }
    }

    collectiveParamPass(tokens, declared);
}

function collectiveParamPass(tokens, declared) {
    collectParamLikeDeclarations(tokens, declared);
}

// helper: susun ulang nama-nama binding dari potongan token parameter
// Kata kunci yang membuat `( … ) {` menjadi struktur kendali, bukan daftar parameter.
const CONTROL_KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'do', 'else', 'return',
    'typeof', 'new', 'in', 'of', 'case', 'delete', 'void', 'await', 'yield', 'instanceof', 'throw']);

// Deteksi daftar parameter pada arrow function, definisi metode objek/kelas, dan
// parameter tunggal `x => ...`. Tanpa ini, identifier di dalam body arrow dianggap hantu.
function collectParamLikeDeclarations(tokens, declared) {
    const prevSignificant = (idx) => {
        for (let k = idx - 1; k >= 0; k--) if (tokens[k].t !== 'nl') return tokens[k];
        return null;
    };
    for (let i = 0; i < tokens.length; i++) {
        const tk = tokens[i];
        if (tk.t !== 'p') continue;
        if (tk.v === '=>') {
            const prev = prevSignificant(i);
            if (prev && prev.t === 'id') declared.add(prev.v);
            continue;
        }
        if (tk.v !== '(') continue;
        let d = 0;
        let j = i;
        for (; j < tokens.length; j++) {
            if (tokens[j].t === 'p' && tokens[j].v === '(') d++;
            if (tokens[j].t === 'p' && tokens[j].v === ')') { d--; if (d === 0) { j++; break; } }
        }
        let k = j;
        while (tokens[k] && tokens[k].t === 'nl') k++;
        const after = tokens[k];
        const isArrowOrMethod = after && after.t === 'p' && (after.v === '=>' || after.v === '{');
        if (!isArrowOrMethod) continue;
        const prev = prevSignificant(i);
        // `if (…) {` / `for (…) {` / `switch (…) {` bukan daftar parameter.
        if (prev && prev.t === 'k' && CONTROL_KEYWORDS.has(prev.v)) continue;
        collectNames(tokens.slice(i + 1, j - 1), declared);
    }
}

function collectNames(tokens, declared) {
    let depth = 0;
    let expectName = true;
    for (let i = 0; i < tokens.length; i++) {
        const tk = tokens[i];
        if (tk.t === 'p' && ['{', '['].includes(tk.v)) { depth++; expectName = true; continue; }
        if (tk.t === 'p' && ['}', ']'].includes(tk.v)) { depth--; expectName = false; continue; }
        if (tk.t === 'p' && tk.v === ',') { expectName = true; continue; }
        if (tk.t === 'p' && tk.v === ':') { expectName = true; continue; }
        if (tk.t === 'p' && tk.v === '...') { expectName = true; continue; }
        if (tk.t === 'p' && tk.v === '=') { expectName = false; continue; }
        if (tk.t === 'id' && expectName) { declared.add(tk.v); expectName = false; }
    }
}
function collectReferences(tokens, file, violations, isDeclared) {
    // token bermakna sebelum indeks idx (lewati newline)
    const prevSignificant = (idx) => {
        for (let k = idx - 1; k >= 0; k--) if (tokens[k].t !== 'nl') return tokens[k];
        return null;
    };
    // Kunci objek literal (`{ key: … }`, `, key: …`) atau label statement
    // (`loop: for (…)`). Pembeda penting: cabang ternary (`kondisi ? x : y`)
    // dan `case NAMA:` BUKAN kunci — keduanya referensi nyata.
    const isObjectKeyOrLabel = (idx) => {
        const p = prevSignificant(idx);
        if (!p) return true; // awal berkas → label
        if (p.t === 'p') return ['{', ',', '(', ';', '}', '['].includes(p.v);
        return p.t === 'k' && ['case', 'default'].includes(p.v);
    };
    for (let i = 0; i < tokens.length; i++) {
        const tk = tokens[i];
        if (tk.t !== 'id') continue;
        if (KEYWORDS.has(tk.v)) continue;
        const prev = tokens[i - 1];
        const next = tokens[i + 1];
        // properti objek / opsional chaining
        if (prev && prev.t === 'p' && ['.', '?.'].includes(prev.v)) continue;
        if (prev && prev.t === 'lit' && prev.v === 'str') continue; // import 'x'
        // kunci objek atau label (`key:` / `label:`)
        if (next && next.t === 'p' && next.v === ':' && isObjectKeyOrLabel(i)) continue;
        // deklarasi fungsi/kelas yang sudah dicatat
        if (prev && prev.t === 'k' && ['function', 'class'].includes(prev.v)) continue;
        if (isDeclared(tk.v)) continue;
        // definisi metode objek/kelas: `foo() { ... }`
        if (next && next.t === 'p' && next.v === '(') {
            let d = 0;
            let j = i + 1;
            for (; j < tokens.length; j++) {
                if (tokens[j].t === 'p' && tokens[j].v === '(') d++;
                if (tokens[j].t === 'p' && tokens[j].v === ')') { d--; if (d === 0) { j++; break; } }
            }
            while (tokens[j] && tokens[j].t === 'nl') j++;
            if (tokens[j] && tokens[j].v === '{') {
                // bisa jadi definisi metode ATAU pemanggilan diikuti blok; cukup aman untuk diabaikan
                continue;
            }
        }
        violations.push({ file, name: tk.v });
    }
}

// ---------------------------------------------------------------------------
// Ekspor untuk pengujian/diagnosa (skrip tetap berjalan sendiri saat dipanggil langsung)
// ---------------------------------------------------------------------------
module.exports = { tokenize, collectDeclarations, collectReferences, collectParamLikeDeclarations, DEFAULT_TARGETS, BUILTIN_GLOBALS };

function main() {
const targets = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_TARGETS;

// 1. Himpunan deklarasi lintas berkas
const allDeclared = new Set();
for (const rel of DECL_SOURCES) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const tokens = tokenize(fs.readFileSync(abs, 'utf8'));
    collectDeclarations(tokens, allDeclared);
}
for (const rel of HTML_SOURCES) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    for (const code of extractInlineScripts(fs.readFileSync(abs, 'utf8'))) {
        collectDeclarations(tokenize(code), allDeclared);
    }
}

// 2. Periksa tiap target
const violations = [];
for (const rel of targets) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
        console.error(`  ⚠️  dilewati (tidak ada): ${rel}`);
        continue;
    }
    const src = fs.readFileSync(abs, 'utf8');
    const tokens = tokenize(src);
    const localDeclared = new Set(allDeclared);
    collectDeclarations(tokens, localDeclared);
    const isDeclared = (name) => localDeclared.has(name) || BUILTIN_GLOBALS.has(name);
    collectReferences(tokens, rel, violations, isDeclared);
}

console.log('\n========================================================================');
console.log('  AUDIT VARIABEL TAK TERDEKLARASI (NO-UNDEF GUARD)');
console.log('========================================================================');
console.log(`  Berkas diperiksa     : ${targets.length}`);
console.log(`  Deklarasi lintas     : ${allDeclared.size} nama (frontend/*.js + server.js)`);

if (violations.length === 0) {
    console.log('  Total Pelanggaran    : 0');
    console.log('------------------------------------------------------------------------');
    console.log('✅ LOLOS: tidak ada identifier tanpa deklarasi (bebas ReferenceError).');
    console.log('========================================================================\n');
    process.exit(0);
}

const byFile = new Map();
for (const v of violations) {
    if (!byFile.has(v.file)) byFile.set(v.file, new Set());
    byFile.get(v.file).add(v.name);
}
console.log(`  Total Pelanggaran    : ${violations.length} pemakaian / ${byFile.size} berkas`);
console.log('------------------------------------------------------------------------');
for (const [file, names] of byFile) {
    console.error(`❌ ${file}`);
    console.error(`   identifier tanpa deklarasi: ${[...names].join(', ')}`);
}
console.log('========================================================================');
console.error('GAGAL: perbaiki identifier di atas (deklarasikan dengan let/const/var, atau daftarkan sebagai global bawaan).\n');
process.exit(1);
}

if (require.main === module) main();
