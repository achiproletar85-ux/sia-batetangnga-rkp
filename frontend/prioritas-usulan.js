// ============================================================
// DAFTAR PRIORITAS USULAN RENCANA PROGRAM/KEGIATAN (5 BIDANG WAJIB)
// Controller Logic (Sama Persis dengan DU-RKP Desa)
// ============================================================

const NAMA_BIDANG_PRIORITAS = {
    1: "Bidang Penyelenggaraan Pemerintahan Desa",
    2: "Bidang Pelaksanaan Pembangunan Desa",
    3: "Bidang Pembinaan Kemasyarakatan",
    4: "Bidang Pemberdayaan Masyarakat",
    5: "Bidang Penanggulangan Bencana, Keadaan Darurat dan Mendesak Desa"
};

let prioritasList = [];
let editingRowId = null;
let originalRowBackup = null;
let currentPage = 1;
let showAllRows = false;
const itemsPerPage = 20;
let autoSaveTimer = null;

// Row identifier yang STABIL untuk lookup & atribut data-id pada DOM.
// - Baris dari DB: pakai id numerik asli
// - Baris baru (belum disimpan): pakai _tempId unik yang dibuat saat addRow
function getRowId(item) {
    if (!item) return 'row-empty';
    if (item.id !== undefined && item.id !== null && String(item.id).trim() !== '') return String(item.id);
    if (item._tempId) return String(item._tempId);
    return `temp-${item.kode_unik_full || item.kode_unik || Math.random().toString(36).slice(2, 8)}`;
}

let tempIdCounter = 0;
function nextTempId() {
    tempIdCounter += 1;
    return `new-${Date.now().toString(36)}-${tempIdCounter}`;
}

// 1. Ekstraksi Nomor Bidang yang Akurat & Mencegah Penumpukan
function extractBidangNumber(item) {
    if (!item) return 1;

    // 1. Ekstrak dari kode unik / kode kegiatan / kode bidang (pola prefix: 01. -> 1, 02. -> 2, dst)
    const kode = String(
        item.kode_unik_full || 
        item.kode_kegiatan || 
        item.kode_sub || 
        item.kode_bidang || 
        item.urutan_prioritas || ''
    ).trim();

    const match = kode.match(/^\s*0?([1-5])\./);
    if (match) {
        return parseInt(match[1], 10);
    }

    // 2. Cek jika item.bidang atau item.bidang_ke adalah angka murni (1 - 5)
    const directNum = parseInt(item.bidang || item.bidang_ke, 10);
    if (!isNaN(directNum) && directNum >= 1 && directNum <= 5) {
        return directNum;
    }

    // 3. Pencocokan kata kunci TEKS (HANYA pada nama bidang, BUKAN kode!)
    const teksBidang = String(item.bidang || item.nama_bidang || item.bidang_nama || item.jenis_bidang || '').toLowerCase();
    
    if (teksBidang.includes('pembangunan')) return 2;
    if (teksBidang.includes('pembinaan') || teksBidang.includes('kemasyarakatan')) return 3;
    if (teksBidang.includes('pemberdayaan')) return 4;
    if (teksBidang.includes('bencana') || teksBidang.includes('darurat') || teksBidang.includes('mendesak')) return 5;
    if (teksBidang.includes('penyelenggaraan') || teksBidang.includes('pemerintahan')) return 1;

    return 1; // Default fallback
}

function normalisasiItemRPJM(item) {
    if (!item) return item;

    const bidangNum = extractBidangNumber(item);

    const fullCode = String(
        item.kode_unik_full || 
        item.kode_kegiatan || 
        item.kode_sub || 
        item.kode_bidang || 
        item.bidang || ''
    ).trim();

    const matchSub = fullCode.match(/^(\d{2}\.\d{2}\.)/);
    const kodeSub = matchSub ? matchSub[1] : '';

    const matchKeg = fullCode.match(/^(\d{2}\.\d{2}\.\d{2}\.)/);
    const kodeKeg = matchKeg ? matchKeg[1] : '';

    const cleanUrutan = String(item.urutan_prioritas || item.rangking || '').trim();

    const alias = {
        sub_kegiatan: item.sub_kegiatan ?? item.nama_kegiatan ?? '',
        volume_satuan: item.volume_satuan ?? item.volume_kegiatan ?? item.volume ?? '',
        lokasi: item.lokasi ?? item.lokasi_kegiatan ?? '',
        data_eksisting: item.data_eksisting ?? item.data_existing ?? '',
        mendukung_sdgs: item.mendukung_sdgs ?? item.sdgs ?? '',
        sumber_pembiayaan: item.sumber_pembiayaan ?? item.sumber_dana ?? 'ADD',
        prakiraan_biaya: parseInt(item.prakiraan_biaya ?? item.pagu_rpjm ?? 0, 10) || 0,
        penerima_laki: parseInt(item.penerima_laki ?? item.manfaat_l ?? 0, 10) || 0,
        penerima_perempuan: parseInt(item.penerima_perempuan ?? item.manfaat_p ?? 0, 10) || 0,
        penerima_rtm: parseInt(item.penerima_rtm ?? item.manfaat_rtm ?? 0, 10) || 0
    };

    return {
        ...item,
        ...alias,
        bidang: bidangNum, // Angka Murni 1 - 5
        kode_sub_parsed: kodeSub,
        kode_keg_parsed: kodeKeg,
        urutan_prioritas: cleanUrutan
    };
}

function normalisasiDataPrioritas(rawList) {
    if (!Array.isArray(rawList)) return [];
    return rawList.map(item => normalisasiItemRPJM(item));
}

