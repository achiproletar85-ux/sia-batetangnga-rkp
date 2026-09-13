let rkpdesList = [];
let activeYear = 2027;
let currentRkpdesTab = 'murni';
let rkpdesPerubahanList = [];
let rkpdesPerubahanTotals = { semula: 0, menjadi: 0, selisih: 0 };
// Guard anti dobel-panggilan cetak: satu klik tombol cetak tercatat memicu
// window.print() hingga 3x (inline onclick + listener langsung + delegation)
// yang membekukan UI. Nilai = timestamp berikutnya saat tombol boleh cetak lagi.
let _printLockUntil = 0;

const masterBidangList = [
    { key: 1, name: 'Bidang Penyelenggaraan Pemerintahan Desa' },
    { key: 2, name: 'Bidang Pelaksanaan Pembangunan Desa' },
    { key: 3, name: 'Bidang Pembinaan Kemasyarakatan' },
    { key: 4, name: 'Bidang Pemberdayaan Masyarakat' },
    { key: 5, name: 'Bidang Penanggulangan Bencana, Keadaan Darurat Dan Mendesak Desa' }
];

function formatRupiah(num) {
    if (num === 0 || !num) return 'Rp 0';
    return 'Rp ' + Number(num).toLocaleString('id-ID');
}

function formatSelisihRupiah(num) {
    if (num === 0 || !num) return 'Rp 0';
    const n = Number(num);
    const absStr = 'Rp ' + Math.abs(n).toLocaleString('id-ID');
    if (n > 0) return `+${absStr}`;
    return `-${absStr}`;
}

function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `fixed bottom-6 right-6 px-6 py-3 rounded-2xl text-white font-bold shadow-xl z-50 transition-all duration-300 ${
        type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
    }`;
    toast.classList.remove('hidden');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.add('hidden'), 3500);
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        localStorage.removeItem('rkpdes_cache');
    } catch(e) {}
    loadRkpdesData();

    // Event listener eksplisit tombol cetak dengan pencegahan default action
    const btnCetakPerubahan = document.getElementById('btn-cetak-perubahan');
    if (btnCetakPerubahan) {
        btnCetakPerubahan.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            printRkpdesPerubahan(e);
        });
    }

    const btnCetakMurni = document.getElementById('btn-cetak-murni');
    if (btnCetakMurni) {
        btnCetakMurni.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            printRkpdesMurni(e);
        });
    }
});

function getBidangKey(item) {
    if (typeof item.bidang === 'number' && item.bidang >= 1 && item.bidang <= 5) return item.bidang;
    const bNum = parseInt(item.bidang, 10);
    if (!isNaN(bNum) && bNum >= 1 && bNum <= 5) return bNum;

    const bStr = String(item.bidang || '');
    if (bStr.includes('1') || bStr.toLowerCase().includes('penyelenggaraan')) return 1;
    if (bStr.includes('2') || bStr.toLowerCase().includes('pembangunan')) return 2;
    if (bStr.includes('3') || bStr.toLowerCase().includes('pembinaan')) return 3;
    if (bStr.includes('4') || bStr.toLowerCase().includes('pemberdayaan')) return 4;
    if (bStr.includes('5') || bStr.toLowerCase().includes('bencana')) return 5;

    const kode = String(item.kode_unik || item.kode_unik_full || '');
    if (kode.startsWith('01') || kode.startsWith('1.')) return 1;
    if (kode.startsWith('02') || kode.startsWith('2.')) return 2;
    if (kode.startsWith('03') || kode.startsWith('3.')) return 3;
    if (kode.startsWith('04') || kode.startsWith('4.')) return 4;
    if (kode.startsWith('05') || kode.startsWith('5.')) return 5;

    return 1;
}

function deduplicateItems(items) {
    if (!Array.isArray(items)) return [];
    const seen = new Set();
    const result = [];
    for (const item of items) {
        const kode = String(item.kode_unik_full || item.kode_unik || item.id || '').trim();
        if (kode && !seen.has(kode)) {
            seen.add(kode);
            result.push(item);
        } else if (!kode) {
            result.push(item);
        }
    }
    return result;
}

function sortAscendingByKode(dataArray) {
    if (!Array.isArray(dataArray)) return [];
    return [...dataArray].sort((a, b) => {
        const a_kode = String(a.kode_unik_full || a.kode_unik || a.kode || '').trim();
        const b_kode = String(b.kode_unik_full || b.kode_unik || b.kode || '').trim();
        return a_kode.localeCompare(b_kode, undefined, { numeric: true, sensitivity: 'base' });
    });
}

