// ============================================================
// MODUL PROGRAM & KEGIATAN YANG MASUK KE DESA (4 BIDANG WAJIB)
// ============================================================

const NAMA_BIDANG_MASUK = {
    1: "Bidang Penyelenggaraan Pemerintahan Desa",
    2: "Bidang Pembangunan Desa",
    3: "Bidang Pembinaan Kemasyarakatan",
    4: "Bidang Pemberdayaan Masyarakat"
};

let dataProgramMasuk = [];
let editingRowId = null;
let originalRowBackup = null;

// 1. Load Data Berdasarkan Tahun dari Supabase
async function loadProgramMasukData(targetYear) {
    const yearSelect = document.getElementById('select-year');
    const year = targetYear || yearSelect?.value || '2027';
    if (yearSelect && String(yearSelect.value) !== String(year)) {
        yearSelect.value = String(year);
    }
    const elHeaderTahun = document.getElementById('header-tahun');
    if (elHeaderTahun) elHeaderTahun.textContent = year;

    const tbody = document.getElementById('tabel-program-masuk-body');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="11" class="text-center py-6 text-slate-400 font-sans italic">
                <i class="fas fa-spinner fa-spin mr-2"></i> Memuat data program masuk desa tahun ${year}...
            </td>
        </tr>
    `;

    try {
        let res = await fetch(`/api/program-masuk-desa?tahun=${year}`, { cache: 'no-store' });
        const result = res.ok ? await res.json() : { success: true, data: [] };
        const rawList = Array.isArray(result) ? result : (result.data || []);
        dataProgramMasuk = rawList.map(item => ({
            id: item.id || null,
            tahun: parseInt(item.tahun || year, 10),
            bidang: parseInt(item.bidang, 10) || 1,
            sub_kegiatan: item.sub_kegiatan || item.nama_program || item.nama_kegiatan || '',
            nama_program: item.nama_program || item.sub_kegiatan || '',
            nama_kegiatan: item.nama_kegiatan || item.sub_kegiatan || '',
            instansi_pemberi: item.instansi_pemberi || item.pelaksana || '',
            pelaksana: item.pelaksana || item.instansi_pemberi || '',
            sumber_dana: item.sumber_dana || item.instansi_pemberi || '',
            mendukung_sdgs: item.mendukung_sdgs || '',
            tahun_pelaksanaan: parseInt(item.tahun_pelaksanaan || year, 10),
            lokasi: item.lokasi || '',
            volume: item.volume || '',
            satuan: item.satuan || '',
            total_pagu: parseFloat(item.total_pagu != null ? item.total_pagu : (item.anggaran || 0)) || 0,
            anggaran: parseFloat(item.anggaran != null ? item.anggaran : (item.total_pagu || 0)) || 0
        }));
    } catch (e) {
        console.warn("Gagal terhubung ke server, menggunakan memori lokal.");
        dataProgramMasuk = [];
    }

    renderTable();
}

// 2. Render Tabel 4 Bidang Wajib (Selalu Muncul Meskipun Kosong)
function renderTable() {
    const tbody = document.getElementById('tabel-program-masuk-body');
    if (!tbody) return;

    const activeYear = parseInt(document.getElementById('select-year')?.value || '2027', 10);
    let html = '';
    let grandTotalPagu = 0;

    for (let b = 1; b <= 4; b++) {
        const namaBidang = NAMA_BIDANG_MASUK[b];
        
        let itemsBidang = dataProgramMasuk.filter(item => parseInt(item.bidang, 10) === b);
        
        // JIKA KOSONG: Wajib sediakan minimal 1 baris template agar bidang tetap muncul & bisa diisi!
        if (itemsBidang.length === 0) {
            const newItem = {
                id: null,
                tahun: activeYear,
                bidang: b,
                sub_kegiatan: '',
                nama_program: '',
                nama_kegiatan: '',
                instansi_pemberi: '',
                pelaksana: '',
                sumber_dana: '',
                mendukung_sdgs: '',
                tahun_pelaksanaan: activeYear,
                lokasi: '',
                volume: '',
                satuan: '',
                total_pagu: 0,
                anggaran: 0
            };
            dataProgramMasuk.push(newItem);
            itemsBidang = [newItem];
        }

        let subTotalPagu = 0;
        let rowsHtml = '';

        itemsBidang.forEach((item, idx) => {
            const paguVal = parseFloat(item.total_pagu || item.anggaran) || 0;
            const isEditing = editingRowId && String(editingRowId) === String(item.id);
            
            subTotalPagu += paguVal;

            rowsHtml += `
                <tr data-id="${item.id || ''}" data-bidang="${b}" class="border border-slate-400 ${isEditing ? 'bg-amber-50/80 border-indigo-500 font-semibold' : 'hover:bg-slate-50'} transition">
                    <td class="border border-slate-400 text-center font-bold py-1.5">${idx + 1}</td>
                    <td class="border border-slate-400 px-2 py-1.5 font-semibold text-slate-700 w-44">
                        ${idx === 0 ? `<strong class="block text-indigo-900">${b}. ${namaBidang}</strong>` : ''}
                    </td>
                    <td class="border border-slate-400 p-1">
                        <input type="text" value="${item.sub_kegiatan || item.nama_program || item.nama_kegiatan || ''}" oninput="updateFieldData(${b}, ${idx}, 'sub_kegiatan', this.value)" placeholder="Nama Program / Kegiatan..." class="input-sub-kegiatan w-full p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs" />
                    </td>
                    <td class="border border-slate-400 p-1">
                        <input type="text" value="${item.instansi_pemberi || item.pelaksana || ''}" oninput="updateFieldData(${b}, ${idx}, 'instansi_pemberi', this.value)" placeholder="Kementerian / OPD / Prov / Kab..." class="input-instansi w-full p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs" />
                    </td>
                    <td class="border border-slate-400 p-1 text-center">
                        <input type="text" value="${item.mendukung_sdgs || ''}" oninput="updateFieldData(${b}, ${idx}, 'mendukung_sdgs', this.value)" placeholder="SDGs ke-..." class="input-sdgs w-full text-center p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs" />
                    </td>
                    <td class="border border-slate-400 p-1 text-center">
                        <input type="number" value="${item.tahun_pelaksanaan || activeYear}" oninput="updateFieldData(${b}, ${idx}, 'tahun_pelaksanaan', this.value)" placeholder="${activeYear}" class="input-tahun-pelaksanaan w-full text-center p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs font-mono" />
                    </td>
                    <td class="border border-slate-400 p-1">
                        <input type="text" value="${item.lokasi || ''}" oninput="updateFieldData(${b}, ${idx}, 'lokasi', this.value)" placeholder="Dusun / RT / RW..." class="input-lokasi w-full p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs" />
                    </td>
                    <td class="border border-slate-400 p-1 text-center">
                        <input type="text" value="${item.volume || ''}" oninput="updateFieldData(${b}, ${idx}, 'volume', this.value)" placeholder="Volume..." class="input-volume w-full text-center p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs" />
                    </td>
                    <td class="border border-slate-400 p-1 text-center">
                        <input type="text" value="${item.satuan || ''}" oninput="updateFieldData(${b}, ${idx}, 'satuan', this.value)" placeholder="Satuan..." class="input-satuan w-full text-center p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs" />
                    </td>
                    <td class="border border-slate-400 p-1 text-right">
                        <input type="number" value="${paguVal > 0 ? paguVal : ''}" oninput="updateFieldData(${b}, ${idx}, 'total_pagu', this.value)" placeholder="0" class="input-pagu w-full text-right p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs font-mono" />
                    </td>
                    <td class="border border-slate-400 text-center py-1 no-print">
                        <div class="flex justify-center items-center gap-1">
                            ${isEditing ? `
                                <button onclick="saveEditRow('${item.id}')" title="Simpan Perubahan" class="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition">💾</button>
                                <button onclick="cancelEditRow()" title="Batal Edit" class="px-2 py-0.5 bg-slate-400 hover:bg-slate-500 text-white rounded text-xs font-bold transition">❌</button>
                            ` : `
                                <button onclick="editRow('${item.id}')" title="Edit Data" class="text-blue-600 hover:text-blue-800 p-1 font-bold">✏️</button>
                                <button onclick="deleteRow('${item.id}', ${b}, ${idx})" title="Hapus Data" class="text-red-600 hover:text-red-800 p-1 font-bold">🗑️</button>
                                <button onclick="addRow(${b})" title="Tambah Baris" class="text-emerald-600 hover:text-emerald-800 p-1 font-bold">➕</button>
                            `}
                        </div>
                    </td>
                </tr>
            `;
        });

        grandTotalPagu += subTotalPagu;

        html += rowsHtml;

        html += `
            <tr class="bg-slate-100 font-bold text-slate-900">
                <td colspan="9" class="border border-slate-500 text-right px-3 py-1.5 uppercase text-xs">JUMLAH PER BIDANG ${b}</td>
                <td id="subtotal-bidang-${b}" class="border border-slate-500 text-right px-2 py-1.5 font-mono text-xs">${subTotalPagu > 0 ? formatRupiah(subTotalPagu) : '-'}</td>
                <td class="border border-slate-500 no-print"></td>
            </tr>
        `;
    }

    html += `
        <tr class="bg-indigo-950 text-white font-extrabold text-sm">
            <td colspan="9" class="border border-slate-600 text-right px-4 py-2.5 uppercase">J U M L A H &nbsp; T O T A L &nbsp; P A G U</td>
            <td id="grand-total-pagu" class="border border-slate-600 text-right px-3 py-2.5 font-mono">${formatRupiah(grandTotalPagu)}</td>
            <td class="border border-slate-600 no-print"></td>
        </tr>
    `;

    tbody.innerHTML = html;
}

// 3. Edit Row Mode
function editRow(id) {
    if (!id || id === 'null' || id === 'undefined') {
        alert("ℹ️ Silakan isi data baris baru lalu simpan tabel utama terlebih dahulu untuk mengedit.");
        return;
    }
    const item = dataProgramMasuk.find(i => String(i.id) === String(id));
    if (!item) return;

    editingRowId = id;
    originalRowBackup = JSON.parse(JSON.stringify(item));
    renderTable();
}

function cancelEditRow() {
    if (editingRowId && originalRowBackup) {
        const idx = dataProgramMasuk.findIndex(i => String(i.id) === String(editingRowId));
        if (idx > -1) {
            dataProgramMasuk[idx] = originalRowBackup;
        }
    }
    editingRowId = null;
    originalRowBackup = null;
    renderTable();
}

async function saveEditRow(id) {
    const item = dataProgramMasuk.find(i => String(i.id) === String(id));
    if (!item) return;

    try {
        const response = await fetch('/api/program-masuk-desa', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });
        const result = response.ok ? await response.json() : { success: false, message: `HTTP ${response.status}` };

        if (result.success) {
            alert('✅ Data program masuk desa berhasil diupdate!');
            editingRowId = null;
            originalRowBackup = null;
            loadProgramMasukData();
        } else {
            alert('❌ Gagal mengupdate data: ' + (result.message || result.error || 'Terjadi kesalahan'));
        }
    } catch (error) {
        console.error('❌ Error update:', error);
        alert('❌ Gagal mengupdate data');
    }
}

// 4. Delete Row
async function deleteRow(id, bidangKe, indexInBidang) {
    if (!id || id === 'null' || id === 'undefined') {
        if (!confirm('🗑️ Hapus baris ini?')) return;
        syncDOMToMemory();
        const items = dataProgramMasuk.filter(it => parseInt(it.bidang, 10) === bidangKe);
        if (items && items[indexInBidang]) {
            const gIdx = dataProgramMasuk.indexOf(items[indexInBidang]);
            if (gIdx > -1) {
                dataProgramMasuk.splice(gIdx, 1);
            }
        }
        renderTable();
        return;
    }
    if (!confirm('🗑️ Yakin ingin menghapus data program masuk desa ini?')) return;
    
    try {
        const response = await fetch(`/api/program-masuk-desa?id=${id}`, {
            method: 'DELETE'
        });
        const result = response.ok ? await response.json() : { success: false, message: `HTTP ${response.status}` };
        
        if (result.success) {
            alert('✅ Data program masuk desa berhasil dihapus!');
            loadProgramMasukData();
        } else {
            alert('❌ Gagal menghapus data: ' + (result.message || result.error || 'Terjadi kesalahan'));
        }
    } catch (error) {
        console.error('❌ Error delete:', error);
        alert('❌ Gagal menghapus data');
    }
}

// 5. Singkronisasi DOM input ke memory dataProgramMasuk
function syncDOMToMemory() {
    const activeYear = parseInt(document.getElementById('select-year')?.value || '2027', 10);
    const rows = document.querySelectorAll('#tabel-program-masuk-body tr[data-bidang]');
    if (!rows || rows.length === 0) return;

    const byBidang = { 1: [], 2: [], 3: [], 4: [] };
    rows.forEach(tr => {
        const b = parseInt(tr.getAttribute('data-bidang'), 10) || 1;
        const idVal = tr.getAttribute('data-id');
        const id = (idVal && idVal !== 'null' && idVal !== 'undefined') ? parseInt(idVal, 10) : null;
        
        const subKegiatan = tr.querySelector('.input-sub-kegiatan')?.value || '';
        const instansi = tr.querySelector('.input-instansi')?.value || '';
        const sdgs = tr.querySelector('.input-sdgs')?.value || '';
        const thnPelaksanaan = parseInt(tr.querySelector('.input-tahun-pelaksanaan')?.value, 10) || activeYear;
        const lokasi = tr.querySelector('.input-lokasi')?.value || '';
        const volume = tr.querySelector('.input-volume')?.value || '';
        const satuan = tr.querySelector('.input-satuan')?.value || '';
        const pagu = parseFloat(tr.querySelector('.input-pagu')?.value) || 0;

        byBidang[b].push({
            id,
            tahun: activeYear,
            bidang: b,
            sub_kegiatan: subKegiatan,
            nama_program: subKegiatan,
            nama_kegiatan: subKegiatan,
            instansi_pemberi: instansi,
            pelaksana: instansi,
            sumber_dana: instansi,
            mendukung_sdgs: sdgs,
            tahun_pelaksanaan: thnPelaksanaan,
            lokasi,
            volume,
            satuan,
            total_pagu: pagu,
            anggaran: pagu
        });
    });

    const newItems = [];
    for (let b = 1; b <= 4; b++) {
        if (byBidang[b] && byBidang[b].length > 0) {
            newItems.push(...byBidang[b]);
        }
    }
    if (newItems.length > 0) {
        dataProgramMasuk = newItems;
    }
}

// 6. Tambah Baris Baru ke Bidang tertentu (addRow)
function addRow(bidangKe) {
    const activeYear = parseInt(document.getElementById('select-year')?.value || '2027', 10);
    syncDOMToMemory();
    dataProgramMasuk.push({
        id: null,
        tahun: activeYear,
        bidang: bidangKe,
        sub_kegiatan: '',
        nama_program: '',
        nama_kegiatan: '',
        instansi_pemberi: '',
        pelaksana: '',
        sumber_dana: '',
        mendukung_sdgs: '',
        tahun_pelaksanaan: activeYear,
        lokasi: '',
        volume: '',
        satuan: '',
        total_pagu: 0,
        anggaran: 0
    });
    renderTable();
}

// 7. Hitung Total & Subtotal Realtime Tanpa Re-render DOM
function recalculateTotals() {
    let grandTotal = 0;
    for (let b = 1; b <= 4; b++) {
        let subtotal = 0;
        const rows = document.querySelectorAll(`#tabel-program-masuk-body tr[data-bidang="${b}"]`);
        rows.forEach(tr => {
            const paguInput = tr.querySelector('.input-pagu');
            if (paguInput) {
                subtotal += parseFloat(paguInput.value) || 0;
            }
        });
        const subtotalEl = document.getElementById(`subtotal-bidang-${b}`);
        if (subtotalEl) {
            subtotalEl.textContent = subtotal > 0 ? formatRupiah(subtotal) : '-';
        }
        grandTotal += subtotal;
    }
    const grandTotalEl = document.getElementById('grand-total-pagu');
    if (grandTotalEl) {
        grandTotalEl.textContent = formatRupiah(grandTotal);
    }
}

