// ==========================================
// FILE: frontend/normalisasi-rkpdes.js
// Peta master rancangan_rkpdes -> bentuk kanonik yang dikonsumsi
// oleh renderTabelPembiayaan & renderTabelPaguIndikatif.
// ==========================================

const BIDANG_KANONIK = {
    1: 'Bidang Penyelenggaraan Pemerintah Desa',
    2: 'Bidang Pelaksanaan Pembangunan Desa',
    3: 'Bidang Pembinaan Kemasyarakatan',
    4: 'Bidang Pemberdayaan Masyarakat',
    5: 'Bidang Penanggulangan Keadaan Darurat Bencana Alam dan Non Alam'
};

function normalizeBidang(bidang) {
    const v = String(bidang).trim();
    if (BIDANG_KANONIK[v]) return BIDANG_KANONIK[v];
    const lower = v.toLowerCase();
    if (lower.includes('pemerintah') || lower.includes('penyelenggaraan')) return BIDANG_KANONIK['1'];
    if (lower.includes('pembangunan')) return BIDANG_KANONIK['2'];
    if (lower.includes('pembinaan') || lower.includes('kemasyarakatan')) return BIDANG_KANONIK['3'];
    if (lower.includes('pemberdayaan') || lower.includes('masyarakat')) return BIDANG_KANONIK['4'];
    if (lower.includes('penanggulangan') || lower.includes('darurat') || lower.includes('bencana')) return BIDANG_KANONIK['5'];
    return BIDANG_KANONIK['1'];
}

// Peta sumber_dana master -> label kanonik yang dikenali renderer.
// Label harus memuat substring yang dicek oleh DUA renderer:
//   pagu-indikatif: ADD/ALOKASI DANA DESA, DDS/DANA DESA/APBN,
//                   BAGI HASIL/PAJAK/RETRIBUSI, PROVINSI/BKK/PROV, KABUPATEN/KOTA/KAB
//   pembiayaan:     ADD/ALOKASI DANA, DDS/DANA DESA/APBN, BAGI HASIL/PAJAK/PBH,
//                   PROVINSI/APBD I/BKK, KABUPATEN/KOTA/APBD II
function normalizeSumber(raw) {
    const s = String(raw || '').toUpperCase();
    if (!s) return 'ADD (Alokasi Dana Desa)';
    if (s.includes('DDS') || s.includes('DANA DESA') || s.includes('APBN')) return 'DDS (Dana Desa)';
    if (s.includes('ADD') || s.includes('ALOKASI DANA')) return 'ADD (Alokasi Dana Desa)';
    if (s.includes('PBH') || s.includes('BAGI HASIL') || s.includes('PAJAK') || s.includes('RETRIBUSI')) return 'PBH - Bagi Hasil Pajak';
    if (s.includes('PROVINSI') || s.includes('BKK') || s.includes('PROV') ||
        s.includes('TINGKAT I/') || s.includes('TK. I') || s.includes('TKT I')) return 'APBD Provinsi (Tk. I)';
    if (s.includes('KABUPATEN') || s.includes('KOTA') || s.includes('TINGKAT II') ||
        s.includes('TK. II') || s.includes('TKT II')) return 'APBD Kabupaten (Tk. II)';
    if (s.includes('PAD')) return 'PAD';
    return 'ADD (Alokasi Dana Desa)';
}

function rowRkpdesKanan(row) {
    const bidang = normalizeBidang(row.bidang);
    const uraian = row.uraian_rab || row.uraian || row.nama_kegiatan || row.jenis_kegiatan || '';
    // Anggaran HANYA dari tabel rab. Baris tanpa RAB diberi nilai 0 (bukan fallback
    // prakiraan_biaya master yang sering berisi nominal palsu raksasa).
    const hasRab = !!row.have_rab && row.anggaran_rab != null;
    const biaya = hasRab ? Number(row.anggaran_rab || 0) : 0;
    const sumber = hasRab
        ? normalizeSumber(row.sumber_dana_rab || row.sumber_dana || row.sumber_pembiayaan)
        : '';
    const volumeRaw = row.volume_rab || row.volume || row.volume_satuan || row.volume_kegiatan || '';

    return {
        id: row.id,
        kode_unik: row.kode_unik,
        kode_unik_full: row.kode_unik_full,
        tahun: row.tahun,
        bidang: bidang,
        jenis_bidang: row.jenis_bidang || '',
        jenis_kegiatan: row.jenis_kegiatan || '',
        group_nama: row.group_nama || null,
        sub_group_nama: row.sub_group_nama || null,
        nama_kegiatan: row.nama_kegiatan || row.sub_kegiatan || '',
        uraian: uraian,
        volume: volumeRaw,
        satuan: row.satuan_rab || row.satuan || '',
        harga_satuan: hasRab ? Number(row.harga_satuan_rab || row.harga_satuan || 0) : 0,
        jumlah_anggaran: biaya,
        // Teruskan items per-sumber agar renderer bisa mengklasifikasikan anggaran
        // ke kolom sumber dana yang tepat.
        items: (Array.isArray(row.items) && row.items.length > 0) ? row.items : [],
        sumber_dana: sumber,
        lokasi: row.lokasi_kegiatan || row.lokasi || '',
        rpjm_data: {
            bidang: bidang,
            jenis_bidang: row.jenis_bidang || '',
            jenis_kegiatan: row.jenis_kegiatan || '',
            nama_kegiatan: row.nama_kegiatan || row.sub_kegiatan || ''
        }
    };
}

window.normalisasiRkpdesRows = function (data) {
    if (!Array.isArray(data)) return [];
    return data.map(rowRkpdesKanan);
};