function getFormattedDate() {
    const inputDate = document.getElementById('input-tanggal-rkp')?.value;
    if (inputDate) {
        const [year, month, day] = inputDate.split('-');
        if (year && month && day) {
            const d = new Date(Number(year), Number(month) - 1, Number(day));
            if (!isNaN(d.getTime())) {
                return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            }
        }
    }
    const today = new Date();
    return today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getTimPenyusunInfo() {
    const select = document.getElementById('select-tim-penyusun');
    const val = select ? select.value : '';

    if (val === 'manual') {
        const nama = document.getElementById('input-nama-manual-tim')?.value?.trim() || 'ABDUL AZIS SPM';
        const jabatan = document.getElementById('input-jabatan-manual-tim')?.value?.trim() || 'Ketua Tim Penyusun RKPDesa';
        return { nama, jabatan };
    }

    if (val && val.includes('|')) {
        const parts = val.split('|');
        return { nama: parts[0], jabatan: parts[1] };
    }

    return { nama: 'ABDUL AZIS SPM', jabatan: 'Ketua Tim Penyusun RKPDesa' };
}

function toggleManualTimPenyusun() {
    const select = document.getElementById('select-tim-penyusun');
    const container = document.getElementById('manual-tim-container');
    if (select && container) {
        if (select.value === 'manual') {
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }
    }
    if (currentRkpdesTab === 'perubahan') {
        if (rkpdesPerubahanList && rkpdesPerubahanList.length > 0) {
            renderRkpdesPerubahanPreview();
        }
    } else {
        updateLivePreview();
    }
}

function parsePenerimaManfaat(item) {
    // Prioritas: total_manfaat (int4 rpjmdes_standar), lalu penerima_manfaat, lalu sasaran_manfaat
    let rawVal = item.total_manfaat;
    if (rawVal === undefined || rawVal === null || rawVal === '') {
        rawVal = item.penerima_manfaat || item.sasaran_manfaat || item.rpjm_data?.total_manfaat || '';
    }
    if (typeof rawVal === 'number' && !isNaN(rawVal)) {
        return `${rawVal} Orang`;
    }
    if (typeof rawVal === 'string') {
        // Try to extract total from sasaran_manfaat format
        const totalMatch = rawVal.match(/Total:\s*(\d+)/i);
        if (totalMatch) {
            return `${totalMatch[1]} Orang`;
        }
        const matches = rawVal.match(/\d+/g);
        if (matches && matches.length > 0) {
            const sum = matches.reduce((acc, curr) => acc + Number(curr), 0);
            return `${sum} Orang`;
        }
        return `${rawVal}`;
    }
    return '-';
}

async function loadRkpdesData() {
    activeYear = Number(document.getElementById('select-year')?.value) || 2027;
    const container = document.getElementById('livePreviewContainer');
    if (!container) return;
    container.innerHTML = `
        <div class="text-center py-12 text-slate-400">
            <i class="fas fa-circle-notch animate-spin text-3xl mb-4"></i>
            <p>Mengambil data RKPDesa Tahun ${activeYear}...</p>
        </div>
    `;

    try {
        const res = await fetch(`/api/rkpdes?tahun=${activeYear}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            rkpdesList = sortAscendingByKode(deduplicateItems(json.data));
            updateLivePreview();
        } else {
            rkpdesList = [];
            updateLivePreview();
        }
    } catch (err) {
        container.innerHTML = `<div class="text-center py-8 text-red-500 font-bold">❌ Gagal koneksi ke server: ${err.message}</div>`;
    }
}

function cleanKodeUnik(code) {
    if (!code) return '';
    let str = String(code).trim();
    if (str.includes('..')) {
        str = str.split('..')[0].trim();
    }
    return str.replace(/\.+$/, '');
}

function groupItemsByNamaKegiatan(items) {
    if (!Array.isArray(items)) return [];
    const map = new Map();

    items.forEach(item => {
        let rpjmObj = {};
        if (typeof item.rpjm_data === 'string') {
            try { rpjmObj = JSON.parse(item.rpjm_data); } catch(e) {}
        } else if (typeof item.rpjm_data === 'object' && item.rpjm_data !== null) {
            rpjmObj = item.rpjm_data;
        }

        const jenisBidang = String(item.jenis_bidang || rpjmObj.jenis_bidang || item.sub_bidang || '').trim();
        const namaKegiatan = String(item.jenis_kegiatan || rpjmObj.nama_kegiatan || item.nama_kegiatan || '-').trim();
        const rawKode = cleanKodeUnik(item.kode_unik_full || item.kode_unik || item.kode || item.id || '');
        const groupKey = (namaKegiatan && namaKegiatan !== '-') ? namaKegiatan.toLowerCase() : rawKode;

        if (!map.has(groupKey)) {
            map.set(groupKey, {
                ...item,
                _subItems: [item],
                _mergedBiaya: Number(item.prakiraan_biaya || 0),
                _namaKegiatan: namaKegiatan,
                _jenisBidang: jenisBidang,
                _displayKode: cleanKodeUnik(item.kode_unik_full || item.kode_unik || item.kode || '')
            });
        } else {
            const existing = map.get(groupKey);
            existing._subItems.push(item);
            existing._mergedBiaya += Number(item.prakiraan_biaya || 0);

            if (!existing._jenisBidang && jenisBidang) {
                existing._jenisBidang = jenisBidang;
            }
            if (!existing._displayKode && (item.kode_unik_full || item.kode_unik || item.kode)) {
                existing._displayKode = cleanKodeUnik(item.kode_unik_full || item.kode_unik || item.kode || '');
            }
            if ((!existing.data_eksisting || existing.data_eksisting === '-') && (item.data_eksisting && item.data_eksisting !== '-')) {
                existing.data_eksisting = item.data_eksisting;
            }
            if ((!existing.target_capaian || existing.target_capaian === '-') && (item.target_capaian && item.target_capaian !== '-')) {
                existing.target_capaian = item.target_capaian;
            }
            if ((!existing.lokasi || existing.lokasi === '-') && (item.lokasi && item.lokasi !== '-')) {
                existing.lokasi = item.lokasi;
            }
            if ((!existing.sumber_pembiayaan || existing.sumber_pembiayaan === 'DDS') && (item.sumber_pembiayaan && item.sumber_pembiayaan !== 'DDS')) {
                existing.sumber_pembiayaan = item.sumber_pembiayaan;
            }
            if ((!existing.mendukung_sdgs || existing.mendukung_sdgs === '-') && (item.mendukung_sdgs && item.mendukung_sdgs !== '-')) {
                existing.mendukung_sdgs = item.mendukung_sdgs;
            }
            if (existing.verifikasi_proposal === 'Belum' && item.verifikasi_proposal === 'Ya') {
                existing.verifikasi_proposal = item.verifikasi_proposal;
            }
            if (existing.stunting === 'Tidak' && item.stunting === 'Ya') {
                existing.stunting = item.stunting;
            }
        }
    });

    return Array.from(map.values());
}

function resolveJenisBidangFallback(item) {
    let rpjmObj = {};
    if (typeof item.rpjm_data === 'string') {
        try { rpjmObj = JSON.parse(item.rpjm_data); } catch(e) {}
    } else if (typeof item.rpjm_data === 'object' && item.rpjm_data !== null) {
        rpjmObj = item.rpjm_data;
    }
    const val = (item.jenis_bidang || rpjmObj.jenis_bidang || item.sub_bidang || item._jenisBidang || '').trim();
    if (val && val !== 'Sub Bidang Umum') return val;
    const kode = String(item.kode_unik_full || item.kode_unik || '').trim();
    if (kode.startsWith('01.01.') || kode.startsWith('1.1.')) return 'Penyelenggaran Belanja Siltap, Tunjangan dan Operasional Pemerintahan Desa';
    if (kode.startsWith('01.02.') || kode.startsWith('1.2.')) return 'Penyediaan Sarana Prasarana Pemerintahan Desa';
    if (kode.startsWith('01.03.') || kode.startsWith('1.3.')) return 'Administrasi Kependudukan, Pencatatan Sipil, Statistik dan Kearsipan';
    if (kode.startsWith('01.04.') || kode.startsWith('1.4.')) return 'Penyelenggaraan Tata Praja Pemerintahan, Perencanaan, Keuangan dan Pelaporan';
    if (kode.startsWith('01.05.') || kode.startsWith('1.5.')) return 'Sub Bidang Pertanahan';
    if (kode.startsWith('02.01.') || kode.startsWith('2.1.')) return 'Sub Bidang Pendidikan';
    if (kode.startsWith('02.02.') || kode.startsWith('2.2.')) return 'Sub Bidang Kesehatan';
    if (kode.startsWith('02.03.') || kode.startsWith('2.3.')) return 'Sub Bidang Pekerjaan Umum dan Penataan Ruang';
    if (kode.startsWith('02.04.') || kode.startsWith('2.4.')) return 'Sub Bidang Kawasan Permukiman';
    if (kode.startsWith('02.05.') || kode.startsWith('2.5.')) return 'Sub Bidang Kehutanan dan Lingkungan Hidup';
    if (kode.startsWith('03.01.') || kode.startsWith('3.1.')) return 'Sub Bidang Ketenteraman, Ketertiban Umum, dan Perlindungan Masyarakat';
    if (kode.startsWith('03.02.') || kode.startsWith('3.2.')) return 'Sub Bidang Kebudayaan dan Keagamaan';
    if (kode.startsWith('03.03.') || kode.startsWith('3.3.')) return 'Sub Bidang Kepemudaan dan Olah Raga';
    if (kode.startsWith('03.04.') || kode.startsWith('3.4.')) return 'Sub Bidang Kelembagaan Masyarakat';
    if (kode.startsWith('04.01.') || kode.startsWith('4.1.')) return 'Sub Bidang Pertanian dan Peternakan';
    if (kode.startsWith('04.02.') || kode.startsWith('4.2.')) return 'Sub Bidang Peningkatan Kapasitas Aparatur Desa';
    if (kode.startsWith('04.03.') || kode.startsWith('4.3.')) return 'Sub Bidang Pemberdayaan Perempuan, Perlindungan Anak dan Keluarga';
    if (kode.startsWith('04.04.') || kode.startsWith('4.4.')) return 'Sub Bidang Koperasi, Usaha Mikro Kecil dan Menengah (UMKM)';
    if (kode.startsWith('04.05.') || kode.startsWith('4.5.')) return 'Sub Bidang Dukungan Penanaman Modal';
    if (kode.startsWith('04.06.') || kode.startsWith('4.6.')) return 'Sub Bidang Perdagangan dan Perindustrian';
    if (kode.startsWith('05.01.') || kode.startsWith('5.1.')) return 'Sub Bidang Penanggulangan Bencana';
    if (kode.startsWith('05.02.') || kode.startsWith('5.2.')) return 'Sub Bidang Keadaan Darurat';
    if (kode.startsWith('05.03.') || kode.startsWith('5.3.')) return 'Sub Bidang Keadaan Mendesak';
    return val || 'Penyelenggaran Belanja Siltap, Tunjangan dan Operasional Pemerintahan Desa';
}

function resolveJenisKegiatanKelompokFallback(item) {
    let rpjmObj = {};
    if (typeof item.rpjm_data === 'string') {
        try { rpjmObj = JSON.parse(item.rpjm_data); } catch(e) {}
    } else if (typeof item.rpjm_data === 'object' && item.rpjm_data !== null) {
        rpjmObj = item.rpjm_data;
    }
    const val = (item.jenis_kegiatan_kelompok || item.jenis_kegiatan || rpjmObj.jenis_kegiatan || '').trim();
    if (val && val !== 'Kelompok Kegiatan Umum') return val;
    const kode = String(item.kode_unik_full || item.kode_unik || '').trim();
    if (kode.startsWith('01.01.01.') || kode.startsWith('1.1.1.')) return 'Penyediaan Penghasilan Tetap dan Tunjangan Kepala Desa';
    if (kode.startsWith('01.01.02.') || kode.startsWith('1.1.2.')) return 'Penyediaan Penghasilan Tetap dan Tunjangan Perangkat Desa';
    if (kode.startsWith('01.01.03.') || kode.startsWith('1.1.3.')) return 'Penyediaan Jaminan Sosial bagi Kepala Desa dan Perangkat Desa';
    if (kode.startsWith('01.01.04.') || kode.startsWith('1.1.4.')) return 'Penyediaan Operasional Pemerintah Desa (ATK, Honor PKPKD dan PPKD dll)';
    return val || 'Kelompok Kegiatan Utama';
}

// Membangun HTML lembar RKPDes MURNI (matriks 13 kolom) — murni string, tanpa menyentuh DOM.
function buildRkpdesMurniHtml() {
    // Tanpa data: kembalikan string kosong (pemanggil merender placeholder sendiri)
    if (!Array.isArray(rkpdesList) || rkpdesList.length === 0) return '';
    // Grouping by Bidang (1 s.d 5)
    const grouped = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    (rkpdesList || []).forEach(item => {
        const key = getBidangKey(item);
        if (grouped[key]) {
            grouped[key].push(item);
        } else {
            grouped[1].push(item);
        }
    });

    let tableBodyHtml = '';
    let grandTotalBiaya = 0;
    let globalNo = 1;

    masterBidangList.forEach(bidang => {
        const rawItems = sortAscendingByKode(grouped[bidang.key] || []);
        let subTotalBiaya = 0;

        if (rawItems.length > 0) {
            const currentNo = globalNo++;
            
            // Build hierarchy map: Sub-Bidang -> Kelompok Kegiatan -> Activities
            const subMap = new Map();
            rawItems.forEach(item => {
                let rpjmObj = {};
                if (typeof item.rpjm_data === 'string') {
                    try { rpjmObj = JSON.parse(item.rpjm_data); } catch(e) {}
                } else if (typeof item.rpjm_data === 'object' && item.rpjm_data !== null) {
                    rpjmObj = item.rpjm_data;
                }

                const subName = resolveJenisBidangFallback(item);
                const kelName = resolveJenisKegiatanKelompokFallback(item);

                const subKey = subName || 'Penyelenggaran Belanja Siltap, Tunjangan dan Operasional Pemerintahan Desa';
                const kelKey = kelName || 'Kelompok Kegiatan Utama';

                if (!subMap.has(subKey)) subMap.set(subKey, new Map());
                const kelMap = subMap.get(subKey);
                if (!kelMap.has(kelKey)) kelMap.set(kelKey, []);
                kelMap.get(kelKey).push({ ...item, _rpjmObj: rpjmObj });
            });

            // Calculate total rows for Bidang cell rowspan
            let totalRowsInBidang = 0;
            subMap.forEach((kelMap, subName) => {
                if (subName) totalRowsInBidang++;
                kelMap.forEach((items, kelName) => {
                    if (kelName && kelName !== subName) totalRowsInBidang++;
                    totalRowsInBidang += items.length;
                });
            });

            if (totalRowsInBidang === 0) totalRowsInBidang = rawItems.length;

            let isFirstRowInBidang = true;

            subMap.forEach((kelMap, subName) => {
                // Render Sub-Bidang Header Row (Level 2)
                if (subName) {
                    tableBodyHtml += `
                        <tr class="bg-indigo-50/90 font-bold text-indigo-950 border border-slate-300">
                            ${isFirstRowInBidang ? `<td rowspan="${totalRowsInBidang}" class="text-center align-top border border-slate-300 font-bold py-2 px-1 bg-white text-slate-800">${currentNo}</td>` : ''}
                            ${isFirstRowInBidang ? `<td rowspan="${totalRowsInBidang}" class="align-top border border-slate-300 font-bold bg-white text-slate-900 px-3 py-2 leading-snug">${bidang.key}. ${bidang.name}</td>` : ''}
                            <td colspan="12" class="align-top border border-slate-300 px-3 py-1.5 text-xs text-indigo-950 font-extrabold uppercase tracking-wide bg-indigo-50/90">
                                <i class="fas fa-folder-open text-indigo-600 mr-1.5"></i> ${subName}
                            </td>
                        </tr>
                    `;
                    isFirstRowInBidang = false;
                }

                kelMap.forEach((items, kelName) => {
                    // Render Kelompok Kegiatan Header Row (Level 3)
                    if (kelName && kelName !== subName) {
                        tableBodyHtml += `
                            <tr class="bg-slate-100/90 font-semibold text-slate-800 border border-slate-300">
                                ${isFirstRowInBidang ? `<td rowspan="${totalRowsInBidang}" class="text-center align-top border border-slate-300 font-bold py-2 px-1 bg-white text-slate-800">${currentNo}</td>` : ''}
                                ${isFirstRowInBidang ? `<td rowspan="${totalRowsInBidang}" class="align-top border border-slate-300 font-bold bg-white text-slate-900 px-3 py-2 leading-snug">${bidang.key}. ${bidang.name}</td>` : ''}
                                <td colspan="12" class="align-top border border-slate-300 px-5 py-1 text-[11px] text-slate-800 font-bold italic bg-slate-100/90">
                                    <i class="fas fa-caret-right text-slate-500 mr-1.5"></i> ${kelName}
                                </td>
                            </tr>
                        `;
                        isFirstRowInBidang = false;
                    }

                    // Render Activity Data Rows (Level 4)
                    items.forEach((item, index) => {
                        const biaya = Number(item.prakiraan_biaya || 0);
                        subTotalBiaya += biaya;
                        grandTotalBiaya += biaya;

                        const rpjmObj = item._rpjmObj || {};
                        const rawVol = item.volume || rpjmObj.volume || item.volume_kegiatan || rpjmObj.volume_kegiatan || '1';
                        const rawSat = item.satuan || rpjmObj.satuan || rpjmObj.satuan_rab || 'Kegiatan';
                        const volumeSatuanStr = (String(rawVol).toLowerCase().includes(String(rawSat).toLowerCase()) || !rawSat)
                            ? String(rawVol)
                            : `${rawVol} ${rawSat}`;

                        const penerimaManfaatStr = parsePenerimaManfaat(item);
                        
                        let targetCapaianVal = item.target_capaian || rpjmObj.target_capaian || rpjmObj.target_capaian_kegiatan || item.volume_kegiatan || volumeSatuanStr || '-';
                        if (targetCapaianVal === '-' && volumeSatuanStr !== '-') {
                            targetCapaianVal = volumeSatuanStr;
                        }
                        
                        const rawWaktu = item.waktu_pelaksanaan || rpjmObj.waktu_pelaksanaan || '';
                        const waktuPelaksanaanVal = (rawWaktu && rawWaktu !== String(activeYear)) ? rawWaktu : '12 Bulan';
                        const itemKey = String(item.kode_unik_full || item.kode_unik || item.id || index);
                        const namaKegiatan = item.nama_kegiatan || item._namaKegiatan || item.jenis_kegiatan || rpjmObj.nama_kegiatan || '-';
                        const dataEksistingVal = item.data_eksisting || item.data_existing || rpjmObj.data_eksisting || rpjmObj.data_existing || '-';

                        // ZERO-DEFAULT: jangan pernah mengarang nomor SDGs; tanpa data => '-'
                        let rawSdgs = item.mendukung_sdgs || item.sdgs || rpjmObj.mendukung_sdgs || rpjmObj.sdgs || '';
                        if (rawSdgs && rawSdgs !== '-' && !String(rawSdgs).toLowerCase().includes('sdg') && !isNaN(Number(rawSdgs))) {
                            rawSdgs = `SDGs ${rawSdgs}`;
                        }
    const sdgsLabel = (String(rawSdgs).toLowerCase().startsWith('sdg')) ? String(rawSdgs) : ((rawSdgs ? `SDGs ${rawSdgs}` : '-'));
                        const sdgsVal = sdgsLabel;
                        const verifVal = item.verifikasi_proposal || rpjmObj.verifikasi_proposal || 'Belum';
                        const stuntingVal = item.stunting || rpjmObj.stunting || 'Tidak';

                        tableBodyHtml += `
                            <tr class="hover:bg-slate-50/80 transition-colors">
                                ${isFirstRowInBidang ? `<td rowspan="${totalRowsInBidang}" class="text-center align-top border border-slate-300 font-bold py-2 px-1 bg-white text-slate-800">${currentNo}</td>` : ''}
                                ${isFirstRowInBidang ? `<td rowspan="${totalRowsInBidang}" class="align-top border border-slate-300 font-bold bg-white text-slate-900 px-3 py-2 leading-snug">${bidang.key}. ${bidang.name}</td>` : ''}
                                <td class="align-top border border-slate-300 px-3 py-2 text-slate-900 font-semibold pl-6">
                                    ${namaKegiatan}
                                </td>
                                <td class="text-center align-top border border-slate-300 px-2 py-2 font-semibold text-slate-800">${sdgsVal || '-'}</td>
                                <td class="align-top border border-slate-300 px-2 py-2 text-slate-700">${dataEksistingVal || '-'}</td>
                                <td class="align-top border border-slate-300 px-2 py-2 text-slate-700">${targetCapaianVal || '-'}</td>
                                <td class="align-top border border-slate-300 px-2 py-2 text-slate-700">${item.lokasi || item.lokasi_kegiatan || rpjmObj.lokasi_kegiatan || 'Desa Batetangnga'}</td>
                                <td class="text-center align-top border border-slate-300 px-2 py-2 whitespace-nowrap text-slate-800 font-medium">${volumeSatuanStr}</td>
                                <td class="text-center align-top border border-slate-300 px-2 py-2 text-slate-800">${penerimaManfaatStr || '-'}</td>
                                <td class="text-center align-top border border-slate-300 px-2 py-2 whitespace-nowrap text-slate-800">${waktuPelaksanaanVal}</td>
                                <td class="text-center align-top border border-slate-300 px-2 py-2 font-semibold text-slate-700">${item.sumber_pembiayaan || item.sumber_dana || 'DDS'}</td>
                                <td class="text-right align-top border border-slate-300 px-2 py-2 font-bold text-slate-900 whitespace-nowrap">${formatRupiah(biaya)}</td>
                                <td class="text-center align-top border border-slate-300 px-2 py-2 text-slate-700">${item.pola_pelaksanaan || 'Swakelola'}</td>
                                <td class="text-center align-top border border-slate-300 px-2 py-2 no-print whitespace-nowrap">
                                    <div class="text-[11px] leading-snug space-y-0.5 mb-1">
                                        <div><span class="font-bold text-slate-500">Verif:</span> <span class="font-medium ${verifVal === 'Ya' ? 'text-emerald-600 font-bold' : 'text-slate-600'}">${verifVal}</span></div>
                                        <div><span class="font-bold text-slate-500">Stunting:</span> <span class="font-medium ${stuntingVal === 'Ya' ? 'text-rose-600 font-bold' : 'text-slate-600'}">${stuntingVal}</span></div>
                                    </div>
                                    <div class="inline-flex gap-1">
                                        <button onclick="openEditRkpModal('${itemKey}')" class="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-semibold shadow transition-colors" title="Edit Kegiatan"><i class="fas fa-edit"></i> Edit</button>
                                        <button onclick="deleteRkpItem('${itemKey}')" class="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-semibold shadow transition-colors" title="Hapus Kegiatan"><i class="fas fa-trash-alt"></i> Hapus</button>
                                    </div>
                                </td>
                            </tr>
                        `;
                        isFirstRowInBidang = false;
                    });
                });
            });
        } else {
            // Bidang kosong (tanpa kegiatan)
            tableBodyHtml += `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="text-center align-top border border-slate-300 text-slate-400 py-2 px-1">-</td>
                    <td class="align-top border border-slate-300 font-bold bg-white text-slate-900 px-3 py-2 leading-snug">${bidang.key}. ${bidang.name}</td>
                    <td class="text-center align-top border border-slate-300 text-slate-400 py-2 px-2">-</td>
                    <td class="text-center align-top border border-slate-300 text-slate-400 py-2 px-2">-</td>
                    <td class="text-center align-top border border-slate-300 text-slate-400 py-2 px-2">-</td>
                    <td class="text-center align-top border border-slate-300 text-slate-400 py-2 px-2">-</td>
                    <td class="text-center align-top border border-slate-300 text-slate-400 py-2 px-2">-</td>
                    <td class="text-center align-top border border-slate-300 text-slate-400 py-2 px-2">-</td>
                    <td class="text-center align-top border border-slate-300 text-slate-400 py-2 px-2">-</td>
                    <td class="text-center align-top border border-slate-300 text-slate-400 py-2 px-2">-</td>
                    <td class="text-center align-top border border-slate-300 text-slate-400 py-2 px-2">-</td>
                    <td class="text-right align-top border border-slate-300 text-slate-400 font-medium py-2 px-2 whitespace-nowrap">Rp 0</td>
                    <td class="text-center align-top border border-slate-300 text-slate-400 py-2 px-2">-</td>
                    <td class="text-center align-top border border-slate-300 text-slate-400 py-2 px-2 no-print">-</td>
                </tr>
            `;
        }

        // Subtotal per Bidang
        tableBodyHtml += `
            <tr class="font-bold bg-slate-100 text-slate-800">
                <td colspan="10" class="text-right uppercase border border-slate-300 px-3 py-2">JUMLAH ${bidang.name}</td>
                <td class="border border-slate-300 px-3 py-2"></td>
                <td class="text-right border border-slate-300 px-3 py-2 font-extrabold text-indigo-900 whitespace-nowrap">${formatRupiah(subTotalBiaya)}</td>
                <td class="border border-slate-300"></td>
                <td class="border border-slate-300 no-print"></td>
            </tr>
        `;
    });

    const formattedDate = getFormattedDate();
    const timInfo = getTimPenyusunInfo();

    return `
        <!-- HEADER METADATA DESA -->
        <div class="mb-6 text-slate-900">
            <div class="text-center mb-4">
                <h3 class="font-extrabold text-xl uppercase tracking-wide text-slate-900">RENCANA KERJA PEMERINTAH DESA (RKP-DESA)</h3>
                <h4 class="font-bold text-lg uppercase text-slate-700">TAHUN ANGGARAN ${activeYear}</h4>
            </div>

            <div class="border-t-2 border-b-2 border-slate-900 py-3 my-4 text-xs font-bold uppercase leading-relaxed flex justify-between items-center px-2">
                <div class="space-y-1">
                    <div class="flex"><span class="w-24 inline-block">DESA</span><span class="mr-2">:</span><span>BATETANGNGA</span></div>
                    <div class="flex"><span class="w-24 inline-block">KECAMATAN</span><span class="mr-2">:</span><span>BINUANG</span></div>
                </div>
                <div class="space-y-1">
                    <div class="flex"><span class="w-24 inline-block">KABUPATEN</span><span class="mr-2">:</span><span>POLEWALI MANDAR</span></div>
                    <div class="flex"><span class="w-24 inline-block">PROVINSI</span><span class="mr-2">:</span><span>SULAWESI BARAT</span></div>
                </div>
            </div>
        </div>

        <!-- TABEL RKPDes MATRIKS -->
        <div class="overflow-x-auto shadow-sm rounded-xl border border-slate-300 bg-white">
            <table class="w-full border-collapse border border-slate-300 text-xs">
                <thead class="bg-slate-100 font-bold text-slate-800">
                    <tr class="text-center">
                        <th class="border border-slate-300 align-middle py-2.5 px-2 bg-slate-100" rowspan="2" style="width: 40px; min-width: 40px;">No.<br><span class="text-[10px] font-normal text-slate-500">(a)</span></th>
                        <th class="border border-slate-300 align-middle py-2.5 px-3 bg-slate-100" rowspan="2" style="width: 200px; min-width: 180px;">Bidang<br><span class="text-[10px] font-normal text-slate-500">(b)</span></th>
                        <th class="border border-slate-300 align-middle py-2.5 px-3 bg-slate-100" rowspan="2" style="min-width: 220px;">Jenis Kegiatan<br><span class="text-[10px] font-normal text-slate-500">(c)</span></th>
                        <th class="border border-slate-300 align-middle py-2.5 px-2 bg-slate-100" rowspan="2" style="width: 120px; min-width: 110px;">SDGs Ke-<br><span class="text-[10px] font-normal text-slate-500">(e)</span></th>
                        <th class="border border-slate-300 align-middle py-2.5 px-2 bg-slate-100" rowspan="2" style="width: 130px; min-width: 110px;">Data Eksisting<br><span class="text-[10px] font-normal text-slate-500">(d)</span></th>
                        <th class="border border-slate-300 align-middle py-2.5 px-2 bg-slate-100" rowspan="2" style="width: 110px; min-width: 100px;">Target Capaian<br><span class="text-[10px] font-normal text-slate-500">(f)</span></th>
                        <th class="border border-slate-300 align-middle py-2.5 px-2 bg-slate-100" rowspan="2" style="width: 130px; min-width: 110px;">Lokasi<br><span class="text-[10px] font-normal text-slate-500">(g)</span></th>
                        <th class="border border-slate-300 align-middle py-2.5 px-2 bg-slate-100" rowspan="2" style="width: 110px; min-width: 100px;">Volume &amp; Satuan<br><span class="text-[10px] font-normal text-slate-500">(h)</span></th>
                        <th class="border border-slate-300 align-middle py-2.5 px-2 bg-slate-100" rowspan="2" style="width: 120px; min-width: 110px;">Penerima Manfaat<br><span class="text-[10px] font-normal text-slate-500">(i)</span></th>
                        <th class="border border-slate-300 align-middle py-2.5 px-2 bg-slate-100" rowspan="2" style="width: 110px; min-width: 100px;">Waktu Pelaksanaan<br><span class="text-[10px] font-normal text-slate-500">(j)</span></th>
                        <th class="border border-slate-300 py-1.5 px-2 bg-slate-100" colspan="2">Biaya dan Sumber Pembiayaan<br><span class="text-[10px] font-normal text-slate-500">(k &amp; l)</span></th>
                        <th class="border border-slate-300 align-middle py-2.5 px-2 bg-slate-100" rowspan="2" style="width: 110px; min-width: 100px;">Pola Pelaksanaan<br><span class="text-[10px] font-normal text-slate-500">(m)</span></th>
                        <th class="border border-slate-300 align-middle py-2.5 px-2 bg-slate-100 no-print" rowspan="2" style="width: 120px; min-width: 110px;">Aksi</th>
                    </tr>
                    <tr class="text-center">
                        <th class="border border-slate-300 py-1.5 px-2 bg-slate-100" style="width: 90px; min-width: 80px;">Sumber Biaya</th>
                        <th class="border border-slate-300 py-1.5 px-2 bg-slate-100" style="width: 130px; min-width: 110px;">Jumlah (Rp)</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableBodyHtml}
                </tbody>
                <tfoot>
                    <tr class="font-extrabold bg-slate-800 text-white text-sm">
                        <td colspan="10" class="text-center uppercase border border-slate-900 py-3">JUMLAH TOTAL</td>
                        <td class="border border-slate-900 py-3 px-2"></td>
                        <td class="text-right border border-slate-900 py-3 px-2 whitespace-nowrap text-amber-300 font-extrabold">${formatRupiah(grandTotalBiaya)}</td>
                        <td class="border border-slate-900"></td>
                        <td class="border border-slate-900 no-print"></td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <!-- FOOTER TANDA TANGAN -->
        <div class="mt-12 flex justify-between text-sm text-slate-900" style="page-break-inside: avoid;">
            <div class="text-center w-64">
                <p>Mengetahui,</p>
                <p class="font-bold uppercase">Kepala Desa Batetangnga</p>
                <div style="height: 70px;"></div>
                <p class="font-bold underline uppercase">SUMAILA DAMANG</p>
            </div>
            <div class="text-center w-64">
                <p>Batetangnga, ${formattedDate}</p>
                <p>Disusun Oleh,</p>
                <p class="font-bold uppercase">${timInfo.jabatan}</p>
                <div style="height: 70px;"></div>
                <p class="font-bold underline uppercase">${timInfo.nama}</p>
            </div>
        </div>
    `;
}
window.buildRkpdesMurniHtml = buildRkpdesMurniHtml;

function renderRkpdesMurniPreview() {
    const container = document.getElementById('livePreviewContainer');
    if (!container) return;
    container.innerHTML = buildRkpdesMurniHtml();
}
window.renderRkpdesMurniPreview = renderRkpdesMurniPreview;

function updateLivePreview() {
    if (currentRkpdesTab === 'perubahan') {
        if (rkpdesPerubahanList && rkpdesPerubahanList.length > 0) renderRkpdesPerubahanPreview();
        return;
    }
    const html = buildRkpdesMurniHtml();
    if (!html) return;
    const container = document.getElementById('livePreviewContainer');
    if (container) container.innerHTML = html;
}
window.updateLivePreview = updateLivePreview;

function openEditRkpModal(key) {
    const item = rkpdesList.find(x => String(x.kode_unik_full || x.kode_unik || x.id) === String(key));
    if (!item) return;

    document.getElementById('edit-rkp-id').value = item.id || '';
    document.getElementById('edit-rkp-kode').value = item.kode_unik_full || item.kode_unik || key;
    document.getElementById('edit-rkp-kode-display').value = item.kode_unik_full || item.kode_unik || key;
    document.getElementById('edit-rkp-bidang').value = getBidangKey(item);
    document.getElementById('edit-rkp-jenis-kegiatan').value = item.jenis_kegiatan || '';
    document.getElementById('edit-rkp-sdgs').value = item.mendukung_sdgs || item.sdgs || '';
    document.getElementById('edit-rkp-verifikasi-proposal').value = item.verifikasi_proposal || 'Belum';
    document.getElementById('edit-rkp-stunting').value = item.stunting || 'Tidak';
    document.getElementById('edit-rkp-lokasi').value = item.lokasi || item.lokasi_kegiatan || 'Desa Batetangnga';
    document.getElementById('edit-rkp-data-eksisting').value = item.data_eksisting || item.data_existing || '';
    
    document.getElementById('edit-rkp-target-capaian').value = item.target_capaian || item.volume_kegiatan || item.volume || '';
    
    document.getElementById('edit-rkp-volume').value = item.volume || '1';
    document.getElementById('edit-rkp-satuan').value = item.satuan || 'Kegiatan';
    document.getElementById('edit-rkp-biaya').value = item.prakiraan_biaya || 0;
    
    // Parse manfaat from sasaran_manfaat / total_manfaat
    let mVal = (item.total_manfaat != null && item.total_manfaat > 0) ? String(item.total_manfaat) : (item.sasaran_manfaat || item.penerima_manfaat || '');
    if (typeof mVal === 'string' && mVal.includes('Total:')) {
        const totalMatch = mVal.match(/Total:\s*(\d+)/i);
        mVal = totalMatch ? totalMatch[1] : '';
    } else if (typeof mVal === 'string') {
        const matches = mVal.match(/\d+/g);
        mVal = matches ? matches[0] : '';
    }
    document.getElementById('edit-rkp-manfaat').value = mVal || '1';
    
    const rawWaktu = item.waktu_pelaksanaan || '';
    document.getElementById('edit-rkp-waktu').value = (rawWaktu && rawWaktu !== String(activeYear)) ? rawWaktu : '12 Bulan';
    
    const currentSumber = item.sumber_pembiayaan || 'DDS';
    const selectSumber = document.getElementById('edit-rkp-sumber-biaya');
    if (selectSumber) {
        let matched = false;
        for (let i = 0; i < selectSumber.options.length; i++) {
            if (selectSumber.options[i].value.toLowerCase() === currentSumber.toLowerCase()) {
                selectSumber.selectedIndex = i;
                matched = true;
                break;
            }
        }
        if (!matched) {
            for (let i = 0; i < selectSumber.options.length; i++) {
                if (currentSumber.toLowerCase().includes(selectSumber.options[i].value.toLowerCase())) {
                    selectSumber.selectedIndex = i;
                    matched = true;
                    break;
                }
            }
        }
        if (!matched) selectSumber.value = 'DDS';
    }

    document.getElementById('edit-rkp-pola').value = item.pola_pelaksanaan || 'Swakelola';

    document.getElementById('modalEditRkp').classList.remove('hidden');
}

function closeEditRkpModal() {
    document.getElementById('modalEditRkp').classList.add('hidden');
}

function saveEditRkpItem(event) {
    event.preventDefault();
    const kode = document.getElementById('edit-rkp-kode').value;
    const item = rkpdesList.find(x => String(x.kode_unik_full || x.kode_unik || x.id) === String(kode));
    
    if (!item) {
        showToast('❌ Data tidak ditemukan', 'error');
        return;
    }

    item.data_eksisting = document.getElementById('edit-rkp-data-eksisting').value;
    item.target_capaian = document.getElementById('edit-rkp-target-capaian').value;
    item.sdgs = document.getElementById('edit-rkp-sdgs').value;
    item.mendukung_sdgs = item.sdgs;
    item.verifikasi_proposal = document.getElementById('edit-rkp-verifikasi-proposal').value;
    item.stunting = document.getElementById('edit-rkp-stunting').value;
    
    if (item.rpjm_data) {
        item.rpjm_data.target_capaian = item.target_capaian;
    }

    item.volume = document.getElementById('edit-rkp-volume').value || '1';
    item.satuan = document.getElementById('edit-rkp-satuan').value;
    item.prakiraan_biaya = Number(document.getElementById('edit-rkp-biaya').value) || 0;
    
    const manfaatInput = document.getElementById('edit-rkp-manfaat').value;
    const manfaatNum = Number(manfaatInput) || 0;
    item.sasaran_manfaat = manfaatNum > 0 ? `L: 0, P: 0, RTM: 0 (Total: ${manfaatNum} Orang)` : '-';
    item.total_manfaat = manfaatNum;
    item.penerima_manfaat = manfaatNum > 0 ? `${manfaatNum} Orang` : '-';
    
    const inputWaktu = document.getElementById('edit-rkp-waktu').value;
    item.waktu_pelaksanaan = inputWaktu;
    if (item.rpjm_data) {
        item.rpjm_data.waktu_pelaksanaan = inputWaktu;
    }

    item.sumber_pembiayaan = document.getElementById('edit-rkp-sumber-biaya').value;
    item.pola_pelaksanaan = document.getElementById('edit-rkp-pola').value;
    
    // Save to backend
    try {
        fetch('/api/rkpdes', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        }).then(res => res.json()).then(data => {
            if(data.success) {
                closeEditRkpModal();
                updateLivePreview();
                showToast('✅ Berhasil memperbarui data RKPDesa', 'success');
            } else {
                showToast('❌ Gagal memperbarui di server', 'error');
            }
        });
    } catch(e) {
        showToast('❌ Kesalahan jaringan', 'error');
    }
}

async function importRkpdesData() {
    activeYear = Number(document.getElementById('select-year')?.value) || 2027;
    
    const confirmation = confirm(
        `Anda yakin ingin MENGHAPUS SEMUA data RKPDes tahun ${activeYear} dan menggantinya dengan data terbaru dari RAB? \n\nAksi ini tidak dapat dibatalkan.`
    );

    if (!confirmation) {
        showToast('Sinkronisasi dibatalkan.', 'warning');
        return;
    }

    showToast(`Memproses Hapus & Sinkronisasi data RKPDesa Tahun ${activeYear}...`, 'success');
    try {
        const res = await fetch(`/api/rkpdes/clear-and-sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tahun: activeYear })
        });
        const json = await res.json();
        if (json.success) {
            showToast(`✅ Sinkronisasi Berhasil! ${json.message || ''}. Memuat ulang data...`, 'success');
            await loadRkpdesData();
        } else {
            showToast(`❌ Gagal: ${json.error || 'Terjadi kesalahan di server.'}`, 'error');
        }
    } catch (err) {
        showToast(`❌ Gagal terhubung ke server: ${err.message}`, 'error');
    }
}
window.importRkpdesData = importRkpdesData;

