// ============================================================
// RANCANGAN RKPDes - CONTROLLER LOGIC (SINKRON 5 BIDANG & PRIORITAS USULAN)
// ============================================================

let rancanganList = [];
let currentPage = 1;
const itemsPerPage = 20;
let showAllRows = false; // ⛔ default false — jangan render semua sekaligus

const NAMA_BIDANG_RKPDES = {
    1: "Bidang Penyelenggaraan Pemerintahan Desa",
    2: "Bidang Pelaksanaan Pembangunan Desa",
    3: "Bidang Pembinaan Kemasyarakatan",
    4: "Bidang Pemberdayaan Masyarakat",
    5: "Bidang Penanggulangan Bencana, Keadaan Darurat dan Mendesak Desa"
};

// 1. Ekstraksi Nomor Bidang (1-5)
function extractBidangNumber(item) {
    if (!item) return 1;

    const kode = String(
        item.kode_unik || 
        item.kode_unik_full || 
        item.kode_kegiatan || 
        item.kode_sub || 
        item.kode_bidang || ''
    ).trim();

    const match = kode.match(/^\s*0?([1-5])\./);
    if (match) {
        return parseInt(match[1], 10);
    }

    const directNum = parseInt(item.bidang || item.bidang_ke, 10);
    if (!isNaN(directNum) && directNum >= 1 && directNum <= 5) {
        return directNum;
    }

    const teksBidang = String(item.bidang || item.nama_bidang || item.bidang_nama || item.jenis_bidang || '').toLowerCase();
    
    if (teksBidang.includes('pembangunan')) return 2;
    if (teksBidang.includes('pembinaan') || teksBidang.includes('kemasyarakatan')) return 3;
    if (teksBidang.includes('pemberdayaan')) return 4;
    if (teksBidang.includes('bencana') || teksBidang.includes('darurat') || teksBidang.includes('mendesak')) return 5;
    if (teksBidang.includes('penyelenggaraan') || teksBidang.includes('pemerintahan')) return 1;

    return 1;
}

// Normalisasi item Rancangan RKPDes: petakan kolom BARU (prioritas_usulan / rpjm)
// ke kolom LAMA agar semua kolom tabel terisi benar.
function normalisasiRancanganItem(item) {
    if (!item) return item;
    return {
        ...item,
        bidang: extractBidangNumber(item),
        sub_kegiatan: item.sub_kegiatan || item.nama_kegiatan || '-',
        mendukung_sdgs: String(item.mendukung_sdgs || item.sdgs || '').replace(/[^0-9]/g, '') || '-',
        data_eksisting: item.data_eksisting || item.data_existing || 'Perlu Peningkatan',
        lokasi: item.lokasi || item.lokasi_kegiatan || 'Desa Batetangnga',
        volume_satuan: item.volume_satuan || item.volume_kegiatan || (item.volume ? `${item.volume} ${item.satuan || ''}`.trim() : '12 Bulan'),
        penerima_laki: parseInt(item.penerima_laki ?? item.manfaat_l ?? 0, 10),
        penerima_perempuan: parseInt(item.penerima_perempuan ?? item.manfaat_p ?? 0, 10),
        penerima_rtm: parseInt(item.penerima_rtm ?? item.manfaat_rtm ?? 0, 10),
        prakiraan_biaya: parseFloat(item.prakiraan_biaya ?? item.pagu_rpjm ?? item.pagu_indikatif ?? 0),
        sumber_pembiayaan: item.sumber_pembiayaan || item.sumber_dana || 'ADD',
        kode_unik: item.kode_unik || item.kode_unik_full || ''
    };
}

function compareKodeUnikFull(aKode, bKode) {
    const strA = String(aKode || '').trim();
    const strB = String(bKode || '').trim();
    if (!strA && !strB) return 0;
    if (!strA) return 1;
    if (!strB) return -1;
    const partsA = strA.split(/[\.\-\s]+/).filter(Boolean).map(p => parseInt(p, 10) || 0);
    const partsB = strB.split(/[\.\-\s]+/).filter(Boolean).map(p => parseInt(p, 10) || 0);
    const maxLen = Math.max(partsA.length, partsB.length);
    for (let i = 0; i < maxLen; i++) {
        const valA = partsA[i] !== undefined ? partsA[i] : 0;
        const valB = partsB[i] !== undefined ? partsB[i] : 0;
        if (valA !== valB) return valA - valB;
    }
    return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
}

function sortRancanganByKodeUnik(list) {
    if (!Array.isArray(list)) return [];
    return [...list].sort((a, b) => {
        const kA = a.kode_unik_full || a.kode_unik || '';
        const kB = b.kode_unik_full || b.kode_unik || '';
        return compareKodeUnikFull(kA, kB);
    });
}

function normalisasiRancanganList(rawList) {
    if (!Array.isArray(rawList)) return [];
    return sortRancanganByKodeUnik(rawList.map(normalisasiRancanganItem));
}

