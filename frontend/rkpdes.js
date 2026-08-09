function switchTab(tab) {
    window.location.href = tab + '.html';
}

let rkpdesList = [];
let activeYear = 2027;

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

    const storedYear = localStorage.getItem('ACTIVE_TAHUN_ANGGARAN') || '2027';
    const selectYearEl = document.getElementById('select-year');
    if (selectYearEl) selectYearEl.value = storedYear;

    window.addEventListener('tahunChanged', (e) => {
        if (e && e.detail && e.detail.tahun) {
            if (selectYearEl) selectYearEl.value = e.detail.tahun;
            loadRkpdesData();
        }
    });

    loadRkpdesData();
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
        const nama = document.getElementById('input-nama-manual-tim')?.value?.trim() || 'Abdul Azis, S. Pd';
        const jabatan = document.getElementById('input-jabatan-manual-tim')?.value?.trim() || 'Ketua Tim Penyusun RKPDesa';
        return { nama, jabatan };
    }

    if (val && val.includes('|')) {
        const parts = val.split('|');
        return { nama: parts[0], jabatan: parts[1] };
    }

    return { nama: 'Abdul Azis, S. Pd', jabatan: 'Ketua Tim Penyusun RKPDesa' };
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
    updateLivePreview();
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

function updateLivePreview() {
    const container = document.getElementById('livePreviewContainer');
    if (!container) return;

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
                        const totalManfaatVal = Number(item.total_manfaat || rpjmObj.total_manfaat || 0);
                        const volume = totalManfaatVal > 0 ? totalManfaatVal : (item.volume || rpjmObj.volume || rpjmObj.volume_kegiatan || '1');
                        const satuan = totalManfaatVal > 0 ? 'Orang' : (item.satuan || rpjmObj.satuan || 'Kegiatan');
                        const penerimaManfaatStr = parsePenerimaManfaat(item);
                        
                        const targetCapaianVal = item.target_capaian || rpjmObj.target_capaian || rpjmObj.target_capaian_kegiatan || item.volume || '-';
                        
                        const rawWaktu = item.waktu_pelaksanaan || rpjmObj.waktu_pelaksanaan || '';
                        const waktuPelaksanaanVal = (rawWaktu && rawWaktu !== String(activeYear)) ? rawWaktu : '12 Bulan';
                        const itemKey = String(item.kode_unik_full || item.kode_unik || item.id || index);
                        const namaKegiatan = item.nama_kegiatan || item._namaKegiatan || item.jenis_kegiatan || rpjmObj.nama_kegiatan || '-';
                        const dataEksistingVal = item.data_eksisting || item.data_existing || rpjmObj.data_eksisting || rpjmObj.data_existing || '-';

                        const sdgsVal = item.mendukung_sdgs || item.sdgs || rpjmObj.mendukung_sdgs || rpjmObj.sdgs || '-';
                        const verifVal = item.verifikasi_proposal || rpjmObj.verifikasi_proposal || 'Belum';
                        const stuntingVal = item.stunting || rpjmObj.stunting || 'Tidak';

                        tableBodyHtml += `
                            <tr class="hover:bg-slate-50/80 transition-colors">
                                ${isFirstRowInBidang ? `<td rowspan="${totalRowsInBidang}" class="text-center align-top border border-slate-300 font-bold py-2 px-1 bg-white text-slate-800">${currentNo}</td>` : ''}
                                ${isFirstRowInBidang ? `<td rowspan="${totalRowsInBidang}" class="align-top border border-slate-300 font-bold bg-white text-slate-900 px-3 py-2 leading-snug">${bidang.key}. ${bidang.name}</td>` : ''}
                                <td class="align-top border border-slate-300 px-3 py-2 text-slate-900 font-semibold pl-6">
                                    ${namaKegiatan}
                                </td>
                                <td class="text-center align-top border border-slate-300 px-2 py-2 font-semibold text-slate-800">${sdgsVal}</td>
                                <td class="align-top border border-slate-300 px-2 py-2 text-slate-700">${dataEksistingVal}</td>
                                <td class="align-top border border-slate-300 px-2 py-2 text-slate-700">${targetCapaianVal}</td>
                                <td class="align-top border border-slate-300 px-2 py-2 text-slate-700">${item.lokasi || '-'}</td>
                                <td class="text-center align-top border border-slate-300 px-2 py-2 whitespace-nowrap text-slate-800 font-medium">${volume} ${satuan}</td>
                                <td class="text-center align-top border border-slate-300 px-2 py-2 text-slate-800">${penerimaManfaatStr}</td>
                                <td class="text-center align-top border border-slate-300 px-2 py-2 whitespace-nowrap text-slate-800">${waktuPelaksanaanVal}</td>
                                <td class="text-center align-top border border-slate-300 px-2 py-2 font-semibold text-slate-700">${item.sumber_pembiayaan || 'DDS'}</td>
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

    container.innerHTML = `
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
    document.getElementById('edit-rkp-lokasi').value = item.lokasi || '';
    document.getElementById('edit-rkp-data-eksisting').value = item.data_eksisting || item.data_existing || '';
    
    document.getElementById('edit-rkp-target-capaian').value = item.target_capaian || item.volume || '';
    
    document.getElementById('edit-rkp-volume').value = item.volume || '1';
    document.getElementById('edit-rkp-satuan').value = 'Kegiatan';
    document.getElementById('edit-rkp-biaya').value = item.prakiraan_biaya || 0;
    
    // Parse manfaat from sasaran_manfaat
    let mVal = item.sasaran_manfaat || '';
    if (typeof mVal === 'string' && mVal.includes('Total:')) {
        const totalMatch = mVal.match(/Total:\s*(\d+)/i);
        mVal = totalMatch ? totalMatch[1] : '';
    } else if (typeof mVal === 'string') {
        const matches = mVal.match(/\d+/g);
        mVal = matches ? matches[0] : '';
    }
    document.getElementById('edit-rkp-manfaat').value = mVal;
    
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