async function deleteRkpItem(key) {
    if (!confirm('Apakah Anda yakin ingin menghapus kegiatan ini dari RKPDes? Ini akan menghapusnya dari database.')) return;
    
    const item = rkpdesList.find(x => String(x.kode_unik_full || x.kode_unik || x.id) === String(key));
    if (!item) {
        showToast('❌ Item tidak ditemukan untuk dihapus.', 'error');
        return;
    }

    // Use the database ID for the DELETE request, as it's the most reliable unique identifier.
    const itemId = item.id;
    if (!itemId) {
        showToast('❌ Gagal menghapus: ID item tidak valid.', 'error');
        return;
    }

    try {
        const res = await fetch(`/api/rkpdes?id=${itemId}`, {
            method: 'DELETE'
        });
        const json = await res.json();

        if (json.success) {
            showToast('✅ Kegiatan berhasil dihapus dari database.', 'success');
            // Reload data from the server to ensure the view is consistent
            await loadRkpdesData();
        } else {
            showToast(`❌ Gagal menghapus: ${json.error || 'Terjadi kesalahan di server.'}`, 'error');
        }
    } catch (err) {
        showToast(`❌ Gagal terhubung ke server: ${err.message}`, 'error');
    }
}

function editInRabFromModal() {
    const kode = document.getElementById('edit-rkp-kode')?.value;
    if (kode) {
        window.location.href = `rab.html?kode=${encodeURIComponent(kode)}`;
    } else {
        window.location.href = 'rab.html';
    }
}
window.editInRabFromModal = editInRabFromModal;

async function onYearChange() {
    activeYear = Number(document.getElementById('select-year')?.value) || 2027;
    if (currentRkpdesTab === 'perubahan') {
        await loadRkpdesPerubahanData();
    } else {
        await loadRkpdesData();
    }
}
window.onYearChange = onYearChange;

async function switchRkpdesTab(tab) {
    if (currentRkpdesTab === tab) return; // sudah aktif: cegah re-render penuh yang memblokir main thread
    currentRkpdesTab = tab;
    const btnMurni = document.getElementById('tab-btn-murni');
    const btnPerubahan = document.getElementById('tab-btn-perubahan');
    const badge = document.getElementById('tab-badge-info');

    if (tab === 'perubahan') {
        if (btnMurni) {
            btnMurni.className = 'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 text-slate-700 hover:text-slate-900 cursor-pointer';
        }
        if (btnPerubahan) {
            btnPerubahan.className = 'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-amber-600 text-white shadow-sm cursor-pointer';
        }
        if (badge) {
            badge.className = 'bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 rounded-lg font-bold';
            badge.textContent = 'Mode: RKPDes / RAB Perubahan';
        }
        await loadRkpdesPerubahanData();
    } else {
        if (btnMurni) {
            btnMurni.className = 'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-indigo-600 text-white shadow-sm cursor-pointer';
        }
        if (btnPerubahan) {
            btnPerubahan.className = 'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 text-slate-700 hover:text-slate-900 cursor-pointer';
        }
        if (badge) {
            badge.className = 'bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1 rounded-lg font-bold';
            badge.textContent = 'Mode: RKPDes Murni';
        }
        await loadRkpdesData();
    }
}
window.switchRkpdesTab = switchRkpdesTab;

function getManfaatOverrides(year) {
    try {
        const y = year || activeYear || 2027;
        const raw = localStorage.getItem(`rkpdes_manfaat_overrides_${y}`);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        console.error('Error reading manfaat overrides:', e);
        return {};
    }
}
window.getManfaatOverrides = getManfaatOverrides;

function saveManfaatOverrides(year, overrides) {
    try {
        const y = year || activeYear || 2027;
        localStorage.setItem(`rkpdes_manfaat_overrides_${y}`, JSON.stringify(overrides));
    } catch (e) {
        console.error('Error saving manfaat overrides:', e);
    }
}
window.saveManfaatOverrides = saveManfaatOverrides;

