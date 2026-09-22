#!/usr/bin/env node
/**
 * UJI MANDIRI: ATURAN "MENJADI" RKPDes PERUBAHAN & VOLUME TEKS DIMENSI
 * ---------------------------------------------------------------------------
 * Dua bug yang dijaga di sini:
 *
 *   A. FALSY FALLBACK Rp 0 — kegiatan yang di dokumen RAB PERUBAHAN sudah
 *      ditiadakan (total Rp 0) dulu kembali menampilkan anggaran SEMULA karena
 *      `totalPerubahan || totalSemula` menganggap 0 sebagai "belum diisi".
 *      Aturan benar (backend/services/rkpdesMenjadi.js):
 *        • ada rekaman RAB PERUBAHAN (walau Rp 0) → MENJADI = total tersimpan
 *          apa adanya, selisih = MENJADI - SEMULA (minus penuh bila 0).
 *        • rekaman TIDAK ada → MENJADI = SEMULA, selisih 0 (mewarisi anggaran).
 *
 *   B. VOLUME TEKS DIMENSI — "250mX4mX0,15m3" harus bisa DISIMPAN UTUH dan
 *      DITAMPILKAN UTUH (tidak dipaksa Number() → NaN / 1 / hilang).
 *      Aturan tunggal (frontend/volumeTeks.js) plus bukti bahwa server.js,
 *      frontend/rkpdes.js, frontend/rab.js, dan form HTML memakai aturan itu —
 *      termasuk penjaga agar teks dimensi TIDAK dibaca sebagai "volume nol"
 *      (yang akan keliru meniadakan anggaran kegiatan).
 *
 * Dipakai lewat: `npm run test:volume-menjadi` (bagian dari `npm run check:all`).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VolumeTeks = require('../frontend/volumeTeks.js');
const { hitungBiayaMenjadi, getCanonicalKey, getCanonicalName } = require('../backend/services/rkpdesMenjadi.js');

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

function baca(rel) {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const SERVER = baca('server.js');
const RKPDES_JS = baca('frontend/rkpdes.js');
const RKPDES_HTML = baca('frontend/rkpdes.html');
const RAB_JS = baca('frontend/rab.js');
const RAB_HTML = baca('frontend/rab.html');

console.log('\n=== UJI: ATURAN MENJADI (Rp 0) & VOLUME TEKS DIMENSI ===\n');

// ---------------------------------------------------------------------------
// A. ATURAN Rp 0 → MENJADI 0, SELISIH -SEMULA
// ---------------------------------------------------------------------------
console.log('A. Aturan agregasi "Menjadi" (hitungBiayaMenjadi)');

{
    const r = hitungBiayaMenjadi({ adaPerubahan: true, totalPerubahan: 0, totalSemula: 107720500 });
    assert(r.biayaMenjadi === 0, 'RAB Perubahan Rp 0 → Menjadi Rp 0 (bukan kembali ke Semula)');
    assert(r.selisih === -107720500, 'Selisih = -Semula penuh (-107.720.500)');
}

{
    const r = hitungBiayaMenjadi({ adaPerubahan: true, totalPerubahan: 0, totalSemula: 95816000 });
    assert(r.biayaMenjadi === 0 && r.selisih === -95816000, 'Kasus PMT Bumil: Menjadi 0, selisih -95.816.000');
}

{
    const r = hitungBiayaMenjadi({ adaPerubahan: false, totalPerubahan: null, totalSemula: 103064500 });
    assert(r.biayaMenjadi === 103064500 && r.selisih === 0, 'Tanpa rekaman RAB Perubahan → Menjadi = Semula, selisih 0');
}

{
    const r = hitungBiayaMenjadi({ adaPerubahan: true, totalPerubahan: 65429500, totalSemula: 103064500 });
    assert(r.biayaMenjadi === 65429500 && r.selisih === -37635000, 'Perubahan sebagian: Menjadi 65.429.500, selisih -37.635.000');
}

{
    const r = hitungBiayaMenjadi({ adaPerubahan: true, totalPerubahan: null, totalSemula: 1000 });
    assert(r.biayaMenjadi === 0 && r.selisih === -1000, 'Rekaman ada tetapi total null/korup → diperlakukan 0 (aman), bukan Semula');
}

{
    const r = hitungBiayaMenjadi({ adaPerubahan: true, totalPerubahan: 1500000, totalSemula: 0 });
    assert(r.biayaMenjadi === 1500000 && r.selisih === 1500000, 'Kegiatan baru (Semula 0) → bertambah penuh');
}

// Bukti tidak ada pola falsy di jalur agregasi server.
assert(!/biayaMenjadi\s*=\s*[^;]*\|\|\s*biayaSemula/.test(SERVER),
    'server.js tidak memakai `totalPerubahan || totalSemula` (0 dianggap sah)');
assert(/hitungBiayaMenjadi\({/.test(SERVER) && /require\('\.\/backend\/services\/rkpdesMenjadi\.js'\)/.test(SERVER),
    'server.js memakai hitungBiayaMenjadi dari modul teruji (satu sumber aturan)');

// ---------------------------------------------------------------------------
// B. VOLUME TEKS DIMENSI
// ---------------------------------------------------------------------------
console.log('\nB. Volume teks dimensi (VolumeTeks)');

const DIMENSI = '250mX4mX0,15m3';

assert(VolumeTeks.bersihkan(DIMENSI) === DIMENSI, 'Teks dimensi dibaca apa adanya (tidak diubah)');
assert(VolumeTeks.volumeKeAngka(DIMENSI) === null, 'Teks dimensi bukan angka murni (null) — tidak jadi NaN');
assert(VolumeTeks.volumeKeAngka('12') === 12, 'Angka murni tetap 12');
assert(VolumeTeks.volumeKeAngka('12,5') === 12.5, 'Desimal koma tetap didukung (12,5)');
assert(VolumeTeks.isVolumeKosong(DIMENSI) === false, 'Teks dimensi BUKAN volume nol (tidak meniadakan anggaran)');
assert(VolumeTeks.isVolumeKosong('0') === true && VolumeTeks.isVolumeKosong('') === true,
    '0 dan kosong tetap dianggap kosong/ditiadakan');
assert(VolumeTeks.isVolumeDimensi(DIMENSI) === true && VolumeTeks.isVolumeDimensi('12') === false,
    'isVolumeDimensi membedakan teks teknis dari angka');

assert(VolumeTeks.formatVolumeSatuan(DIMENSI, 'm3') === DIMENSI,
    'Tampilan tidak menempel satuan dua kali ("250mX4mX0,15m3", bukan "... m3 m3")');
assert(VolumeTeks.formatVolumeSatuan(DIMENSI, 'Paket') === DIMENSI,
    'Satuan lain tidak merusak teks dimensi — tetap utuh untuk pelaporan');
assert(VolumeTeks.formatVolumeSatuan('12', 'OB') === '12 OB', 'Angka murni + satuan tetap "12 OB"');
assert(VolumeTeks.formatVolumeSatuan(0, 'Paket') === '-' && VolumeTeks.formatVolumeSatuan('0', 'Paket') === '-',
    'Volume 0/kosong tetap tampil "-" (bukan "0 -")');
assert(VolumeTeks.formatVolumeSatuan('250mX4mX0,15m3', '') === DIMENSI, 'Tanpa satuan: hanya teks dimensinya');

// Simulasi transformasi simpan → muat ulang (kontrak PUT/GET RKPDes Perubahan).
{
    const disimpan = VolumeTeks.bersihkan(DIMENSI);       // rpjm_data.volume_teks
    const kolomNumerikRab = VolumeTeks.volumeKeAngka(DIMENSI); // null → nilai lama dipertahankan
    const ditampilkan = VolumeTeks.bersihkan(disimpan) !== ''
        ? disimpan
        : VolumeTeks.bersihkan(kolomNumerikRab);
    assert(ditampilkan === DIMENSI, 'Simpan → muat ulang: teks dimensi kembali utuh (bukan 1/0/NaN)');
    assert(kolomNumerikRab === null, 'Kolom numerik rab.volume tidak diisi NaN (nilai lama dipertahankan)');
}

// ---------------------------------------------------------------------------
// C. PEMAKAIAN ATURAN DI KODE (frontend + server + form)
// ---------------------------------------------------------------------------
console.log('\nC. Pemasangan aturan di kode & form');

assert(/volumeTeks\.js/.test(RKPDES_HTML) && /<script src="volumeTeks\.js"><\/script>/.test(RKPDES_HTML),
    'rkpdes.html memuat volumeTeks.js sebelum rkpdes.js');
assert(/volumeTeks\.js/.test(RAB_HTML), 'rab.html memuat volumeTeks.js');

assert(/id="edit-rkp-volume"[^>]*type="text"|type="text" id="edit-rkp-volume"/.test(RKPDES_HTML),
    'Input Volume RKPDes (Murni) bertipe text — bisa menerima "250mX4mX0,15m3"');
assert(/id="edit-perubahan-volume"[^>]*type="text"|type="text" id="edit-perubahan-volume"/.test(RKPDES_HTML),
    'Input Volume MENJADI (Perubahan) bertipe text');
assert(/id="input-volume"[^>]*type="text"|type="text"[^>]*id="input-volume"/.test(RAB_HTML),
    'Input Volume item RAB bertipe text');
assert(!/id="edit-rkp-volume"[^>]*type="number"/.test(RKPDES_HTML),
    'Tidak ada lagi type="number" pada volume RKPDes (huruf tidak dibuang browser)');

assert(/function readEditVolume\(/.test(RKPDES_JS), 'rkpdes.js punya readEditVolume (teks bebas, tanpa Number())');
assert(/readEditVolume\('edit-perubahan-volume'/.test(RKPDES_JS),
    'Volume MENJADI dibaca lewat readEditVolume (bukan readEditNumber)');
assert(!/readEditNumber\('edit-perubahan-volume'/.test(RKPDES_JS),
    'Tidak ada lagi Number() paksa pada volume MENJADI');
assert(/readEditVolume\('edit-rkp-volume'/.test(RKPDES_JS),
    'Volume SEMULA/RKPDes Murni juga dibaca sebagai teks');
assert(/window\.VolumeTeks\.formatVolumeSatuan/.test(RKPDES_JS),
    'formatVolumeSatuanSel memakai aturan VolumeTeks (tampilan tidak merusak teks dimensi)');

assert(/window\.VolumeTeks/.test(RAB_JS) && /volumeKeAngka/.test(RAB_JS),
    'rab.js menghitung pengali volume lewat VolumeTeks (teks dimensi tidak jadi NaN)');
assert(/volumeDimensi \? 1 : validVol/.test(RAB_JS),
    'Item RAB dengan volume dimensi dihitung 1 satuan kerja (nominal tidak hilang)');

assert(/function volumeItemRabSimpan\(/.test(SERVER) && /function volumeItemRabAngka\(/.test(SERVER),
    'server.js menyimpan volume item RAB apa adanya (helper volumeItemRabSimpan/Angka)');
assert(!/!isNaN\(Number\(it\.volume\)\) \? Number\(it\.volume\) : 1/.test(SERVER),
    'Normalisasi item RAB tidak lagi menimpa teks dimensi menjadi 1');
assert(/volume_teks: volMenjadiTeks/.test(SERVER),
    'PUT /api/rkpdes/perubahan menyimpan teks dimensi ke rpjm_data.volume_teks');
assert(/VolumeTeks\.bersihkan\(pRpjm\.volume_teks\)/.test(SERVER) && /volTeksTersimpan !== ''/.test(SERVER),
    'GET /api/rkpdes/perubahan menampilkan teks tersimpan, mengalahkan kolom numerik');
assert(/VolumeTeks\.isVolumeKosong\(it && it\.volume\)/.test(SERVER),
    'Deteksi "kegiatan ditiadakan" memakai VolumeTeks (teks dimensi bukan nol)');

const SYNC_SCRIPT = baca('scripts/sync-total-rab-perubahan.cjs');
assert(/VolumeTeks\.isVolumeKosong/.test(SYNC_SCRIPT),
    'Skrip sinkronisasi total RAB Perubahan memakai aturan volume yang sama');

// ---------------------------------------------------------------------------
// D. KANONISASI KUNCI & RESOLUSI TRAILING DOT (02.03.11.01. vs 02.03.11.01)
// ---------------------------------------------------------------------------
console.log('\nD. Kanonisasi kunci & resolusi trailing dot (getCanonicalKey)');

assert(getCanonicalKey('02.03.11.01.') === '02.03.11.01',
    'Trailing dot dibersihkan: "02.03.11.01." -> "02.03.11.01"');
assert(getCanonicalKey('02.03.11.01') === '02.03.11.01',
    'Kode tanpa trailing dot tetap utuh: "02.03.11.01"');
assert(getCanonicalKey('PEM.02.03.11.01.') === '02.03.11.01',
    'Prefix PEM. dibuang: "PEM.02.03.11.01." -> "02.03.11.01"');
assert(getCanonicalKey('  02.03.11.01.  ') === '02.03.11.01',
    'Whitespace di sekeliling kode dibersihkan');
assert(getCanonicalKey({ kode_unik_full: '02.03.11.01.' }) === '02.03.11.01',
    'Objek dengan properti kode_unik_full diekstrak secara kanonik');
assert(getCanonicalKey({ kode_kegiatan: '02.03.11.01' }) === '02.03.11.01',
    'Objek dengan properti kode_kegiatan diekstrak secara kanonik');
assert(getCanonicalKey('') === '' && getCanonicalKey(null) === '',
    'Input kosong menghasilkan string kosong');

// Normalisasi Nama (Secondary Fallback Matching)
const namaSaleko = 'Pembangunan Rabat Beton Dusun Saleko 250mX4mX0,15m3';
assert(getCanonicalName(namaSaleko) === 'pembangunanrabatbetondusunsaleko250mx4mx015m3',
    'getCanonicalName membersihkan spasi, simbol & huruf kapital');
assert(getCanonicalName({ nama_kegiatan: namaSaleko }) === 'pembangunanrabatbetondusunsaleko250mx4mx015m3',
    'getCanonicalName mengekstrak dari objek nama_kegiatan');

// Simulasi Multi-Fallback Matching (Kasus 02.03.11.01 Rabat Beton Saleko)
{
    const rkpRow = { kode_unik_full: '02.03.11.01.', nama_kegiatan: namaSaleko, biaya: 238105000 };
    const rabPerRow = { kode_unik_full: '02.03.11.01', nama_kegiatan: namaSaleko, jumlah_anggaran: 0 };

    const perMapByCanonical = new Map();
    perMapByCanonical.set(getCanonicalKey(rabPerRow), rabPerRow);

    const matched = perMapByCanonical.get(getCanonicalKey(rkpRow));
    assert(matched !== undefined, 'RKPDes "02.03.11.01." berhasil mencocokkan RAB "02.03.11.01" via canonical key');

    const hasilKalkulasi = hitungBiayaMenjadi({
        adaPerubahan: !!matched,
        totalPerubahan: matched.jumlah_anggaran,
        totalSemula: rkpRow.biaya
    });
    assert(hasilKalkulasi.biayaMenjadi === 0, 'Kegiatan fisik 02.03.11.01 menghasilkan Menjadi Rp 0 (bukan fallback ke 238.105.000)');
    assert(hasilKalkulasi.selisih === -238105000, 'Selisih berkurang penuh (-238.105.000)');
}

// Simulasi Secondary Name Matching (Jika kode berbeda sama sekali)
{
    const rkpRowBedaKode = { kode_unik_full: '99.99.99.99', nama_kegiatan: 'Pembangunan Drainase Dusun Rappoang 250m3', biaya: 117685000 };
    const rabPerRow = { kode_unik_full: '02.03.14.01.', nama_kegiatan: 'Pembangunan Drainase Dusun Rappoang 250m3', jumlah_anggaran: 0 };

    const perMapByName = new Map();
    perMapByName.set(getCanonicalName(rabPerRow), rabPerRow);

    const matchedByName = perMapByName.get(getCanonicalName(rkpRowBedaKode));
    assert(matchedByName !== undefined, 'Secondary matching berhasil menemukan rekaman via nama kegiatan saat kode berbeda');
    const r = hitungBiayaMenjadi({ adaPerubahan: !!matchedByName, totalPerubahan: matchedByName.jumlah_anggaran, totalSemula: rkpRowBedaKode.biaya });
    assert(r.biayaMenjadi === 0 && r.selisih === -117685000, 'Secondary name match menghasilkan Rp 0 & selisih -117.685.000');
}

// Kasus Kegiatan 01.01.08.01 (Biaya Kordinasi / Koordinasi Pemerintah Desa)
{
    const namaRkp = 'Biaya Koordinasi Pemerintah Desa';
    const namaRab = 'Biaya Kordinasi Pemerintah Desa';
    assert(getCanonicalName(namaRkp) === getCanonicalName(namaRab),
        'getCanonicalName menyamakan "koordinasi" dan "kordinasi" menjadi kanonik yang identik');

    const rkpRow = { kode_unik_full: '01.01.08.01.', nama_kegiatan: namaRkp, biaya: 7650000 };
    const rabPerRow = { kode_unik_full: '01.01.08.01.', nama_kegiatan: namaRab, jumlah_anggaran: 0 };

    const perMapByCanonical = new Map();
    perMapByCanonical.set(getCanonicalKey(rabPerRow), rabPerRow);

    const perMapByName = new Map();
    perMapByName.set(getCanonicalName(rabPerRow), rabPerRow);

    // Cocok via canonical key
    const matchedByKey = perMapByCanonical.get(getCanonicalKey(rkpRow));
    assert(matchedByKey !== undefined, '01.01.08.01 cocok via canonical key');

    const resKey = hitungBiayaMenjadi({ adaPerubahan: !!matchedByKey, totalPerubahan: matchedByKey.jumlah_anggaran, totalSemula: rkpRow.biaya });
    assert(resKey.biayaMenjadi === 0, 'Kegiatan 01.01.08.01 menghasilkan Menjadi = Rp 0');
    assert(resKey.selisih === -7650000, 'Kegiatan 01.01.08.01 menghasilkan Selisih = -Rp 7.650.000 (berkurang penuh)');

    // Cocok via canonical name jika kode berbeda
    const matchedByName = perMapByName.get(getCanonicalName(rkpRow));
    assert(matchedByName !== undefined, '01.01.08.01 cocok via canonical name (kordinasi vs koordinasi)');
    const resName = hitungBiayaMenjadi({ adaPerubahan: !!matchedByName, totalPerubahan: matchedByName.jumlah_anggaran, totalSemula: rkpRow.biaya });
    assert(resName.biayaMenjadi === 0 && resName.selisih === -7650000,
        'Pencocokan nama kordinasi vs koordinasi menghasilkan Menjadi = Rp 0 dan Selisih = -Rp 7.650.000');
}

// Bukti integrasi di server.js
assert(/perMapByCanonical/.test(SERVER) && /perMapByName/.test(SERVER),
    'server.js memasang perMapByCanonical dan perMapByName pada GET /api/rkpdes/perubahan');
assert(/rabMurniMapByCanonical/.test(SERVER),
    'server.js memasang rabMurniMapByCanonical untuk pencocokan baseline murni');
assert(/getCanonicalKey\(m\)/.test(SERVER) && /getCanonicalName\(m\)/.test(SERVER),
    'server.js mengevaluasi canonCode dan canonName saat iterasi murniRows');

// ---------------------------------------------------------------------------
console.log(`\n=== HASIL: ${pass} LULUS / ${fail} GAGAL ===\n`);
process.exit(fail === 0 ? 0 : 1);

