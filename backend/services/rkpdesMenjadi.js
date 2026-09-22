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

module.exports = { hitungBiayaMenjadi };