function applyManfaatOverridesToPerubahanList() {
    if (!Array.isArray(rkpdesPerubahanList)) return;
    const overrides = getManfaatOverrides(activeYear);

    rkpdesPerubahanList.forEach(item => {
        if (!item.semula) item.semula = {};
        if (!item.menjadi) item.menjadi = {};

        // 1. Ambil nilai dasar dari SEMULA
        const sL = item.penerima_l_semula ?? item.semula.manfaat_l ?? item.manfaat_l ?? '-';
        const sP = item.penerima_p_semula ?? item.semula.manfaat_p ?? item.manfaat_p ?? '-';
        const sRtm = item.penerima_rtm_semula ?? item.semula.manfaat_rtm ?? item.manfaat_rtm ?? '-';

        item.semula.manfaat_l = sL;
        item.semula.manfaat_p = sP;
        item.semula.manfaat_rtm = sRtm;
        item.penerima_l_semula = sL;
        item.penerima_p_semula = sP;
        item.penerima_rtm_semula = sRtm;

        // 2. Default Fallback Otomatis: Salin dari SEMULA ke MENJADI
        // Jika kolom MENJADI masih kosong, null, undefined, atau '-'
        let mL = item.penerima_l_menjadi ?? item.menjadi.manfaat_l;
        if (!mL || mL === '' || mL === '-') {
            mL = (sL !== '-') ? sL : (mL || '-');
        }

        let mP = item.penerima_p_menjadi ?? item.menjadi.manfaat_p;
        if (!mP || mP === '' || mP === '-') {
            mP = (sP !== '-') ? sP : (mP || '-');
        }

        let mRtm = item.penerima_rtm_menjadi ?? item.menjadi.manfaat_rtm;
        if (!mRtm || mRtm === '' || mRtm === '-') {
            mRtm = (sRtm !== '-') ? sRtm : (mRtm || '-');
        }

        const penerimaL = (mL && mL !== '-') ? mL : (item.penerima_l_menjadi ?? item.penerima_l_semula ?? sL ?? '-');
        const penerimaP = (mP && mP !== '-') ? mP : (item.penerima_p_menjadi ?? item.penerima_p_semula ?? sP ?? '-');
        const penerimaRtm = (mRtm && mRtm !== '-') ? mRtm : (item.penerima_rtm_menjadi ?? item.penerima_rtm_semula ?? sRtm ?? '-');

        item.menjadi.manfaat_l = penerimaL;
        item.menjadi.manfaat_p = penerimaP;
        item.menjadi.manfaat_rtm = penerimaRtm;

        // Set properti eksplisit penerima_*_menjadi sesuai spesifikasi
        item.penerima_l_menjadi = penerimaL;
        item.penerima_p_menjadi = penerimaP;
        item.penerima_rtm_menjadi = penerimaRtm;
        item.menjadi.penerima_l_menjadi = penerimaL;
        item.menjadi.penerima_p_menjadi = penerimaP;
        item.menjadi.penerima_rtm_menjadi = penerimaRtm;

        // 3. Terapkan Override Pengguna jika tersimpan (Mendukung kode titik, tanpa titik, ID string/angka, dan nama kegiatan)
        const key1 = String(item.kode_unik_full || '').trim();
        const keyNorm = key1.replace(/\.+$/, '');
        const keyId = item.id != null ? String(item.id) : '';
        const keyName = String(item.nama_kegiatan || item.jenis_kegiatan || '').trim();

        const ov = (key1 && overrides[key1]) ||
                   (keyNorm && overrides[keyNorm]) ||
                   (keyId && overrides[keyId]) ||
                   (keyName && overrides[keyName]);

        if (ov) {
            if (ov.l !== undefined && ov.l !== '') {
                item.menjadi.manfaat_l = ov.l;
                item.penerima_l_menjadi = ov.l;
                item.menjadi.penerima_l_menjadi = ov.l;
            }
            if (ov.p !== undefined && ov.p !== '') {
                item.menjadi.manfaat_p = ov.p;
                item.penerima_p_menjadi = ov.p;
                item.menjadi.penerima_p_menjadi = ov.p;
            }
            if (ov.rtm !== undefined && ov.rtm !== '') {
                item.menjadi.manfaat_rtm = ov.rtm;
                item.penerima_rtm_menjadi = ov.rtm;
                item.menjadi.penerima_rtm_menjadi = ov.rtm;
            }
            item.menjadi._overridden = true;
        }

        // ZERO-DEFAULT SDGs: fallback lokal (bila penulisan DB gagal) dipulihkan saat reload
        const sdgsOv = (key1 && overrides[`__sdgs__${key1}`]) ||
                       (keyNorm && overrides[`__sdgs__${keyNorm}`]) ||
                       (keyId && overrides[`__sdgs__${keyId}`]);
        if (sdgsOv) {
            if (sdgsOv.semula !== undefined) {
                item.semula.sdgs = sdgsOv.semula ? `SDGs ${sdgsOv.semula}` : '-';
            }
            if (sdgsOv.menjadi !== undefined) {
                item.menjadi.sdgs = sdgsOv.menjadi ? `SDGs ${sdgsOv.menjadi}` : '-';
            }
        }
    });
}
window.applyManfaatOverridesToPerubahanList = applyManfaatOverridesToPerubahanList;

async function loadRkpdesPerubahanData() {
    activeYear = Number(document.getElementById('select-year')?.value) || 2027;
    const container = document.getElementById('livePreviewContainer');
    if (!container) return;
    container.innerHTML = `
        <div class="text-center py-12 text-slate-400">
            <i class="fas fa-circle-notch animate-spin text-3xl mb-4 text-amber-500"></i>
            <p class="font-medium text-slate-600">Mengambil data RKPDes / RAB Perubahan Tahun ${activeYear}...</p>
        </div>
    `;

    try {
        const res = await fetch(`/api/rkpdes/perubahan?tahun=${activeYear}`);
        if (!res.ok) {
            let errMsg = `HTTP ${res.status}`;
            try {
                const errJson = await res.json();
                if (errJson && errJson.error) errMsg += `: ${errJson.error}`;
            } catch (_) {}
            throw new Error(errMsg);
        }
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            rkpdesPerubahanList = json.data;
            rkpdesPerubahanTotals = json.total || { semula: 0, menjadi: 0, selisih: 0 };
            applyManfaatOverridesToPerubahanList();
            renderRkpdesPerubahanPreview();
        } else {
            rkpdesPerubahanList = [];
            rkpdesPerubahanTotals = { semula: 0, menjadi: 0, selisih: 0 };
            renderRkpdesPerubahanPreview();
        }
    } catch (err) {
        console.error('❌ loadRkpdesPerubahanData failed:', err);
        container.innerHTML = `
            <div class="text-center py-12 bg-rose-50 border border-rose-200 rounded-2xl max-w-xl mx-auto my-6 p-6">
                <i class="fas fa-exclamation-triangle text-3xl text-rose-500 mb-3"></i>
                <h4 class="font-bold text-rose-800 text-sm mb-1">Gagal Memuat Data RKPDes Perubahan</h4>
                <p class="text-xs text-rose-600 mb-4">${err.message || 'Terjadi gangguan jaringan atau server.'}</p>
                <button type="button" onclick="loadRkpdesPerubahanData()" class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer">
                    <i class="fas fa-rotate-right mr-1.5"></i> Coba Lagi
                </button>
            </div>
        `;
    }
}
window.loadRkpdesPerubahanData = loadRkpdesPerubahanData;

