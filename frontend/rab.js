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
let rabYear = Number(localStorage.getItem('ACTIVE_TAHUN_ANGGARAN')) || 2027;

window.addEventListener('tahunChanged', (e) => {
    if (e && e.detail && e.detail.tahun) {
        rabYear = Number(e.detail.tahun) || 2027;
        if (typeof loadPaguAnggaran === 'function') loadPaguAnggaran(rabYear);
        if (typeof loadSavedRabList === 'function') loadSavedRabList();
    }
});
let editIndex = -1;

const defaultUnits = [
    'Bh','M3','M2','Unit','LS','Klg','M1','Buah','Orang','Hari','OB (Orang/Bulan)','Paket','Unit','Kali','Watt','KK','Bulan','Rim','Botol','Kotak','Dos','Set','Bks','Lbr','Rkp','Psg','Tahun','Bal','Ikat','Rak','Hok','Biji','Zak','Kg','Drum','Roll','Ekor','Pak','Klng','-','Btg','Ltr','Btr','Jrgen'
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
    if (c.subgroup && c.subgroupCode && !RAB_SUBGROUP_CODE[c.subgroup]) RAB_SUBGROUP_CODE[c.subgroup] = c.subgroupCode;
});

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
    populateGroupOptions();
    await loadSumberDana();
    await loadRabActivities();
    await loadSavedRabList();
    await loadPaguAnggaran(rabYear);
    await fetchUnitsFromServer();
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
                inputManual.style.display = 'block';
                inputManual.focus();
            } else {
                inputManual.style.display = 'none';
            }
        });
    }

    // Handle redirect from pembiayaan page
    const urlParams = new URLSearchParams(window.location.search);
    const kodeUnikFromUrl = urlParams.get('kode_unik');
    const tahunFromUrl = urlParams.get('tahun');

    if (kodeUnikFromUrl && tahunFromUrl) {
        showToast('Mengarahkan ke data RAB dari halaman pembiayaan...', 'success');
        
        // Use a slight delay to ensure the DOM is fully ready
        setTimeout(async () => {
            document.getElementById('select-year').value = tahunFromUrl;
            // onYearChange will trigger data loading for the correct year
            await onYearChange();
            
            // Ensure the select-kode-unik dropdown is populated before setting its value
            const selectKodeUnik = document.getElementById('select-kode-unik');
            if (selectKodeUnik) {
                selectKodeUnik.value = kodeUnikFromUrl;
                // selectRpjm will load the RAB details for the selected item
                await selectRpjm();

                // NEW: Auto-populate form with the first item for editing
                if (rabItems && rabItems.length > 0) {
                    editRabItem(0); // Load the first item into the form for editing
                    showToast('RAB siap untuk diedit.', 'success');
                }
            }

            const formPanel = document.getElementById('rab-form-panel');
            if (formPanel) {
                formPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            
            // Clean the URL to avoid reloading the same item on refresh
            window.history.replaceState({}, document.title, window.location.pathname);
        }, 100);
    }
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

async function fetchUnitsFromServer() {
    try {
        const res = await fetch(`${API_URL}/units`);
        const json = await res.json();
        if (json && json.success && Array.isArray(json.units)) {
            // merge server units into customUnits (exclude defaults)
            const serverUnits = json.units.filter(u => !!u && !defaultUnits.includes(u));
            customUnits = [...new Set([...(customUnits || []), ...serverUnits])];
            populateUnitOptions();
            return;
        }
    } catch (err) {
        console.warn('Could not fetch units from server');
    }
}

function addCustomUnit(unit) {
    (async () => {
        unit = String(unit).trim();
        if (!unit) return;
        if (defaultUnits.includes(unit) || customUnits.includes(unit)) {
            return; // Already exists
        }
        
        // optimistically show in UI
        customUnits.push(unit);
        populateUnitOptions();

        // persist to server
        try {
            const res = await fetch(`${API_URL}/units`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: unit })
            });
            const json = await res.json();
            if (json && json.success) {
                return;
            }
            console.warn('Gagal menyimpan unit ke server:', json && json.error);
        } catch (err) {
            console.warn('Failed to save unit to server', err && err.message);
        }
    })();
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