function showToast(message, type = 'success') {
    try {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.className = `fixed bottom-6 right-6 px-6 py-3 rounded-xl text-white font-bold shadow-2xl z-50 transition-all duration-300 ${
            type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
        }`;
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3500);
    } catch (e) {
        console.warn("Toast error:", e);
    }
}

function parseNumber(value) {
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    if (typeof value === 'string') {
        const clean = value.replace(/[^0-9,-]/g, '').replace(',', '');
        return parseInt(clean, 10) || 0;
    }
    return 0;
}

function formatRupiah(number) {
    const num = parseNumber(number);
    try {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(num);
    } catch (e) {
        return 'Rp ' + Math.round(num).toLocaleString('id-ID');
    }
}

function formatAngka(number) {
    const num = parseNumber(number);
    try {
        return new Intl.NumberFormat('id-ID', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(num);
    } catch (e) {
        return Math.round(num).toLocaleString('id-ID');
    }
}

function formatTanggalIndonesia(tanggalStr) {
    if (!tanggalStr) return '....................';
    const parts = tanggalStr.split('-');
    if (parts.length !== 3) return tanggalStr;
    const tahun = parts[0];
    const bulanAngka = parseInt(parts[1], 10);
    const hari = parseInt(parts[2], 10);
    const namaBulan = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${hari} ${namaBulan[bulanAngka] || ''} ${tahun}`;
}

function renderFooterTanggal() {
    try {
        const inputTgl = document.getElementById('tgl-cetak');
        const lblTgl = document.getElementById('lbl-tgl-cetak');
        if (lblTgl) {
            lblTgl.textContent = `Batetangnga, ${formatTanggalIndonesia(inputTgl?.value)}`;
        }
    } catch (e) {
        console.warn("renderFooterTanggal error:", e);
    }
}

window.addEventListener('tahunChanged', (e) => {
    if (e && e.detail && e.detail.tahun) {
        if (typeof loadPrioritasData === 'function') loadPrioritasData();
    }
});

// 2. Load Data Prioritas Usulan dari Supabase
async function loadPrioritasData() {
    console.log("🚀 START loading data prioritas usulan...");
    const selectYear = document.getElementById('select-year');
    const activeYear = parseInt(localStorage.getItem('ACTIVE_TAHUN_ANGGARAN') || selectYear?.value || '2027', 10);
    console.log(`📅 Selected year: ${activeYear}`);

    const elHeaderTahun = document.getElementById('header-tahun');
    if (elHeaderTahun) elHeaderTahun.textContent = activeYear;

    currentPage = 1;
    showAllRows = false; // ⛔ JANGAN set true — akan render 286 input sekaligus dan menyebabkan browser freeze

    const tbody = document.getElementById('tabel-prioritas-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="14" class="text-center py-6 text-slate-500 font-medium">⏳ Memuat data prioritas usulan tahun ${activeYear}...</td></tr>`;

    try {
        const response = await fetch(`/api/prioritas-usulan?tahun=${activeYear}`);
        console.log(`📡 Response status: ${response.status}`);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();
        console.log(`📦 Fetched ${result.data ? result.data.length : 0} items from prioritas_usulan`);

        if (result.success && result.data && result.data.length > 0) {
            prioritasList = normalisasiDataPrioritas(result.data).sort((a, b) => 
                (a.kode_unik_full || '').localeCompare(b.kode_unik_full || '', undefined, {numeric: true})
            );
        } else {
            prioritasList = [];
        }
    } catch (error) {
        console.error("❌ Error loadPrioritasData:", error);
        prioritasList = [];
    }

    renderPrioritasTable();
}

function loadData() {
    loadPrioritasData();
}

// 3. Render Tabel Prioritas Usulan
function changePage(directionOrPage) {
    const totalItems = Array.isArray(prioritasList) ? prioritasList.length : 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    let targetPage = currentPage;
    if (typeof directionOrPage === 'number') {
        if (directionOrPage > 0 && directionOrPage <= totalPages) {
            targetPage = directionOrPage;
        } else {
            targetPage = currentPage + directionOrPage;
        }
    }

    if (targetPage < 1) targetPage = 1;
    if (targetPage > totalPages) targetPage = totalPages;

    currentPage = targetPage;
    renderPrioritasTable();
}

function showAllData() {
    showAllRows = true;
    currentPage = 1;
    renderPrioritasTable();
}

function showPagedData() {
    showAllRows = false;
    currentPage = 1;
    renderPrioritasTable();
}

function renderPrioritasTable() {
    const tbody = document.getElementById('tabel-prioritas-body') || document.getElementById('prioritas-body');
    const paginationEl = document.getElementById('pagination-container');
    if (!tbody) return;

    if (!prioritasList || prioritasList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="14" class="text-center py-4 text-slate-400 font-semibold">📭 Tidak ada data usulan</td></tr>`;
        if (paginationEl) paginationEl.innerHTML = '';
        return;
    }

    const totalItems = prioritasList.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, totalItems);
    const pageData = showAllRows ? prioritasList : prioritasList.slice(start, end);

    let html = '';
    let grandTotalBiaya = 0;

    for (let b = 1; b <= 5; b++) {
        const namaBidang = NAMA_BIDANG_PRIORITAS[b];
        let itemsBidang = pageData.filter(item => Number(item.bidang) === b);

        let subTotalBiaya = 0;

        html += `
            <tr class="bg-slate-200 text-slate-900 font-bold border-b border-t border-slate-300">
                <td class="border border-slate-400 text-center font-extrabold py-1.5">${b}</td>
                <td colspan="13" class="border border-slate-400 px-2 py-1.5 uppercase tracking-wide text-indigo-950">${b}. ${namaBidang}</td>
            </tr>
        `;

        if (itemsBidang.length === 0) {
            html += `
                <tr class="bg-white text-slate-400 italic">
                    <td colspan="14" class="border border-slate-400 text-center py-2">Belum ada data pada halaman ini untuk bidang ${b}</td>
                </tr>
            `;
        } else {
            const groupedBySub = itemsBidang.reduce((acc, item) => {
                const subName = (item.jenis_bidang || item.sub_bidang || 'SUB BIDANG UMUM').trim().toUpperCase();
                if (!acc[subName]) acc[subName] = {};

                const kegName = (item.jenis_kegiatan || item.kelompok_kegiatan || 'Kegiatan Umum').trim();
                if (!acc[subName][kegName]) acc[subName][kegName] = [];
                
                acc[subName][kegName].push(item);
                return acc;
            }, {});

            let globalIdx = 0;
            for (const [subName, kegiatans] of Object.entries(groupedBySub)) {
                let subIdx = 0;
                html += `
                    <tr class="bg-indigo-50/70 text-indigo-800 font-semibold border border-slate-300">
                        <td class="border border-slate-400 text-center py-1"></td>
                        <td colspan="13" class="border border-slate-400 px-3 py-1 text-[10.5px] tracking-wide">
                            <i class="fas fa-layer-group mr-1 opacity-70"></i> ${subName}
                        </td>
                    </tr>
                `;

                for (const [kegName, itemsKeg] of Object.entries(kegiatans)) {
                    if (kegName && kegName.toLowerCase() !== 'kegiatan umum') {
                        html += `
                            <tr class="bg-slate-50 text-slate-700 font-semibold border border-slate-300">
                                <td class="border border-slate-400 text-center py-1"></td>
                                <td colspan="13" class="border border-slate-400 px-5 py-1 text-[9.5px] tracking-wide italic">
                                    <i class="fas fa-caret-right mr-1 opacity-50"></i> ${kegName}
                                </td>
                            </tr>
                        `;
                    }

                    itemsKeg.forEach((item) => {
                        const biayaVal = parseNumber(item.prakiraan_biaya) || 0;
                        const rowId = getRowId(item);
                        const isEditing = editingRowId && String(editingRowId) === String(rowId);
                        const rowNumber = showAllRows ? subIdx + 1 : subIdx + 1;

                        subTotalBiaya += biayaVal;

                        html += `
                            <tr data-id="${rowId}" class="border border-slate-400 ${isEditing ? 'bg-amber-50/80 border-indigo-500 font-semibold' : 'hover:bg-slate-50'} transition">
                                <td class="border border-slate-400 text-center font-bold py-1.5">${rowNumber}</td>
                                <td class="border border-slate-400 px-2 py-1.5 text-slate-400 w-36"></td>

                                <td class="border border-slate-400 p-1 text-center">
                                    <input type="text" value="${item.urutan_prioritas || ''}" oninput="updateFieldDataByRowId('${rowId}', 'urutan_prioritas', this.value)" placeholder="1.0" class="w-full text-center p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs font-bold" />
                                </td>
                                <td class="border border-slate-400 p-1">
                                    <input type="text" value="${item.sub_kegiatan || item.nama_kegiatan || ''}" oninput="updateFieldDataByRowId('${rowId}', 'sub_kegiatan', this.value)" placeholder="Nama Program / Kegiatan..." class="w-full p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs" />
                                </td>
                                <td class="border border-slate-400 p-1 text-center">
                                    <input type="text" value="${String(item.mendukung_sdgs || '').replace(/[^0-9]/g, '')}" oninput="updateFieldDataByRowId('${rowId}', 'mendukung_sdgs', this.value.replace(/[^0-9]/g, ''))" placeholder="SDGs..." class="w-full text-center p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs" />
                                </td>
                                <td class="border border-slate-400 p-1">
                                    <input type="text" value="${item.data_eksisting || ''}" oninput="updateFieldDataByRowId('${rowId}', 'data_eksisting', this.value)" placeholder="Kondisi..." class="w-full p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs" />
                                </td>
                                <td class="border border-slate-400 p-1">
                                    <input type="text" value="${item.lokasi || ''}" oninput="updateFieldDataByRowId('${rowId}', 'lokasi', this.value)" placeholder="Dusun / RT / RW..." class="w-full p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs" />
                                </td>
                                <td class="border border-slate-400 p-1">
                                    <input type="text" value="${item.volume_satuan || item.volume || ''}" oninput="updateFieldDataByRowId('${rowId}', 'volume_satuan', this.value)" placeholder="Vol & Sat..." class="w-full p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs" />
                                </td>
                                <td class="border border-slate-400 p-1 text-center">
                                    <input type="number" value="${item.penerima_laki || ''}" oninput="updateFieldDataByRowId('${rowId}', 'penerima_laki', this.value)" placeholder="0" class="w-full text-center p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs font-mono" />
                                </td>
                                <td class="border border-slate-400 p-1 text-center">
                                    <input type="number" value="${item.penerima_perempuan || ''}" oninput="updateFieldDataByRowId('${rowId}', 'penerima_perempuan', this.value)" placeholder="0" class="w-full text-center p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs font-mono" />
                                </td>
                                <td class="border border-slate-400 p-1 text-center">
                                    <input type="number" value="${item.penerima_rtm || ''}" oninput="updateFieldDataByRowId('${rowId}', 'penerima_rtm', this.value)" placeholder="0" class="w-full text-center p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs font-mono" />
                                </td>
                                <td class="border border-slate-400 p-1 text-right">
                                    <input type="text" value="${biayaVal > 0 ? formatAngka(biayaVal) : ''}" onfocus="this.value = parseNumber(this.value) > 0 ? String(parseNumber(this.value)) : ''" onblur="this.value = formatAngka(parseNumber(this.value))" oninput="updateFieldDataByRowId('${rowId}', 'prakiraan_biaya', this.value.replace(/[^0-9]/g, ''))" placeholder="0" class="w-full text-right p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs font-mono" />
                                </td>
                                <td class="border border-slate-400 p-1 text-center">
                                    <input type="text" value="${item.sumber_pembiayaan || 'ADD'}" oninput="updateFieldDataByRowId('${rowId}', 'sumber_pembiayaan', this.value)" placeholder="ADD/DDS..." class="w-full text-center p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs" />
                                </td>
                                <td class="border border-slate-400 text-center p-1 no-print">
                                    <div class="flex items-center justify-center gap-1">
                                        ${isEditing 
                                            ? `<button type="button" onclick="saveEditRow('${rowId}')" class="px-2 py-1 bg-emerald-500 text-white rounded text-[10px] font-bold hover:bg-emerald-600 shadow-sm"><i class="fas fa-check"></i></button>
                                               <button type="button" onclick="cancelEditRow()" class="px-2 py-1 bg-slate-500 text-white rounded text-[10px] font-bold hover:bg-slate-600 shadow-sm"><i class="fas fa-times"></i></button>`
                                            : `<button type="button" onclick="editRow('${rowId}')" class="px-2 py-1 bg-indigo-500 text-white rounded text-[10px] hover:bg-indigo-600 shadow-sm transition-colors"><i class="fas fa-edit"></i></button>
                                               <button type="button" onclick="deleteRow('${rowId}')" class="px-2 py-1 bg-red-500 text-white rounded text-[10px] hover:bg-red-600 shadow-sm transition-colors"><i class="fas fa-trash-alt"></i></button>`
                                        }
                                    </div>
                                </td>
                            </tr>
                        `;
                        globalIdx++;
                        subIdx++;
                    });
                }
            }
        }

        grandTotalBiaya += subTotalBiaya;

        html += `
            <tr class="bg-slate-100 font-bold text-slate-900">
                <td colspan="11" class="border border-slate-500 text-right px-3 py-1.5 uppercase text-xs">JUMLAH PER BIDANG ${b}</td>
                <td class="border border-slate-500 text-right px-2 py-1.5 font-mono text-xs">${subTotalBiaya > 0 ? formatRupiah(subTotalBiaya) : '-'}</td>
                <td colspan="2" class="border border-slate-500 no-print"></td>
            </tr>
        `;
    }

    html += `
        <tr class="bg-indigo-950 text-white font-extrabold text-sm">
            <td colspan="11" class="border border-slate-600 text-right px-4 py-2.5 uppercase">J U M L A H &nbsp; T O T A L &nbsp; B I A Y A</td>
            <td class="border border-slate-600 text-right px-3 py-2.5 font-mono">${formatRupiah(grandTotalBiaya)}</td>
            <td colspan="2" class="border border-slate-600 no-print"></td>
        </tr>
    `;

    if (paginationEl) {
        if (showAllRows) {
            paginationEl.innerHTML = `
                <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs mt-3 no-print">
                    <span class="text-slate-600">Menampilkan semua ${totalItems} data</span>
                    <div class="flex items-center gap-2">
                        <button type="button" onclick="showPagedData()" class="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-medium transition shadow-sm">◀ Kembali ke 20 per halaman</button>
                    </div>
                </div>
            `;
        } else {
            const startLabel = totalItems === 0 ? 0 : start + 1;
            const endLabel = totalItems === 0 ? 0 : end;
            paginationEl.innerHTML = `
                <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs mt-3 no-print">
                    <span class="text-slate-600">Menampilkan ${startLabel}-${endLabel} dari ${totalItems} data</span>
                    <div class="flex items-center gap-2">
                        <button type="button" onclick="changePage(-1)" class="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-700 ${currentPage <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100'} font-medium transition shadow-sm" ${currentPage <= 1 ? 'disabled' : ''}>◀ Sebelumnya</button>
                        <span class="px-2 text-slate-700 font-semibold">Halaman ${currentPage} dari ${totalPages}</span>
                        <button type="button" onclick="changePage(1)" class="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-700 ${currentPage >= totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100'} font-medium transition shadow-sm" ${currentPage >= totalPages ? 'disabled' : ''}>Selanjutnya ▶</button>
                        <button type="button" onclick="showAllData()" class="px-3 py-1.5 rounded border border-indigo-300 bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition shadow-sm">Tampilkan Semua</button>
                    </div>
                </div>
            `;
        }
    }

    requestAnimationFrame(() => {
        tbody.innerHTML = html;
    });
}

function findItemById(rowId) {
    if (!rowId) return null;
    const key = String(rowId);
    return prioritasList.find(i => getRowId(i) === key) || null;
}

function openEditModal(rowId) {
    const item = findItemById(rowId);
    if (!item) return;

    document.getElementById('modal-row-id').value = rowId;
    document.getElementById('modal-urutan').value = item.urutan_prioritas || '1.0';
    document.getElementById('modal-sdgs').value = item.mendukung_sdgs || '';
    document.getElementById('modal-kegiatan').value = item.sub_kegiatan || item.nama_kegiatan || '';
    document.getElementById('modal-eksisting').value = item.data_eksisting || '';
    document.getElementById('modal-lokasi').value = item.lokasi || '';
    document.getElementById('modal-volume').value = item.volume_satuan || item.volume || '';
    document.getElementById('modal-sumber').value = item.sumber_pembiayaan || 'ADD';
    document.getElementById('modal-laki').value = item.penerima_laki || 0;
    document.getElementById('modal-perempuan').value = item.penerima_perempuan || 0;
    document.getElementById('modal-rtm').value = item.penerima_rtm || 0;
    document.getElementById('modal-biaya').value = formatAngka(item.prakiraan_biaya || item.pagu_indikatif || 0);

    const modal = document.getElementById('edit-modal');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 50);
}

function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    const content = document.getElementById('modal-content');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

function submitEditForm(event) {
    event.preventDefault();
    const rowId = document.getElementById('modal-row-id').value;
    const idx = prioritasList.findIndex(i => getRowId(i) === String(rowId));
    if (idx === -1) return;

    prioritasList[idx] = {
        ...prioritasList[idx],
        urutan_prioritas: document.getElementById('modal-urutan').value,
        mendukung_sdgs: document.getElementById('modal-sdgs').value,
        sub_kegiatan: document.getElementById('modal-kegiatan').value,
        nama_kegiatan: document.getElementById('modal-kegiatan').value,
        data_eksisting: document.getElementById('modal-eksisting').value,
        lokasi: document.getElementById('modal-lokasi').value,
        volume_satuan: document.getElementById('modal-volume').value,
        volume: document.getElementById('modal-volume').value,
        sumber_pembiayaan: document.getElementById('modal-sumber').value,
        penerima_laki: parseInt(document.getElementById('modal-laki').value || 0, 10),
        penerima_perempuan: parseInt(document.getElementById('modal-perempuan').value || 0, 10),
        penerima_rtm: parseInt(document.getElementById('modal-rtm').value || 0, 10),
        prakiraan_biaya: parseNumber(document.getElementById('modal-biaya').value || 0)
    };

    closeEditModal();
    renderPrioritasTable();
    scheduleAutoSave();
}

// 4. Tarik Data dari RPJMDes & Normalisasi Langsung
async function tarikDariRPJMDes() {
    const tahun = document.getElementById('select-year')?.value || '2027';

    // ⚠️ KONFIRMASI: Tarik dari RPJMDes hanya mengisi MEMORI sementara.
    // Data ini belum tersimpan ke database sampai user klik "Simpan ke Database".
    // Peringatan: data yang sedang tampil di layar saat ini akan ditimpa oleh data RPJMDes.
    const lanjut = confirm(
        `⚠️ TARIK DATA DARI RPJMDES\n\n` +
        `Fungsi ini akan MENAMBAHKAN data baru dari RPJMDes ke tabel tahun ${tahun}.\n\n` +
        `CATATAN PENTING:\n` +
        `• Data yang sudah tampil / tersimpan TIDAK akan dihapus\n` +
        `• Hanya data RPJMDes yang belum pernah ditarik untuk tahun ${tahun} yang ditambahkan\n` +
        `• Data yang baru ditambahkan belum tersimpan ke database hingga Anda klik "Simpan ke Database"\n\n` +
        `Lanjutkan?`
    );
    if (!lanjut) return;

    console.log(`📥 Menarik data dari RPJMDes tahun ${tahun}...`);

    const tbody = document.getElementById('tabel-prioritas-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="14" class="text-center py-6 text-amber-600 font-sans italic">
                    <i class="fas fa-sync fa-spin mr-2"></i> Menarik data usulan dari RPJMDes...
                </td>
            </tr>
        `;
    }

    try {
        console.log('📡 Fetching:', `/api/prioritas-usulan/tarik-rpjm?tahun=${tahun}`);
        let fbRes = await fetch(`/api/prioritas-usulan/tarik-rpjm?tahun=${tahun}`);
        if (fbRes.ok) {
            let fbJson = await fbRes.json();
            if (fbJson.success && Array.isArray(fbJson.data)) {
                // GABUNGKAN data RPJMDes baru dengan data yang sudah tampil (tidak mengganti),
                // agar data lama yang sudah tersimpan/diedit tidak hilang.
                const pulledNew = normalisasiDataPrioritas(fbJson.data);
                const existingKeys = new Set(
                    (prioritasList || []).map(i => i.kode_unik_full || i.kode_unik || '').filter(Boolean)
                );
                const merged = [...(prioritasList || [])];
                let added = 0;
                for (const item of pulledNew) {
                    const key = item.kode_unik_full || item.kode_unik || '';
                    if (key && existingKeys.has(key)) continue;
                    if (key) existingKeys.add(key);
                    merged.push(item);
                    added++;
                }

                prioritasList = merged.sort((a, b) =>
                    (a.kode_unik_full || '').localeCompare(b.kode_unik_full || '', undefined, {numeric: true})
                );

                renderPrioritasTable();
                alert(
                    `✅ Berhasil menarik ${added} data baru dari RPJMDes (${pulledNew.length} dikembalikan, ${merged.length} total di tabel).\n\n` +
                    `⚠️  INGAT: Data ini belum tersimpan ke database!\n` +
                    `Silakan periksa, edit jika perlu, lalu klik "Simpan ke Database".`
                );
            } else {
                alert(`⚠️ Tidak ada data usulan RPJMDes yang memenuhi kriteria untuk tahun ${tahun}.`);
                renderPrioritasTable();
            }
        } else {
            throw new Error(`HTTP Error: ${fbRes.status}`);
        }
    } catch (error) {
        console.error('❌ Error tarikDariRPJMDes:', error);
        alert('❌ Gagal menarik data dari RPJMDes: ' + error.message);
        prioritasList = [];
        renderPrioritasTable();
    }
}

// 5. Functions Edit & Action
// Tombol Edit: buka modal penuh agar seluruh data terlihat jelas (tidak terpotong).
window.editRow = function(id) {
    const item = findItemById(id);
    if (!item) return;

    // cek bahwa modal ada di DOM terlebih dahulu
    if (typeof openEditModal === 'function') {
        openEditModal(id);
        return;
    }

    editingRowId = id;
    originalRowBackup = JSON.parse(JSON.stringify(item));
    renderPrioritasTable();
}

window.cancelEditRow = function() {
    if (editingRowId && originalRowBackup) {
        const item = findItemById(editingRowId);
        if (item) {
            const idx = prioritasList.indexOf(item);
            if (idx > -1) {
                prioritasList[idx] = originalRowBackup;
            }
        }
    }
    editingRowId = null;
    originalRowBackup = null;
    renderPrioritasTable();
}

window.saveEditRow = async function(id) {
    const item = findItemById(id);
    if (!item) return;

    if (!item.id || String(item.id).startsWith('temp')) {
        editingRowId = null;
        originalRowBackup = null;
        renderPrioritasTable();
        scheduleAutoSave();
        return;
    }

    // Auto-save memakai replace-all (id di DB selalu baru), jadi simpan penuh
    // dan reload dari DB agar id di memori selalu segar — PUT per-id bisa basi.
    editingRowId = null;
    originalRowBackup = null;
    await simpanDataPrioritas({ silent: true, reload: true });
}

window.deleteRow = async function(id) {
    const item = findItemById(id);
    if (!item) return;

    if (!confirm('🗑️ Yakin ingin menghapus data prioritas usulan ini?')) return;

    // Auto-save memakai replace-all (id di DB selalu baru), jadi hapus dari
    // memori lalu biarkan auto-save yang menyimpan ulang seluruh daftar.
    // Delete-endpoint per-id TIDAK dipakai agar tidak menghapus baris yang salah.
    prioritasList = prioritasList.filter(i => i !== item);
    renderPrioritasTable();
    scheduleAutoSave();
}

function addRow(bidangKe) {
    prioritasList.push({
        id: null,
        _tempId: nextTempId(),
        tahun: parseInt(document.getElementById('select-year')?.value || '2027'),
        bidang: bidangKe,
        urutan_prioritas: '',
        sub_kegiatan: '',
        mendukung_sdgs: '',
        data_eksisting: '',
        lokasi: '',
        volume_satuan: '',
        penerima_laki: 0,
        penerima_perempuan: 0,
        penerima_rtm: 0,
        prakiraan_biaya: 0,
        sumber_pembiayaan: 'ADD'
});
    renderPrioritasTable();
    scheduleAutoSave();
}

window.updateFieldDataByRowId = function(rowId, field, value) {
    const targetItem = findItemById(rowId);
    
    if (targetItem) {
        if (field === 'prakiraan_biaya') {
            targetItem[field] = parseNumber(value);
        } else if (field === 'penerima_laki' || field === 'penerima_perempuan' || field === 'penerima_rtm') {
            targetItem[field] = parseInt(value, 10) || 0;
        } else {
            targetItem[field] = value;
        }
        scheduleAutoSave();
    }
};

// Auto-save: debounce 800ms, simpan seluruh daftar utk tahun terpilih
async function simpanDataPrioritas(opts = {}) {
    const { silent = false, reload = true } = opts || {};
    const year = document.getElementById('select-year')?.value || '2027';

    // Konfirmasi hanya utk simpan manual (autosave = silent, tanpa konfirmasi)
    if (!silent) {
        const jumlah = prioritasList.length;
        const konfirmasi = confirm(
            `⚠️ KONFIRMASI SIMPAN DATA\n\n` +
            `Anda akan menyimpan ${jumlah} data Prioritas Usulan tahun ${year} ke database.\n\n` +
            `PERHATIAN: Proses ini akan MENGHAPUS seluruh data tahun ${year} yang ada di database, ` +
            `lalu menggantinya dengan data yang tampil di layar saat ini.\n\n` +
            `Pastikan data di layar adalah data FINAL yang sudah Anda edit/verifikasi.\n\n` +
            `Lanjutkan?`
        );
        if (!konfirmasi) return;
    }

    try {
        let res = await fetch('/api/prioritas-usulan/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tahun: year, data: optimasiPayloadPrioritas() })
        });

        let json = await res.json();
        if (json.success) {
            editingRowId = null;
            originalRowBackup = null;
            if (silent) {
                showToast(`✅ Data tahun ${year} auto-tersimpan (${json.count || prioritasList.length} baris).`, 'success');
            } else {
                alert(`✅ Berhasil! Data Prioritas Usulan Rencana Program/Kegiatan Tahun ${year} telah disimpan permanen ke Supabase.`);
            }
            if (reload) loadPrioritasData();
        } else {
            if (!silent) alert("❌ Gagal menyimpan: " + json.message);
        }
    } catch (err) {
        if (!silent) alert("❌ Terjadi kesalahan koneksi server: " + err.message);
    }
}