// Membangun HTML lembar RKPDes PERUBAHAN (matriks 21 kolom SEMULA/MENJADI/SELISIH)
// — murni string, tanpa menyentuh DOM. Dipakai render preview DAN cetak terisolasi.
function buildRkpdesPerubahanHtml() {
    if (!rkpdesPerubahanList || rkpdesPerubahanList.length === 0) return '';
    // Grouping by Bidang (1 s.d 5)
    const grouped = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    rkpdesPerubahanList.forEach(item => {
        const key = getBidangKey(item);
        if (grouped[key]) {
            grouped[key].push(item);
        } else {
            grouped[1].push(item);
        }
    });

    let tableBodyHtml = '';
    let grandTotalSemula = 0;
    let grandTotalMenjadi = 0;
    let grandTotalSelisih = 0;
    let globalNo = 1;

    masterBidangList.forEach(bidang => {
        const rawItems = sortAscendingByKode(grouped[bidang.key] || []);
        let subSemula = 0;
        let subMenjadi = 0;
        let subSelisih = 0;

        if (rawItems.length > 0) {
            const currentNo = globalNo++;

            // Grouping Sub-bidang -> Kelompok Kegiatan -> Kegiatan
            const subMap = new Map();
            rawItems.forEach(item => {
                const subName = item.jenis_bidang || resolveJenisBidangFallback(item) || 'Penyelenggaran Belanja Siltap, Tunjangan dan Operasional Pemerintahan Desa';
                const kelName = resolveJenisKegiatanKelompokFallback(item) || 'Kelompok Kegiatan Utama';

                if (!subMap.has(subName)) subMap.set(subName, new Map());
                const kelMap = subMap.get(subName);
                if (!kelMap.has(kelName)) kelMap.set(kelName, []);
                kelMap.get(kelName).push(item);
            });

            // Bidang Header (1 + 20 = 21 kolom)
            tableBodyHtml += `
                <tr class="bg-slate-200 font-extrabold text-slate-900 border border-slate-400">
                    <td class="text-center align-top border border-slate-400 font-bold py-2 px-1 bg-slate-200 text-slate-900">${currentNo}</td>
                    <td colspan="20" class="align-top border border-slate-400 font-extrabold bg-slate-200 text-slate-900 px-3 py-2 leading-snug uppercase text-xs">
                        ${bidang.key}. ${bidang.name}
                    </td>
                </tr>
            `;

            subMap.forEach((kelMap, subName) => {
                if (subName) {
                    tableBodyHtml += `
                        <tr class="bg-indigo-50/90 font-bold text-indigo-950 border border-slate-400">
                            <td class="border border-slate-400 bg-indigo-50/90"></td>
                            <td colspan="20" class="align-top border border-slate-400 px-4 py-1 text-xs text-indigo-950 font-extrabold uppercase tracking-wide bg-indigo-50/90">
                                <i class="fas fa-folder-open text-indigo-600 mr-1.5"></i> ${subName}
                            </td>
                        </tr>
                    `;
                }

                kelMap.forEach((items, kelName) => {
                    if (kelName && kelName !== subName) {
                        tableBodyHtml += `
                            <tr class="bg-slate-100/90 font-semibold text-slate-800 border border-slate-400">
                                <td class="border border-slate-400 bg-slate-100/90"></td>
                                <td colspan="20" class="align-top border border-slate-400 px-6 py-1 text-[11px] text-slate-800 font-bold italic bg-slate-100/90">
                                    <i class="fas fa-caret-right text-slate-500 mr-1.5"></i> ${kelName}
                                </td>
                            </tr>
                        `;
                    }

                    items.forEach((item, index) => {
                        const semula = item.semula || {};
                        if (!item.menjadi) item.menjadi = {};
                        const menjadi = item.menjadi;

                        const bSemula = Number(semula.biaya || 0);
                        const bMenjadi = Number(menjadi.biaya || 0);
                        const diff = Number(item.selisih != null ? item.selisih : (bMenjadi - bSemula));

                        subSemula += bSemula;
                        subMenjadi += bMenjadi;
                        subSelisih += diff;

                        grandTotalSemula += bSemula;
                        grandTotalMenjadi += bMenjadi;
                        grandTotalSelisih += diff;

                        // OTOMATISASI FALLBACK PENERIMA MANFAAT: SEMULA KE MENJADI
                        // Terapkan logika fallback aktif: const penerimaL = item.penerima_l_menjadi ?? item.penerima_l_semula ?? '-';
                        const sL = item.penerima_l_semula ?? semula.manfaat_l ?? item.manfaat_l ?? '-';
                        const sP = item.penerima_p_semula ?? semula.manfaat_p ?? item.manfaat_p ?? '-';
                        const sRtm = item.penerima_rtm_semula ?? semula.manfaat_rtm ?? item.manfaat_rtm ?? '-';

                        semula.manfaat_l = sL;
                        semula.manfaat_p = sP;
                        semula.manfaat_rtm = sRtm;
                        item.penerima_l_semula = sL;
                        item.penerima_p_semula = sP;
                        item.penerima_rtm_semula = sRtm;

                        // Nilai MENJADI mengambil nilai dari SEMULA sebagai default jika belum diisi/diubah
                        let mL = item.penerima_l_menjadi ?? menjadi.manfaat_l;
                        if (!mL || mL === '' || mL === '-') {
                            mL = (sL !== '-') ? sL : (mL || '-');
                        }

                        let mP = item.penerima_p_menjadi ?? menjadi.manfaat_p;
                        if (!mP || mP === '' || mP === '-') {
                            mP = (sP !== '-') ? sP : (mP || '-');
                        }

                        let mRtm = item.penerima_rtm_menjadi ?? menjadi.manfaat_rtm;
                        if (!mRtm || mRtm === '' || mRtm === '-') {
                            mRtm = (sRtm !== '-') ? sRtm : (mRtm || '-');
                        }

                        const penerimaL = (mL && mL !== '-') ? mL : (item.penerima_l_menjadi ?? item.penerima_l_semula ?? sL ?? '-');
                        const penerimaP = (mP && mP !== '-') ? mP : (item.penerima_p_menjadi ?? item.penerima_p_semula ?? sP ?? '-');
                        const penerimaRtm = (mRtm && mRtm !== '-') ? mRtm : (item.penerima_rtm_menjadi ?? item.penerima_rtm_semula ?? sRtm ?? '-');

                        menjadi.manfaat_l = penerimaL;
                        menjadi.manfaat_p = penerimaP;
                        menjadi.manfaat_rtm = penerimaRtm;
                        item.penerima_l_menjadi = penerimaL;
                        item.penerima_p_menjadi = penerimaP;
                        item.penerima_rtm_menjadi = penerimaRtm;
                        menjadi.penerima_l_menjadi = penerimaL;
                        menjadi.penerima_p_menjadi = penerimaP;
                        menjadi.penerima_rtm_menjadi = penerimaRtm;

                        const rawKey = item.kode_unik_full || (item.id != null ? String(item.id) : null) || item.nama_kegiatan || ('row_' + index);
                        const itemKeyEscaped = String(rawKey).replace(/"/g, '&quot;');
                        const itemId = item.id != null ? String(item.id) : '';
                        const itemKode = String(item.kode_unik_full || item.kode_unik || '').trim();
                        const itemKodeAttr = itemKode.replace(/"/g, '&quot;');

                        const namaKegiatan = item.nama_kegiatan || item.jenis_kegiatan || '-';
                        let statusBadge = '';
                        if (item.status_perubahan === 'bertambah') {
                            statusBadge = '<span class="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold no-print">Bertambah</span>';
                        } else if (item.status_perubahan === 'berkurang') {
                            statusBadge = '<span class="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold no-print">Berkurang</span>';
                        } else if (item.status_perubahan === 'kegiatan_baru') {
                            statusBadge = '<span class="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold no-print">Baru</span>';
                        } else {
                            statusBadge = '<span class="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium no-print">Tetap</span>';
                        }

                        let selisihColor = 'text-slate-700';
                        if (diff > 0) selisihColor = 'text-emerald-700 font-bold';
                        else if (diff < 0) selisihColor = 'text-rose-700 font-bold';

                        tableBodyHtml += `
                            <tr class="hover:bg-slate-50/80 transition-colors" data-item-key="${itemKeyEscaped}" data-id="${itemId}" data-kode="${itemKodeAttr}">
                                <!-- 1. Identifikasi Umum -->
                                <td class="text-center align-top border border-slate-300 text-slate-500 py-1.5 px-1">${index + 1}</td>
                                <td class="align-top border border-slate-300 px-2 py-1.5 text-slate-900 font-semibold pl-6">
                                    <span>${namaKegiatan}</span>
                                    ${statusBadge}
                                    <button type="button"
                                        class="btn-edit-perubahan no-print ml-2 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded px-2 py-0.5 text-[10px] font-bold inline-flex items-center gap-1 shadow-xs transition cursor-pointer"
                                        data-item-key="${itemKeyEscaped}"
                                        data-id="${itemId}"
                                        data-kode="${itemKodeAttr}"
                                        title="Edit Rincian RKPDes / RAB Perubahan (Volume, Anggaran, Lokasi, Sumber Dana, Manfaat, dll)">
                                        <i class="fas fa-edit text-amber-600 pointer-events-none"></i><span class="pointer-events-none">Edit</span>
                                    </button>
                                </td>
                                
                                <!-- 2. Blok SEMULA -->
                                <td class="text-center align-top border border-slate-300 px-1 py-1.5 text-slate-700 whitespace-nowrap">${semula.sdgs || '-'}</td>
                                <td class="align-top border border-slate-300 px-1.5 py-1.5 text-slate-700">${semula.data_eksisting || '-'}</td>
                                <td class="align-top border border-slate-300 px-1.5 py-1.5 text-slate-700">${semula.lokasi || 'Desa Batetangnga'}</td>
                                <td class="text-center align-top border border-slate-300 px-1.5 py-1.5 whitespace-nowrap text-slate-800">${semula.volume_satuan || semula.volume || '-'}</td>
                                <td class="text-center align-top border border-slate-300 px-0.5 py-1.5 text-slate-800">${sL || '-'}</td>
                                <td class="text-center align-top border border-slate-300 px-0.5 py-1.5 text-slate-800">${sP || '-'}</td>
                                <td class="text-center align-top border border-slate-300 px-0.5 py-1.5 text-slate-800">${sRtm || '-'}</td>
                                <td class="text-right align-top border border-slate-300 px-1.5 py-1.5 font-semibold text-slate-900 whitespace-nowrap">${formatRupiah(bSemula)}</td>
                                <td class="text-center align-top border border-slate-300 px-1 py-1.5 text-slate-700 font-medium">${semula.sumber_biaya || 'DDS'}</td>
                                
                                <!-- 3. Blok MENJADI -->
                                <td class="text-center align-top border border-slate-300 px-1 py-1.5 text-slate-700 whitespace-nowrap">${menjadi.sdgs || '-'}</td>
                                <td class="align-top border border-slate-300 px-1.5 py-1.5 text-slate-700">${menjadi.data_eksisting || '-'}</td>
                                <td class="align-top border border-slate-300 px-1.5 py-1.5 text-slate-700">${menjadi.lokasi || 'Desa Batetangnga'}</td>
                                <td class="text-center align-top border border-slate-300 px-1.5 py-1.5 whitespace-nowrap text-slate-800 font-medium">${menjadi.volume_satuan || menjadi.volume || '-'}</td>
                                <td class="text-center align-top border border-slate-300 px-0.5 py-1.5 text-slate-800">
                                    <span class="${menjadi._overridden ? 'text-indigo-700 font-bold' : ''}">${penerimaL || '-'}</span>
                                </td>
                                <td class="text-center align-top border border-slate-300 px-0.5 py-1.5 text-slate-800">
                                    <span class="${menjadi._overridden ? 'text-indigo-700 font-bold' : ''}">${penerimaP || '-'}</span>
                                </td>
                                <td class="text-center align-top border border-slate-300 px-0.5 py-1.5 text-slate-800">
                                    <span class="${menjadi._overridden ? 'text-indigo-700 font-bold' : ''}">${penerimaRtm || '-'}</span>
                                </td>
                                <td class="text-right align-top border border-slate-300 px-1.5 py-1.5 font-bold text-slate-900 whitespace-nowrap">${formatRupiah(bMenjadi)}</td>
                                <td class="text-center align-top border border-slate-300 px-1 py-1.5 text-slate-700 font-medium">${menjadi.sumber_biaya || 'DDS'}</td>
                                
                                <!-- 4. Blok SELISIH -->
                                <td class="text-right align-top border border-slate-300 px-1.5 py-1.5 whitespace-nowrap ${selisihColor}">${formatSelisihRupiah(diff)}</td>
                            </tr>
                        `;
                    });
                });
            });

            // Subtotal per Bidang (2 + 7 + 1 + 1 + 7 + 1 + 1 + 1 = 21 kolom)
            tableBodyHtml += `
                <tr class="font-bold bg-slate-100 text-slate-800 border border-slate-400">
                    <td colspan="2" class="text-left uppercase border border-slate-400 px-3 py-1.5 font-bold">JUMLAH ${bidang.name}</td>
                    <td colspan="7" class="border border-slate-400 bg-slate-50"></td>
                    <td class="text-right border border-slate-400 px-2 py-1.5 font-extrabold text-slate-900 whitespace-nowrap">${formatRupiah(subSemula)}</td>
                    <td class="border border-slate-400 bg-slate-50"></td>
                    <td colspan="7" class="border border-slate-400 bg-slate-50"></td>
                    <td class="text-right border border-slate-400 px-2 py-1.5 font-extrabold text-indigo-900 whitespace-nowrap">${formatRupiah(subMenjadi)}</td>
                    <td class="border border-slate-400 bg-slate-50"></td>
                    <td class="text-right border border-slate-400 px-2 py-1.5 font-extrabold ${subSelisih > 0 ? 'text-emerald-700' : (subSelisih < 0 ? 'text-rose-700' : 'text-slate-700')} whitespace-nowrap">${formatSelisihRupiah(subSelisih)}</td>
                </tr>
            `;
        }
    });

    const formattedDate = getFormattedDate();
    const timInfo = getTimPenyusunInfo();

    return `
        <!-- STATS CARD OVERVIEW (Screen only) -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 no-print">
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between shadow-sm">
                <div>
                    <div class="text-[11px] font-bold text-amber-700 uppercase tracking-wide">Total Anggaran Semula</div>
                    <div class="text-lg font-black text-amber-950 mt-0.5">${formatRupiah(grandTotalSemula)}</div>
                </div>
                <div class="w-10 h-10 rounded-xl bg-amber-200/80 flex items-center justify-center text-amber-800 text-lg shadow-inner">
                    <i class="fas fa-history"></i>
                </div>
            </div>
            <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 flex items-center justify-between shadow-sm">
                <div>
                    <div class="text-[11px] font-bold text-indigo-700 uppercase tracking-wide">Total Anggaran Menjadi</div>
                    <div class="text-lg font-black text-indigo-950 mt-0.5">${formatRupiah(grandTotalMenjadi)}</div>
                </div>
                <div class="w-10 h-10 rounded-xl bg-indigo-200/80 flex items-center justify-center text-indigo-800 text-lg shadow-inner">
                    <i class="fas fa-calculator"></i>
                </div>
            </div>
            <div class="${grandTotalSelisih > 0 ? 'bg-emerald-50 border-emerald-200' : (grandTotalSelisih < 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200')} border rounded-xl p-3.5 flex items-center justify-between shadow-sm">
                <div>
                    <div class="text-[11px] font-bold uppercase tracking-wide ${grandTotalSelisih > 0 ? 'text-emerald-700' : (grandTotalSelisih < 0 ? 'text-rose-700' : 'text-slate-600')}">Total Selisih (+/-)</div>
                    <div class="text-lg font-black mt-0.5 ${grandTotalSelisih > 0 ? 'text-emerald-950' : (grandTotalSelisih < 0 ? 'text-rose-950' : 'text-slate-900')}">${formatSelisihRupiah(grandTotalSelisih)}</div>
                </div>
                <div class="w-10 h-10 rounded-xl ${grandTotalSelisih > 0 ? 'bg-emerald-200/80 text-emerald-800' : (grandTotalSelisih < 0 ? 'bg-rose-200/80 text-rose-800' : 'bg-slate-200 text-slate-700')} flex items-center justify-center text-lg shadow-inner">
                    <i class="fas ${grandTotalSelisih > 0 ? 'fa-arrow-trend-up' : (grandTotalSelisih < 0 ? 'fa-arrow-trend-down' : 'fa-equals')}"></i>
                </div>
            </div>
        </div>

        <!-- A. KOP SURAT & HEADER DOKUMEN RESMI -->
        <div class="mb-6 text-slate-900">
            <div class="text-center mb-4">
                <h3 class="font-extrabold text-xl uppercase tracking-wide text-slate-900">RENCANA KERJA PEMERINTAH DESA PERUBAHAN TAHUN ANGGARAN ${activeYear}</h3>
            </div>

            <div class="border-t-2 border-b-2 border-slate-900 py-3 my-4 text-xs font-bold uppercase leading-relaxed flex justify-between items-center px-2">
                <div class="space-y-1">
                    <div class="flex"><span class="w-24 inline-block">DESA</span><span class="mr-2">:</span><span>BATETANGNGA</span></div>
                    <div class="flex"><span class="w-24 inline-block">KECAMATAN</span><span class="mr-2">:</span><span>BINUANG</span></div>
                </div>
                <div class="space-y-1">
                    <div class="flex"><span class="w-24 inline-block">KABUPATEN</span><span class="mr-2">:</span><span>POLEWALI MANDAR</span></div>
                    <div class="flex"><span class="w-24 inline-block">PROVINSI</span><span class="mr-2">:</span><span>SULAWESI BARAT</span></div>
                </div>
            </div>
        </div>

        <!-- B. STRUKTUR TABEL UTAMA (21 KOLOM BAKU) -->
        <div class="overflow-x-auto shadow-sm rounded-xl border border-slate-400 bg-white">
            <table class="w-full border-collapse border border-slate-400 text-xs">
                <thead class="bg-slate-100 font-bold text-slate-800">
                    <tr class="text-center">
                        <!-- 1. Identifikasi Umum -->
                        <th class="border border-slate-400 align-middle py-2 px-1 bg-slate-100" rowspan="3" style="width: 35px; min-width: 35px;">No.</th>
                        <th class="border border-slate-400 align-middle py-2 px-3 bg-slate-100" rowspan="3" style="min-width: 180px;">Bidang / Jenis Kegiatan</th>
                        
                        <!-- 2. Blok SEMULA -->
                        <th class="border border-slate-400 py-1.5 px-2 bg-amber-50 text-amber-950 font-extrabold uppercase tracking-wide border-b-2 border-amber-300" colspan="9">SEMULA</th>
                        
                        <!-- 3. Blok MENJADI -->
                        <th class="border border-slate-400 py-1.5 px-2 bg-indigo-50 text-indigo-950 font-extrabold uppercase tracking-wide border-b-2 border-indigo-300" colspan="9">MENJADI</th>
                        
                        <!-- 4. Blok SELISIH -->
                        <th class="border border-slate-400 align-middle py-2 px-2 bg-slate-200 text-slate-900 font-extrabold" rowspan="3" style="width: 105px; min-width: 95px;">Selisih Anggaran / Volume</th>
                    </tr>
                    <tr class="text-center text-[10px]">
                        <!-- Sub-kolom SEMULA -->
                        <th class="border border-slate-400 py-1 px-1 bg-amber-50/70 align-middle" rowspan="2" style="width: 55px; min-width: 50px;">Mendukung SDGs Ke-</th>
                        <th class="border border-slate-400 py-1 px-1 bg-amber-50/70 align-middle" rowspan="2" style="width: 70px; min-width: 65px;">Data Eksisting Tahun Berjalan</th>
                        <th class="border border-slate-400 py-1 px-1 bg-amber-50/70 align-middle" rowspan="2" style="width: 75px; min-width: 70px;">Lokasi (RT/RW/DUSUN)</th>
                        <th class="border border-slate-400 py-1 px-1 bg-amber-50/70 align-middle" rowspan="2" style="width: 65px; min-width: 60px;">Volume &amp; Satuan</th>
                        <th class="border border-slate-400 py-1 px-1 bg-amber-100/70 align-middle font-bold text-amber-950" colspan="3">Penerima Manfaat</th>
                        <th class="border border-slate-400 py-1 px-1 bg-amber-200/50 align-middle font-bold text-amber-950" colspan="2">Biaya &amp; Sumber Pembiayaan</th>

                        <!-- Sub-kolom MENJADI -->
                        <th class="border border-slate-400 py-1 px-1 bg-indigo-50/70 align-middle" rowspan="2" style="width: 55px; min-width: 50px;">Mendukung SDGs Ke-</th>
                        <th class="border border-slate-400 py-1 px-1 bg-indigo-50/70 align-middle" rowspan="2" style="width: 70px; min-width: 65px;">Data Eksisting Tahun Berjalan</th>
                        <th class="border border-slate-400 py-1 px-1 bg-indigo-50/70 align-middle" rowspan="2" style="width: 75px; min-width: 70px;">Lokasi (RT/RW/DUSUN)</th>
                        <th class="border border-slate-400 py-1 px-1 bg-indigo-50/70 align-middle" rowspan="2" style="width: 65px; min-width: 60px;">Prakiraan Volume &amp; Satuan</th>
                        <th class="border border-slate-400 py-1 px-1 bg-indigo-100/70 align-middle font-bold text-indigo-950" colspan="3">Penerima Manfaat</th>
                        <th class="border border-slate-400 py-1 px-1 bg-indigo-200/50 align-middle font-bold text-indigo-950" colspan="2">Biaya &amp; Sumber Pembiayaan</th>
                    </tr>
                    <tr class="text-center text-[9px]">
                        <!-- Rincian SEMULA Penerima Manfaat -->
                        <th class="border border-slate-400 py-1 px-0.5 bg-amber-100/50" style="width: 45px; min-width: 40px;">Laki-laki</th>
                        <th class="border border-slate-400 py-1 px-0.5 bg-amber-100/50" style="width: 45px; min-width: 40px;">Perempuan</th>
                        <th class="border border-slate-400 py-1 px-0.5 bg-amber-100/50" style="width: 45px; min-width: 40px;">RTM</th>
                        <!-- Rincian SEMULA Biaya & Sumber -->
                        <th class="border border-slate-400 py-1 px-1 bg-amber-200/40 font-bold text-slate-900" style="width: 90px; min-width: 80px;">Jumlah (Rp.)</th>
                        <th class="border border-slate-400 py-1 px-0.5 bg-amber-200/40" style="width: 55px; min-width: 50px;">Sumber</th>

                        <!-- Rincian MENJADI Penerima Manfaat -->
                        <th class="border border-slate-400 py-1 px-0.5 bg-indigo-100/50" style="width: 45px; min-width: 40px;">Laki-laki</th>
                        <th class="border border-slate-400 py-1 px-0.5 bg-indigo-100/50" style="width: 45px; min-width: 40px;">Perempuan</th>
                        <th class="border border-slate-400 py-1 px-0.5 bg-indigo-100/50" style="width: 45px; min-width: 40px;">RTM</th>
                        <!-- Rincian MENJADI Biaya & Sumber -->
                        <th class="border border-slate-400 py-1 px-1 bg-indigo-200/40 font-bold text-slate-900" style="width: 90px; min-width: 80px;">Jumlah (Rp.)</th>
                        <th class="border border-slate-400 py-1 px-0.5 bg-indigo-200/40" style="width: 55px; min-width: 50px;">Sumber</th>
                    </tr>
                    <!-- Baris Penomoran Kolom Resmi (1 s/d 21) -->
                    <tr class="text-center text-[9px] font-normal text-slate-500 bg-slate-50">
                        <td class="border border-slate-400 py-0.5">1</td>
                        <td class="border border-slate-400 py-0.5">2</td>
                        <td class="border border-slate-400 py-0.5">3</td>
                        <td class="border border-slate-400 py-0.5">4</td>
                        <td class="border border-slate-400 py-0.5">5</td>
                        <td class="border border-slate-400 py-0.5">6</td>
                        <td class="border border-slate-400 py-0.5">7</td>
                        <td class="border border-slate-400 py-0.5">8</td>
                        <td class="border border-slate-400 py-0.5">9</td>
                        <td class="border border-slate-400 py-0.5">10</td>
                        <td class="border border-slate-400 py-0.5">11</td>
                        <td class="border border-slate-400 py-0.5">12</td>
                        <td class="border border-slate-400 py-0.5">13</td>
                        <td class="border border-slate-400 py-0.5">14</td>
                        <td class="border border-slate-400 py-0.5">15</td>
                        <td class="border border-slate-400 py-0.5">16</td>
                        <td class="border border-slate-400 py-0.5">17</td>
                        <td class="border border-slate-400 py-0.5">18</td>
                        <td class="border border-slate-400 py-0.5">19</td>
                        <td class="border border-slate-400 py-0.5">20</td>
                        <td class="border border-slate-400 py-0.5">21</td>
                    </tr>
                </thead>
                <tbody>
                    ${tableBodyHtml}
                </tbody>
                <!-- C. BARIS JUMLAH TOTAL (2 + 7 + 1 + 1 + 7 + 1 + 1 + 1 = 21 kolom) -->
                <tfoot>
                    <tr class="font-extrabold bg-slate-800 text-white text-xs">
                        <td colspan="2" class="text-center uppercase border border-slate-900 py-2.5 font-bold tracking-wider">JUMLAH TOTAL</td>
                        <td colspan="7" class="border border-slate-900 bg-slate-800"></td>
                        <td class="text-right border border-slate-900 py-2.5 px-2 whitespace-nowrap text-white font-extrabold">${formatRupiah(grandTotalSemula)}</td>
                        <td class="border border-slate-900 bg-slate-800"></td>
                        <td colspan="7" class="border border-slate-900 bg-slate-800"></td>
                        <td class="text-right border border-slate-900 py-2.5 px-2 whitespace-nowrap text-amber-300 font-extrabold">${formatRupiah(grandTotalMenjadi)}</td>
                        <td class="border border-slate-900 bg-slate-800"></td>
                        <td class="text-right border border-slate-900 py-2.5 px-2 whitespace-nowrap ${grandTotalSelisih > 0 ? 'text-emerald-300' : (grandTotalSelisih < 0 ? 'text-rose-300' : 'text-white')} font-extrabold">${formatSelisihRupiah(grandTotalSelisih)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <!-- C. BAGIAN PENANDATANGAN RESMI (FOOTER) -->
        <div class="mt-12 flex justify-between text-sm text-slate-900" style="page-break-inside: avoid;">
            <div class="text-center w-64">
                <p>Mengetahui,</p>
                <p class="font-bold uppercase">Kepala Desa Batetangnga</p>
                <div style="height: 70px;"></div>
                <p class="font-bold underline uppercase">SUMAILA DAMANG</p>
            </div>
            <div class="text-center w-64">
                <p>Batetangnga, ${formattedDate}</p>
                <p>Disusun oleh,</p>
                <p class="font-bold uppercase">${timInfo.jabatan || 'Ketua Tim Penyusun RKPDesa'}</p>
                <div style="height: 70px;"></div>
                <p class="font-bold underline uppercase">${timInfo.nama || 'ABDUL AZIS SPM'}</p>
            </div>
        </div>
    `;
}
window.buildRkpdesPerubahanHtml = buildRkpdesPerubahanHtml;

function renderRkpdesPerubahanPreview() {
    const container = document.getElementById('livePreviewContainer');
    if (!container) return;

    if (!rkpdesPerubahanList || rkpdesPerubahanList.length === 0) {
        container.innerHTML = `
            <div class="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div class="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                    <i class="fas fa-folder-open"></i>
                </div>
                <h3 class="text-base font-bold text-slate-800 mb-1">Belum Ada Data RKPDes / RAB Perubahan</h3>
                <p class="text-xs text-slate-500 max-w-md mx-auto mb-6">
                    Tidak ditemukan data perubahan anggaran untuk Tahun ${activeYear}. Pastikan data telah diinput pada modul RAB dengan tipe anggaran PERUBAHAN.
                </p>
                <a href="rab.html" class="btn-primary text-xs inline-flex items-center gap-2">
                    <i class="fas fa-external-link-alt"></i> Buka Modul RAB
                </a>
            </div>
        `;
        return;
    }
    container.innerHTML = buildRkpdesPerubahanHtml();
}
window.renderRkpdesPerubahanPreview = renderRkpdesPerubahanPreview;

// ==========================================================
// MESIN CETAK TERISOLASI (#printArea)
// Setiap fungsi cetak membangun HTML-nya SENDIRI (murni atau
// perubahan) lalu menempelkannya ke #printArea. Saat mencetak,
// CSS hanya menampilkan #printArea sehingga lembar murni dan
// lembar perubahan TIDAK MUNGKIN tertukar.
// ==========================================================
function printIsolatedArea(html, modeClass) {
    const area = document.getElementById('rkpdesPrintArea');
    if (!area) return false;
    area.innerHTML = html;
    document.body.classList.add('printing-rkpdes');
    if (modeClass === 'print-perubahan') {
        document.body.classList.add('print-perubahan');
    } else {
        document.body.classList.remove('print-perubahan');
    }
    return true;
}
window.printIsolatedArea = printIsolatedArea;

async function printRkpdesMurni(e) {
    if (e) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }

    currentRkpdesTab = 'murni';

    const btnMurni = document.getElementById('tab-btn-murni');
    const btnPerubahan = document.getElementById('tab-btn-perubahan');
    const badge = document.getElementById('tab-badge-info');
    if (btnMurni) {
        btnMurni.className = 'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-indigo-600 text-white shadow-sm cursor-pointer';
    }
    if (btnPerubahan) {
        btnPerubahan.className = 'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 text-slate-700 hover:text-slate-900 cursor-pointer';
    }
    if (badge) {
        badge.className = 'bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1 rounded-lg font-bold';
        badge.textContent = 'Mode: RKPDes Murni';
    }

    if (!Array.isArray(rkpdesList) || rkpdesList.length === 0) {
        try {
            await loadRkpdesData();
        } catch (err) {
            console.error('❌ Gagal memuat data murni untuk cetak:', err);
        }
    }

    // PERCABANGAN MUTLAK: cetak hanya lembar RKPDes Murni via #printArea
    const htmlMurni = buildRkpdesMurniHtml();
    if (!htmlMurni) {
        showToast(`❌ Tidak ada data RKPDes Murni tahun ${activeYear} untuk dicetak.`, 'error');
        return;
    }
    if (!printIsolatedArea(htmlMurni, '')) {
        renderRkpdesMurniPreview();
        document.body.classList.remove('print-perubahan');
    }

    if (Date.now() >= _printLockUntil) {
        _printLockUntil = Date.now() + 1500;
        setTimeout(() => {
            window.print();
        }, 200);
    }
}
window.printRkpdesMurni = printRkpdesMurni;

async function cetakRkpdesMurni(e) {
    return printRkpdesMurni(e);
}
window.cetakRkpdesMurni = cetakRkpdesMurni;

async function printRkpdesPerubahan(e) {
    if (e) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }

    currentRkpdesTab = 'perubahan';

    const btnMurni = document.getElementById('tab-btn-murni');
    const btnPerubahan = document.getElementById('tab-btn-perubahan');
    const badge = document.getElementById('tab-badge-info');
    if (btnMurni) {
        btnMurni.className = 'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 text-slate-700 hover:text-slate-900 cursor-pointer';
    }
    if (btnPerubahan) {
        btnPerubahan.className = 'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-amber-600 text-white shadow-sm cursor-pointer';
    }
    if (badge) {
        badge.className = 'bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 rounded-lg font-bold';
        badge.textContent = 'Mode: RKPDes / RAB Perubahan';
    }

    // Muat data PERUBAHAN bila belum ada — jangan pernah jatuh ke data murni
    if (!Array.isArray(rkpdesPerubahanList) || rkpdesPerubahanList.length === 0) {
        try {
            await loadRkpdesPerubahanData();
        } catch (err) {
            console.error('❌ Gagal memuat data perubahan untuk cetak:', err);
        }
    }

    // PERCABANGAN MUTLAK: cetak HANYA matriks SEMULA/MENJADI/SELISIH via #printArea.
    // Fungsi ini tidak menyentuh render/lembar RKPDes murni sama sekali.
    if (!Array.isArray(rkpdesPerubahanList) || rkpdesPerubahanList.length === 0) {
        showToast(`❌ Tidak ada data RKPDes Perubahan tahun ${activeYear} untuk dicetak.`, 'error');
        return;
    }

    const htmlPerubahan = buildRkpdesPerubahanHtml();
    if (!printIsolatedArea(htmlPerubahan, 'print-perubahan')) {
        renderRkpdesPerubahanPreview();
        document.body.classList.add('print-perubahan');
    }

    if (Date.now() >= _printLockUntil) {
        _printLockUntil = Date.now() + 1500;
        setTimeout(() => {
            window.print();
        }, 200);
    }
}
window.printRkpdesPerubahan = printRkpdesPerubahan;

