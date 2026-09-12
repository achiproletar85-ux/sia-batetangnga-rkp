// ============================================================
// MODUL PENYUSUNAN PRIORITAS RKP DESA (CLEAN PRINT & LIVE EDITING)
// ============================================================

let activeData = [];
let saveTimers = {};   // Satu timer per id item agar tidak saling membatalkan
let prioritasSearchKeyword = '';
let modalKegiatanRancanganList = [];
let modalSelectedIndices = new Set();
let autoSyncTahunPrioritas = null;

function esc(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// 0. Segment-by-segment compare helper for strict kode_unik_full sorting
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
        const numA = partsA[i] ?? 0;
        const numB = partsB[i] ?? 0;
        if (numA !== numB) return numA - numB;
    }
    return strA.localeCompare(strB);
}

// 1. Penentuan Peringkat Romawi Baku
function hitungRankingRkpdes(totalSkor) {
    if (totalSkor >= 301) return 'I';    // Peringkat I   (301 - 400)
    if (totalSkor >= 201) return 'II';   // Peringkat II  (201 - 300)
    if (totalSkor >= 101) return 'III';  // Peringkat III (101 - 200)
    return 'IV';                         // Peringkat IV  (1 - 100)
}

function skorHeader(item, headerCol, skorCol) {
    const saved = item[skorCol];
    if (saved !== null && saved !== undefined && saved !== '') {
        const sj = parseInt(saved, 10);
        if (!Number.isNaN(sj)) return Math.min(100, Math.max(0, sj));
    }
    const h = parseInt(item[headerCol], 10);
    return Number.isNaN(h) ? 75 : Math.min(100, Math.max(0, h));
}

let prioritasClientCache = new Map(); // key: year, val: rawData array

// Mutex & In-Flight Tracker untuk mencegah fetch ganda serentak
let isFetchingPrioritas = false;
let activePrioritasAbortController = null;
let currentFetchYear = null;

// Aliases agar pemanggilan loadData() dan loadPrioritasData() keduanya berfungsi sempurna
async function loadData(forceReload = false) {
    return loadPrioritasData(forceReload);
}

// 2. Load Data dari Supabase / In-Memory Cache (Lazy & Sequential)
async function loadPrioritasData(forceReload = false) {
    const yearSelect = document.getElementById('select-year');
    const year = parseInt(yearSelect?.value || '2027', 10);
    const bidang = document.getElementById('select-bidang')?.value || 'BIDANG SEMUA';

    const bidangSel = document.getElementById('select-bidang');
    const bidangNo = (bidangSel && bidangSel.selectedOptions && bidangSel.selectedOptions[0])
        ? ((bidangSel.selectedOptions[0].textContent.match(/^\s*([1-5])\./) || [])[1] || '')
        : '';
    
    const elHeaderTahun = document.getElementById('header-tahun');
    const elTxtBidang = document.getElementById('txt-bidang');
    if (elHeaderTahun) elHeaderTahun.textContent = `RKP DESA TAHUN ${year}`;
    if (elTxtBidang) elTxtBidang.textContent = `: ${bidang.toUpperCase()}`;

    const tbody = document.getElementById('tabel-prioritas-body');
    if (!tbody) return;

    // Helper filter client-side dari dataset lengkap tahun tersebut
    const applyClientFilterAndRender = (fullYearData) => {
        let filtered = fullYearData;
        const bNoInt = parseInt(bidangNo, 10);
        if (!isNaN(bNoInt) && bNoInt >= 1 && bNoInt <= 5) {
            filtered = fullYearData.filter(item => {
                const k = String(item.kode_unik_full || item.kode_unik || item.kode_bidang || item.bidang_kode || '');
                const m = k.match(/^0?([1-5])\./);
                if (m) return parseInt(m[1], 10) === bNoInt;
                return parseInt(item.bidang_kode || item.bidang, 10) === bNoInt;
            });
        } else if (bidang && !bidang.includes('SEMUA')) {
            const key = String(bidang).toLowerCase();
            filtered = fullYearData.filter(item =>
                String(item.jenis_bidang || item.sub_bidang || item.bidang || '').toLowerCase().includes(key)
            );
        }
        activeData = filtered;
        prioritasCurrentPage = 1;
        sortAndRenderData();
    };

    // 1. Cek Client Cache untuk respon instan 0ms (misal saat ganti bidang)
    if (!forceReload && prioritasClientCache.has(year)) {
        const cachedData = prioritasClientCache.get(year);
        applyClientFilterAndRender(cachedData);
        return;
    }

    // 2. Hindari fetch ganda serentak:
    // Jika sedang fetch untuk TAHUN YANG SAMA, abaikan panggilan berulang
    if (isFetchingPrioritas && currentFetchYear === year) {
        console.log(`⏳ Pemuatan data prioritas tahun ${year} sedang berjalan, mengabaikan fetch ganda.`);
        return;
    }

    // Jika sedang fetch untuk TAHUN BERBEDA, batalkan request sebelumnya (AbortController)
    if (isFetchingPrioritas && activePrioritasAbortController) {
        activePrioritasAbortController.abort();
        activePrioritasAbortController = null;
    }

    isFetchingPrioritas = true;
    currentFetchYear = year;
    activePrioritasAbortController = new AbortController();

    tbody.innerHTML = `
        <tr>
            <td colspan="12" class="text-center py-8 text-slate-400 font-sans italic">
                <i class="fas fa-spinner fa-spin mr-2 text-amber-600"></i> Memuat data matriks skoring Prioritas RKPDes tahun ${year}...
            </td>
        </tr>
    `;

    try {
        let rawData = [];

        // Tarik HANYA tahun aktif yang sedang dipilih (lazy / sequential)
        let res = await fetch(`/api/prioritas-rkpdes?tahun=${year}`, {
            signal: activePrioritasAbortController.signal
        });
        if (res.ok) {
            let json = await res.json();
            rawData = json.data || [];
        }

        if (rawData.length === 0 && autoSyncTahunPrioritas !== year) {
            autoSyncTahunPrioritas = year;
            console.log(`🔄 DB prioritas_rkpdes kosong untuk tahun ${year}, menarik otomatis dari Rancangan RKPDes...`);
            await fetch('/api/prioritas-rkpdes/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tahun: year }),
                signal: activePrioritasAbortController.signal
            });
            isFetchingPrioritas = false;
            return loadPrioritasData(true);
        }

        const normalizedData = rawData.map(item => ({
            id: item.id,
            _src: 'prioritas',
            tahun: parseInt(year, 10),
            bidang_kode: item.bidang_kode || item.bidang || '',
            kode_bidang: item.kode_bidang || '',
            kode_sub: item.kode_sub || '',
            kode_kegiatan: item.kode_kegiatan || '',
            kode_unik_full: item.kode_unik_full || item.kode_unik || '',
            kode_unik: item.kode_unik || item.kode_unik_full || '',
            jenis_bidang: item.jenis_bidang || item.sub_bidang || item.bidang || '-',
            jenis_kegiatan: item.jenis_kegiatan || item.nama_kegiatan || item.sub_kegiatan || '-',
            nama_kegiatan: item.nama_kegiatan || item.sub_kegiatan || '',
            lokasi: item.lokasi_kegiatan || item.lokasi || 'Desa Batetangnga',
            volume: item.volume_kegiatan || item.volume_satuan || (item.volume ? `${item.volume} ${item.satuan || ''}`.trim() : '') || '12 Bulan',
            skor_kewenangan: parseInt(item.skor_kewenangan ?? 80, 10),
            skor_sdgs: parseInt(item.skor_sdgs ?? 75, 10),
            skor_kabupaten: parseInt(item.skor_kabupaten ?? 75, 10),
            skor_sumber_daya: parseInt(item.skor_sumber_daya ?? 75, 10),
            mendukung_sdgs: item.mendukung_sdgs || ''
        }));

        prioritasClientCache.set(year, normalizedData);
        applyClientFilterAndRender(normalizedData);

    } catch (err) {
        if (err.name === 'AbortError') {
            console.log(`⏹️ Request fetch prioritas tahun ${year} dibatalkan karena pembaruan filter.`);
            return;
        }
        console.error("Error loading prioritas data:", err);
        tbody.innerHTML = `<tr><td colspan="12" class="text-center py-8 text-rose-500 font-sans">Gagal memuat data: ${err.message}</td></tr>`;
    } finally {
        isFetchingPrioritas = false;
        activePrioritasAbortController = null;
    }
}

