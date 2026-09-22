/**
 * rkpdesMenjadi.js — aturan tunggal perhitungan "Menjadi" + selisih RKPDes Perubahan
 * ---------------------------------------------------------------------------
 * Diekstrak dari GET /api/rkpdes/perubahan agar bisa diuji unit tanpa menyalakan
 * server, sekaligus menghapus pola falsy yang membuat nilai Rp 0 dianggap
 * "belum diisi" lalu dikembalikan ke nilai SEMULA.
 *
 * Aturan:
 *   • Rekaman RAB PERUBAHAN TIDAK ada            → MENJADI = SEMULA, selisih 0
 *     (kegiatan belum muncul di dokumen perubahan — mewarisi anggaran murni).
 *   • Rekaman RAB PERUBAHAN ADA (termasuk Rp 0)  → MENJADI = total tersimpan
 *     apa adanya. Kegiatan yang ditiadakan di dokumen RAB Perubahan WAJIB
 *     tampil Rp 0 dengan selisih minus penuh (-SEMULA), bukan kembali ke SEMULA.
 *
 * Sengaja TIDAK memakai `totalPerubahan || totalSemula`: 0 adalah nilai SAH.
 */
function hitungBiayaMenjadi({ adaPerubahan, totalPerubahan = null, totalSemula = 0 }) {
    const semula = Number(totalSemula) || 0;
    if (!adaPerubahan) {
        return { biayaMenjadi: semula, selisih: 0, sumber: 'semula' };
    }
    const menjadi = Number(totalPerubahan);
    const aman = Number.isFinite(menjadi) ? menjadi : 0;
    return { biayaMenjadi: aman, selisih: aman - semula, sumber: 'perubahan' };
}

/**
 * getCanonicalKey — bersihkan trailing dots, spasi ganda, dan awalan PEM.
 * Menjamin '02.03.11.01.' dan '02.03.11.01' menghasilkan kunci kanonik yang sama: '02.03.11.01'.
 */
function getCanonicalKey(item) {
    if (!item) return '';
    const raw = typeof item === 'string'
        ? item
        : (item.kode_unik_full || item.kode_kegiatan || item.kode_unik || item.kode || '');
    return String(raw)
        .trim()
        .replace(/^PEM\./i, '')
        .replace(/\s+/g, '')
        .replace(/\.+$/, '');
}

/**
 * getCanonicalName — normalisasi nama kegiatan untuk secondary fallback matching
 * (lowercase, hapus spasi, tanda baca, simbol).
 */
function getCanonicalName(item) {
    if (!item) return '';
    const raw = typeof item === 'string'
        ? item
        : (item.nama_kegiatan || item.uraian || item.kegiatan || item.jenis_kegiatan || '');
    return String(raw)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

module.exports = { hitungBiayaMenjadi, getCanonicalKey, getCanonicalName };

