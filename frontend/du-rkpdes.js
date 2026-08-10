// ==========================================
// DAFTAR USULAN RKP DESA (DU-RKP DESA) JS
// Overhauled Frontend Controller Logic
// ==========================================

let duRkpdesList = [];
let activeYear = Number(localStorage.getItem('ACTIVE_TAHUN_ANGGARAN')) || 2027;

window.addEventListener('tahunChanged', (e) => {
    if (e && e.detail && e.detail.tahun) {
        activeYear = Number(e.detail.tahun) || 2027;
        loadDuRkpdesData();
    }
});

function switchTab(tab) {
    window.location.href = tab + '.html';
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

function sortDurkpdesHierarchy(list) {
    if (!Array.isArray(list)) return [];
    return [...list].sort((a, b) => {
        const kA = a.kode_unik_full || a.kode_unik || '';
        const kB = b.kode_unik_full || b.kode_unik || '';
        return compareKodeUnikFull(kA, kB);
    });
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

let autoSyncTahun = null;

async function loadDuRkpdesData() {
    console.log("🚀 START loading data...");
    const selectYear = document.getElementById('select-year');
    activeYear = selectYear ? parseInt(selectYear.value, 10) : 2027;
    console.log(`📅 Selected year: ${activeYear}`);
    
    const tbody = document.getElementById('tabel-durkpdes-body');
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="12" class="text-center py-4 text-slate-500 font-medium">⏳ Memuat data tahun ${activeYear}...</td></tr>`;
    
    const tahunHeader = document.getElementById('tahun-header');
    if (tahunHeader) tahunHeader.textContent = `TAHUN ANGGARAN ${activeYear}`;

    try {
        const response = await fetch(`/api/du-rkpdes?tahun=${activeYear}`);
        console.log(`📡 Response status: ${response.status}`);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        console.log(`📊 Data received: ${data.data?.length || 0} records for tahun ${activeYear}`);
        
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            duRkpdesList = sortDurkpdesHierarchy(data.data);
            return renderTable();
        }

        // Tahun belum punya data di tabel du_rkpdes.
        // Jika belum pernah di-sync utk tahun ini, tarik OTOMATIS dari rancangan_rkpdes.
        if (autoSyncTahun !== activeYear) {
            autoSyncTahun = activeYear;
            await tarikDariRancanganRKPDes({ silent: true });
            return loadDuRkpdesData(); // baca ulang hasil sync
        }

        // Sync sudah pernah dicoba (0 baris) -> tampilkan placeholder jelas
        duRkpdesList = [];
        currentPage = 1;
        renderTable();
        
    } catch (error) {
        console.error('❌ Error:', error);
        tbody.innerHTML = `<tr><td colspan="12" class="text-center py-4 text-red-500 font-semibold">
            ❌ Gagal memuat data tahun ${activeYear}: ${error.message}
        </td></tr>`;
    }
}

function loadDataDuRkp() {
    loadDuRkpdesData();
}

let currentPage = 1;
const itemsPerPage = 20;
let showAllPages = false;
let deletedStack = [];
let dirtyFlag = false;

function undoLastDelete() {
    if (deletedStack.length === 0) {
        showToast("Tidak ada baris yang bisa dikembalikan (Sudah tidak tersedia).", "error");
        return;
    }
    const entry = deletedStack.pop();
    const atIndex = Math.min(entry.index, duRkpdesList.length);
    duRkpdesList.splice(atIndex, 0, entry.row);
    renderTable();
    showToast(`Baris "${entry.row.jenis_kegiatan || 'tanpa nama'}" berhasil dikembalikan.`, "success");
    scheduleAutoSave();
}
window.undoLastDelete = undoLastDelete;

function tampilkanSemua() {
    showAllPages = true;
    renderTable();
    showToast("Menampilkan SEMUA baris (pagination dinonaktifkan)", "success");
}
window.tampilkanSemua = tampilkanSemua;

function tampilkanPerHalaman() {
    showAllPages = false;
    currentPage = 1;
    renderTable();
    showToast("Pagination diaktifkan kembali", "success");
}
window.tampilkanPerHalaman = tampilkanPerHalaman;

// Daftar aksi yang tersedia di kolom Aksi + penjelasan untuk legend
const AKSI_INFO = {
    undo: { icon: 'fa-undo', label: 'Undo Hapus', desc: 'Mengembalikan baris yang baris tadi dihapus (hanya aktif selama belum disimpan ke server).' },
    save: { icon: 'fa-save', label: 'Simpan', desc: 'Menyimpan perubahan ke database (settahun terpilih).' },
    print: { icon: 'fa-print', label: 'Cetak PDF', desc: 'Membuka dialog cetak dokumen resmi DU-RKP.' },
    add: { icon: 'fa-plus', label: 'Tambah Data', desc: 'Menambah satu baris usulan kosong.' },
    delete: { icon: 'fa-trash-alt', label: 'Hapus Baris', desc: 'Hapus baris ini dari daftar. Masih bisa undo selama belum disimpan.' },
    sdgs: { icon: 'fa-globe', label: 'Mendukung SDGs', desc: 'Nomor tujuan SDGs Desa yang didukung oleh usaha ini (ditampilkan/read-only).' }
};

// Membangun markup <tbody> dari baris yang dikelompokkan per Bidang.
// Kolom standar DU-RKP Desa (12 kolom): No | Bidang | Nama Kegiatan | SDGs | Data Eksisting | Lokasi | Volume | Penerima Manfaat | Waktu | Prakiraan Biaya | Sumber | Aksi
function buildGroupedHtml(pageData, start) {
    let html = '';
    let nomorUrut = 1;
    let lastBidang = '';
    let lastJenisBidang = '';
    let lastJenisKegiatan = '';

    pageData.forEach((row, index) => {
        const actualIdx = start + index;
        const biaya = parseFloat(row.prakiraan_biaya || row.pagu_rpjm || row.biaya || 0);
        const bidang        = String(row.bidang || '').trim();
        const jenisBidang   = String(row.jenis_bidang || '').trim();
        const jenisKegiatan = String(row.jenis_kegiatan || '').trim();
        // Kolom "Nama Kegiatan" di detail row: MURNI nama_kegiatan dari Supabase
        const namaKeg = String(row.nama_kegiatan || '').trim();

        // ── LEVEL 1: BIDANG ─────────────────────────────────────────
        // Baris pembungkus utama, latar indigo gelap, teks putih uppercase
        if (bidang !== lastBidang) {
            lastBidang = bidang;
            lastJenisBidang = '';
            lastJenisKegiatan = '';
            nomorUrut = 1;
            html += `
                <tr class="header-bidang">
                    <td colspan="12" class="border border-indigo-900">
                        <i class="fas fa-layer-group"></i>&nbsp;${escapeHtml(bidang)}
                    </td>
                </tr>`;
        }

        // ── LEVEL 2: JENIS BIDANG ────────────────────────────────────
        // Sub-header italic biru muda, border kiri ungu
        // Nomor urut diRESET ke 1 setiap masuk sub-bidang baru
        if (jenisBidang && jenisBidang !== lastJenisBidang) {
            lastJenisBidang = jenisBidang;
            lastJenisKegiatan = '';
            nomorUrut = 1;
            html += `
                <tr class="header-jenis-bidang">
                    <td colspan="12" class="border border-indigo-200">
                        &#9658;&nbsp;${escapeHtml(jenisBidang)}
                    </td>
                </tr>`;
        }

        // ── LEVEL 3: JENIS KEGIATAN ──────────────────────────────────
        // Sub-sub-header abu-abu, border kiri slate, indent lebih dalam
        if (jenisKegiatan && jenisKegiatan !== lastJenisKegiatan) {
            lastJenisKegiatan = jenisKegiatan;
            html += `
                <tr class="header-jenis-kegiatan">
                    <td colspan="12" class="border border-slate-200">
                        &#9670;&nbsp;${escapeHtml(jenisKegiatan)}
                    </td>
                </tr>`;
        }

        // ── BARIS DETAIL — format standar 12 kolom DU-RKP Desa ───────
html += `
                <tr class="row-detail border border-slate-300" data-idx="${actualIdx}">
                    <td class="border border-slate-300 text-center font-bold py-1 px-1 text-xs">${nomorUrut++}</td>
                    <td class="border border-slate-300 px-2 py-1 text-slate-800 text-xs">${escapeHtml(jenisBidang || '-')}</td>
                    <td class="border border-slate-300 px-2 py-1 text-xs text-slate-900 font-semibold">
                        <div class="flex items-center justify-between gap-1">
                            <span>${escapeHtml(namaKeg)}</span>
                            ${(row.kode_unik_full || row.kode_unik) ? `<span class="shrink-0 text-[10px] font-mono font-semibold px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded border border-indigo-200" title="Kode Unik">${escapeHtml(row.kode_unik_full || row.kode_unik)}</span>` : ''}
                        </div>
                    </td>
                    <td class="border border-slate-300 p-1 text-center">
                        <input type="text" class="input-field text-center text-xs" value="${escapeHtml(row.mendukung_sdgs || '-')}" oninput="updateRow(${actualIdx}, 'mendukung_sdgs', this.value)" placeholder="-" />
                    </td>
                    <td class="border border-slate-300 p-1">
                        <input type="text" class="input-field" value="${escapeHtml(row.data_eksisting || '')}" oninput="updateRow(${actualIdx}, 'data_eksisting', this.value)" placeholder="Kondisi existing..." />
                    </td>
                    <td class="border border-slate-300 p-1">
                        <input type="text" class="input-field" value="${escapeHtml(row.lokasi || '')}" oninput="updateRow(${actualIdx}, 'lokasi', this.value)" placeholder="Lokasi..." />
                    </td>
                    <td class="border border-slate-300 p-1">
                        <input type="text" class="input-field text-center" value="${escapeHtml(row.volume || '')}" oninput="updateRow(${actualIdx}, 'volume', this.value)" placeholder="Vol..." />
                    </td>
                    <td class="border border-slate-300 p-1">
                        <input type="text" class="input-field" value="${escapeHtml(row.penerima_manfaat || '')}" oninput="updateRow(${actualIdx}, 'penerima_manfaat', this.value)" placeholder="Manfaat..." />
                    </td>
                    <td class="border border-slate-300 p-1">
                        <input type="text" class="input-field text-center" value="${escapeHtml(row.waktu_pelaksanaan || '')}" oninput="updateRow(${actualIdx}, 'waktu_pelaksanaan', this.value)" placeholder="Waktu..." />
                    </td>
                    <td class="border border-slate-300 p-1">
                        <input type="number" class="input-field text-right font-semibold" value="${biaya}" oninput="updateRow(${actualIdx}, 'prakiraan_biaya', this.value)" placeholder="0" />
                    </td>
                    <td class="border border-slate-300 p-1">
                        <input type="text" class="input-field text-center" value="${escapeHtml(row.sumber_pembiayaan || '')}" oninput="updateRow(${actualIdx}, 'sumber_pembiayaan', this.value)" placeholder="Sumber..." />
                    </td>
                    <td class="border border-slate-300 text-center p-1 no-print aksi-cell" title="${AKSI_INFO.delete.label}: ${AKSI_INFO.delete.desc}">
                        <button type="button" class="btn-danger text-xs" onclick="deleteRow(${actualIdx})" title="${AKSI_INFO.delete.desc}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>`;
    });

    return html;
}