function getBidangPrefix(item) {
    const k = String(item.kode_unik_full || item.kode_unik || '').trim();
    const parts = k.split('.').filter(Boolean);
    if (parts.length >= 2) {
        return parts.slice(0, 2).join('.') + '.';
    }
    if (parts.length >= 1) {
        return parts[0] + '.';
    }
    return String(item.kode_bidang || item.bidang_kode || item.bidang || '').trim();
}

function getJenisKegiatanPrefix(item) {
    const k = String(item.kode_unik_full || item.kode_unik || '').trim();
    const parts = k.split('.').filter(Boolean);
    if (parts.length >= 3) {
        return parts.slice(0, 3).join('.') + '.';
    }
    return getBidangPrefix(item);
}

function comparePrioritasRanking(a, b) {
    // 1. Header Jenis Bidang: Urutkan mutlak berdasarkan kode_unik_full (2 segmen pertama: 01.01., 01.02., 01.03., dst)
    const bPrefA = getBidangPrefix(a);
    const bPrefB = getBidangPrefix(b);
    if (bPrefA !== bPrefB) {
        return compareKodeUnikFull(bPrefA, bPrefB);
    }

    // 2. Header Jenis Kegiatan: Urutkan mutlak berdasarkan kode_unik_full (3 segmen pertama: 01.01.01., 01.01.02., dst)
    const jkPrefA = getJenisKegiatanPrefix(a);
    const jkPrefB = getJenisKegiatanPrefix(b);
    if (jkPrefA !== jkPrefB) {
        return compareKodeUnikFull(jkPrefA, jkPrefB);
    }

    const jkA = String(a.jenis_kegiatan || '').trim();
    const jkB = String(b.jenis_kegiatan || '').trim();
    if (jkA !== jkB && jkA && jkB) {
        const cmpJKName = jkA.localeCompare(jkB, 'id', { numeric: true });
        if (cmpJKName !== 0) return cmpJKName;
    }

    // 3. Baris "Kegiatan / Sub Kegiatan" di dalam Jenis Kegiatan tersebut: Urutkan berdasarkan Ranking I, II, III, IV (Skor Tertinggi ke Terendah)
    const scoreA = Number(a.total_skor ?? ((Number(a.skor_kewenangan || 0)) + (Number(a.skor_sdgs || 0)) + (Number(a.skor_kabupaten || 0)) + (Number(a.skor_sumber_daya || 0))));
    const scoreB = Number(b.total_skor ?? ((Number(b.skor_kewenangan || 0)) + (Number(b.skor_sdgs || 0)) + (Number(b.skor_kabupaten || 0)) + (Number(b.skor_sumber_daya || 0))));

    if (scoreB !== scoreA) {
        return scoreB - scoreA;
    }

    // 4. Jika total skor / ranking sama di dalam Jenis Kegiatan tersebut, urutkan berdasarkan kode_unik_full
    const kodeA = String(a.kode_unik_full || a.kode_unik || '');
    const kodeB = String(b.kode_unik_full || b.kode_unik || '');
    return compareKodeUnikFull(kodeA, kodeB);
}

// 3. Sorting Cerdas & Re-render (Urut berdasarkan Ranking/Total Skor, jika sama urut berdasarkan Kode Unik Full)
function sortAndRenderData() {
    if (!activeData || activeData.length === 0) {
        renderTabelPrioritas([]);
        return;
    }

    activeData.forEach(item => {
        const sk1 = parseInt(item.skor_kewenangan) || 0;
        const sk2 = parseInt(item.skor_sdgs) || 0;
        const sk3 = parseInt(item.skor_kabupaten) || 0;
        const sk4 = parseInt(item.skor_sumber_daya) || 0;
        item.total_skor = sk1 + sk2 + sk3 + sk4;
        item.ranking = hitungRankingRkpdes(item.total_skor);
    });

    activeData.sort((a, b) => comparePrioritasRanking(a, b));

    renderTabelPrioritas(activeData);
}

// 4. Fast Search Filter (dengan Debounce untuk mencegah freeze/lag saat mengetik)
let searchDebounceTimer = null;

function filterPrioritasTable() {
    const input = document.getElementById('search-prioritas-input');
    const clearBtn = document.getElementById('btn-clear-search-prioritas');
    const val = (input?.value || '').toLowerCase().trim();

    if (clearBtn) {
        if (val.length > 0) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        prioritasSearchKeyword = val;
        sortAndRenderData();
    }, 150);
}

function clearSearchPrioritas() {
    const input = document.getElementById('search-prioritas-input');
    if (input) input.value = '';
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    prioritasSearchKeyword = '';
    const clearBtn = document.getElementById('btn-clear-search-prioritas');
    if (clearBtn) clearBtn.classList.add('hidden');
    sortAndRenderData();
}

// 5. Render Tabel Matriks Prioritas (Paginated / Virtualized & Anti-Blocking)
let prioritasCurrentPage = 1;
const PRIORITAS_PAGE_SIZE = 30; // 30 baris per halaman (hanya ~120 input di DOM, bebas lag & 0 violation)
let prioritasShowAllRows = false;
let currentRenderToken = 0;
let currentRenderTimer = null;