function optimasiPayloadPrioritas() {
    return prioritasList.map(item => {
        const cleaned = {};
        for (const key of Object.keys(item)) {
            if (key === 'id' || key === '_tempId' || key === '_temp') continue;
            if (item[key] !== undefined && item[key] !== null && item[key] !== '') {
                cleaned[key] = item[key];
            }
        }
        return cleaned;
    });
}

function scheduleAutoSave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        autoSaveTimer = null;
        simpanDataPrioritas({ silent: true, reload: false });
    }, 800);
}
window.scheduleAutoSave = scheduleAutoSave;
window.simpanDataPrioritas = simpanDataPrioritas;

async function saveToDatabase() {
    await simpanDataPrioritas({ silent: false, reload: true });
}


// 6. Cetak Dokumen / PDF
function generatePrintTableContent() {
    let html = '';
    let grandTotalBiaya = 0;

    for (let b = 1; b <= 5; b++) {
        const namaBidang = NAMA_BIDANG_PRIORITAS[b];
        let itemsBidang = prioritasList.filter(item => Number(item.bidang || extractBidangNumber(item)) === b);

        let subTotalBiaya = 0;

        // 1. Render Header Bidang Utama (1-5)
        html += `
            <tr style="background-color: #e2e8f0; font-weight: bold;">
                <td style="border: 1px solid #333; text-align: center; font-weight: bold;">${b}</td>
                <td colspan="12" style="border: 1px solid #333; text-transform: uppercase;">${b}. ${namaBidang}</td>
            </tr>
        `;

        if (itemsBidang.length === 0) {
            html += `
                <tr>
                    <td colspan="13" style="border: 1px solid #333; text-align: center; color: #666; font-style: italic;">Belum ada data untuk bidang ${b}</td>
                </tr>
            `;
        } else {
            // Group by Sub-Bidang (jenis_bidang) & Jenis Kegiatan (jenis_kegiatan)
            const groupedBySub = itemsBidang.reduce((acc, item) => {
                const subName = (item.jenis_bidang || item.sub_bidang || 'SUB BIDANG UMUM').trim().toUpperCase();
                if (!acc[subName]) acc[subName] = {};

                const kegName = (item.jenis_kegiatan || item.kelompok_kegiatan || 'Kegiatan Umum').trim();
                if (!acc[subName][kegName]) acc[subName][kegName] = [];
                
                acc[subName][kegName].push(item);
                return acc;
            }, {});

            let globalIdx = 1;
            for (const [subName, kegiatans] of Object.entries(groupedBySub)) {
                let subIdx = 1;
                // 2. Render Header Sub-Bidang / Jenis Bidang
                html += `
                    <tr style="background-color: #eef2f6; font-weight: bold;">
                        <td style="border: 1px solid #333; text-align: center;"></td>
                        <td colspan="12" style="border: 1px solid #333; font-size: 9px; padding-left: 8px;">
                            <i class="fas fa-layer-group"></i> ${subName}
                        </td>
                    </tr>
                `;

                for (const [kegName, itemsKeg] of Object.entries(kegiatans)) {
                    // 3. Render Header Jenis Kegiatan
                    if (kegName && kegName.toLowerCase() !== 'kegiatan umum') {
                        html += `
                            <tr style="background-color: #f8fafc; font-style: italic;">
                                <td style="border: 1px solid #333; text-align: center;"></td>
                                <td colspan="12" style="border: 1px solid #333; font-size: 8.5px; padding-left: 14px;">
                                    ↳ ${kegName}
                                </td>
                            </tr>
                        `;
                    }

                    itemsKeg.forEach((item) => {
                        const biaya = parseNumber(item.prakiraan_biaya);
                        subTotalBiaya += biaya;
                        
                        html += `
                            <tr>
                                <td class="col-no text-center" style="border: 1px solid #333; text-align: center;">${subIdx}</td>
                                <td class="col-bidang" style="border: 1px solid #333;"></td>
                                <td class="col-urutan text-center" style="border: 1px solid #333; text-align: center;">${item.urutan_prioritas || ''}</td>
                                <td class="col-kegiatan" style="border: 1px solid #333;">${item.sub_kegiatan || item.nama_kegiatan || '-'}</td>
                                <td class="col-sdgs text-center" style="border: 1px solid #333; text-align: center;">${String(item.mendukung_sdgs || '').replace(/[^0-9]/g, '') || '-'}</td>
                                <td class="col-eksisting" style="border: 1px solid #333;">${item.data_eksisting || '-'}</td>
                                <td class="col-lokasi" style="border: 1px solid #333;">${item.lokasi || 'Desa Batetangnga'}</td>
                                <td class="col-volume" style="border: 1px solid #333;">${item.volume_satuan || item.volume || '-'}</td>
                                <td class="col-penerima text-center" style="border: 1px solid #333; text-align: center;">${item.penerima_laki || 0}</td>
                                <td class="col-penerima text-center" style="border: 1px solid #333; text-align: center;">${item.penerima_perempuan || 0}</td>
                                <td class="col-penerima text-center" style="border: 1px solid #333; text-align: center;">${item.penerima_rtm || 0}</td>
                                <td class="col-biaya text-right" style="border: 1px solid #333; text-align: right;">${biaya > 0 ? formatRupiah(biaya) : '-'}</td>
                                <td class="col-sumber text-center" style="border: 1px solid #333; text-align: center;">${item.sumber_pembiayaan || 'ADD'}</td>
                            </tr>
                        `;
                        globalIdx++;
                        subIdx++;
                    });
                }
            }
        }

        grandTotalBiaya += subTotalBiaya;
        html += `
            <tr class="bg-slate font-bold" style="background-color: #f1f5f9; font-weight: bold;">
                <td colspan="11" style="border: 1px solid #333; text-align: right; padding-right: 8px;">JUMLAH PER BIDANG ${b}</td>
                <td style="border: 1px solid #333; text-align: right;">${subTotalBiaya > 0 ? formatRupiah(subTotalBiaya) : '-'}</td>
                <td style="border: 1px solid #333;"></td>
            </tr>
        `;
    }

    html += `
        <tr class="bg-dark text-white font-bold" style="background-color: #0f172a; color: #fff; font-weight: bold;">
            <td colspan="11" style="border: 1px solid #333; text-align: right; padding-right: 8px;">J U M L A H &nbsp; T O T A L &nbsp; B I A Y A</td>
            <td style="border: 1px solid #333; text-align: right;">${formatRupiah(grandTotalBiaya)}</td>
            <td style="border: 1px solid #333;"></td>
        </tr>
    `;

    return html;
}