// 8. Update Nilai Field Realtime
function updateFieldData(bidangKe, indexInBidang, field, value) {
    const activeYear = parseInt(document.getElementById('select-year')?.value || '2027', 10);
    let itemsBidang = dataProgramMasuk.filter(item => parseInt(item.bidang, 10) === bidangKe);
    let targetItem = itemsBidang[indexInBidang];
    
    if (!targetItem) {
        targetItem = {
            id: null,
            tahun: activeYear,
            bidang: bidangKe,
            sub_kegiatan: '',
            nama_program: '',
            nama_kegiatan: '',
            instansi_pemberi: '',
            pelaksana: '',
            sumber_dana: '',
            mendukung_sdgs: '',
            tahun_pelaksanaan: activeYear,
            lokasi: '',
            volume: '',
            satuan: '',
            total_pagu: 0,
            anggaran: 0
        };
        dataProgramMasuk.push(targetItem);
    }
    
    if (field === 'total_pagu') {
        const num = parseFloat(value) || 0;
        targetItem.total_pagu = num;
        targetItem.anggaran = num;
        recalculateTotals();
    } else if (field === 'tahun_pelaksanaan') {
        targetItem[field] = parseInt(value, 10) || activeYear;
    } else {
        targetItem[field] = value;
        if (field === 'sub_kegiatan') {
            targetItem.nama_program = value;
            targetItem.nama_kegiatan = value;
        } else if (field === 'instansi_pemberi') {
            targetItem.pelaksana = value;
            targetItem.sumber_dana = value;
        }
    }
}

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID').format(angka);
}