function buildPrioritasRowHtml(item, index, ctx, isForPrint = false) {
    const total = item.total_skor;
    const currentJenisBidang = String(item.jenis_bidang || '-').trim();
    const currentJenisKegiatan = String(item.jenis_kegiatan || '-').trim();
    const isNewJK = currentJenisKegiatan !== ctx.lastJenisKegiatan;

    let html = '';

    if (currentJenisBidang !== ctx.lastJenisBidang) {
        ctx.lastJenisBidang = currentJenisBidang;
        ctx.lastJenisKegiatan = '';
        ctx.nomorUrut = 1;

        html += `
            <tr class="bg-indigo-100 font-bold font-serif">
                <td colspan="12" class="border border-slate-400 px-3.5 py-2.5 text-slate-900 text-left">
                    ${esc(currentJenisBidang)}
                </td>
            </tr>
        `;
    }

    if (isNewJK || ctx.lastJenisKegiatan === '') {
        ctx.lastJenisKegiatan = currentJenisKegiatan;
        ctx.nomorUrut = 1;
    }

    const shownJK = isNewJK ? esc(currentJenisKegiatan) : '';
    const rankRomawi = hitungRankingRkpdes(total);
    const kodeVal = String(item.kode_unik_full || item.kode_unik || '').trim();

    html += `
        <tr class="border border-slate-400 hover:bg-amber-50/50 transition font-serif" data-idx="${index}">
            <td class="border border-slate-400 text-center py-2 font-bold">${ctx.nomorUrut}</td>

            <td class="border border-slate-400 px-2.5 py-2 text-slate-800">${shownJK}</td>

            <td class="border border-slate-400 px-2.5 py-2 text-slate-900">
                <div class="flex items-center justify-between gap-1">
                    <span class="font-bold">${esc(item.nama_kegiatan) || '-'}</span>
                    ${kodeVal ? `<span class="badge-kode-unik col-kode-unik shrink-0 text-[10px] font-mono font-semibold px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded border border-amber-300" data-print-hide="kode-unik" title="Kode Unik">${esc(kodeVal)}</span>` : ''}
                </div>
            </td>
            <td class="border border-slate-400 px-2 py-2 text-center">${esc(item.lokasi) || 'Desa Batetangnga'}</td>
            <td class="border border-slate-400 px-2 py-2 text-center font-medium">${esc(item.volume) || '-'}</td>
            
            <td class="border border-slate-400 p-1 text-center">
                ${isForPrint ? `<span class="skor-print-val font-bold">${item.skor_kewenangan}</span>` : `
                <input type="number" min="0" max="100" value="${item.skor_kewenangan}" 
                    autocomplete="off" data-lpignore="true" data-1p-ignore="true" data-form-type="other"
                    onchange="updateSkorLive(${index}, 'skor_kewenangan', this.value, this)" 
                    class="w-12 text-center font-bold bg-amber-50 focus:bg-white border border-slate-300 rounded p-1 print:hidden" />
                <span class="skor-print-val hidden print:inline font-bold">${item.skor_kewenangan}</span>`}
            </td>
            <td class="border border-slate-400 p-1 text-center">
                ${isForPrint ? `<span class="skor-print-val font-bold">${item.skor_sdgs}</span>` : `
                <input type="number" min="0" max="100" value="${item.skor_sdgs}" 
                    autocomplete="off" data-lpignore="true" data-1p-ignore="true" data-form-type="other"
                    onchange="updateSkorLive(${index}, 'skor_sdgs', this.value, this)" 
                    class="w-12 text-center font-bold bg-amber-50 focus:bg-white border border-slate-300 rounded p-1 print:hidden" />
                <span class="skor-print-val hidden print:inline font-bold">${item.skor_sdgs}</span>`}
            </td>
            <td class="border border-slate-400 p-1 text-center">
                ${isForPrint ? `<span class="skor-print-val font-bold">${item.skor_kabupaten}</span>` : `
                <input type="number" min="0" max="100" value="${item.skor_kabupaten}" 
                    autocomplete="off" data-lpignore="true" data-1p-ignore="true" data-form-type="other"
                    onchange="updateSkorLive(${index}, 'skor_kabupaten', this.value, this)" 
                    class="w-12 text-center font-bold bg-amber-50 focus:bg-white border border-slate-300 rounded p-1 print:hidden" />
                <span class="skor-print-val hidden print:inline font-bold">${item.skor_kabupaten}</span>`}
            </td>
            <td class="border border-slate-400 p-1 text-center">
                ${isForPrint ? `<span class="skor-print-val font-bold">${item.skor_sumber_daya}</span>` : `
                <input type="number" min="0" max="100" value="${item.skor_sumber_daya}" 
                    autocomplete="off" data-lpignore="true" data-1p-ignore="true" data-form-type="other"
                    onchange="updateSkorLive(${index}, 'skor_sumber_daya', this.value, this)" 
                    class="w-12 text-center font-bold bg-amber-50 focus:bg-white border border-slate-300 rounded p-1 print:hidden" />
                <span class="skor-print-val hidden print:inline font-bold">${item.skor_sumber_daya}</span>`}
            </td>

            <td data-total class="border border-slate-400 text-center py-2 font-extrabold bg-slate-100 text-slate-900"><span class="skor-print-val">${total}</span></td>
            <td data-rank class="border border-slate-400 text-center py-2 font-extrabold text-amber-700"><span class="skor-print-val">${rankRomawi}</span></td>
            <td class="border border-slate-400 text-center py-2 no-print">
                <button onclick="hapusItemData(${index})" title="Hapus Baris" class="bg-rose-100 hover:bg-rose-200 text-rose-800 font-sans text-xs px-2 py-1 rounded border border-rose-300 font-bold">
                    🗑️
                </button>
            </td>
        </tr>
    `;
    ctx.nomorUrut++;
    return html;
}