function renderTable() {
    const tbody = document.getElementById('tabel-durkpdes-body');
    const paginationContainer = document.getElementById('pagination-container');
    if (!tbody) return;
    
    let filteredDataList = duRkpdesList;
    if (duMainSearchKeyword) {
        filteredDataList = duRkpdesList.filter(item => {
            const nama = String(item.nama_kegiatan || item.sub_kegiatan || item.jenis_kegiatan || '').toLowerCase();
            const bid = String(item.bidang || item.jenis_bidang || '').toLowerCase();
            const lok = String(item.lokasi || item.lokasi_kegiatan || '').toLowerCase();
            const kode = String(item.kode_unik_full || item.kode_unik || '').toLowerCase();
            return nama.includes(duMainSearchKeyword) || bid.includes(duMainSearchKeyword) || lok.includes(duMainSearchKeyword) || kode.includes(duMainSearchKeyword);
        });
    }

    const badgeTotal = document.getElementById('badge-total-usulan-du');
    if (badgeTotal) badgeTotal.textContent = `Total: ${filteredDataList.length} Usulan`;

    if (!filteredDataList || filteredDataList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="text-center py-8 text-slate-400 font-medium">📭 Tidak ada data usulan DU-RKPDes yang cocok</td></tr>`;
        if (paginationContainer) paginationContainer.innerHTML = '';
        updateTotal();
        return;
    }

    const totalPages = showAllPages ? 1 : (Math.ceil(filteredDataList.length / itemsPerPage) || 1);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = showAllPages ? 0 : ((currentPage - 1) * itemsPerPage);
    const end = showAllPages ? filteredDataList.length : (start + itemsPerPage);
    const pageData = filteredDataList.slice(start, end);
    
    let html = buildGroupedHtml(pageData, start);

    if (paginationContainer) {
        paginationContainer.innerHTML = `
            <div class="flex flex-wrap justify-between items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600 mt-3 no-print">
                <span>Menampilkan ${showAllPages ? `SEMUA (${duRkpdesList.length})` : `${start + 1}-${Math.min(end, duRkpdesList.length)}`} dari ${duRkpdesList.length} data</span>
                <div class="flex items-center gap-2">
                    ${showAllPages
                        ? `<button type="button" onclick="tampilkanPerHalaman()" class="px-3 py-1.5 rounded border border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 transition font-bold">📄 Tampilkan per Halaman (${itemsPerPage})</button>`
                        : `<button type="button" onclick="tampilkanSemua()" class="px-3 py-1.5 rounded border border-amber-500 bg-amber-500 text-white hover:bg-amber-600 transition font-bold">📃 Tampilkan Semua</button>`}
                </div>
            </div>
        `;
    }
    
    tbody.innerHTML = html;
    updateTotal();
}

function changePage(delta) {
    const totalPages = Math.ceil(duRkpdesList.length / itemsPerPage) || 1;
    const newPage = currentPage + delta;
    if (newPage < 1 || newPage > totalPages) return;
    currentPage = newPage;
    renderTable();
}

function renderTabelDuRkp() {
    renderTable();
}

function updateRow(idx, key, value) {
    if (!duRkpdesList[idx]) return;
    if (key === 'prakiraan_biaya') {
        duRkpdesList[idx]['prakiraan_biaya'] = parseNumber(value);
        duRkpdesList[idx]['pagu_rpjm'] = parseNumber(value);
        updateTotal();
    } else {
        duRkpdesList[idx][key] = value;
    }
    scheduleAutoSave();
}

function updateTotal() {
    const total = duRkpdesList.reduce((sum, item) => {
        return sum + (parseNumber(item.prakiraan_biaya || item.pagu_rpjm || item.biaya) || 0);
    }, 0);
    
    const formatted = formatRupiah(total);
    const elTotal = document.getElementById('total-biaya');
    if (elTotal) elTotal.textContent = formatted;

    const elTotalPagu = document.getElementById('total-prakiraan-biaya');
    if (elTotalPagu) {
        const elSpan = elTotalPagu.querySelector('span');
        if (elSpan) elSpan.textContent = formatted;
        else elTotalPagu.textContent = formatted;
    }
    console.log("💰 Total biaya:", formatted);
}

function hitunTotalBiaya() {
    updateTotal();
}

function tambahBaris() {
    duRkpdesList.push({
        bidang: 'Bidang Penyelenggaraan Pemerintahan Desa',
jenis_kegiatan: '',
        mendukung_sdgs: '',
        data_eksisting: '',
        lokasi: 'Desa Batetangnga',
        volume: '',
        penerima_manfaat: 'Masyarakat Desa',
        waktu_pelaksanaan: '12 Bulan',
        prakiraan_biaya: 0,
        sumber_pembiayaan: 'DDS'
    });
    renderTable();
    showToast("Baris baru berhasil ditambahkan!", "success");
    scheduleAutoSave();
}

function hapusBaris(idx) {
    deleteRow(idx);
}

function deleteRow(idx) {
    if (confirm("Apakah Anda yakin ingin menghapus baris usulan ini?")) {
        const row = { ...duRkpdesList[idx] };
        deletedStack.push({ row, index: idx });
        duRkpdesList.splice(idx, 1);
        renderTable();
        updateUndoButton();
        showToast(`Baris "${row.jenis_kegiatan || 'tanpa nama'}" dihapus. Tekan Undo untuk mengembalikan.`, "success");
        scheduleAutoSave();
    }
}

function updateUndoButton() {
    const btn = document.getElementById('btn-undo-delete');
    if (btn) {
        btn.style.display = deletedStack.length > 0 ? '' : 'none';
        btn.title = deletedStack.length > 0 ? `Undo (${deletedStack.length} baris belum tersimpan)` : 'Tidak ada baris yang dapat di-undo';
    }
}

function editRow(idx) {
    showToast(`Mengubah baris usulan #${idx + 1}`, 'success');
}

let autoSaveTimer = null;

function scheduleAutoSave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        autoSaveTimer = null;
        simpanData({ silent: true, reload: false });
    }, 800);
}

