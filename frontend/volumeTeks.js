/**
 * volumeTeks.js — aturan tunggal untuk VOLUME yang boleh berupa TEKS BEBAS
 * ---------------------------------------------------------------------------
 * Volume kegiatan fisik sering ditulis sebagai dimensi teknis, mis.
 * "250mX4mX0,15m3", "10 kg + 2 dus", atau "1 Paket Besar". Angka murni juga sah
 * ("12"). Modul ini menjadi satu-satunya sumber aturan parse & render agar
 * server (server.js) dan halaman (frontend/rkpdes.js) tidak berbeda perilaku.
 *
 * Dimuat DUA cara sekaligus (UMD ringan):
 *   • browser : <script src="volumeTeks.js"></script>  → window.VolumeTeks
 *   • Node    : require('../frontend/volumeTeks.js')   → module.exports
 */
(function attachVolumeTeks(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root && typeof root === 'object') {
        root.VolumeTeks = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function buildVolumeTeks() {
    // Nilai yang dianggap kosong/ditiadakan (bukan angka, bukan dimensi).
    const PENANDA_KOSONG = new Set(['', '-', 'null', 'undefined', 'false']);

    function bersihkan(v) {
        if (v === null || v === undefined) return '';
        return String(v).trim();
    }

    // "12" → 12 ; "12,5" → 12.5 ; "250mX4mX0,15m3" → null (bukan angka murni).
    function volumeKeAngka(v) {
        const s = bersihkan(v);
        if (s === '' || !/^[+-]?\d+([.,]\d+)?$/.test(s)) return null;
        const n = Number(s.replace(',', '.'));
        return Number.isFinite(n) ? n : null;
    }

    // Volume ditiadakan: kosong, '-', atau nol.
    function isVolumeKosong(v) {
        const s = bersihkan(v);
        if (PENANDA_KOSONG.has(s.toLowerCase())) return true;
        const n = volumeKeAngka(s);
        return n !== null && n === 0;
    }

    // Teks dimensi: ada isinya, tetapi bukan angka murni (mis. mengandung 'm', 'X').
    function isVolumeDimensi(v) {
        const s = bersihkan(v);
        if (s === '' || PENANDA_KOSONG.has(s.toLowerCase())) return false;
        return volumeKeAngka(s) === null;
    }

    /**
     * Tampilan "Volume & Satuan" yang rapi:
     *   • kosong / nol        → '-'
     *   • angka murni         → "12 OB" (satuan ditempel bila belum tertulis)
     *   • teks dimensi        → dipakai APA ADANYA. Satuan tidak ditempel dua kali:
     *     "250mX4mX0,15m3" + satuan "m3" tetap "250mX4mX0,15m3".
     */
    function formatVolumeSatuan(volume, satuanRaw) {
        const v = bersihkan(volume);
        if (isVolumeKosong(v)) return '-';
        // Teks dimensi sudah memuat ukuran & satuannya sendiri ("250mX4mX0,15m3") →
        // jangan ditempeli satuan lain; teksnya dipakai APA ADANYA.
        if (isVolumeDimensi(v)) return v;
        const s = bersihkan(satuanRaw);
        if (s === '' || s === '-' || s === '0') return v;
        return v.toLowerCase().includes(s.toLowerCase()) ? v : `${v} ${s}`;
    }

    /**
     * Nilai untuk kolom bernomor (mis. `rab.volume` bertipe numeric di Postgres):
     * hanya angka murni yang boleh ditulis; teks dimensi tidak bisa disimpan di
     * sana sehingga nilai lama dipertahankan (fallback).
     */
    function volumeUntukKolomNumerik(volume, fallback = 0) {
        const n = volumeKeAngka(volume);
        return n === null ? fallback : n;
    }

    return {
        bersihkan,
        volumeKeAngka,
        isVolumeKosong,
        isVolumeDimensi,
        formatVolumeSatuan,
        volumeUntukKolomNumerik
    };
});