function renderPrioritasPaginationControls(totalItems) {
    const container = document.getElementById('prioritas-pagination-container');
    if (!container) return;

    if (totalItems <= PRIORITAS_PAGE_SIZE && !prioritasShowAllRows) {
        container.innerHTML = '';
        return;
    }

    if (prioritasShowAllRows) {
        container.innerHTML = `
            <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                <span class="text-slate-600 font-medium">Menampilkan seluruh <b>${totalItems}</b> kegiatan (Mode Lengkap)</span>
                <button type="button" onclick="setPrioritasShowAll(false)" class="px-3 py-1.5 rounded-lg border border-indigo-300 bg-white hover:bg-indigo-50 font-bold text-indigo-700 shadow-sm transition flex items-center gap-1.5 cursor-pointer">
                    <i class="fas fa-file-lines"></i> Mode Halaman (${PRIORITAS_PAGE_SIZE} per hal)
                </button>
            </div>
        `;
        return;
    }

    const totalPages = Math.max(1, Math.ceil(totalItems / PRIORITAS_PAGE_SIZE));
    const startIdx = (prioritasCurrentPage - 1) * PRIORITAS_PAGE_SIZE + 1;
    const endIdx = Math.min(prioritasCurrentPage * PRIORITAS_PAGE_SIZE, totalItems);

    let pageButtonsHtml = '';
    const maxBtns = 5;
    let startPage = Math.max(1, prioritasCurrentPage - Math.floor(maxBtns / 2));
    let endPage = Math.min(totalPages, startPage + maxBtns - 1);
    if (endPage - startPage + 1 < maxBtns) {
        startPage = Math.max(1, endPage - maxBtns + 1);
    }

    for (let p = startPage; p <= endPage; p++) {
        pageButtonsHtml += `
            <button type="button" onclick="goToPrioritasPage(${p})" class="px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${p === prioritasCurrentPage ? 'bg-amber-600 text-white shadow-sm' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'}">
                ${p}
            </button>
        `;
    }

    container.innerHTML = `
        <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
            <span class="text-slate-600 font-medium">
                Menampilkan <b>${startIdx} - ${endIdx}</b> dari total <b>${totalItems}</b> kegiatan (Hal ${prioritasCurrentPage}/${totalPages})
            </span>
            <div class="flex items-center gap-1.5">
                <button type="button" onclick="goToPrioritasPage(${prioritasCurrentPage - 1})" ${prioritasCurrentPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs"' : 'class="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 shadow-sm transition cursor-pointer"'}>
                    ◀
                </button>
                ${pageButtonsHtml}
                <button type="button" onclick="goToPrioritasPage(${prioritasCurrentPage + 1})" ${prioritasCurrentPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs"' : 'class="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 shadow-sm transition cursor-pointer"'}>
                    ▶
                </button>
            </div>
            <button type="button" onclick="setPrioritasShowAll(true)" class="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-bold text-slate-700 shadow-sm transition flex items-center gap-1.5 cursor-pointer">
                <i class="fas fa-list"></i> Tampilkan Semua (${totalItems})
            </button>
        </div>
    `;
}

function goToPrioritasPage(page) {
    prioritasCurrentPage = page;
    sortAndRenderData();
}

function setPrioritasShowAll(show) {
    prioritasShowAllRows = show;
    prioritasCurrentPage = 1;
    sortAndRenderData();
}