async function loadSumberDana(preselected) {
    const el = document.getElementById('select-sumber-dana');
    el.innerHTML = '<option value="">-- Pilih --</option>';
    try {
        const res = await fetch(`${API_URL}/sumber-dana`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            json.data.forEach(item => el.innerHTML += `<option value="${item}">${item}</option>`);
            autoSelectSumberDana(el, preselected);
            return;
        }
    } catch (error) {
        console.error(error);
    }
    ['ADD (Alokasi Dana Desa)', 'DDS (Dana Desa)', 'APBD', 'APBN'].forEach(item => el.innerHTML += `<option value="${item}">${item}</option>`);
    autoSelectSumberDana(el, preselected);
}

function autoSelectSumberDana(el, sumberText) {
    if (!el || !sumberText) return;
    const s = String(sumberText).trim();
    if (!s) return;
    // Nonaktifkan placeholder "Pilih" bila ada kecocokan
    const matchExact = [...el.options].find(o => o.value === s);
    if (matchExact) {
        el.value = s;
        return;
    }
    // Fallback: cari opsi yang cocok normalisasi (contain-additive, hindari salah-maps ADD/TK)
    const code = normalizeSumberCode(s);
    const fallback = [...el.options].find(o => normalizeSumberCode(o.value) === code);
    if (fallback) {
        el.value = fallback.value;
    }
}

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
    } catch (error) {
        console.error('❌ Error loadRabActivities:', error);
        showToast('Gagal memuat data kegiatan RAB', 'error');
    }
}

function renderRabActivityOptions() {
    const selectElement = document.getElementById('select-kode-unik');
    if (selectElement) {
        selectElement.innerHTML = buildKodeOptionsHtml(rabActivitiesGlobal);
    }
    // Isi juga dropdown kegiatan di dalam form rincian (agar terhindar dari salah pilih)
    const formSelect = document.getElementById('select-kode-unik-form');
    if (formSelect) {
        const current = selectedRpjm ? String(selectedRpjm.kode_unik_full || '').trim() : '';
        formSelect.innerHTML = '<option value="">-- Pilih Kegiatan / Kode Unik --</option>' + buildKodeOptionsHtml(rabActivitiesGlobal, current);
    }
}

// Bangun <option> daftar kegiatan ditarik dari rancangan-rkpdes.
// Label menampilkan [Kode Unik Full] Nama Kegiatan agar mudah dibaca & dipilih.
function buildKodeOptionsHtml(list, selectedKode) {
    let html = '';
    (list || []).forEach(item => {
        const kode = String(item.kode_unik_full || item.kode_unik || '').trim();
        const nama = item.nama_kegiatan || item.sub_kegiatan || 'Kegiatan Tanpa Nama';
        const label = kode ? `[${kode}] ${nama}` : nama;
        const isSel = selectedKode && kode === selectedKode ? ' selected' : '';
        html += `<option value="${kode}"${isSel}>${label}</option>`;
    });
    return html;
}

// Dipanggil saat user memilih kegiatan dari dropdown di form rincian.
function pilihKegiatanDariForm() {
    const formSelect = document.getElementById('select-kode-unik-form');
    if (!formSelect) return;
    const val = formSelect.value;
    const topSelect = document.getElementById('select-kode-unik');
    if (topSelect) topSelect.value = val;
    const search = document.getElementById('search-rpjm');
    if (search) search.value = '';
    selectRpjm();
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
            const k1 = String(item.kode_unik_full || '').toLowerCase();
            const nm = String(item.nama_kegiatan || '').toLowerCase();
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
        const current = selectedRpjm ? String(selectedRpjm.kode_unik_full || '').trim() : '';
        formSelect.innerHTML = '<option value="">-- Pilih Kegiatan / Kode Unik --</option>' + buildKodeOptionsHtml(itemsToRender, current);
    }
}

