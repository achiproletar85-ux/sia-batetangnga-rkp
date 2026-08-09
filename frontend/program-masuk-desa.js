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

window.addEventListener('tahunChanged', (e) => {
    if (e && e.detail && e.detail.tahun) {
        if (typeof loadProgramMasukData === 'function') loadProgramMasukData();
    }
});

// 1. Load Data Berdasarkan Tahun dari Supabase
async function loadProgramMasukData() {
    const year = localStorage.getItem('ACTIVE_TAHUN_ANGGARAN') || document.getElementById('select-year')?.value || '2027';
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
        let res = await fetch(`/api/program-masuk-desa?tahun=${year}`);
        if (res.ok) {
            let json = await res.json();
            dataProgramMasuk = json.data || [];
        } else {
            dataProgramMasuk = [];
        }
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

    let html = '';
    let grandTotalPagu = 0;

    for (let b = 1; b <= 4; b++) {
        const namaBidang = NAMA_BIDANG_MASUK[b];
        
        let itemsBidang = dataProgramMasuk.filter(item => parseInt(item.bidang) === b);
        
        // JIKA KOSONG: Wajib sediakan minimal 1 baris template agar bidang tetap muncul & bisa diisi!
        if (itemsBidang.length === 0) {
            itemsBidang = [{
                id: null,
                tahun: parseInt(document.getElementById('select-year')?.value || '2027'),
                bidang: b,
                sub_kegiatan: '',
                instansi_pemberi: '',
                mendukung_sdgs: '',
                tahun_pelaksanaan: parseInt(document.getElementById('select-year')?.value || '2027'),
                lokasi: '',
                volume: '',
                satuan: '',
                total_pagu: 0
            }];
        }

        let subTotalPagu = 0;
        let rowsHtml = '';

        itemsBidang.forEach((item, idx) => {
            const paguVal = parseFloat(item.total_pagu) || 0;
            const isEditing = editingRowId && String(editingRowId) === String(item.id);
            
            subTotalPagu += paguVal;

            rowsHtml += `
                <tr data-id="${item.id || ''}" class="border border-slate-400 ${isEditing ? 'bg-amber-50/80 border-indigo-500 font-semibold' : 'hover:bg-slate-50'} transition">
                    <td class="border border-slate-400 text-center font-bold py-1.5">${idx + 1}</td>
                    <td class="border border-slate-400 px-2 py-1.5 font-semibold text-slate-700 w-44">
                        ${idx === 0 ? `<strong class="block text-indigo-900">${b}. ${namaBidang}</strong>` : ''}
                    </td>
                    <td class="border border-slate-400 p-1">
                        <input type="text" value="${item.sub_kegiatan || item.nama_kegiatan || ''}" oninput="updateFieldData(${b}, ${idx}, 'sub_kegiatan', this.value)" placeholder="Nama Program / Kegiatan..." class="w-full p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs" />
                    </td>
                    <td class="border border-slate-400 p-1">
                        <input type="text" value="${item.instansi_pemberi || ''}" oninput="updateFieldData(${b}, ${idx}, 'instansi_pemberi', this.value)" placeholder="Kementerian / OPD / Prov / Kab..." class="w-full p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs" />
                    </td>
                    <td class="border border-slate-400 p-1 text-center">
                        <input type="text" value="${item.mendukung_sdgs || ''}" oninput="updateFieldData(${b}, ${idx}, 'mendukung_sdgs', this.value)" placeholder="SDGs ke-..." class="w-full text-center p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs" />
                    </td>
                    <td class="border border-slate-400 p-1 text-center">
                        <input type="number" value="${item.tahun_pelaksanaan || ''}" oninput="updateFieldData(${b}, ${idx}, 'tahun_pelaksanaan', this.value)" placeholder="2027" class="w-full text-center p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs font-mono" />
                    </td>
                    <td class="border border-slate-400 p-1">
                        <input type="text" value="${item.lokasi || ''}" oninput="updateFieldData(${b}, ${idx}, 'lokasi', this.value)" placeholder="Dusun / RT / RW..." class="w-full p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs" />
                    </td>
                    <td class="border border-slate-400 p-1 text-center">
                        <input type="text" value="${item.volume || ''}" oninput="updateFieldData(${b}, ${idx}, 'volume', this.value)" placeholder="Volume..." class="w-full text-center p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs" />
                    </td>
                    <td class="border border-slate-400 p-1 text-center">
                        <input type="text" value="${item.satuan || ''}" oninput="updateFieldData(${b}, ${idx}, 'satuan', this.value)" placeholder="Satuan..." class="w-full text-center p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs" />
                    </td>
                    <td class="border border-slate-400 p-1 text-right">
                        <input type="number" value="${paguVal > 0 ? paguVal : ''}" oninput="updateFieldData(${b}, ${idx}, 'total_pagu', this.value)" placeholder="0" class="w-full text-right p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs font-mono" />
                    </td>
                    <td class="border border-slate-400 text-center py-1 no-print">
                        <div class="flex justify-center items-center gap-1">
                            ${isEditing ? `
                                <button onclick="saveEditRow('${item.id}')" title="Simpan Perubahan" class="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition">💾</button>
                                <button onclick="cancelEditRow()" title="Batal Edit" class="px-2 py-0.5 bg-slate-400 hover:bg-slate-500 text-white rounded text-xs font-bold transition">❌</button>
                            ` : `
                                <button onclick="editRow('${item.id}')" title="Edit Data" class="text-blue-600 hover:text-blue-800 p-1 font-bold">✏️</button>
                                <button onclick="deleteRow('${item.id}')" title="Hapus Data" class="text-red-600 hover:text-red-800 p-1 font-bold">🗑️</button>
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
                <td class="border border-slate-500 text-right px-2 py-1.5 font-mono text-xs">${subTotalPagu > 0 ? formatRupiah(subTotalPagu) : '-'}</td>
                <td class="border border-slate-500 no-print"></td>
            </tr>
        `;
    }

    html += `
        <tr class="bg-indigo-950 text-white font-extrabold text-sm">
            <td colspan="9" class="border border-slate-600 text-right px-4 py-2.5 uppercase">J U M L A H &nbsp; T O T A L &nbsp; P A G U</td>
            <td class="border border-slate-600 text-right px-3 py-2.5 font-mono">${formatRupiah(grandTotalPagu)}</td>
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
        const result = await response.json();

        if (result.success) {
            alert('✅ Data program masuk desa berhasil diupdate!');
            editingRowId = null;
            originalRowBackup = null;
            loadProgramMasukData();
        } else {
            alert('❌ Gagal mengupdate data: ' + (result.message || result.error));
        }
    } catch (error) {
        console.error('❌ Error update:', error);
        alert('❌ Gagal mengupdate data');
    }
}

// 4. Delete Row
async function deleteRow(id) {
    if (!id || id === 'null' || id === 'undefined') {
        alert("Baris kosong belum tersimpan di database.");
        return;
    }
    if (!confirm('🗑️ Yakin ingin menghapus data program masuk desa ini?')) return;
    
    try {
        const response = await fetch(`/api/program-masuk-desa?id=${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Data program masuk desa berhasil dihapus!');
            loadProgramMasukData();
        } else {
            alert('❌ Gagal menghapus data: ' + (result.message || result.error));
        }
    } catch (error) {
        console.error('❌ Error delete:', error);
        alert('❌ Gagal menghapus data');
    }
}

// 5. Tambah Baris Baru ke Bidang tertetap (addRow)
function addRow(bidangKe) {
    dataProgramMasuk.push({
        id: null,
        tahun: parseInt(document.getElementById('select-year')?.value || '2027'),
        bidang: bidangKe,
        sub_kegiatan: '',
        instansi_pemberi: '',
        mendukung_sdgs: '',
        tahun_pelaksanaan: parseInt(document.getElementById('select-year')?.value || '2027'),
        lokasi: '',
        volume: '',
        satuan: '',
        total_pagu: 0
    });
    renderTable();
}

// 6. Update Nilai Field Realtime
function updateFieldData(bidangKe, indexInBidang, field, value) {
    let itemsBidang = dataProgramMasuk.filter(item => parseInt(item.bidang) === bidangKe);
    const targetItem = itemsBidang[indexInBidang];
    
    if (targetItem) {
        const globalIndex = dataProgramMasuk.indexOf(targetItem);
        if (globalIndex > -1) {
            if (field === 'total_pagu') {
                dataProgramMasuk[globalIndex][field] = parseFloat(value) || 0;
            } else if (field === 'tahun_pelaksanaan') {
                dataProgramMasuk[globalIndex][field] = parseInt(value) || parseInt(document.getElementById('select-year')?.value || '2027');
            } else {
                dataProgramMasuk[globalIndex][field] = value;
            }
        }
    }
}

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID').format(angka);
}

// 7. Simpan Seluruh Tabel ke Supabase (saveToDatabase)
async function saveToDatabase() {
    const year = document.getElementById('select-year')?.value || '2027';
    
    try {
        let res = await fetch('/api/program-masuk-desa/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tahun: year, data: dataProgramMasuk })
        });
        
        let json = await res.json();
        if (json.success) {
            alert(`✅ Berhasil! Data Rencana Program dan Kegiatan yang Masuk ke Desa Tahun ${year} telah disimpan permanen ke Supabase.`);
            loadProgramMasukData();
        } else {
            alert("❌ Gagal menyimpan: " + json.message);
        }
    } catch (err) {
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
