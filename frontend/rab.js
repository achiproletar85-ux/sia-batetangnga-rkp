// ==========================================
// SIA BATETANGNGA - RAB MODULE LOGIC
// ==========================================

function switchTab(tab) {
    window.location.href = tab + '.html';
}

const API_URL = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin !== 'null') ? (window.location.origin + '/api') : '/api';
let rpjmItems = [];
let filteredRpjmItems = [];
let selectedRpjm = null;
let rabItems = [];
const RAB_TIPE_MURNI = 'MURNI';
const RAB_TIPE_PERUBAHAN = 'PERUBAHAN';

function getDefaultYear() {
    try {
        const saved = localStorage.getItem('rab_tahun_anggaran') || localStorage.getItem('sia_tahun_anggaran');
        if (saved) {
            const num = parseInt(saved, 10);
            if (Number.isFinite(num) && num >= 2020 && num <= 2035) return num;
        }
    } catch (_) {}
    const calYear = new Date().getFullYear();
    if (calYear >= 2022 && calYear <= 2030) return calYear;
    return 2026;
}

function getDefaultTipe() {
    try {
        const saved = localStorage.getItem('rab_tipe_anggaran') || localStorage.getItem('sia_tipe_anggaran');
        if (saved) {
            const norm = String(saved).toUpperCase().trim();
            if (norm === RAB_TIPE_PERUBAHAN || norm === RAB_TIPE_MURNI) return norm;
        }
    } catch (_) {}
    return RAB_TIPE_MURNI;
}

let savedRabList = [];
let rabYear = getDefaultYear();
let editIndex = -1;
let currentRabId = null;
let currentRabRefMurni = null;

// ==========================================
// RAB PERUBAHAN — snapshot versi (MURNI / PERUBAHAN)
// ==========================================
let rabTipe = getDefaultTipe();
let rabMurniLocked = false;   // true bila versi MURNI kegiatan terpilih sudah dikunci

function isModePerubahan() {
    return rabTipe === RAB_TIPE_PERUBAHAN;
}

// Format selisih RAB Perubahan: + bila bertambah/0, minus (tanda kurung) bila berkurang.
function formatSelisihRAB(nilai) {
    const n = Number(nilai) || 0;
    if (n < 0) return `(${formatRupiah(Math.abs(n))})`;
    return formatRupiah(n);
}

const defaultUnits = [
    'Bulan', 'Orang/Bulan', 'Tahun', 'Paket', 'Unit', 'Kegiatan', 'Hari',
    'Bh', 'M3', 'M2', 'M1', 'Buah', 'Orang', 'Kali', 'Watt', 'KK',
    'Rim', 'Botol', 'Kotak', 'Dos', 'Set', 'Bks', 'Lbr', 'Rkp', 'Psg',
    'Bal', 'Ikat', 'Rak', 'Hok', 'Biji', 'Zak', 'Kg', 'Drum', 'Roll',
    'Ekor', 'Pak', 'Klng', 'Btg', 'Ltr', 'Btr', 'Jrgen'
];
let customUnits = [];