function renderTabelPrioritas(data, forceSyncAll = false, isForPrint = false) {
    const tbody = document.getElementById('tabel-prioritas-body');
    if (!tbody) return;

    if (currentRenderTimer) {
        clearTimeout(currentRenderTimer);
        currentRenderTimer = null;
    }

    let displayData = data;
    if (prioritasSearchKeyword) {
        displayData = data.filter(item => {
            const sub = String(item.nama_kegiatan || item.sub_kegiatan || '').toLowerCase();
            const keg = String(item.jenis_kegiatan || '').toLowerCase();
            const bid = String(item.jenis_bidang || item.sub_bidang || '').toLowerCase();
            const lok = String(item.lokasi || '').toLowerCase();
            const kode = String(item.kode_unik_full || item.kode_unik || '').toLowerCase();
            return sub.includes(prioritasSearchKeyword) || keg.includes(prioritasSearchKeyword) || bid.includes(prioritasSearchKeyword) || lok.includes(prioritasSearchKeyword) || kode.includes(prioritasSearchKeyword);
        });
    }

    const summaryBadge = document.getElementById('prioritas-summary-badge');
    if (summaryBadge) {
        summaryBadge.innerText = prioritasSearchKeyword
            ? `Menampilkan ${displayData.length} dari ${data.length} kegiatan`
            : `Total: ${data.length} kegiatan`;
    }

    if (!displayData || displayData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="12" class="text-center py-8 text-slate-400 font-sans">
                    ${prioritasSearchKeyword ? '🔍 Tidak ada kegiatan yang cocok dengan kata kunci pencarian.' : 'Belum ada data kegiatan pada tahun & bidang ini.'}
                </td>
            </tr>
        `;
        renderPrioritasPaginationControls(0);
        return;
    }

    // Jika untuk cetak atau forceSyncAll: render SEMUA baris secara sinkron
    if (forceSyncAll || isForPrint) {
        const ctx = { lastJenisBidang: '', lastJenisKegiatan: '', nomorUrut: 1 };
        const allRowsHtml = displayData.map((item, index) => buildPrioritasRowHtml(item, index, ctx, isForPrint)).join('');
        tbody.innerHTML = allRowsHtml;
        return;
    }

    // Mode Normal / Interaktif (Paginated by PRIORITAS_PAGE_SIZE = 30)
    if (!prioritasShowAllRows) {
        const totalPages = Math.max(1, Math.ceil(displayData.length / PRIORITAS_PAGE_SIZE));
        if (prioritasCurrentPage > totalPages) prioritasCurrentPage = totalPages;
        if (prioritasCurrentPage < 1) prioritasCurrentPage = 1;

        const start = (prioritasCurrentPage - 1) * PRIORITAS_PAGE_SIZE;
        const end = start + PRIORITAS_PAGE_SIZE;
        const pageItems = displayData.slice(start, end);

        // Pre-compute group context up to start of page
        const ctx = { lastJenisBidang: '', lastJenisKegiatan: '', nomorUrut: 1 };
        for (let i = 0; i < start; i++) {
            const item = displayData[i];
            const currentJenisBidang = String(item.jenis_bidang || '-').trim();
            const currentJenisKegiatan = String(item.jenis_kegiatan || '-').trim();
            if (currentJenisBidang !== ctx.lastJenisBidang) {
                ctx.lastJenisBidang = currentJenisBidang;
                ctx.lastJenisKegiatan = '';
                ctx.nomorUrut = 1;
            }
            if (currentJenisKegiatan !== ctx.lastJenisKegiatan || ctx.lastJenisKegiatan === '') {
                ctx.lastJenisKegiatan = currentJenisKegiatan;
                ctx.nomorUrut = 1;
            }
            ctx.nomorUrut++;
        }

        const pageHtml = pageItems.map((item, idx) => buildPrioritasRowHtml(item, start + idx, ctx, false)).join('');
        tbody.innerHTML = pageHtml;
        renderPrioritasPaginationControls(displayData.length);
        return;
    }

    // Mode "Tampilkan Semua": Batched via setTimeout (16ms) agar browser event loop tidak terblokir
    const ctx = { lastJenisBidang: '', lastJenisKegiatan: '', nomorUrut: 1 };
    const rowHtmlList = displayData.map((item, index) => buildPrioritasRowHtml(item, index, ctx, false));

    tbody.innerHTML = rowHtmlList.slice(0, PRIORITAS_PAGE_SIZE).join('');
    renderPrioritasPaginationControls(displayData.length);

    let offset = PRIORITAS_PAGE_SIZE;
    const token = ++currentRenderToken;

    function streamNextChunk() {
        if (token !== currentRenderToken) return;
        if (offset >= rowHtmlList.length) return;

        const chunk = rowHtmlList.slice(offset, offset + PRIORITAS_PAGE_SIZE).join('');
        tbody.insertAdjacentHTML('beforeend', chunk);
        offset += PRIORITAS_PAGE_SIZE;

        if (offset < rowHtmlList.length) {
            currentRenderTimer = setTimeout(streamNextChunk, 16);
        }
    }

    currentRenderTimer = setTimeout(streamNextChunk, 16);
}

function updateSkorLive(index, field, value, inputEl) {
    const raw = parseInt(value, 10);
    const item = activeData[index];
    if (!item) return;

    if (Number.isNaN(raw) || raw < 0 || raw > 100) {
        if (inputEl) inputEl.value = item[field];
        const label = { skor_kewenangan: 'Skor Kewenangan', skor_sdgs: 'Skor SDGs', skor_kabupaten: 'Skor Kabupaten/Kota', skor_sumber_daya: 'Skor Sumber Daya' }[field] || field;
        if (typeof showToast === 'function') showToast(`❌ ${label} harus antara 0 - 100.`, 'error');
        else alert(`❌ ${label} harus antara 0 - 100.`);
        return;
    }

    item[field] = raw;

    const sk1 = parseInt(item.skor_kewenangan) || 0;
    const sk2 = parseInt(item.skor_sdgs) || 0;
    const sk3 = parseInt(item.skor_kabupaten) || 0;
    const sk4 = parseInt(item.skor_sumber_daya) || 0;
    item.total_skor = sk1 + sk2 + sk3 + sk4;

    if (inputEl && inputEl.parentElement) {
        const span = inputEl.parentElement.querySelector('.print\\:inline');
        if (span) span.textContent = raw;
    }

    const tr = document.querySelector(`#tabel-prioritas-body tr[data-idx="${index}"]`);
    if (tr) {
        const totalTd = tr.querySelectorAll('td[data-total]');
        const rankTd = tr.querySelectorAll('td[data-rank]');
        if (totalTd.length) {
            const spanTot = totalTd[0].querySelector('.skor-print-val');
            if (spanTot) spanTot.textContent = item.total_skor;
            else totalTd[0].textContent = item.total_skor;
        }
        if (rankTd.length) {
            const rankVal = hitungRankingRkpdes(item.total_skor);
            const spanRnk = rankTd[0].querySelector('.skor-print-val');
            if (spanRnk) spanRnk.textContent = rankVal;
            else rankTd[0].textContent = rankVal;
        }
    }

    scheduleSaveSkor(item);
}

function scheduleSaveSkor(item) {
    if (!item || !item.id || String(item.id).startsWith('temp')) return;
    const key = item.id;
    if (saveTimers[key]) clearTimeout(saveTimers[key]);
    saveTimers[key] = setTimeout(() => {
        delete saveTimers[key];
        simpanSkorPrioritas(item);
    }, 600);
}

async function simpanSkorPrioritas(item) {
    const tahun = item.tahun || parseInt(document.getElementById('select-year')?.value || '2027', 10);
    const payload = {
        tahun,
        items: [{
            ...item,
            skor_kewenangan: parseInt(item.skor_kewenangan) || 0,
            skor_sdgs: parseInt(item.skor_sdgs) || 0,
            skor_kabupaten: parseInt(item.skor_kabupaten) || 0,
            skor_sumber_daya: parseInt(item.skor_sumber_daya) || 0,
            total_skor: item.total_skor || 0,
            ranking: hitungRankingRkpdes(item.total_skor || 0)
        }]
    };
    try {
        const res = await fetch('/api/prioritas-rkpdes/upsert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (!json.success) console.warn('Gagal simpan skor:', json.error || json.message);
        return json.success;
    } catch (e) {
        console.warn('Error simpan skor otomatis:', e.message);
        return false;
    }
}

async function simpanSemuaSkor() {
    if (!Array.isArray(activeData) || activeData.length === 0) {
        alert('Tidak ada data prioritas untuk disimpan.');
        return;
    }
    const batch = activeData
        .filter(item => item && (item.kode_unik_full || item.kode_unik))
        .map(item => ({
            ...item,
            skor_kewenangan: parseInt(item.skor_kewenangan) || 0,
            skor_sdgs: parseInt(item.skor_sdgs) || 0,
            skor_kabupaten: parseInt(item.skor_kabupaten) || 0,
            skor_sumber_daya: parseInt(item.skor_sumber_daya) || 0,
            total_skor: item.total_skor || 0,
            ranking: item.ranking || hitungRankingRkpdes(item.total_skor || 0)
        }));

    if (batch.length === 0) {
        alert('Tidak ada baris prioritas dengan kode unik untuk disimpan.');
        return;
    }

    const tahunVal = batch[0].tahun || parseInt(document.getElementById('select-year')?.value || '2027', 10);
    try {
        const res = await fetch('/api/prioritas-rkpdes/upsert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tahun: tahunVal, items: batch })
        });
        const json = await res.json();
        if (json.success) {
            if (typeof showToast === 'function') showToast('✅ ' + json.message, 'success');
            else alert('✅ ' + json.message);
            prioritasClientCache.delete(tahunVal);
            loadPrioritasData(true);
        } else {
            if (typeof showToast === 'function') showToast('❌ ' + json.message, 'error');
            else alert('❌ ' + json.message);
        }
    } catch (err) {
        console.error('Error simpan semua skor:', err);
        if (typeof showToast === 'function') showToast('❌ Gagal menyimpan skor.', 'error');
        else alert('❌ Gagal menyimpan skor.');
    }
}

// 6. Tarik Otomatis dari Rancangan RKPDes
async function tarikDariRancanganRKPDes(showAlert = true) {
    const year = parseInt(document.getElementById('select-year')?.value || '2027', 10);
    console.log(`📥 Menarik data dari Rancangan RKPDes untuk Prioritas RKPDes tahun ${year}...`);

    const tbody = document.getElementById('tabel-prioritas-body');
    if (tbody) tbody.innerHTML = `<tr><td colspan="12" class="text-center py-6 text-amber-600 font-sans italic"><i class="fas fa-sync fa-spin mr-2"></i>Menarik data dari Rancangan RKPDes tahun ${year}...</td></tr>`;

    try {
        const res = await fetch('/api/prioritas-rkpdes/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tahun: year })
        });
        const json = await res.json();

        if (json.success) {
            autoSyncTahunPrioritas = year;
            prioritasClientCache.delete(year);
            await loadPrioritasData(true);
            if (showAlert) {
                alert(`✅ ${json.message}`);
            }
        } else {
            alert(`❌ Gagal menarik data: ${json.error || json.message}`);
        }
    } catch (err) {
        console.error("❌ Error tarikDariRancanganRKPDes:", err);
        if (showAlert) alert(`❌ Gagal menarik data dari Rancangan RKPDes: ${err.message}`);
    }
}