async function cetakRkpdesPerubahan(e) {
    return printRkpdesPerubahan(e);
}
window.cetakRkpdesPerubahan = cetakRkpdesPerubahan;

window.addEventListener('afterprint', () => {
    // Bersihkan kontainer cetak terisolasi & kembalikan mode layar normal
    document.body.classList.remove('printing-rkpdes');
    document.body.classList.remove('print-perubahan');
    const area = document.getElementById('rkpdesPrintArea');
    if (area) area.innerHTML = '';
});

// ==========================================
// FITUR INTERAKTIF EDIT PENERIMA MANFAAT (MENJADI)
// ==========================================
function findPerubahanItem(key) {
    if (!Array.isArray(rkpdesPerubahanList) || rkpdesPerubahanList.length === 0 || !key) return null;
    const strKey = String(key).trim();
    const cleanKey = strKey.replace(/\.+$/, '').toLowerCase();

    // 1. Direct match on kode_unik_full or id or nama_kegiatan
    let found = rkpdesPerubahanList.find(x => {
        if (!x) return false;
        if (String(x.kode_unik_full || '').trim() === strKey) return true;
        if (String(x.id || '') === strKey) return true;
        if (String(x.nama_kegiatan || '').trim() === strKey) return true;
        if (String(x.jenis_kegiatan || '').trim() === strKey) return true;
        return false;
    });
    if (found) return found;

    // 2. Normalized kode match (stripping trailing dots)
    found = rkpdesPerubahanList.find(x => {
        if (!x) return false;
        const c1 = String(x.kode_unik_full || x.kode_unik || '').trim().replace(/\.+$/, '').toLowerCase();
        if (c1 && c1 === cleanKey) return true;
        return false;
    });
    if (found) return found;

    // 3. Case-insensitive name match
    found = rkpdesPerubahanList.find(x => {
        if (!x) return false;
        const n1 = String(x.nama_kegiatan || x.jenis_kegiatan || '').trim().toLowerCase();
        if (n1 && (n1 === cleanKey || cleanKey.includes(n1) || n1.includes(cleanKey))) return true;
        return false;
    });
    if (found) return found;

    // 4. Index-based fallback if key is row_X
    if (strKey.startsWith('row_')) {
        const idx = parseInt(strKey.replace('row_', ''), 10);
        if (!isNaN(idx) && rkpdesPerubahanList[idx]) {
            return rkpdesPerubahanList[idx];
        }
    }

    return null;
}
window.findPerubahanItem = findPerubahanItem;

function openEditManfaatMenjadi(itemKey) {
    if (!rkpdesPerubahanList || rkpdesPerubahanList.length === 0) return;
    const item = findPerubahanItem(itemKey);
    if (!item) {
        console.warn('[RKPDes Perubahan] Kegiatan tidak ditemukan untuk key:', itemKey);
        showToast('❌ Data kegiatan tidak ditemukan', 'error');
        return;
    }

    const modal = document.getElementById('modalEditManfaatMenjadi');
    if (!modal) return;

    const code = item.kode_unik_full || '-';
    const name = item.nama_kegiatan || item.jenis_kegiatan || '-';
    const sL = item.semula?.manfaat_l || item.penerima_l_semula || '-';
    const sP = item.semula?.manfaat_p || item.penerima_p_semula || '-';
    const sRtm = item.semula?.manfaat_rtm || item.penerima_rtm_semula || '-';

    const mTitle = document.getElementById('edit-manfaat-kegiatan-title');
    const mKeyInput = document.getElementById('edit-manfaat-item-key');
    const lblL = document.getElementById('label-semula-l');
    const lblP = document.getElementById('label-semula-p');
    const lblRtm = document.getElementById('label-semula-rtm');
    const inL = document.getElementById('input-menjadi-l');
    const inP = document.getElementById('input-menjadi-p');
    const inRtm = document.getElementById('input-menjadi-rtm');

    if (mKeyInput) mKeyInput.value = item.kode_unik_full || itemKey;
    if (mTitle) mTitle.textContent = `[${code}] ${name}`;
    if (lblL) lblL.textContent = sL;
    if (lblP) lblP.textContent = sP;
    if (lblRtm) lblRtm.textContent = sRtm;

    const curL = (item.menjadi?.manfaat_l && item.menjadi.manfaat_l !== '-') ? item.menjadi.manfaat_l :
                 ((item.penerima_l_menjadi && item.penerima_l_menjadi !== '-') ? item.penerima_l_menjadi :
                 (sL !== '-' ? sL : ''));
    const curP = (item.menjadi?.manfaat_p && item.menjadi.manfaat_p !== '-') ? item.menjadi.manfaat_p :
                 ((item.penerima_p_menjadi && item.penerima_p_menjadi !== '-') ? item.penerima_p_menjadi :
                 (sP !== '-' ? sP : ''));
    const curRtm = (item.menjadi?.manfaat_rtm && item.menjadi.manfaat_rtm !== '-') ? item.menjadi.manfaat_rtm :
                   ((item.penerima_rtm_menjadi && item.penerima_rtm_menjadi !== '-') ? item.penerima_rtm_menjadi :
                   (sRtm !== '-' ? sRtm : ''));

    if (inL) inL.value = curL;
    if (inP) inP.value = curP;
    if (inRtm) inRtm.value = curRtm;

    modal.classList.remove('hidden');
}
window.openEditManfaatMenjadi = openEditManfaatMenjadi;

function closeEditManfaatMenjadiModal() {
    const modal = document.getElementById('modalEditManfaatMenjadi');
    if (modal) modal.classList.add('hidden');
}
window.closeEditManfaatMenjadiModal = closeEditManfaatMenjadiModal;

function copyFromSemulaToMenjadi() {
    const sL = document.getElementById('label-semula-l')?.textContent?.trim() || '';
    const sP = document.getElementById('label-semula-p')?.textContent?.trim() || '';
    const sRtm = document.getElementById('label-semula-rtm')?.textContent?.trim() || '';

    const inL = document.getElementById('input-menjadi-l');
    const inP = document.getElementById('input-menjadi-p');
    const inRtm = document.getElementById('input-menjadi-rtm');

    if (inL && sL && sL !== '-') inL.value = sL;
    if (inP && sP && sP !== '-') inP.value = sP;
    if (inRtm && sRtm && sRtm !== '-') inRtm.value = sRtm;

    showToast('Data SEMULA disalin ke kolom MENJADI', 'success');
}
window.copyFromSemulaToMenjadi = copyFromSemulaToMenjadi;

// ==========================================
// EDIT NOMOR SDGs (SEMULA & MENJADI) — ZERO-DEFAULT
// ==========================================
function openEditSdgsModal(itemKey, side = 'menjadi') {
    if (!rkpdesPerubahanList || rkpdesPerubahanList.length === 0) return;
    const item = findPerubahanItem(itemKey);
    if (!item) {
        showToast('❌ Data kegiatan tidak ditemukan', 'error');
        return;
    }

    const modal = document.getElementById('modalEditSdgs');
    if (!modal) return;

    const code = item.kode_unik_full || '-';
    const name = item.nama_kegiatan || item.jenis_kegiatan || '-';
    const semulaVal = cleanSdgsDisplay(item.semula?.sdgs);
    const menjadiVal = cleanSdgsDisplay(item.menjadi?.sdgs);

    const mKeyInput = document.getElementById('edit-sdgs-item-key');
    const mTitle = document.getElementById('edit-sdgs-kegiatan-title');
    const inSemula = document.getElementById('input-sdgs-semula');
    const inMenjadi = document.getElementById('input-sdgs-menjadi');

    if (mKeyInput) mKeyInput.value = `${String(item.kode_unik_full || itemKey).trim()}|${side === 'semula' ? 'semula' : 'menjadi'}`;
    if (mTitle) mTitle.textContent = `[${code}] ${name}`;
    if (inSemula) inSemula.value = semulaVal;
    if (inMenjadi) inMenjadi.value = menjadiVal;

    modal.classList.remove('hidden');
    if (side === 'semula' && inSemula) inSemula.focus();
}
window.openEditSdgsModal = openEditSdgsModal;