function updateTTD() {
    const tanggal = document.getElementById('tanggal-input')?.value || '2026-08-02';
    const kepalaDesa = document.getElementById('kepala-desa-input')?.value || 'SUMAILA DAMANG';
    const ketuaTim = document.getElementById('ketua-tim-input')?.value || 'Abdul Azis, S. Pd';
    
    const tglEl = document.getElementById('tanggal-cetak');
    if (tglEl) {
        const date = new Date(tanggal + 'T00:00:00');
        tglEl.textContent = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    
    const kepalaEl = document.getElementById('kepala-desa-nama');
    if (kepalaEl) kepalaEl.textContent = kepalaDesa;
    
    const ketuaEl = document.getElementById('ketua-tim-nama');
    if (ketuaEl) ketuaEl.textContent = ketuaTim;
}

document.addEventListener('DOMContentLoaded', () => {
    updateTTD();
    loadRancanganData();
});

function changePage(page) {
    if (page < 1) return;
    const totalPages = Math.max(1, Math.ceil(rancanganList.length / itemsPerPage));
    if (page > totalPages) return;

    showAllRows = false;
    currentPage = page;
    renderRancanganTable();
}

function loadAllData() {
    showAllRows = true;
    currentPage = 1;
    renderRancanganTable();
}

function formatRupiah(number) {
    const num = parseNumber(number);
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

function parseNumber(val) {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const clean = String(val).replace(/[^0-9,-]/g, '').replace(',', '');
    return parseInt(clean, 10) || 0;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

window.addEventListener('tahunChanged', (e) => {
    if (e && e.detail && e.detail.tahun) {
        if (typeof loadRancanganData === 'function') loadRancanganData();
    }
});

// 2. Load Data dari DB (dari tabel rancangan_rkpdes; jika kosong, auto-pull dari rpjmdes_standar)
async function loadRancanganData() {
    const rkpYear = parseInt(localStorage.getItem('ACTIVE_TAHUN_ANGGARAN') || document.getElementById('select-year')?.value || '2027', 10);
    showAllRows = false;
    currentPage = 1;
    console.log(`📡 Load Rancangan RKPDes tahun ${rkpYear} dari tabel rancangan_rkpdes...`);

    const yearTitle = document.getElementById('print-year-title');
    if (yearTitle) yearTitle.innerText = `TAHUN ANGGARAN ${rkpYear}`;

    const tbody = document.getElementById('rancangan-body');
    if (tbody) tbody.innerHTML = `<tr><td colspan="11" class="text-center py-8 text-slate-400 italic"><i class="fas fa-spinner fa-spin mr-2"></i>Memuat data tahun ${rkpYear}...</td></tr>`;

    try {
        const res = await fetch(`/api/rancangan-rkpdes?tahun=${rkpYear}`);
        const json = await res.json();

        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            rancanganList = normalisasiRancanganList(json.data);
            renderRancanganTable();
        } else {
            if (autoSyncTahunRancangan !== rkpYear) {
                autoSyncTahunRancangan = rkpYear;
                console.log(`🔄 DB kosong untuk tahun ${rkpYear}, menarik otomatis dari RPJMDes...`);
                await fetch('/api/rancangan-rkpdes/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tahun: rkpYear })
                });
                return loadRancanganData();
            }

            rancanganList = [];
            renderRancanganTable();
        }
    } catch (err) {
        console.error("❌ Error loadRancanganData:", err);
    }
}

let mainSearchKeyword = '';

function filterRancanganTable() {
    const input = document.getElementById('search-rkpdes-input');
    const clearBtn = document.getElementById('btn-clear-search');
    mainSearchKeyword = (input?.value || '').toLowerCase().trim();

    if (clearBtn) {
        if (mainSearchKeyword.length > 0) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    currentPage = 1;
    renderRancanganTable();
}

function clearSearchRkpdes() {
    const input = document.getElementById('search-rkpdes-input');
    if (input) input.value = '';
    filterRancanganTable();
}

function toggleExtraMenu() {
    const dropdown = document.getElementById('extra-menu-dropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
}

document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('extra-menu-dropdown');
    const toggleBtn = e.target.closest('button[onclick*="toggleExtraMenu"]');
    if (dropdown && !dropdown.classList.contains('hidden') && !toggleBtn && !dropdown.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});

// 3. Render Tabel Rancangan RKPDes (5 Bidang + Sub Bidang & Jenis Kegiatan Grouping)
function renderRancanganTable() {
    const tbody = document.getElementById('rancangan-body');
    if (!tbody) return;

    let filteredDataList = rancanganList;
    if (mainSearchKeyword) {
        filteredDataList = rancanganList.filter(item => {
            const sub = String(item.sub_kegiatan || item.nama_kegiatan || '').toLowerCase();
            const keg = String(item.jenis_kegiatan || item.kelompok_kegiatan || '').toLowerCase();
            const bid = String(item.jenis_bidang || item.sub_bidang || '').toLowerCase();
            const lok = String(item.lokasi || item.lokasi_kegiatan || '').toLowerCase();
            const kode = String(item.kode_unik_full || item.kode_unik || '').toLowerCase();
            return sub.includes(mainSearchKeyword) || keg.includes(mainSearchKeyword) || bid.includes(mainSearchKeyword) || lok.includes(mainSearchKeyword) || kode.includes(mainSearchKeyword);
        });
    }

    const totalItems = filteredDataList.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    if (currentPage > totalPages) currentPage = totalPages;

    const pageData = showAllRows
        ? filteredDataList
        : filteredDataList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    let html = '';
    let grandTotalBiaya = 0;
    let totalKegiatanCount = 0;

    for (let b = 1; b <= 5; b++) {
        const itemsInBidang = pageData.filter(item => extractBidangNumber(item) === b);
        let subtotalBiaya = 0;

        // Header Bidang Wajib
        html += `
            <tr class="bg-slate-200 text-slate-900 font-bold border-b border-t border-slate-300">
                <td class="p-2 text-center font-extrabold">${b}</td>
                <td colspan="10" class="p-2 uppercase tracking-wide text-indigo-950 font-bold">
                    BIDANG ${b}: ${NAMA_BIDANG_RKPDES[b]}
                </td>
                <td class="p-2 text-center no-print">
                    <button onclick="addRow(${b})" title="Tambah Kegiatan di Bidang ${b}" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2 py-1 rounded transition">
                        <i class="fas fa-plus"></i> Tambah
                    </button>
                </td>
            </tr>
        `;

        if (itemsInBidang.length === 0) {
            html += `
                <tr class="italic text-slate-400 bg-white">
                    <td class="p-2 text-center border border-slate-300">-</td>
                    <td colspan="10" class="p-2 text-center border border-slate-300">Belum ada usulan kegiatan untuk Bidang ${b}</td>
                    <td class="p-2 text-center border border-slate-300 no-print"></td>
                </tr>
            `;
        } else {
            // Sort itemsInBidang secara ketat berdasarkan kode_unik_full / kode_unik
            itemsInBidang.sort((a, b) => compareKodeUnikFull(a.kode_unik_full || a.kode_unik, b.kode_unik_full || b.kode_unik));

            let lastSubName = '';
            let lastKegName = '';
            let globalIdxInBidang = 1;

            itemsInBidang.forEach((item) => {
                totalKegiatanCount++;
                const biaya = parseNumber(item.prakiraan_biaya || item.pagu_indikatif);
                subtotalBiaya += biaya;
                grandTotalBiaya += biaya;
                const globalIndex = rancanganList.indexOf(item);

                const subName = (item.jenis_bidang || item.sub_bidang || 'SUB BIDANG UMUM').trim().toUpperCase();
                const kegName = (item.jenis_kegiatan || item.kelompok_kegiatan || 'Kegiatan Umum').trim();

                if (subName && subName !== lastSubName) {
                    lastSubName = subName;
                    lastKegName = '';
                    html += `
                        <tr class="bg-indigo-50/70 text-indigo-900 font-semibold border-b border-slate-300">
                            <td class="p-1 text-center"></td>
                            <td colspan="11" class="p-1 px-3 text-[11px] tracking-wide">
                                <i class="fas fa-layer-group text-indigo-500 mr-1"></i> ${escapeHtml(subName)}
                            </td>
                        </tr>
                    `;
                }

                if (kegName && kegName.toLowerCase() !== 'kegiatan umum' && kegName !== lastKegName) {
                    lastKegName = kegName;
                    html += `
                        <tr class="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                            <td class="p-1 text-center"></td>
                            <td colspan="11" class="p-1 px-5 text-[10px] italic">
                                <i class="fas fa-caret-right text-slate-400 mr-1"></i> ${escapeHtml(kegName)}
                            </td>
                        </tr>
                    `;
                }

                const kodeVal = String(item.kode_unik_full || item.kode_unik || '').trim();

                html += `
                    <tr class="hover:bg-purple-50/50 transition border-b border-slate-200">
                        <td class="p-1.5 text-center font-semibold text-slate-600 border border-slate-300">${globalIdxInBidang++}</td>
                        <td class="p-1 border border-slate-300">
                            <div class="flex items-center justify-between gap-1">
                                <input type="text" value="${escapeHtml(item.sub_kegiatan || item.nama_kegiatan || '')}" onchange="updateFieldData(${b}, ${globalIndex}, 'sub_kegiatan', this.value)" class="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-purple-500 rounded outline-none font-semibold text-slate-800" placeholder="Nama Kegiatan...">
                                ${kodeVal ? `<span class="shrink-0 text-[10px] font-mono font-semibold px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded border border-purple-200" title="Kode Unik">${escapeHtml(kodeVal)}</span>` : ''}
                            </div>
                        </td>
                        <td class="p-1 border border-slate-300">
                                    <input type="text" value="${escapeHtml(String(item.mendukung_sdgs || '').replace(/[^0-9]/g, '') || '-')}" onchange="updateFieldData(${b}, ${globalIndex}, 'mendukung_sdgs', this.value.replace(/[^0-9]/g, ''))" class="w-full px-1 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-purple-500 rounded outline-none text-center" placeholder="SDGs...">
                                </td>
                                <td class="p-1 border border-slate-300">
                                    <input type="text" value="${escapeHtml(item.data_eksisting || '-')}" onchange="updateFieldData(${b}, ${globalIndex}, 'data_eksisting', this.value)" class="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-purple-500 rounded outline-none" placeholder="Data Eksisting...">
                                </td>
                                <td class="p-1 border border-slate-300">
                                    <input type="text" value="${escapeHtml(item.lokasi || 'Desa Batetangnga')}" onchange="updateFieldData(${b}, ${globalIndex}, 'lokasi', this.value)" class="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-purple-500 rounded outline-none" placeholder="Lokasi...">
                                </td>
                                <td class="p-1 border border-slate-300">
                                    <input type="text" value="${escapeHtml(item.volume_satuan || item.volume || '-')}" onchange="updateFieldData(${b}, ${globalIndex}, 'volume_satuan', this.value)" class="w-full px-1 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-purple-500 rounded outline-none text-center" placeholder="Volume...">
                                </td>
                                <td class="p-1 border border-slate-300 w-12">
                                    <input type="number" value="${item.penerima_laki || 0}" onchange="updateFieldData(${b}, ${globalIndex}, 'penerima_laki', this.value)" class="w-full px-0.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-purple-500 rounded outline-none text-center font-mono">
                                </td>
                                <td class="p-1 border border-slate-300 w-12">
                                    <input type="number" value="${item.penerima_perempuan || 0}" onchange="updateFieldData(${b}, ${globalIndex}, 'penerima_perempuan', this.value)" class="w-full px-0.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-purple-500 rounded outline-none text-center font-mono">
                                </td>
                                <td class="p-1 border border-slate-300 w-14">
                                    <input type="number" value="${item.penerima_rtm || 0}" onchange="updateFieldData(${b}, ${globalIndex}, 'penerima_rtm', this.value)" class="w-full px-0.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-purple-500 rounded outline-none text-center font-mono">
                                </td>
                                <td class="p-1 border border-slate-300">
                                    <input type="text" value="${formatRupiah(biaya)}" onfocus="this.value = parseNumber(this.value)" onblur="this.value = formatRupiah(this.value)" onchange="updateFieldData(${b}, ${globalIndex}, 'prakiraan_biaya', this.value)" class="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-purple-500 rounded outline-none text-right font-semibold text-emerald-700 font-mono" placeholder="Rp 0">
                                </td>
                                <td class="p-1 border border-slate-300">
                                    <input type="text" value="${escapeHtml(item.sumber_pembiayaan || 'ADD')}" onchange="updateFieldData(${b}, ${globalIndex}, 'sumber_pembiayaan', this.value)" class="w-full px-1 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-purple-500 rounded outline-none text-center uppercase font-medium" placeholder="DDS/ADD">
                                </td>
                                <td class="p-1 text-center border border-slate-300 no-print">
                                    <button onclick="deleteRow(${b}, ${globalIndex}, '${item.id || ''}')" title="Hapus Kegiatan" class="text-rose-600 hover:text-rose-800 p-1 transition">
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                        globalIdxInBidang++;
                    });
        }

        // Subtotal Bidang
        html += `
            <tr class="bg-purple-50/70 text-purple-950 font-bold border-b-2 border-slate-300">
                <td colspan="9" class="p-2 text-right uppercase text-[11px] tracking-wide">JUMLAH PER BIDANG ${b}:</td>
                <td class="p-2 text-right text-purple-900 font-extrabold font-mono">${formatRupiah(subtotalBiaya)}</td>
                <td colspan="2" class="p-2"></td>
            </tr>
        `;
    }

    requestAnimationFrame(() => {
        tbody.innerHTML = html;

        const grandEl = document.getElementById('grand-total-biaya');
        if (grandEl) grandEl.innerText = formatRupiah(grandTotalBiaya);

        const statEl = document.getElementById('stat-summary');
        if (statEl) statEl.innerText = `Total Kegiatan: ${totalKegiatanCount} | Total Biaya: ${formatRupiah(grandTotalBiaya)}`;

        const paginationEl = document.getElementById('pagination-container');
        if (paginationEl) {
            if (showAllRows || totalItems <= itemsPerPage) {
                paginationEl.innerHTML = '';
            } else {
                const prevDisabled = currentPage <= 1 ? 'disabled' : '';
                const nextDisabled = currentPage >= totalPages ? 'disabled' : '';
                paginationEl.innerHTML = `
                    <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs no-print">
                        <div class="text-slate-600">Menampilkan ${Math.min(itemsPerPage, totalItems)} dari ${totalItems} data • Halaman ${currentPage} dari ${totalPages}</div>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="changePage(1)" class="px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-700 ${prevDisabled}" ${prevDisabled}>« Awal</button>
                            <button type="button" onclick="changePage(${currentPage - 1})" class="px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-700 ${prevDisabled}" ${prevDisabled}>‹ Sebelumnya</button>
                            <button type="button" onclick="changePage(${currentPage + 1})" class="px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-700 ${nextDisabled}" ${nextDisabled}>Berikutnya ›</button>
                            <button type="button" onclick="changePage(${totalPages})" class="px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-700 ${nextDisabled}" ${nextDisabled}>Akhir »</button>
                        </div>
                    </div>
                `;
            }
        }
    });
}

// 4. Tarik Data dari Prioritas Usulan (opsional)
async function tarikDariPrioritasUsulan(showAlert = true) {
    const rkpYear = parseInt(document.getElementById('select-year')?.value || '2027', 10);
    console.log(`📥 Menarik data dari Prioritas Usulan untuk Rancangan RKPDes tahun ${rkpYear}...`);

    const tbody = document.getElementById('rancangan-body');
    if (tbody) tbody.innerHTML = `<tr><td colspan="11" class="text-center py-6 text-amber-600 font-sans italic"><i class="fas fa-sync fa-spin mr-2"></i>Menarik data dari Prioritas Usulan...</td></tr>`;

    try {
        const res = await fetch(`/api/rancangan-rkpdes/tarik-prioritas?tahun=${rkpYear}`);
        const json = await res.json();

        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            rancanganList = normalisasiRancanganList(json.data);

            renderRancanganTable();
            if (showAlert) {
                alert(`✅ Berhasil menarik ${rancanganList.length} data dari modul Prioritas Usulan untuk Rancangan RKPDes tahun ${rkpYear}.\n\n⚠️  Data ini belum tersimpan ke database.\nKlik "Simpan Ke DB" untuk menyimpan secara permanen.`);
            }
        } else {
            rancanganList = [];
            renderRancanganTable();
            const msg = json.message || `Tidak ada data prioritas usulan untuk tahun ${rkpYear}.`;
            if (showAlert) alert(`📭 ${msg}\n\nSilakan isi dan simpan data di modul Prioritas Usulan terlebih dahulu.`);
        }
    } catch (err) {
        console.error("❌ Error tarikDariPrioritasUsulan:", err);
        if (showAlert) alert(`❌ Gagal menarik data: ${err.message}`);
    }
}

// 4b. Tarik Otomatis dari RPJMDes Standar berdasarkan tahun target
async function tarikDariRPJMDes(showAlert = true) {
    const rkpYear = parseInt(document.getElementById('select-year')?.value || '2027', 10);
    console.log(`📥 Menarik data otomatis dari RPJMDes Standar untuk Rancangan RKPDes tahun ${rkpYear}...`);

    const tbody = document.getElementById('rancangan-body');
    if (tbody) tbody.innerHTML = `<tr><td colspan="11" class="text-center py-6 text-indigo-600 font-sans italic"><i class="fas fa-sync fa-spin mr-2"></i>Menarik & menyimpan data dari RPJMDes Standar tahun ${rkpYear}...</td></tr>`;

    try {
        const res = await fetch('/api/rancangan-rkpdes/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tahun: rkpYear })
        });
        const json = await res.json();

        if (json.success) {
            autoSyncTahunRancangan = rkpYear;
            await loadRancanganData();
            if (showAlert) {
                alert(`✅ ${json.message}`);
            }
        } else {
            alert(`❌ Gagal menarik data: ${json.error || json.message}`);
        }
    } catch (err) {
        console.error("❌ Error tarikDariRPJMDes:", err);
        if (showAlert) alert(`❌ Gagal menarik data dari RPJMDes: ${err.message}`);
    }
}

// ============================================================
// MODAL TARIK MANUAL DARI RPJMDES (DESAIN & SINKRONISASI INDIVIDUAL)
// ============================================================

let modalKegiatanRpjmList = [];
let modalSelectedIndices = new Set();

function isRpjmTargetDitarikFrontend(item, tahun) {
    if (!item || !tahun) return false;
    const targetCol = `target_${tahun}`;
    const val = String(item[targetCol] || '').trim().toLowerCase();
    if (!val || val === '-' || val === 'tidak' || val === 'null' || val === 'undefined') return false;
    if (val === 'ya' || val === String(tahun) || val.includes(String(tahun))) return true;
    return false;
}

function openModalTarikManualRPJM() {
    const modal = document.getElementById('modal-tarik-manual-rpjm');
    if (!modal) return;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    const activeRkpYear = document.getElementById('select-year')?.value || '2027';
    const selectSumber = document.getElementById('modal-tahun-sumber-rpjm');
    if (selectSumber && [...selectSumber.options].some(o => o.value === activeRkpYear)) {
        selectSumber.value = activeRkpYear;
    }

    modalSelectedIndices.clear();
    const searchInput = document.getElementById('modal-search-rpjm');
    if (searchInput) searchInput.value = '';
    const filterCheckbox = document.getElementById('modal-filter-ditarik-only');
    if (filterCheckbox) filterCheckbox.checked = false;

    updateModalTerpilihCountRPJM();
    loadKegiatanRpjmManual();
}

function closeModalTarikManualRPJM() {
    const modal = document.getElementById('modal-tarik-manual-rpjm');
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

async function loadKegiatanRpjmManual() {
    const selectSumber = document.getElementById('modal-tahun-sumber-rpjm');
    const tahunSumber = selectSumber ? selectSumber.value : '2027';
    const container = document.getElementById('modal-container-rpjm');
    const totalEl = document.getElementById('modal-jumlah-data-rpjm');

    if (container) {
        container.innerHTML = '<div class="text-center py-12 text-slate-400 font-medium"><i class="fas fa-spinner fa-spin mr-2"></i>Memuat data RPJMDes Standar...</div>';
    }

    try {
        const response = await fetch(`/api/rpjmdes-standar?tahun=${tahunSumber}`);
        const data = await response.json();

        if (data.success && Array.isArray(data.data)) {
            modalKegiatanRpjmList = data.data;
            modalSelectedIndices.clear();
            filterKegiatanRpjmManual();
        } else {
            modalKegiatanRpjmList = [];
            modalSelectedIndices.clear();
            if (container) container.innerHTML = '<div class="text-center py-12 text-slate-400 font-medium">📭 Tidak ada data RPJMDes untuk tahun ini</div>';
            if (totalEl) totalEl.textContent = '0 kegiatan';
            updateModalTerpilihCountRPJM();
        }
    } catch (error) {
        console.error('❌ Error loadKegiatanRpjmManual:', error);
        if (container) container.innerHTML = `<div class="text-center py-12 text-rose-500 font-semibold">❌ Gagal memuat data: ${error.message}</div>`;
    }
}

function filterKegiatanRpjmManual() {
    const selectSumber = document.getElementById('modal-tahun-sumber-rpjm');
    const tahunSumber = selectSumber ? selectSumber.value : '2027';
    const keyword = (document.getElementById('modal-search-rpjm')?.value || '').toLowerCase().trim();
    const ditarikOnly = document.getElementById('modal-filter-ditarik-only')?.checked || false;

    let filtered = modalKegiatanRpjmList.filter(item => {
        if (ditarikOnly && !isRpjmTargetDitarikFrontend(item, tahunSumber)) {
            return false;
        }
        if (keyword) {
            const nama = (item.nama_kegiatan || item.jenis_kegiatan || item.sub_kegiatan || '').toLowerCase();
            const bidang = (item.jenis_bidang || item.bidang || '').toLowerCase();
            const kode = (item.kode_unik_full || item.kode_unik || '').toLowerCase();
            return nama.includes(keyword) || bidang.includes(keyword) || kode.includes(keyword);
        }
        return true;
    });

    const totalEl = document.getElementById('modal-jumlah-data-rpjm');
    if (totalEl) totalEl.textContent = `${filtered.length} kegiatan`;

    renderDaftarKegiatanManual(filtered);
}

function renderDaftarKegiatanManual(filteredItems) {
    const container = document.getElementById('modal-container-rpjm');
    if (!container) return;

    if (filteredItems.length === 0) {
        container.innerHTML = '<div class="text-center py-12 text-slate-400 font-medium">📭 Tidak ada kegiatan RPJMDes yang cocok dengan filter</div>';
        return;
    }

    const selectSumber = document.getElementById('modal-tahun-sumber-rpjm');
    const tahunSumber = selectSumber ? selectSumber.value : '2027';

    let html = `
        <table class="w-full text-xs border-collapse border border-slate-200">
            <thead>
                <tr class="bg-slate-100 font-bold border-b border-slate-200 text-slate-700">
                    <th class="px-2 py-2 text-center w-10 border border-slate-200">
                        <input type="checkbox" onchange="toggleAllKegiatanRpjmManual(this)" id="modal-checkbox-all" class="rounded border-slate-300">
                    </th>
                    <th class="px-2 py-2 text-center w-10 border border-slate-200">No</th>
                    <th class="px-3 py-2 text-left border border-slate-200">Nama Kegiatan / Sub Kegiatan</th>
                    <th class="px-3 py-2 text-left border border-slate-200">Bidang</th>
                    <th class="px-3 py-2 text-right border border-slate-200">Pagu RPJM (Rp)</th>
                    <th class="px-3 py-2 text-center w-28 border border-slate-200">Target ${tahunSumber}</th>
                    <th class="px-3 py-2 text-center w-24 border border-slate-200">Aksi</th>
                </tr>
            </thead>
            <tbody>
    `;

    filteredItems.forEach((item, displayIdx) => {
        const rawIndex = modalKegiatanRpjmList.indexOf(item);
        const isChecked = modalSelectedIndices.has(rawIndex);
        const biaya = parseNumber(item.pagu_rpjm || item.total_rab || item.prakiraan_biaya || 0);
        const isDitarik = isRpjmTargetDitarikFrontend(item, tahunSumber);
        const targetVal = item[`target_${tahunSumber}`] || '-';

        const kodeItem = String(item.kode_unik_full || item.kode_unik || '').trim();
        const isAlreadyInRkp = rancanganList.some(r => {
            const k = String(r.kode_unik_full || r.kode_unik || '').trim();
            if (kodeItem && k) return k === kodeItem;
            return (r.sub_kegiatan || '').toLowerCase() === (item.nama_kegiatan || item.sub_kegiatan || '').toLowerCase();
        });

        html += `
            <tr class="border-b border-slate-200 hover:bg-purple-50/50 transition ${isAlreadyInRkp ? 'bg-amber-50/30' : ''}">
                <td class="px-2 py-2 text-center border border-slate-200">
                    <input type="checkbox" 
                           onchange="toggleKegiatanRpjmManual(${rawIndex})" 
                           id="modal-chk-${rawIndex}"
                           class="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                           ${isChecked ? 'checked' : ''}>
                </td>
                <td class="px-2 py-2 text-center border border-slate-200 font-bold text-slate-500">${displayIdx + 1}</td>
                <td class="px-3 py-2 border border-slate-200 font-semibold text-slate-800">
                    <div>${escapeHtml(item.nama_kegiatan || item.jenis_kegiatan || '-')}</div>
                    <div class="text-[10px] text-slate-400 font-mono font-normal">${escapeHtml(item.kode_unik_full || item.kode_unik || '')}</div>
                </td>
                <td class="px-3 py-2 border border-slate-200 text-slate-600">${escapeHtml(item.jenis_bidang || item.bidang || '-')}</td>
                <td class="px-3 py-2 text-right border border-slate-200 font-semibold font-mono text-emerald-700">${formatRupiah(biaya)}</td>
                <td class="px-3 py-2 text-center border border-slate-200">
                    ${isAlreadyInRkp 
                        ? '<span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">📌 Sudah di RKPDes</span>'
                        : `<span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold ${isDitarik ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-500 border border-slate-200'}">
                            ${isDitarik ? '✅ Ditarik (' + escapeHtml(targetVal) + ')' : '❌ Tidak (' + escapeHtml(targetVal) + ')'}
                           </span>`
                    }
                </td>
                <td class="px-3 py-2 text-center border border-slate-200">
                    ${isAlreadyInRkp
                        ? '<button type="button" disabled class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-1 rounded cursor-not-allowed border border-amber-300 opacity-80" title="Kegiatan dengan kode unik ini sudah ada di Rancangan RKPDes"><i class="fas fa-check"></i> Ada</button>'
                        : `<button type="button" onclick="tarikSatuKegiatanRPJM(${rawIndex})" title="Tarik kegiatan ini saja" class="bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold px-2.5 py-1 rounded transition flex items-center justify-center gap-1 mx-auto shadow-sm">
                            <i class="fas fa-plus"></i> Tarik
                           </button>`
                    }
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
    updateModalTerpilihCountRPJM();
}

function toggleKegiatanRpjmManual(rawIndex) {
    const chk = document.getElementById(`modal-chk-${rawIndex}`);
    if (chk && chk.checked) {
        modalSelectedIndices.add(rawIndex);
    } else {
        modalSelectedIndices.delete(rawIndex);
    }
    updateModalTerpilihCountRPJM();
}

function toggleAllKegiatanRpjmManual(masterCheckbox) {
    const isChecked = masterCheckbox.checked;
    modalKegiatanRpjmList.forEach((item, index) => {
        const chk = document.getElementById(`modal-chk-${index}`);
        if (chk) {
            chk.checked = isChecked;
            if (isChecked) modalSelectedIndices.add(index);
            else modalSelectedIndices.delete(index);
        }
    });
    updateModalTerpilihCountRPJM();
}

function pilihSemuaRpjmManual() {
    modalKegiatanRpjmList.forEach((_, index) => {
        modalSelectedIndices.add(index);
        const chk = document.getElementById(`modal-chk-${index}`);
        if (chk) chk.checked = true;
    });
    const masterChk = document.getElementById('modal-checkbox-all');
    if (masterChk) masterChk.checked = true;
    updateModalTerpilihCountRPJM();
}

function hapusPilihanRpjmManual() {
    modalSelectedIndices.clear();
    modalKegiatanRpjmList.forEach((_, index) => {
        const chk = document.getElementById(`modal-chk-${index}`);
        if (chk) chk.checked = false;
    });
    const masterChk = document.getElementById('modal-checkbox-all');
    if (masterChk) masterChk.checked = false;
    updateModalTerpilihCountRPJM();
}

function updateModalTerpilihCountRPJM() {
    const count = modalSelectedIndices.size;
    const countEl = document.getElementById('modal-terpilih-count-rpjm');
    if (countEl) countEl.textContent = `${count} dipilih`;
}

function convertRpjmItemToRancangan(rpjmItem, targetYear) {
    const laki = parseInt(rpjmItem.manfaat_l ?? rpjmItem.penerima_laki ?? 0, 10) || 0;
    const perempuan = parseInt(rpjmItem.manfaat_p ?? rpjmItem.penerima_perempuan ?? 0, 10) || 0;
    const rtm = parseInt(rpjmItem.manfaat_rtm ?? rpjmItem.penerima_rtm ?? 0, 10) || 0;
    const noBidang = extractBidangNumber(rpjmItem);
    const kodeFull = String(rpjmItem.kode_unik_full || rpjmItem.kode_unik || '').trim();
    const biaya = Number(rpjmItem.pagu_rpjm ?? rpjmItem.prakiraan_biaya ?? rpjmItem.total_rab ?? 0);

    return normalisasiRancanganItem({
        id: null,
        tahun: targetYear,
        bidang: noBidang,
        kode_bidang: rpjmItem.kode_bidang || `0${noBidang}.`,
        kode_sub: rpjmItem.kode_sub || '',
        kode_kegiatan: rpjmItem.kode_kegiatan || '',
        kode_unik: rpjmItem.kode_unik || kodeFull,
        kode_unik_full: kodeFull,
        jenis_bidang: rpjmItem.jenis_bidang || rpjmItem.sub_bidang || '',
        jenis_kegiatan: rpjmItem.jenis_kegiatan || '',
        nama_kegiatan: rpjmItem.nama_kegiatan || rpjmItem.sub_kegiatan || rpjmItem.jenis_kegiatan || '',
        sub_kegiatan: rpjmItem.nama_kegiatan || rpjmItem.sub_kegiatan || rpjmItem.jenis_kegiatan || '',
        mendukung_sdgs: String(rpjmItem.sdgs || rpjmItem.mendukung_sdgs || '-').replace(/[^0-9]/g, '') || '-',
        sdgs: String(rpjmItem.sdgs || rpjmItem.mendukung_sdgs || '-').replace(/[^0-9]/g, '') || '-',
        data_eksisting: rpjmItem.data_existing || rpjmItem.data_eksisting || 'Perlu Peningkatan',
        data_existing: rpjmItem.data_existing || rpjmItem.data_eksisting || 'Perlu Peningkatan',
        lokasi: rpjmItem.lokasi_kegiatan || rpjmItem.lokasi || 'Desa Batetangnga',
        lokasi_kegiatan: rpjmItem.lokasi_kegiatan || rpjmItem.lokasi || 'Desa Batetangnga',
        volume_satuan: rpjmItem.volume_kegiatan || rpjmItem.volume_satuan || rpjmItem.volume || '12 Bulan',
        volume_kegiatan: rpjmItem.volume_kegiatan || rpjmItem.volume_satuan || rpjmItem.volume || '12 Bulan',
        volume: rpjmItem.volume || rpjmItem.volume_kegiatan || '',
        penerima_laki: laki,
        penerima_perempuan: perempuan,
        penerima_rtm: rtm,
        manfaat_l: laki,
        manfaat_p: perempuan,
        manfaat_rtm: rtm,
        total_manfaat: laki + perempuan + rtm,
        prakiraan_biaya: biaya,
        pagu_rpjm: biaya,
        sumber_pembiayaan: rpjmItem.sumber_dana || rpjmItem.sumber_pembiayaan || 'ADD',
        sumber_dana: rpjmItem.sumber_dana || rpjmItem.sumber_pembiayaan || 'ADD',
        waktu_pelaksanaan: rpjmItem.waktu_pelaksanaan || '12 Bulan',
        id_rpjm_ref: rpjmItem.id || null
    });
}

function tarikSatuKegiatanRPJM(rawIndex) {
    const item = modalKegiatanRpjmList[rawIndex];
    if (!item) return;

    const targetYear = parseInt(document.getElementById('select-year')?.value || '2027', 10);
    const converted = convertRpjmItemToRancangan(item, targetYear);
    const kodeConv = String(converted.kode_unik_full || converted.kode_unik || '').trim();

    const duplicate = rancanganList.find(r => {
        const k = String(r.kode_unik_full || r.kode_unik || '').trim();
        if (kodeConv && k) return k === kodeConv;
        return (r.sub_kegiatan || '').toLowerCase() === (converted.sub_kegiatan || '').toLowerCase();
    });

    if (duplicate) {
        alert(`⛔ Kegiatan "${converted.sub_kegiatan}" dengan Kode Unik [${kodeConv || '-'}] sudah ada di Rancangan RKPDes tahun ${targetYear}.\n\nVerifikasi sistem: Setiap kode unik hanya dapat dimasukkan 1 kali dan tidak bisa 2 kali.`);
        return;
    }

    rancanganList.push(converted);
    rancanganList = sortRancanganByKodeUnik(rancanganList);
    renderRancanganTable();
    filterKegiatanRpjmManual(); // Update modal UI badge
    alert(`✅ Berhasil menarik kegiatan "${converted.sub_kegiatan}" ke Rancangan RKPDes tahun ${targetYear}.\n\n⚠️ Klik "Simpan Ke DB" untuk menyimpan perubahan.`);
}

function tarikKegiatanTerpilihRPJM() {
    if (modalSelectedIndices.size === 0) {
        alert('⚠️ Pilih minimal 1 kegiatan dari daftar RPJMDes!');
        return;
    }

    const targetYear = parseInt(document.getElementById('select-year')?.value || '2027', 10);
    const tahunSumber = document.getElementById('modal-tahun-sumber-rpjm')?.value || '2027';

    let addedCount = 0;
    let skippedCount = 0;

    modalSelectedIndices.forEach(idx => {
        const item = modalKegiatanRpjmList[idx];
        if (item) {
            const converted = convertRpjmItemToRancangan(item, targetYear);
            const kodeConv = String(converted.kode_unik_full || converted.kode_unik || '').trim();

            const isDuplicate = rancanganList.some(r => {
                const k = String(r.kode_unik_full || r.kode_unik || '').trim();
                if (kodeConv && k) return k === kodeConv;
                return (r.sub_kegiatan || '').toLowerCase() === (converted.sub_kegiatan || '').toLowerCase();
            });

            if (isDuplicate) {
                skippedCount++;
            } else {
                rancanganList.push(converted);
                addedCount++;
            }
        }
    });

    rancanganList = sortRancanganByKodeUnik(rancanganList);
    renderRancanganTable();
    closeModalTarikManualRPJM();

    if (addedCount > 0) {
        let msg = `✅ Berhasil menambahkan ${addedCount} kegiatan dari RPJMDes ke Rancangan RKPDes tahun ${targetYear}.`;
        if (skippedCount > 0) {
            msg += `\n\n⛔ ${skippedCount} kegiatan dilewati karena kode unik sudah ada (mencegah duplikasi).`;
        }
        msg += `\n\n⚠️ Klik "Simpan Ke DB" untuk menyimpan data ke database.`;
        alert(msg);
    } else {
        alert(`⛔ Semua ${skippedCount} kegiatan yang Anda pilih sudah ada di Rancangan RKPDes tahun ${targetYear} (verifikasi kode unik menolak duplikasi).`);
    }
}

// 5. Update Field Realtime
function updateFieldData(bidangNum, itemIndex, field, value) {
    const targetItem = rancanganList[itemIndex];

    if (targetItem && extractBidangNumber(targetItem) === bidangNum) {
        if (field === 'prakiraan_biaya' || field === 'penerima_laki' || field === 'penerima_perempuan' || field === 'penerima_rtm') {
            rancanganList[itemIndex][field] = parseNumber(value);
        } else {
            rancanganList[itemIndex][field] = value;
        }
        // Recalculate totals dynamically
        let grandTotal = 0;
        rancanganList.forEach(item => {
            grandTotal += parseNumber(item.prakiraan_biaya || item.pagu_indikatif || 0);
        });
        const grandEl = document.getElementById('grand-total-biaya');
        if (grandEl) grandEl.innerText = formatRupiah(grandTotal);
        const statEl = document.getElementById('stat-summary');
        if (statEl) statEl.innerText = `Total Kegiatan: ${rancanganList.length} | Total Biaya: ${formatRupiah(grandTotal)}`;
    }
}

// 6. Tambah & Hapus Row
function addRow(bidangNum) {
    const rkpYear = parseInt(document.getElementById('select-year')?.value || '2027', 10);
    rancanganList.push({
        id: null,
        tahun: rkpYear,
        bidang: bidangNum,
        jenis_bidang: 'SUB BIDANG UMUM',
        jenis_kegiatan: 'Kegiatan Umum',
        sub_kegiatan: '',
        mendukung_sdgs: '-',
        data_eksisting: 'Perlu Peningkatan',
        lokasi: 'Desa Batetangnga',
        volume_satuan: '12 Bulan',
        penerima_laki: 0,
        penerima_perempuan: 0,
        penerima_rtm: 0,
        prakiraan_biaya: 0,
        sumber_pembiayaan: 'ADD'
    });
    renderRancanganTable();
}

async function deleteRow(bidangNum, itemIndex, id) {
    if (!confirm("Apakah Anda yakin ingin menghapus kegiatan ini?")) return;

    const targetItem = rancanganList[itemIndex];
    if (targetItem && extractBidangNumber(targetItem) === bidangNum) {
        rancanganList.splice(itemIndex, 1);
    }

    if (!id || id === 'null' || id === 'undefined') {
        renderRancanganTable();
        return;
    }

    try {
        const res = await fetch(`/api/rancangan-rkpdes?id=${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
            alert("✅ Data berhasil dihapus dari database");
        }
    } catch (err) {
        console.error("❌ Error deleteRow:", err);
    }
    renderRancanganTable();
}

// 7. Simpan Ke Database (Sync ke tabel rancangan_rkpdes)
async function saveToDatabase() {
    const rkpYear = parseInt(document.getElementById('select-year')?.value || '2027', 10);
    console.log(`📡 Simpan data Rancangan RKPDes tahun ${rkpYear} (${rancanganList.length} items)...`);

    try {
        const res = await fetch('/api/rancangan-rkpdes/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tahun: rkpYear, data: rancanganList })
        });

        const json = await res.json();
        if (json.success) {
            alert(`✅ ${json.message}`);
            loadRancanganData();
        } else {
            alert("❌ Gagal menyimpan: " + (json.error || json.message));
        }
    } catch (err) {
        console.error("❌ Exception saveToDatabase:", err);
        alert("❌ Error koneksi: " + err.message);
    }
}

// 8. Cetak PDF Dokumen Resmi
function printPDF() {
    const rkpYear = document.getElementById('select-year')?.value || '2027';
    const kepalaDesa = document.getElementById('kepala-desa-input')?.value || 'SUMAILA DAMANG';
    const ketuaTim = document.getElementById('ketua-tim-input')?.value || 'Abdul Azis, S. Pd';
    const tanggalInput = document.getElementById('tanggal-input')?.value || '2026-08-02';

    let tanggalFormatted = '2 Agustus 2026';
    try {
        const d = new Date(tanggalInput + 'T00:00:00');
        tanggalFormatted = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {}

    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
        alert("⚠️ Izinkan pop-up browser untuk mencetak PDF!");
        return;
    }

    const allData = Array.isArray(rancanganList) ? rancanganList : [];
    let tableRows = '';
    let grandTotalBiaya = 0;

    for (let b = 1; b <= 5; b++) {
        const itemsInBidang = allData.filter(item => extractBidangNumber(item) === b);
        let subtotalBiaya = 0;

        tableRows += `
            <tr style="background-color: #e2e8f0; font-weight: bold;">
                <td style="border: 1px solid #333; text-align: center;">${b}</td>
                <td colspan="12" style="border: 1px solid #333; text-transform: uppercase;">${b}. ${NAMA_BIDANG_RKPDES[b]}</td>
            </tr>
        `;

        if (itemsInBidang.length === 0) {
            tableRows += `
                <tr>
                    <td colspan="13" style="border: 1px solid #333; text-align: center; color: #666; font-style: italic;">Belum ada data untuk bidang ${b}</td>
                </tr>
            `;
        } else {
            const groupedBySub = itemsInBidang.reduce((acc, item) => {
                const subName = (item.jenis_bidang || item.sub_bidang || 'SUB BIDANG UMUM').trim().toUpperCase();
                if (!acc[subName]) acc[subName] = {};

                const kegName = (item.jenis_kegiatan || item.kelompok_kegiatan || 'Kegiatan Umum').trim();
                if (!acc[subName][kegName]) acc[subName][kegName] = [];

                acc[subName][kegName].push(item);
                return acc;
            }, {});

            let globalIdx = 1;
            for (const [subName, kegiatans] of Object.entries(groupedBySub)) {
                tableRows += `
                    <tr style="background-color: #eef2f6; font-weight: bold;">
                        <td style="border: 1px solid #333; text-align: center;"></td>
                        <td colspan="12" style="border: 1px solid #333; font-size: 9px; padding-left: 8px;">
                            ${subName}
                        </td>
                    </tr>
                `;

                for (const [kegName, itemsKeg] of Object.entries(kegiatans)) {
                    if (kegName && kegName.toLowerCase() !== 'kegiatan umum') {
                        tableRows += `
                            <tr style="background-color: #f8fafc; font-style: italic;">
                                <td style="border: 1px solid #333; text-align: center;"></td>
                                <td colspan="12" style="border: 1px solid #333; font-size: 8.5px; padding-left: 14px;">
                                    ↳ ${kegName}
                                </td>
                            </tr>
                        `;
                    }

                    itemsKeg.forEach((item) => {
                        const biaya = parseNumber(item.prakiraan_biaya || item.pagu_indikatif);
                        subtotalBiaya += biaya;

                        tableRows += `
                            <tr>
                                <td style="border: 1px solid #333; text-align: center;">${globalIdx}</td>
                                <td style="border: 1px solid #333;">${escapeHtml(item.sub_kegiatan || item.nama_kegiatan || '-')}</td>
                                <td style="border: 1px solid #333; text-align: center;">${escapeHtml(String(item.mendukung_sdgs || '').replace(/[^0-9]/g, '') || '-')}</td>
                                <td style="border: 1px solid #333;">${escapeHtml(item.data_eksisting || '-')}</td>
                                <td style="border: 1px solid #333;">${escapeHtml(item.lokasi || 'Desa Batetangnga')}</td>
                                <td style="border: 1px solid #333;">${escapeHtml(item.volume_satuan || item.volume || '-')}</td>
                                <td style="border: 1px solid #333; text-align: center;">${item.penerima_laki || 0}</td>
                                <td style="border: 1px solid #333; text-align: center;">${item.penerima_perempuan || 0}</td>
                                <td style="border: 1px solid #333; text-align: center;">${item.penerima_rtm || 0}</td>
                                <td style="border: 1px solid #333; text-align: right;">${biaya > 0 ? formatRupiah(biaya) : '-'}</td>
                                <td style="border: 1px solid #333; text-align: center;">${escapeHtml(item.sumber_pembiayaan || 'ADD')}</td>
                            </tr>
                        `;
                        globalIdx++;
                    });
                }
            }
        }

        grandTotalBiaya += subtotalBiaya;
        tableRows += `
            <tr style="background-color: #f1f5f9; font-weight: bold;">
                <td colspan="9" style="border: 1px solid #333; text-align: right; padding-right: 8px;">JUMLAH PER BIDANG ${b}</td>
                <td style="border: 1px solid #333; text-align: right;">${subtotalBiaya > 0 ? formatRupiah(subtotalBiaya) : '-'}</td>
                <td style="border: 1px solid #333;"></td>
            </tr>
        `;
    }

    const printHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Rancangan RKPDes - ${rkpYear}</title>
            <style>
                @page { size: landscape; margin: 8mm; }
                body { font-family: Arial, sans-serif; font-size: 9.5px; padding: 10px; color: black; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9px; }
                th, td { border: 1px solid #333; padding: 4px; word-wrap: break-word; }
                th { background-color: #1e1b4b; color: #fff; text-align: center; font-weight: bold; text-transform: uppercase; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                .ttd-wrapper { margin-top: 24px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; }
                .ttd-box { width: 250px; text-align: center; font-weight: bold; }
                .ttd-space { height: 50px; }
            </style>
        </head>
        <body>
            <div style="text-align:center; margin-bottom:12px;">
                <h2 style="margin:0; font-size:14px; font-weight:bold; text-transform:uppercase;">DOKUMEN RANCANGAN RENCANA KERJA PEMERINTAH DESA (RKPDESA)</h2>
                <div style="font-size:12px; font-weight:bold; margin-top:2px;">TAHUN ANGGARAN ${rkpYear}</div>
                <div style="font-size:10px; margin-top:6px; font-weight:bold;">
                    DESA: BATETANGNGA &nbsp;|&nbsp; KECAMATAN: BINUANG &nbsp;|&nbsp; KABUPATEN: POLEWALI MANDAR &nbsp;|&nbsp; PROVINSI: SULAWESI BARAT
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th rowspan="2" style="width:25px;">NO</th>
                        <th rowspan="2" style="min-width:180px;">NAMA PROGRAM / KEGIATAN</th>
                        <th rowspan="2" style="width:60px;">SDGs</th>
                        <th rowspan="2" style="width:100px;">DATA EKSISTING</th>
                        <th rowspan="2" style="width:90px;">LOKASI</th>
                        <th rowspan="2" style="width:75px;">VOLUME</th>
                        <th colspan="3">PENERIMA MANFAAT</th>
                        <th rowspan="2" style="width:95px;">PRAKIRAAN BIAYA (Rp)</th>
                        <th rowspan="2" style="width:65px;">SUMBER</th>
                    </tr>
                    <tr>
                        <th style="width:30px;">L</th>
                        <th style="width:30px;">P</th>
                        <th style="width:35px;">RTM</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                    <tr style="background-color: #0f172a; color: #fff; font-weight: bold;">
                        <td colspan="9" style="border: 1px solid #333; text-align: right; padding-right: 8px;">J U M L A H &nbsp; T O T A L &nbsp; B I A Y A</td>
                        <td style="border: 1px solid #333; text-align: right;">${formatRupiah(grandTotalBiaya)}</td>
                        <td style="border: 1px solid #333;"></td>
                    </tr>
                </tbody>
            </table>

            <div class="ttd-wrapper">
                <div class="ttd-box">
                    <p>Mengetahui,</p>
                    <p>Kepala Desa Batetangnga</p>
                    <div class="ttd-space"></div>
                    <p style="text-decoration: underline;">${escapeHtml(kepalaDesa)}</p>
                </div>
                <div class="ttd-box">
                    <p>Batetangnga, ${escapeHtml(tanggalFormatted)}</p>
                    <p>Disusun Oleh,<br>Ketua Tim Penyusun RKPDesa</p>
                    <div class="ttd-space"></div>
                    <p style="text-decoration: underline;">${escapeHtml(ketuaTim)}</p>
                </div>
            </div>

            <script>
                setTimeout(() => {
                    window.print();
                }, 500);
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(printHtml);
    printWindow.document.close();
}

async function clearAndSyncRkpdes() {
    const rkpYear = parseInt(document.getElementById('select-year')?.value || '2027', 10);
    const confirmation = prompt(`Apakah Anda yakin ingin menghapus SEMUA data RKPDes untuk tahun ${rkpYear} dan menyinkronkan ulang dari data RPJMDes dan RAB? \n\nKETIK "${rkpYear}" untuk konfirmasi.`);
    
    if (confirmation !== String(rkpYear)) {
        alert('Konfirmasi dibatalkan. Data tidak ada yang berubah.');
        return;
    }

    alert('Memulai proses hapus dan sinkronisasi ulang...');

    try {
        const response = await fetch('/api/rkpdes/clear-and-sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tahun: rkpYear }),
        });

        const result = await response.json();

        if (result.success) {
            alert(`✅ Berhasil! ${result.message}`);
            loadRancanganData(); // Muat ulang data untuk menampilkan hasil sinkronisasi
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error during clear and sync:', error);
        alert(`❌ Terjadi kesalahan: ${error.message}`);
    }
}

// Window Exposures
window.tarikDariPrioritasUsulan = tarikDariPrioritasUsulan;
window.tarikDariRPJMDes = tarikDariRPJMDes;
window.loadRancanganData = loadRancanganData;
window.renderRancanganTable = renderRancanganTable;
window.saveToDatabase = saveToDatabase;
window.printPDF = printPDF;
window.updateTTD = updateTTD;
window.changePage = changePage;
window.loadAllData = loadAllData;
window.addRow = addRow;
window.deleteRow = deleteRow;
window.updateFieldData = updateFieldData;
window.clearAndSyncRkpdes = clearAndSyncRkpdes;
window.openModalTarikManualRPJM = openModalTarikManualRPJM;
window.closeModalTarikManualRPJM = closeModalTarikManualRPJM;
window.loadKegiatanRpjmManual = loadKegiatanRpjmManual;
window.filterKegiatanRpjmManual = filterKegiatanRpjmManual;
window.toggleKegiatanRpjmManual = toggleKegiatanRpjmManual;
window.toggleAllKegiatanRpjmManual = toggleAllKegiatanRpjmManual;
window.pilihSemuaRpjmManual = pilihSemuaRpjmManual;
window.hapusPilihanRpjmManual = hapusPilihanRpjmManual;
window.tarikSatuKegiatanRPJM = tarikSatuKegiatanRPJM;
window.filterRancanganTable = filterRancanganTable;
window.clearSearchRkpdes = clearSearchRkpdes;
window.toggleExtraMenu = toggleExtraMenu;