async function onYearChange() { // Make it async
    rabYear = parseInt(document.getElementById('select-year').value, 10) || 2027;
    selectedRpjm = null;
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

async function selectRpjm() {
    const selectKode = document.getElementById('select-kode-unik');
    if (!selectKode) return;
    const selectedValue = String(selectKode.value || '').trim();

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

    selectedRpjm = rabActivitiesGlobal.find(item => String(item.kode_unik_full || '').trim() === selectedValue) || null;

    // Fallback: jika kode tak dikenal di daftar kegiatan, gunakan baris RAB tersimpan
    // agar form tetap bisa dibuka/loaded dari daftar "Buka".
    if (!selectedRpjm) {
        selectedRpjm = savedRabList.find(r => String(r.kode_unik_full || r.kode_unik || '').trim() === selectedValue) || null;
    }

    if (!selectedRpjm) {
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
        const jenisBid = selectedRpjm.jenis_bid || selectedRpjm.jenis_bidang || selectedRpjm.sub_bidang || selectedRpjm.jenis_sub_bidang || '-';
        const jenisKeg = selectedRpjm.jenis_kegiatan || selectedRpjm.nama_kegiatan || '-';
        summaryContainer.innerHTML = `
            <div class="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
                <div class="text-xs font-extrabold text-indigo-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <i class="fas fa-check-circle"></i> Data Kegiatan RAB Terpilih
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div><span class="text-slate-500 font-medium">Kode Unik:</span> <strong class="text-slate-800 font-mono bg-slate-100 px-2 py-0.5 rounded">${selectedRpjm.kode_unik_full || '-'}</strong></div>
                    <div class="md:col-span-2"><span class="text-slate-500 font-medium">Nama Kegiatan:</span> <strong class="text-slate-800 font-semibold">${selectedRpjm.nama_kegiatan || '-'}</strong></div>
                    <div><span class="text-slate-500 font-medium">Bidang:</span> <span class="text-slate-700">${getNamaBidangFull(selectedRpjm.bidang, selectedRpjm.kode_unik_full)}</span></div>
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
}

function getStorageKey() {
    if (!selectedRpjm) return null;
    return `rab_${selectedRpjm.kode_unik_full}_${rabYear}`;
}

async function loadSavedRAB() {
    const key = getStorageKey();
    if (!key) return;

    try {
        const url = `${API_URL}/rab?kode_unik_full=${encodeURIComponent(selectedRpjm.kode_unik_full)}&tahun=${encodeURIComponent(rabYear)}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.success) {
            rabItems = (json.data && json.data.items) ? json.data.items : [];
            renderRabItems();
            return;
        }
    } catch (error) {
        console.warn('Gagal memuat RAB server', error);
    }

    rabItems = [];
    renderRabItems();
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

function sortHierarchical(dataArray) {
    if (!Array.isArray(dataArray)) return dataArray;
    return dataArray.sort((a, b) => {
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
        return hA.kUnik.localeCompare(hB.kUnik, undefined, { numeric: true, sensitivity: 'base' });
    });
}

async function loadSavedRabList() {
    try {
        const res = await fetch(`${API_URL}/rab/list`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
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
            const namaKegiatan = item.nama_kegiatan || item.jenis_kegiatan || item.rpjm_data?.nama_kegiatan || item.rpjm_data?.jenis_kegiatan || '-';
            const jenisBidang = item.jenis_bid || item.jenis_bidang || item.rpjm_data?.jenis_bidang || '-';
            const jenisKegiatan = item.jenis_kegiatan || item.rpjm_data?.jenis_kegiatan || '-';
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
    document.getElementById('select-year').value = year;
    rabYear = Number(year);
    await loadRabActivities();
    document.getElementById('search-rpjm').value = '';

    // Jika kode tidak ada di daftar kegiatan (mis. tahun berbeda / kode tak dikenal),
    // tambahkan ke daftar agar dropdown & form selalu bisa memuat RAB tersimpan tsb.
    const existsInGlobal = rabActivitiesGlobal.some(item => String(item.kode_unik_full || '').trim() === String(kode).trim());
    if (!existsInGlobal) {
        const savedRow = savedRabList.find(r => String(r.kode_unik_full || r.kode_unik || '').trim() === String(kode).trim());
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

    document.getElementById('select-kode-unik').value = kode;

    const found = rabActivitiesGlobal.find(item => String(item.kode_unik_full || '').trim() === String(kode).trim());
    if (!found) {
        const savedRow = savedRabList.find(r => String(r.kode_unik_full || r.kode_unik || '').trim() === String(kode).trim());
        selectedRpjm = savedRow ? { ...savedRow, kode_unik_full: kode } : null;
    }

    selectRpjm();
    await loadSavedRAB();

    // Auto-populate form untuk editing langsung tanpa perlu menekan tombol lain
    if (rabItems && rabItems.length > 0) {
        const formPanel = document.getElementById('rab-form-panel');
        if (formPanel) {
            formPanel.classList.remove('hidden');
            formPanel.style.display = 'block';
            if (typeof syncAccSection === 'function') syncAccSection('rab-form-panel');
            setTimeout(() => formPanel.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        }
        editRabItem(0);
        showToast('Form RAB siap diedit. Isi rincian langsung tanpa mencari.', 'success');
    }
}

async function deleteSavedRabItem(kode, year) {
    try {
        const res = await fetch(`${API_URL}/rab?kode_unik_full=${encodeURIComponent(kode)}&tahun=${encodeURIComponent(year)}`, {
            method: 'DELETE'
        });
        const json = await res.json();
        if (json.success) {
            showToast('RAB berhasil dihapus', 'success');
        } else {
            showToast(json.error || 'Gagal menghapus RAB', 'error');
        }
        await loadSavedRabList();
        if (selectedRpjm?.kode_unik_full === kode && rabYear === Number(year)) {
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

async function saveRAB() {
    const selectElem = document.getElementById('select-kode-unik');
    let kodeUnikFix = selectElem ? selectElem.value : '';

    if (!kodeUnikFix || kodeUnikFix.trim() === '') {
        kodeUnikFix = selectedRpjm?.kode_unik_full || '';
    }

    if (!kodeUnikFix || kodeUnikFix.trim() === '') {
        showToast('Kode Unik Kegiatan tidak valid. Silakan pilih kegiatan dari dropdown.', 'error');
        return;
    }

    const activity = selectedRpjm || {};
    const namaBidangFull = getNamaBidangFull(activity.bidang, activity.kode_unik_full || kodeUnikFix);
    
    const totalBiaya = rabItems.reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0);
    const firstItem = rabItems[0] || {};
    const volumeRab = parseFloat(firstItem.volume) || 1;
    const hargaSatuanRab = parseFloat(firstItem.harga) || totalBiaya;
    const totalRab = totalBiaya || (volumeRab * hargaSatuanRab);

    const payload = {
        kode_unik_full: String(activity.kode_unik_full || kodeUnikFix).trim(),
        tahun: Number(rabYear),
        nama_kegiatan: activity.nama_kegiatan || '',
        bidang: namaBidangFull,
        jenis_kegiatan: activity.jenis_kegiatan || '',
        items: rabItems,
        jumlah_anggaran: totalRab,
        volume: volumeRab,
        satuan: firstItem.satuan || 'Paket',
        harga_satuan: hargaSatuanRab,
        sumber_dana: firstItem.sumber || 'DDS',
        rpjm_data: {
            kode_unik_full: String(activity.kode_unik_full || kodeUnikFix).trim(),
            nama_kegiatan: activity.nama_kegiatan || '',
            bidang: namaBidangFull,
            jenis_bidang: activity.jenis_bid || activity.jenis_bidang || '',
            jenis_kegiatan: activity.jenis_kegiatan || '',
            sumber_dana: firstItem.sumber || 'DDS'
        }
    };
    // Use kode_unik_full as the primary key for the POST request as well
    payload.kode_unik = payload.kode_unik_full;

    console.log("PAYLOAD DIKIRIM KE SUPABASE:", JSON.stringify(payload));

    try {
        const res = await fetch(`${API_URL}/rab`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
            showToast('✅ Data RAB berhasil disimpan ke Supabase!', 'success');
            await loadSavedRabList();
        } else {
            showToast(json.error || json.message || 'Gagal menyimpan RAB ke database', 'error');
            await loadSavedRabList();
        }
    } catch (error) {
        console.error('❌ Error saveRAB:', error);
        showToast('Gagal menyimpan RAB ke database', 'error');
        await loadSavedRabList();
    }
}

function clearRabItems() {
    rabItems = [];
    renderRabItems();
}

function addRabItem() {
    if (!selectedRpjm) {
        showToast('Pilih kegiatan RPJMDes terlebih dahulu', 'error');
        return;
    }
    const group = document.getElementById('select-group').value;
    const subgroup = document.getElementById('select-subgroup').value;
    const uraian = document.getElementById('input-uraian').value.trim();
    const volume = document.getElementById('input-volume').value.trim();
    const satuan = getSatuanValue();
    const hargaRaw = document.getElementById('input-harga')?.value || '';
    const harga = parseNumber(hargaRaw); // parseNumber handles dots (.) as thousands separators
    const sumber = document.getElementById('select-sumber-dana').value;
    const keterangan = document.getElementById('input-keterangan').value.trim();

    if (!group || !subgroup || !uraian || !satuan || !(harga > 0)) {
        showToast('Isi group, sub group, uraian, satuan, dan harga (lebih dari 0) terlebih dahulu', 'error');
        return;
    }

    const volumeNumber = Number(volume.replace(/,/g, '.'));
    const jumlah = Number.isFinite(volumeNumber) && volumeNumber > 0 ? volumeNumber * harga : harga;

    // VALIDASI OVER-BUDGET LOGIC (MENCEGAH OVER-BUDGET)
    const isEditingIdx = (typeof editIndex === 'number' && editIndex >= 0) ? editIndex : -1;
    const isBudgetSafe = validatePaguBudget(rabYear, sumber, jumlah, isEditingIdx);
    if (!isBudgetSafe) {
        return; // BLOK PENYIMPANAN - OVER BUDGET
    }

    const item = { group, subgroup, uraian, volume, satuan, harga, jumlah, sumber, keterangan };
    if (editIndex > -1) {
        rabItems.splice(editIndex, 1, item);
        editIndex = -1;
        const btn = document.getElementById('btn-add-item');
        if (btn) btn.textContent = 'Tambah Item';
        showToast('Perubahan item disimpan', 'success');
    } else {
        rabItems.push(item); // Tampilkan item baru di paling bawah (urutan input)
        showToast('Item RAB berhasil ditambahkan', 'success');
    }
    renderRabItems();
    saveRAB();
    document.getElementById('input-uraian').value = '';
    document.getElementById('input-volume').value = '';
    document.getElementById('input-satuan').value = ''; // Modified line
    document.getElementById('input-harga').value = '';
    document.getElementById('input-keterangan').value = '';
}

function editRabItem(index) {
    const item = rabItems[index];
    if (!item) return;
    document.getElementById('select-group').value = item.group || '';
    onGroupChange();
    document.getElementById('select-subgroup').value = item.subgroup || '';
    document.getElementById('input-uraian').value = item.uraian || '';
    document.getElementById('input-volume').value = item.volume || '';
    document.getElementById('input-satuan').value = item.satuan || ''; // Modified line
    document.getElementById('input-harga').value = item.harga || '';
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
    const btn = document.getElementById('btn-add-item');
    if (btn) btn.textContent = 'Simpan Perubahan';
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

function removeRabItem(index) {
    rabItems.splice(index, 1);
    renderRabItems();
    saveRAB();
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
    const satuanInput = document.getElementById('input-satuan'); // Modified line

    if (uraian) uraian.value = item.uraian || '';
    if (volume) volume.value = (item.volume !== undefined && item.volume !== null && item.volume !== '') ? item.volume : 1;
    if (harga) harga.value = item.harga ? formatRupiah(item.harga) : '';
    if (ket) ket.value = item.keterangan || '';

    if (sumber && item.sumber) {
        if ([...sumber.options].some(o => o.value === item.sumber)) {
            sumber.value = item.sumber;
        } else {
            autoSelectSumberDana(sumber, item.sumber);
        }
    }

    if (satuanInput) satuanInput.value = item.satuan || ''; // Modified line

    // Hentikan mode edit supaya tombol kembali normal
    if (editIndex >= 0) {
        editIndex = -1;
        const btn = document.getElementById('btn-add-item');
        if (btn) btn.textContent = 'Tambah Item RAB';
    }

    showToast('Field item terakhir disalin ke form', 'success');
    if (uraian) { uraian.focus(); uraian.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}

function renderRabItems() {
    const tbody = document.getElementById('rab-items-body');

    const totalBiaya = rabItems.reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0);
    document.getElementById('rab-total-items').textContent = rabItems.length;
    document.getElementById('rab-total-biaya').textContent = `Rp ${formatRupiah(totalBiaya)}`;

    if (!tbody) return;

    if (!rabItems.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-slate-500">Belum ada item RAB. Tambahkan item pertama.</td></tr>';
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
                groupCode: String(RAB_GROUP_CODE[group] || ''),
                subgroupCode: String(RAB_SUBGROUP_CODE[subgroup] || ''),
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
            <tr class="rab-group-row">
                <td colspan="7" class="px-4 py-2 font-extrabold text-sm tracking-wide">
                    <i class="fas fa-folder mr-2"></i> ${groupName}
                </td>
            </tr>`;

        entries.forEach(entry => {
            if (entry.group !== groupName) return;
            const subTotal = entry.items.reduce((s, e) => s + (Number(e.item.jumlah) || 0), 0);
            html += `
                <tr class="rab-subgroup-row">
                    <td colspan="6" class="pl-8 px-4 py-1.5 font-bold text-xs">${entry.subgroup}</td>
                    <td class="text-right pr-3 font-bold text-xs">Rp ${formatRupiah(subTotal)}</td>
                </tr>`;

            entry.items.forEach(({ item, idx }) => {
                runningNo += 1;
                html += `
                    <tr class="rab-item-row">
                        <td class="text-center">${runningNo}</td>
                        <td>${item.uraian}${item.keterangan ? `<div class="text-slate-400 text-xs mt-1">${item.keterangan}</div>` : ''}</td>
                        <td class="text-center">${item.volume || '-'}</td>
                        <td class="text-center">${item.satuan || '-'}</td>
                        <td class="text-right">Rp ${formatRupiah(item.harga)}</td>
                        <td class="text-right">Rp ${formatRupiah(item.jumlah)}</td>
                        <td class="text-center">
                            <button class="btn-outline" style="padding:6px 10px; margin-right:6px;" onclick="editRabItem(${idx})">Edit</button>
                            <button class="btn-outline" style="padding:6px 10px;" onclick="removeRabItem(${idx})">Hapus</button>
                        </td>
                    </tr>`;
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
                .eq('tahun', tahunFilter);

            if (!error && Array.isArray(data)) items = data;
        }

        if (items.length === 0) {
            try {
                const res = await fetch(`/api/rab/list`);
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) items = json.data;
            } catch(e) {}
        }

        // Grouping Unik Berdasarkan Prefix Kode Unik (misal: "01.01.01.")
        const groupMap = new Map();
        
        // Options standar utama
        groupMap.set('01.01.01.', 'Penyediaan Penghasilan Tetap dan Tunjangan Kepala Desa');
        groupMap.set('01.01.02.', 'Penyediaan Penghasilan Tetap dan Tunjangan Perangkat Desa');

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
        selectElem.innerHTML = Array.from(groupMap.entries()).map(([prefix, title]) => 
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

    console.log("LOCAL MEMORY MATCHED ROWS:", matchedRows.length, matchedRows);

    // 2. FALLBACK QUERY DUA/TIGA KOLOM JIKA ARRAY LOCAL KOSONG
    if (matchedRows.length === 0 && (window.supabaseClient || window.supabase)) {
        const client = window.supabaseClient || window.supabase;
        try {
            const prefixClean = targetPrefix.replace(/\.+$/, '');
            let query = client
                .from('rab')
                .select('*')
                .or(`kode_unik.ilike.${targetPrefix}%,kode_unik_full.ilike.${targetPrefix}%,kode_kegiatan.ilike.${targetPrefix}%,kode_unik.ilike.${prefixClean}%,kode_unik_full.ilike.${prefixClean}%`);

            if (!isNaN(tahunNum)) {
                query = query.eq('tahun', tahunNum);
            }

            let { data, error } = await query;
            
            if ((!data || data.length === 0) && !error) {
                // Try without year restriction
                const resNoYear = await client
                    .from('rab')
                    .select('*')
                    .or(`kode_unik.ilike.${targetPrefix}%,kode_unik_full.ilike.${targetPrefix}%,kode_kegiatan.ilike.${targetPrefix}%,kode_unik.ilike.${prefixClean}%,kode_unik_full.ilike.${prefixClean}%`);
                if (resNoYear.data && resNoYear.data.length > 0) data = resNoYear.data;
            }

            if (data && data.length > 0) {
                matchedRows = data;
            } else {
                // Fallback to rkpdes table
                let rkpRes = await client
                    .from('rkpdes')
                    .select('*')
                    .or(`kode_unik.ilike.${targetPrefix}%,kode_unik_full.ilike.${targetPrefix}%,kode_kegiatan.ilike.${targetPrefix}%,kode_unik.ilike.${prefixClean}%,kode_unik_full.ilike.${prefixClean}%`);
                if (rkpRes.data && rkpRes.data.length > 0) {
                    matchedRows = rkpRes.data;
                }
            }
            console.log("SUPABASE MULTI-COLUMN MATCHED ROWS:", matchedRows.length, matchedRows);
        } catch (e) {
            console.warn("Fallback multi-column query error:", e);
        }
    }

    // 3. CETAK TABEL PDF METODE UNPACK RINCIAN ITEMS
    let itemsToPrint = [];

    if (matchedRows && matchedRows.length > 0) {
        matchedRows.forEach(row => {
            let parsedItems = typeof row.items === 'string' ? JSON.parse(row.items || '[]') : (row.items || []);
            
            if (Array.isArray(parsedItems) && parsedItems.length > 0) {
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
                        rpjm_data: it.rpjm_data || row.rpjm_data || null
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

    const selPenandatangan = document.getElementById('selectPenandatangan');
    const inputManual = document.getElementById('inputNamaManual');
    let namaPenandatangan = '';
    if (selPenandatangan) {
        if (selPenandatangan.value === 'manual') {
            namaPenandatangan = inputManual ? inputManual.value.trim() : '';
        } else {
            namaPenandatangan = selPenandatangan.value;
        }
    }
    if (!namaPenandatangan) {
        namaPenandatangan = 'Abdul Azis, S. Pd';
    }

    const inputTanggal = document.getElementById('inputTanggalCetak')?.value;
    let formattedDate = '';
    
    function formatIndonesianDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        const months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        const day = String(date.getDate()).padStart(2, '0');
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    }

    if (inputTanggal) {
        formattedDate = formatIndonesianDate(inputTanggal);
    }
    if (!formattedDate) {
        formattedDate = formatIndonesianDate(new Date());
    }

    const kegiatanTitle = selectedJenisKegiatan || (prefixKode.includes('01.01.01') ? 'Penyediaan Penghasilan Tetap dan Tunjangan Kepala Desa' : (prefixKode.includes('01.01.02') ? 'Penyediaan Penghasilan Tetap dan Tunjangan Perangkat Desa' : 'Rencana Anggaran Biaya Desa'));

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
        if (row.rpjm_data.jenis_kegiatan && !/^\d[\d.]*$/.test(row.rpjm_data.jenis_kegiatan.trim())) {
            return row.rpjm_data.jenis_kegiatan.trim();
        }
        if (row.rpjm_data.nama_kegiatan && !/^\d[\d.]*$/.test(row.rpjm_data.nama_kegiatan.trim())) {
            return row.rpjm_data.nama_kegiatan.trim();
        }
    }

    // 5. Default Nama Group Resmi jika data kosong
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
    Object.keys(groupedData).forEach(gKey => {
        // 1. TAMPILKAN GROUP (Level 1 - Atas) -> bg-slate-200 font-bold
        tbodyRows += `
            <tr style="font-weight: bold; background-color: #e2e8f0;">
                <td colspan="6" style="border: 1px solid #000; padding: 6px 8px; font-weight: bold; font-size: 12px; text-transform: uppercase;">${gKey}</td>
            </tr>
        `;

        Object.keys(groupedData[gKey]).forEach(namaKeg => {
            let repSumber = '';
            const subKeys = Object.keys(groupedData[gKey][namaKeg]);
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

                // RESET ABJAD KE 'a.' HANYA DI SINI (PER SUBGROUP)
                let charIndex = 97; // ASCII 'a'

                groupSubData.items.forEach(it => {
                    const charLabel = String.fromCharCode(charIndex) + '.';
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
                    charIndex++;
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
            
            <div class="signature-section" style="margin-top: 50px; display: flex; justify-content: space-between; page-break-inside: avoid; font-size: 12px; line-height: 1.5;">
                <div style="text-align: center; width: 250px;">
                    <p style="margin: 0 0 75px 0;">Mengetahui,<br><strong>Kepala Desa Batetangnga</strong></p>
                    <p style="margin: 0; text-decoration: underline;"><strong>SUMAILA DAMANG</strong></p>
                </div>
                <div style="text-align: center; width: 250px;">
                    <p style="margin: 0 0 75px 0;">Batetangnga, ${formattedDate}<br>Disusun oleh,<br><strong>Ketua Tim Penyusun RKPDesa</strong></p>
                    <p style="margin: 0; text-decoration: underline;"><strong>${namaPenandatangan}</strong></p>
                </div>
            </div>
            
            <div class="footer no-print" style="margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 10px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b;">
                <div>Dicetak dari sistem SIA Batetangnga</div>
                <div>${new Date().toLocaleDateString('id-ID')}</div>
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
    }
};

async function loadPaguAnggaran(tahunParam) {
    const th = String(tahunParam || rabYear || '2027');
    try {
        const res = await fetch(`${API_URL}/pagu-anggaran?tahun=${th}`);
        const json = await res.json();
        if (json.success && json.data) {
            paguState.tahun = th;
            paguState.data = json.data;
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
                        <span class="text-slate-400 font-semibold">Pagu:</span>
                        <span class="font-extrabold text-slate-800">Rp ${paguVal.toLocaleString('id-ID')}</span>
                    </div>
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

function loadPaguInputForm(th) {
    const data = (paguState.tahun === String(th) && paguState.data) ? paguState.data : {};
    const format = (v) => (v !== undefined && v !== null && Number(v) > 0) ? Number(v).toLocaleString('id-ID') : '';
    const addEl = document.getElementById('paguInput_ADD');
    const ddsEl = document.getElementById('paguInput_DDS');
    const pbhEl = document.getElementById('paguInput_PBH');
    const apbd1El = document.getElementById('paguInput_APBD1');
    const apbd2El = document.getElementById('paguInput_APBD2');
    const padEl = document.getElementById('paguInput_PAD');

    if (addEl) addEl.value = format(data['ADD']);
    if (ddsEl) ddsEl.value = format(data['DDS']);
    if (pbhEl) pbhEl.value = format(data['PBH']);
    if (apbd1El) apbd1El.value = format(data['APBD Tk. I']);
    if (apbd2El) apbd2El.value = format(data['APBD Tk. II']);
    if (padEl) padEl.value = format(data['PAD']);
}

function formatNumberInput(el) {
    let raw = el.value.replace(/[^0-9]/g, '');
    if (raw) {
        el.value = Number(raw).toLocaleString('id-ID');
    } else {
        el.value = '';
    }
}

async function simpanPaguForm() {
    const selTahun = document.getElementById('paguInputTahun');
    const th = selTahun ? selTahun.value : String(rabYear || '2027');

    const parseFormVal = id => {
        const el = document.getElementById(id);
        if (!el) return 0;
        return Number(el.value.replace(/[^0-9]/g, '')) || 0;
    };

    const newPaguData = {
        "ADD": parseFormVal('paguInput_ADD'),
        "DDS": parseFormVal('paguInput_DDS'),
        "PBH": parseFormVal('paguInput_PBH'),
        "APBD Tk. I": parseFormVal('paguInput_APBD1'),
        "APBD Tk. II": parseFormVal('paguInput_APBD2'),
        "PAD": parseFormVal('paguInput_PAD')
    };

    console.log(`📡 Sending Pagu Data to Supabase & Server for year ${th}:`, newPaguData);

    try {
        const res = await fetch(`${API_URL}/pagu-anggaran`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tahun: th, paguData: newPaguData })
        });
        const resJson = await res.json();
        if (resJson.success) {
            console.log("✅ Pagu Anggaran successfully saved to Supabase Database:", resJson);
            showToast(`✅ Pagu Anggaran tahun ${th} berhasil disimpan ke Supabase Database!`, 'success');
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
                const rabKode = String(rab.kode_unik_full || rab.kode_unik || '').trim();
                const curKode = String(selectedRpjm?.kode_unik_full || selectedRpjm?.kode_unik || '').trim();
                if (curKode && rabKode === curKode && String(rab.tahun) === th) {
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
window.tutupModalOverBudget = tutupModalOverBudget;
window.fixRabData = fixRabData;
window.pilihKegiatanDariForm = pilihKegiatanDariForm;