// Nilai tampilan ('-' atau 'SDGs 3') menjadi teks input mentah ('' atau '3')
function cleanSdgsDisplay(v) {
    if (v === null || v === undefined) return '';
    const s = String(v).trim();
    if (!s || s === '-') return '';
    return s.replace(/^sdgs?\s*/i, '').trim();
}
window.cleanSdgsDisplay = cleanSdgsDisplay;

function closeEditSdgsModal() {
    const modal = document.getElementById('modalEditSdgs');
    if (modal) modal.classList.add('hidden');
}
window.closeEditSdgsModal = closeEditSdgsModal;

async function saveEditSdgs(event) {
    if (event) event.preventDefault();
    const keyInput = document.getElementById('edit-sdgs-item-key')?.value || '';
    const [rawKey, side] = keyInput.split('|');
    if (!rawKey) return;

    const item = findPerubahanItem(rawKey);
    if (!item) {
        showToast('❌ Data kegiatan tidak ditemukan', 'error');
        return;
    }

    // ZERO-DEFAULT: kosong => disimpan eksplisit '-' (hapus nilai), bukan tebakan
    const valSemula = cleanSdgsDisplay(document.getElementById('input-sdgs-semula')?.value);
    const valMenjadi = cleanSdgsDisplay(document.getElementById('input-sdgs-menjadi')?.value);

    // 1. Simpan ke DATABASE (persist lintas reload) — fallback ke localStorage
    let dbSaved = false;
    try {
        const res = await fetch('/api/rkpdes/perubahan/sdgs', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tahun: activeYear,
                kode_unik_full: item.kode_unik_full || '',
                id: item.id != null ? item.id : '',
                sdgs_semula: valSemula,
                sdgs_menjadi: valMenjadi
            })
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.success) dbSaved = true;
        else console.warn('⚠️ Simpan SDGs ke DB gagal:', json.error || ('HTTP ' + res.status));
    } catch (err) {
        console.warn('⚠️ Simpan SDGs ke DB gagal (jaringan):', err.message);
    }

    // 2. Fallback lokal agar tidak hilang saat reload jika DB sedang tidak tersedia
    if (!dbSaved) {
        try {
            const overrides = getManfaatOverrides(activeYear);
            const sdgsKey = `__sdgs__${String(item.kode_unik_full || rawKey).trim()}`;
            overrides[sdgsKey] = { semula: valSemula, menjadi: valMenjadi, updated_at: new Date().toISOString() };
            saveManfaatOverrides(activeYear, overrides);
        } catch (e) {}
    }

    // 3. Terapkan ke daftar aktif & render ulang
    const labelSemula = valSemula ? `SDGs ${valSemula}` : '-';
    const labelMenjadi = valMenjadi ? `SDGs ${valMenjadi}` : '-';
    if (!item.semula) item.semula = {};
    if (!item.menjadi) item.menjadi = {};
    item.semula.sdgs = labelSemula;
    item.menjadi.sdgs = labelMenjadi;
    item.sdgs_semula = valSemula || null;
    item.sdgs_menjadi = valMenjadi || null;

    renderRkpdesPerubahanPreview();
    closeEditSdgsModal();
    showToast(dbSaved
        ? '✅ Nomor SDGs berhasil disimpan ke database.'
        : '⚠️ SDGs disimpan lokal (database sedang tidak dapat dihubungi).',
        dbSaved ? 'success' : 'error');
}
window.saveEditSdgs = saveEditSdgs;

function resetManfaatMenjadi() {
    const itemKey = document.getElementById('edit-manfaat-item-key')?.value;
    if (!itemKey) return;

    const item = findPerubahanItem(itemKey);
    const overrides = getManfaatOverrides(activeYear);

    delete overrides[itemKey];
    if (item) {
        if (item.kode_unik_full) {
            delete overrides[String(item.kode_unik_full).trim()];
            delete overrides[String(item.kode_unik_full).trim().replace(/\.+$/, '')];
        }
        if (item.id != null) delete overrides[String(item.id)];
    }
    saveManfaatOverrides(activeYear, overrides);

    applyManfaatOverridesToPerubahanList();
    renderRkpdesPerubahanPreview();
    closeEditManfaatMenjadiModal();
    showToast('🔄 Penyesuaian penerima manfaat berhasil direset ke nilai awal', 'success');
}
window.resetManfaatMenjadi = resetManfaatMenjadi;

function saveEditManfaatMenjadi(event) {
    if (event) event.preventDefault();
    const itemKey = document.getElementById('edit-manfaat-item-key')?.value;
    if (!itemKey) return;

    const valL = document.getElementById('input-menjadi-l')?.value?.trim() || '-';
    const valP = document.getElementById('input-menjadi-p')?.value?.trim() || '-';
    const valRtm = document.getElementById('input-menjadi-rtm')?.value?.trim() || '-';

    const item = findPerubahanItem(itemKey);
    const overrides = getManfaatOverrides(activeYear);
    const payload = {
        l: valL,
        p: valP,
        rtm: valRtm,
        updated_at: new Date().toISOString()
    };

    overrides[itemKey] = payload;
    if (item) {
        if (item.kode_unik_full) {
            overrides[String(item.kode_unik_full).trim()] = payload;
            overrides[String(item.kode_unik_full).trim().replace(/\.+$/, '')] = payload;
        }
        if (item.id != null) overrides[String(item.id)] = payload;
    }
    saveManfaatOverrides(activeYear, overrides);

    applyManfaatOverridesToPerubahanList();
    renderRkpdesPerubahanPreview();
    closeEditManfaatMenjadiModal();
    showToast('✅ Penerima manfaat (MENJADI) berhasil disimpan!', 'success');
}
window.saveEditManfaatMenjadi = saveEditManfaatMenjadi;

// ==========================================
// EVENT DELEGATION GLOBAL UNTUK EDIT MANFAAT
// ==========================================
// Memastikan klik pada tombol/sel edit penerima manfaat tetap aktif di semua tahun
// (2026, 2027, dst.) bahkan setelah DOM tabel dirender ulang secara dinamis.
document.addEventListener('click', function(e) {
    const cetakPerubahanBtn = e.target.closest('#btn-cetak-perubahan');
    if (cetakPerubahanBtn) {
        e.preventDefault();
        e.stopPropagation();
        printRkpdesPerubahan(e);
        return;
    }

    const cetakMurniBtn = e.target.closest('#btn-cetak-murni');
    if (cetakMurniBtn) {
        e.preventDefault();
        e.stopPropagation();
        printRkpdesMurni(e);
        return;
    }

    const sdgsCell = e.target.closest('.cell-edit-sdgs');
    if (sdgsCell) {
        e.preventDefault();
        e.stopPropagation();
        const itemKey = sdgsCell.getAttribute('data-item-key') ||
                        sdgsCell.dataset.itemKey ||
                        sdgsCell.getAttribute('data-kode') ||
                        sdgsCell.dataset.kode ||
                        sdgsCell.getAttribute('data-id') ||
                        sdgsCell.dataset.id;
        const side = sdgsCell.getAttribute('data-sdgs-side') === 'semula' ? 'semula' : 'menjadi';
        if (itemKey) {
            openEditSdgsModal(itemKey, side);
        }
        return;
    }

    const editBtn = e.target.closest('.btn-edit-manfaat');
    if (editBtn) {
        e.preventDefault();
        e.stopPropagation();
        const itemKey = editBtn.getAttribute('data-item-key') ||
                        editBtn.dataset.itemKey ||
                        editBtn.getAttribute('data-kode') ||
                        editBtn.dataset.kode ||
                        editBtn.getAttribute('data-id') ||
                        editBtn.dataset.id;
        if (itemKey) {
            openEditManfaatMenjadi(itemKey);
        }
        return;
    }

    const editCell = e.target.closest('.cell-edit-manfaat');
    if (editCell) {
        e.preventDefault();
        e.stopPropagation();
        const itemKey = editCell.getAttribute('data-item-key') ||
                        editCell.dataset.itemKey ||
                        editCell.getAttribute('data-kode') ||
                        editCell.dataset.kode ||
                        editCell.getAttribute('data-id') ||
                        editCell.dataset.id;
        if (itemKey) {
            openEditManfaatMenjadi(itemKey);
        }
        return;
    }

    const editPerubahanBtn = e.target.closest('.btn-edit-perubahan');
    if (editPerubahanBtn) {
        e.preventDefault();
        e.stopPropagation();
        const itemKey = editPerubahanBtn.getAttribute('data-item-key') ||
                        editPerubahanBtn.dataset.itemKey ||
                        editPerubahanBtn.getAttribute('data-kode') ||
                        editPerubahanBtn.dataset.kode ||
                        editPerubahanBtn.getAttribute('data-id') ||
                        editPerubahanBtn.dataset.id;
        if (itemKey) {
            openEditRkpPerubahanModal(itemKey);
        }
        return;
    }

    const editPerubahanCell = e.target.closest('.cell-edit-perubahan');
    if (editPerubahanCell) {
        e.preventDefault();
        e.stopPropagation();
        const itemKey = editPerubahanCell.getAttribute('data-item-key') ||
                        editPerubahanCell.dataset.itemKey ||
                        editPerubahanCell.getAttribute('data-kode') ||
                        editPerubahanCell.dataset.kode ||
                        editPerubahanCell.getAttribute('data-id') ||
                        editPerubahanCell.dataset.id;
        if (itemKey) {
            openEditRkpPerubahanModal(itemKey);
        }
        return;
    }
});

// ==========================================
// MODAL EDIT RINCIAN RKPDes / RAB PERUBAHAN (SEMULA & MENJADI)
// ==============================================================
function updateModalLiveDifference() {
    const bSemula = Number(document.getElementById('edit-semula-biaya')?.value) || 0;
    const bMenjadi = Number(document.getElementById('edit-perubahan-biaya')?.value) || 0;
    const selisih = bMenjadi - bSemula;

    const sumSemula = document.getElementById('summary-semula-biaya');
    const sumMenjadi = document.getElementById('summary-menjadi-biaya');
    const sumSelisih = document.getElementById('summary-selisih-biaya');

    if (sumSemula) sumSemula.textContent = formatRupiah(bSemula);
    if (sumMenjadi) sumMenjadi.textContent = formatRupiah(bMenjadi);
    if (sumSelisih) {
        if (selisih > 0) {
            sumSelisih.className = 'font-bold text-xs px-2 py-0.5 rounded inline-block w-fit bg-emerald-100 text-emerald-800 border border-emerald-300';
            sumSelisih.textContent = `+${formatRupiah(selisih)} (Bertambah)`;
        } else if (selisih < 0) {
            sumSelisih.className = 'font-bold text-xs px-2 py-0.5 rounded inline-block w-fit bg-rose-100 text-rose-800 border border-rose-300';
            sumSelisih.textContent = `-${formatRupiah(Math.abs(selisih))} (Berkurang)`;
        } else {
            sumSelisih.className = 'font-bold text-xs px-2 py-0.5 rounded inline-block w-fit bg-slate-200 text-slate-700';
            sumSelisih.textContent = `Rp 0 (Tetap)`;
        }
    }
}
window.updateModalLiveDifference = updateModalLiveDifference;

function openEditRkpPerubahanModal(itemKey) {
    if (!rkpdesPerubahanList || rkpdesPerubahanList.length === 0) return;
    const item = findPerubahanItem(itemKey);
    if (!item) {
        console.warn('[RKPDes Perubahan] Kegiatan tidak ditemukan untuk key:', itemKey);
        showToast('❌ Data kegiatan tidak ditemukan', 'error');
        return;
    }

    const modal = document.getElementById('modalEditRkpPerubahan');
    if (!modal) return;

    const kode = item.kode_unik_full || item.kode_unik || '-';
    const nama = item.nama_kegiatan || item.jenis_kegiatan || '-';
    const bidangText = item.bidang || 'Bidang Penyelenggaraan Pemerintahan Desa';

    const elKey = document.getElementById('edit-perubahan-item-key');
    const elId = document.getElementById('edit-perubahan-id');
    const elKode = document.getElementById('edit-perubahan-kode');
    const badgeKode = document.getElementById('edit-perubahan-badge-kode');
    const badgeBidang = document.getElementById('edit-perubahan-badge-bidang');
    const titleNama = document.getElementById('edit-perubahan-nama-kegiatan');

    if (elKey) elKey.value = itemKey;
    if (elId) elId.value = item.id || '';
    if (elKode) elKode.value = kode;
    if (badgeKode) badgeKode.textContent = kode;
    if (badgeBidang) badgeBidang.textContent = bidangText;
    if (titleNama) titleNama.textContent = nama;

    const semula = item.semula || {};
    const menjadi = item.menjadi || {};

    // 1. PRA-ISI NILAI SEMULA (Sebelum Perubahan)
    const semVol = document.getElementById('edit-semula-volume');
    const semSat = document.getElementById('edit-semula-satuan');
    const semBiaya = document.getElementById('edit-semula-biaya');
    const semLokasi = document.getElementById('edit-semula-lokasi');
    const semWaktu = document.getElementById('edit-semula-waktu');
    const semSumber = document.getElementById('edit-semula-sumber-biaya');
    const semPola = document.getElementById('edit-semula-pola');
    const semSdgs = document.getElementById('edit-semula-sdgs');
    const semEksisting = document.getElementById('edit-semula-data-eksisting');
    const semL = document.getElementById('edit-semula-manfaat-l');
    const semP = document.getElementById('edit-semula-manfaat-p');
    const semRtm = document.getElementById('edit-semula-manfaat-rtm');

    if (semVol) semVol.value = semula.volume || '1';
    if (semSat) semSat.value = semula.satuan || 'Paket';
    if (semBiaya) semBiaya.value = Number(semula.biaya || 0);
    if (semLokasi) semLokasi.value = semula.lokasi || 'Desa Batetangnga';
    if (semWaktu) semWaktu.value = semula.waktu_pelaksanaan || '12 Bulan';

    const sSumberVal = semula.sumber_biaya || 'DDS';
    if (semSumber) {
        let matched = false;
        for (let i = 0; i < semSumber.options.length; i++) {
            if (semSumber.options[i].value.toLowerCase() === sSumberVal.toLowerCase()) {
                semSumber.selectedIndex = i;
                matched = true;
                break;
            }
        }
        if (!matched) semSumber.value = 'DDS';
    }

    if (semPola) semPola.value = semula.pola_pelaksanaan || 'Swakelola';
    if (semSdgs) semSdgs.value = cleanSdgsDisplay ? cleanSdgsDisplay(semula.sdgs || '') : (semula.sdgs || '');
    if (semEksisting) semEksisting.value = (semula.data_eksisting && semula.data_eksisting !== '-') ? semula.data_eksisting : '';
    if (semL) semL.value = (semula.manfaat_l && semula.manfaat_l !== '-') ? semula.manfaat_l : '';
    if (semP) semP.value = (semula.manfaat_p && semula.manfaat_p !== '-') ? semula.manfaat_p : '';
    if (semRtm) semRtm.value = (semula.manfaat_rtm && semula.manfaat_rtm !== '-') ? semula.manfaat_rtm : '';

    // Hints data Semula
    const hVol = document.getElementById('hint-semula-volume');
    const hSat = document.getElementById('hint-semula-satuan');
    const hBiaya = document.getElementById('hint-semula-biaya');
    if (hVol) hVol.textContent = `Semula: ${semula.volume || '-'}`;
    if (hSat) hSat.textContent = `Semula: ${semula.satuan || '-'}`;
    if (hBiaya) hBiaya.textContent = `Semula: ${formatRupiah(Number(semula.biaya || 0))}`;

    // 2. PRA-ISI NILAI MENJADI (Setelah Perubahan)
    const inVol = document.getElementById('edit-perubahan-volume');
    const inSat = document.getElementById('edit-perubahan-satuan');
    const inBiaya = document.getElementById('edit-perubahan-biaya');
    const inLokasi = document.getElementById('edit-perubahan-lokasi');
    const inWaktu = document.getElementById('edit-perubahan-waktu');
    const inSumber = document.getElementById('edit-perubahan-sumber-biaya');
    const inPola = document.getElementById('edit-perubahan-pola');
    const inSdgs = document.getElementById('edit-perubahan-sdgs');
    const inEksisting = document.getElementById('edit-perubahan-data-eksisting');
    const inL = document.getElementById('edit-perubahan-manfaat-l');
    const inP = document.getElementById('edit-perubahan-manfaat-p');
    const inRtm = document.getElementById('edit-perubahan-manfaat-rtm');

    if (inVol) inVol.value = menjadi.volume ?? semula.volume ?? '1';
    if (inSat) inSat.value = menjadi.satuan ?? semula.satuan ?? 'Paket';
    if (inBiaya) inBiaya.value = Number(menjadi.biaya != null ? menjadi.biaya : (semula.biaya || 0));
    if (inLokasi) inLokasi.value = menjadi.lokasi || semula.lokasi || 'Desa Batetangnga';
    const rawWaktu = menjadi.waktu_pelaksanaan || semula.waktu_pelaksanaan || '';
    if (inWaktu) inWaktu.value = (rawWaktu && rawWaktu !== String(activeYear)) ? rawWaktu : '12 Bulan';

    const curSumber = menjadi.sumber_biaya || semula.sumber_biaya || 'DDS';
    if (inSumber) {
        let matched = false;
        for (let i = 0; i < inSumber.options.length; i++) {
            if (inSumber.options[i].value.toLowerCase() === curSumber.toLowerCase()) {
                inSumber.selectedIndex = i;
                matched = true;
                break;
            }
        }
        if (!matched) {
            for (let i = 0; i < inSumber.options.length; i++) {
                if (curSumber.toLowerCase().includes(inSumber.options[i].value.toLowerCase())) {
                    inSumber.selectedIndex = i;
                    matched = true;
                    break;
                }
            }
        }
        if (!matched) inSumber.value = 'DDS';
    }

    const curPola = menjadi.pola_pelaksanaan || semula.pola_pelaksanaan || 'Swakelola';
    if (inPola) inPola.value = curPola;

    const curSdgs = menjadi.sdgs || item.mendukung_sdgs || semula.sdgs || '';
    if (inSdgs) inSdgs.value = cleanSdgsDisplay ? cleanSdgsDisplay(curSdgs) : curSdgs;

    if (inEksisting) inEksisting.value = (menjadi.data_eksisting && menjadi.data_eksisting !== '-') ? menjadi.data_eksisting : (semula.data_eksisting || '');

    const mL = (item.menjadi?.manfaat_l && item.menjadi.manfaat_l !== '-') ? item.menjadi.manfaat_l :
               ((item.penerima_l_menjadi && item.penerima_l_menjadi !== '-') ? item.penerima_l_menjadi :
               (item.semula?.manfaat_l !== '-' ? item.semula?.manfaat_l : ''));
    const mP = (item.menjadi?.manfaat_p && item.menjadi.manfaat_p !== '-') ? item.menjadi.manfaat_p :
               ((item.penerima_p_menjadi && item.penerima_p_menjadi !== '-') ? item.penerima_p_menjadi :
               (item.semula?.manfaat_p !== '-' ? item.semula?.manfaat_p : ''));
    const mRtm = (item.menjadi?.manfaat_rtm && item.menjadi.manfaat_rtm !== '-') ? item.menjadi.manfaat_rtm :
                 ((item.penerima_rtm_menjadi && item.penerima_rtm_menjadi !== '-') ? item.penerima_rtm_menjadi :
                 (item.semula?.manfaat_rtm !== '-' ? item.semula?.manfaat_rtm : ''));

    if (inL) inL.value = mL || '';
    if (inP) inP.value = mP || '';
    if (inRtm) inRtm.value = mRtm || '';

    updateModalLiveDifference();
    modal.classList.remove('hidden');
}
window.openEditRkpPerubahanModal = openEditRkpPerubahanModal;