async function simpanData(opts = {}) {
    const { silent = false, reload = true } = opts || {};
    try {
        const res = await fetch('/api/du-rkpdes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tahun: activeYear,
                data: duRkpdesList
            })
        });

        const json = await res.json();
        if (json.success) {
            deletedStack = [];
            updateUndoButton();
            if (!silent) showToast("✅ " + json.message, "success");
            if (reload) loadDuRkpdesData();
        } else {
            if (!silent) showToast("❌ Gagal menyimpan: " + json.message, "error");
        }
    } catch (err) {
        console.error("Error simpan DU-RKP Desa:", err);
        if (!silent) showToast("❌ Error simpan: " + err.message, "error");
    }
}

let duMainSearchKeyword = '';

function filterDuRkpdesTable() {
    const input = document.getElementById('search-durkpdes-input');
    const clearBtn = document.getElementById('btn-clear-search-du');
    duMainSearchKeyword = (input?.value || '').toLowerCase().trim();

    if (clearBtn) {
        if (duMainSearchKeyword.length > 0) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    currentPage = 1;
    renderTable();
}

function clearSearchDuRkpdes() {
    const input = document.getElementById('search-durkpdes-input');
    if (input) input.value = '';
    filterDuRkpdesTable();
}

function toggleExtraMenuDu() {
    const dropdown = document.getElementById('extra-menu-dropdown-du');
    if (dropdown) dropdown.classList.toggle('hidden');
}

document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('extra-menu-dropdown-du');
    const toggleBtn = e.target.closest('button[onclick*="toggleExtraMenuDu"]');
    if (dropdown && !dropdown.classList.contains('hidden') && !toggleBtn && !dropdown.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});