// 7. Modal Tarik Manual Rancangan RKPDes Controller
async function openModalTarikManualRancangan() {
    const modal = document.getElementById('modal-tarik-rancangan');
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const yearSelect = document.getElementById('select-year');
    const modalYearSelect = document.getElementById('modal-tahun-sumber-rancangan');
    if (yearSelect && modalYearSelect) {
        modalYearSelect.value = yearSelect.value;
    }

    modalSelectedIndices.clear();
    updateModalSelectedCount();
    await loadKegiatanRancanganManual();
}

function closeModalTarikManualRancangan() {
    const modal = document.getElementById('modal-tarik-rancangan');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function loadKegiatanRancanganManual() {
    const modalYearSelect = document.getElementById('modal-tahun-sumber-rancangan');
    const tahunSumber = modalYearSelect ? modalYearSelect.value : '2027';
    const container = document.getElementById('modal-container-rancangan');

    if (container) {
        container.innerHTML = `<div class="text-center py-12 text-slate-400 font-medium"><i class="fas fa-spinner fa-spin mr-2"></i>Memuat daftar Rancangan RKPDes tahun ${tahunSumber}...</div>`;
    }

    try {
        const res = await fetch(`/api/prioritas-rkpdes/tarik-rancangan?tahun=${tahunSumber}`);
        const json = await res.json();

        if (json.success && Array.isArray(json.data)) {
            modalKegiatanRancanganList = json.data;
            modalSelectedIndices.clear();
            updateModalSelectedCount();
            filterKegiatanRancanganManual();
        } else {
            modalKegiatanRancanganList = [];
            if (container) {
                container.innerHTML = `<div class="text-center py-12 text-slate-400 font-medium">📭 Tidak ada usulan di Rancangan RKPDes tahun ${tahunSumber}</div>`;
            }
        }
    } catch (err) {
        console.error("❌ Error loadKegiatanRancanganManual:", err);
        if (container) {
            container.innerHTML = `<div class="text-center py-12 text-rose-500 font-medium">❌ Gagal memuat data dari server</div>`;
        }
    }
}

function filterKegiatanRancanganManual() {
    const searchInput = document.getElementById('modal-search-rancangan');
    const kw = (searchInput ? searchInput.value : '').toLowerCase().trim();

    if (!kw) {
        renderDaftarKegiatanRancanganManual(modalKegiatanRancanganList);
        return;
    }

    const filtered = modalKegiatanRancanganList.filter(item => {
        const sub = String(item.sub_kegiatan || item.nama_kegiatan || '').toLowerCase();
        const keg = String(item.jenis_kegiatan || '').toLowerCase();
        const bid = String(item.jenis_bidang || item.sub_bidang || '').toLowerCase();
        const kode = String(item.kode_unik_full || item.kode_unik || '').toLowerCase();
        return sub.includes(kw) || keg.includes(kw) || bid.includes(kw) || kode.includes(kw);
    });

    renderDaftarKegiatanRancanganManual(filtered);
}

function renderDaftarKegiatanRancanganManual(filteredItems) {
    const container = document.getElementById('modal-container-rancangan');
    if (!container) return;

    if (filteredItems.length === 0) {
        container.innerHTML = '<div class="text-center py-12 text-slate-400 font-medium">📭 Tidak ada kegiatan yang cocok dengan filter</div>';
        return;
    }

    let html = `
        <table class="w-full text-xs border-collapse border border-slate-200">
            <thead>
                <tr class="bg-slate-100 font-bold border-b border-slate-200 text-slate-700">
                    <th class="px-2 py-2 text-center w-10 border border-slate-200">
                        <input type="checkbox" onchange="toggleAllKegiatanRancanganManual(this)" id="modal-checkbox-all" class="rounded border-slate-300">
                    </th>
                    <th class="px-2 py-2 text-center w-10 border border-slate-200">No</th>
                    <th class="px-3 py-2 text-left border border-slate-200">Nama Kegiatan / Sub Kegiatan</th>
                    <th class="px-3 py-2 text-left border border-slate-200">Sub Bidang</th>
                    <th class="px-3 py-2 text-right border border-slate-200">Pagu Biaya (Rp)</th>
                    <th class="px-3 py-2 text-center w-24 border border-slate-200">Aksi</th>
                </tr>
            </thead>
            <tbody>
    `;

    filteredItems.forEach((item, displayIdx) => {
        const rawIndex = modalKegiatanRancanganList.indexOf(item);
        const isChecked = modalSelectedIndices.has(rawIndex);
        const biaya = parseFloat(item.prakiraan_biaya || 0);

        const kodeItem = String(item.kode_unik_full || item.kode_unik || '').trim();
        const isAlreadyInPrioritas = activeData.some(p => {
            const k = String(p.kode_unik_full || p.kode_unik || '').trim();
            if (kodeItem && k) return k === kodeItem;
            return (p.nama_kegiatan || '').toLowerCase() === (item.sub_kegiatan || item.nama_kegiatan || '').toLowerCase();
        });

        html += `
            <tr class="border-b border-slate-200 hover:bg-amber-50/50 transition ${isAlreadyInPrioritas ? 'bg-amber-50/30' : ''}">
                <td class="px-2 py-2 text-center border border-slate-200">
                    <input type="checkbox" 
                           onchange="toggleKegiatanRancanganManual(${rawIndex})" 
                           id="modal-chk-${rawIndex}"
                           class="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                           ${isChecked ? 'checked' : ''}>
                </td>
                <td class="px-2 py-2 text-center border border-slate-200 font-bold text-slate-500">${displayIdx + 1}</td>
                <td class="px-3 py-2 border border-slate-200 font-semibold text-slate-800">
                    <div>${esc(item.sub_kegiatan || item.nama_kegiatan || '-')}</div>
                    <div class="text-[10px] text-slate-400 font-mono font-normal">${esc(kodeItem)}</div>
                </td>
                <td class="px-3 py-2 border border-slate-200 text-slate-600">${esc(item.jenis_bidang || item.sub_bidang || '-')}</td>
                <td class="px-3 py-2 text-right border border-slate-200 font-mono font-bold text-emerald-700">Rp ${biaya.toLocaleString('id-ID')}</td>
                <td class="px-3 py-2 text-center border border-slate-200">
                    ${isAlreadyInPrioritas 
                        ? `<span class="px-2 py-1 bg-amber-100 text-amber-800 font-bold text-[10px] rounded border border-amber-200">📌 Sudah Ada</span>`
                        : `<button type="button" onclick="tarikSatuKegiatanRancangan(${rawIndex})" class="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded transition shadow">
                            <i class="fas fa-plus"></i> Tarik
                           </button>`
                    }
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

function toggleAllKegiatanRancanganManual(chkAll) {
    modalKegiatanRancanganList.forEach((_, idx) => {
        if (chkAll.checked) modalSelectedIndices.add(idx);
        else modalSelectedIndices.delete(idx);
    });
    updateModalSelectedCount();
    filterKegiatanRancanganManual();
}

function toggleKegiatanRancanganManual(rawIdx) {
    if (modalSelectedIndices.has(rawIdx)) {
        modalSelectedIndices.delete(rawIdx);
    } else {
        modalSelectedIndices.add(rawIdx);
    }
    updateModalSelectedCount();
}

function updateModalSelectedCount() {
    const el = document.getElementById('modal-selected-count');
    if (el) el.innerText = modalSelectedIndices.size;
}

async function tarikSatuKegiatanRancangan(rawIdx) {
    const item = modalKegiatanRancanganList[rawIdx];
    if (!item) return;

    const kodeItem = String(item.kode_unik_full || item.kode_unik || '').trim();
    if (kodeItem && activeData.some(p => String(p.kode_unik_full || p.kode_unik || '').trim() === kodeItem)) {
        alert(`⚠️ Kegiatan dengan Kode Unik "${kodeItem}" sudah ada dalam daftar Prioritas.`);
        return;
    }

    activeData.push({
        id: 'temp_' + Date.now(),
        _src: 'rancangan',
        tahun: parseInt(document.getElementById('select-year')?.value || '2027', 10),
        bidang_kode: item.bidang_kode || item.bidang || '',
        kode_bidang: item.kode_bidang || '',
        kode_sub: item.kode_sub || '',
        kode_kegiatan: item.kode_kegiatan || '',
        kode_unik_full: kodeItem,
        kode_unik: kodeItem,
        jenis_bidang: item.jenis_bidang || item.sub_bidang || item.bidang || '-',
        jenis_kegiatan: item.jenis_kegiatan || item.nama_kegiatan || item.sub_kegiatan || '-',
        nama_kegiatan: item.nama_kegiatan || item.sub_kegiatan || '',
        lokasi: item.lokasi_kegiatan || item.lokasi || 'Desa Batetangnga',
        volume: item.volume_kegiatan || item.volume_satuan || '12 Bulan',
        skor_kewenangan: parseInt(item.skor_kewenangan ?? 100, 10) || 100,
        skor_sdgs: parseInt(item.skor_sdgs ?? 100, 10) || 100,
        skor_kabupaten: parseInt(item.skor_kabupaten ?? 100, 10) || 100,
        skor_sumber_daya: parseInt(item.skor_sumber_daya ?? 100, 10) || 100,
        total_skor: (parseInt(item.skor_kewenangan ?? 100, 10) || 100) + (parseInt(item.skor_sdgs ?? 100, 10) || 100) + (parseInt(item.skor_kabupaten ?? 100, 10) || 100) + (parseInt(item.skor_sumber_daya ?? 100, 10) || 100),
        ranking: hitungRankingRkpdes((parseInt(item.skor_kewenangan ?? 100, 10) || 100) + (parseInt(item.skor_sdgs ?? 100, 10) || 100) + (parseInt(item.skor_kabupaten ?? 100, 10) || 100) + (parseInt(item.skor_sumber_daya ?? 100, 10) || 100))
    });

    sortAndRenderData();
    await simpanSemuaSkor();
    filterKegiatanRancanganManual();
}

async function tarikKegiatanTerpilihRancangan() {
    if (modalSelectedIndices.size === 0) {
        alert("Pilih setidaknya 1 kegiatan untuk ditarik.");
        return;
    }

    let addedCount = 0;
    const yearVal = parseInt(document.getElementById('select-year')?.value || '2027', 10);

    modalSelectedIndices.forEach(idx => {
        const item = modalKegiatanRancanganList[idx];
        if (!item) return;

        const kodeItem = String(item.kode_unik_full || item.kode_unik || '').trim();
        const isExists = activeData.some(p => {
            const k = String(p.kode_unik_full || p.kode_unik || '').trim();
            if (kodeItem && k) return k === kodeItem;
            return (p.nama_kegiatan || '').toLowerCase() === (item.sub_kegiatan || item.nama_kegiatan || '').toLowerCase();
        });

        if (!isExists) {
            const sk1 = parseInt(item.skor_kewenangan ?? 100, 10) || 100;
            const sk2 = parseInt(item.skor_sdgs ?? 100, 10) || 100;
            const sk3 = parseInt(item.skor_kabupaten ?? 100, 10) || 100;
            const sk4 = parseInt(item.skor_sumber_daya ?? 100, 10) || 100;
            const tot = sk1 + sk2 + sk3 + sk4;
            activeData.push({
                id: 'temp_' + Date.now() + '_' + idx,
                _src: 'rancangan',
                tahun: yearVal,
                bidang_kode: item.bidang_kode || item.bidang || '',
                kode_bidang: item.kode_bidang || '',
                kode_sub: item.kode_sub || '',
                kode_kegiatan: item.kode_kegiatan || '',
                kode_unik_full: kodeItem,
                kode_unik: kodeItem,
                jenis_bidang: item.jenis_bidang || item.sub_bidang || item.bidang || '-',
                jenis_kegiatan: item.jenis_kegiatan || item.nama_kegiatan || item.sub_kegiatan || '-',
                nama_kegiatan: item.nama_kegiatan || item.sub_kegiatan || '',
                lokasi: item.lokasi_kegiatan || item.lokasi || 'Desa Batetangnga',
                volume: item.volume_kegiatan || item.volume_satuan || '12 Bulan',
                skor_kewenangan: sk1,
                skor_sdgs: sk2,
                skor_kabupaten: sk3,
                skor_sumber_daya: sk4,
                total_skor: tot,
                ranking: hitungRankingRkpdes(tot)
            });
            addedCount++;
        }
    });

    if (addedCount > 0) {
        sortAndRenderData();
        await simpanSemuaSkor();
        alert(`✅ Berhasil menambahkan ${addedCount} kegiatan dari Rancangan RKPDes.`);
    } else {
        alert("⚠️ Seluruh kegiatan yang dipilih sudah ada dalam daftar Prioritas.");
    }

    closeModalTarikManualRancangan();
}

function hapusItemData(index) {
    const item = activeData[index];
    if (!item) return;
    if (!confirm("Apakah Anda yakin ingin menghapus kegiatan ini?")) return;

    (async () => {
        if (item.id && !String(item.id).startsWith('temp')) {
            try {
                let res = await fetch(`/api/prioritas-rkpdes?id=${item.id}`, { method: 'DELETE' });
                const json = await res.json();
                if (!json.success) console.warn('Gagal hapus:', json.error || json.message);
            } catch (e) {
                console.warn('Error hapus otomatis:', e.message);
            }
        }
        activeData.splice(index, 1);
        sortAndRenderData();
    })();
}

function formatTanggalIndonesia(tanggalStr) {
    if (!tanggalStr) return '....................';
    const parts = tanggalStr.split('-');
    if (parts.length !== 3) return tanggalStr;
    const tahun = parts[0];
    const bulanAngka = parseInt(parts[1], 10);
    const hari = parseInt(parts[2], 10);
    const namaBulan = [
        '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const bulanStr = namaBulan[bulanAngka] || '';
    if (!bulanStr) return tanggalStr;
    return `${hari} ${bulanStr} ${tahun}`;
}

function renderFooterTanggal() {
    const inputTgl = document.getElementById('tgl-cetak');
    const lblTgl = document.getElementById('lbl-tgl-cetak');
    if (lblTgl) {
        const nilaiTanggal = inputTgl ? inputTgl.value : '';
        const tanggalFormatted = formatTanggalIndonesia(nilaiTanggal);
        lblTgl.textContent = `Batetangnga, ${tanggalFormatted}`;
    }
}

async function tetapkanRkpdes() {
    const tahun = document.getElementById('select-year')?.value || '2027';
    let rancanganAll = [];
    try {
        const res = await fetch(`/api/rancangan-rkpdes?tahun=${tahun}`);
        const json = await res.json();
        rancanganAll = json.data || [];
    } catch (e) {
        console.error(e);
        alert('❌ Terjadi kesalahan saat mengambil data seluruh bidang.');
        return;
    }

    const itemsPayload = rancanganAll
        .filter(row => row && (row.jenis_kegiatan || row.nama_kegiatan || row.sub_kegiatan))
        .map((row) => ({
            kode_bidang: row.kode_bidang || '',
            kode_sub: row.kode_sub || '',
            kode_kegiatan: row.kode_kegiatan || '',
            kode_unik_full: row.kode_unik_full || row.kode_unik || '',
            kode_unik: row.kode_unik || row.kode_unik_full || '',
            bidang: String(row.bidang || '1'),
            bidang_kode: String(row.kode_bidang || row.bidang || '1'),
            jenis_bidang: row.jenis_bidang || row.jenis_bidang_ket || '',
            jenis_kegiatan: row.jenis_kegiatan || '',
            nama_kegiatan: row.nama_kegiatan || row.sub_kegiatan || '',
            sub_kegiatan: row.sub_kegiatan || '',
            mendukung_sdgs: row.mendukung_sdgs || row.sdgs || '',
            data_eksisting: row.data_existing || row.data_eksisting || '',
            lokasi: row.lokasi_kegiatan || row.lokasi || 'Desa Batetangnga',
            volume: row.volume_kegiatan || row.volume_satuan || row.volume || '',
            volume_satuan: row.volume_satuan || row.volume_satuan || '',
            penerima_manfaat: row.total_manfaat ? `${row.total_manfaat} Orang` : (row.penerima_manfaat_bg || ''),
            waktu_pelaksanaan: row.waktu_pelaksanaan || '12 Bulan',
            prakiraan_biaya: row.total_biaya || row.prakiraan_biaya || row.pagu_rpjm || row.jumlah_biaya || 0,
            sumber_pembiayaan: row.sumber_pembiayaan || row.sumber_dana || 'DDS / ADD',
            skor_kewenangan: skorHeader(row, 'visi_misi', 'skor_kewenangan'),
            skor_sdgs: skorHeader(row, 'pokok_bpd', 'skor_sdgs'),
            skor_kabupaten: skorHeader(row, 'program_masyarakat', 'skor_kabupaten'),
            skor_sumber_daya: skorHeader(row, 'prioritas_sdgs_skor', 'skor_sumber_daya'),
            total_skor: (skorHeader(row, 'visi_misi', 'skor_kewenangan')
                + skorHeader(row, 'pokok_bpd', 'skor_sdgs')
                + skorHeader(row, 'program_masyarakat', 'skor_kabupaten')
                + skorHeader(row, 'prioritas_sdgs_skor', 'skor_sumber_daya'))
        }));

    if (itemsPayload.length === 0) {
        alert('❌ Tidak ada data prioritas untuk ditetapkan ke DU-RKP.');
        return;
    }
    if (!confirm(`Apakah Anda yakin ingin menetapkan ${itemsPayload.length} usulan Prioritas Tahun ${tahun} menjadi DU-RKP?\nSEMUA bidang akan ikut terkirim (Bidang 1 s.d. 5). Data DU-RKP tahun ${tahun} yang lama akan diganti.`)) {
        return;
    }

    try {
        const res = await fetch('/api/du-rkpdes/tetapkan-prioritas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tahun: tahun,
                items: itemsPayload
            })
        });
        const json = await res.json();
        if (json.success) {
            alert('✅ ' + (json.message || 'Berhasil menetapkan SEMUA bidang ke DU-RKP. Silakan cek di menu DU-RKP.'));
            window.location.href = 'du-rkpdes.html';
        } else {
            alert('❌ Gagal: ' + (json.error || json.message));
        }
    } catch (err) {
        console.error(err);
        alert('❌ Terjadi kesalahan jaringan.');
    }
}

function cetakPrioritas(skoringKosong = false) {
    // Pastikan seluruh baris telah dirender lengkap (sinkron) sebelum dialog cetak terbuka, mode print tanpa form input berat
    renderTabelPrioritas(activeData, true, true);

    if (skoringKosong) {
        document.body.classList.add('print-skoring-kosong');
    } else {
        document.body.classList.remove('print-skoring-kosong');
    }

    const cleanup = () => {
        document.body.classList.remove('print-skoring-kosong');
        window.removeEventListener('afterprint', cleanup);
        // Kembalikan ke tampilan terpaginasi normal setelah selesai cetak
        renderTabelPrioritas(activeData, false, false);
    };
    window.addEventListener('afterprint', cleanup);

    window.print();

    setTimeout(cleanup, 1000);
}

// Global Exports
window.loadPrioritasData = loadPrioritasData;
window.loadData = loadData;
window.goToPrioritasPage = goToPrioritasPage;
window.setPrioritasShowAll = setPrioritasShowAll;
window.updateSkorLive = updateSkorLive;
window.hapusItemData = hapusItemData;
window.renderFooterTanggal = renderFooterTanggal;
window.tetapkanRkpdes = tetapkanRkpdes;
window.tarikDariRancanganRKPDes = tarikDariRancanganRKPDes;
window.openModalTarikManualRancangan = openModalTarikManualRancangan;
window.closeModalTarikManualRancangan = closeModalTarikManualRancangan;
window.loadKegiatanRancanganManual = loadKegiatanRancanganManual;
window.filterKegiatanRancanganManual = filterKegiatanRancanganManual;
window.toggleAllKegiatanRancanganManual = toggleAllKegiatanRancanganManual;
window.toggleKegiatanRancanganManual = toggleKegiatanRancanganManual;
window.tarikSatuKegiatanRancangan = tarikSatuKegiatanRancangan;
window.tarikKegiatanTerpilihRancangan = tarikKegiatanTerpilihRancangan;
window.filterPrioritasTable = filterPrioritasTable;
window.clearSearchPrioritas = clearSearchPrioritas;
window.cetakPrioritas = cetakPrioritas;

document.addEventListener('DOMContentLoaded', () => {
    loadPrioritasData();
    renderFooterTanggal();
    
    const inputTgl = document.getElementById('tgl-cetak');
    if (inputTgl) {
        inputTgl.addEventListener('change', renderFooterTanggal);
    }
});