function closeEditRkpPerubahanModal() {
    const modal = document.getElementById('modalEditRkpPerubahan');
    if (modal) modal.classList.add('hidden');
}
window.closeEditRkpPerubahanModal = closeEditRkpPerubahanModal;

function copyAllFromSemulaToMenjadi() {
    const semVol = document.getElementById('edit-semula-volume')?.value?.trim();
    const semSat = document.getElementById('edit-semula-satuan')?.value?.trim();
    const semBiaya = document.getElementById('edit-semula-biaya')?.value;
    const semLokasi = document.getElementById('edit-semula-lokasi')?.value?.trim();
    const semWaktu = document.getElementById('edit-semula-waktu')?.value?.trim();
    const semSumber = document.getElementById('edit-semula-sumber-biaya')?.value;
    const semPola = document.getElementById('edit-semula-pola')?.value;
    const semSdgs = document.getElementById('edit-semula-sdgs')?.value?.trim();
    const semEksisting = document.getElementById('edit-semula-data-eksisting')?.value?.trim();
    const semL = document.getElementById('edit-semula-manfaat-l')?.value?.trim();
    const semP = document.getElementById('edit-semula-manfaat-p')?.value?.trim();
    const semRtm = document.getElementById('edit-semula-manfaat-rtm')?.value?.trim();

    const inVol = document.getElementById('edit-perubahan-volume');
    const inSat = document.getElementById('edit-perubahan-satuan');
    const inBiaya = document.getElementById('edit-perubahan-biaya');
    const inLokasi = document.getElementById('edit-perubahan-lokasi');
    const inWaktu = document.getElementById('edit-perubahan-waktu');
    const inSumber = document.getElementById('edit-perubahan-sumber-biaya');
    const inPola = document.getElementById('edit-perubahan-pola');
    const inSdgs = document.getElementById('edit-perubahan-sdgs');
    const inEksisting = document.getElementById('edit-perubahan-data-eksisting');
    const inL = document.getElementById('edit-perubahan-manfaat-l');
    const inP = document.getElementById('edit-perubahan-manfaat-p');
    const inRtm = document.getElementById('edit-perubahan-manfaat-rtm');

    if (inVol && semVol !== undefined) inVol.value = semVol || '1';
    if (inSat && semSat !== undefined) inSat.value = semSat || 'Paket';
    if (inBiaya && semBiaya !== undefined) inBiaya.value = semBiaya || 0;
    if (inLokasi && semLokasi !== undefined) inLokasi.value = semLokasi || 'Desa Batetangnga';
    if (inWaktu && semWaktu !== undefined) inWaktu.value = semWaktu || '12 Bulan';
    if (inSumber && semSumber !== undefined) inSumber.value = semSumber;
    if (inPola && semPola !== undefined) inPola.value = semPola;
    if (inSdgs && semSdgs !== undefined) inSdgs.value = semSdgs;
    if (inEksisting && semEksisting !== undefined) inEksisting.value = semEksisting;
    if (inL && semL !== undefined) inL.value = semL;
    if (inP && semP !== undefined) inP.value = semP;
    if (inRtm && semRtm !== undefined) inRtm.value = semRtm;

    updateModalLiveDifference();
    showToast('Data SEMULA disalin ke kolom MENJADI', 'success');
}
window.copyAllFromSemulaToMenjadi = copyAllFromSemulaToMenjadi;

function editInRabPerubahanFromModal() {
    const kode = document.getElementById('edit-perubahan-kode')?.value;
    if (kode) {
        window.location.href = `rab.html?kode=${encodeURIComponent(kode)}&tahun=${activeYear}&tipe=PERUBAHAN`;
    } else {
        window.location.href = `rab.html?tahun=${activeYear}&tipe=PERUBAHAN`;
    }
}
window.editInRabPerubahanFromModal = editInRabPerubahanFromModal;

async function saveEditRkpPerubahanItem(event) {
    if (event) event.preventDefault();
    const itemKey = document.getElementById('edit-perubahan-item-key')?.value;
    const item = findPerubahanItem(itemKey);
    if (!item) {
        showToast('❌ Data kegiatan tidak ditemukan', 'error');
        return;
    }

    const saveBtn = document.getElementById('btn-save-edit-perubahan');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-circle-notch animate-spin mr-1"></i> Menyimpan...';
    }

    const kode = item.kode_unik_full || item.kode_unik || document.getElementById('edit-perubahan-kode')?.value;

    // Nilai Sisi SEMULA
    const volSemula = document.getElementById('edit-semula-volume')?.value?.trim() || '1';
    const satSemula = document.getElementById('edit-semula-satuan')?.value?.trim() || 'Paket';
    const biayaSemula = Number(document.getElementById('edit-semula-biaya')?.value) || 0;
    const lokasiSemula = document.getElementById('edit-semula-lokasi')?.value?.trim() || 'Desa Batetangnga';
    const waktuSemula = document.getElementById('edit-semula-waktu')?.value?.trim() || '12 Bulan';
    const sumberSemula = document.getElementById('edit-semula-sumber-biaya')?.value || 'DDS';
    const polaSemula = document.getElementById('edit-semula-pola')?.value || 'Swakelola';
    const sdgsSemula = document.getElementById('edit-semula-sdgs')?.value?.trim() || '';
    const eksistingSemula = document.getElementById('edit-semula-data-eksisting')?.value?.trim() || '-';
    const mLSemula = document.getElementById('edit-semula-manfaat-l')?.value?.trim() || '-';
    const mPSemula = document.getElementById('edit-semula-manfaat-p')?.value?.trim() || '-';
    const mRtmSemula = document.getElementById('edit-semula-manfaat-rtm')?.value?.trim() || '-';

    // Nilai Sisi MENJADI
    const volMenjadi = document.getElementById('edit-perubahan-volume')?.value?.trim() || '1';
    const satMenjadi = document.getElementById('edit-perubahan-satuan')?.value?.trim() || 'Paket';
    const biayaMenjadi = Number(document.getElementById('edit-perubahan-biaya')?.value) || 0;
    const lokasiMenjadi = document.getElementById('edit-perubahan-lokasi')?.value?.trim() || 'Desa Batetangnga';
    const waktuMenjadi = document.getElementById('edit-perubahan-waktu')?.value?.trim() || '12 Bulan';
    const sumberMenjadi = document.getElementById('edit-perubahan-sumber-biaya')?.value || 'DDS';
    const polaMenjadi = document.getElementById('edit-perubahan-pola')?.value || 'Swakelola';
    const sdgsMenjadi = document.getElementById('edit-perubahan-sdgs')?.value?.trim() || '';
    const eksistingMenjadi = document.getElementById('edit-perubahan-data-eksisting')?.value?.trim() || '-';
    const mLMenjadi = document.getElementById('edit-perubahan-manfaat-l')?.value?.trim() || '-';
    const mPMenjadi = document.getElementById('edit-perubahan-manfaat-p')?.value?.trim() || '-';
    const mRtmMenjadi = document.getElementById('edit-perubahan-manfaat-rtm')?.value?.trim() || '-';

    const payload = {
        tahun: activeYear,
        kode_unik_full: kode,
        id: item.id || null,
        nama_kegiatan: item.nama_kegiatan || item.jenis_kegiatan || '-',
        bidang: item.bidang || 'Bidang Penyelenggaraan Pemerintahan Desa',
        // Struktur data Semula
        semula: {
            volume: volSemula,
            satuan: satSemula,
            biaya: biayaSemula,
            lokasi: lokasiSemula,
            sumber_biaya: sumberSemula,
            waktu_pelaksanaan: waktuSemula,
            pola_pelaksanaan: polaSemula,
            sdgs: sdgsSemula,
            data_eksisting: eksistingSemula,
            manfaat_l: mLSemula,
            manfaat_p: mPSemula,
            manfaat_rtm: mRtmSemula
        },
        // Struktur data Menjadi
        menjadi: {
            volume: volMenjadi,
            satuan: satMenjadi,
            biaya: biayaMenjadi,
            lokasi: lokasiMenjadi,
            sumber_biaya: sumberMenjadi,
            waktu_pelaksanaan: waktuMenjadi,
            pola_pelaksanaan: polaMenjadi,
            sdgs: sdgsMenjadi,
            data_eksisting: eksistingMenjadi,
            manfaat_l: mLMenjadi,
            manfaat_p: mPMenjadi,
            manfaat_rtm: mRtmMenjadi
        },
        // Fallback properti flat untuk kompatibilitas
        volume: volMenjadi,
        satuan: satMenjadi,
        biaya: biayaMenjadi,
        lokasi: lokasiMenjadi,
        sumber_biaya: sumberMenjadi,
        waktu_pelaksanaan: waktuMenjadi,
        pola_pelaksanaan: polaMenjadi,
        sdgs: sdgsMenjadi,
        data_eksisting: eksistingMenjadi,
        manfaat_l: mLMenjadi,
        manfaat_p: mPMenjadi,
        manfaat_rtm: mRtmMenjadi
    };

    try {
        const res = await fetch('/api/rkpdes/perubahan', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
            // Update objek SEMULA lokal
            if (!item.semula) item.semula = {};
            item.semula.volume = volSemula;
            item.semula.satuan = satSemula;
            item.semula.volume_satuan = (volSemula.toLowerCase().includes(satSemula.toLowerCase()) || !satSemula) ? volSemula : `${volSemula} ${satSemula}`;
            item.semula.biaya = biayaSemula;
            item.semula.lokasi = lokasiSemula;
            item.semula.sumber_biaya = sumberSemula;
            item.semula.waktu_pelaksanaan = waktuSemula;
            item.semula.pola_pelaksanaan = polaSemula;
            item.semula.data_eksisting = eksistingSemula;
            if (sdgsSemula) {
                const cleanSem = cleanSdgsDisplay ? cleanSdgsDisplay(sdgsSemula) : sdgsSemula;
                item.semula.sdgs = cleanSem ? `SDGs ${cleanSem}` : '-';
            }
            item.semula.manfaat_l = mLSemula;
            item.semula.manfaat_p = mPSemula;
            item.semula.manfaat_rtm = mRtmSemula;
            item.penerima_l_semula = mLSemula;
            item.penerima_p_semula = mPSemula;
            item.penerima_rtm_semula = mRtmSemula;

            // Update objek MENJADI lokal
            if (!item.menjadi) item.menjadi = {};
            item.menjadi.volume = volMenjadi;
            item.menjadi.satuan = satMenjadi;
            item.menjadi.volume_satuan = (volMenjadi.toLowerCase().includes(satMenjadi.toLowerCase()) || !satMenjadi) ? volMenjadi : `${volMenjadi} ${satMenjadi}`;
            item.menjadi.biaya = biayaMenjadi;
            item.menjadi.lokasi = lokasiMenjadi;
            item.menjadi.sumber_biaya = sumberMenjadi;
            item.menjadi.waktu_pelaksanaan = waktuMenjadi;
            item.menjadi.pola_pelaksanaan = polaMenjadi;
            item.menjadi.data_eksisting = eksistingMenjadi;
            if (sdgsMenjadi) {
                const cleanMen = cleanSdgsDisplay ? cleanSdgsDisplay(sdgsMenjadi) : sdgsMenjadi;
                item.menjadi.sdgs = cleanMen ? `SDGs ${cleanMen}` : '-';
            }
            item.menjadi.manfaat_l = mLMenjadi;
            item.menjadi.manfaat_p = mPMenjadi;
            item.menjadi.manfaat_rtm = mRtmMenjadi;
            item.penerima_l_menjadi = mLMenjadi;
            item.penerima_p_menjadi = mPMenjadi;
            item.penerima_rtm_menjadi = mRtmMenjadi;

            item.selisih = biayaMenjadi - biayaSemula;
            item.status_perubahan = item.selisih > 0 ? 'bertambah' : (item.selisih < 0 ? 'berkurang' : 'tetap');

            closeEditRkpPerubahanModal();
            renderRkpdesPerubahanPreview();
            showToast('✅ Berhasil memperbarui data RKPDes / RAB Perubahan (Semula & Menjadi)!', 'success');
        } else {
            showToast(`❌ Gagal menyimpan: ${result.error || 'Terjadi kesalahan'}`, 'error');
        }
    } catch (err) {
        console.error('❌ Error saveEditRkpPerubahanItem:', err);
        showToast('❌ Gagal menghubungi server', 'error');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save mr-1"></i> Simpan Perubahan';
        }
    }
}
window.saveEditRkpPerubahanItem = saveEditRkpPerubahanItem;