// 9. Ambil baris valid langsung dari DOM untuk persistensi akurat
function harvestRowsFromDOM() {
    const activeYear = parseInt(document.getElementById('select-year')?.value || '2027', 10);
    const rows = document.querySelectorAll('#tabel-program-masuk-body tr[data-bidang]');
    const harvested = [];

    rows.forEach(tr => {
        const bidang = parseInt(tr.getAttribute('data-bidang'), 10) || 1;
        const idVal = tr.getAttribute('data-id');
        const id = (idVal && idVal !== 'null' && idVal !== 'undefined') ? parseInt(idVal, 10) : null;
        
        const subKegiatan = tr.querySelector('.input-sub-kegiatan')?.value?.trim() || '';
        const instansi = tr.querySelector('.input-instansi')?.value?.trim() || '';
        const sdgs = tr.querySelector('.input-sdgs')?.value?.trim() || '';
        const thnPelaksanaan = parseInt(tr.querySelector('.input-tahun-pelaksanaan')?.value, 10) || activeYear;
        const lokasi = tr.querySelector('.input-lokasi')?.value?.trim() || '';
        const volume = tr.querySelector('.input-volume')?.value?.trim() || '';
        const satuan = tr.querySelector('.input-satuan')?.value?.trim() || '';
        const pagu = parseFloat(tr.querySelector('.input-pagu')?.value) || 0;

        // Simpan baris yang terisi minimal sub_kegiatan, instansi, pagu > 0, lokasi, atau volume
        if (subKegiatan || instansi || pagu > 0 || lokasi || volume) {
            harvested.push({
                ...(id ? { id } : {}),
                tahun: activeYear,
                bidang: bidang,
                sub_kegiatan: subKegiatan,
                nama_program: subKegiatan,
                nama_kegiatan: subKegiatan,
                instansi_pemberi: instansi,
                pelaksana: instansi,
                mendukung_sdgs: sdgs,
                tahun_pelaksanaan: thnPelaksanaan,
                lokasi: lokasi,
                volume: volume,
                satuan: satuan,
                total_pagu: pagu,
                anggaran: pagu,
                sumber_dana: instansi
            });
        }
    });

    return harvested;
}