async function tarikDariRancanganRKPDes(opts = {}) {
    const { silent = false } = opts;
    const selectYear = document.getElementById('select-year');
    const tahun = selectYear ? selectYear.value : '2027';
    console.log(`📥 Menarik data dari Rancangan RKPDes tahun ${tahun}...`);
    
    try {
        const response = await fetch('/api/du-rkpdes/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tahun: parseInt(tahun, 10) })
        });
        const data = await response.json();
        
        if (data.success) {
            if (!silent) {
                showToast(`✅ ${data.message}`, 'success');
                loadDuRkpdesData();
            }
            return;
        } else {
            showToast(`❌ Gagal menarik data: ${data.error || data.message}`, 'error');
        }
    } catch (error) {
        console.error('❌ Error tarik dari Rancangan RKPDes:', error);
        showToast('❌ Gagal menarik data dari Rancangan RKPDes', 'error');
    }
}

async function syncDataFromRPJMDes() {
    tarikDariRancanganRKPDes();
}

async function clearAndSyncDuRkpdes() {
    if (!confirm(`⚠️ Hapus seluruh data DU-RKPDes tahun ${activeYear} dan tarik ulang dari Rancangan RKPDes?`)) return;
    await tarikDariRancanganRKPDes();
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function cetakPDF() {
    const allData = [...duRkpdesList];
    const selectYearVal = document.getElementById('select-year')?.value || 2027;
    const ketuaTimVal = document.getElementById('nama-ketua-tim')?.value || 'ABDUL AZIS, S. Pd';
    const inputTglVal = document.getElementById('tgl-cetak')?.value || '';
    const formattedTglStr = formatTanggalIndonesia(inputTglVal);
    
    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>DU-RKP Desa ${selectYearVal}</title>
            <style>
                @page { size: 13in 8.5in; margin: 10mm; }
                body { font-family: 'Segoe UI', Arial, sans-serif; padding: 10px; font-size: 10px; color: #000; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 9.5px; }
                th, td { border: 1px solid #000; padding: 5px 4px; text-align: left; }
                th { background: #f1f5f9; text-align: center; font-weight: bold; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .total { font-weight: bold; background: #f1f5f9; }
                .bidang-divider td { background: #e0e7ff !important; }
                .print-bidang { background: #e0e7ff; font-weight: bold; padding: 6px 8px; }
                h1 { text-align: center; font-size: 14px; margin-bottom: 2px; font-weight: bold; }
                h2 { text-align: center; font-size: 12px; margin-top: 0; margin-bottom: 15px; font-weight: bold; }
                .meta { font-size: 10px; font-weight: bold; margin-bottom: 15px; line-height: 1.5; }
                .signatures { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; }
                .sig-box { text-align: center; width: 250px; }
            </style>
        </head>
        <body>
            <h1>DAFTAR USULAN RKP DESA (DU-RKP DESA)</h1>
            <h2>TAHUN ANGGARAN ${selectYearVal}</h2>
            <div class="meta">
                <div>DESA : BATETANGNGA</div>
                <div>KECAMATAN : BINUANG</div>
                <div>KABUPATEN : POLEWALI MANDAR</div>
                <div>PROVINSI : SULAWESI BARAT</div>
            </div>
            <table>
<thead>
                    <tr>
                        <th style="width:25px">No</th>
                        <th>Bidang</th>
                        <th>Jenis Kegiatan</th>
                        <th>SDGs</th>
                        <th>Data Eksisting</th>
                        <th>Lokasi</th>
                        <th>Volume</th>
                        <th>Penerima Manfaat</th>
                        <th>Waktu Pelaksanaan</th>
                        <th style="width:110px">Prakiraan Biaya (Rp)</th>
                        <th>Sumber Pembiayaan</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    let total = 0;
    let prevBidang = null;
    let prevJenisBidang = null;
    let prevJenisKegiatan = null;
    let nomorUrut = 1;
    allData.forEach((item, index) => {
        const biaya = parseNumber(item.prakiraan_biaya || item.pagu_rpjm || item.biaya || 0);
        total += biaya;
        const bidang = item.bidang || '';
        const jenisBidang = item.jenis_bidang || '';
        const jenisKeg = item.jenis_kegiatan || '';
        const nama = item.nama_kegiatan || '';

        const isNewBidang = bidang !== prevBidang;
        const isNewJenisBidang = isNewBidang || jenisBidang !== prevJenisBidang;
        const isNewJenisKeg = isNewJenisBidang || jenisKeg !== prevJenisKegiatan;
        
        if (isNewBidang) { nomorUrut = 1; prevBidang = bidang; }
        if (isNewJenisBidang) { prevJenisBidang = jenisBidang; nomorUrut = 1; }
        if (isNewJenisKeg) { prevJenisKegiatan = jenisKeg; }

        html += `
            ${isNewBidang ? `<tr style="background:#c7d2fe;"><td colspan="11" style="padding:7px 14px;font-weight:800;font-size:11px;letter-spacing:0.6px;text-transform:uppercase;color:#1e1b4b;">&#9632; BIDANG: ${escapeHtml(bidang)}</td></tr>` : ''}
            ${isNewJenisBidang && jenisBidang ? `<tr><td colspan="11" style="background:#e0e7ff;padding:5px 12px 5px 24px;font-weight:700;font-style:italic;font-size:10px;color:#3730a3;border-left:4px solid #6366f1;">&#9658; ${escapeHtml(jenisBidang)}</td></tr>` : ''}
            ${isNewJenisKeg && jenisKeg ? `<tr><td colspan="11" style="background:#f1f5f9;padding:4px 10px 4px 38px;font-size:9.5px;font-weight:600;color:#475569;border-left:3px solid #94a3b8;">&#9670; ${escapeHtml(jenisKeg)}</td></tr>` : ''}
            <tr>
                <td class="text-center">${nomorUrut++}</td>
                <td style="font-size:10px;color:#475569">${escapeHtml(jenisBidang || '')}</td>
                <td style="font-weight:600">${escapeHtml(nama)}</td>
                <td class="text-center">${escapeHtml(item.mendukung_sdgs || '-')}</td>
                <td>${escapeHtml(item.data_eksisting || '')}</td>
                <td>${escapeHtml(item.lokasi || '')}</td>
                <td class="text-center">${escapeHtml(item.volume || '')}</td>
                <td>${escapeHtml(item.penerima_manfaat || '')}</td>
                <td class="text-center">${escapeHtml(item.waktu_pelaksanaan || '')}</td>
                <td class="text-right font-semibold">${formatRupiah(biaya)}</td>
                <td class="text-center">${escapeHtml(item.sumber_pembiayaan || '')}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
                <tfoot>
                    <tr class="total">
                        <td colspan="9" class="text-right font-bold">JUMLAH TOTAL BIAYA (Rp)</td>
                        <td class="text-right font-bold">${formatRupiah(total)}</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
            <div class="signatures">
                <div class="sig-box">
                    <p><b>Mengetahui,</b></p>
                    <p><b>Kepala Desa Batetangnga</b></p>
                    <br><br><br>
                    <p><u><b>SUMAILA DAMANG</b></u></p>
                </div>
                <div class="sig-box">
                    <p>Batetangnga, ${formattedTglStr}</p>
                    <p><b>Disusun oleh,<br>Ketua Tim Penyusun RKPDesa</b></p>
                    <br><br>
                    <p><u><b>( ${ketuaTimVal.toUpperCase()} )</b></u></p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    const win = window.open('', '_blank');
    if (win) {
        win.document.write(html);
        win.document.close();
        win.print();
    } else {
        cetakDokumenBersih();
    }
}

// Fungsi Cetak Bersih (Mengubah input ke teks murni saat diprint agar tidak hilang)
function cetakDokumenBersih() {
    try {
        const inputCells = document.querySelectorAll('#tabel-durkpdes-body td');
        inputCells.forEach(td => {
            const input = td.querySelector('input');
            if (input) {
                let val = input.value || '';
                if (input.type === 'number') {
                    const num = parseNumber(val);
                    val = num > 0 ? formatRupiah(num) : '-';
                }
                const span = document.createElement('span');
                span.className = "print-text-replacement px-1 text-xs " + (input.classList.contains('text-right') ? 'text-right block font-mono font-semibold' : input.classList.contains('text-center') ? 'text-center block' : '');
                span.textContent = val;
                td.appendChild(span);
                input.style.display = 'none';
            }
        });

        const inputKetua = document.getElementById('nama-ketua-tim');
        if (inputKetua) {
            const valKetua = inputKetua.value || '';
            const spanKetua = document.createElement('span');
            spanKetua.className = "print-text-replacement font-bold underline text-xs";
            spanKetua.textContent = valKetua ? `( ${valKetua} )` : '( ABDUL AZIS, S. Pd )';
            inputKetua.parentNode.appendChild(spanKetua);
            inputKetua.style.display = 'none';
        }

        window.print();

        setTimeout(() => {
            document.querySelectorAll('.print-text-replacement').forEach(el => el.remove());
            document.querySelectorAll('#tabel-durkpdes-body input').forEach(input => {
                input.style.display = '';
            });
            if (inputKetua) inputKetua.style.display = '';
        }, 1000);
    } catch (ePrint) {
        console.error("Cetak error:", ePrint);
        window.print();
    }
}

// Variabel global untuk modal manual Rancangan RKPDes
let modalKegiatanRancanganList = [];
let modalSelectedRancanganIndices = new Set();

function openModalTarikManualRancangan() {
    const modal = document.getElementById('modal-tarik-rancangan');
    if (!modal) return;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    const activeTargetYear = String(document.getElementById('select-year')?.value || '2027');
    const selectSumber = document.getElementById('modal-tahun-sumber-rancangan');
    if (selectSumber && [...selectSumber.options].some(o => o.value === activeTargetYear)) {
        selectSumber.value = activeTargetYear;
    }

    modalSelectedRancanganIndices.clear();
    const searchInput = document.getElementById('modal-search-rancangan-input');
    if (searchInput) searchInput.value = '';

    updateModalTerpilihCountRancangan();
    loadKegiatanRancanganManual();
}

function closeModalTarikManualRancangan() {
    const modal = document.getElementById('modal-tarik-rancangan');
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

async function loadKegiatanRancanganManual() {
    const selectSumber = document.getElementById('modal-tahun-sumber-rancangan');
    const tahunSumber = selectSumber ? selectSumber.value : '2027';
    const container = document.getElementById('modal-container-rancangan');
    const totalEl = document.getElementById('modal-jumlah-data-rancangan');

    if (container) {
        container.innerHTML = '<div class="text-center py-12 text-slate-400 font-medium">⏳ Memuat data Rancangan RKPDes...</div>';
    }

    try {
        const response = await fetch(`/api/du-rkpdes/tarik-rancangan?tahun=${tahunSumber}`);
        const json = await response.json();

        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            modalKegiatanRancanganList = json.data;
            modalSelectedRancanganIndices.clear();
            filterKegiatanRancanganManual();
        } else {
            modalKegiatanRancanganList = [];
            modalSelectedRancanganIndices.clear();
            if (container) container.innerHTML = `<div class="text-center py-12 text-slate-400 font-medium">📭 Tidak ada kegiatan Rancangan RKPDes untuk tahun ${tahunSumber}</div>`;
            if (totalEl) totalEl.textContent = '0 kegiatan ditemukan';
            updateModalTerpilihCountRancangan();
        }
    } catch (error) {
        console.error('❌ Error load manual Rancangan RKPDes:', error);
        if (container) container.innerHTML = `<div class="text-center py-12 text-rose-500 font-semibold">❌ Gagal memuat data: ${error.message}</div>`;
    }
}

function filterKegiatanRancanganManual() {
    const searchInput = document.getElementById('modal-search-rancangan-input');
    const keyword = (searchInput?.value || '').toLowerCase().trim();

    const filtered = modalKegiatanRancanganList.filter(item => {
        if (keyword) {
            const nama = (item.nama_kegiatan || item.jenis_kegiatan || item.sub_kegiatan || '').toLowerCase();
            const bidang = (item.jenis_bidang || item.bidang || '').toLowerCase();
            const kode = (item.kode_unik_full || item.kode_unik || '').toLowerCase();
            return nama.includes(keyword) || bidang.includes(keyword) || kode.includes(keyword);
        }
        return true;
    });

    const totalEl = document.getElementById('modal-jumlah-data-rancangan');
    if (totalEl) totalEl.textContent = `${filtered.length} kegiatan`;

    renderDaftarKegiatanRancanganManual(filtered);
}

function renderDaftarKegiatanRancanganManual(filteredItems) {
    const container = document.getElementById('modal-container-rancangan');
    if (!container) return;

    if (filteredItems.length === 0) {
        container.innerHTML = '<div class="text-center py-12 text-slate-400 font-medium">📭 Tidak ada kegiatan yang cocok</div>';
        return;
    }

    let html = `
        <table class="w-full text-xs border-collapse border border-slate-200">
            <thead>
                <tr class="bg-slate-100 font-bold border-b border-slate-200 text-slate-700">
                    <th class="px-2 py-2 text-center w-10 border border-slate-200">
                        <input type="checkbox" onchange="toggleAllKegiatanRancanganManual(this)" id="modal-chk-all-rancangan" class="rounded border-slate-300">
                    </th>
                    <th class="px-2 py-2 text-center w-10 border border-slate-200">No</th>
                    <th class="px-3 py-2 text-left border border-slate-200">Nama / Sub Kegiatan</th>
                    <th class="px-3 py-2 text-left border border-slate-200">Bidang</th>
                    <th class="px-3 py-2 text-right border border-slate-200">Biaya (Rp)</th>
                    <th class="px-3 py-2 text-center w-28 border border-slate-200">Status Kode</th>
                    <th class="px-3 py-2 text-center w-24 border border-slate-200">Aksi</th>
                </tr>
            </thead>
            <tbody>
    `;

    filteredItems.forEach((item, displayIdx) => {
        const rawIndex = modalKegiatanRancanganList.indexOf(item);
        const isChecked = modalSelectedRancanganIndices.has(rawIndex);
        const biaya = parseNumber(item.prakiraan_biaya || item.pagu_rpjm || 0);

        const kodeItem = String(item.kode_unik_full || item.kode_unik || '').trim();
        const isAlreadyInDu = duRkpdesList.some(r => {
            const k = String(r.kode_unik_full || r.kode_unik || '').trim();
            if (kodeItem && k) return k === kodeItem;
            return (r.nama_kegiatan || r.sub_kegiatan || '').toLowerCase() === (item.nama_kegiatan || item.sub_kegiatan || '').toLowerCase();
        });

        html += `
            <tr class="border-b border-slate-200 hover:bg-purple-50/50 transition ${isAlreadyInDu ? 'bg-amber-50/30' : ''}">
                <td class="px-2 py-2 text-center border border-slate-200">
                    <input type="checkbox" 
                           onchange="toggleKegiatanRancanganManual(${rawIndex})" 
                           id="modal-rnc-chk-${rawIndex}"
                           class="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                           ${isChecked ? 'checked' : ''}>
                </td>
                <td class="px-2 py-2 text-center border border-slate-200 font-bold text-slate-500">${displayIdx + 1}</td>
                <td class="px-3 py-2 border border-slate-200 font-semibold text-slate-800">
                    <div>${escapeHtml(item.nama_kegiatan || item.sub_kegiatan || '-')}</div>
                    <div class="text-[10px] text-slate-400 font-mono font-normal">${escapeHtml(item.kode_unik_full || item.kode_unik || '')}</div>
                </td>
                <td class="px-3 py-2 border border-slate-200 text-slate-600">${escapeHtml(item.jenis_bidang || item.bidang || '-')}</td>
                <td class="px-3 py-2 text-right border border-slate-200 font-semibold font-mono text-indigo-700">${formatRupiah(biaya)}</td>
                <td class="px-3 py-2 text-center border border-slate-200">
                    ${isAlreadyInDu 
                        ? '<span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">📌 Sudah di DU-RKPDes</span>'
                        : '<span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">✨ Tersedia</span>'
                    }
                </td>
                <td class="px-3 py-2 text-center border border-slate-200">
                    ${isAlreadyInDu
                        ? '<button type="button" disabled class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-1 rounded cursor-not-allowed border border-amber-300 opacity-80" title="Kegiatan dengan kode unik ini sudah ada di DU-RKPDes"><i class="fas fa-check"></i> Ada</button>'
                        : `<button type="button" onclick="tarikSatuKegiatanRancangan(${rawIndex})" title="Tarik usulan ini saja" class="bg-purple-700 hover:bg-purple-800 text-white text-[10px] font-bold px-2.5 py-1 rounded transition flex items-center justify-center gap-1 mx-auto shadow-sm">
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
    updateModalTerpilihCountRancangan();
}

function toggleKegiatanRancanganManual(rawIndex) {
    const chk = document.getElementById(`modal-rnc-chk-${rawIndex}`);
    if (chk && chk.checked) {
        modalSelectedRancanganIndices.add(rawIndex);
    } else {
        modalSelectedRancanganIndices.delete(rawIndex);
    }
    updateModalTerpilihCountRancangan();
}

function toggleAllKegiatanRancanganManual(masterCheckbox) {
    const isChecked = masterCheckbox.checked;
    modalKegiatanRancanganList.forEach((_, index) => {
        const chk = document.getElementById(`modal-rnc-chk-${index}`);
        if (chk) {
            chk.checked = isChecked;
            if (isChecked) modalSelectedRancanganIndices.add(index);
            else modalSelectedRancanganIndices.delete(index);
        }
    });
    updateModalTerpilihCountRancangan();
}

function pilihSemuaRancanganManual() {
    modalKegiatanRancanganList.forEach((_, index) => {
        modalSelectedRancanganIndices.add(index);
        const chk = document.getElementById(`modal-rnc-chk-${index}`);
        if (chk) chk.checked = true;
    });
    const masterChk = document.getElementById('modal-chk-all-rancangan');
    if (masterChk) masterChk.checked = true;
    updateModalTerpilihCountRancangan();
}

function hapusPilihanRancanganManual() {
    modalSelectedRancanganIndices.clear();
    modalKegiatanRancanganList.forEach((_, index) => {
        const chk = document.getElementById(`modal-rnc-chk-${index}`);
        if (chk) chk.checked = false;
    });
    const masterChk = document.getElementById('modal-chk-all-rancangan');
    if (masterChk) masterChk.checked = false;
    updateModalTerpilihCountRancangan();
}

function updateModalTerpilihCountRancangan() {
    const count = modalSelectedRancanganIndices.size;
    const countEl = document.getElementById('modal-terpilih-count-rancangan');
    if (countEl) countEl.textContent = `${count} dipilih`;
}

function tarikSatuKegiatanRancangan(rawIndex) {
    const item = modalKegiatanRancanganList[rawIndex];
    if (!item) return;

    const targetYear = parseInt(document.getElementById('select-year')?.value || '2027', 10);
    const kodeConv = String(item.kode_unik_full || item.kode_unik || '').trim();

    const duplicate = duRkpdesList.find(r => {
        const k = String(r.kode_unik_full || r.kode_unik || '').trim();
        if (kodeConv && k) return k === kodeConv;
        return (r.nama_kegiatan || r.sub_kegiatan || '').toLowerCase() === (item.nama_kegiatan || item.sub_kegiatan || '').toLowerCase();
    });

    if (duplicate) {
        alert(`⛔ Kegiatan "${item.nama_kegiatan || item.sub_kegiatan}" dengan Kode Unik [${kodeConv || '-'}] sudah ada di DU-RKPDes tahun ${targetYear}.\n\nVerifikasi sistem: Setiap kode unik hanya dapat dimasukkan 1 kali dan tidak bisa 2 kali.`);
        return;
    }

    duRkpdesList.push({
        ...item,
        tahun: targetYear
    });

    duRkpdesList = sortDurkpdesHierarchy(duRkpdesList);
    renderTable();
    filterKegiatanRancanganManual();
    showToast(`✅ Berhasil menarik usulan "${item.nama_kegiatan || item.sub_kegiatan}" ke DU-RKPDes tahun ${targetYear}`, 'success');
}

function tarikKegiatanTerpilihRancangan() {
    if (modalSelectedRancanganIndices.size === 0) {
        alert('⚠️ Pilih minimal 1 kegiatan dari daftar Rancangan RKPDes!');
        return;
    }

    const targetYear = parseInt(document.getElementById('select-year')?.value || '2027', 10);
    const tahunSumber = document.getElementById('modal-tahun-sumber-rancangan')?.value || '2027';

    let addedCount = 0;
    let skippedCount = 0;

    modalSelectedRancanganIndices.forEach(idx => {
        const item = modalKegiatanRancanganList[idx];
        if (item) {
            const kodeConv = String(item.kode_unik_full || item.kode_unik || '').trim();

            const isDuplicate = duRkpdesList.some(r => {
                const k = String(r.kode_unik_full || r.kode_unik || '').trim();
                if (kodeConv && k) return k === kodeConv;
                return (r.nama_kegiatan || r.sub_kegiatan || '').toLowerCase() === (item.nama_kegiatan || item.sub_kegiatan || '').toLowerCase();
            });

            if (isDuplicate) {
                skippedCount++;
            } else {
                duRkpdesList.push({
                    ...item,
                    tahun: targetYear
                });
                addedCount++;
            }
        }
    });

    duRkpdesList = sortDurkpdesHierarchy(duRkpdesList);
    renderTable();
    closeModalTarikManualRancangan();

    if (addedCount > 0) {
        let msg = `✅ Berhasil menambahkan ${addedCount} usulan dari Rancangan RKPDes ${tahunSumber} ke DU-RKPDes tahun ${targetYear}.`;
        if (skippedCount > 0) {
            msg += `\n\n⛔ ${skippedCount} usulan dilewati karena kode unik sudah ada.`;
        }
        msg += `\n\n⚠️ Klik "Simpan DU-RKP" untuk menyimpan ke database.`;
        alert(msg);
    } else {
        alert(`⛔ Semua ${skippedCount} usulan yang Anda pilih sudah ada di DU-RKPDes tahun ${targetYear} (verifikasi kode unik menolak duplikasi).`);
    }
}

// Global Export untuk Kompatibilitas Seluruh Pemanggilan Fungsi & Variabel
if (typeof window !== 'undefined') {
    window.duRkpdesList = duRkpdesList;
    window.dataDuRkp = duRkpdesList;
    window.activeYear = activeYear;

    window.renderTable = renderTable;
    window.renderTabelDuRkp = renderTabelDuRkp;
    window.loadDuRkpdesData = loadDuRkpdesData;
    window.loadDataDuRkp = loadDataDuRkp;
    window.updateTotal = updateTotal;
    window.hitunTotalBiaya = hitunTotalBiaya;
    window.parseNumber = parseNumber;
    window.formatRupiah = formatRupiah;
    window.cetakDokumenBersih = cetakDokumenBersih;
    window.cetakPDF = cetakPDF;
    window.changePage = changePage;
    window.tambahBaris = tambahBaris;
    window.hapusBaris = hapusBaris;
    window.deleteRow = deleteRow;
    window.editRow = editRow;
    window.simpanData = simpanData;
    window.syncDataFromRPJMDes = syncDataFromRPJMDes;
    window.tarikDariRancanganRKPDes = tarikDariRancanganRKPDes;
    window.clearAndSyncDuRkpdes = clearAndSyncDuRkpdes;

    // Search and extra menu
    window.filterDuRkpdesTable = filterDuRkpdesTable;
    window.clearSearchDuRkpdes = clearSearchDuRkpdes;
    window.toggleExtraMenuDu = toggleExtraMenuDu;

    // Modal manual Rancangan RKPDes
    window.openModalTarikManualRancangan = openModalTarikManualRancangan;
    window.closeModalTarikManualRancangan = closeModalTarikManualRancangan;
    window.loadKegiatanRancanganManual = loadKegiatanRancanganManual;
    window.filterKegiatanRancanganManual = filterKegiatanRancanganManual;
    window.renderDaftarKegiatanRancanganManual = renderDaftarKegiatanRancanganManual;
    window.toggleKegiatanRancanganManual = toggleKegiatanRancanganManual;
    window.toggleAllKegiatanRancanganManual = toggleAllKegiatanRancanganManual;
    window.pilihSemuaRancanganManual = pilihSemuaRancanganManual;
    window.hapusPilihanRancanganManual = hapusPilihanRancanganManual;
    window.tarikSatuKegiatanRancangan = tarikSatuKegiatanRancangan;
    window.tarikKegiatanTerpilihRancangan = tarikKegiatanTerpilihRancangan;
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        loadDuRkpdesData();
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
    } catch (eInit) {
        console.error("❌ Init error in du-rkpdes.js:", eInit);
        renderTable();
    }
});