const rabCategories = [
    { group: 'Penghasilan Tetap dan Tunjangan Kepala Desa', subgroup: 'Penghasilan Tetap Kepala Desa', groupCode: '5.1.1', subgroupCode: '5.1.1.01' },
    { group: 'Penghasilan Tetap dan Tunjangan Kepala Desa', subgroup: 'Tunjangan Kepala Desa', groupCode: '5.1.1', subgroupCode: '5.1.1.02' },
    { group: 'Penghasilan Tetap dan Tunjangan Kepala Desa', subgroup: 'Penerimaan Lain Kepala Desa yang Sah', groupCode: '5.1.1', subgroupCode: '5.1.1.90-99' },
    { group: 'Penghasilan Tetap dan Tunjangan Perangkat Desa', subgroup: 'Penghasilan Tetap Perangkat Desa', groupCode: '5.1.2', subgroupCode: '5.1.2.01' },
    { group: 'Penghasilan Tetap dan Tunjangan Perangkat Desa', subgroup: 'Tunjangan Perangkat Desa', groupCode: '5.1.2', subgroupCode: '5.1.2.02' },
    { group: 'Penghasilan Tetap dan Tunjangan Perangkat Desa', subgroup: 'Penerimaan Lain Perangkat Desa yang Sah', groupCode: '5.1.2', subgroupCode: '5.1.2.90-99' },
    { group: 'Jaminan Sosial Kepala Desa dan Perangkat Desa', subgroup: 'Jaminan Kesehatan Kepala Desa', groupCode: '5.1.3', subgroupCode: '5.1.3.01' },
    { group: 'Jaminan Sosial Kepala Desa dan Perangkat Desa', subgroup: 'Jaminan Kesehatan Perangkat Desa', groupCode: '5.1.3', subgroupCode: '5.1.3.02' },
    { group: 'Jaminan Sosial Kepala Desa dan Perangkat Desa', subgroup: 'Jaminan Ketenagakerjaan Kepala Desa', groupCode: '5.1.3', subgroupCode: '5.1.3.03' },
    { group: 'Jaminan Sosial Kepala Desa dan Perangkat Desa', subgroup: 'Jaminan Ketenagakerjaan Perangkat Desa', groupCode: '5.1.3', subgroupCode: '5.1.3.04' },
    { group: 'Tunjangan BPD', subgroup: 'Tunjangan Kedudukan BPD', groupCode: '5.1.4', subgroupCode: '5.1.4.01' },
    { group: 'Tunjangan BPD', subgroup: 'Tunjangan Kinerja BPD', groupCode: '5.1.4', subgroupCode: '5.1.4.02' },
    { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Perlengkapan Alat Tulis Kantor dan Benda Pos', groupCode: '5.2.1', subgroupCode: '5.2.1.01' },
    { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Perlengkapan Alat-alat Listrik', groupCode: '5.2.1', subgroupCode: '5.2.1.02' },
    { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Perlengkapan Alat-alat Rumah Tangga/Peralatan dan Bahan Kebersihan', groupCode: '5.2.1', subgroupCode: '5.2.1.03' },
    { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Bahan Bakar Minyak/Gas/Isi Ulang Tabung Pemadam Kebakaran', groupCode: '5.2.1', subgroupCode: '5.2.1.04' },
    { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Perlengkapan Cetak/Penggandaan - Belanja Barang Cetak dan Penggandaan', groupCode: '5.2.1', subgroupCode: '5.2.1.05' },
    { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Perlengkapan Barang Konsumsi (Makan/minum) - Belanja Barang Konsumsi', groupCode: '5.2.1', subgroupCode: '5.2.1.06' },
    { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Bahan/Material', groupCode: '5.2.1', subgroupCode: '5.2.1.07' },
    { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Bendera/Umbul-umbul/Spanduk', groupCode: '5.2.1', subgroupCode: '5.2.1.08' },
    { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Pakaian Dinas/Seragam/Atribut', groupCode: '5.2.1', subgroupCode: '5.2.1.09' },
    { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Obat-obatan', groupCode: '5.2.1', subgroupCode: '5.2.1.10' },
    { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Pakan Hewan/Ikan, Obat-obatan Hewan', groupCode: '5.2.1', subgroupCode: '5.2.1.11' },
    { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Pupuk/Obat-obatan Pertanian', groupCode: '5.2.1', subgroupCode: '5.2.1.12' },
    { group: 'Belanja Barang Perlengkapan', subgroup: 'Belanja Barang Perlengkapan Lainnya', groupCode: '5.2.1', subgroupCode: '5.2.1.90-99' },
    { group: 'Belanja Jasa Honorarium', subgroup: 'Belanja Jasa Honorarium Tim yang Melaksanakan Kegiatan', groupCode: '5.2.2', subgroupCode: '5.2.2.01' },
    { group: 'Belanja Jasa Honorarium', subgroup: 'Belanja Jasa Honorarium Pembantu Tugas Umum Desa/Operator', groupCode: '5.2.2', subgroupCode: '5.2.2.02' },
    { group: 'Belanja Jasa Honorarium', subgroup: 'Belanja Jasa Honorarium/Insentif Pelayanan Desa', groupCode: '5.2.2', subgroupCode: '5.2.2.03' },
    { group: 'Belanja Jasa Honorarium', subgroup: 'Belanja Jasa Honorarium Ahli/Profesi/Konsultan/Narasumber', groupCode: '5.2.2', subgroupCode: '5.2.2.04' },
    { group: 'Belanja Jasa Honorarium', subgroup: 'Belanja Jasa Honorarium Petugas', groupCode: '5.2.2', subgroupCode: '5.2.2.05' },
    { group: 'Belanja Jasa Honorarium', subgroup: 'Belanja Jasa Honorarium Lainnya', groupCode: '5.2.2', subgroupCode: '5.2.2.90-99' },
    { group: 'Belanja Perjalanan Dinas', subgroup: 'Belanja Perjalanan Dinas Dalam Kabupaten/Kota', groupCode: '5.2.3', subgroupCode: '5.2.3.01' },
    { group: 'Belanja Perjalanan Dinas', subgroup: 'Belanja Perjalanan Dinas Luar Kabupaten/Kota', groupCode: '5.2.3', subgroupCode: '5.2.3.02' },
    { group: 'Belanja Perjalanan Dinas', subgroup: 'Belanja Kursus/Pelatihan', groupCode: '5.2.3', subgroupCode: '5.2.3.03' },
    { group: 'Belanja Jasa Sewa', subgroup: 'Belanja Jasa Sewa Bangunan/Gedung/Ruang', groupCode: '5.2.4', subgroupCode: '5.2.4.01' },
    { group: 'Belanja Jasa Sewa', subgroup: 'Belanja Jasa Sewa Peralatan/Perlengkapan', groupCode: '5.2.4', subgroupCode: '5.2.4.02' },
    { group: 'Belanja Jasa Sewa', subgroup: 'Belanja Jasa Sewa Sarana Mobilitas', groupCode: '5.2.4', subgroupCode: '5.2.4.03' },
    { group: 'Belanja Jasa Sewa', subgroup: 'Belanja Jasa Sewa Lainnya', groupCode: '5.2.4', subgroupCode: '5.2.4.90-99' },
    { group: 'Belanja Operasional Perkantoran', subgroup: 'Belanja Jasa Langganan Listrik', groupCode: '5.2.5', subgroupCode: '5.2.5.01' },
    { group: 'Belanja Operasional Perkantoran', subgroup: 'Belanja Jasa Langganan Air Bersih', groupCode: '5.2.5', subgroupCode: '5.2.5.02' },
    { group: 'Belanja Operasional Perkantoran', subgroup: 'Belanja Jasa Langganan Majalah/Surat Kabar', groupCode: '5.2.5', subgroupCode: '5.2.5.03' },
    { group: 'Belanja Operasional Perkantoran', subgroup: 'Belanja Jasa Langganan Telepon', groupCode: '5.2.5', subgroupCode: '5.2.5.04' },
    { group: 'Belanja Operasional Perkantoran', subgroup: 'Belanja Jasa Langganan Internet', groupCode: '5.2.5', subgroupCode: '5.2.5.05' },
    { group: 'Belanja Operasional Perkantoran', subgroup: 'Belanja Jasa Kurir/Pos/Giro', groupCode: '5.2.5', subgroupCode: '5.2.5.06' },
    { group: 'Belanja Operasional Perkantoran', subgroup: 'Belanja Jasa Perpanjangan Ijin/Pajak', groupCode: '5.2.5', subgroupCode: '5.2.5.07' },
    { group: 'Belanja Operasional Perkantoran', subgroup: 'Belanja Operasional Perkantoran Lainnya', groupCode: '5.2.5', subgroupCode: '5.2.5.90-99' },
    { group: 'Belanja Pemeliharaan', subgroup: 'Belanja Pemeliharaan Mesin dan Peralatan Berat', groupCode: '5.2.6', subgroupCode: '5.2.6.01' },
    { group: 'Belanja Pemeliharaan', subgroup: 'Belanja Pemeliharaan Kendaraan Bermotor', groupCode: '5.2.6', subgroupCode: '5.2.6.02' },
    { group: 'Belanja Pemeliharaan', subgroup: 'Belanja Pemeliharaan Peralatan', groupCode: '5.2.6', subgroupCode: '5.2.6.03' },
    { group: 'Belanja Pemeliharaan', subgroup: 'Belanja Pemeliharaan Bangunan', groupCode: '5.2.6', subgroupCode: '5.2.6.04' },
    { group: 'Belanja Pemeliharaan', subgroup: 'Belanja Pemeliharaan Jalan', groupCode: '5.2.6', subgroupCode: '5.2.6.05' },
    { group: 'Belanja Pemeliharaan', subgroup: 'Belanja Pemeliharaan Jembatan', groupCode: '5.2.6', subgroupCode: '5.2.6.06' },
    { group: 'Belanja Pemeliharaan', subgroup: 'Belanja Pemeliharaan Irigasi/Saluran Sungai/Embung/Air Bersih, jaringan Air Limbah, Persampahan, dll', groupCode: '5.2.6', subgroupCode: '5.2.6.07' },
    { group: 'Belanja Pemeliharaan', subgroup: 'Belanja Pemeliharaan Jaringan dan Instalasi (Listrik, Telepon, Internet, Komunikasi, dll)', groupCode: '5.2.6', subgroupCode: '5.2.6.08' },
    { group: 'Belanja Pemeliharaan', subgroup: 'Belanja Pemeliharaan Lainnya', groupCode: '5.2.6', subgroupCode: '5.2.6.90-99' },
    { group: 'Belanja Barang dan Jasa yang Diserahkan kepada Masyarakat', subgroup: 'Belanja Bahan Perlengkapan yang Diserahkan ke masyarakat', groupCode: '5.2.7', subgroupCode: '5.2.7.01' },
    { group: 'Belanja Barang dan Jasa yang Diserahkan kepada Masyarakat', subgroup: 'Belanja Bantuan Mesin/Kendaraan bermotor/Peralatan yang diserahkan ke masyarakat', groupCode: '5.2.7', subgroupCode: '5.2.7.02' },
    { group: 'Belanja Barang dan Jasa yang Diserahkan kepada Masyarakat', subgroup: 'Belanja Bantuan Bangunan yang diserahkan ke masyarakat', groupCode: '5.2.7', subgroupCode: '5.2.7.03' },
    { group: 'Belanja Barang dan Jasa yang Diserahkan kepada Masyarakat', subgroup: 'Belanja Beasiswa Berprestasi/Masyarakat Miskin', groupCode: '5.2.7', subgroupCode: '5.2.7.04' },
    { group: 'Belanja Barang dan Jasa yang Diserahkan kepada Masyarakat', subgroup: 'Belanja Bantuan Bibit Tanaman/Hewan/Ikan', groupCode: '5.2.7', subgroupCode: '5.2.7.05' },
    { group: 'Belanja Barang dan Jasa yang Diserahkan kepada Masyarakat', subgroup: 'Belanja Barang dan Jasa yang Diserahkan kepada Masyarakat Lainnya', groupCode: '5.2.7', subgroupCode: '5.2.7.90-99' },
    { group: 'Belanja Modal Pengadaan Tanah', subgroup: 'Belanja Modal Pembebasan/Pembelian Tanah', groupCode: '5.3.1', subgroupCode: '5.3.1.01' },
    { group: 'Belanja Modal Pengadaan Tanah', subgroup: 'Belanja Modal Pembayaran Honorarium Tim Tanah', groupCode: '5.3.1', subgroupCode: '5.3.1.02' },
    { group: 'Belanja Modal Pengadaan Tanah', subgroup: 'Belanja Modal Pengukuran dan Pembuatan Sertifikat Tanah', groupCode: '5.3.1', subgroupCode: '5.3.1.03' },
    { group: 'Belanja Modal Pengadaan Tanah', subgroup: 'Belanja Modal Pengurukan dan Pematangan Tanah', groupCode: '5.3.1', subgroupCode: '5.3.1.04' },
    { group: 'Belanja Modal Pengadaan Tanah', subgroup: 'Belanja Modal Perjalanan Pengadaan Tanah', groupCode: '5.3.1', subgroupCode: '5.3.1.05' },
    { group: 'Belanja Modal Pengadaan Tanah', subgroup: 'Belanja Modal Pengadaan Tanah Lainnya', groupCode: '5.3.1', subgroupCode: '5.3.1.90-99' },
    { group: 'Belanja Modal Peralatan, Mesin, dan Alat Berat', subgroup: 'Belanja Modal Honor Tim yang Melaksanakan Kegiatan', groupCode: '5.3.2', subgroupCode: '5.3.2.01' },
    { group: 'Belanja Modal Peralatan, Mesin, dan Alat Berat', subgroup: 'Belanja Modal Peralatan Elektronik dan Alat Studio', groupCode: '5.3.2', subgroupCode: '5.3.2.02' },
    { group: 'Belanja Modal Peralatan, Mesin, dan Alat Berat', subgroup: 'Belanja Modal Peralatan Komputer', groupCode: '5.3.2', subgroupCode: '5.3.2.03' },
    { group: 'Belanja Modal Peralatan, Mesin, dan Alat Berat', subgroup: 'Belanja Modal Peralatan Mebel dan Aksesori Ruangan', groupCode: '5.3.2', subgroupCode: '5.3.2.04' },
    { group: 'Belanja Modal Peralatan, Mesin, dan Alat Berat', subgroup: 'Belanja Modal Peralatan Dapur', groupCode: '5.3.2', subgroupCode: '5.3.2.05' },
    { group: 'Belanja Modal Peralatan, Mesin, dan Alat Berat', subgroup: 'Belanja Modal Peralatan Alat Ukur', groupCode: '5.3.2', subgroupCode: '5.3.2.06' },
    { group: 'Belanja Modal Peralatan, Mesin, dan Alat Berat', subgroup: 'Belanja Modal Peralatan Rambu-rambu/Patok Tanah', groupCode: '5.3.2', subgroupCode: '5.3.2.07' },
    { group: 'Belanja Modal Peralatan, Mesin, dan Alat Berat', subgroup: 'Belanja Modal Peralatan khusus Kesehatan', groupCode: '5.3.2', subgroupCode: '5.3.2.08' },
    { group: 'Belanja Modal Peralatan, Mesin, dan Alat Berat', subgroup: 'Belanja Modal Peralatan khusus Pertanian/Perikanan/Peternakan', groupCode: '5.3.2', subgroupCode: '5.3.2.09' },
    { group: 'Belanja Modal Peralatan, Mesin, dan Alat Berat', subgroup: 'Belanja Modal Mesin', groupCode: '5.3.2', subgroupCode: '5.3.2.10' },
    { group: 'Belanja Modal Peralatan, Mesin, dan Alat Berat', subgroup: 'Belanja Modal Pengadaan Alat-Alat Berat', groupCode: '5.3.2', subgroupCode: '5.3.2.11' },
    { group: 'Belanja Modal Peralatan, Mesin, dan Alat Berat', subgroup: 'Belanja Modal Peralatan, Mesin, dan Alat Berat Lainnya', groupCode: '5.3.2', subgroupCode: '5.3.2.90-99' },
    { group: 'Belanja Modal Kendaraan', subgroup: 'Belanja Modal Honor Tim yang Melaksanakan Kegiatan', groupCode: '5.3.3', subgroupCode: '5.3.3.01' },
    { group: 'Belanja Modal Kendaraan', subgroup: 'Belanja Modal Kendaraan Darat Bermotor', groupCode: '5.3.3', subgroupCode: '5.3.3.02' },
    { group: 'Belanja Modal Kendaraan', subgroup: 'Belanja Modal Angkutan Darat Tidak Bermotor', groupCode: '5.3.3', subgroupCode: '5.3.3.03' },
    { group: 'Belanja Modal Kendaraan', subgroup: 'Belanja Modal Angkutan Air Tidak Bermotor', groupCode: '5.3.3', subgroupCode: '5.3.3.05' },
    { group: 'Belanja Modal Kendaraan', subgroup: 'Belanja Modal Kendaraan Lainnya', groupCode: '5.3.3', subgroupCode: '5.3.3.90-99' },
    { group: 'Belanja Modal Gedung, Bangunan dan Taman', subgroup: 'Belanja Modal Honor Tim yang Melaksanakan Kegiatan', groupCode: '5.3.4', subgroupCode: '5.3.4.01' },
    { group: 'Belanja Modal Gedung, Bangunan dan Taman', subgroup: 'Belanja Modal Upah Tenaga Kerja', groupCode: '5.3.4', subgroupCode: '5.3.4.02' },
    { group: 'Belanja Modal Gedung, Bangunan dan Taman', subgroup: 'Belanja Modal Bahan Baku', groupCode: '5.3.4', subgroupCode: '5.3.4.03' },
    { group: 'Belanja Modal Gedung, Bangunan dan Taman', subgroup: 'Belanja Modal Sewa Peralatan', groupCode: '5.3.4', subgroupCode: '5.3.4.04' },
    { group: 'Belanja Modal Jalan/Prasarana Jalan', subgroup: 'Belanja Modal Honor Tim yang Melaksanakan Kegiatan', groupCode: '5.3.5', subgroupCode: '5.3.5.01' },
    { group: 'Belanja Modal Jalan/Prasarana Jalan', subgroup: 'Belanja Modal Upah Tenaga Kerja', groupCode: '5.3.5', subgroupCode: '5.3.5.02' },
    { group: 'Belanja Modal Jalan/Prasarana Jalan', subgroup: 'Belanja Modal Bahan Baku', groupCode: '5.3.5', subgroupCode: '5.3.5.03' },
    { group: 'Belanja Modal Jalan/Prasarana Jalan', subgroup: 'Belanja Modal Sewa Peralatan', groupCode: '5.3.5', subgroupCode: '5.3.5.04' },
    { group: 'Belanja Modal Jembatan', subgroup: 'Belanja Modal Honor Tim yang Melaksanakan Kegiatan', groupCode: '5.3.6', subgroupCode: '5.3.6.01' },
    { group: 'Belanja Modal Jembatan', subgroup: 'Belanja Modal Upah Tenaga Kerja', groupCode: '5.3.6', subgroupCode: '5.3.6.02' },
    { group: 'Belanja Modal Jembatan', subgroup: 'Belanja Modal Bahan Baku', groupCode: '5.3.6', subgroupCode: '5.3.6.03' },
    { group: 'Belanja Modal Jembatan', subgroup: 'Belanja Modal Sewa Peralatan', groupCode: '5.3.6', subgroupCode: '5.3.6.04' },
    { group: 'Belanja Modal Irigasi/Embung/Air Sungai/Drainase/Air Limbah/Persampahan', subgroup: 'Belanja Modal Honor Tim yang Melaksanakan Kegiatan', groupCode: '5.3.7', subgroupCode: '5.3.7.01' },
    { group: 'Belanja Modal Irigasi/Embung/Air Sungai/Drainase/Air Limbah/Persampahan', subgroup: 'Belanja Modal Upah Tenaga Kerja', groupCode: '5.3.7', subgroupCode: '5.3.7.02' },
    { group: 'Belanja Modal Irigasi/Embung/Air Sungai/Drainase/Air Limbah/Persampahan', subgroup: 'Belanja Modal Bahan Baku', groupCode: '5.3.7', subgroupCode: '5.3.7.03' },
    { group: 'Belanja Modal Irigasi/Embung/Air Sungai/Drainase/Air Limbah/Persampahan', subgroup: 'Belanja Modal Sewa Peralatan', groupCode: '5.3.7', subgroupCode: '5.3.7.04' },
    { group: 'Belanja Modal Jaringan/Instalasi', subgroup: 'Belanja Modal Honor Tim yang Melaksanakan Kegiatan', groupCode: '5.3.8', subgroupCode: '5.3.8.01' },
    { group: 'Belanja Modal Jaringan/Instalasi', subgroup: 'Belanja Modal Upah Tenaga Kerja', groupCode: '5.3.8', subgroupCode: '5.3.8.02' },
    { group: 'Belanja Modal Jaringan/Instalasi', subgroup: 'Belanja Modal Bahan Baku', groupCode: '5.3.8', subgroupCode: '5.3.8.03' },
    { group: 'Belanja Modal Jaringan/Instalasi', subgroup: 'Belanja Modal Sewa Peralatan', groupCode: '5.3.8', subgroupCode: '5.3.8.04' },
    { group: 'Belanja Modal lainnya', subgroup: 'Belanja Modal khusus Pendidikan dan Perpustakaan', groupCode: '5.3.9', subgroupCode: '5.3.9.01' },
    { group: 'Belanja Modal lainnya', subgroup: 'Belanja Modal khusus Olahraga', groupCode: '5.3.9', subgroupCode: '5.3.9.02' },
    { group: 'Belanja Modal lainnya', subgroup: 'Belanja Modal khusus Kesenian/Kebudayaan/keagamaan', groupCode: '5.3.9', subgroupCode: '5.3.9.03' },
    { group: 'Belanja Modal lainnya', subgroup: 'Belanja Modal Tumbuhan/Tanaman', groupCode: '5.3.9', subgroupCode: '5.3.9.04' },
    { group: 'Belanja Modal lainnya', subgroup: 'Belanja Modal Hewan', groupCode: '5.3.9', subgroupCode: '5.3.9.05' },
    { group: 'Belanja Modal lainnya', subgroup: 'Belanja Modal Lainnya', groupCode: '5.3.9', subgroupCode: '5.3.9.90-99' },
    { group: 'Belanja Tak Terduga', subgroup: 'Belanja Tak Terduga', groupCode: '5.4.1', subgroupCode: '5.4.1.01' }
];

// Peta kode unik Group / Sub Group (5.1.1, 5.1.1.01, dst) untuk pengurutan tampilan item RAB
const RAB_GROUP_CODE = {};
const RAB_SUBGROUP_CODE = {};
rabCategories.forEach(c => {
    if (c.group && c.groupCode && !RAB_GROUP_CODE[c.group]) RAB_GROUP_CODE[c.group] = c.groupCode;
    if (c.subgroup && c.subgroupCode && !RAB_SUBGROUP_CODE[c.subgroup]) {
        RAB_SUBGROUP_CODE[c.subgroup] = c.subgroupCode.replace(/90-99$/, '99');
    }
});

// Alias & variasi penulisan kelompok/sub-kelompok belanja SisKeuDes
const SUBGROUP_ALIASES = {
    'Belanja Alat Tulis Kantor dan Benda Pos': '5.2.1.01',
    'Belanja Perlengkapan Alat Tulis Kantor dan Benda Pos': '5.2.1.01',
    'Belanja Alat Tulis Kantor': '5.2.1.01',
    'Alat Tulis Kantor dan Benda Pos': '5.2.1.01',
    'Alat Tulis Kantor': '5.2.1.01',
    'Belanja ATK': '5.2.1.01',
    'ATK': '5.2.1.01',
    'Belanja Alat-alat Listrik': '5.2.1.02',
    'Belanja Perlengkapan Alat-alat Listrik': '5.2.1.02',
    'Belanja Alat Listrik': '5.2.1.02',
    'Alat-alat Listrik': '5.2.1.02',
    'Belanja Perlengkapan Alat-alat Rumah Tangga/Peralatan dan Bahan Kebersihan': '5.2.1.03',
    'Belanja Perlengkapan Alat-alat Rumah Tangga dan Bahan Kebersihan': '5.2.1.03',
    'Belanja Alat-alat Rumah Tangga dan Bahan Kebersihan': '5.2.1.03',
    'Belanja Alat Rumah Tangga dan Bahan Kebersihan': '5.2.1.03',
    'Belanja Bahan Bakar Minyak/Gas/Isi Ulang Tabung Pemadam Kebakaran': '5.2.1.04',
    'Belanja Bahan Bakar Minyak/Gas': '5.2.1.04',
    'Belanja BBM/Gas': '5.2.1.04',
    'Belanja BBM': '5.2.1.04',
    'Belanja Perlengkapan Cetak/Penggandaan - Belanja Barang Cetak dan Penggandaan': '5.2.1.05',
    'Belanja Perlengkapan Cetak/Penggandaan': '5.2.1.05',
    'Belanja Cetak dan Penggandaan': '5.2.1.05',
    'Belanja Cetak/Penggandaan': '5.2.1.05',
    'Belanja Perlengkapan Barang Konsumsi (Makan/minum) - Belanja Barang Konsumsi': '5.2.1.06',
    'Belanja Perlengkapan Barang Konsumsi': '5.2.1.06',
    'Belanja Makan dan Minum': '5.2.1.06',
    'Belanja Makan/Minum': '5.2.1.06',
    'Belanja Konsumsi': '5.2.1.06',
    'Belanja Bahan/Material': '5.2.1.07',
    'Belanja Bahan dan Material': '5.2.1.07',
    'Belanja Bahan Baku': '5.2.1.07',
    'Belanja Bendera/Umbul-umbul/Spanduk': '5.2.1.08',
    'Belanja Bendera, Umbul-umbul dan Spanduk': '5.2.1.08',
    'Belanja Spanduk': '5.2.1.08',
    'Belanja Pakaian Dinas/Seragam/Atribut': '5.2.1.09',
    'Belanja Pakaian Dinas/Seragam': '5.2.1.09',
    'Belanja Pakaian Dinas': '5.2.1.09',
    'Belanja Seragam': '5.2.1.09',
    'Belanja Obat-obatan': '5.2.1.10',
    'Belanja Pakan Hewan/Ikan, Obat-obatan Hewan': '5.2.1.11',
    'Belanja Pakan Hewan/Ikan': '5.2.1.11',
    'Belanja Pupuk/Obat-obatan Pertanian': '5.2.1.12',
    'Belanja Pupuk dan Obat-obatan Pertanian': '5.2.1.12',
    'Belanja Barang Perlengkapan': '5.2.1.99',
    'Belanja Barang Perlengkapan Lainnya': '5.2.1.99',
    'Belanja Perlengkapan Lainnya': '5.2.1.99',
    'Belanja Pemeliharaan Mesin dan Peralatan Berat': '5.2.6.01',
    'Belanja Pemeliharaan Kendaraan Bermotor': '5.2.6.02',
    'Belanja Pemeliharaan Peralatan': '5.2.6.03',
    'Belanja Modal Peralatan Komputer': '5.3.2.03'
};
Object.assign(RAB_SUBGROUP_CODE, SUBGROUP_ALIASES);

function getRabGroupCode(groupName) {
    if (!groupName) return '9.9.9';
    const raw = String(groupName).trim();
    if (RAB_GROUP_CODE[raw]) return RAB_GROUP_CODE[raw];
    const norm = raw.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    for (const [k, v] of Object.entries(RAB_GROUP_CODE)) {
        const kNorm = k.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
        if (norm === kNorm) return v;
    }
    if (norm.includes('kepala desa') && (norm.includes('siltap') || norm.includes('penghasilan tetap') || norm.includes('tunjangan'))) return '5.1.1';
    if (norm.includes('perangkat desa') && (norm.includes('siltap') || norm.includes('penghasilan tetap') || norm.includes('tunjangan'))) return '5.1.2';
    if (norm.includes('jaminan') && norm.includes('sosial')) return '5.1.3';
    if (norm.includes('bpd')) return '5.1.4';
    if (norm.includes('pegawai')) return '5.1';
    if (norm.includes('perlengkapan')) return '5.2.1';
    if (norm.includes('honor')) return '5.2.2';
    if (norm.includes('perjalanan') && norm.includes('dinas')) return '5.2.3';
    if (norm.includes('sewa')) return '5.2.4';
    if (norm.includes('operasional') && (norm.includes('kantor') || norm.includes('perkantoran'))) return '5.2.5';
    if (norm.includes('pemeliharaan')) return '5.2.6';
    if (norm.includes('diserahkan') || norm.includes('masyarakat')) return '5.2.7';
    if (norm.includes('barang') && norm.includes('jasa')) return '5.2';
    if (norm.includes('tanah')) return '5.3.1';
    if (norm.includes('peralatan') || norm.includes('mesin') || norm.includes('alat berat')) return '5.3.2';
    if (norm.includes('kendaraan')) return '5.3.3';
    if (norm.includes('gedung') || norm.includes('bangunan') || norm.includes('taman')) return '5.3.4';
    if (norm.includes('jalan')) return '5.3.5';
    if (norm.includes('jembatan')) return '5.3.6';
    if (norm.includes('irigasi') || norm.includes('embung') || norm.includes('drainase')) return '5.3.7';
    if (norm.includes('jaringan') || norm.includes('instalasi')) return '5.3.8';
    if (norm.includes('modal')) return '5.3.9';
    if (norm.includes('tak terduga')) return '5.4.1';
    return '9.9.9';
}

function getRabSubgroupCode(subgroupName, groupName) {
    const rawSub = String(subgroupName || '').trim();
    const rawGrp = String(groupName || '').trim();

    if (rawSub) {
        // 1. Cek langsung kecocokan persis pasangan (group, subgroup) di master rabCategories
        if (rawGrp) {
            const direct = rabCategories.find(c =>
                c.group && c.subgroup &&
                c.group.toLowerCase() === rawGrp.toLowerCase() &&
                c.subgroup.toLowerCase() === rawSub.toLowerCase()
            );
            if (direct && direct.subgroupCode) {
                return direct.subgroupCode.replace(/90-99$/, '99');
            }
        }

        // 2. Cek kecocokan subgroup berdasarkan kode group (5.1.1, 5.2.1, 5.3.4, dst)
        const grpCode = getRabGroupCode(groupName);
        if (grpCode && grpCode !== '9.9.9') {
            const inGrp = rabCategories.find(c =>
                c.groupCode === grpCode &&
                c.subgroup &&
                c.subgroup.toLowerCase() === rawSub.toLowerCase()
            );
            if (inGrp && inGrp.subgroupCode) {
                return inGrp.subgroupCode.replace(/90-99$/, '99');
            }

            // Normalisasi variasi penulisan subgroup di dalam group tersebut
            const normSub = rawSub.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
            const inGrpNorm = rabCategories.find(c => {
                if (c.groupCode !== grpCode) return false;
                const cNorm = c.subgroup.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
                return cNorm === normSub;
            });
            if (inGrpNorm && inGrpNorm.subgroupCode) {
                return inGrpNorm.subgroupCode.replace(/90-99$/, '99');
            }

            // Heuristik khusus untuk Belanja Modal Fisik (5.3.4 - 5.3.8) sesuai urutan baku SisKeuDes:
            // .01: Honor Tim, .02: Upah, .03: Bahan Baku, .04: Sewa
            if (grpCode === '5.3.4' || grpCode === '5.3.5' || grpCode === '5.3.6' || grpCode === '5.3.7' || grpCode === '5.3.8') {
                if (normSub.includes('honor') || normSub.includes('tim')) return grpCode + '.01';
                if (normSub.includes('upah')) return grpCode + '.02';
                if (normSub.includes('bahan') || normSub.includes('material')) return grpCode + '.03';
                if (normSub.includes('sewa')) return grpCode + '.04';
            }
        }

        // 3. Cek map alias
        if (RAB_SUBGROUP_CODE[rawSub]) return RAB_SUBGROUP_CODE[rawSub];
        const normSub = rawSub.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
        for (const [k, v] of Object.entries(RAB_SUBGROUP_CODE)) {
            const kNorm = k.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
            if (normSub === kNorm) return v;
        }

        // 4. Heuristik untuk 5.2.1 (hanya jika group bukan modal fisik)
        if (!grpCode || grpCode === '5.2.1' || grpCode === '5.2') {
            if (normSub.includes('tulis') || normSub.includes('benda pos') || normSub.includes('atk')) return '5.2.1.01';
            if (normSub.includes('listrik')) return '5.2.1.02';
            if (normSub.includes('rumah tangga') || normSub.includes('kebersihan')) return '5.2.1.03';
            if (normSub.includes('bbm') || normSub.includes('minyak') || normSub.includes('pemadam')) return '5.2.1.04';
            if (normSub.includes('cetak') || normSub.includes('penggandaan')) return '5.2.1.05';
            if (normSub.includes('konsumsi') || normSub.includes('makan') || normSub.includes('minum')) return '5.2.1.06';
            if (normSub.includes('bahan') || normSub.includes('material')) return '5.2.1.07';
            if (normSub.includes('bendera') || normSub.includes('spanduk') || normSub.includes('umbul')) return '5.2.1.08';
            if (normSub.includes('pakaian') || normSub.includes('seragam') || normSub.includes('atribut')) return '5.2.1.09';
            if (normSub.includes('obat') && !normSub.includes('hewan') && !normSub.includes('pertanian')) return '5.2.1.10';
            if (normSub.includes('pakan') || (normSub.includes('hewan') && !normSub.includes('modal'))) return '5.2.1.11';
            if (normSub.includes('pupuk') || (normSub.includes('pertanian') && !normSub.includes('modal'))) return '5.2.1.12';

            if (normSub.includes('perlengkapan')) return '5.2.1.99';
        }
    }

    const grpCode = getRabGroupCode(groupName);
    if (grpCode && grpCode !== '9.9.9') {
        return grpCode + '.99';
    }
    return '9.9.9.99';
}

function compareKodeRAB(codeA, codeB) {
    const toParts = c => String(c || '').split('.').filter(Boolean).map(p => parseInt(p, 10) || 0);
    const pa = toParts(codeA);
    const pb = toParts(codeB);
    const maxLen = Math.max(pa.length, pb.length);
    for (let i = 0; i < maxLen; i++) {
        const a = pa[i] !== undefined ? pa[i] : 0;
        const b = pb[i] !== undefined ? pb[i] : 0;
        if (a !== b) return a - b;
    }
    const sa = String(codeA || '');
    const sb = String(codeB || '');
    return sa < sb ? -1 : (sa > sb ? 1 : 0);
}

function getRabItemRekening(it) {
    if (!it || typeof it !== 'object') return '9.9.9.99';
    let code = '';
    if (it.kode_rekening) {
        code = String(it.kode_rekening).trim();
    } else {
        const sub = String(it.subgroup || it.sub_kelompok || '').trim();
        const grp = String(it.group || it.group_belanja || it.kelompok_belanja || '').trim();
        code = getRabSubgroupCode(sub, grp);
    }
    if ((!code || code === '9.9.9.99' || code === '9.9.9') && it) {
        const u = String(it.uraian || it.nama_barang || it.nama || '').trim().toLowerCase();
        if (u.includes('kertas') || u.includes('buku') || u.includes('amplop') || u.includes('pulpen') || u.includes('spidol') || u.includes('map')) {
            code = '5.2.1.01';
        }
    }
    return code.replace(/\.+$/, '');
}

const SISKEUDES_ITEM_ORDER = [
    'kertas f4',
    'kertas hvs f4',
    'kertas a4',
    'kertas hvs a4',
    'bundel besar',
    'bundel kecil',
    'polpen tanda tangan',
    'tinta black',
    'tinta warna',
    'buku polio',
    'buku folio',
    'pulpen',
    'lem',
    'map lubang plastik',
    'map plastik lubang',
    'map biasa',
    'peluru hekter',
    'amplop',
    'gunting',
    'lakban',
    'tinta prind black',
    'tinta print black',
    'tinta prind warna',
    'tinta print warna',
    'tinta printer',
    'tinta infus black',
    'tinta infus warna',
    'tinta refill black',
    'tinta refill color',
    'map plastik',
    'map jepit',
    'map binder file',
    'notebook',
    'karton manila',
    'hekter',
    'lampu',
    'snack',
    'nasi dos',
    'nasi kotak',
    'baleho 2x3',
    'baleho kegiatan 2x1',
    'baju keki',
    'baju seragam',
    'insentif petugas kebersihan',
    'token listrik',
    'majalah central news',
    'wifi/internet',
    'ganti oli',
    'service',
    'pajak motor',
    'perbaikan motor',
    'perbaikan printer',
    'perbaikan standinfografis'
];

function canonicalRabKey(str) {
    if (!str) return '';
    let s = String(str).toLowerCase();
    s = s.replace(/[.,\-_:;/\\()]/g, ' ');
    s = s.replace(/\bsekdes\b/g, 'sekretaris desa');
    s = s.replace(/\bkadus\b/g, 'kepala dusun');
    s = s.replace(/\bperencanaa\b/g, 'perencanaan');
    s = s.replace(/\btu\b/g, 'dan tu');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
}
window.canonicalRabKey = canonicalRabKey;

function getSiskeudesItemIndex(uraian) {
    if (!uraian) return -1;
    const norm = String(uraian).trim().toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
    return SISKEUDES_ITEM_ORDER.findIndex(key => norm === key || norm.startsWith(key));
}

function sortRabItems(items) {
    if (!Array.isArray(items)) return [];
    const hasManualOrder = items.some(it => it && it.urutan_manual !== undefined && it.urutan_manual !== null && it.urutan_manual !== '');
    if (hasManualOrder) {
        const sorted = [...items].sort((a, b) => {
            const rekA = getRabItemRekening(a);
            const rekB = getRabItemRekening(b);
            const cmp = compareKodeUnikFull(rekA, rekB);
            if (cmp !== 0) return cmp;

            const uA = Number(a.urutan_manual !== undefined && a.urutan_manual !== null && a.urutan_manual !== '' ? a.urutan_manual : (a.urutan || a.no || 999999));
            const uB = Number(b.urutan_manual !== undefined && b.urutan_manual !== null && b.urutan_manual !== '' ? b.urutan_manual : (b.urutan || b.no || 999999));
            if (uA !== uB) return uA - uB;
            return 0;
        });
        const subCounters = {};
        return sorted.map((it, idx) => {
            const subKey = String(it.subgroup || it.sub_kelompok || it.group || '').trim();
            subCounters[subKey] = (subCounters[subKey] || 0) + 1;
            const subNo = subCounters[subKey];
            return {
                ...it,
                no: subNo,
                urutan: subNo,
                urutan_manual: subNo,
                no_subgroup: subNo,
                urutan_subgroup: subNo
            };
        });
    }
    const sorted = [...items].sort((a, b) => {
        const rekA = getRabItemRekening(a);
        const rekB = getRabItemRekening(b);
        const cmp = compareKodeUnikFull(rekA, rekB);
        if (cmp !== 0) return cmp;

        // Prioritas Urutan Standar SisKeuDes (Kertas f4 di #1, Kertas A4 di #2, Bundel Besar di #3, ..., Amplop di #14, dst)
        const idxA = getSiskeudesItemIndex(a.uraian || a.nama_barang || a.nama);
        const idxB = getSiskeudesItemIndex(b.uraian || b.nama_barang || b.nama);
        if (idxA !== -1 && idxB !== -1) {
            if (idxA !== idxB) return idxA - idxB;
        } else if (idxA !== -1) {
            return -1;
        } else if (idxB !== -1) {
            return 1;
        }

        const noA = Number(a.no || a.urutan || 0);
        const noB = Number(b.no || b.urutan || 0);
        if (noA && noB && noA !== noB) return noA - noB;

        return String(a.uraian || a.nama_barang || '').localeCompare(String(b.uraian || b.nama_barang || ''), undefined, { numeric: true, sensitivity: 'base' });
    });
    const subCounters = {};
    return sorted.map((it, idx) => {
        const subKey = String(it.subgroup || it.sub_kelompok || it.group || '').trim();
        subCounters[subKey] = (subCounters[subKey] || 0) + 1;
        const subNo = subCounters[subKey];
        return {
            ...it,
            no: it.no !== undefined ? it.no : (idx + 1),
            urutan: it.urutan !== undefined ? it.urutan : (idx + 1),
            no_subgroup: subNo,
            urutan_subgroup: subNo
        };
    });
}
window.sortRabItems = sortRabItems;
window.getRabItemRekening = getRabItemRekening;

// STRICT BASELINE CLONE & STRICT APPEND HELPER
// Menjamin array items Perubahan menjiplak 1:1 urutan index Murni (0 s.d. N),
// dan uraian/item baru murni diletakkan di indeks paling bawah array (append at bottom).
function buildPerubahanItemsFromBaseline(murniItems, perItems, murniId) {
    const mArr = Array.isArray(murniItems) ? murniItems : [];
    const pArr = Array.isArray(perItems) ? perItems : [];
    const usedP = new Set();
    const norm = (v) => String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, ' ');

    const updated = [];

    // 1. BASELINE CLONE: Kloning 1:1 mengikuti urutan index Murni (0 s.d. N)
    mArr.forEach((m, mIdx) => {
        const mCanon = canonicalRabKey(m.uraian);
        const mSub = norm(m.subgroup || m.sub_kelompok);

        let pMatchIdx = pArr.findIndex((p, idx) => {
            if (usedP.has(idx)) return false;
            const pCanon = canonicalRabKey(p.uraian);
            const pCanonMurni = canonicalRabKey(p.uraian_murni);
            const pSub = norm(p.subgroup || p.sub_kelompok);
            if (pCanon === mCanon && (!mSub || !pSub || mSub === pSub)) return true;
            if (pCanonMurni && pCanonMurni === mCanon && (!mSub || !pSub || mSub === pSub)) return true;
            if (pCanon === mCanon) return true;
            if (p.urutan_murni === mIdx && (pCanon === mCanon || pCanonMurni === mCanon)) return true;
            return false;
        });

        if (pMatchIdx >= 0) {
            usedP.add(pMatchIdx);
            const pMatch = pArr[pMatchIdx];
            updated.push({
                ...pMatch,
                group: (m.group || pMatch.group || '').trim(),
                subgroup: (m.subgroup || pMatch.subgroup || '').trim(),
                urutan_murni: mIdx,
                uraian_murni: (m.uraian || '').trim(),
                volume_murni: Number(m.volume || 1),
                satuan_murni: m.satuan || pMatch.satuan || '',
                harga_murni: Number(m.harga || m.harga_satuan || 0),
                jumlah_murni: Number(m.jumlah !== undefined ? m.jumlah : (Number(m.volume || 1) * Number(m.harga || 0))),
                id_referensi_murni: murniId || m.id_referensi_murni || null,
                item_baru: false,
                urutan_manual: mIdx + 1,
                urutan: mIdx + 1,
                no: mIdx + 1
            });
        } else {
            // Item murni belum tersimpan di perubahan -> drafkan persis
            const vol = Number(m.volume || 1);
            const hrg = Number(m.harga || m.harga_satuan || 0);
            const jml = Number(m.jumlah !== undefined ? m.jumlah : (vol * hrg));
            updated.push({
                group: (m.group || m.group_belanja || m.group_nama || '').trim(),
                subgroup: (m.subgroup || m.group_kegiatan || m.jenis_kegiatan || '').trim(),
                uraian: (m.uraian || '').trim(),
                volume: vol,
                satuan: String(m.satuan || 'Paket').trim(),
                harga: hrg,
                jumlah: jml,
                sumber: normalizeSumberDana(m.sumber || m.sumber_dana || 'ADD (Alokasi Dana Desa)'),
                keterangan: String(m.keterangan || '').trim(),
                urutan_murni: mIdx,
                uraian_murni: (m.uraian || '').trim(),
                volume_murni: vol,
                satuan_murni: String(m.satuan || '').trim(),
                harga_murni: hrg,
                jumlah_murni: jml,
                id_referensi_murni: murniId || m.id_referensi_murni || null,
                item_baru: false,
                item_dihapus: false,
                urutan_manual: mIdx + 1,
                urutan: mIdx + 1,
                no: mIdx + 1
            });
        }
    });

    // 2. STRICT APPEND: Penambahan uraian/item baru diletakkan di indeks paling bawah array
    pArr.forEach((p, idx) => {
        if (!usedP.has(idx)) {
            updated.push({
                ...p,
                urutan_murni: null,
                item_baru: true,
                urutan_manual: updated.length + 1,
                urutan: updated.length + 1,
                no: updated.length + 1
            });
        }
    });

    return updated;
}
window.buildPerubahanItemsFromBaseline = buildPerubahanItemsFromBaseline;

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toast-msg');
    toast.className = `toast show ${type}`;
    msg.textContent = message;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3500);
}

function formatRupiah(value) {
    if (value === null || value === undefined || value === '') return '0';
    const number = Number(String(value).replace(/\D/g, '')) || 0;
    return new Intl.NumberFormat('id-ID').format(number);
}

function parseNumber(value) {
    if (value === null || value === undefined) return 0;
    // Hilangkan semua titik (.) pemisah ribuan dari input rupiah terlebih dahulu
    let cleaned = String(value).replace(/\./g, '');
    // Ganti koma (,) dengan titik desimal (.)
    cleaned = cleaned.replace(/,/g, '.');
    // Hapus karakter non-numerik selain angka, tanda minus, dan titik desimal
    cleaned = cleaned.replace(/[^0-9.-]/g, '');
    return Number(cleaned) || 0;
}

function formatRupiahInput(el) {
    const value = el.value.replace(/\D/g, '');
    el.value = value ? formatRupiah(value) : '';
}

async function loadInitialData() {
    // 1. Cek parameter URL terlebih dahulu (?tahun=...&tipe=...)
    const urlParams = new URLSearchParams(window.location.search);
    const tahunFromUrl = urlParams.get('tahun');
    const tipeFromUrl = urlParams.get('tipe') || urlParams.get('tipe_anggaran');

    if (tahunFromUrl) {
        const parsedY = parseInt(tahunFromUrl, 10);
        if (Number.isFinite(parsedY) && parsedY >= 2020 && parsedY <= 2035) {
            rabYear = parsedY;
        }
    } else {
        rabYear = getDefaultYear();
    }

    if (tipeFromUrl) {
        rabTipe = String(tipeFromUrl).toUpperCase().trim() === RAB_TIPE_PERUBAHAN
            ? RAB_TIPE_PERUBAHAN
            : RAB_TIPE_MURNI;
    } else {
        rabTipe = getDefaultTipe();
    }

    // Persist ke localStorage
    try {
        localStorage.setItem('rab_tahun_anggaran', String(rabYear));
        localStorage.setItem('sia_tahun_anggaran', String(rabYear));
        localStorage.setItem('rab_tipe_anggaran', rabTipe);
        localStorage.setItem('sia_tipe_anggaran', rabTipe);
    } catch (_) {}

    // Sinkronkan elemen dropdown di DOM jika sudah tersedia
    const selYear = document.getElementById('select-year');
    if (selYear) {
        selYear.value = String(rabYear);
    }
    const selTipe = document.getElementById('select-tipe-anggaran');
    if (selTipe) {
        selTipe.value = rabTipe;
    }
    applyReadOnlyMode();

    populateGroupOptions();
    await loadSumberDana();
    await loadRabActivities();
    await loadSavedRabList();
    await loadPaguAnggaran(rabYear);
    loadUnitsFromLocalStorage();
    populateUnitOptions();
    // attach handlers for unit manual entry
    const satuanInput = document.getElementById('input-satuan');
    if (satuanInput) {
        satuanInput.addEventListener('blur', (e) => {
            const v = e.target.value.trim();
            if (v) {
                addCustomUnit(v);
            }
        });
    }

    // attach handlers for signatory manual entry
    const selPenandatangan = document.getElementById('selectPenandatangan');
    const inputManual = document.getElementById('inputNamaManual');
    if (selPenandatangan && inputManual) {
        selPenandatangan.addEventListener('change', (e) => {
            if (e.target.value === 'manual') {
                inputManual.classList.remove('hidden');
                inputManual.style.display = 'block';
                inputManual.focus();
            } else {
                inputManual.classList.add('hidden');
                inputManual.style.display = 'none';
            }
        });
    }

    initUnsavedChangesTracker();

    // Handle redirect from rkpdes or pembiayaan page with multi-tier smart auto-select
    await applyAutoSelectFromNavigation();
}

function populateGroupOptions() {
    const select = document.getElementById('select-group');
    const groups = [...new Set(rabCategories.map(item => item.group))];
    select.innerHTML = '<option value="">-- Pilih Group --</option>';
    groups.forEach(group => select.innerHTML += `<option value="${group}">${group}</option>`);
}

function populateUnitOptions() {
    const units = [...new Set([...defaultUnits, ...customUnits])];
    const datalist = document.getElementById('satuan-list');
    if (!datalist) return;
    datalist.innerHTML = '';
    units.forEach(u => datalist.innerHTML += `<option value="${u}">`);
}

function loadUnitsFromLocalStorage() {
    try {
        const stored = localStorage.getItem('rab_custom_units');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                const extra = parsed.filter(u => !!u && !defaultUnits.includes(u));
                customUnits = [...new Set([...(customUnits || []), ...extra])];
            }
        }
    } catch (_) {}
}

function addCustomUnit(unit) {
    unit = String(unit || '').trim();
    if (!unit) return;
    if (defaultUnits.includes(unit) || customUnits.includes(unit)) {
        return; // Sudah ada
    }
    customUnits.push(unit);
    populateUnitOptions();
    try {
        localStorage.setItem('rab_custom_units', JSON.stringify(customUnits));
    } catch (_) {}
}

function getSatuanValue() {
    const input = document.getElementById('input-satuan');
    return input ? input.value.trim() : '';
}

function onGroupChange() {
    const group = document.getElementById('select-group').value;
    const select = document.getElementById('select-subgroup');
    select.innerHTML = '<option value="">-- Pilih Sub Group --</option>';
    const items = rabCategories.filter(item => item.group === group);
    items.forEach(item => {
        select.innerHTML += `<option value="${item.subgroup}">${item.subgroup}</option>`;
    });
    // if only one subgroup available, auto-select it for convenience
    const optionsCount = select.options.length;
    if (optionsCount === 2) { // 1 placeholder + 1 real option
        select.selectedIndex = 1;
    }
}

function normalizeSumberDana(raw) {
    if (!raw) return '';
    const s = String(raw).trim();
    if (!s) return '';
    const upper = s.toUpperCase();

    // Standardisasi variasi ADD: "add", "ADD", "add (Alokasi Dana Desa)", "ADD (Alokasi Dana Desa)", "Alokasi Dana Desa"
    if (upper === 'ADD' || upper.includes('ALOKASI DANA') || /^ADD\b/i.test(s) || /^\(?ADD\)?$/i.test(s)) {
        return 'ADD (Alokasi Dana Desa)';
    }

    // Standardisasi variasi DDS: "dds", "DDS", "DDS (Dana Desa)", "Dana Desa"
    if (upper === 'DDS' || upper === 'DD' || upper.includes('DANA DESA') || /^DDS\b/i.test(s) || /^\(?DDS\)?$/i.test(s)) {
        return 'DDS (Dana Desa)';
    }

    // Standardisasi variasi PBH: "pbh", "PBH", "Bagi Hasil Pajak", etc.
    if (upper === 'PBH' || upper.includes('BAGI HASIL') || upper.includes('PAJAK') || upper.includes('RETRIBUSI')) {
        return 'PBH (Bagi Hasil Pajak & Retribusi)';
    }

    // Standardisasi variasi APBD Tk. I
    if (upper.includes('APBD TK. I') || upper.includes('APBD I') || upper.includes('PROVINSI') || upper.includes('BKK PROV')) {
        return 'APBD Tk. I (Provinsi)';
    }

    // Standardisasi variasi APBD Tk. II
    if (upper.includes('APBD TK. II') || upper.includes('APBD II') || upper.includes('KABUPATEN') || upper.includes('KOTA')) {
        return 'APBD Tk. II (Kabupaten)';
    }

    // Standardisasi variasi PAD
    if (upper === 'PAD' || upper.includes('PENDAPATAN ASLI')) {
        return 'PAD (Pendapatan Asli Desa)';
    }

    return s;
}

async function loadSumberDana(preselected) {
    const el = document.getElementById('select-sumber-dana');
    if (!el) return;
    el.innerHTML = '<option value="">-- Pilih --</option>';
    try {
        const res = await fetch(`${API_URL}/sumber-dana`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            const seen = new Set();
            json.data.forEach(item => {
                const norm = normalizeSumberDana(item);
                if (norm && !seen.has(norm)) {
                    seen.add(norm);
                    el.innerHTML += `<option value="${norm}">${norm}</option>`;
                }
            });
            if (!seen.has('ADD (Alokasi Dana Desa)')) {
                el.innerHTML += `<option value="ADD (Alokasi Dana Desa)">ADD (Alokasi Dana Desa)</option>`;
            }
            if (!seen.has('DDS (Dana Desa)')) {
                el.innerHTML += `<option value="DDS (Dana Desa)">DDS (Dana Desa)</option>`;
            }
            autoSelectSumberDana(el, preselected);
            return;
        }
    } catch (error) {
        console.error(error);
    }
    const defaultList = [
        'ADD (Alokasi Dana Desa)',
        'DDS (Dana Desa)',
        'PBH (Bagi Hasil Pajak & Retribusi)',
        'APBD Tk. I (Provinsi)',
        'APBD Tk. II (Kabupaten)',
        'PAD (Pendapatan Asli Desa)'
    ];
    defaultList.forEach(item => el.innerHTML += `<option value="${item}">${item}</option>`);
    autoSelectSumberDana(el, preselected);
}

function autoSelectSumberDana(el, sumberText) {
    if (!el || !sumberText) return;
    const s = String(sumberText).trim();
    if (!s) return;
    const norm = normalizeSumberDana(s);
    // 1. Coba cocokkan dengan nilai normalisasi baku
    const matchNorm = [...el.options].find(o => o.value === norm);
    if (matchNorm) {
        el.value = matchNorm.value;
        return;
    }
    // 2. Nonaktifkan placeholder "Pilih" bila ada kecocokan exact
    const matchExact = [...el.options].find(o => o.value.toLowerCase() === s.toLowerCase());
    if (matchExact) {
        el.value = matchExact.value;
        return;
    }
    // 3. Fallback: cari opsi yang cocok normalisasi (contain-additive, hindari salah-maps ADD/TK)
    const code = normalizeSumberCode(s);
    const fallback = [...el.options].find(o => normalizeSumberCode(o.value) === code);
    if (fallback) {
        el.value = fallback.value;
    }
}

let _autoSelectInProgress = false;
let _autoSelectRetryCount = 0;
let _autoSelectDone = false;

async function applyAutoSelectFromNavigation() {
    if (_autoSelectInProgress || _autoSelectDone) return;

    // 1. Ambil target dari URL params atau localStorage fallback
    const urlParams = new URLSearchParams(window.location.search);
    const targetKode = (urlParams.get('kode_unik') || urlParams.get('kode') || localStorage.getItem('rab_target_kode') || '').trim();
    const targetNama = (urlParams.get('nama') || localStorage.getItem('rab_target_nama') || '').trim();

    // Jika tidak ada target navigasi, tidak perlu lakukan auto-select
    if (!targetKode && !targetNama) return;

    const selectEl = document.getElementById('select-kode-unik');
    if (!selectEl) return;

    // Guard Asinkron: Pastikan seluruh <option> dari API sudah terisi di dropdown
    // Jika dropdown masih kosong atau baru ada placeholder (-- Pilih...), tunggu dengan retry
    if (selectEl.options.length <= 1) {
        if (_autoSelectRetryCount < 20) {
            _autoSelectRetryCount++;
            setTimeout(applyAutoSelectFromNavigation, 150);
        }
        return;
    }

    _autoSelectInProgress = true;

    try {
        const cleanCode = (s) => String(s || '').trim().replace(/^PEM\./i, '').replace(/\.+$/, '');

        // Canonical dot numbers: e.g. "01.01.01" -> "1.1.1", "1.01.01" -> "1.1.1", "1.01.01..1" -> "1.1.1.1"
        const canonicalCode = (s) => {
            const c = cleanCode(s);
            if (!c) return '';
            const parts = c.split('.').map(p => p.trim()).filter(Boolean);
            if (!parts.length) return '';
            return parts.map(p => {
                const num = parseInt(p, 10);
                return isNaN(num) ? p.toLowerCase() : String(num);
            }).join('.');
        };

        const cleanDigits = (s) => String(s || '').replace(/\D/g, '');

        const targetClean = cleanCode(targetKode);
        const targetCanon = canonicalCode(targetKode);
        const targetDig = cleanDigits(targetKode);
        const targetNamaLower = targetNama.toLowerCase();

        let matchedVal = null;
        const optionsList = Array.from(selectEl.options).filter(opt => opt.value);

        // --- LAPISAN 1: Exact & Clean Match ---
        if (targetClean) {
            for (const opt of optionsList) {
                const optVal = opt.value;
                const optClean = cleanCode(optVal);
                if (optVal === targetKode || optClean === targetClean) {
                    matchedVal = optVal;
                    break;
                }
            }
        }

        // --- LAPISAN 2: Canonical Dot Numbers / Digits Segment Match ---
        if (!matchedVal && targetCanon) {
            for (const opt of optionsList) {
                const optVal = opt.value;
                const optCanon = canonicalCode(optVal);
                if (optCanon && optCanon === targetCanon) {
                    matchedVal = optVal;
                    break;
                }
            }
        }

        if (!matchedVal && targetDig && targetDig.length >= 3) {
            for (const opt of optionsList) {
                const optVal = opt.value;
                const optDig = cleanDigits(optVal);
                if (optDig === targetDig) {
                    matchedVal = optVal;
                    break;
                }
            }
        }

        if (!matchedVal && targetClean) {
            for (const opt of optionsList) {
                const optVal = opt.value;
                const optClean = cleanCode(optVal);
                if (optClean && (optClean.startsWith(targetClean) || targetClean.startsWith(optClean))) {
                    matchedVal = optVal;
                    break;
                }
            }
        }

        if (!matchedVal && targetCanon) {
            for (const opt of optionsList) {
                const optVal = opt.value;
                const optCanon = canonicalCode(optVal);
                if (optCanon && (optCanon.startsWith(targetCanon) || targetCanon.startsWith(optCanon))) {
                    matchedVal = optVal;
                    break;
                }
            }
        }

        // --- LAPISAN 3: Activity Name / Keyword Fallback ---
        if (!matchedVal && targetNamaLower) {
            const siltapKeywords = ['siltap', 'penghasilan tetap'];
            const isTargetSiltap = siltapKeywords.some(k => targetNamaLower.includes(k));

            for (const opt of optionsList) {
                const labelLower = (opt.text || opt.textContent || '').toLowerCase();
                if (isTargetSiltap && siltapKeywords.some(k => labelLower.includes(k))) {
                    if (targetNamaLower.includes('kepala desa') || targetNamaLower.includes('kades')) {
                        if (labelLower.includes('kepala desa') || labelLower.includes('kades')) {
                            matchedVal = opt.value;
                            break;
                        }
                    } else if (targetNamaLower.includes('perangkat') || targetNamaLower.includes('aparat')) {
                        if (labelLower.includes('perangkat') || labelLower.includes('aparat')) {
                            matchedVal = opt.value;
                            break;
                        }
                    } else if (targetNamaLower.includes('bpd')) {
                        if (labelLower.includes('bpd')) {
                            matchedVal = opt.value;
                            break;
                        }
                    } else {
                        matchedVal = opt.value;
                        break;
                    }
                }
            }

            if (!matchedVal) {
                const cleanName = (s) => s.replace(/^(kegiatan|penyelenggaraan|pelaksanaan|pembangunan|pengadaan|pembinaan|pemberdayaan)\s+/gi, '').trim();
                const simpTargetName = cleanName(targetNamaLower);

                for (const opt of optionsList) {
                    const labelLower = (opt.text || opt.textContent || '').toLowerCase();
                    const labelClean = cleanName(labelLower);
                    if (simpTargetName && (labelLower.includes(simpTargetName) || labelClean.includes(simpTargetName) || (simpTargetName.length > 5 && labelClean.includes(simpTargetName.slice(0, 15))))) {
                        matchedVal = opt.value;
                        break;
                    }
                }
            }
        }

        // --- EKSEKUSI PEMILIHAN & PEMUATAN ---
        if (matchedVal) {
            console.log(`[applyAutoSelectFromNavigation] Berhasil mencocokkan nilai '${matchedVal}' untuk target [${targetKode}] '${targetNama}'`);
            selectEl.value = matchedVal;
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));

            const formSelect = document.getElementById('select-kode-unik-form');
            if (formSelect) formSelect.value = matchedVal;

            await selectRpjm(true);
            resetRabItemForm();

            showToast(`Membuka kegiatan RAB: ${matchedVal}`, 'success');

            setTimeout(() => {
                const targetScrollEl = document.getElementById('rab-form-panel') || document.getElementById('rab-items-container');
                if (targetScrollEl) {
                    targetScrollEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 300);

            _autoSelectDone = true;
        } else {
            console.warn(`[applyAutoSelectFromNavigation] Tidak ditemukan kegiatan yang cocok untuk target [${targetKode}] '${targetNama}'`);
        }

        // Bersihkan parameter target setelah selesai agar tidak berulang saat refresh
        try {
            localStorage.removeItem('rab_target_kode');
            localStorage.removeItem('rab_target_nama');
            if (window.location.search) {
                const cleanUrl = new URL(window.location.href);
                cleanUrl.searchParams.delete('kode');
                cleanUrl.searchParams.delete('kode_unik');
                cleanUrl.searchParams.delete('nama');
                const remaining = cleanUrl.searchParams.toString();
                window.history.replaceState({}, document.title, cleanUrl.pathname + (remaining ? '?' + remaining : ''));
            }
        } catch (_) {}

    } catch (err) {
        console.error('❌ Error in applyAutoSelectFromNavigation:', err);
    } finally {
        _autoSelectInProgress = false;
    }
}
window.applyAutoSelectFromNavigation = applyAutoSelectFromNavigation;

let rabActivitiesGlobal = [];

async function loadRabActivities() {
    try {
        const res = await fetch(`/api/rab-activities?tahun=${rabYear}`);
        const result = await res.json();
        
        const arrayData = Array.isArray(result) ? result : (result.data || []);
        sortHierarchical(arrayData);
        
        console.log("Struktur Data dari Server (RAB Activities):", result);
        
        rabActivitiesGlobal = arrayData;
        
        renderRabActivityOptions();
        populateGroupCetakDropdown();
        applyAutoSelectFromNavigation();
    } catch (error) {
        console.error('❌ Error loadRabActivities:', error);
        showToast('Gagal memuat data kegiatan RAB', 'error');
    }
}

function renderRabActivityOptions() {
    const selectElement = document.getElementById('select-kode-unik');
    if (selectElement) {
        selectElement.innerHTML = '<option value="">-- Pilih Kode Unik Kegiatan RAB --</option>' + buildKodeOptionsHtml(rabActivitiesGlobal);
    }
    // Isi juga dropdown kegiatan di dalam form rincian (agar terhindar dari salah pilih)
    const formSelect = document.getElementById('select-kode-unik-form');
    if (formSelect) {
        const current = selectedRpjm ? String(selectedRpjm.kode_unik_full || selectedRpjm.kode_unik || '').trim() : '';
        formSelect.innerHTML = '<option value="">-- Pilih Kegiatan / Kode Unik --</option>' + buildKodeOptionsHtml(rabActivitiesGlobal, current);
    }
}

// Bangun <option> daftar kegiatan ditarik dari tabel rab & rancangan-rkpdes.
// Label menampilkan [Kode Unik Full] Nama Kegiatan agar mudah dibaca & dipilih.
function buildKodeOptionsHtml(list, selectedKode) {
    let html = '';
    const normSel = String(selectedKode || '').trim().replace(/\.+$/, '').replace(/^PEM\./i, '');
    (list || []).forEach(item => {
        const kode = String(item.kode_unik_full || item.kode_unik || '').trim();
        const nama = item.nama_kegiatan || item.sub_kegiatan || item.uraian || 'Kegiatan Tanpa Nama';
        const label = kode ? `[${kode}] ${nama}` : nama;
        const normKode = kode.replace(/\.+$/, '').replace(/^PEM\./i, '');
        const isSel = normSel && (kode === selectedKode || normKode === normSel) ? ' selected' : '';
        html += `<option value="${kode}"${isSel}>${label}</option>`;
    });
    return html;
}

// Dipanggil saat user memilih kegiatan dari dropdown di form rincian.
function pilihKegiatanDariForm() {
    const formSelect = document.getElementById('select-kode-unik-form');
    if (!formSelect) return;
    const val = formSelect.value;
    if (lastSelectedKode && val !== lastSelectedKode) {
        if (!confirmUnsavedChanges('berpindah ke kegiatan lain')) {
            formSelect.value = lastSelectedKode;
            return;
        }
    }
    const topSelect = document.getElementById('select-kode-unik');
    if (topSelect) topSelect.value = val;
    const search = document.getElementById('search-rpjm');
    if (search) search.value = '';
    selectRpjm(true);
}

function filterRpjmItems() {
    // This function now effectively filters rabActivitiesGlobal but is kept for minimal disruption
    // if other parts of the code call it by its old name via a string. A full refactor would remove this.
    const search = (document.getElementById('search-rpjm')?.value || '').toLowerCase().trim();
    let itemsToRender;
    if (!search) {
        itemsToRender = [...rabActivitiesGlobal];
    } else {
        itemsToRender = rabActivitiesGlobal.filter(item => {
            const k1 = String(item.kode_unik_full || item.kode_unik || '').toLowerCase();
            const nm = String(item.nama_kegiatan || item.sub_kegiatan || item.uraian || '').toLowerCase();
            const bd = String(item.bidang || '').toLowerCase();
            return k1.includes(search) || nm.includes(search) || bd.includes(search);
        });
    }
    // Directly render the filtered options instead of modifying globals
    const selectElement = document.getElementById('select-kode-unik');
    if (selectElement) {
        selectElement.innerHTML = '<option value="">-- Pilih Kode Unik Kegiatan RAB --</option>' + buildKodeOptionsHtml(itemsToRender);
    }
    const formSelect = document.getElementById('select-kode-unik-form');
    if (formSelect) {
        const current = selectedRpjm ? String(selectedRpjm.kode_unik_full || selectedRpjm.kode_unik || '').trim() : '';
        formSelect.innerHTML = '<option value="">-- Pilih Kegiatan / Kode Unik --</option>' + buildKodeOptionsHtml(itemsToRender, current);
    }
}

async function onYearChange() { // Make it async
    const targetYear = parseInt(document.getElementById('select-year')?.value, 10) || getDefaultYear();
    if (targetYear !== rabYear) {
        if (!confirmUnsavedChanges('mengganti tahun anggaran')) {
            const sel = document.getElementById('select-year');
            if (sel) sel.value = String(rabYear);
            return;
        }
    }
    isFormDirty = false;
    rabYear = targetYear;
    try {
        localStorage.setItem('rab_tahun_anggaran', String(rabYear));
        localStorage.setItem('sia_tahun_anggaran', String(rabYear));
    } catch (_) {}
    selectedRpjm = null;
    currentRabId = null;
    currentRabRefMurni = null;
    lastSelectedKode = '';
    window.currentDataRPJMDES = null;
    if (document.getElementById('select-kode-unik')) document.getElementById('select-kode-unik').value = '';
    if (document.getElementById('rpjm-summary')) document.getElementById('rpjm-summary').innerHTML = '';
    const panel = document.getElementById('rab-form-panel');
    if (panel) {
        panel.classList.add('hidden');
        panel.style.display = 'none';
    }
    await loadRabActivities(); // Ensure RPJM items are loaded for the new year
    await loadSavedRabList(); // Ensure saved RABs are loaded for the new year
    populateGroupCetakDropdown();
    updateRabInfographicStats(); // Update the infographic with the new data
}

async function selectRpjm(skipConfirm = false) {
    const selectKode = document.getElementById('select-kode-unik');
    if (!selectKode) return;
    const selectedValue = String(selectKode.value || '').trim();

    if (!skipConfirm && lastSelectedKode && selectedValue !== lastSelectedKode) {
        if (!confirmUnsavedChanges('berpindah ke kegiatan lain')) {
            selectKode.value = lastSelectedKode;
            const formSelect = document.getElementById('select-kode-unik-form');
            if (formSelect) formSelect.value = lastSelectedKode;
            return;
        }
    }
    lastSelectedKode = selectedValue;
    isFormDirty = false;

    // Sinkronkan nilai dropdown kegiatan di dalam form rincian
    const formSelect = document.getElementById('select-kode-unik-form');
    if (formSelect) formSelect.value = selectedValue;

    if (!selectedValue) {
        selectedRpjm = null;
        if (document.getElementById('rpjm-summary')) document.getElementById('rpjm-summary').innerHTML = '';
        const panel = document.getElementById('rab-form-panel');
        if (panel) {
            panel.classList.add('hidden');
            panel.style.display = 'none';
            if (typeof syncAccSection === 'function') syncAccSection('rab-form-panel');
        }
        return;
    }

    const rawVal = String(selectedValue || '').trim();
    const cleanSel = rawVal.replace(/\.+$/, '').replace(/^PEM\./i, '');

    selectedRpjm = rabActivitiesGlobal.find(item => {
        const k = String(item.kode_unik_full || item.kode_unik || '').trim();
        const kClean = k.replace(/\.+$/, '').replace(/^PEM\./i, '');
        return k === rawVal || kClean === cleanSel;
    }) || null;

    // Fallback: jika kode tak dikenal di daftar kegiatan, gunakan baris RAB tersimpan
    // agar form tetap bisa dibuka/loaded dari daftar "Buka".
    if (!selectedRpjm) {
        selectedRpjm = savedRabList.find(r => {
            const k = String(r.kode_unik_full || r.kode_unik || '').trim();
            const kClean = k.replace(/\.+$/, '').replace(/^PEM\./i, '');
            return k === rawVal || kClean === cleanSel;
        }) || null;
    }

    if (!selectedRpjm && rawVal) {
        selectedRpjm = {
            kode_unik_full: rawVal,
            kode_unik: rawVal,
            nama_kegiatan: `Kegiatan (${rawVal})`,
            bidang: '',
            jenis_kegiatan: ''
        };
    }

    if (!selectedRpjm) {
        currentRabId = null;
        currentRabRefMurni = null;
        if (document.getElementById('rpjm-summary')) document.getElementById('rpjm-summary').innerHTML = '';
        const panel = document.getElementById('rab-form-panel');
        if (panel) {
            panel.classList.add('hidden');
            panel.style.display = 'none';
            if (typeof syncAccSection === 'function') syncAccSection('rab-form-panel');
        }
        return;
    }

    const summaryContainer = document.getElementById('rpjm-summary');
    if (summaryContainer) {
        const kodeDisplay = selectedRpjm.kode_unik_full || selectedRpjm.kode_unik || '-';
        const jenisBid = getNamaSubBidangFull(selectedRpjm, selectedRpjm.kode_unik_full || selectedRpjm.kode_unik || '');
        const jenisKeg = selectedRpjm.jenis_kegiatan || selectedRpjm.kegiatan_induk || selectedRpjm.nama_kegiatan || 'Kegiatan Desa';
        summaryContainer.innerHTML = `
            <div class="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
                <div class="text-xs font-extrabold text-indigo-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <i class="fas fa-check-circle"></i> Data Kegiatan RAB Terpilih
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div><span class="text-slate-500 font-medium">Kode Unik:</span> <strong class="text-slate-800 font-mono bg-slate-100 px-2 py-0.5 rounded">${kodeDisplay}</strong></div>
                    <div class="md:col-span-2"><span class="text-slate-500 font-medium">Nama Kegiatan:</span> <strong class="text-slate-800 font-semibold">${selectedRpjm.nama_kegiatan || '-'}</strong></div>
                    <div><span class="text-slate-500 font-medium">Bidang:</span> <span class="text-slate-700">${getNamaBidangFull(selectedRpjm.bidang, selectedRpjm.kode_unik_full || selectedRpjm.kode_unik || '')}</span></div>
                    <div><span class="text-slate-500 font-medium">Jenis Bidang:</span> <span class="text-slate-700">${jenisBid}</span></div>
                    <div class="md:col-span-2"><span class="text-slate-500 font-medium">Jenis Kegiatan:</span> <span class="text-slate-700">${jenisKeg}</span></div>
                </div>
            </div>
            <div class="p-5 bg-indigo-50 rounded-xl border border-indigo-100 shadow-sm flex flex-col justify-between">
                <div>
                    <div class="text-xs font-extrabold text-indigo-600 uppercase tracking-wider mb-2">Target Tahun Anggaran</div>
                    <div class="text-3xl font-black text-indigo-900 mb-1">${rabYear}</div>
                </div>
                <div class="mt-3">
                    <span class="px-3 py-1 bg-emerald-500 text-white font-bold rounded-full text-xs inline-flex items-center gap-1.5">
                        <i class="fas fa-unlock"></i> Form RAB Aktif
                    </span>
                </div>
            </div>
        `;
    }

    const formPanel = document.getElementById('rab-form-panel');
    if (formPanel) {
        formPanel.classList.remove('hidden');
        formPanel.style.display = 'block';
        if (typeof syncAccSection === 'function') syncAccSection('rab-form-panel');
    }

    await loadSavedRAB();
    // Versi MURNI dikunci begitu PERUBAHAN untuk kegiatan ini sudah ada
    await refreshLockStatus();
}

function getStorageKey() {
    if (!selectedRpjm) return null;
    const kode = (selectedRpjm.kode_unik_full || selectedRpjm.kode_unik || selectedRpjm.kode || '').trim();
    return kode ? `rab_${kode}_${rabYear}` : null;
}

let rabMurniRefItems = [];
let rabMurniRefTotal = 0;

function getItemMurniRef(item, idx) {
    if (!isModePerubahan() || !rabMurniRefItems.length || !item) {
        return { isBaru: isModePerubahan(), vol: 0, sat: (item && item.satuan) || '-', harga: 0, jumlah: 0, uraian: '' };
    }

    // Jika item ditandai sebagai item_baru, jangan pasangkan ke Murni
    if (item.item_baru === true || item.item_baru === 'true') {
        return { isBaru: true, vol: 0, sat: (item && item.satuan) || '-', harga: 0, jumlah: 0, uraian: item.uraian || '' };
    }

    const norm = (v) => String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, ' ');
    const pUraian = norm(item.uraian);
    const pGroup = norm(item.group || item.group_belanja || item.kelompok_belanja);
    const pSub = norm(item.subgroup || item.sub_kelompok);
    const pUraianMurni = norm(item.uraian_murni);
    const pSubCode = typeof getRabSubgroupCode === 'function' ? getRabSubgroupCode(item.subgroup || item.sub_kelompok, item.group || item.group_belanja) : '';

    const isSameSubgroup = (m) => {
        if (!m) return false;
        const mSubCode = typeof getRabSubgroupCode === 'function' ? getRabSubgroupCode(m.subgroup || m.sub_kelompok, m.group || m.group_belanja) : '';
        if (pSubCode && mSubCode && pSubCode !== '9.9.9.99' && mSubCode !== '9.9.9.99') {
            return pSubCode === mSubCode;
        }
        const mSub = norm(m.subgroup || m.sub_kelompok);
        if (pSub && mSub) return pSub === mSub;
        const mGrp = norm(m.group || m.group_belanja || m.kelompok_belanja);
        return !pGroup || !mGrp || pGroup === mGrp;
    };

    let murniMatch = null;
    const hasUrut = item.urutan_murni !== null && item.urutan_murni !== undefined && item.urutan_murni !== '' && Number.isInteger(Number(item.urutan_murni));
    const urut = hasUrut ? Number(item.urutan_murni) : -1;
    const pCanon = canonicalRabKey(item.uraian);
    const pCanonMurni = canonicalRabKey(item.uraian_murni);

    // 1. Exact canonical match: uraian + subgroup
    if (!murniMatch && pCanon) {
        murniMatch = rabMurniRefItems.find(m =>
            isSameSubgroup(m) &&
            canonicalRabKey(m.uraian) === pCanon
        );
    }

    // 2. Match via uraian_murni dalam subgroup yang sama
    if (!murniMatch && pCanonMurni) {
        murniMatch = rabMurniRefItems.find(m =>
            isSameSubgroup(m) &&
            canonicalRabKey(m.uraian) === pCanonMurni
        );
    }

    // 3. Cek via urutan_murni bila ada item yang direvisi/direname di Perubahan
    if (!murniMatch && urut >= 0 && urut < rabMurniRefItems.length) {
        const cand = rabMurniRefItems[urut];
        if (cand && isSameSubgroup(cand)) {
            const candCanon = canonicalRabKey(cand.uraian);
            if (candCanon === pCanon || (pCanonMurni && candCanon === pCanonMurni)) {
                murniMatch = cand;
            } else {
                // Tolak jika item.uraian adalah nama item murni lain (mencegah salah pasang jabatan)
                const pBelongsToOtherMurni = rabMurniRefItems.some((otherM, oIdx) =>
                    oIdx !== urut && canonicalRabKey(otherM && otherM.uraian) === pCanon
                );
                // Tolak jika cand.uraian masih punya padanan pasti di item rabItems lain
                const candHasExactMatchInRab = Array.isArray(rabItems) && rabItems.some(otherP =>
                    otherP !== item && canonicalRabKey(otherP && otherP.uraian) === candCanon
                );
                if (!pBelongsToOtherMurni && !candHasExactMatchInRab) {
                    murniMatch = cand;
                }
            }
        }
    }

    // 4. Fallback: match canonical uraian saja di tingkat kegiatan
    if (!murniMatch && pCanon) {
        murniMatch = rabMurniRefItems.find(m =>
            canonicalRabKey(m.uraian) === pCanon
        );
    }

    if (murniMatch) {
        const vol = Number(murniMatch.volume || 0);
        const harga = Number(murniMatch.harga || murniMatch.harga_satuan || 0);
        const jumlah = Number(murniMatch.jumlah !== undefined ? murniMatch.jumlah : (vol * harga));
        return {
            isBaru: false,
            vol,
            sat: murniMatch.satuan || item.satuan || '-',
            harga,
            jumlah,
            uraian: murniMatch.uraian || ''
        };
    }

    // Item baru di PERUBAHAN: SEMULA bersih bernilai 0
    return {
        isBaru: true,
        vol: 0,
        sat: item.satuan || '-',
        harga: 0,
        jumlah: 0,
        uraian: ''
    };
}

function updateFormRefSemula(ref) {
    const banner = document.getElementById('form-ref-semula-banner');
    const helpHarga = document.getElementById('help-harga-semula');
    const helpVolume = document.getElementById('help-volume-semula');
    const helpSatuan = document.getElementById('help-satuan-semula');
    const lblHarga = document.getElementById('label-harga');
    const lblVolume = document.getElementById('label-volume');

    if (!isModePerubahan()) {
        if (banner) banner.classList.add('hidden');
        if (helpHarga) helpHarga.classList.add('hidden');
        if (helpVolume) helpVolume.classList.add('hidden');
        if (helpSatuan) helpSatuan.classList.add('hidden');
        if (lblHarga) lblHarga.textContent = 'Harga Satuan (Rp) *';
        if (lblVolume) lblVolume.textContent = 'Volume *';
        return;
    }

    if (lblHarga) lblHarga.textContent = 'Harga Satuan Menjadi (Rp) *';
    if (lblVolume) lblVolume.textContent = 'Volume Menjadi *';

    if (!ref || ref.isBaru) {
        if (banner) {
            banner.className = 'flex items-center justify-between gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 mb-3';
            banner.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded font-extrabold bg-amber-200 text-amber-800 text-[10px] uppercase tracking-wide">Item Baru</span>
                    <span>Item ini belum ada di RAB Murni (Nilai Semula: <strong>Rp 0</strong>)</span>
                </div>
                <span class="text-[11px] font-semibold text-amber-700 whitespace-nowrap">+ Penambahan Baru</span>
            `;
            banner.classList.remove('hidden');
        }
        if (helpHarga) {
            helpHarga.textContent = '✨ Item Baru (Semula: Rp 0)';
            helpHarga.className = 'text-[11px] font-semibold text-amber-600 mt-1';
            helpHarga.classList.remove('hidden');
        }
        if (helpVolume) {
            helpVolume.textContent = '✨ Semula: 0';
            helpVolume.className = 'text-[11px] font-semibold text-amber-600 mt-1';
            helpVolume.classList.remove('hidden');
        }
        if (helpSatuan) helpSatuan.classList.add('hidden');
    } else {
        if (banner) {
            banner.className = 'flex items-center justify-between gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 mb-3';
            banner.innerHTML = `
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="px-2 py-0.5 rounded font-extrabold bg-indigo-200 text-indigo-800 text-[10px] uppercase tracking-wide">RAB Murni (Acuan)</span>
                    <span>Semula: <strong>${ref.vol} ${ref.sat}</strong> @ <strong>Rp ${formatRupiah(ref.harga)}</strong> = <strong class="text-emerald-700">Rp ${formatRupiah(ref.jumlah)}</strong></span>
                </div>
                <span class="text-[11px] font-semibold text-indigo-600 whitespace-nowrap"><i class="fas fa-lock text-[10px] mr-1"></i>Read-Only</span>
            `;
            banner.classList.remove('hidden');
        }
        if (helpHarga) {
            helpHarga.textContent = `📌 Semula: Rp ${formatRupiah(ref.harga)}`;
            helpHarga.className = 'text-[11px] font-semibold text-indigo-600 mt-1';
            helpHarga.classList.remove('hidden');
        }
        if (helpVolume) {
            helpVolume.textContent = `📌 Semula: ${ref.vol}`;
            helpVolume.className = 'text-[11px] font-semibold text-indigo-600 mt-1';
            helpVolume.classList.remove('hidden');
        }
        if (helpSatuan) {
            helpSatuan.textContent = `📌 Semula: ${ref.sat}`;
            helpSatuan.className = 'text-[11px] font-semibold text-indigo-600 mt-1';
            helpSatuan.classList.remove('hidden');
        }
    }
}

async function loadSavedRAB() {
    const key = getStorageKey();
    if (!key) return;

    currentRabId = null;
    currentRabRefMurni = null;
    rabMurniRefItems = [];
    rabMurniRefTotal = 0;

    const targetKode = (selectedRpjm?.kode_unik_full || selectedRpjm?.kode_unik || selectedRpjm?.kode || '').trim();
    if (!targetKode) return;

    try {
        const url = `${API_URL}/rab?kode_unik_full=${encodeURIComponent(targetKode)}&tahun=${encodeURIComponent(rabYear)}&tipe=${encodeURIComponent(rabTipe)}`;
        const res = await fetch(url);
        let json = null;
        if (res.ok) {
            try { json = await res.json(); } catch (_) {}
        }
        if (json && json.success && json.data) {
            let rawItems = json.data.items;
            if (typeof rawItems === 'string') {
                try { rawItems = JSON.parse(rawItems); } catch (_) { rawItems = []; }
            }
            if (!Array.isArray(rawItems) && Array.isArray(json.data.rincian_items)) {
                rawItems = json.data.rincian_items;
            }
            const mapped = Array.isArray(rawItems) ? rawItems.map((it, idx) => ({
                ...it,
                no: it.no !== undefined ? it.no : (idx + 1),
                urutan: it.urutan !== undefined ? it.urutan : (idx + 1),
                urutan_manual: it.urutan_manual !== undefined ? it.urutan_manual : (it.urutan !== undefined ? it.urutan : (idx + 1)),
                sumber: normalizeSumberDana(it.sumber || it.sumber_dana)
            })) : [];
            rabItems = sortRabItems(mapped);
            reindexRabItemsBySubgroup(rabItems);
            currentRabId = json.data.id || null;
            currentRabRefMurni = json.data.id_referensi_murni || null;
        } else {
            rabItems = [];
            currentRabId = null;
            currentRabRefMurni = null;
        }

        // Jika dalam mode PERUBAHAN, tarik versi MURNI untuk referensi nilai 'SEMULA'
        if (isModePerubahan() && targetKode) {
            try {
                // Selalu minta Murni berdasarkan targetKode dan rabYear aktif agar data Murni akurat dan mutakhir tanpa terpengaruh referensi ID lintas tahun
                const urlMurni = `${API_URL}/rab?kode_unik_full=${encodeURIComponent(targetKode)}&tahun=${encodeURIComponent(rabYear)}&tipe=MURNI`;
                const resMurni = await fetch(urlMurni);
                if (resMurni.ok) {
                    const jsonMurni = await resMurni.json().catch(() => null);
                    if (jsonMurni && jsonMurni.success && jsonMurni.data) {
                        currentRabRefMurni = jsonMurni.data.id || null;
                        let rawMurni = jsonMurni.data.items;
                        if (typeof rawMurni === 'string') {
                            try { rawMurni = JSON.parse(rawMurni); } catch (_) { rawMurni = []; }
                        }
                        if (!Array.isArray(rawMurni) && Array.isArray(jsonMurni.data.rincian_items)) {
                            rawMurni = jsonMurni.data.rincian_items;
                        }
                        const mappedMurni = Array.isArray(rawMurni) ? rawMurni.map(it => ({
                            ...it,
                            sumber: normalizeSumberDana(it.sumber || it.sumber_dana)
                        })) : [];
                        rabMurniRefItems = mappedMurni;
                        const itemsSum = rabMurniRefItems.reduce((s, it) => s + (Number(it.jumlah) || 0), 0);
                        rabMurniRefTotal = itemsSum || Number(jsonMurni.data.jumlah_anggaran || jsonMurni.data.total_biaya || 0);
                    }
                }
            } catch (eMurni) {
                console.warn('Gagal memuat referensi Murni:', eMurni);
            }

            // AUTO-FILL & REKONSILIASI BASELINE CLONE:
            // 1. Jika di mode PERUBAHAN belum pernah disimpan (currentRabId null) dan rincian items masih kosong,
            // otomatis isi rabItems menjiplak 1:1 identik dari Murni (0 s.d. N).
            // 2. Jika sudah ada data Perubahan, sinkronkan struktur 1:1 baseline Murni di atas dan item baru di paling bawah.
            if ((!rabItems || rabItems.length === 0) && rabMurniRefItems.length > 0 && !currentRabId) {
                rabItems = buildPerubahanItemsFromBaseline(rabMurniRefItems, [], currentRabRefMurni);
                console.log(`[RAB Perubahan] Auto-fill baseline 1:1 ${rabItems.length} item dari versi MURNI untuk ${targetKode}`);
            } else if (rabItems.length > 0 && rabMurniRefItems.length > 0) {
                rabItems = buildPerubahanItemsFromBaseline(rabMurniRefItems, rabItems, currentRabRefMurni);
                console.log(`[RAB Perubahan] Direkonsiliasi baseline 1:1: sekarang memuat ${rabItems.length} item.`);
            }
        }

        renderRabItems();
        resetRabItemForm();
        setFormDirty(false);
        setSaveStatusIndicator('saved');
        return;
    } catch (error) {
        console.warn('Gagal memuat RAB server', error);
    }

    rabItems = [];
    renderRabItems();
    resetRabItemForm();
    setFormDirty(false);
    setSaveStatusIndicator('saved');
}

function getCodeHierarchy(item) {
    if (!item) return { kBid: '', kSub: '', kKeg: '', kUnik: '' };
    const fullCode = String(item.kode_unik_full || item.kode_unik || item.kode_klasifikasi || item.kode || '').trim();
    const parts = fullCode.split('.').filter(p => p.length > 0);

    const kBid = String(
        item.kode_bidang || 
        (parts[0] ? parts[0] + '.' : '')
    ).trim();

    const kSub = String(
        item.kode_sub || item.kode_sub_bidang || item.kode_jenis_bidang || 
        (parts[0] && parts[1] ? parts[0] + '.' + parts[1] + '.' : '')
    ).trim();

    const kKeg = String(
        item.kode_kegiatan || 
        (parts[0] && parts[1] && parts[2] ? parts[0] + '.' + parts[1] + '.' + parts[2] + '.' : '')
    ).trim();

    const kUnik = fullCode;

    return { kBid, kSub, kKeg, kUnik };
}

const getKode = (item) => {
    if (!item) return '';
    if (typeof item === 'string') return item.trim();
    return String(item.kode_unik_full || item.kode_unik || item.uraian_kode || item.kode_kegiatan || item.kode || item.kode_klasifikasi || '').trim();
};
window.getKode = getKode;

function compareKodeUnikFull(aKode, bKode) {
    const strA = getKode(aKode);
    const strB = getKode(bKode);
    if (!strA && !strB) return 0;
    if (!strA) return 1;
    if (!strB) return -1;
    const cleanA = strA.replace(/^PEM\./i, '');
    const cleanB = strB.replace(/^PEM\./i, '');
    const partsA = cleanA.split(/[\.\-\s]+/).filter(Boolean).map(p => parseInt(p, 10) || 0);
    const partsB = cleanB.split(/[\.\-\s]+/).filter(Boolean).map(p => parseInt(p, 10) || 0);
    const maxLen = Math.max(partsA.length, partsB.length);
    for (let i = 0; i < maxLen; i++) {
        const valA = partsA[i] !== undefined ? partsA[i] : 0;
        const valB = partsB[i] !== undefined ? partsB[i] : 0;
        if (valA !== valB) return valA - valB;
    }
    return cleanA.localeCompare(cleanB, undefined, { numeric: true, sensitivity: 'base' });
}

function sortHierarchical(dataArray) {
    if (!Array.isArray(dataArray)) return dataArray;
    return dataArray.sort((a, b) => {
        const kUnikA = getKode(a);
        const kUnikB = getKode(b);
        if (kUnikA && kUnikB) {
            const cmp = compareKodeUnikFull(kUnikA, kUnikB);
            if (cmp !== 0) return cmp;
        }

        const hA = getCodeHierarchy(a);
        const hB = getCodeHierarchy(b);

        if (hA.kBid !== hB.kBid && hA.kBid && hB.kBid) {
            return hA.kBid.localeCompare(hB.kBid, undefined, { numeric: true, sensitivity: 'base' });
        }
        if (hA.kSub !== hB.kSub && hA.kSub && hB.kSub) {
            return hA.kSub.localeCompare(hB.kSub, undefined, { numeric: true, sensitivity: 'base' });
        }
        if (hA.kKeg !== hB.kKeg && hA.kKeg && hB.kKeg) {
            return hA.kKeg.localeCompare(hB.kKeg, undefined, { numeric: true, sensitivity: 'base' });
        }
        return compareKodeUnikFull(hA.kUnik, hB.kUnik);
    });
}

async function loadSavedRabList() {
    try {
        // Egress guard: selalu minta tahun aktif + versi terpilih ke server
        // (filter tidak lagi dilakukan setelah seluruh tabel terunduh).
        const res = await fetch(`${API_URL}/rab/list?tahun=${encodeURIComponent(rabYear)}&tipe=${encodeURIComponent(rabTipe)}`);
        if (!res.ok) {
            console.warn(`Gagal memuat daftar RAB server: HTTP ${res.status}`);
            return;
        }
        let json = null;
        try { json = await res.json(); } catch (_) {}
        if (json && json.success && Array.isArray(json.data)) {
            const serverItems = json.data.map(item => {
                const rpjmMatch = (window.rpjmDataGlobal || window.rpjmdesList || []).find(r => (r.kode_unik_full === item.kode_unik_full || r.kode_unik === item.kode_unik_full || r.kode_unik === item.kode_unik));
                const namaKegiatan = item.nama_kegiatan || item.jenis_kegiatan || item.rpjm_data?.nama_kegiatan || item.rpjm_data?.jenis_kegiatan || rpjmMatch?.nama_kegiatan || rpjmMatch?.jenis_kegiatan || '-';
                return {
                    ...item,
                    nama_kegiatan: namaKegiatan,
                    total_biaya: Number(item.jumlah_anggaran || item.total_biaya) || (Array.isArray(item.items) ? item.items.reduce((sum, it) => sum + (Number(it.jumlah) || 0), 0) : 0),
                    saved_at: item.saved_at || null,
                    source: 'server'
                };
            });
            savedRabList = sortHierarchical(serverItems);
            renderSavedRabList();

            // Sinkronkan ke rabActivitiesGlobal jika ada kegiatan tersimpan yang belum masuk daftar dropdown
            let addedNew = false;
            serverItems.forEach(s => {
                const sKode = String(s.kode_unik_full || s.kode_unik || '').trim();
                const sClean = sKode.replace(/\.+$/, '').replace(/^PEM\./i, '');
                const exists = rabActivitiesGlobal.some(a => {
                    const aKode = String(a.kode_unik_full || a.kode_unik || '').trim();
                    const aClean = aKode.replace(/\.+$/, '').replace(/^PEM\./i, '');
                    return aKode === sKode || (sClean && aClean === sClean);
                });
                if (!exists && sKode) {
                    rabActivitiesGlobal.push({
                        kode_unik_full: s.kode_unik_full || s.kode_unik,
                        kode_unik: s.kode_unik || s.kode_unik_full,
                        nama_kegiatan: s.nama_kegiatan || s.jenis_kegiatan || '(RAB tersimpan)',
                        bidang: s.bidang || '',
                        jenis_kegiatan: s.jenis_kegiatan || '',
                        jenis_bid: s.jenis_bid || s.jenis_bidang || '',
                        ...(s.rpjm_data || {})
                    });
                    addedNew = true;
                }
            });
            if (addedNew) {
                renderRabActivityOptions();
            }

            // Pastikan infografis Pagu/Terpakai selalu tersinkron dgn data RAB terbaru
            updateRabInfographicStats();
            return;
        }
    } catch (error) {
        console.warn('Gagal memuat daftar RAB server', error);
    }

    savedRabList = [];
    renderSavedRabList();
    updateRabInfographicStats();
}

function renderSavedRabList() {
    const container = document.getElementById('rab-saved-body');
    // Hanya tampilkan RAB sesuai tahun yang aktif saat ini
    const currentYear = Number(rabYear || 2027);
    const filtered = savedRabList.filter(r => Number(r.tahun) === currentYear);

    // Label versi yang sedang ditampilkan (MURNI / PERUBAHAN)
    const tipeLabel = document.getElementById('rab-list-tipe-label');
    if (tipeLabel) {
        tipeLabel.textContent = isModePerubahan() ? `— versi PERUBAHAN (${filtered.length})` : `— versi MURNI (${filtered.length})`;
    }

    if (!container) {
        console.error("Element with id 'rab-saved-body' not found.");
        return;
    }

    if (!filtered.length) {
        container.innerHTML = `<tr><td colspan="11" class="text-center py-8 text-slate-500 italic">Belum ada RAB tersimpan untuk tahun ${currentYear}.</td></tr>`;
        return;
    }

    // Kelompokkan berdasarkan bidang; urutan mengikuti sorting kode unik full (sudah terurut)
    const groupedByBidang = new Map();
    filtered.forEach(item => {
        const bidangName = getNamaBidangFull(item.bidang || item.rpjm_data?.bidang, item.kode_unik_full || item.kode_unik);
        if (!groupedByBidang.has(bidangName)) {
            groupedByBidang.set(bidangName, []);
        }
        groupedByBidang.get(bidangName).push(item);
    });

    let html = '';
    let globalIndex = 1;
    groupedByBidang.forEach((items, bidangName) => {
        // Render group header row
        html += `
            <tr class="bg-slate-100">
                <td colspan="11" class="px-4 py-2 font-extrabold text-sm text-indigo-700 tracking-wide">
                    <i class="fas fa-folder-open text-indigo-500 mr-2"></i> ${bidangName}
                </td>
            </tr>
        `;

        // Render data rows for the group
        items.forEach((item) => {
            const namaKegiatan = item.nama_kegiatan || item.jenis_kegiatan || item.rpjm_data?.nama_kegiatan || item.rpjm_data?.jenis_kegiatan || 'Kegiatan Tanpa Nama';
            const jenisBidang = getNamaSubBidangFull(item, item.kode_unik_full || item.kode_unik);
            const jenisKegiatan = item.jenis_kegiatan || item.rpjm_data?.jenis_kegiatan || (namaKegiatan !== 'Kegiatan Tanpa Nama' ? namaKegiatan : 'Kegiatan Desa');
            const sumberDana = item.sumber_dana || (item.items && item.items.length > 0 ? item.items[0].sumber : 'DDS');
            const savedAt = item.saved_at ? new Date(item.saved_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A';
            const hargaSatuan = item.harga_satuan || (Array.isArray(item.items) && item.items.length > 0 ? item.items[0].harga : 0);

            html += `
                <tr class="border-b border-slate-200 hover:bg-indigo-50/50 group">
                    <td class="p-3 text-center font-semibold text-slate-400 group-hover:text-slate-600">${globalIndex++}</td>
                    <td class="p-3 font-mono text-xs text-indigo-600 font-bold">${item.kode_unik_full || item.kode_unik || '-'}</td>
                    <td class="p-3 font-semibold text-slate-800">${namaKegiatan}</td>
                    <td class="p-3 text-slate-600 text-xs">${bidangName}</td>
                    <td class="p-3 text-slate-600 text-xs">${jenisBidang}</td>
                    <td class="p-3 text-slate-600 text-xs">${jenisKegiatan}</td>
                    <td class="p-3 text-right font-medium text-slate-700">Rp ${formatRupiah(hargaSatuan)}</td>
                    <td class="p-3 text-right font-bold text-emerald-700">Rp ${formatRupiah(item.total_biaya)}</td>
                    <td class="p-3 text-center font-semibold text-xs">${sumberDana}</td>
                    <td class="p-3 text-center text-slate-500 text-xs">${savedAt}</td>
                    <td class="p-3 text-center whitespace-nowrap">
                        <button class="btn-outline" style="padding:6px 12px; font-size: 11px;" onclick="loadSavedRabItem('${item.kode_unik_full || item.kode_unik}', '${item.tahun}')">
                            <i class="fas fa-folder-open mr-1"></i> Buka
                        </button>
                        <button class="btn-danger" style="padding:6px 12px; font-size: 11px;" onclick="deleteSavedRabItem('${item.kode_unik_full || item.kode_unik}', '${item.tahun}')">
                            <i class="fas fa-trash-alt mr-1"></i> Hapus
                        </button>
                    </td>
                </tr>`;
        });
    });

    container.innerHTML = html;
}

async function loadSavedRabItem(kode, year) {
    const cleanTarget = String(kode || '').trim().replace(/\.+$/, '').replace(/^PEM\./i, '');
    const cleanCurrent = String(lastSelectedKode || '').trim().replace(/\.+$/, '').replace(/^PEM\./i, '');
    if (lastSelectedKode && cleanTarget !== cleanCurrent) {
        if (!confirmUnsavedChanges('membuka kegiatan RAB lain')) {
            return;
        }
    }
    isFormDirty = false;

    if (year !== undefined && year !== null && String(year).trim() !== '') {
        const parsedYear = Number(year);
        if (!isNaN(parsedYear)) {
            rabYear = parsedYear;
            const yEl = document.getElementById('select-year');
            if (yEl) yEl.value = String(rabYear);
            try {
                localStorage.setItem('rab_tahun_anggaran', String(rabYear));
                localStorage.setItem('sia_tahun_anggaran', String(rabYear));
            } catch (_) {}
        }
    }
    await loadRabActivities();
    const searchEl = document.getElementById('search-rpjm');
    if (searchEl) searchEl.value = '';

    // Jika kode tidak ada di daftar kegiatan (mis. tahun berbeda / kode tak dikenal),
    // tambahkan ke daftar agar dropdown & form selalu bisa memuat RAB tersimpan tsb.
    const existsInGlobal = rabActivitiesGlobal.some(item => {
        const k = String(item.kode_unik_full || item.kode_unik || '').trim();
        return k === String(kode).trim() || k.replace(/\.+$/, '').replace(/^PEM\./i, '') === cleanTarget;
    });
    if (!existsInGlobal) {
        const savedRow = savedRabList.find(r => {
            const k = String(r.kode_unik_full || r.kode_unik || '').trim();
            return k === String(kode).trim() || k.replace(/\.+$/, '').replace(/^PEM\./i, '') === cleanTarget;
        });
        if (savedRow) {
            rabActivitiesGlobal = [
                {
                    kode_unik_full: savedRow.kode_unik_full || savedRow.kode_unik || kode,
                    nama_kegiatan: savedRow.nama_kegiatan || savedRow.jenis_kegiatan || '(RAB tersimpan)',
                    bidang: savedRow.bidang || '',
                    jenis_kegiatan: savedRow.jenis_kegiatan || '',
                    jenis_bid: savedRow.jenis_bid || savedRow.jenis_bidang || '',
                    ...(savedRow.rpjm_data || {})
                },
                ...rabActivitiesGlobal
            ];
            renderRabActivityOptions();
        }
    }

    const selEl = document.getElementById('select-kode-unik');
    if (selEl) {
        let matchedOpt = [...selEl.options].find(o => o.value === kode);
        if (!matchedOpt) {
            matchedOpt = [...selEl.options].find(o => {
                const c = String(o.value).trim().replace(/\.+$/, '').replace(/^PEM\./i, '');
                return c === cleanTarget;
            });
        }
        if (matchedOpt) {
            selEl.value = matchedOpt.value;
        } else {
            selEl.value = kode;
        }
    }

    const formSel = document.getElementById('select-kode-unik-form');
    if (formSel && selEl) {
        formSel.value = selEl.value;
    }

    const found = rabActivitiesGlobal.find(item => {
        const k = String(item.kode_unik_full || item.kode_unik || '').trim();
        return k === String(kode).trim() || k.replace(/\.+$/, '').replace(/^PEM\./i, '') === cleanTarget;
    });
    const savedRow = savedRabList.find(r => {
        const k = String(r.kode_unik_full || r.kode_unik || '').trim();
        return k === String(kode).trim() || k.replace(/\.+$/, '').replace(/^PEM\./i, '') === cleanTarget;
    });
    if (!found) {
        selectedRpjm = savedRow ? { ...savedRow, kode_unik_full: savedRow.kode_unik_full || savedRow.kode_unik || kode } : null;
    } else {
        selectedRpjm = found;
    }

    if (savedRow && savedRow.id) {
        currentRabId = savedRow.id;
        currentRabRefMurni = savedRow.id_referensi_murni || null;
    }

    await selectRpjm();

    // Siapkan form dalam keadaan bersih (Tambah Item Baru), jangan auto-edit item 0
    resetRabItemForm();
    const formPanel = document.getElementById('rab-form-panel');
    if (formPanel) {
        formPanel.classList.remove('hidden');
        formPanel.style.display = 'block';
        if (typeof syncAccSection === 'function') syncAccSection('rab-form-panel');
        setTimeout(() => formPanel.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
}

async function deleteSavedRabItem(kode, year) {
    try {
        const res = await fetch(`${API_URL}/rab?kode_unik_full=${encodeURIComponent(kode)}&tahun=${encodeURIComponent(year)}&tipe=${encodeURIComponent(rabTipe)}`, {
            method: 'DELETE'
        });
        let json = null;
        try { json = await res.json(); } catch (_) {}
        if (res.ok && json && json.success) {
            showToast('RAB berhasil dihapus', 'success');
        } else {
            // 409: versi MURNI terkunci karena RAB PERUBAHAN sudah dibuat
            showToast((json && json.error) || `Gagal menghapus RAB (HTTP ${res.status})`, 'error');
        }
        await loadSavedRabList();
        if (selectedRpjm?.kode_unik_full === kode && rabYear === Number(year)) {
            currentRabId = null;
            currentRabRefMurni = null;
            rabItems = [];
            renderRabItems();
        }
        return;
    } catch (error) {
        console.warn(error);
        showToast('Gagal menghapus RAB dari database', 'error');
        await loadSavedRabList();
    }
}

const NAMA_BIDANG = {
    1: "Bidang Penyelenggaraan Pemerintahan Desa",
    2: "Bidang Pelaksanaan Pembangunan Desa",
    3: "Bidang Pembinaan Kemasyarakatan",
    4: "Bidang Pemberdayaan Masyarakat",
    5: "Bidang Penanggulangan Bencana, Keadaan Darurat dan Mendesak Desa"
};

function getNamaBidangFull(bidangVal, kodeUnik) {
    if (bidangVal) {
        const s = String(bidangVal).trim();
        if (s.length > 5) return s;
        const n = parseInt(s, 10);
        if (NAMA_BIDANG[n]) return NAMA_BIDANG[n];
    }
    if (kodeUnik) {
        const parts = String(kodeUnik).split('.').filter(Boolean);
        const bNum = parseInt(parts[0], 10);
        if (NAMA_BIDANG[bNum]) return NAMA_BIDANG[bNum];
    }
    return "Bidang Penyelenggaraan Pemerintahan Desa";
}

const RAB_SUB_BIDANG_MAP = {
    '01.01': 'Penyelenggaraan Belanja Siltap, Tunjangan dan Operasional Pemerintahan Desa',
    '01.02': 'Sarana dan Prasarana Pemerintahan Desa',
    '01.03': 'Administrasi Kependudukan, Pencatatan Sipil, Statistik dan Kearsipan',
    '01.04': 'Tata Praja Pemerintahan, Perencanaan, Keuangan dan Pelaporan',
    '01.05': 'Pertanahan',
    '02.01': 'Pendidikan',
    '02.02': 'Kesehatan',
    '02.03': 'Pekerjaan Umum dan Penataan Ruang',
    '02.04': 'Kawasan Permukiman',
    '02.05': 'Kehutanan dan Lingkungan Hidup',
    '02.06': 'Perhubungan, Komunikasi dan Informatika',
    '02.07': 'Energi dan Sumber Daya Mineral',
    '02.08': 'Pariwisata',
    '03.01': 'Ketenteraman, Ketertiban Umum dan Perlindungan Masyarakat',
    '03.02': 'Kebudayaan dan Keagamaan',
    '03.03': 'Kepemudaan dan Olahraga',
    '03.04': 'Kelembagaan Masyarakat',
    '04.01': 'Kelautan dan Perikanan',
    '04.02': 'Pertanian dan Peternakan',
    '04.03': 'Peningkatan Kapasitas Aparatur Desa',
    '04.04': 'Pemberdayaan Perempuan, Perlindungan Anak dan Keluarga',
    '04.05': 'Koperasi, Usaha Mikro Kecil dan Menengah (UMKM)',
    '04.06': 'Dukungan Penanaman Modal',
    '04.07': 'Perdagangan dan Perindustrian',
    '05.01': 'Penanggulangan Bencana',
    '05.02': 'Keadaan Darurat',
    '05.03': 'Keadaan Mendesak'
};

function getNamaSubBidangFull(item, kodeUnik) {
    if (item) {
        const raw = item.jenis_bid || item.jenis_bidang || item.sub_bidang || item.jenis_sub_bidang || item.rpjm_data?.jenis_bidang || item.rpjm_data?.sub_bidang;
        if (raw && String(raw).trim() !== '' && String(raw).trim() !== '-') return String(raw).trim();
    }
    const targetKode = String(kodeUnik || item?.kode_unik_full || item?.kode_unik || '').replace(/^PEM\./i, '').trim();
    const parts = targetKode.split('.').filter(Boolean);
    if (parts.length >= 2) {
        const key = parts[0].padStart(2, '0') + '.' + parts[1].padStart(2, '0');
        if (RAB_SUB_BIDANG_MAP[key]) return RAB_SUB_BIDANG_MAP[key];
    }
    return "Sub Bidang Penyelenggaraan Pemerintahan Desa";
}

let isSavingRab = false;
let pendingSaveRab = false;
let isFormDirty = false;
let lastSelectedKode = '';
let unsavedChangesTrackerInitialized = false;

function setFormDirty(dirty) {
    isFormDirty = !!dirty;
    if (isFormDirty) {
        setSaveStatusIndicator('unsaved');
    }
}

function hasUnsavedInputInForm() {
    const uraian = document.getElementById('input-uraian')?.value.trim();
    const volume = document.getElementById('input-volume')?.value.trim();
    const harga = document.getElementById('input-harga')?.value.trim();
    return Boolean(uraian || volume || harga || (typeof editIndex === 'number' && editIndex > -1));
}

function confirmUnsavedChanges(actionName = 'berpindah kegiatan') {
    if (isFormDirty || hasUnsavedInputInForm() || isSavingRab || pendingSaveRab) {
        return confirm(
            `⚠️ PERINGATAN: DATA BELUM DISIMPAN!\n\n` +
            `Terdapat rincian belanja atau perubahan pada form RAB yang belum tersimpan ke Supabase.\n` +
            `Jika Anda melanjutkan untuk ${actionName}, perubahan yang belum disimpan akan hilang.\n\n` +
            `Klik 'OK' untuk tetap melanjutkan dan membuang perubahan,\n` +
            `atau 'Batal' / 'Cancel' untuk tetap berada di halaman ini agar dapat menyimpan data terlebih dahulu.`
        );
    }
    return true;
}

function initUnsavedChangesTracker() {
    if (unsavedChangesTrackerInitialized) return;
    unsavedChangesTrackerInitialized = true;

    const fieldIds = [
        'input-uraian',
        'input-volume',
        'input-satuan',
        'select-satuan',
        'input-satuan-manual',
        'input-harga',
        'input-keterangan',
        'select-group',
        'select-subgroup',
        'select-sumber-dana'
    ];
    fieldIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                setFormDirty(true);
            });
            el.addEventListener('change', () => {
                setFormDirty(true);
            });
        }
    });

    window.addEventListener('beforeunload', (e) => {
        if (isFormDirty || hasUnsavedInputInForm() || isSavingRab || pendingSaveRab) {
            e.preventDefault();
            e.returnValue = 'Perubahan data RAB belum disimpan ke database. Yakin ingin meninggalkan halaman?';
            return e.returnValue;
        }
    });
}

function setSaveStatusIndicator(status) {
    const indicator = document.getElementById('rab-save-status');
    if (!indicator) return;
    indicator.classList.remove('hidden');
    if (status === 'saving') {
        indicator.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 transition';
        indicator.innerHTML = '<i class="fas fa-spinner fa-spin text-amber-500"></i> Menyimpan ke Supabase...';
    } else if (status === 'saved') {
        indicator.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 transition';
        indicator.innerHTML = '<i class="fas fa-check-circle text-emerald-500"></i> Tersimpan di Supabase';
    } else if (status === 'unsaved') {
        indicator.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-300 transition animate-pulse';
        indicator.innerHTML = '<i class="fas fa-exclamation-circle text-amber-600"></i> Belum Disimpan';
    } else if (status === 'error') {
        indicator.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 transition';
        indicator.innerHTML = '<i class="fas fa-exclamation-triangle text-rose-500"></i> Gagal menyimpan';
    }
}
window.setSaveStatusIndicator = setSaveStatusIndicator;
window.setFormDirty = setFormDirty;
window.isFormDirty = () => isFormDirty;
window.confirmUnsavedChanges = confirmUnsavedChanges;

async function executeSaveRAB() {
    const selectElem = document.getElementById('select-kode-unik');
    let kodeUnikFix = selectElem ? selectElem.value : '';

    if (!kodeUnikFix || kodeUnikFix.trim() === '') {
        kodeUnikFix = selectedRpjm?.kode_unik_full || '';
    }

    if (!kodeUnikFix || kodeUnikFix.trim() === '') {
        showToast('Kode Unik Kegiatan tidak valid. Silakan pilih kegiatan dari dropdown.', 'error');
        return;
    }

    // RAB Murni terbuka penuh untuk disesuaikan dan disimpan

    const activity = selectedRpjm || {};
    const namaBidangFull = getNamaBidangFull(activity.bidang, activity.kode_unik_full || kodeUnikFix);

    const isEmptyRab = (!rabItems || rabItems.length === 0);
    const totalBiaya = isEmptyRab ? 0 : rabItems.reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0);
    const firstItem = isEmptyRab ? {} : (rabItems[0] || {});
    const normFirstSumber = normalizeSumberDana(firstItem.sumber) || 'DDS (Dana Desa)';
    const volumeRab = (!isEmptyRab && firstItem.volume !== undefined && firstItem.volume !== null && firstItem.volume !== '' && !isNaN(Number(firstItem.volume))) ? parseFloat(firstItem.volume) : 0;
    const hargaSatuanRab = (!isEmptyRab && firstItem.harga !== undefined && firstItem.harga !== null && firstItem.harga !== '' && !isNaN(Number(firstItem.harga))) ? parseFloat(firstItem.harga) : 0;
    const totalRab = isEmptyRab ? 0 : (Number.isFinite(totalBiaya) ? totalBiaya : (volumeRab * hargaSatuanRab));

    // Validasi & Normalisasi Sumber Dana pada seluruh item belanja yang tersisa
    if (!isEmptyRab) {
        for (let i = 0; i < rabItems.length; i++) {
            const it = rabItems[i];
            let norm = normalizeSumberDana(it.sumber);
            if (!norm) {
                norm = normalizeSumberDana(it.sumber_dana) || normFirstSumber || 'DDS (Dana Desa)';
            }
            it.sumber = norm;
            it.sumber_dana = norm;
        }
        reindexRabItemsBySubgroup(rabItems);
    }

    // Sanitasi lengkap seluruh item agar seluruh properti tersimpan utuh dan presisi
    const sanitizedItems = isEmptyRab ? [] : rabItems.map((it, idx) => {
        const vol = (it.volume !== undefined && it.volume !== null && it.volume !== '' && !isNaN(Number(it.volume))) ? Number(it.volume) : 1;
        const hrg = (it.harga !== undefined && it.harga !== null && it.harga !== '' && !isNaN(Number(it.harga))) ? Number(it.harga) : (it.harga_satuan !== undefined && it.harga_satuan !== null && it.harga_satuan !== '' && !isNaN(Number(it.harga_satuan)) ? Number(it.harga_satuan) : 0);
        const jml = (it.jumlah !== undefined && it.jumlah !== null && it.jumlah !== '' && !isNaN(Number(it.jumlah))) ? Number(it.jumlah) : (it.jumlah_biaya !== undefined && it.jumlah_biaya !== null && it.jumlah_biaya !== '' && !isNaN(Number(it.jumlah_biaya)) ? Number(it.jumlah_biaya) : (vol * hrg));
        const subNo = Number(it.no_subgroup || it.urutan_subgroup || it.no || it.urutan || (idx + 1));
        const uManual = (it.urutan_manual !== undefined && it.urutan_manual !== null && it.urutan_manual !== '' && !isNaN(Number(it.urutan_manual))) ? Number(it.urutan_manual) : subNo;

        return {
            ...it,
            group: String(it.group || it.group_belanja || 'Belanja').trim(),
            subgroup: String(it.subgroup || it.sub_kelompok || 'Sub Group').trim(),
            uraian: String(it.uraian || '-').trim(),
            volume: vol,
            satuan: String(it.satuan || 'Paket').trim(),
            harga: hrg,
            jumlah: jml,
            harga_satuan: hrg,
            jumlah_biaya: jml,
            sumber: normalizeSumberDana(it.sumber || it.sumber_dana || normFirstSumber),
            sumber_dana: normalizeSumberDana(it.sumber || it.sumber_dana || normFirstSumber),
            keterangan: String(it.keterangan || '').trim(),
            no: subNo,
            urutan: subNo,
            no_subgroup: subNo,
            urutan_subgroup: subNo,
            urutan_manual: uManual
        };
    });

    const payload = {
        id: currentRabId || undefined,
        id_referensi_murni: isModePerubahan() ? (currentRabRefMurni || undefined) : null,
        kode_unik_full: String(activity.kode_unik_full || kodeUnikFix).trim(),
        tahun: Number(rabYear),
        nama_kegiatan: activity.nama_kegiatan || '',
        bidang: namaBidangFull,
        jenis_kegiatan: activity.jenis_kegiatan || '',
        tipe_anggaran: rabTipe,
        items: sanitizedItems,
        jumlah_anggaran: totalRab,
        volume: volumeRab,
        satuan: firstItem.satuan || 'Paket',
        harga_satuan: hargaSatuanRab,
        sumber_dana: normFirstSumber,
        rpjm_data: {
            kode_unik_full: String(activity.kode_unik_full || kodeUnikFix).trim(),
            nama_kegiatan: activity.nama_kegiatan || '',
            bidang: namaBidangFull,
            jenis_bidang: activity.jenis_bid || activity.jenis_bidang || '',
            jenis_kegiatan: activity.jenis_kegiatan || '',
            sumber_dana: normFirstSumber
        }
    };
    // Use kode_unik_full as the primary key for the POST request as well
    payload.kode_unik = payload.kode_unik_full;

    const res = await fetch(`${API_URL}/rab`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    let json = null;
    try { json = await res.json(); } catch (_) {}
    if (res.ok && json && json.success) {
        if (json.data && json.data.id) {
            currentRabId = json.data.id;
        }
        if (json.data && json.data.id_referensi_murni) {
            currentRabRefMurni = json.data.id_referensi_murni;
        }
        setFormDirty(false);
        try {
            localStorage.setItem('sia_rab_updated', String(Date.now()));
            localStorage.setItem('sia_rab_updated_kode', String(activity.kode_unik_full || kodeUnikFix).trim());
            localStorage.setItem('sia_rab_updated_tahun', String(rabYear));
        } catch (_) {}
        showToast(`✅ Data RAB ${rabTipe} berhasil disimpan ke Supabase!`, 'success');
        await loadSavedRabList();
        await refreshLockStatus();
    } else if (json && json.locked) {
        showToast(json.error || 'Gagal menyimpan data RAB.', 'error');
        rabMurniLocked = false;
        applyReadOnlyMode();
        await loadSavedRabList();
        throw new Error(json.error || 'Data RAB terkunci');
    } else {
        setFormDirty(true);
        const errMsg = (json && (json.error || json.message)) || `Gagal menyimpan RAB ke database (HTTP ${res.status})`;
        showToast(errMsg, 'error');
        await loadSavedRabList();
        throw new Error(errMsg);
    }
}

async function saveRAB() {
    if (isSavingRab) {
        pendingSaveRab = true;
        setSaveStatusIndicator('saving');
        return;
    }
    isSavingRab = true;
    setSaveStatusIndicator('saving');

    try {
        do {
            pendingSaveRab = false;
            await executeSaveRAB();
        } while (pendingSaveRab);
        setFormDirty(false);
        setSaveStatusIndicator('saved');
    } catch (error) {
        console.error('❌ Error saveRAB:', error);
        setFormDirty(true);
        setSaveStatusIndicator('error');
        showToast('Gagal menyimpan RAB ke database', 'error');
        await loadSavedRabList();
    } finally {
        isSavingRab = false;
    }
}

function resetRabItemForm() {
    editIndex = -1;
    const uraian = document.getElementById('input-uraian');
    const volume = document.getElementById('input-volume');
    const satuan = document.getElementById('input-satuan');
    const harga = document.getElementById('input-harga');
    const ket = document.getElementById('input-keterangan');
    if (uraian) uraian.value = '';
    if (volume) volume.value = '';
    if (satuan) satuan.value = '';
    if (harga) harga.value = '';
    if (ket) ket.value = '';

    updateFormRefSemula(null);

    const btnCancel = document.getElementById('btn-cancel-edit-item');
    if (btnCancel) {
        btnCancel.classList.add('hidden');
    }
    const btn = document.getElementById('btn-add-item');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-plus-circle mr-1"></i> Tambah Item RAB';
        btn.className = 'btn-success flex-1 justify-center';
    }
}

function cancelEditRabItem() {
    resetRabItemForm();
    setFormDirty(false);
    setSaveStatusIndicator('saved');
    showToast('Batal edit item. Form siap untuk input item baru.', 'info');
}

async function clearRabItems() {
    if (rabItems.length === 0) return;
    if (!confirm('Yakin ingin mengosongkan seluruh item RAB pada kegiatan ini?')) return;
    setFormDirty(true);
    rabItems = [];
    resetRabItemForm();
    renderRabItems();
    showToast('Mengosongkan seluruh item RAB dan menyimpan ke Supabase...', 'info');
    await saveRAB();
}

function addRabItem() {
    if (!selectedRpjm) {
        showToast('Pilih kegiatan RPJMDes terlebih dahulu', 'error');
        return;
    }
    const group = document.getElementById('select-group').value;
    const subgroup = document.getElementById('select-subgroup').value;
    const uraian = document.getElementById('input-uraian').value.trim();
    const volumeRaw = document.getElementById('input-volume')?.value;
    const volume = (volumeRaw !== undefined && volumeRaw !== null) ? String(volumeRaw).trim() : '';
    const satuan = getSatuanValue();
    const hargaRaw = document.getElementById('input-harga')?.value || '';
    const harga = parseNumber(hargaRaw); // parseNumber handles dots (.) as thousands separators
    const rawSumber = document.getElementById('select-sumber-dana')?.value || '';
    const sumber = normalizeSumberDana(rawSumber);
    const keterangan = document.getElementById('input-keterangan').value.trim();

    // Validasi eksplisit: izinkan nilai 0 (nol) untuk volume dan harga satuan
    if (!group || !subgroup || !uraian || !satuan || volume === '' || hargaRaw.trim() === '' || !Number.isFinite(harga) || harga < 0) {
        showToast('Isi group, sub group, uraian, volume, satuan, dan harga satuan (minimal 0) terlebih dahulu', 'error');
        return;
    }

    // Validasi Wajib Sumber Dana
    if (!sumber || !String(sumber).trim()) {
        showToast('Pilih Sumber Dana terlebih dahulu! Field Sumber Dana wajib diisi.', 'error');
        document.getElementById('select-sumber-dana')?.focus();
        return;
    }

    // VOLUME BOLEH TEKS DIMENSI ("250mX4mX0,15m3"): angka murni dihitung seperti biasa,
    // sedangkan teks dimensi disimpan APA ADANYA (jsonb `rab.items`) dan total itemnya
    // dihitung sebagai 1 satuan kerja (harga satuan) supaya nominal tidak menjadi NaN/0.
    const volumeAngka = (typeof window !== 'undefined' && window.VolumeTeks)
        ? window.VolumeTeks.volumeKeAngka(volume)
        : (Number.isFinite(Number(volume.replace(/,/g, '.'))) ? Number(volume.replace(/,/g, '.')) : null);
    const volumeDimensi = volumeAngka === null;
    const validVol = (volumeAngka !== null && volumeAngka >= 0) ? volumeAngka : volume;
    const jumlah = (volumeDimensi ? 1 : validVol) * harga;

    // VALIDASI OVER-BUDGET LOGIC (MENCEGAH OVER-BUDGET) - hanya jika jumlah > 0
    if (jumlah > 0) {
        const isEditingIdx = (typeof editIndex === 'number' && editIndex >= 0) ? editIndex : -1;
        const isBudgetSafe = validatePaguBudget(rabYear, sumber, jumlah, isEditingIdx);
        if (!isBudgetSafe) {
            return; // BLOK PENYIMPANAN - OVER BUDGET
        }
    }

    const item = {
        id_item: (editIndex > -1 && rabItems[editIndex]?.id_item) ? rabItems[editIndex].id_item : ('item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)),
        group,
        subgroup,
        uraian,
        volume: validVol,
        satuan,
        harga,
        jumlah,
        sumber,
        keterangan,
        urutan_manual: editIndex > -1 ? (rabItems[editIndex]?.urutan_manual || editIndex + 1) : (rabItems.length + 1),
        urutan: editIndex > -1 ? (rabItems[editIndex]?.urutan || editIndex + 1) : (rabItems.length + 1),
        no: editIndex > -1 ? (rabItems[editIndex]?.no || editIndex + 1) : (rabItems.length + 1)
    };

    // RAB PERUBAHAN: pertahankan jejak penjajaran dari versi MURNI saat mengedit,
    // supaya SEMULA <-> MENJADI tetap berpasangan walau uraian diubah.
    if (editIndex > -1 && rabItems[editIndex]) {
        const prev = rabItems[editIndex];
        const sameSub = String(prev.subgroup || '').trim().toLowerCase() === String(item.subgroup || '').trim().toLowerCase();
        const sameGrp = String(prev.group || '').trim().toLowerCase() === String(item.group || '').trim().toLowerCase();
        if (sameSub && sameGrp) {
            if (prev.urutan_murni !== undefined) item.urutan_murni = prev.urutan_murni;
            if (prev.id_referensi_murni !== undefined) item.id_referensi_murni = prev.id_referensi_murni;
            if (prev.uraian_murni !== undefined) item.uraian_murni = prev.uraian_murni;
            if (!item.uraian_murni && prev.uraian && prev.uraian !== item.uraian && item.urutan_murni !== null) {
                item.uraian_murni = prev.uraian;
            }
        } else {
            // Berubah sub-kelompok: dianggap item baru di sub-grup tujuan agar tidak merusak urutan master murni
            item.urutan_murni = null;
            item.uraian_murni = null;
            item.id_referensi_murni = null;
        }
    } else if (isModePerubahan()) {
        // Item baru murni tambahan pada versi PERUBAHAN: tidak punya padanan MURNI,
        // sehingga nilai SEMULA otomatis 0 pada laporan perbandingan.
        item.urutan_murni = null;
        item.uraian_murni = null;
        item.item_baru = true;
    }

    if (editIndex > -1) {
        rabItems.splice(editIndex, 1, item);
        showToast('Perubahan item disimpan', 'success');
    } else {
        if (isModePerubahan()) {
            item.item_baru = true;
            item.urutan_murni = null;
            item.urutan_manual = rabItems.length + 1;
            item.urutan = rabItems.length + 1;
            item.no = rabItems.length + 1;
        }
        rabItems.push(item);
        showToast('Item RAB berhasil ditambahkan', 'success');
    }

    if (!isModePerubahan()) {
        rabItems = sortRabItems(rabItems);
        reindexRabItemsBySubgroup(rabItems);
    }
    setFormDirty(true);
    resetRabItemForm();
    renderRabItems();
    saveRAB();
}

function editRabItem(index) {
    const item = rabItems[index];
    if (!item) return;
    setFormDirty(true);
    const selectGroup = document.getElementById('select-group');
    if (selectGroup) {
        if (item.group && ![...selectGroup.options].some(o => o.value === item.group)) {
            const opt = document.createElement('option');
            opt.value = item.group;
            opt.textContent = item.group;
            selectGroup.appendChild(opt);
        }
        selectGroup.value = item.group || '';
    }
    onGroupChange();

    const selectSub = document.getElementById('select-subgroup');
    if (selectSub) {
        if (item.subgroup && ![...selectSub.options].some(o => o.value === item.subgroup)) {
            const opt = document.createElement('option');
            opt.value = item.subgroup;
            opt.textContent = item.subgroup;
            selectSub.appendChild(opt);
        }
        selectSub.value = item.subgroup || '';
    }

    document.getElementById('input-uraian').value = item.uraian || '';
    document.getElementById('input-volume').value = (item.volume !== undefined && item.volume !== null && item.volume !== '') ? item.volume : '';
    document.getElementById('input-satuan').value = item.satuan || '';
    const hrgVal = Number(item.harga !== undefined && item.harga !== null && item.harga !== '' ? item.harga : (item.harga_satuan !== undefined && item.harga_satuan !== null && item.harga_satuan !== '' ? item.harga_satuan : 0));
    document.getElementById('input-harga').value = (hrgVal !== null && hrgVal !== undefined && !isNaN(hrgVal)) ? (hrgVal === 0 ? '0' : formatRupiah(hrgVal)) : '';
    document.getElementById('input-keterangan').value = item.keterangan || '';
    // Wajib pulihkan sumber dana item agar saat edit & simpan sumber tidak hilang/tertukar
    const sumber = document.getElementById('select-sumber-dana');
    if (sumber && item.sumber) {
        if ([...sumber.options].some(o => o.value === item.sumber)) {
            sumber.value = item.sumber;
        } else {
            autoSelectSumberDana(sumber, item.sumber);
        }
    }
    editIndex = index;
    updateFormRefSemula(getItemMurniRef(item, index));

    const btnCancel = document.getElementById('btn-cancel-edit-item');
    if (btnCancel) {
        btnCancel.classList.remove('hidden');
    }

    const btn = document.getElementById('btn-add-item');
    if (btn) {
        btn.innerHTML = `<i class="fas fa-save mr-1"></i> Simpan Perubahan Item #${item.no || (index + 1)}`;
        btn.className = 'btn-warning flex-1 justify-center';
    }

    // Gulir ke panel form input rincian RAB (bukan ke atas halaman)
    const formPanel = document.getElementById('rab-form-panel');
    if (formPanel) {
        formPanel.classList.remove('hidden');
        formPanel.style.display = 'block';
        if (typeof syncAccSection === 'function') syncAccSection('rab-form-panel');
        formPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function reindexRabItemsBySubgroup(items) {
    if (!Array.isArray(items)) return;
    const subgroupCounters = {};
    items.forEach((it) => {
        if (!it) return;
        const key = String(it.group || '').trim() + '\u0000' + String(it.subgroup || '').trim();
        subgroupCounters[key] = (subgroupCounters[key] || 0) + 1;
        const subNo = subgroupCounters[key];
        it.no = subNo;
        it.urutan = subNo;
        it.urutan_subgroup = subNo;
        it.no_subgroup = subNo;
        it.urutan_manual = subNo;
    });
}

async function removeRabItem(index, skipConfirm = false) {
    if (index < 0 || index >= rabItems.length) return;
    const item = rabItems[index];
    const uraian = item ? (item.uraian || `Item #${index + 1}`) : `Item #${index + 1}`;

    if (!skipConfirm && typeof window !== 'undefined' && typeof window.confirm === 'function') {
        const ok = window.confirm(`Apakah Anda yakin ingin menghapus item "${uraian}" dari RAB?`);
        if (!ok) return;
    }

    // Reset edit state jika sedang mengedit item yang dihapus
    if (typeof editIndex === 'number') {
        if (editIndex === index) {
            cancelEditRabItem();
        } else if (editIndex > index) {
            editIndex--;
        }
    }

    setFormDirty(true);
    rabItems.splice(index, 1);
    reindexRabItemsBySubgroup(rabItems);
    renderRabItems();
    showToast(`Menghapus item "${uraian}" dan menyimpan ke Supabase...`, 'info');
    await saveRAB();
}

async function deleteRabItem(index, skipConfirm = false) {
    return await removeRabItem(index, skipConfirm);
}

function moveRabItemUp(idx) {
    if (idx < 0 || idx >= rabItems.length) return;
    const currentItem = rabItems[idx];
    if (!currentItem) return;

    const currentGrp = String(currentItem.group || '').trim();
    const currentSub = String(currentItem.subgroup || '').trim();

    // Cari item sebelumnya dalam sub-kelompok yang sama
    let prevSubIdx = -1;
    for (let i = idx - 1; i >= 0; i--) {
        const it = rabItems[i];
        if (it && String(it.group || '').trim() === currentGrp && String(it.subgroup || '').trim() === currentSub) {
            prevSubIdx = i;
            break;
        }
    }

    if (prevSubIdx === -1) {
        showToast('Item sudah berada di posisi teratas dalam kelompoknya', 'info');
        return;
    }

    // Tukar posisi di array rabItems
    const temp = rabItems[idx];
    rabItems[idx] = rabItems[prevSubIdx];
    rabItems[prevSubIdx] = temp;

    // Normalisasi ulang nomor urut per sub-kelompok
    reindexRabItemsBySubgroup(rabItems);

    setFormDirty(true);
    renderRabItems();
    saveRAB();
    showToast(`Urutan item "${temp.uraian || ''}" berhasil dinaikkan`, 'success');
}

function moveRabItemDown(idx) {
    if (idx < 0 || idx >= rabItems.length) return;
    const currentItem = rabItems[idx];
    if (!currentItem) return;

    const currentGrp = String(currentItem.group || '').trim();
    const currentSub = String(currentItem.subgroup || '').trim();

    // Cari item sesudahnya dalam sub-kelompok yang sama
    let nextSubIdx = -1;
    for (let i = idx + 1; i < rabItems.length; i++) {
        const it = rabItems[i];
        if (it && String(it.group || '').trim() === currentGrp && String(it.subgroup || '').trim() === currentSub) {
            nextSubIdx = i;
            break;
        }
    }

    if (nextSubIdx === -1) {
        showToast('Item sudah berada di posisi terbawah dalam kelompoknya', 'info');
        return;
    }

    // Tukar posisi di array rabItems
    const temp = rabItems[idx];
    rabItems[idx] = rabItems[nextSubIdx];
    rabItems[nextSubIdx] = temp;

    // Normalisasi ulang nomor urut per sub-kelompok
    reindexRabItemsBySubgroup(rabItems);

    setFormDirty(true);
    renderRabItems();
    saveRAB();
    showToast(`Urutan item "${temp.uraian || ''}" berhasil diturunkan`, 'success');
}

function changeRabItemOrder(idx, newPosVal) {
    const targetNo = parseInt(newPosVal, 10);
    if (!Number.isFinite(targetNo) || targetNo <= 0) {
        renderRabItems();
        return;
    }

    const currentItem = rabItems[idx];
    if (!currentItem) return;

    const currentGrp = String(currentItem.group || '').trim();
    const currentSub = String(currentItem.subgroup || '').trim();

    // Kumpulkan seluruh item dalam sub kelompok yang sama
    const subgroupIndices = [];
    rabItems.forEach((it, i) => {
        if (it && String(it.group || '').trim() === currentGrp && String(it.subgroup || '').trim() === currentSub) {
            subgroupIndices.push(i);
        }
    });

    if (subgroupIndices.length <= 1) {
        renderRabItems();
        return;
    }

    const currentSubPos = subgroupIndices.indexOf(idx);
    let targetSubPos = -1;

    // Jika targetNo <= subgroupIndices.length, perlakukan sebagai 1-based relative index
    if (targetNo <= subgroupIndices.length) {
        targetSubPos = targetNo - 1;
    } else {
        targetSubPos = Math.min(targetNo - 1, subgroupIndices.length - 1);
    }

    if (targetSubPos < 0) targetSubPos = 0;
    if (targetSubPos >= subgroupIndices.length) targetSubPos = subgroupIndices.length - 1;

    if (targetSubPos === currentSubPos) {
        renderRabItems();
        return;
    }

    const [moved] = rabItems.splice(idx, 1);
    const targetItemInSubgroup = rabItems.find((it, i) => {
        if (it && String(it.group || '').trim() === currentGrp && String(it.subgroup || '').trim() === currentSub) {
            const count = rabItems.slice(0, i + 1).filter(x => String(x.group || '').trim() === currentGrp && String(x.subgroup || '').trim() === currentSub).length - 1;
            return count === targetSubPos;
        }
        return false;
    });

    if (targetItemInSubgroup) {
        const insertIdx = rabItems.indexOf(targetItemInSubgroup);
        if (targetSubPos > currentSubPos) {
            rabItems.splice(insertIdx + 1, 0, moved);
        } else {
            rabItems.splice(insertIdx, 0, moved);
        }
    } else {
        rabItems.splice(subgroupIndices[targetSubPos] || 0, 0, moved);
    }

    // Normalisasi ulang nomor urut per sub-kelompok
    reindexRabItemsBySubgroup(rabItems);

    setFormDirty(true);
    renderRabItems();
    saveRAB();
    showToast(`Urutan item "${moved.uraian || ''}" dipindahkan ke nomor ${targetSubPos + 1}`, 'success');
}

// Mendorong (push) item baru dari RAB Perubahan ke master RAB Murni (Awal)
async function pushItemToMurni(idx) {
    if (idx < 0 || idx >= rabItems.length) return;
    const item = rabItems[idx];
    if (!item) return;

    const confirmed = confirm(`Simpan dan tambahkan item "${item.uraian}" secara otomatis ke master RAB Murni (Awal)?\n\nItem ini akan didorong ke master RAB Murni dengan rincian volume, satuan, dan harga yang sama.`);
    if (!confirmed) return;

    showToast(`Menyinkronkan item "${item.uraian}" ke RAB Murni...`, 'info');

    try {
        const payload = {
            kode_unik_full: selectedRpjm?.kode_unik_full || document.getElementById('select-kode-unik')?.value || '',
            tahun: Number(rabYear),
            item: item,
            id_referensi_murni: currentRabRefMurni || undefined,
            id_perubahan: currentRabId || undefined
        };

        const res = await fetch(`${API_URL}/rab/sync-to-murni`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const json = await res.json().catch(() => null);
        if (res.ok && json && json.success) {
            showToast(`Berhasil! Item "${item.uraian}" telah disinkronkan ke RAB Murni.`, 'success');
            // Reload saved RAB untuk memperbarui referensi murni dan kalkulasi semula/menjadi
            await loadSavedRAB();
        } else {
            showToast(`Gagal menyinkronkan ke RAB Murni: ${json?.error || res.statusText}`, 'error');
        }
    } catch (err) {
        console.error('Error pushItemToMurni:', err);
        showToast(`Terjadi kesalahan jaringan: ${err.message}`, 'error');
    }
}

// Salin semua field dari item RAB terakhir yang tersimpan ke form
// agar tidak perlu menulis ulang saat nilainya sama.
function salinDataItem() {
    if (!rabItems.length) {
        showToast('Belum ada item RAB yang bisa disalin', 'warning');
        return;
    }
    const item = rabItems[rabItems.length - 1];
    if (!item) return;

    // Reset mode edit terlebih dahulu agar form siap menambah item baru (bukan menimpa)
    resetRabItemForm();

    const grp = document.getElementById('select-group');
    if (grp) grp.value = item.group || '';
    onGroupChange();
    const sub = document.getElementById('select-subgroup');
    if (sub) sub.value = item.subgroup || '';

    const uraian = document.getElementById('input-uraian');
    const volume = document.getElementById('input-volume');
    const harga = document.getElementById('input-harga');
    const ket = document.getElementById('input-keterangan');
    const sumber = document.getElementById('select-sumber-dana');
    const satuanInput = document.getElementById('input-satuan');

    if (uraian) uraian.value = item.uraian || '';
    if (volume) volume.value = (item.volume !== undefined && item.volume !== null && item.volume !== '') ? item.volume : 0;
    if (harga) {
        const hrgVal = Number(item.harga !== undefined && item.harga !== null && item.harga !== '' ? item.harga : 0);
        harga.value = (hrgVal === 0 ? '0' : formatRupiah(hrgVal));
    }
    if (ket) ket.value = item.keterangan || '';

    if (sumber && item.sumber) {
        if ([...sumber.options].some(o => o.value === item.sumber)) {
            sumber.value = item.sumber;
        } else {
            autoSelectSumberDana(sumber, item.sumber);
        }
    }

    if (satuanInput) satuanInput.value = item.satuan || '';

    showToast('Field item terakhir disalin ke form (mode tambah item baru)', 'success');
    setFormDirty(true);
    if (uraian) { uraian.focus(); uraian.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}

function renderRabItems() {
    const tbody = document.getElementById('rab-items-body');

    const totalBiaya = rabItems.reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0);
    const totalSemula = isModePerubahan()
        ? (rabMurniRefTotal || (rabMurniRefItems.length ? rabMurniRefItems.reduce((sum, m) => sum + (Number(m.jumlah) || 0), 0) : 0))
        : 0;
    const totalSelisih = totalBiaya - totalSemula;

    document.getElementById('rab-total-items').textContent = `${rabItems.length} Item`;
    document.getElementById('rab-total-biaya').textContent = `Rp ${formatRupiah(totalBiaya)}`;

    const lblTotalBiaya = document.getElementById('rab-total-biaya-label');
    const boxSemula = document.getElementById('box-total-semula');
    const boxSelisih = document.getElementById('box-total-selisih');
    const elTotalSemula = document.getElementById('rab-total-semula');
    const elTotalSelisih = document.getElementById('rab-total-selisih');

    if (isModePerubahan()) {
        if (lblTotalBiaya) lblTotalBiaya.textContent = 'Total Menjadi (Perubahan):';
        if (boxSemula) boxSemula.classList.remove('hidden');
        if (boxSelisih) boxSelisih.classList.remove('hidden');
        if (elTotalSemula) elTotalSemula.textContent = `Rp ${formatRupiah(totalSemula)}`;
        if (elTotalSelisih) {
            if (totalSelisih > 0) {
                elTotalSelisih.className = 'text-lg font-extrabold text-emerald-600';
                elTotalSelisih.textContent = `+Rp ${formatRupiah(totalSelisih)}`;
            } else if (totalSelisih < 0) {
                elTotalSelisih.className = 'text-lg font-extrabold text-rose-600';
                elTotalSelisih.textContent = `-Rp ${formatRupiah(Math.abs(totalSelisih))}`;
            } else {
                elTotalSelisih.className = 'text-lg font-extrabold text-slate-500';
                elTotalSelisih.textContent = `Rp 0 (Tetap)`;
            }
        }
    } else {
        if (lblTotalBiaya) lblTotalBiaya.textContent = 'Total Pagu RAB:';
        if (boxSemula) boxSemula.classList.add('hidden');
        if (boxSelisih) boxSelisih.classList.add('hidden');
    }

    if (!tbody) return;

    if (!rabItems.length) {
        tbody.innerHTML = `
            <div class="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300 p-6">
                <i class="fas fa-receipt text-3xl text-slate-300 mb-2"></i>
                <div class="text-slate-500 font-semibold text-sm">Belum ada item RAB</div>
                <div class="text-slate-400 text-xs mt-1">Gunakan form di atas untuk menambahkan rincian belanja.</div>
            </div>`;
        return;
    }

    // Kelompokkan item berdasarkan (group, subgroup), urut sesuai kode unik penuh belanja.
    // Item yang baru diinput tetap berada di paling bawah sesuai urutan inputnya.
    const groupMapData = rabItems.reduce((acc, item, idx) => {
        const group = String(item.group || '').trim() || 'Group Lainnya';
        const subgroup = String(item.subgroup || '').trim() || 'Sub Group Lainnya';
        const gKey = group + '\u0000' + subgroup;
        if (!acc[gKey]) {
            acc[gKey] = {
                group,
                subgroup,
                groupCode: getRabGroupCode(group),
                subgroupCode: getRabSubgroupCode(subgroup, group),
                items: []
            };
        }
        acc[gKey].items.push({ item, idx });
        return acc;
    }, {});

    const entries = Object.values(groupMapData).sort((a, b) => {
        const aHasGroup = a.groupCode !== '';
        const bHasGroup = b.groupCode !== '';
        if (aHasGroup !== bHasGroup) return aHasGroup ? -1 : 1;
        const cmpGroup = compareKodeRAB(a.groupCode, b.groupCode);
        if (cmpGroup !== 0) return cmpGroup;
        const cmpGroupName = a.group.localeCompare(b.group);
        if (cmpGroupName !== 0) return cmpGroupName;
        const aHasSub = a.subgroupCode !== '';
        const bHasSub = b.subgroupCode !== '';
        if (aHasSub !== bHasSub) return aHasSub ? -1 : 1;
        const cmpSub = compareKodeRAB(a.subgroupCode, b.subgroupCode);
        if (cmpSub !== 0) return cmpSub;
        return a.subgroup.localeCompare(b.subgroup);
    });

    const groupHeaders = [];
    entries.forEach(entry => {
        if (!groupHeaders.includes(entry.group)) groupHeaders.push(entry.group);
    });

    let html = '';
    let runningNo = 0;

    groupHeaders.forEach(groupName => {
        html += `
            <div class="rab-group-header bg-gradient-to-r from-indigo-700 via-indigo-800 to-indigo-900 text-white rounded-xl px-4 py-2.5 font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-xs mt-4 first:mt-0 tracking-wide uppercase">
                <i class="fas fa-folder-open text-indigo-200"></i>
                <span>${groupName}</span>
            </div>`;

        entries.forEach(entry => {
            if (entry.group !== groupName) return;
            const subTotal = entry.items.reduce((s, e) => s + (Number(e.item.jumlah) || 0), 0);
            const subTotalSemula = isModePerubahan()
                ? entry.items.reduce((s, e) => s + (Number(getItemMurniRef(e.item, e.idx).jumlah) || 0), 0)
                : 0;

            // Pastikan item di dalam Sub Group terurut konsisten (urutan manual / indeks SisKeuDes)
            entry.items.sort((a, b) => {
                const itA = a.item;
                const itB = b.item;
                if (isModePerubahan()) {
                    const isNewA = !!(itA.item_baru || itA.urutan_murni === null || itA.urutan_murni === undefined);
                    const isNewB = !!(itB.item_baru || itB.urutan_murni === null || itB.urutan_murni === undefined);
                    // 1. Item baseline Murni selalu berada di atas item baru
                    if (!isNewA && isNewB) return -1;
                    if (isNewA && !isNewB) return 1;
                    if (!isNewA && !isNewB) {
                        // Keduanya baseline: kunci mutlak mengikuti urutan Murni (0..N)
                        const mA = Number(itA.urutan_murni !== undefined && itA.urutan_murni !== null ? itA.urutan_murni : (itA.urutan_manual || 0));
                        const mB = Number(itB.urutan_murni !== undefined && itB.urutan_murni !== null ? itB.urutan_murni : (itB.urutan_manual || 0));
                        if (mA !== mB) return mA - mB;
                    } else {
                        // Keduanya item baru: urutkan sesuai posisi append / urutan_manual
                        const uA = Number(itA.urutan_manual || a.idx || 0);
                        const uB = Number(itB.urutan_manual || b.idx || 0);
                        if (uA !== uB) return uA - uB;
                    }
                }
                const uA = Number(itA.urutan_manual !== undefined && itA.urutan_manual !== null && itA.urutan_manual !== '' 
                    ? itA.urutan_manual 
                    : (itA.urutan_murni !== undefined && itA.urutan_murni !== null && itA.urutan_murni !== '' 
                        ? (Number(itA.urutan_murni) + 1) 
                        : (itA.urutan_subgroup || itA.no_subgroup || itA.urutan || itA.no || 0)));
                const uB = Number(itB.urutan_manual !== undefined && itB.urutan_manual !== null && itB.urutan_manual !== '' 
                    ? itB.urutan_manual 
                    : (itB.urutan_murni !== undefined && itB.urutan_murni !== null && itB.urutan_murni !== '' 
                        ? (Number(itB.urutan_murni) + 1) 
                        : (itB.urutan_subgroup || itB.no_subgroup || itB.urutan || itB.no || 0)));
                if (uA && uB && uA !== uB) return uA - uB;

                const idxA = getSiskeudesItemIndex(itA.uraian || itA.nama_barang || itA.nama);
                const idxB = getSiskeudesItemIndex(itB.uraian || itB.nama_barang || itB.nama);
                if (idxA !== -1 && idxB !== -1) {
                    if (idxA !== idxB) return idxA - idxB;
                } else if (idxA !== -1) {
                    return -1;
                } else if (idxB !== -1) {
                    return 1;
                }

                if (uA || uB) return (uA || 999999) - (uB || 999999);
                return a.idx - b.idx;
            });

            html += `
                <div class="rab-subgroup-header bg-indigo-50/90 border border-indigo-100 rounded-xl px-4 py-2 font-bold text-xs text-indigo-950 flex items-center justify-between shadow-2xs mt-2.5">
                    <div class="flex items-center gap-2 min-w-0 pr-2">
                        <i class="fas fa-layer-group text-indigo-500 flex-shrink-0"></i>
                        <span class="truncate">${entry.subgroup}</span>
                    </div>
                    <div class="text-right flex-shrink-0 whitespace-nowrap">
                        <span class="font-extrabold text-indigo-900 text-xs">Rp ${formatRupiah(subTotal)}</span>
                        ${isModePerubahan() ? `<span class="text-[10px] text-slate-500 font-normal ml-1.5">(Semula: Rp ${formatRupiah(subTotalSemula)})</span>` : ''}
                    </div>
                </div>`;

            let subNo = 0;
            entry.items.forEach(({ item, idx }, subIdx) => {
                subNo += 1;
                runningNo += 1;
                item.no = subNo;
                item.urutan = subNo;
                item.urutan_subgroup = subNo;
                item.no_subgroup = subNo;
                const isFirst = (subIdx === 0);
                const isLast = (subIdx === entry.items.length - 1);
                const ref = getItemMurniRef(item, idx);

                let uraianBadge = '';

                let sumberBadge = '';
                const sText = normalizeSumberDana(item.sumber);
                if (!sText) {
                    sumberBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-700 border border-red-300 animate-pulse shadow-xs whitespace-nowrap" title="Sumber Dana belum diisi! Wajib diisi saat simpan."><i class="fas fa-exclamation-triangle text-red-600"></i> [Kosong]</span>`;
                    uraianBadge += `<div class="text-xs font-bold text-red-600 mt-1"><i class="fas fa-exclamation-circle"></i> Sumber Dana belum dipilih</div>`;
                } else {
                    const sUpper = sText.toUpperCase();
                    let badgeClass = 'bg-slate-100 text-slate-800 border-slate-200';
                    let shortCode = sText;
                    if (sUpper.includes('DDS') || sUpper.includes('DANA DESA') || sUpper === 'DD') {
                        badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                        shortCode = 'DDS';
                    } else if (sUpper.includes('ADD') || sUpper.includes('ALOKASI DANA')) {
                        badgeClass = 'bg-blue-100 text-blue-800 border-blue-300';
                        shortCode = 'ADD';
                    } else if (sUpper.includes('PBH') || sUpper.includes('BAGI HASIL') || sUpper.includes('BHP')) {
                        badgeClass = 'bg-indigo-100 text-indigo-800 border-indigo-300';
                        shortCode = 'PBH';
                    } else if (sUpper.includes('PAD') || sUpper.includes('PENDAPATAN ASLI')) {
                        badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
                        shortCode = 'PAD';
                    } else if (sUpper.includes('APBD TK. I') || sUpper.includes('PROVINSI')) {
                        badgeClass = 'bg-purple-100 text-purple-800 border-purple-300';
                        shortCode = 'APBD Prov';
                    } else if (sUpper.includes('APBD TK. II') || sUpper.includes('KABUPATEN')) {
                        badgeClass = 'bg-purple-100 text-purple-800 border-purple-300';
                        shortCode = 'APBD Kab';
                    } else if (sUpper.includes('APBD')) {
                        badgeClass = 'bg-purple-100 text-purple-800 border-purple-300';
                        shortCode = 'APBD';
                    }
                    sumberBadge = `<span class="inline-flex items-center justify-center px-2.5 py-0.5 rounded-lg text-xs font-bold border ${badgeClass} shadow-2xs whitespace-nowrap" title="${sText}">${shortCode}</span>`;
                }

                let diffBadge = '';
                if (isModePerubahan()) {
                    if (ref.isBaru) {
                        uraianBadge = `
                            <div class="mt-1.5 flex items-center gap-1.5 flex-wrap">
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    <i class="fas fa-plus-circle text-[10px]"></i> Item Baru (Semula: Rp 0)
                                </span>
                                <button type="button" 
                                        onclick="pushItemToMurni(${idx})" 
                                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-extrabold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-300 hover:border-blue-600 transition shadow-2xs cursor-pointer"
                                        title="Salin dan tambahkan item baru ini secara otomatis ke master RAB Murni (Awal)">
                                    <i class="fas fa-arrow-up-from-bracket text-[10px]"></i> Push ke Murni
                                </button>
                            </div>` + uraianBadge;
                        diffBadge = `<span class="text-xs font-extrabold text-emerald-600 whitespace-nowrap">(+Rp ${formatRupiah(item.jumlah)})</span>`;
                    } else {
                        if (ref.uraian && ref.uraian.trim().toLowerCase() !== String(item.uraian || '').trim().toLowerCase()) {
                            uraianBadge = `<div class="text-xs text-slate-400 italic mt-0.5">Semula: ${ref.uraian}</div>` + uraianBadge;
                        }
                        const diff = Number(item.jumlah || 0) - ref.jumlah;
                        if (diff > 0) {
                            diffBadge = `<span class="text-xs font-extrabold text-emerald-600 whitespace-nowrap" title="Semula: Rp ${formatRupiah(ref.jumlah)}">(+Rp ${formatRupiah(diff)})</span>`;
                        } else if (diff < 0) {
                            diffBadge = `<span class="text-xs font-extrabold text-rose-600 whitespace-nowrap" title="Semula: Rp ${formatRupiah(ref.jumlah)}">(-Rp ${formatRupiah(Math.abs(diff))})</span>`;
                        } else {
                            diffBadge = `<span class="text-xs font-medium text-slate-400 whitespace-nowrap">(Tetap)</span>`;
                        }
                    }
                }

                html += `
                    <div class="rab-item-card p-3 space-y-2.5">
                        <!-- Baris Atas Kartu: [No Input] + [Uraian Belanja (Full Text)] + [Badge Sumber Dana] -->
                        <div class="flex items-start justify-between gap-3">
                            <div class="flex items-start gap-2.5 flex-1 min-w-0">
                                <div class="flex-shrink-0 pt-0.5">
                                    <input type="number" min="1" max="${entry.items.length}" value="${subNo}"
                                           class="w-11 h-7 text-center text-xs font-black border border-slate-300 rounded-lg px-1 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50 hover:bg-white transition"
                                           onchange="changeRabItemOrder(${idx}, this.value)"
                                           onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}"
                                           title="Nomor urut ${subNo} dalam ${entry.subgroup}. Ketik nomor baru lalu tekan Enter untuk memindahkan urutan">
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="text-sm font-bold text-slate-900 leading-snug break-words">${item.uraian}</div>
                                    ${uraianBadge}
                                    ${item.keterangan ? `<div class="text-xs text-slate-400 font-medium mt-0.5 break-words">${item.keterangan}</div>` : ''}
                                </div>
                            </div>
                            <div class="flex-shrink-0 pt-0.5">
                                ${sumberBadge}
                            </div>
                        </div>

                        <!-- Baris Bawah Kartu: [Volume & Satuan] | [Harga Satuan] | [Jumlah Biaya] disandingkan dengan [Tombol Kontrol Aksi] -->
                        <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                            <div class="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
                                <div class="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg" title="Volume dan Satuan">
                                    <span class="text-slate-400 font-medium">Vol:</span>
                                    <span class="font-bold text-slate-800">${(item.volume !== undefined && item.volume !== null && item.volume !== '') ? item.volume : '-'}</span>
                                    <span class="text-slate-600 font-medium">${item.satuan || '-'}</span>
                                    ${isModePerubahan() && !ref.isBaru && ref.vol !== undefined ? `<span class="text-[10px] text-slate-400 font-normal" title="Volume Semula (RAB Murni)">(Semula: ${ref.vol})</span>` : ''}
                                </div>
                                <div class="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg" title="Harga Satuan">
                                    <span class="text-slate-400 font-medium">Harga:</span>
                                    <span class="font-bold text-slate-800">Rp ${formatRupiah(item.harga)}</span>
                                    ${isModePerubahan() && !ref.isBaru && ref.harga !== undefined && ref.harga !== item.harga ? `<span class="text-[10px] text-slate-400 font-normal" title="Harga Satuan Semula (RAB Murni)">(Semula: Rp ${formatRupiah(ref.harga)})</span>` : ''}
                                </div>
                                <div class="inline-flex items-center gap-1 bg-indigo-50/70 border border-indigo-100 px-2.5 py-1 rounded-lg" title="Jumlah Biaya Total">
                                    <span class="text-indigo-600 font-bold">Total:</span>
                                    <span class="font-extrabold text-indigo-900 text-xs sm:text-[13px]">Rp ${formatRupiah(item.jumlah)}</span>
                                    ${diffBadge}
                                </div>
                            </div>
                            <div class="flex items-center gap-1.5 flex-shrink-0 ml-auto">
                                ${(isModePerubahan() && ref.isBaru) ? `
                                    <button type="button" class="btn-outline !px-2 !py-1 text-xs font-bold text-blue-700 hover:text-white hover:bg-blue-600 border-blue-300 shadow-2xs cursor-pointer" onclick="pushItemToMurni(${idx})" title="Salin dan tambahkan item baru ini secara otomatis ke master RAB Murni (Awal)">
                                        <i class="fas fa-arrow-up-from-bracket mr-1"></i> Push
                                    </button>` : ''}
                                <button type="button" class="btn-outline !px-2 !py-1 text-xs font-bold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer ${isFirst ? 'opacity-35 cursor-not-allowed' : ''}" onclick="${isFirst ? '' : `moveRabItemUp(${idx})`}" title="Pindah urutan ke atas" ${isFirst ? 'disabled' : ''}>
                                    ▲
                                </button>
                                <button type="button" class="btn-outline !px-2 !py-1 text-xs font-bold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer ${isLast ? 'opacity-35 cursor-not-allowed' : ''}" onclick="${isLast ? '' : `moveRabItemDown(${idx})`}" title="Pindah urutan ke bawah" ${isLast ? 'disabled' : ''}>
                                    ▼
                                </button>
                                <button type="button" class="btn-outline !px-2.5 !py-1 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer" onclick="editRabItem(${idx})" title="Edit data item">
                                    <i class="fas fa-edit mr-1 text-slate-400"></i> Edit
                                </button>
                                <button type="button" class="btn-outline !px-2.5 !py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-300 cursor-pointer" onclick="removeRabItem(${idx})" title="Hapus item">
                                    <i class="fas fa-trash-alt mr-1 text-rose-400"></i> Hapus
                                </button>
                            </div>
                        </div>
                    </div>`;
            });
        });
    });

    tbody.innerHTML = html;
}

function getCurrentlySelectedJenisKegiatan() {
    const elemJenis = document.getElementById('select_jenis_kegiatan');
    if (elemJenis && elemJenis.value && elemJenis.value.trim()) {
        return elemJenis.value.trim();
    }

    const selectKode = document.getElementById('select-kode-unik');
    if (selectKode && selectKode.selectedIndex >= 0) {
        const optText = selectKode.options[selectKode.selectedIndex]?.text;
        if (optText && optText.includes('-')) {
            const parts = optText.split('-');
            const namePart = parts.slice(1).join('-').trim();
            if (namePart) return namePart;
        }
    }

    if (selectedRpjm) {
        return selectedRpjm.jenis_kegiatan || selectedRpjm.nama_kegiatan || selectedRpjm.uraian || null;
    }

    if (window.currentJenisKegiatan) return window.currentJenisKegiatan;
    if (window.selectedRpjmItem) return window.selectedRpjmItem.jenis_kegiatan || window.selectedRpjmItem.nama_kegiatan || null;

    return 'Penyediaan Penghasilan Tetap dan Tunjangan Kepala Desa';
}

// 1. PERBAIKI POPULASI DROPDOWN CETAK PDF (GROUPING UNIK JENIS KEGIATAN)
async function populateGroupCetakDropdown() {
    const selectElem = document.getElementById('selectGroupKegiatanCetak');
    if (!selectElem) return;

    const tahunFilter = Number(document.getElementById('select-year')?.value || rabYear || 2027);

    try {
        let items = [];
        if (window.supabaseClient || window.supabase) {
            const client = window.supabaseClient || window.supabase;
            const { data, error } = await client
                .from('rab')
                .select('kode_unik, jenis_kegiatan, nama_kegiatan, uraian')
                .eq('tahun', tahunFilter)
                .limit(300);

            if (!error && Array.isArray(data)) items = data;
        }

        if (items.length === 0) {
            try {
                const res = await fetch(`/api/rab/list?tahun=${encodeURIComponent(tahunFilter)}&tipe=${encodeURIComponent(rabTipe)}`);
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) items = json.data;
            } catch(e) {}
        }

        // Grouping Unik Berdasarkan Prefix Kode Unik (misal: "01.01.01.")
        const groupMap = new Map();
        
        // Options standar utama
        groupMap.set('01.01.01.', 'Penyediaan Penghasilan Tetap dan Tunjangan Kepala Desa');
        groupMap.set('01.01.02.', 'Penyediaan Penghasilan Tetap dan Tunjangan Perangkat Desa');
        groupMap.set('01.01.03.', 'Penyediaan Jaminan Sosial bagi Kepala Desa dan Perangkat Desa');
        groupMap.set('01.01.04.', 'Penyediaan Operasional Pemerintah Desa (ATK, Honor PKPKD dan PPKD dll)');
        groupMap.set('01.01.05.', 'Penyediaan Tunjangan BPD');
        groupMap.set('01.01.06.', 'Penyediaan Operasional BPD');
        groupMap.set('01.01.08.', 'Penyediaan Operasional Pemerintah Desa yang bersumber dari Dana Desa');

        items.forEach(item => {
            const kode = String(item.kode_unik_full || item.kode_unik || '').trim();
            if (kode.length >= 9) {
                const prefix = kode.substring(0, 9);
                const title = item.jenis_kegiatan || item.nama_kegiatan || item.uraian || prefix;
                if (!groupMap.has(prefix) || title.length > (groupMap.get(prefix) || '').length) {
                    groupMap.set(prefix, title);
                }
            }
        });

        // Format Opsi: "[01.01.01.] Penyediaan Penghasilan Tetap dan Tunjangan Kepala Desa"
        const sortedGroupEntries = Array.from(groupMap.entries()).sort((a, b) => compareKodeUnikFull(a[0], b[0]));
        selectElem.innerHTML = sortedGroupEntries.map(([prefix, title]) => 
            `<option value="${prefix}">[${prefix}] ${title}</option>`
        ).join('');

    } catch (err) {
        console.warn("Gagal mengisi dropdown kelompok cetak RAB:", err);
    }
}

function onChangeKelompokCetak() {
    const selectGroupElem = document.getElementById('selectGroupKegiatanCetak');
    if (!selectGroupElem) return;
    const selectedVal = selectGroupElem.value;
    console.log("onChangeKelompokCetak triggered. Selected prefix:", selectedVal);
}

// 2. HANDLER CETAK PDF BY GROUP (LOCAL MEMORY + MULTI-COLUMN SUPABASE FALLBACK)
async function cetakPdfByGroup() {
    const selectedVal = document.getElementById('selectGroupKegiatanCetak')?.value || document.getElementById('select_kelompok_cetak')?.value || '01.01.01.';
    let targetPrefix = selectedVal.trim();
    if (!targetPrefix) targetPrefix = '01.01.01.';
    if (!targetPrefix.endsWith('.')) {
        targetPrefix += '.';
    }

    const tahunInput = document.getElementById('select-year')?.value || document.getElementById('filterTahun')?.value || '2027';
    const tahunNum = parseInt(tahunInput, 10);

    console.log("FETCH RAB BY GROUP PREFIX:", targetPrefix, "TAHUN:", tahunNum);

    const selectGroupElem = document.getElementById('selectGroupKegiatanCetak');
    let groupTitle = 'Penyediaan Penghasilan Tetap dan Tunjangan Kepala Desa';
    if (selectGroupElem && selectGroupElem.selectedIndex >= 0) {
        const optText = selectGroupElem.options[selectGroupElem.selectedIndex].text;
        if (optText.includes(']')) {
            groupTitle = optText.split(']').slice(1).join(']').trim();
        }
    }

    showToast(`Memuat data PDF RAB Kelompok [${targetPrefix}]...`, 'success');

    // 1. GUNAKAN DATA DARI MEMORY / ARRAY YANG SUDAH TER-LOAD
    const loadedList = window.dataRAB || window.savedRabList || savedRabList || window.dataRABState || window.rpjmDataGlobal || [];
    
    let matchedRows = loadedList.filter(item => {
        const kode = String(item.kode_unik_full || item.kode_unik || item.kode_kegiatan || '').trim();
        const prefixClean = targetPrefix.replace(/\.+$/, '');
        return kode.startsWith(targetPrefix) || kode.startsWith(prefixClean) || targetPrefix.startsWith(kode);
    });

    // SINKRONISASI AKTIF: Jika pengguna sedang mengedit/melihat kegiatan di modul RAB,
    // gunakan array rabItems terkini dari memori agar urutan manual dan item baru langsung tercetak identik.
    if (selectedRpjm && Array.isArray(rabItems) && rabItems.length > 0) {
        const curKode = String(selectedRpjm.kode_unik_full || selectedRpjm.kode_unik || '').trim();
        const prefixClean = targetPrefix.replace(/\.+$/, '');
        if (curKode.startsWith(targetPrefix) || curKode.startsWith(prefixClean) || targetPrefix.startsWith(curKode)) {
            const existingIdx = matchedRows.findIndex(r => {
                const rKode = String(r.kode_unik_full || r.kode_unik || '').trim();
                return rKode === curKode || rKode.replace(/\.+$/, '') === curKode.replace(/\.+$/, '');
            });
            const activeRow = {
                ...selectedRpjm,
                items: [...rabItems],
                nama_kegiatan: selectedRpjm.nama_kegiatan || selectedRpjm.jenis_kegiatan || groupTitle,
                rpjm_data: selectedRpjm.rpjm_data || selectedRpjm
            };
            if (existingIdx >= 0) {
                matchedRows[existingIdx] = activeRow;
            } else {
                matchedRows.push(activeRow);
            }
        }
    }

    console.log("LOCAL MEMORY MATCHED ROWS:", matchedRows.length, matchedRows);

    // 2. FALLBACK QUERY DUA/TIGA KOLOM JIKA ARRAY LOCAL KOSONG ATAU BELUM MEMILIKI ITEMS
    const hasItems = matchedRows.some(r => r.items && (Array.isArray(r.items) ? r.items.length > 0 : true));
    if ((matchedRows.length === 0 || !hasItems) && (window.supabaseClient || window.supabase)) {
        const client = window.supabaseClient || window.supabase;
        try {
            const prefixClean = targetPrefix.replace(/\.+$/, '');
            let query = client
                .from('rab')
                .select('id, kode_unik, kode_unik_full, tahun, nama_kegiatan, uraian, jenis_kegiatan, bidang, group_nama, lokasi, lokasi_kegiatan, volume, satuan, harga_satuan, jumlah_anggaran, sumber_dana, items')
                .or(`kode_unik.ilike.${targetPrefix}%,kode_unik_full.ilike.${targetPrefix}%,kode_unik.ilike.${prefixClean}%,kode_unik_full.ilike.${prefixClean}%`)
                .limit(300);

            if (!isNaN(tahunNum)) {
                query = query.eq('tahun', tahunNum);
            }
            if (typeof rabTipe === 'string' && rabTipe) {
                query = query.eq('tipe_anggaran', rabTipe);
            }

            let { data, error } = await query;
            
            if ((!data || data.length === 0) && !error) {
                // Try without year restriction
                let queryNoYear = client
                    .from('rab')
                    .select('id, kode_unik, kode_unik_full, tahun, nama_kegiatan, uraian, jenis_kegiatan, bidang, group_nama, lokasi, lokasi_kegiatan, volume, satuan, harga_satuan, jumlah_anggaran, sumber_dana, items')
                    .or(`kode_unik.ilike.${targetPrefix}%,kode_unik_full.ilike.${targetPrefix}%,kode_unik.ilike.${prefixClean}%,kode_unik_full.ilike.${prefixClean}%`)
                    .limit(300);
                if (typeof rabTipe === 'string' && rabTipe) {
                    queryNoYear = queryNoYear.eq('tipe_anggaran', rabTipe);
                }
                const resNoYear = await queryNoYear;
                if (resNoYear.data && resNoYear.data.length > 0) data = resNoYear.data;
            }

            if (data && data.length > 0) {
                matchedRows = data;
            } else if (matchedRows.length === 0) {
                // Fallback to rkpdes table
                let rkpRes = await client
                    .from('rkpdes')
                    .select('id, kode_unik_full, kode_kegiatan, tahun, jenis_kegiatan, bidang, lokasi, volume, satuan, prakiraan_biaya, sumber_pembiayaan, pola_pelaksanaan, waktu_pelaksanaan, stunting, updated_at')
                    .or(`kode_unik_full.ilike.${targetPrefix}%,kode_kegiatan.ilike.${targetPrefix}%,kode_unik_full.ilike.${prefixClean}%,kode_kegiatan.ilike.${prefixClean}%`)
                    .limit(300);
                if (rkpRes.data && rkpRes.data.length > 0) {
                    matchedRows = rkpRes.data;
                }
            }
            console.log("SUPABASE MULTI-COLUMN MATCHED ROWS:", matchedRows.length, matchedRows);
        } catch (e) {
            console.warn("Fallback multi-column query error:", e);
        }
    }

    // 2B. JIKA MASIH BELUM MEMILIKI ITEMS (DITARIK DARI SUMMARY LIST), FETCH DETAIL PER ITEM
    if (!matchedRows.some(r => r.items && (Array.isArray(r.items) ? r.items.length > 0 : true)) && matchedRows.length > 0) {
        try {
            const activePrintTipe = (typeof rabTipe === 'string' && rabTipe) ? rabTipe : 'MURNI';
            const enriched = await Promise.all(matchedRows.map(async (row) => {
                if (row.items && Array.isArray(row.items) && row.items.length > 0) return row;
                try {
                    const targetK = row.kode_unik_full || row.kode_unik;
                    if (targetK) {
                        const res = await fetch(`/api/rab?kode_unik_full=${encodeURIComponent(targetK)}&tahun=${tahunNum}&tipe=${encodeURIComponent(activePrintTipe)}`);
                        const json = await res.json();
                        if (json.success && json.data && json.data.items) {
                            return { ...row, items: json.data.items, rpjm_data: json.data.rpjm_data || row.rpjm_data };
                        }
                    }
                } catch (e) {}
                return row;
            }));
            matchedRows = enriched;
        } catch (e) {}
    }

    // 3. CETAK TABEL PDF METODE UNPACK RINCIAN ITEMS
    let itemsToPrint = [];

    if (matchedRows && matchedRows.length > 0) {
        matchedRows.sort((a, b) => compareKodeUnikFull(getKode(a), getKode(b)));
        matchedRows.forEach(row => {
            let parsedItems = typeof row.items === 'string' ? JSON.parse(row.items || '[]') : (row.items || []);
            
            if (Array.isArray(parsedItems) && parsedItems.length > 0) {
                // SINKRONISASI URUTAN MUTLAK:
                // Urutkan parsedItems mengikuti fungsi pengurutan standar dan urutan manual persis seperti kartu web
                parsedItems = sortRabItems(parsedItems);
                reindexRabItemsBySubgroup(parsedItems);

                parsedItems.forEach(it => {
                    const vol = Number(it.volume) || 12;
                    const hrg = Number(it.harga || it.harga_satuan || 0);
                    const jml = Number(it.jumlah || it.jumlah_biaya || (vol * hrg));
                    itemsToPrint.push({
                        uraian: it.uraian || it.jenis_kegiatan || row.jenis_kegiatan || '-',
                        volume: it.volume || row.volume || 12,
                        satuan: it.satuan || row.satuan || 'OB (Orang/Bulan)',
                        harga: hrg,
                        jumlah: jml,
                        sumber: it.sumber || row.sumber_dana || row.sumber_biaya || row.sumber_dana_rab || 'ADD',
                        group: (it.group || it.group_belanja || row.group || row.group_belanja || row.group_nama || '').trim(),
                        subgroup: (it.subgroup || it.group_kegiatan || row.subgroup || row.group_kegiatan || row.jenis_kegiatan || '').trim(),
                        nama_kegiatan: (it.nama_kegiatan || it.group || row.jenis_kegiatan || row.nama_kegiatan || '').trim(),
                        rpjm_data: it.rpjm_data || row.rpjm_data || null,
                        urutan_manual: it.urutan_manual,
                        urutan: it.urutan,
                        no: it.no,
                        urutan_subgroup: it.urutan_subgroup,
                        no_subgroup: it.no_subgroup,
                        keterangan: it.keterangan || '',
                        item_baru: it.item_baru
                    });
                });
            } else {
                const vol = Number(row.volume || row.volume_rab) || 12;
                const total = Number(row.jumlah_anggaran || row.pagu_rab || row.total_biaya || row.jumlah_biaya) || 0;
                const hrg = Number(row.harga_satuan || row.harga_satuan_rab || (vol > 0 ? total / vol : total)) || 0;
                itemsToPrint.push({
                    uraian: row.uraian || row.jenis_kegiatan || row.nama_kegiatan || '-',
                    volume: vol,
                    satuan: row.satuan || row.satuan_rab || 'OB (Orang/Bulan)',
                    harga: hrg,
                    jumlah: total,
                    sumber: row.sumber_dana || row.sumber_biaya || row.sumber_dana_rab || 'ADD',
                    group: (row.group || row.group_belanja || row.group_nama || '').trim(),
                    subgroup: (row.subgroup || row.group_kegiatan || row.jenis_kegiatan || '').trim(),
                    nama_kegiatan: (row.nama_kegiatan || row.jenis_kegiatan || '').trim(),
                    rpjm_data: row.rpjm_data || null
                });
            }
        });
    }

    if (itemsToPrint.length === 0) {
        showToast(`Data RAB tidak ditemukan untuk kelompok ${targetPrefix}!`, 'error');
        return;
    }

    console.log("FINAL ITEMS TO PRINT FOR PDF:", itemsToPrint);

    executePrintRAB(itemsToPrint, targetPrefix, groupTitle, tahunNum);
}

window.onChangeKelompokCetak = onChangeKelompokCetak;

async function cetakPdfRABKelompok() {
    return await cetakPdfByGroup();
}

window.cetakPdfByGroup = cetakPdfByGroup;
window.cetakPdfRABKelompok = cetakPdfRABKelompok;
window.printRAB = cetakPdfByGroup;
window.cetakPdfRAB = cetakPdfByGroup;
window.exportPdf = cetakPdfByGroup;
window.populateGroupCetakDropdown = populateGroupCetakDropdown;

function formatSumberDanaPdf(sumber) {
    if (!sumber) return '';
    
    let text = sumber.toString().trim();

    // Mapping Penyingkatan
    if (text.includes('APBD Tk. I') || text.includes('Provinsi')) {
        return 'APBD PROVINSI';
    }
    if (text.includes('APBD Tk. II') || text.includes('Kabupaten')) {
        return 'APBD KABUPATEN';
    }
    if (text.includes('ADD') || text.includes('Alokasi Dana Desa')) {
        return 'ADD';
    }
    if (text.includes('DDS') || text.includes('Dana Desa')) {
        return 'DDS';
    }
    if (text.includes('PBH') || text.includes('Bagi Hasil')) {
        return 'PBH';
    }
    if (text.includes('PAD') || text.includes('Pendapatan Asli Desa')) {
        return 'PAD';
    }

    return text;
}

window.formatSumberDanaPdf = formatSumberDanaPdf;

// Ambil nama Pelaksana Kegiatan Anggaran dari dropdown/input cetak
function getSelectedPelaksanaKegiatan() {
    const sel = document.getElementById('selectPenandatangan') || document.getElementById('selectPelaksanaKegiatan');
    const inputManual = document.getElementById('inputNamaManual') || document.getElementById('inputNamaPelaksanaManual');
    let nama = 'Hardiana';
    if (sel) {
        if (sel.value === 'manual') {
            nama = inputManual ? inputManual.value.trim() : 'Hardiana';
        } else {
            nama = sel.value;
        }
    }
    return (nama && nama.trim()) ? nama.trim() : 'Hardiana';
}

// Format manual tanggal cetak (mendukung input teks / backdate tanpa mengambil tanggal otomatis sistem)
function getFormattedTanggalDokumen() {
    const raw = document.getElementById('inputTanggalCetak')?.value || '';
    if (!raw || !raw.trim()) {
        return 'Batetangnga, ..............................';
    }
    let str = raw.trim();
    // Bersihkan prefix Batetangnga jika pengguna mengetiknya secara manual
    str = str.replace(/^batetangnga\s*,\s*/i, '').trim();

    // Jika format ISO YYYY-MM-DD (dari datepicker/input)
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const parts = str.split('-');
        const y = parts[0];
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const bulanID = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        if (m >= 0 && m < 12) {
            return `Batetangnga, ${d} ${bulanID[m]} ${y}`;
        }
    }

    return `Batetangnga, ${str}`;
}

window.getSelectedPelaksanaKegiatan = getSelectedPelaksanaKegiatan;
window.getFormattedTanggalDokumen = getFormattedTanggalDokumen;

function executePrintRAB(itemsToPrint, prefixKode, selectedJenisKegiatan, tahunFilter) {
    if (!itemsToPrint || itemsToPrint.length === 0) {
        showToast('Tambahkan minimal satu item RAB sebelum cetak', 'error');
        return;
    }

    const getNamaKegiatan = (it) => {
        let rpjmObj = it.rpjm_data;
        if (typeof rpjmObj === 'string') {
            try { rpjmObj = JSON.parse(rpjmObj); } catch(e) {}
        }
        if (rpjmObj && typeof rpjmObj === 'object') {
            return rpjmObj.nama_kegiatan || rpjmObj.jenis_kegiatan || it.nama_kegiatan || '';
        }
        return it.nama_kegiatan || it.jenis_kegiatan || it.group || '';
    };

    const getSumberDana = (it) => {
        if (!it) return '';
        let rpjmObj = it.rpjm_data;
        if (typeof rpjmObj === 'string') {
            try { rpjmObj = JSON.parse(rpjmObj); } catch(e) {}
        }
        if (rpjmObj && typeof rpjmObj === 'object' && rpjmObj.sumber_dana) {
            return rpjmObj.sumber_dana;
        }
        return it.sumber || it.sumber_biaya || it.sumber_dana || it.sumber_dana_rab || '';
    };

    const namaPelaksana = getSelectedPelaksanaKegiatan();
    const teksLokasiTanggal = getFormattedTanggalDokumen();

    const kegiatanTitle = selectedJenisKegiatan || (
        prefixKode.includes('01.01.01') ? 'Penyediaan Penghasilan Tetap dan Tunjangan Kepala Desa' :
        prefixKode.includes('01.01.02') ? 'Penyediaan Penghasilan Tetap dan Tunjangan Perangkat Desa' :
        prefixKode.includes('01.01.03') ? 'Penyediaan Jaminan Sosial bagi Kepala Desa dan Perangkat Desa' :
        prefixKode.includes('01.01.04') ? 'Penyediaan Operasional Pemerintah Desa (ATK, Honor PKPKD dan PPKD dll)' :
        prefixKode.includes('01.01.05') ? 'Penyediaan Tunjangan BPD' :
        prefixKode.includes('01.01.06') ? 'Penyediaan Operasional BPD' :
        'Rencana Anggaran Biaya Desa'
    );

function getGroupKey(row, item) {
    // 1. Ambil dari item.group (Prioritas Utama)
    if (item && item.group && item.group.toString().trim() !== '' && item.group !== 'null') {
        return item.group.toString().trim();
    }
    
    // 2. Ambil dari row.items[0].group
    let itemsArr = row ? row.items : null;
    if (typeof itemsArr === 'string') {
        try { itemsArr = JSON.parse(itemsArr); } catch(e) {}
    }
    if (itemsArr && Array.isArray(itemsArr) && itemsArr[0] && itemsArr[0].group && itemsArr[0].group.toString().trim() !== '' && itemsArr[0].group !== 'null') {
        return itemsArr[0].group.toString().trim();
    }

    // 3. Ambil dari row.group_nama / row.group
    if (row && (row.group_nama || row.group)) {
        const gName = (row.group_nama || row.group).toString().trim();
        if (gName !== '' && gName !== 'null') return gName;
    }

    // 4. Fallback ke HANYA NAMA TEKS KEGIATAN (JANGAN PERNAH MENGAMBIL KODE UNIK SEPERTI 01.01.01.)
    if (row && row.rpjm_data && typeof row.rpjm_data === 'object') {
        if (row.rpjm_data.group_nama && !/^\d[\d.]*$/.test(row.rpjm_data.group_nama.trim())) {
            return row.rpjm_data.group_nama.trim();
        }
        if (row.rpjm_data.jenis_kegiatan && !/^\d[\d.]*$/.test(row.rpjm_data.jenis_kegiatan.trim())) {
            return row.rpjm_data.jenis_kegiatan.trim();
        }
        if (row.rpjm_data.nama_kegiatan && !/^\d[\d.]*$/.test(row.rpjm_data.nama_kegiatan.trim())) {
            return row.rpjm_data.nama_kegiatan.trim();
        }
    }

    // 5. Default Nama Group Resmi jika data kosong (berdasarkan prefix kode kegiatan)
    const kodeStr = String((row && (row.kode_unik_full || row.kode_unik)) || (item && (item.kode_unik_full || item.kode_unik)) || '').trim();
    if (kodeStr.startsWith('01.01.05')) return 'Tunjangan BPD';
    if (kodeStr.startsWith('01.01.06')) return 'Operasional BPD';
    if (kodeStr.startsWith('01.01.04')) return 'Belanja Barang Perlengkapan';
    if (kodeStr.startsWith('01.01.03')) return 'Jaminan Sosial Kepala Desa dan Perangkat Desa';
    if (kodeStr.startsWith('01.01.02')) return 'Penghasilan Tetap dan Tunjangan Perangkat Desa';
    return 'Penghasilan Tetap dan Tunjangan Kepala Desa';
}

    // 2. Generator Row Tabel RAB (3-Level Nested Grouping: Group -> Nama Kegiatan -> Subgroup -> Items)
    let tbodyRows = '';
    let totalBiayaSeluruhnya = 0;

    const groupedData = {};

    itemsToPrint.forEach(row => {
        let itemsArr = row.items;
        if (typeof itemsArr === 'string') {
            try { itemsArr = JSON.parse(itemsArr); } catch(e) {}
        }
        const item = (itemsArr && Array.isArray(itemsArr) && itemsArr[0]) ? itemsArr[0] : row;
        
        const groupKey    = getGroupKey(row, item);
        const namaKegKey  = (row.rpjm_data && row.rpjm_data.nama_kegiatan) || row.nama_kegiatan || groupKey || 'Kegiatan RAB';
        const subGroupKey = item.subgroup || (itemsArr && itemsArr[0] && itemsArr[0].subgroup) || row.subgroup || 'Subgroup Utama';

        if (!groupedData[groupKey]) groupedData[groupKey] = {};
        if (!groupedData[groupKey][namaKegKey]) groupedData[groupKey][namaKegKey] = {};
        if (!groupedData[groupKey][namaKegKey][subGroupKey]) groupedData[groupKey][namaKegKey][subGroupKey] = { items: [], subtotal: 0, sumberDana: '' };

        groupedData[groupKey][namaKegKey][subGroupKey].items.push(row);
        const itemTotal = Number(row.jumlah || (row.volume * row.harga) || 0);
        groupedData[groupKey][namaKegKey][subGroupKey].subtotal += itemTotal;
        if (!groupedData[groupKey][namaKegKey][subGroupKey].sumberDana) {
            groupedData[groupKey][namaKegKey][subGroupKey].sumberDana = row.sumber || row.sumber_dana || (row.rpjm_data && row.rpjm_data.sumber_dana) || '';
        }
        totalBiayaSeluruhnya += itemTotal;
    });

    // RENDERING LOOP (URUT: 1. Group -> 2. Nama Kegiatan -> 3. Subgroup -> 4. Items)
    const sortedGroupKeys = Object.keys(groupedData).sort((a, b) => {
        const codeA = getRabGroupCode(a);
        const codeB = getRabGroupCode(b);
        const aHasGroup = codeA !== '';
        const bHasGroup = codeB !== '';
        if (aHasGroup !== bHasGroup) return aHasGroup ? -1 : 1;
        const cmp = compareKodeRAB(codeA, codeB);
        if (cmp !== 0) return cmp;
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    sortedGroupKeys.forEach(gKey => {
        // 1. TAMPILKAN GROUP (Level 1 - Atas) -> bg-slate-200 font-bold
        tbodyRows += `
            <tr style="font-weight: bold; background-color: #e2e8f0;">
                <td colspan="6" style="border: 1px solid #000; padding: 6px 8px; font-weight: bold; font-size: 12px; text-transform: uppercase;">${gKey}</td>
            </tr>
        `;

        Object.keys(groupedData[gKey]).forEach(namaKeg => {
            let repSumber = '';
            const subKeys = Object.keys(groupedData[gKey][namaKeg]).sort((a, b) => {
                const codeA = getRabSubgroupCode(a, gKey);
                const codeB = getRabSubgroupCode(b, gKey);
                const aHasSub = codeA !== '';
                const bHasSub = codeB !== '';
                if (aHasSub !== bHasSub) return aHasSub ? -1 : 1;
                const cmp = compareKodeRAB(codeA, codeB);
                if (cmp !== 0) return cmp;
                return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
            });
            if (subKeys.length > 0) {
                repSumber = groupedData[gKey][namaKeg][subKeys[0]].sumberDana;
            }
            const sumberSingkat = formatSumberDanaPdf(repSumber);

            // 2. TAMPILKAN NAMA_KEGIATAN (Level 2 - Tengah) -> Tebal & Miring
            tbodyRows += `
                <tr style="background-color: #f8fafc;">
                    <td colspan="5" style="border: 1px solid #000; padding: 6px 8px; font-weight: bold; font-style: italic; font-size: 12px;">${namaKeg}</td>
                    <td style="border: 1px solid #000;"></td>
                </tr>
            `;

            subKeys.forEach(sgKey => {
                const groupSubData = groupedData[gKey][namaKeg][sgKey];

                // 3. TAMPILKAN SUBGROUP (Level 3 - Bawah) -> Tebal, Normal Case (Bukan Uppercase) + Subtotal di Kolom f
                tbodyRows += `
                    <tr style="font-weight: bold; background-color: #f1f5f9;">
                        <td colspan="5" style="border: 1px solid #000; padding: 6px 8px; font-weight: bold; font-size: 12px;">${sgKey}</td>
                        <td style="border: 1px solid #000; text-align: right; font-weight: bold; font-size: 12px; padding: 6px 8px;">
                            Rp ${formatRupiah(groupSubData.subtotal)}
                        </td>
                    </tr>
                `;

                // URUTKAN ITEM SECARA MUTLAK MENGIKUTI POSISI WEB CARD (urutan_manual / urutan_subgroup)
                // TANPA localeCompare pada uraian agar susunan tidak teracak!
                groupSubData.items.sort((a, b) => {
                    const uA = Number(a.urutan_manual !== undefined && a.urutan_manual !== null && a.urutan_manual !== '' ? a.urutan_manual : (a.urutan_subgroup || a.no_subgroup || a.urutan || a.no || 999999));
                    const uB = Number(b.urutan_manual !== undefined && b.urutan_manual !== null && b.urutan_manual !== '' ? b.urutan_manual : (b.urutan_subgroup || b.no_subgroup || b.urutan || b.no || 999999));
                    if (uA !== uB) return uA - uB;
                    return 0;
                });

                // RESET ABJAD KE 'a.' HANYA DI SINI (PER SUBGROUP)
                const getSubCharLabel = (i) => {
                    let n = i, s = '';
                    do { s = String.fromCharCode(97 + (n % 26 === 0 ? 25 : (n % 26) - 1)) + s; n = Math.floor((n - 1) / 26); } while (n > 0);
                    return s + '.';
                };

                let itemCounter = 0;
                groupSubData.items.forEach(it => {
                    itemCounter++;
                    const charLabel = getSubCharLabel(itemCounter);
                    const itemTotal = Number(it.jumlah || (it.volume * it.harga) || 0);
                    const hrg = Number(it.harga || it.harga_satuan) || 0;

                    tbodyRows += `
                        <tr>
                            <td style="border: 1px solid #000; padding: 6px 8px; padding-left: 20px;">${charLabel} ${it.uraian}${it.keterangan ? ` (${it.keterangan})` : ''}</td>
                            <td style="border: 1px solid #000; text-align: center; padding: 6px 8px;">${it.volume || '-'}</td>
                            <td style="border: 1px solid #000; text-align: center; padding: 6px 8px;">${it.satuan || '-'}</td>
                            <td style="border: 1px solid #000; text-align: right; padding: 6px 8px;">Rp ${formatRupiah(hrg)}</td>
                            <td style="border: 1px solid #000; text-align: right; padding: 6px 8px;">Rp ${formatRupiah(itemTotal)}</td>
                            <td style="border: 1px solid #000; text-align: right; padding: 6px 8px;"></td>
                        </tr>
                    `;
                });
            });
        });
    });

    const html = `
        <html>
        <head>
            <title>RAB ${prefixKode}</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #000; background: #fff; line-height: 1.4; }
                h1, h2, h3 { margin: 0; text-align: center; font-weight: bold; }
                .header { margin-bottom: 20px; text-align: center; }
                .header h1 { font-size: 16px; margin-bottom: 4px; text-transform: uppercase; }
                .header h2 { font-size: 14px; margin-bottom: 4px; text-transform: uppercase; }
                .header h3 { font-size: 12px; margin-bottom: 4px; text-transform: uppercase; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th, td { border: 1px solid #000; padding: 6px 8px; font-size: 12px; }
                th { background: #f8fafc; font-weight: bold; text-align: center; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                @media print { 
                    .no-print { display: none !important; }
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1 style="font-size: 16px; font-weight: 800; text-transform: uppercase;">RENCANA ANGGARAN BIAYA (RAB)</h1>
                <h2 style="font-size: 14px; font-weight: 700; text-transform: uppercase;">PEMERINTAH DESA BATETANGNGA</h2>
                <h3 style="font-size: 12px; font-weight: 600; text-transform: uppercase;">KECAMATAN BINUANG KABUPATEN POLEWALI MANDAR</h3>
                <h3 style="font-size: 12px; font-weight: 600; text-transform: uppercase;">TAHUN ANGGARAN ${tahunFilter}</h3>
            </div>
            
            <div class="meta" style="margin-top: 12px; display: flex; justify-content: space-between; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 12px 0; font-size: 12px; line-height: 1.6;">
                <div style="width: 48%; display: flex; flex-direction: column;">
                    <div style="display: flex;"><span style="width: 90px; flex-shrink: 0;">Desa</span><span style="margin-right: 8px;">:</span><strong>BATETANGNGA</strong></div>
                    <div style="display: flex;"><span style="width: 90px; flex-shrink: 0;">Kecamatan</span><span style="margin-right: 8px;">:</span><strong>BINUANG</strong></div>
                    <div style="display: flex;"><span style="width: 90px; flex-shrink: 0;">Kabupaten</span><span style="margin-right: 8px;">:</span><strong>POLEWALI MANDAR</strong></div>
                    <div style="display: flex;"><span style="width: 90px; flex-shrink: 0;">Provinsi</span><span style="margin-right: 8px;">:</span><strong>SULAWESI BARAT</strong></div>
                </div>
                <div style="width: 48%; display: flex; flex-direction: column;">
                    <div style="display: flex;"><span style="width: 90px; flex-shrink: 0;">No. RAB</span><span style="margin-right: 8px;">:</span><strong>${prefixKode}</strong></div>
                    <div style="display: flex;"><span style="width: 90px; flex-shrink: 0;">Bidang</span><span style="margin-right: 8px;">:</span><strong>1. BIDANG PENYELENGGARAAN PEMERINTAHAN DESA</strong></div>
                    <div style="display: flex;"><span style="width: 90px; flex-shrink: 0;">Kegiatan</span><span style="margin-right: 8px;">:</span><strong>${kegiatanTitle}</strong></div>
                </div>
            </div>
            
            <table class="print-table">
                <thead>
                  <tr>
                    <th style="border: 1px solid #000; text-align: center; font-weight: bold;">URAIAN</th>
                    <th style="border: 1px solid #000; text-align: center; font-weight: bold; width: 80px;">Volume</th>
                    <th style="border: 1px solid #000; text-align: center; font-weight: bold; width: 80px;">Satuan</th>
                    <th style="border: 1px solid #000; text-align: center; font-weight: bold; width: 120px;">Harga Satuan<br>(Rp)</th>
                    <th style="border: 1px solid #000; text-align: center; font-weight: bold; width: 130px;">Jumlah Total<br>(Rp)</th>
                    <th style="border: 1px solid #000; text-align: center; font-weight: bold; width: 140px;">Jumlah</th>
                  </tr>
                  <tr style="font-size: 11px; font-style: italic; background-color: #f8fafc;">
                    <td style="border: 1px solid #000; text-align: center;">a</td>
                    <td style="border: 1px solid #000; text-align: center;">b</td>
                    <td style="border: 1px solid #000; text-align: center;">c</td>
                    <td style="border: 1px solid #000; text-align: center;">d</td>
                    <td style="border: 1px solid #000; text-align: center;">e = b x d</td>
                    <td style="border: 1px solid #000; text-align: center;">f</td>
                  </tr>
                </thead>
                <tbody>
                    ${tbodyRows}
                </tbody>
                <tfoot>
                    <tr style="font-weight: bold; background-color: #f1f5f9;">
                        <td colspan="5" style="border: 1px solid #000; text-align: right; font-weight: bold; font-size: 12px; padding: 8px;">JUMLAH TOTAL BIAYA (Rp)</td>
                        <td style="border: 1px solid #000; text-align: right; font-weight: bold; font-size: 12px; padding: 8px;">Rp ${formatRupiah(totalBiayaSeluruhnya)}</td>
                    </tr>
                </tfoot>
            </table>
            
            <div class="signature-section" style="margin-top: 44px; display: flex; justify-content: space-between; page-break-inside: avoid; font-size: 12px; line-height: 1.5; text-align: center;">
                <div style="width: 30%;">
                    <p style="margin: 0;">Menyetujui,</p>
                    <p style="margin: 0 0 68px 0; font-weight: bold;">Kepala Desa Batetangnga</p>
                    <p style="margin: 0; text-decoration: underline; font-weight: bold;">SUMAILA DAMANG</p>
                </div>
                <div style="width: 30%;">
                    <p style="margin: 0;">Telah Diverifikasi</p>
                    <p style="margin: 0 0 68px 0; font-weight: bold;">Sekretaris Desa</p>
                    <p style="margin: 0; text-decoration: underline; font-weight: bold;">ABDUL AZIS, S.Pd</p>
                </div>
                <div style="width: 30%;">
                    <p style="margin: 0;">${teksLokasiTanggal}</p>
                    <p style="margin: 0 0 68px 0; font-weight: bold;">Pelaksana Kegiatan Anggaran</p>
                    <p style="margin: 0; text-decoration: underline; font-weight: bold;">${namaPelaksana}</p>
                </div>
            </div>
            
            <div class="footer no-print" style="margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 10px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b;">
                <div>Dicetak dari sistem SIA Batetangnga</div>
                <div></div>
            </div>
        </body>
        </html>
    `;
    const printWindow = window.open('', '_blank');
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
}

// ============================================================
// RAB PERUBAHAN — KONTROL VERSI, KUNCI MURNI, SNAPSHOT & CETAK
// ============================================================

// Cek status versi (MURNI / PERUBAHAN) kegiatan terpilih. Ringan: server memakai
// head-count sehingga tidak ada baris data yang ditarik.
async function refreshLockStatus() {
    const kode = String(
        selectedRpjm?.kode_unik_full ||
        document.getElementById('select-kode-unik')?.value || ''
    ).trim();

    if (!kode) {
        rabMurniLocked = false;
        applyReadOnlyMode();
        return;
    }

    try {
        const res = await fetch(`${API_URL}/rab/versi-status?tahun=${encodeURIComponent(rabYear)}&kode_unik_full=${encodeURIComponent(kode)}`);
        if (!res.ok) {
            console.warn(`Gagal memeriksa status versi RAB (HTTP ${res.status})`);
            return;
        }
        let json = null;
        try { json = await res.json(); } catch (_) {}
        if (json && json.success) {
            // RAB Murni tidak dikunci otomatis: pengguna tetap dapat menyesuaikan/mengedit data RAB Awal
            rabMurniLocked = false;
        }
    } catch (e) {
        console.warn('Gagal memeriksa status versi RAB:', e);
    }
    applyReadOnlyMode();
}

// Terapkan mode form rincian (RAB Awal / Murni selalu terbuka untuk disesuaikan/diedit)
function applyReadOnlyMode() {
    const fieldIds = [
        'select-group', 'select-subgroup', 'input-uraian', 'input-volume',
        'input-satuan', 'input-harga', 'select-sumber-dana', 'input-keterangan',
        'btn-add-item', 'btn-copy-item'
    ];
    fieldIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = !!rabMurniLocked;
    });

    const banner = document.getElementById('rab-lock-banner');
    if (banner) banner.classList.toggle('hidden', !rabMurniLocked);

    const badge = document.getElementById('rab-tipe-badge');
    if (badge) {
        if (rabMurniLocked) {
            badge.textContent = 'RAB MURNI — DIKUNCI';
            badge.className = 'px-3 py-1.5 rounded-full text-[11px] font-extrabold bg-rose-500 text-white';
        } else if (isModePerubahan()) {
            badge.textContent = 'MODE: RAB PERUBAHAN';
            badge.className = 'px-3 py-1.5 rounded-full text-[11px] font-extrabold bg-amber-500 text-white';
        } else {
            badge.textContent = 'MODE: RAB MURNI (Aktif / Dapat Diedit)';
            badge.className = 'px-3 py-1.5 rounded-full text-[11px] font-extrabold bg-emerald-500 text-white';
        }
    }
}

// Ganti versi anggaran (MURNI <-> PERUBAHAN) untuk tahun anggaran aktif.
async function onTipeAnggaranChange(nilai) {
    const targetTipe = String(nilai || RAB_TIPE_MURNI).toUpperCase() === RAB_TIPE_PERUBAHAN
        ? RAB_TIPE_PERUBAHAN
        : RAB_TIPE_MURNI;
    if (targetTipe !== rabTipe) {
        if (!confirmUnsavedChanges('mengganti versi anggaran (Murni ⇄ Perubahan)')) {
            const sel = document.getElementById('select-tipe-anggaran');
            if (sel) sel.value = rabTipe;
            return;
        }
    }
    isFormDirty = false;
    rabTipe = targetTipe;
    try {
        localStorage.setItem('rab_tipe_anggaran', rabTipe);
        localStorage.setItem('sia_tipe_anggaran', rabTipe);
    } catch (_) {}
    currentRabId = null;
    currentRabRefMurni = null;
    rabItems = [];
    rabMurniRefItems = [];
    rabMurniRefTotal = 0;
    updateFormRefSemula(null);
    renderRabItems();
    applyReadOnlyMode();
    await loadRabActivities();
    await loadSavedRabList();
    if (selectedRpjm) {
        await loadSavedRAB();
    }
    await refreshLockStatus();
}

// Salin (snapshot) seluruh RAB MURNI tahun aktif menjadi RAB PERUBAHAN.
async function salinKeRABPerubahan() {
    if (!confirm(`Salin RAB MURNI tahun ${rabYear} ke RAB PERUBAHAN?\n\nSeluruh item belanja akan diduplikasi sebagai titik awal perubahan. Nilai RAB MURNI tetap utuh dan akan dikunci.`)) {
        return;
    }

    const btn = document.getElementById('btn-clone-perubahan');
    if (btn) { btn.disabled = true; }
    try {
        const res = await fetch(`${API_URL}/rab/clone-to-perubahan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tahun: Number(rabYear) })
        });
        let json = null;
        try { json = await res.json(); } catch (_) {}
        if (res.ok && json && json.success) {
            showToast(json.message || `Berhasil menyalin ${json.created} kegiatan.`, 'success');
            const sel = document.getElementById('select-tipe-anggaran');
            if (sel) sel.value = RAB_TIPE_PERUBAHAN;
            await onTipeAnggaranChange(RAB_TIPE_PERUBAHAN);
        } else {
            const msg = (json && (json.error || json.message)) || `Gagal menyalin RAB (HTTP ${res.status})`;
            showToast(msg, 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Gagal menyalin RAB ke versi PERUBAHAN.', 'error');
    } finally {
        if (btn) { btn.disabled = false; }
    }
}

// ============================================================
// CETAK PDF — TEMPLATE BAKU KEMENKEU (SEMULA / MENJADI / SELISIH)
// Struktur header 2 tingkat + 3 kolom tanda tangan.
// ============================================================
async function cetakRabPerubahan() {
    const selectGroupElem = document.getElementById('selectGroupKegiatanCetak');
    let prefix = String(selectGroupElem?.value || '01.01.01.').trim();
    if (prefix && !prefix.endsWith('.')) prefix += '.';

    const tahunInput = document.getElementById('select-year')?.value || rabYear || '2027';
    const tahunNum = parseInt(tahunInput, 10) || rabYear;

    let groupTitle = 'RAB Perubahan';
    if (selectGroupElem && selectGroupElem.selectedIndex >= 0) {
        const optText = selectGroupElem.options[selectGroupElem.selectedIndex].text || '';
        groupTitle = optText.includes(']') ? optText.split(']').slice(1).join(']').trim() : (optText || groupTitle);
    }

    showToast(`Memuat perbandingan RAB Perubahan [${prefix}]...`, 'success');

    let comparisons = [];
    let grandTotal = { semula: 0, menjadi: 0, selisih: 0 };
    try {
        const res = await fetch(`${API_URL}/rab/perbandingan?tahun=${encodeURIComponent(tahunNum)}&prefix=${encodeURIComponent(prefix)}`);
        let json = null;
        try { json = await res.json(); } catch (_) {}
        if (res.ok && json && json.success && Array.isArray(json.data)) {
            // ZERO-SORT FRONTEND: Jangan lakukan .sort() di frontend.
            // Gunakan urutan data apa adanya (sequential order) persis dari backend /api/rab/perbandingan.
            comparisons = json.data;
            grandTotal = json.total || grandTotal;
        } else {
            const msg = (json && json.error) || `Gagal memuat perbandingan RAB (HTTP ${res.status})`;
            showToast(msg, 'error');
            return;
        }
    } catch (e) {
        console.error(e);
        showToast('Gagal memuat perbandingan RAB Perubahan.', 'error');
        return;
    }

    if (!comparisons.length) {
        showToast(`Data RAB tidak ditemukan untuk kelompok ${prefix}`, 'error');
        return;
    }

    if (comparisons.some(c => c.belum_ada_perubahan)) {
        const lanjut = confirm('Sebagian kegiatan pada kelompok ini belum memiliki versi RAB PERUBAHAN.\nNilai MENJADI akan tampil sama dengan SEMULA (selisih 0).\n\nLanjutkan cetak?');
        if (!lanjut) return;
    }

    // --- Metadata & tanggal ---
    const namaPelaksana = getSelectedPelaksanaKegiatan();
    const teksLokasiTanggal = getFormattedTanggalDokumen();
    const namaSekdes = 'ABDUL AZIS, S.Pd';
    const namaKades = 'SUMAILA DAMANG';

    // --- Nomor urut baris item (a., b., c., ... per kegiatan) ---
    const charLabel = (i) => {
        // 1 -> a., 2 -> b., ... 27 -> aa.
        let n = i, s = '';
        do { s = String.fromCharCode(97 + (n % 26 === 0 ? 25 : (n % 26) - 1)) + s; n = Math.floor((n - 1) / 26); } while (n > 0);
        return s + '.';
    };

    const fmt = (n) => formatRupiah(Number(n) || 0);
    const fmtSelisih = (n) => {
        const v = Number(n) || 0;
        if (v < 0) return `<span style="color:#b91c1c;">(${fmt(Math.abs(v))})</span>`;
        return fmt(v);
    };

    let tbodyRows = '';

    comparisons.forEach(comp => {
        const kodeKegiatan = getKode(comp);

        // Header kegiatan
        tbodyRows += `
            <tr style="background-color:#e2e8f0;">
                <td colspan="9" style="border:1px solid #000; padding:6px 8px; font-weight:bold; font-size:12px;">
                    ${kodeKegiatan} — ${comp.nama_kegiatan || '-'}
                </td>
            </tr>`;

        const getGroup = (it) => String(it.group || it.group_belanja || it.kelompok_belanja || (it.semula && (it.semula.group || it.semula.group_belanja)) || (it.menjadi && (it.menjadi.group || it.menjadi.group_belanja)) || 'Belanja').trim();
        const getSubgroup = (it) => String(it.subgroup || it.sub_kelompok || it.group_kegiatan || (it.semula && (it.semula.subgroup || it.semula.sub_kelompok)) || (it.menjadi && (it.menjadi.subgroup || it.menjadi.sub_kelompok)) || 'Sub Group').trim();

        // KUNCI URUTAN MASTER RAB MURNI: Jangan lakukan sorting ulang yang mengubah urutan item murni.
        // comp.items sudah terkunci mati mengikuti urutan asli RAB Murni dari server (/api/rab/perbandingan).
        // Render item secara berurutan persis sesuai indeks master skeleton comp.items.
        let runningNo = 0;
        let lastGroup = null;
        let lastSubgroup = null;
        let subCounter = 0;

        const itemsList = (Array.isArray(comp.items) ? [...comp.items] : []).sort((a, b) => {
            const gA = getGroup(a);
            const gB = getGroup(b);
            const gCodeA = getRabGroupCode(gA);
            const gCodeB = getRabGroupCode(gB);
            const cmpG = compareKodeRAB(gCodeA, gCodeB);
            if (cmpG !== 0) return cmpG;
            const cmpGName = gA.localeCompare(gB);
            if (cmpGName !== 0) return cmpGName;

            const sgA = getSubgroup(a);
            const sgB = getSubgroup(b);
            const sgCodeA = getRabSubgroupCode(sgA, gA);
            const sgCodeB = getRabSubgroupCode(sgB, gB);
            const cmpSg = compareKodeRAB(sgCodeA, sgCodeB);
            if (cmpSg !== 0) return cmpSg;
            const cmpSgName = sgA.localeCompare(sgB);
            if (cmpSgName !== 0) return cmpSgName;

            const uA = Number(a.urutan_murni !== undefined && a.urutan_murni !== null ? a.urutan_murni : (a.urutan || (a.semula && a.semula.urutan) || (a.menjadi && a.menjadi.urutan) || 0));
            const uB = Number(b.urutan_murni !== undefined && b.urutan_murni !== null ? b.urutan_murni : (b.urutan || (b.semula && b.semula.urutan) || (b.menjadi && b.menjadi.urutan) || 0));
            if (uA && uB && uA !== uB) return uA - uB;

            const urA = a.uraian || (a.semula && a.semula.uraian) || (a.menjadi && a.menjadi.uraian);
            const urB = b.uraian || (b.semula && b.semula.uraian) || (b.menjadi && b.menjadi.uraian);
            const idxA = getSiskeudesItemIndex(urA);
            const idxB = getSiskeudesItemIndex(urB);
            if (idxA !== -1 && idxB !== -1) {
                if (idxA !== idxB) return idxA - idxB;
            } else if (idxA !== -1) {
                return -1;
            } else if (idxB !== -1) {
                return 1;
            }

            return 0;
        });
        for (let i = 0; i < itemsList.length; i++) {
            const it = itemsList[i];
            const g = getGroup(it);
            const sg = getSubgroup(it);

            if (g !== lastGroup) {
                lastGroup = g;
                lastSubgroup = null;
                tbodyRows += `
                    <tr style="background-color:#f1f5f9;">
                        <td colspan="9" style="border:1px solid #000; padding:6px 8px; font-weight:bold; font-size:12px; text-transform:uppercase;">${g}</td>
                    </tr>`;
            }

            if (sg !== lastSubgroup) {
                lastSubgroup = sg;
                subCounter = 0;

                // Hitung subtotal untuk blok kontigu item di bawah subgroup ini
                let subSemula = 0;
                let subMenjadi = 0;
                for (let j = i; j < itemsList.length; j++) {
                    const nextIt = itemsList[j];
                    if (getGroup(nextIt) === g && getSubgroup(nextIt) === sg) {
                        subSemula += Number(nextIt.semula && nextIt.semula.jumlah) || 0;
                        subMenjadi += Number(nextIt.menjadi && nextIt.menjadi.jumlah) || 0;
                    } else {
                        break;
                    }
                }

                tbodyRows += `
                    <tr style="background-color:#f8fafc;">
                        <td colspan="2" style="border:1px solid #000; padding:6px 8px; font-weight:bold; font-size:12px;">${sg}</td>
                        <td colspan="3" style="border:1px solid #000; padding:6px 8px; text-align:right; font-weight:bold; font-size:12px;">Rp ${fmt(subSemula)}</td>
                        <td colspan="3" style="border:1px solid #000; padding:6px 8px; text-align:right; font-weight:bold; font-size:12px;">Rp ${fmt(subMenjadi)}</td>
                        <td style="border:1px solid #000; padding:6px 8px; text-align:right; font-weight:bold; font-size:12px;">${fmtSelisih(subMenjadi - subSemula)}</td>
                    </tr>`;
            }

            runningNo += 1;
            subCounter += 1;
            const volSemula = it.item_baru ? '0' : `${it.semula && it.semula.volume != null ? it.semula.volume : 0} ${it.semula && it.semula.satuan ? it.semula.satuan : ''}`.trim();
            const volMenjadi = it.item_dihapus ? '0' : `${it.menjadi && it.menjadi.volume != null ? it.menjadi.volume : 0} ${it.menjadi && it.menjadi.satuan ? it.menjadi.satuan : ''}`.trim();
            tbodyRows += `
            <tr>
                <td style="border:1px solid #000; padding:4px 6px; text-align:center; font-size:11px;">${runningNo}</td>
                <td style="border:1px solid #000; padding:4px 6px; padding-left:16px; font-size:11px;">${charLabel(subCounter)} ${it.uraian}${it.keterangan ? ` (${it.keterangan})` : ''}</td>
                <td style="border:1px solid #000; padding:4px 6px; text-align:center; font-size:11px;">${volSemula || '0'}</td>
                <td style="border:1px solid #000; padding:4px 6px; text-align:right; font-size:11px;">${it.item_baru ? '0' : fmt(it.semula && it.semula.harga)}</td>
                <td style="border:1px solid #000; padding:4px 6px; text-align:right; font-size:11px;">${it.item_baru ? '0' : fmt(it.semula && it.semula.jumlah)}</td>
                <td style="border:1px solid #000; padding:4px 6px; text-align:center; font-size:11px;">${volMenjadi || '0'}</td>
                <td style="border:1px solid #000; padding:4px 6px; text-align:right; font-size:11px;">${it.item_dihapus ? '0' : fmt(it.menjadi && it.menjadi.harga)}</td>
                <td style="border:1px solid #000; padding:4px 6px; text-align:right; font-size:11px;">${it.item_dihapus ? '0' : fmt(it.menjadi && it.menjadi.jumlah)}</td>
                <td style="border:1px solid #000; padding:4px 6px; text-align:right; font-size:11px;">${fmtSelisih(it.selisih)}</td>
            </tr>`;
        }

        // TOTAL per kegiatan
        tbodyRows += `
            <tr style="background-color:#e2e8f0; font-weight:bold;">
                <td colspan="2" style="border:1px solid #000; padding:6px 8px; text-align:right; font-size:12px;">TOTAL KEGIATAN</td>
                <td colspan="2" style="border:1px solid #000;"></td>
                <td style="border:1px solid #000; padding:6px 8px; text-align:right; font-size:12px;">Rp ${fmt(comp.total.semula)}</td>
                <td colspan="2" style="border:1px solid #000;"></td>
                <td style="border:1px solid #000; padding:6px 8px; text-align:right; font-size:12px;">Rp ${fmt(comp.total.menjadi)}</td>
                <td style="border:1px solid #000; padding:6px 8px; text-align:right; font-size:12px;">${fmtSelisih(comp.total.selisih)}</td>
            </tr>`;
    });

    const html = `
        <html>
        <head>
            <title>RAB Perubahan ${prefix}</title>
            <style>
                @page { size: A4 landscape; margin: 12mm; }
                body { font-family: 'Segoe UI', Arial, sans-serif; padding: 16px; color: #000; background: #fff; line-height: 1.35; }
                h1, h2, h3 { margin: 0; text-align: center; font-weight: bold; }
                table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                th, td { border: 1px solid #000; padding: 5px 6px; font-size: 11px; vertical-align: top; }
                th { background: #e2e8f0; font-weight: bold; text-align: center; }
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body>
            <div style="text-align:center; margin-bottom:14px;">
                <h1 style="font-size:16px; text-transform:uppercase;">PERUBAHAN RENCANA ANGGARAN BIAYA (RAB)</h1>
                <h2 style="font-size:14px; text-transform:uppercase;">PEMERINTAH DESA BATETANGNGA</h2>
                <h3 style="font-size:12px; text-transform:uppercase;">KECAMATAN BINUANG KABUPATEN POLEWALI MANDAR</h3>
                <h3 style="font-size:12px; text-transform:uppercase;">PROVINSI SULAWESI BARAT — TAHUN ANGGARAN ${tahunNum}</h3>
            </div>

            <div style="display:flex; justify-content:space-between; border-top:2px solid #000; border-bottom:2px solid #000; padding:10px 0; font-size:12px; line-height:1.6;">
                <div style="width:48%;">
                    <div style="display:flex;"><span style="width:90px;">Desa</span><span style="margin-right:8px;">:</span><strong>BATETANGNGA</strong></div>
                    <div style="display:flex;"><span style="width:90px;">Kecamatan</span><span style="margin-right:8px;">:</span><strong>BINUANG</strong></div>
                    <div style="display:flex;"><span style="width:90px;">Kabupaten</span><span style="margin-right:8px;">:</span><strong>POLEWALI MANDAR</strong></div>
                    <div style="display:flex;"><span style="width:90px;">Provinsi</span><span style="margin-right:8px;">:</span><strong>SULAWESI BARAT</strong></div>
                </div>
                <div style="width:48%;">
                    <div style="display:flex;"><span style="width:90px;">No. RAB</span><span style="margin-right:8px;">:</span><strong>${prefix}</strong></div>
                    <div style="display:flex;"><span style="width:90px;">Bidang</span><span style="margin-right:8px;">:</span><strong>RAB PERUBAHAN</strong></div>
                    <div style="display:flex;"><span style="width:90px;">Kegiatan</span><span style="margin-right:8px;">:</span><strong>${groupTitle}</strong></div>
                    <div style="display:flex;"><span style="width:90px;">Jml Kegiatan</span><span style="margin-right:8px;">:</span><strong>${comparisons.length}</strong></div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th rowspan="2" style="width:34px;">NO</th>
                        <th rowspan="2">URAIAN</th>
                        <th colspan="3">SEMULA</th>
                        <th colspan="3">MENJADI</th>
                        <th rowspan="2" style="width:120px;">BERTAMBAH / (BERKURANG)</th>
                    </tr>
                    <tr>
                        <th style="width:80px;">VOL &amp; SAT</th>
                        <th style="width:95px;">HARGA SATUAN</th>
                        <th style="width:105px;">JUMLAH</th>
                        <th style="width:80px;">VOL &amp; SAT</th>
                        <th style="width:95px;">HARGA SATUAN</th>
                        <th style="width:105px;">JUMLAH</th>
                    </tr>
                </thead>
                <tbody>
                    ${tbodyRows}
                </tbody>
                <tfoot>
                    <tr style="font-weight:bold; background-color:#cbd5e1;">
                        <td colspan="2" style="text-align:right; font-weight:bold;">JUMLAH TOTAL</td>
                        <td colspan="2"></td>
                        <td style="text-align:right; font-weight:bold;">Rp ${fmt(grandTotal.semula)}</td>
                        <td colspan="2"></td>
                        <td style="text-align:right; font-weight:bold;">Rp ${fmt(grandTotal.menjadi)}</td>
                        <td style="text-align:right; font-weight:bold;">${fmtSelisih(grandTotal.selisih)}</td>
                    </tr>
                </tfoot>
            </table>

            <div class="signature-section" style="margin-top:44px; display:flex; justify-content:space-between; page-break-inside:avoid; font-size:12px; line-height:1.5; text-align:center;">
                <div style="width:30%;">
                    <p style="margin:0;">Menyetujui,</p>
                    <p style="margin:0 0 68px 0; font-weight:bold;">Kepala Desa Batetangnga</p>
                    <p style="margin:0; text-decoration:underline; font-weight:bold;">${namaKades}</p>
                </div>
                <div style="width:30%;">
                    <p style="margin:0;">Telah Diverifikasi</p>
                    <p style="margin:0 0 68px 0; font-weight:bold;">Sekretaris Desa</p>
                    <p style="margin:0; text-decoration:underline; font-weight:bold;">${namaSekdes}</p>
                </div>
                <div style="width:30%;">
                    <p style="margin:0;">${teksLokasiTanggal}</p>
                    <p style="margin:0 0 68px 0; font-weight:bold;">Pelaksana Kegiatan Anggaran</p>
                    <p style="margin:0; text-decoration:underline; font-weight:bold;">${namaPelaksana}</p>
                </div>
            </div>

            <div class="footer no-print" style="margin-top:28px; border-top:1px solid #cbd5e1; padding-top:8px; display:flex; justify-content:space-between; font-size:10px; color:#64748b;">
                <div>Dicetak dari sistem SIA Batetangnga — Modul RAB Perubahan</div>
                <div></div>
            </div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
}

window.onTipeAnggaranChange = onTipeAnggaranChange;
window.salinKeRABPerubahan = salinKeRABPerubahan;
window.cetakRabPerubahan = cetakRabPerubahan;
window.refreshLockStatus = refreshLockStatus;

document.addEventListener('DOMContentLoaded', loadInitialData);

// ============================================================
// PAGU ANGGARAN & VALIDASI OVER-BUDGET LOGIC (NON-DESTRUCTIVE)
// ============================================================
let paguState = {
    tahun: '2027',
    data: {
        "ADD": 0,
        "DDS": 0,
        "PBH": 0,
        "APBD Tk. I": 0,
        "APBD Tk. II": 0,
        "PAD": 0
    },
    details: {}
};

async function loadPaguAnggaran(tahunParam) {
    const th = String(tahunParam || rabYear || '2027');
    try {
        const res = await fetch(`${API_URL}/pagu-anggaran?tahun=${th}`);
        const json = await res.json();
        if (json.success && json.data) {
            paguState.tahun = th;
            paguState.data = json.data;
            paguState.details = json.details || {};
        }
    } catch(e) {
        console.log('⚡ Using local pagu state definition');
    }
    updateRabInfographicStats();
}

function normalizeSumberCode(sumberStr) {
    if (!sumberStr) return 'DDS';
    const s = String(sumberStr).trim().toUpperCase();

    if (s.includes('ADD') || s.includes('ALOKASI DANA DESA')) {
        return 'ADD';
    }
    if (s.includes('DDS') || s.includes('DANA DESA')) {
        return 'DDS';
    }
    if (s.includes('PBH') || s.includes('BAGI HASIL PAJAK') || s.includes('BAGI HASIL')) {
        return 'PBH';
    }
    if (s.includes('APBD TK. II') || s.includes('APBD II') || s.includes('KABUPATEN')) {
        return 'APBD Tk. II';
    }
    if (s.includes('APBD TK. I') || s.includes('APBD I') || s.includes('PROVINSI')) {
        return 'APBD Tk. I';
    }
    if (s.includes('PAD') || s.includes('PENDAPATAN ASLI DESA')) {
        return 'PAD';
    }

    return 'DDS';
}

const LIST_SUMBER_DANA = [
    { code: 'ADD', label: 'ADD', name: 'Alokasi Dana Desa (ADD)', icon: 'fa-building-columns', color: 'indigo', bgIcon: 'bg-indigo-50 text-indigo-600' },
    { code: 'DDS', label: 'DDS', name: 'Dana Desa / APBN (DDS)', icon: 'fa-hand-holding-dollar', color: 'emerald', bgIcon: 'bg-emerald-50 text-emerald-600' },
    { code: 'PBH', label: 'PBH', name: 'Bagi Hasil Pajak & Retribusi (PBH)', icon: 'fa-receipt', color: 'amber', bgIcon: 'bg-amber-50 text-amber-600' },
    { code: 'APBD Tk. I', label: 'APBD I', name: 'Bantuan APBD Tk. I / Provinsi', icon: 'fa-landmark-flag', color: 'blue', bgIcon: 'bg-blue-50 text-blue-600' },
    { code: 'APBD Tk. II', label: 'APBD II', name: 'Bantuan APBD Tk. II / Kabupaten', icon: 'fa-city', color: 'purple', bgIcon: 'bg-purple-50 text-purple-600' },
    { code: 'PAD', label: 'PAD', name: 'Pendapatan Asli Desa (PAD)', icon: 'fa-coins', color: 'teal', bgIcon: 'bg-teal-50 text-teal-600' }
];

function updateRabInfographicStats() {
    const th = String(rabYear || '2027');
    const labelTahun = document.getElementById('labelTahunInfografis');
    if (labelTahun) labelTahun.textContent = th;

    const usageMap = {
        'ADD': 0,
        'DDS': 0,
        'PBH': 0,
        'APBD Tk. I': 0,
        'APBD Tk. II': 0,
        'PAD': 0
    };

    if (Array.isArray(savedRabList)) {
        savedRabList.forEach(rab => {
            if (String(rab.tahun) === th) {
                // HINDARI double-count: item RAB terpilih (rabItems) dijumlahkan tersendiri
                // di bawah, jadi baris yang sama di savedRabList dilewati.
                const rabKode = String(rab.kode_unik_full || rab.kode_unik || '').trim();
                const curKode = String(selectedRpjm?.kode_unik_full || selectedRpjm?.kode_unik || '').trim();
                if (curKode && rabKode === curKode && String(rab.tahun) === th) {
                    return;
                }
                if (Array.isArray(rab.items) && rab.items.length > 0) {
                    rab.items.forEach(it => {
                        const rawSumber = it.sumber || rab.sumber_dana || 'DDS';
                        const code = normalizeSumberCode(rawSumber);
                        if (usageMap.hasOwnProperty(code)) {
                            usageMap[code] += Number(it.jumlah || 0);
                        } else {
                            usageMap['DDS'] += Number(it.jumlah || 0);
                        }
                    });
                } else {
                    const rawSumber = rab.sumber_dana || 'DDS';
                    const code = normalizeSumberCode(rawSumber);
                    if (usageMap.hasOwnProperty(code)) {
                        usageMap[code] += Number(rab.jumlah_anggaran || 0);
                    } else {
                        usageMap['DDS'] += Number(rab.jumlah_anggaran || 0);
                    }
                }
            }
        });
    }

    if (Array.isArray(rabItems)) {
        rabItems.forEach(it => {
            const rawSumber = it.sumber || 'DDS';
            const code = normalizeSumberCode(rawSumber);
            if (usageMap.hasOwnProperty(code)) {
                usageMap[code] += Number(it.jumlah || 0);
            } else {
                usageMap['DDS'] += Number(it.jumlah || 0);
            }
        });
    }

    let grandPagu = 0;
    let grandTerpakai = 0;

    const gridContainer = document.getElementById('containerGridPaguSumberDana');
    let cardsHtml = '';

    LIST_SUMBER_DANA.forEach(sd => {
        const paguVal = (paguState.data && paguState.data[sd.code] !== undefined) ? Number(paguState.data[sd.code]) : 0;
        const terpakaiVal = usageMap[sd.code] || 0;
        const sisaVal = paguVal - terpakaiVal;
        const percentVal = paguVal > 0 ? Math.min(100, Math.round((terpakaiVal / paguVal) * 100)) : 0;

        grandPagu += paguVal;
        grandTerpakai += terpakaiVal;

        const isDeficit = sisaVal < 0;

        const detail = (paguState.details && paguState.details[sd.code]) ? paguState.details[sd.code] : null;
        const silpaVal = detail ? Number(detail.silpa || 0) : 0;
        const pengeluaranVal = detail ? Number(detail.pengeluaran_pembiayaan || 0) : 0;

        cardsHtml += `
            <div class="bg-white rounded-xl p-4 border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-3">
                <div class="flex items-start justify-between">
                    <div>
                        <span class="inline-flex items-center gap-1.5 text-[11px] font-black uppercase text-slate-800 tracking-wider">
                            <span class="w-2 h-2 rounded-full bg-${sd.color}-500"></span> ${sd.label}
                        </span>
                        <h4 class="text-[11px] text-slate-400 font-medium truncate max-w-[170px]" title="${sd.name}">${sd.name}</h4>
                    </div>
                    <div class="w-8 h-8 rounded-lg ${sd.bgIcon} flex items-center justify-center text-xs">
                        <i class="fas ${sd.icon}"></i>
                    </div>
                </div>

                <div class="space-y-1.5 pt-1 border-t border-slate-100">
                    <div class="flex justify-between items-center text-xs">
                        <span class="text-slate-400 font-semibold">Pagu Akhir:</span>
                        <span class="font-extrabold text-slate-800">Rp ${paguVal.toLocaleString('id-ID')}</span>
                    </div>
                    ${silpaVal > 0 ? `
                    <div class="flex justify-between items-center text-[10px] text-emerald-600 font-bold bg-emerald-50/60 px-1.5 py-0.5 rounded">
                        <span>+ SiLPA Masuk:</span>
                        <span>Rp ${silpaVal.toLocaleString('id-ID')}</span>
                    </div>` : ''}
                    ${pengeluaranVal > 0 ? `
                    <div class="flex justify-between items-center text-[10px] text-amber-700 font-bold bg-amber-50/60 px-1.5 py-0.5 rounded">
                        <span>- Pembiayaan:</span>
                        <span>Rp ${pengeluaranVal.toLocaleString('id-ID')}</span>
                    </div>` : ''}
                    <div class="flex justify-between items-center text-xs">
                        <span class="text-slate-400 font-semibold">Terpakai:</span>
                        <span class="font-extrabold text-indigo-600">Rp ${terpakaiVal.toLocaleString('id-ID')}</span>
                    </div>
                    <div class="flex justify-between items-center text-xs pt-1 border-t border-slate-100">
                        <span class="text-slate-500 font-bold">Sisa Pagu:</span>
                        <span class="font-black ${isDeficit ? 'text-red-600 animate-pulse' : 'text-emerald-600'}">Rp ${sisaVal.toLocaleString('id-ID')}</span>
                    </div>
                </div>

                <div>
                    <div class="flex justify-between items-center text-[10px] mb-1 font-bold">
                        <span class="text-slate-400 uppercase">Serapan</span>
                        <span class="${percentVal > 90 ? 'text-amber-600 font-black' : 'text-slate-700'}">${percentVal}%</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div class="bg-${isDeficit ? 'red-500' : percentVal > 90 ? 'amber-500' : 'indigo-600'} h-1.5 rounded-full transition-all duration-500" style="width: ${percentVal}%"></div>
                    </div>
                </div>
            </div>
        `;
    });

    if (gridContainer) gridContainer.innerHTML = cardsHtml;

    const grandSisa = grandPagu - grandTerpakai;
    const grandPercent = grandPagu > 0 ? Math.min(100, Math.round((grandTerpakai / grandPagu) * 100)) : 0;

    const cardTotalPagu = document.getElementById('cardTotalPagu');
    const cardTotalRabTerpakai = document.getElementById('cardTotalRabTerpakai');
    const cardSisaPagu = document.getElementById('cardSisaPagu');
    const cardPercentText = document.getElementById('cardPercentText');

    if (cardTotalPagu) cardTotalPagu.textContent = 'Rp ' + grandPagu.toLocaleString('id-ID');
    if (cardTotalRabTerpakai) cardTotalRabTerpakai.textContent = 'Rp ' + grandTerpakai.toLocaleString('id-ID');
    if (cardSisaPagu) {
        cardSisaPagu.textContent = 'Rp ' + grandSisa.toLocaleString('id-ID');
        cardSisaPagu.className = grandSisa < 0 ? "text-base font-black text-red-400 animate-pulse" : "text-base font-black text-emerald-400";
    }
    if (cardPercentText) cardPercentText.textContent = `${grandPercent}%`;
}

const PAGU_KEYS = ['ADD', 'DDS', 'PBH', 'APBD1', 'APBD2', 'PAD'];
const PAGU_MAP_CODES = {
    'ADD': 'ADD',
    'DDS': 'DDS',
    'PBH': 'PBH',
    'APBD1': 'APBD Tk. I',
    'APBD2': 'APBD Tk. II',
    'PAD': 'PAD'
};

function parseFormVal(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    const str = String(el.value || '').trim();
    const isNeg = str.startsWith('-');
    const digits = str.replace(/[^0-9]/g, '');
    if (!digits) return 0;
    const num = Number(digits);
    return isNeg ? -num : num;
}

function setFormVal(id, num) {
    const el = document.getElementById(id);
    if (el) {
        if (num !== undefined && num !== null && Number(num) !== 0) {
            const n = Number(num);
            el.value = (n < 0 ? '-' : '') + Math.abs(n).toLocaleString('id-ID');
        } else {
            el.value = '';
        }
    }
}

function hitungPaguModalRealtime() {
    let totSemula = 0, totMenjadi = 0, totSilpa = 0, totPengeluaran = 0, totAkhir = 0;

    PAGU_KEYS.forEach(k => {
        const semula = parseFormVal(`paguMurni_${k}`);
        const menjadi = parseFormVal(`paguPerub_${k}`);
        const silpa = parseFormVal(`paguSilpa_${k}`);
        const pengeluaran = parseFormVal(`paguPengeluaran_${k}`);

        // Rumus Dokumen Siskeudes APBDes Perubahan:
        // Pagu Akhir Belanja = Pagu Pendapatan Perubahan + SiLPA Masuk - Pengeluaran Pembiayaan
        const akhir = menjadi + silpa - pengeluaran;

        // Subteks selisih penyesuaian (Menjadi - Semula)
        const delta = menjadi - semula;
        const badgeDelta = document.getElementById(`paguDeltaLabel_${k}`);
        if (badgeDelta) {
            if (menjadi === 0 && semula === 0) {
                badgeDelta.textContent = '';
            } else if (delta < 0) {
                badgeDelta.innerHTML = `<span class="text-rose-600 font-semibold">(Selisih: -Rp ${Math.abs(delta).toLocaleString('id-ID')})</span>`;
            } else if (delta > 0) {
                badgeDelta.innerHTML = `<span class="text-emerald-600 font-semibold">(Selisih: +Rp ${delta.toLocaleString('id-ID')})</span>`;
            } else {
                badgeDelta.innerHTML = `<span class="text-slate-400 font-medium">(Selisih: Rp 0)</span>`;
            }
        }

        const inpAkhir = document.getElementById(`paguAkhir_${k}`);
        if (inpAkhir) {
            inpAkhir.value = 'Rp ' + akhir.toLocaleString('id-ID');
            inpAkhir.className = akhir < 0 
                ? "input-field text-right text-xs py-1 px-2 bg-rose-100/60 text-rose-950 font-black cursor-not-allowed border-rose-300 shadow-inner"
                : "input-field text-right text-xs py-1 px-2 bg-emerald-100/60 text-emerald-950 font-black cursor-not-allowed border-emerald-300 shadow-inner";
        }

        const lbl = document.getElementById(`paguAkhirLabel_${k}`);
        if (lbl) {
            if (lbl.tagName === 'INPUT') lbl.value = 'Rp ' + akhir.toLocaleString('id-ID');
            else lbl.textContent = 'Rp ' + akhir.toLocaleString('id-ID');
        }

        const hiddenLegacy = document.getElementById(`paguInput_${k}`);
        if (hiddenLegacy) hiddenLegacy.value = akhir !== 0 ? akhir.toLocaleString('id-ID') : '';

        totSemula += semula;
        totMenjadi += menjadi;
        totSilpa += silpa;
        totPengeluaran += pengeluaran;
        totAkhir += akhir;
    });

    const elTotMurni = document.getElementById('paguTotalMurni');
    const elTotPerub = document.getElementById('paguTotalPerubahan');
    const elTotSilpa = document.getElementById('paguTotalSilpa');
    const elTotPeng = document.getElementById('paguTotalPengeluaran');
    const elTotAkhir = document.getElementById('paguTotalAkhir');

    if (elTotMurni) elTotMurni.textContent = 'Rp ' + totSemula.toLocaleString('id-ID');
    if (elTotPerub) elTotPerub.textContent = 'Rp ' + totMenjadi.toLocaleString('id-ID');
    if (elTotSilpa) elTotSilpa.textContent = 'Rp ' + totSilpa.toLocaleString('id-ID');
    if (elTotPeng) elTotPeng.textContent = 'Rp ' + totPengeluaran.toLocaleString('id-ID');
    if (elTotAkhir) elTotAkhir.textContent = 'Rp ' + totAkhir.toLocaleString('id-ID');
}

function muatDataResmi2026() {
    const selTahun = document.getElementById('paguInputTahun');
    if (selTahun) selTahun.value = '2026';
    paguState.tahun = '2026';

    // Rujukan Resmi Siskeudes (RAB 1 Pendapatan & RAB 3 Pembiayaan T.A. 2026 Batetangnga):
    // ADD: Semula 689.184.000 | Perubahan = 629.844.000 | SiLPA 6.350.531 | Pembiayaan 0 => Pagu Akhir Otomatis: Rp 636.194.531
    setFormVal('paguMurni_ADD', 689184000);
    setFormVal('paguPerub_ADD', 629844000);
    setFormVal('paguSilpa_ADD', 6350531);
    setFormVal('paguPengeluaran_ADD', 0);

    // DDS: Semula 1.400.542.000 | Perubahan = 373.456.000 | SiLPA 0 | Pembiayaan 178.126.500 => Pagu Akhir Otomatis: Rp 195.329.500
    setFormVal('paguMurni_DDS', 1400542000);
    setFormVal('paguPerub_DDS', 373456000);
    setFormVal('paguSilpa_DDS', 0);
    setFormVal('paguPengeluaran_DDS', 178126500);

    // PBH: Semula 15.690.041 | Perubahan = 29.637.269 | SiLPA 31.076.703 | Pembiayaan 0 => Pagu Akhir Otomatis: Rp 60.713.972
    setFormVal('paguMurni_PBH', 15690041);
    setFormVal('paguPerub_PBH', 29637269);
    setFormVal('paguSilpa_PBH', 31076703);
    setFormVal('paguPengeluaran_PBH', 0);

    // APBD Tk. I: Semula 84.000.000 | Perubahan = 27.000.000 | SiLPA 0 | Pembiayaan 0 => Pagu Akhir Otomatis: Rp 27.000.000
    setFormVal('paguMurni_APBD1', 84000000);
    setFormVal('paguPerub_APBD1', 27000000);
    setFormVal('paguSilpa_APBD1', 0);
    setFormVal('paguPengeluaran_APBD1', 0);

    // APBD Tk. II: Semula 0 | Perubahan = 0 | SiLPA 0 | Pembiayaan 0 => Pagu Akhir Otomatis: Rp 0
    setFormVal('paguMurni_APBD2', 0);
    setFormVal('paguPerub_APBD2', 0);
    setFormVal('paguSilpa_APBD2', 0);
    setFormVal('paguPengeluaran_APBD2', 0);

    // PAD: Semula 0 | Perubahan = 0 | SiLPA 0 | Pembiayaan 0 => Pagu Akhir Otomatis: Rp 0
    setFormVal('paguMurni_PAD', 0);
    setFormVal('paguPerub_PAD', 0);
    setFormVal('paguSilpa_PAD', 0);
    setFormVal('paguPengeluaran_PAD', 0);

    hitungPaguModalRealtime();
    if (typeof showToast === 'function') {
        showToast('✅ Data resmi Siskeudes T.A. 2026 berhasil dimuat! Total Pagu Akhir Belanja Otomatis: Rp 919.238.003', 'success');
    }
}

function loadPaguInputForm(th) {
    const is2026 = String(th) === '2026';
    const details = (paguState.tahun === String(th) && paguState.details) ? paguState.details : {};
    const paguData = (paguState.tahun === String(th) && paguState.data) ? paguState.data : {};

    PAGU_KEYS.forEach(k => {
        const mapCode = PAGU_MAP_CODES[k];
        const d = details[mapCode];
        if (d && (d.pagu_semula !== undefined || d.pagu_murni !== undefined || d.pagu_menjadi !== undefined || d.pagu_perubahan !== undefined || d.perubahan !== undefined || d.silpa !== undefined || d.pengeluaran_pembiayaan !== undefined)) {
            const semulaVal = d.pagu_semula !== undefined ? d.pagu_semula : d.pagu_murni;
            const menjadiVal = d.pagu_menjadi !== undefined ? d.pagu_menjadi : (d.pagu_perubahan !== undefined ? d.pagu_perubahan : (d.perubahan !== undefined ? d.perubahan : d.pagu_akhir));
            setFormVal(`paguMurni_${k}`, semulaVal);
            setFormVal(`paguPerub_${k}`, menjadiVal);
            setFormVal(`paguSilpa_${k}`, d.silpa);
            setFormVal(`paguPengeluaran_${k}`, d.pengeluaran_pembiayaan);
        } else if (is2026) {
            if (k === 'ADD') {
                setFormVal(`paguMurni_${k}`, 689184000);
                setFormVal(`paguPerub_${k}`, 629844000);
                setFormVal(`paguSilpa_${k}`, 6350531);
                setFormVal(`paguPengeluaran_${k}`, 0);
            } else if (k === 'DDS') {
                setFormVal(`paguMurni_${k}`, 1400542000);
                setFormVal(`paguPerub_${k}`, 373456000);
                setFormVal(`paguSilpa_${k}`, 0);
                setFormVal(`paguPengeluaran_${k}`, 178126500);
            } else if (k === 'PBH') {
                setFormVal(`paguMurni_${k}`, 15690041);
                setFormVal(`paguPerub_${k}`, 29637269);
                setFormVal(`paguSilpa_${k}`, 31076703);
                setFormVal(`paguPengeluaran_${k}`, 0);
            } else if (k === 'APBD1') {
                setFormVal(`paguMurni_${k}`, 84000000);
                setFormVal(`paguPerub_${k}`, 27000000);
                setFormVal(`paguSilpa_${k}`, 0);
                setFormVal(`paguPengeluaran_${k}`, 0);
            } else {
                setFormVal(`paguMurni_${k}`, 0);
                setFormVal(`paguPerub_${k}`, 0);
                setFormVal(`paguSilpa_${k}`, 0);
                setFormVal(`paguPengeluaran_${k}`, 0);
            }
        } else {
            const val = paguData[mapCode] || 0;
            setFormVal(`paguMurni_${k}`, val);
            setFormVal(`paguPerub_${k}`, val);
            setFormVal(`paguSilpa_${k}`, 0);
            setFormVal(`paguPengeluaran_${k}`, 0);
        }
    });

    hitungPaguModalRealtime();
}

function formatNumberInput(el, allowNegative = false) {
    if (!el) return;
    let val = String(el.value || '').trim();
    let isNeg = allowNegative && val.startsWith('-');
    let raw = val.replace(/[^0-9]/g, '');
    if (raw) {
        el.value = (isNeg ? '-' : '') + Number(raw).toLocaleString('id-ID');
    } else {
        el.value = isNeg ? '-' : '';
    }
}

async function simpanPaguForm() {
    const selTahun = document.getElementById('paguInputTahun');
    const th = selTahun ? selTahun.value : String(rabYear || '2027');

    const newPaguData = {};
    const newDetails = {};

    PAGU_KEYS.forEach(k => {
        const mapCode = PAGU_MAP_CODES[k];
        const semula = parseFormVal(`paguMurni_${k}`);
        const menjadi = parseFormVal(`paguPerub_${k}`);
        const silpa = parseFormVal(`paguSilpa_${k}`);
        const pengeluaran = parseFormVal(`paguPengeluaran_${k}`);
        
        // Pagu Akhir Belanja = Menjadi + SiLPA - Pengeluaran Pembiayaan
        const akhir = menjadi + silpa - pengeluaran;

        newPaguData[mapCode] = akhir;
        newDetails[mapCode] = {
            pagu_semula: semula,
            pagu_menjadi: menjadi,
            pagu_perubahan: menjadi,
            pagu_murni: semula, // kompatibilitas
            perubahan: menjadi,  // kompatibilitas
            delta: menjadi - semula,
            silpa: silpa,
            pengeluaran_pembiayaan: pengeluaran,
            pagu_akhir: akhir
        };
    });

    console.log(`📡 Sending Pagu Data & Details to Supabase for year ${th}:`, newPaguData, newDetails);

    try {
        const res = await fetch(`${API_URL}/pagu-anggaran`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tahun: th, paguData: newPaguData, details: newDetails })
        });
        const resJson = await res.json();
        if (resJson.success) {
            console.log("✅ Pagu Anggaran & Pembiayaan successfully saved to Supabase:", resJson);
            showToast(`✅ Pagu Anggaran tahun ${th} berhasil disimpan & disinkronkan ke Supabase!`, 'success');
        } else {
            console.warn("⚠️ Server warning saving pagu:", resJson.message);
            showToast(`⚠️ warning: ${resJson.message}`, 'warning');
        }
    } catch(e) {
        console.error("❌ Failed to save pagu to server/Supabase:", e);
        showToast("⚠️ Gagal koneksi ke server database", "error");
    }

    paguState.tahun = th;
    paguState.data = newPaguData;
    paguState.details = newDetails;

    tutupModalKelolaPagu();
    // Muat ulang pagu tahun aktif agar infografis & validasi konsisten
    await loadPaguAnggaran(rabYear);
}

function validatePaguBudget(tahun, sumber, newJumlah, isEditingIndex = -1) {
    const th = String(tahun || rabYear || '2027');
    const sumberClean = normalizeSumberCode(sumber);
    
    const paguLimit = (paguState.data && paguState.data[sumberClean] !== undefined) ? Number(paguState.data[sumberClean]) : 0;
    
    let existingAllocated = 0;
    if (Array.isArray(savedRabList)) {
        savedRabList.forEach(rab => {
            if (String(rab.tahun) === th) {
                // HINDARI double-count: rabItems = item RAB terpilih yang sedang dibuka.
                // Item tersebut sudah dijumlahkan secara terpisah dari array rabItems di bawah,
                // jadi baris yang sama di savedRabList harus dilewati.
                const normKode = (k) => String(k || '').trim().replace(/\.+$/, '').replace(/^PEM\./i, '');
                const rabKode = normKode(rab.kode_unik_full || rab.kode_unik);
                const curKode = normKode(selectedRpjm?.kode_unik_full || selectedRpjm?.kode_unik);
                const isSameId = (currentRabId && rab.id && String(rab.id) === String(currentRabId));
                const isSameKode = (curKode && rabKode && curKode === rabKode);

                if ((isSameId || isSameKode) && String(rab.tahun) === th) {
                    return;
                }
                if (Array.isArray(rab.items) && rab.items.length > 0) {
                    rab.items.forEach(it => {
                        const itemSumber = normalizeSumberCode(it.sumber || rab.sumber_dana || 'DDS');
                        if (itemSumber === sumberClean) {
                            existingAllocated += Number(it.jumlah || 0);
                        }
                    });
                } else {
                    const itemSumber = normalizeSumberCode(rab.sumber_dana || 'DDS');
                    if (itemSumber === sumberClean) {
                        existingAllocated += Number(rab.jumlah_anggaran || 0);
                    }
                }
            }
        });
    }

    if (Array.isArray(rabItems)) {
        rabItems.forEach((it, idx) => {
            if (idx !== isEditingIndex) {
                const itemSumber = normalizeSumberCode(it.sumber || 'DDS');
                if (itemSumber === sumberClean) {
                    existingAllocated += Number(it.jumlah || 0);
                }
            }
        });
    }

    const totalAfterAdd = existingAllocated + newJumlah;

    // Hanya berlaku over-budget bila pagu sumber dana sudah ditetapkan (>0).
    // Jika pagu masih 0 (belum diisi), jangan blokir penginputan item.
    if (paguLimit > 0 && totalAfterAdd > paguLimit) {
        const deficit = totalAfterAdd - paguLimit;
        
        const obMsg = document.getElementById('overBudgetModalMsg');
        const obSumber = document.getElementById('obSumberDana');
        const obPagu = document.getElementById('obPaguLimit');
        const obExisting = document.getElementById('obRabExisting');
        const obNew = document.getElementById('obNewAmount');
        const obDeficit = document.getElementById('obDeficit');

        if (obMsg) obMsg.textContent = `Peringatan: Alokasi anggaran melebihi batas pagu anggaran sumber dana ${sumberClean}! Penyimpanan ditahan hingga nominal dikoreksi.`;
        if (obSumber) obSumber.textContent = sumberClean;
        if (obPagu) obPagu.textContent = 'Rp ' + paguLimit.toLocaleString('id-ID');
        if (obExisting) obExisting.textContent = 'Rp ' + existingAllocated.toLocaleString('id-ID');
        if (obNew) obNew.textContent = 'Rp ' + newJumlah.toLocaleString('id-ID');
        if (obDeficit) obDeficit.textContent = `+ Rp ${deficit.toLocaleString('id-ID')} (Over-Budget)`;

        const modal = document.getElementById('modalOverBudgetWarning');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        }

        showToast(`⚠️ Peringatan: Alokasi melebihi batas pagu anggaran sumber dana ${sumberClean}!`, 'error');
        return false;
    }

    if (paguLimit > 0 && totalAfterAdd >= (paguLimit * 0.9)) {
        showToast(`⚠️ Peringatan: Total RAB untuk ${sumberClean} hampir mencapai batas Pagu (Tersisa: ${formatRupiah(paguLimit - totalAfterAdd)})`, 'error'); 
        // using 'error' type for warning as toast classes might only have success/error
    }

    return true;
}

async function bukaModalKelolaPagu() {
    const modal = document.getElementById('modalKelolaPagu');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
    // Sinkronkan tahun modal dengan tahun anggaran aktif
    const selTahun = document.getElementById('paguInputTahun');
    if (selTahun) selTahun.value = String(rabYear || '2027');
    const th = selTahun ? selTahun.value : String(rabYear || '2027');
    console.log("🔄 Opening Pagu Modal for year:", th);
    
    // Fetch latest data from Supabase/Server before filling form
    await loadPaguAnggaran(th);
    loadPaguInputForm(th);
}

// Ganti tahun pada modal kelola pagu → fetch ulang data tahun tsb dari server
async function onPaguTahunChange(th) {
    if (!th) return;
    await loadPaguAnggaran(String(th));
    loadPaguInputForm(String(th));
}

function tutupModalKelolaPagu() {
    const modal = document.getElementById('modalKelolaPagu');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    // Pulihkan state pagu ke tahun aktif setelah modal ditutup (batal/tanpa simpan)
    loadPaguAnggaran(rabYear);
}

function tutupModalOverBudget() {
    const modal = document.getElementById('modalOverBudgetWarning');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

async function fixRabData() {
    showToast('Memperbaiki data RAB...', 'warning');
    try {
        const response = await fetch('/api/rab/fix-data', {
            method: 'POST',
        });
        const result = await response.json();
        if (result.success) {
            showToast('Data RAB berhasil diperbaiki.', 'success');
            loadSavedRabList(); // Reload the list to show the corrected data
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error fixing RAB data:', error);
        showToast(`Gagal memperbaiki data: ${error.message}`, 'error');
    }
}

function bukaModalSyncDuaArah() {
    const modal = document.getElementById('modalSyncDuaArah');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function tutupModalSyncDuaArah() {
    const modal = document.getElementById('modalSyncDuaArah');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// Basis 1: Sinkronkan Urutan Berdasarkan RAB Murni
async function syncUrutanBerdasarkanMurni() {
    if (!selectedRpjm) {
        showToast('Pilih kegiatan RPJMDes terlebih dahulu', 'warning');
        return;
    }

    const kode = selectedRpjm.kode_unik_full || selectedRpjm.kode_unik;
    const tahun = Number(rabYear || selectedRpjm.tahun || 2026);

    showToast('Menyelaraskan seluruh item dengan acuan RAB Murni...', 'info');

    // 1. Coba sinkronisasi langsung via server endpoint /api/rab/sync-basis-murni
    try {
        const payload = {
            kode_unik_full: kode,
            tahun: tahun
        };

        const res = await fetch(`${API_URL}/rab/sync-basis-murni`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const json = await res.json().catch(() => null);
        if (res.ok && json && json.success && json.data && Array.isArray(json.data.items)) {
            rabItems = sortRabItems(json.data.items);
            currentRabId = json.data.id || currentRabId;
            currentRabRefMurni = json.data.id_referensi_murni || currentRabRefMurni;
            reindexRabItemsBySubgroup(rabItems);
            renderRabItems();
            resetRabItemForm();
            setFormDirty(false);
            tutupModalSyncDuaArah();
            showToast('Seluruh item RAB Perubahan berhasil diselaraskan dan dimuat utuh sesuai acuan master RAB Murni!', 'success');
            return;
        }
    } catch (eSync) {
        console.warn('Gagal call /api/rab/sync-basis-murni, melakukan fallback sinkronisasi client-side:', eSync);
    }

    // 2. Fallback sinkronisasi client-side dengan STRICT BASELINE CLONE & STRICT APPEND BAWAH
    let murniItems = rabMurniRefItems;
    if (!Array.isArray(murniItems) || murniItems.length === 0) {
        try {
            const res = await fetch(`${API_URL}/rab?kode_unik_full=${encodeURIComponent(kode)}&tahun=${tahun}&tipe=MURNI`);
            const json = await res.json().catch(() => null);
            if (res.ok && json && json.success && json.data && Array.isArray(json.data.items)) {
                murniItems = json.data.items;
                rabMurniRefItems = murniItems;
            }
        } catch (e) {
            console.warn('Gagal fetch RAB Murni:', e);
        }
    }

    if (!Array.isArray(murniItems) || murniItems.length === 0) {
        showToast('Data master RAB Murni belum tersedia untuk kegiatan ini', 'warning');
        tutupModalSyncDuaArah();
        return;
    }

    // STRICT BASELINE CLONE (0..N) + STRICT APPEND ITEM BARU DI BAWAH
    rabItems = buildPerubahanItemsFromBaseline(murniItems, rabItems, currentRabRefMurni);
    renderRabItems();
    await saveRAB();

    tutupModalSyncDuaArah();
    showToast('Seluruh item RAB Perubahan berhasil diselaraskan dan dimuat utuh sesuai acuan master RAB Murni!', 'success');
}

// Basis 2: Sinkronkan Urutan Berdasarkan RAB Perubahan
async function syncUrutanBerdasarkanPerubahan() {
    if (!selectedRpjm) {
        showToast('Pilih kegiatan RPJMDes terlebih dahulu', 'warning');
        return;
    }

    if (!rabItems || rabItems.length === 0) {
        showToast('Belum ada item belanja di form untuk disinkronkan', 'warning');
        return;
    }

    const kode = selectedRpjm.kode_unik_full || selectedRpjm.kode_unik;
    const tahun = Number(rabYear || selectedRpjm.tahun || 2026);

    const confirmed = confirm(`Sinkronkan master RAB Murni agar mengikuti urutan dan struktur item dari RAB Perubahan saat ini?\n\nPerubahan susunan item akan diperbarui ke master RAB Murni.`);
    if (!confirmed) return;

    showToast('Menyelaraskan master RAB Murni mengikuti RAB Perubahan...', 'info');

    try {
        const payload = {
            kode_unik_full: kode,
            tahun: tahun,
            items: rabItems
        };

        const res = await fetch(`${API_URL}/rab/sync-basis-perubahan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const json = await res.json().catch(() => null);
        if (res.ok && json && json.success) {
            if (json.data && Array.isArray(json.data.items)) {
                rabMurniRefItems = sortRabItems(json.data.items);
                rabMurniRefTotal = Number(json.data.jumlah_anggaran || json.data.total_biaya || 0);
            }
            reindexRabItemsBySubgroup(rabItems);
            renderRabItems();
            await saveRAB();

            tutupModalSyncDuaArah();
            showToast('Master RAB Murni berhasil disinkronkan mengikuti susunan RAB Perubahan!', 'success');
        } else {
            showToast(`Gagal menyinkronkan: ${json?.error || res.statusText}`, 'error');
        }
    } catch (err) {
        console.error('Error syncUrutanBerdasarkanPerubahan:', err);
        showToast(`Terjadi kesalahan jaringan: ${err.message}`, 'error');
    }
}

window.normalizeSumberDana = normalizeSumberDana;
window.normalizeSumberCode = normalizeSumberCode;
window.loadPaguAnggaran = loadPaguAnggaran;
window.updateRabInfographicStats = updateRabInfographicStats;
window.validatePaguBudget = validatePaguBudget;
window.salinDataItem = salinDataItem;
window.bukaModalKelolaPagu = bukaModalKelolaPagu;
window.tutupModalKelolaPagu = tutupModalKelolaPagu;
window.loadPaguInputForm = loadPaguInputForm;
window.onPaguTahunChange = onPaguTahunChange;
window.formatNumberInput = formatNumberInput;
window.simpanPaguForm = simpanPaguForm;
window.hitungPaguModalRealtime = hitungPaguModalRealtime;
window.muatDataResmi2026 = muatDataResmi2026;
window.tutupModalOverBudget = tutupModalOverBudget;
window.fixRabData = fixRabData;
window.pilihKegiatanDariForm = pilihKegiatanDariForm;
window.moveRabItemUp = moveRabItemUp;
window.moveRabItemDown = moveRabItemDown;
window.changeRabItemOrder = changeRabItemOrder;
window.pushItemToMurni = pushItemToMurni;
window.reindexRabItemsBySubgroup = reindexRabItemsBySubgroup;
window.resetRabItemForm = resetRabItemForm;
window.cancelEditRabItem = cancelEditRabItem;
window.bukaModalSyncDuaArah = bukaModalSyncDuaArah;
window.tutupModalSyncDuaArah = tutupModalSyncDuaArah;
window.syncUrutanBerdasarkanMurni = syncUrutanBerdasarkanMurni;
window.syncUrutanBerdasarkanPerubahan = syncUrutanBerdasarkanPerubahan;
window.removeRabItem = removeRabItem;
window.deleteRabItem = deleteRabItem;
window.clearRabItems = clearRabItems;