// 10. Simpan Seluruh Tabel ke Supabase (saveToDatabase)
async function saveToDatabase() {
    const activeYear = parseInt(document.getElementById('select-year')?.value || '2027', 10);
    const rowsToSave = harvestRowsFromDOM();
    
    try {
        const res = await fetch('/api/program-masuk-desa/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tahun: activeYear,
                data: rowsToSave
            })
        });
        
        const json = res.ok ? await res.json() : { success: false, message: `HTTP ${res.status}` };
        if (json.success) {
            alert(`✅ Berhasil! Data Rencana Program dan Kegiatan yang Masuk ke Desa Tahun ${activeYear} telah disimpan permanen.`);
            editingRowId = null;
            originalRowBackup = null;
            await loadProgramMasukData(activeYear);
        } else {
            alert("❌ Gagal menyimpan: " + (json.message || json.error || 'Terjadi kesalahan'));
        }
    } catch (err) {
        console.error("❌ Error saveToDatabase:", err);
        alert("❌ Terjadi kesalahan koneksi server: " + err.message);
    }
}

// 8. Cetak Dokumen / PDF (printPDF)
function printPDF() {
    const inputCells = document.querySelectorAll('#tabel-program-masuk-body td');
    inputCells.forEach(td => {
        const input = td.querySelector('input');
        if (input) {
            const val = input.value;
            const span = document.createElement('span');
            span.className = "print-text-replacement px-1 text-xs " + (input.classList.contains('text-right') ? 'text-right block font-mono' : input.classList.contains('text-center') ? 'text-center block' : '');
            span.textContent = val || '';
            td.appendChild(span);
            input.style.display = 'none';
        }
    });

    window.print();

    setTimeout(() => {
        document.querySelectorAll('.print-text-replacement').forEach(el => el.remove());
        document.querySelectorAll('#tabel-program-masuk-body input').forEach(input => {
            input.style.display = '';
        });
    }, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
    loadProgramMasukData();
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
    const inputTgl = document.getElementById('tgl-cetak');
    const lblTgl = document.getElementById('lbl-tgl-cetak');
    if (lblTgl) {
        lblTgl.textContent = `Batetangnga, ${formatTanggalIndonesia(inputTgl?.value)}`;
    }
}