function printPDF() {
    const tahun = document.getElementById('select-year')?.value || 2027;
    const inputTgl = document.getElementById('tgl-cetak')?.value;
    const namaKetua = document.getElementById('nama-ketua-tim')?.value || 'ABDUL AZIS, S. Pd';
    const tglIndo = formatTanggalIndonesia(inputTgl);

    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
        alert("⚠️ Izinkan pop-up browser untuk mencetak PDF!");
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Prioritas Usulan RKPDesa - ${tahun}</title>
            <style>
                @page { size: landscape; margin: 8mm 6mm 8mm 6mm; }
                body { font-family: 'Arial', sans-serif; font-size: 10px; padding: 0; margin: 0; color: #000; }
                .header-desa { text-align: center; margin-bottom: 12px; }
                .header-desa h1 { font-size: 14px; margin: 2px 0; font-weight: bold; text-transform: uppercase; }
                .header-desa h2 { font-size: 12px; margin: 2px 0; font-weight: bold; text-transform: uppercase; color: #1e1b4b; }
                .meta-table { width: 100%; margin: 8px 0; border: none; font-size: 10px; font-weight: bold; }
                .meta-table td { border: none; padding: 2px 4px; }
                table.data-table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
                table.data-table th, table.data-table td { border: 1px solid #333; padding: 3px 4px; word-wrap: break-word; }
                table.data-table th { background-color: #1e1b4b; color: #fff; font-weight: bold; text-align: center; text-transform: uppercase; }
                .bg-slate { background-color: #f1f5f9; }
                .bg-dark { background-color: #0f172a; color: #fff; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .col-no { width: 25px; text-align: center; }
                .col-bidang { width: 120px; }
                .col-urutan { width: 45px; text-align: center; }
                .col-kegiatan { min-width: 140px; }
                .col-sdgs { width: 70px; text-align: center; }
                .col-eksisting { width: 90px; }
                .col-lokasi { width: 85px; }
                .col-volume { width: 75px; }
                .col-penerima { width: 35px; text-align: center; }
                .col-biaya { width: 95px; text-align: right; }
                .col-sumber { width: 55px; text-align: center; }
                .ttd-container { margin-top: 25px; display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; page-break-inside: avoid; }
                .ttd-box { width: 250px; text-align: center; }
                .ttd-space { height: 50px; }
            </style>
        </head>
        <body>
            <div class="header-desa">
                <h1>DAFTAR PRIORITAS USULAN RENCANA PROGRAM DAN KEGIATAN PEMBANGUNAN DESA</h1>
                <h2>DESA BATETANGNGA KECAMATAN BINUANG TAHUN ANGGARAN ${tahun}</h2>
                <table class="meta-table">
                    <tr>
                        <td width="15%">DESA: BATETANGNGA</td>
                        <td width="25%">KECAMATAN: BINUANG</td>
                        <td width="30%">KABUPATEN: POLEWALI MANDAR</td>
                        <td width="30%">PROVINSI: SULAWESI BARAT</td>
                    </tr>
                </table>
            </div>

            <table class="data-table">
                <thead>
                    <tr>
                        <th class="col-no" rowspan="2">No</th>
                        <th class="col-bidang" rowspan="2">Bidang</th>
                        <th class="col-urutan" rowspan="2">Urutan</th>
                        <th class="col-kegiatan" rowspan="2">Nama Program / Kegiatan</th>
                        <th class="col-sdgs" rowspan="2">SDGs</th>
                        <th class="col-eksisting" rowspan="2">Data Eksisting</th>
                        <th class="col-lokasi" rowspan="2">Lokasi</th>
                        <th class="col-volume" rowspan="2">Volume</th>
                        <th colspan="3">Penerima Manfaat</th>
                        <th class="col-biaya" rowspan="2">Prakiraan Biaya (Rp)</th>
                        <th class="col-sumber" rowspan="2">Sumber</th>
                    </tr>
                    <tr>
                        <th class="col-penerima">L</th>
                        <th class="col-penerima">P</th>
                        <th class="col-penerima">RTM</th>
                    </tr>
                </thead>
                <tbody>
                    ${generatePrintTableContent()}
                </tbody>
            </table>

            <div class="ttd-container">
                <div class="ttd-box">
                    <p>Mengetahui,</p>
                    <p>Kepala Desa Batetangnga</p>
                    <div class="ttd-space"></div>
                    <p style="text-decoration: underline; font-size: 11px;">SUMAILA DAMANG</p>
                </div>
                <div class="ttd-box">
                    <p>Batetangnga, ${tglIndo}</p>
                    <p>Disusun oleh,<br>Ketua Tim Penyusun RKPDesa</p>
                    <div class="ttd-space"></div>
                    <p style="text-decoration: underline; font-size: 11px;">${namaKetua}</p>
                </div>
            </div>
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
    }, 500);
}

document.addEventListener('DOMContentLoaded', () => {
    loadPrioritasData();
    renderFooterTanggal();
    
    const inputTgl = document.getElementById('tgl-cetak');
    if (inputTgl) {
        if (!inputTgl.value) {
            const today = new Date().toISOString().split('T')[0];
            inputTgl.value = today;
        }
        renderFooterTanggal();
        inputTgl.addEventListener('change', renderFooterTanggal);
    }
});

function printPrioritasData() {
    if (typeof printPDF === 'function') {
        printPDF();
    }
}

// Window Exposures
window.tarikDariRPJMDes = tarikDariRPJMDes;
window.loadPrioritasData = loadPrioritasData;
window.renderPrioritasTable = renderPrioritasTable;
window.printPrioritasData = printPrioritasData;
window.printPDF = printPDF;
window.editRow = editRow;
window.saveEditRow = saveEditRow;
window.cancelEditRow = cancelEditRow;
window.deleteRow = deleteRow;
window.addRow = addRow;
window.saveToDatabase = saveToDatabase;
window.normalisasiDataPrioritas = normalisasiDataPrioritas;
window.normalisasiItemRPJM = normalisasiItemRPJM;
window.extractBidangNumber = extractBidangNumber;
window.changePage = changePage;
window.showAllData = showAllData;
window.showPagedData = showPagedData;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.submitEditForm = submitEditForm;
