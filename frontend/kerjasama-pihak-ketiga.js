// ============================================================
// MODUL RENCANA KERJA SAMA PIHAK KETIGA (SWASTA/BUMN/LSM)
// ============================================================

const NAMA_BIDANG = {
    1: "Penyelenggaraan Pemerintahan Desa",
    2: "Pelaksanaan Pembangunan Desa",
    3: "Pembinaan Kemasyarakatan",
    4: "Pemberdayaan Masyarakat",
    5: "Penanggulangan Bencana, Darurat Dan Mendesak Desa"
};

const JENIS_PIHAK_KETIGA_OPTIONS = [
    "Swasta",
    "BUMN/BUMD",
    "LSM/NGO",
    "Instansi Pemerintah",
    "Lainnya"
];

let dataKerjasamaPihakKetiga = [];
let editingRowId = null;
let originalRowBackup = null;

// 1. Load Data Berdasarkan Tahun yang Dipilih dari Supabase
async function loadDataKerjasamaPihakKetiga() {
    const year = document.getElementById('select-year')?.value || '2027';
    const elHeaderTahun = document.getElementById('header-tahun');
    if (elHeaderTahun) elHeaderTahun.textContent = year;

    const tbody = document.getElementById('tabel-kerjasama-body');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="11" class="text-center py-6 text-slate-400 font-sans italic">
                <i class="fas fa-spinner fa-spin mr-2"></i> Memuat data kerja sama pihak ketiga tahun ${year}...
            </td>
        </tr>
    `;

    try {
        let res = await fetch(`/api/kerjasama-pihak-ketiga?tahun=${year}`);
        if (res.ok) {
            let json = await res.json();
            dataKerjasamaPihakKetiga = json.data || [];
        } else {
            dataKerjasamaPihakKetiga = [];
        }
    } catch (e) {
        console.warn("Gagal terhubung ke server, menggunakan memori lokal.");
        dataKerjasamaPihakKetiga = [];
    }

    renderTabelKerjasama();
}

// 2. Render Tabel 5 Bidang Baku
function renderTabelKerjasama() {
    const tbody = document.getElementById('tabel-kerjasama-body');
    if (!tbody) return;

    let html = '';
    let grandTotalDesa = 0;
    let grandTotalPihakKetiga = 0;

    for (let b = 1; b <= 5; b++) {
        const namaBidang = NAMA_BIDANG[b];
        
        let itemsBidang = dataKerjasamaPihakKetiga.filter(item => parseInt(item.bidang || item.bidang_ke) === b);
        
        if (itemsBidang.length === 0) {
            itemsBidang = [{
                id: null,
                tahun: parseInt(document.getElementById('select-year')?.value || '2027'),
                bidang: b,
                bidang_ke: b,
                sub_kegiatan: '',
                nama_kegiatan: '',
                mendukung_sdgs: '',
                sdgs_desa: '',
                lokasi: '',
                volume: '',
                volume_satuan: '',
                penerima_manfaat: '',
                biaya_desa: 0,
                biaya_pihak_ketiga: 0,
                nama_pihak_ketiga: '',
                jenis_pihak_ketiga: 'Swasta'
            }];
        }

        let subTotalDesa = 0;
        let subTotalPihakKetiga = 0;
        let rowsHtml = '';

        itemsBidang.forEach((item, idx) => {
            const bDesa = parseFloat(item.biaya_desa) || 0;
            const bPihak3 = parseFloat(item.biaya_pihak_ketiga) || 0;
            const isEditing = editingRowId && String(editingRowId) === String(item.id);
            const namaKeg = item.sub_kegiatan || item.nama_kegiatan || '';
            const sdgs = item.mendukung_sdgs || item.sdgs_desa || '';
            const vol = item.volume || item.volume_satuan || '';
            const jenisPihak3 = item.jenis_pihak_ketiga || 'Swasta';
            
            subTotalDesa += bDesa;
            subTotalPihakKetiga += bPihak3;

            const jenisOptionsHtml = JENIS_PIHAK_KETIGA_OPTIONS.map(opt => 
                `<option value="${opt}" ${opt === jenisPihak3 ? 'selected' : ''}>${opt}</option>`
            ).join('');

            rowsHtml += `
                <tr data-id="${item.id || ''}" class="border border-slate-400 ${isEditing ? 'bg-amber-50/80 border-indigo-500 font-semibold' : 'hover:bg-slate-50'} transition">
                    <td class="border border-slate-400 text-center font-bold py-1.5">${idx + 1}</td>
                    <td class="border border-slate-400 px-2 py-1.5 font-semibold text-slate-700 w-44">
                        ${idx === 0 ? `<strong class="block text-indigo-900">${b}. ${namaBidang}</strong>` : ''}
                        <input type="text" value="${namaKeg}" oninput="updateFieldData(${b}, ${idx}, 'sub_kegiatan', this.value)" placeholder="Nama Sub-Kegiatan..." class="w-full p-1 mt-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs" />
                    </td>
                    <td class="border border-slate-400 p-1 text-center">
                        <input type="text" value="${sdgs}" oninput="updateFieldData(${b}, ${idx}, 'mendukung_sdgs', this.value)" placeholder="SDGs..." class="w-full text-center p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs" />
                    </td>
                    <td class="border border-slate-400 p-1">
                        <input type="text" value="${item.lokasi || ''}" oninput="updateFieldData(${b}, ${idx}, 'lokasi', this.value)" placeholder="Lokasi..." class="w-full p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs" />
                    </td>
                    <td class="border border-slate-400 p-1">
                        <input type="text" value="${vol}" oninput="updateFieldData(${b}, ${idx}, 'volume', this.value)" placeholder="Volume..." class="w-full p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs" />
                    </td>
                    <td class="border border-slate-400 p-1">
                        <input type="text" value="${item.penerima_manfaat || ''}" oninput="updateFieldData(${b}, ${idx}, 'penerima_manfaat', this.value)" placeholder="Manfaat..." class="w-full p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs" />
                    </td>
                    <td class="border border-slate-400 p-1 text-right">
                        <input type="number" value="${bDesa > 0 ? bDesa : ''}" oninput="updateFieldData(${b}, ${idx}, 'biaya_desa', this.value)" placeholder="0" class="w-full text-right p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs font-mono" />
                    </td>
                    <td class="border border-slate-400 p-1 text-right">
                        <input type="number" value="${bPihak3 > 0 ? bPihak3 : ''}" oninput="updateFieldData(${b}, ${idx}, 'biaya_pihak_ketiga', this.value)" placeholder="0" class="w-full text-right p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs font-mono" />
                    </td>
                    <td class="border border-slate-400 p-1">
                        <input type="text" value="${item.nama_pihak_ketiga || ''}" oninput="updateFieldData(${b}, ${idx}, 'nama_pihak_ketiga', this.value)" placeholder="Nama PT/CV/LSM..." class="w-full p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border border-slate-300 focus:bg-amber-50 rounded text-xs" />
                    </td>
                    <td class="border border-slate-400 p-1">
                        <select onchange="updateFieldData(${b}, ${idx}, 'jenis_pihak_ketiga', this.value)" class="w-full p-1 bg-white border border-slate-300 rounded text-xs font-semibold focus:bg-amber-50">
                            ${jenisOptionsHtml}
                        </select>
                    </td>
                    <td class="border border-slate-400 text-center py-1 no-print">
                        <div class="flex justify-center items-center gap-1">
                            ${isEditing ? `
                                <button onclick="saveEditRow('${item.id}')" title="Simpan Perubahan" class="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition">💾</button>
                                <button onclick="cancelEditRow()" title="Batal Edit" class="px-2 py-0.5 bg-slate-400 hover:bg-slate-500 text-white rounded text-xs font-bold transition">❌</button>
                            ` : `
                                <button onclick="editRow('${item.id}')" title="Edit Data" class="text-blue-600 hover:text-blue-800 p-1 font-bold">✏️</button>
                                <button onclick="deleteRow('${item.id}')" title="Hapus Data" class="text-red-600 hover:text-red-800 p-1 font-bold">🗑️</button>
                                <button onclick="tambahBarisBidang(${b})" title="Tambah Baris" class="text-emerald-600 hover:text-emerald-800 p-1 font-bold">➕</button>
                            `}
                        </div>
                    </td>
                </tr>
            `;
        });

        grandTotalDesa += subTotalDesa;
        grandTotalPihakKetiga += subTotalPihakKetiga;

        html += rowsHtml;

        html += `
            <tr class="bg-slate-100 font-bold text-slate-900">
                <td colspan="6" class="border border-slate-500 text-right px-3 py-1.5 uppercase text-xs">Jumlah Per Bidang ${b}</td>
                <td class="border border-slate-500 text-right px-2 py-1.5 font-mono text-xs">${subTotalDesa > 0 ? formatRupiah(subTotalDesa) : '-'}</td>
                <td class="border border-slate-500 text-right px-2 py-1.5 font-mono text-xs">${subTotalPihakKetiga > 0 ? formatRupiah(subTotalPihakKetiga) : '-'}</td>
                <td colspan="3" class="border border-slate-500 no-print"></td>
            </tr>
        `;
    }

    html += `
        <tr class="bg-indigo-950 text-white font-extrabold text-sm">
            <td colspan="6" class="border border-slate-600 text-right px-4 py-2.5 uppercase">J U M L A H &nbsp; T O T A L</td>
            <td class="border border-slate-600 text-right px-3 py-2.5 font-mono">${formatRupiah(grandTotalDesa)}</td>
            <td class="border border-slate-600 text-right px-3 py-2.5 font-mono">${formatRupiah(grandTotalPihakKetiga)}</td>
            <td colspan="3" class="border border-slate-600 no-print"></td>
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
    const item = dataKerjasamaPihakKetiga.find(i => String(i.id) === String(id));
    if (!item) return;

    editingRowId = id;
    originalRowBackup = JSON.parse(JSON.stringify(item));
    renderTabelKerjasama();
}

function cancelEditRow() {
    if (editingRowId && originalRowBackup) {
        const idx = dataKerjasamaPihakKetiga.findIndex(i => String(i.id) === String(editingRowId));
        if (idx > -1) {
            dataKerjasamaPihakKetiga[idx] = originalRowBackup;
        }
    }
    editingRowId = null;
    originalRowBackup = null;
    renderTabelKerjasama();
}

async function saveEditRow(id) {
    const item = dataKerjasamaPihakKetiga.find(i => String(i.id) === String(id));
    if (!item) return;

    try {
        const response = await fetch('/api/kerjasama-pihak-ketiga', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });
        const result = await response.json();

        if (result.success) {
            alert('✅ Data kerja sama pihak ketiga berhasil diupdate!');
            editingRowId = null;
            originalRowBackup = null;
            loadDataKerjasamaPihakKetiga();
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
    if (!confirm('🗑️ Yakin ingin menghapus data kerja sama pihak ketiga ini?')) return;
    
    try {
        const response = await fetch(`/api/kerjasama-pihak-ketiga?id=${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Data kerja sama pihak ketiga berhasil dihapus!');
            loadDataKerjasamaPihakKetiga();
        } else {
            alert('❌ Gagal menghapus data: ' + (result.message || result.error));
        }
    } catch (error) {
        console.error('❌ Error delete:', error);
        alert('❌ Gagal menghapus data');
    }
}

// 5. Tambah Baris Baru ke Bawah secara Akurat
function tambahBarisBidang(bidangKe) {
    dataKerjasamaPihakKetiga.push({
        id: null,
        tahun: parseInt(document.getElementById('select-year')?.value || '2027'),
        bidang: bidangKe,
        bidang_ke: bidangKe,
        sub_kegiatan: '',
        nama_kegiatan: '',
        mendukung_sdgs: '',
        sdgs_desa: '',
        lokasi: '',
        volume: '',
        volume_satuan: '',
        penerima_manfaat: '',
        biaya_desa: 0,
        biaya_pihak_ketiga: 0,
        nama_pihak_ketiga: '',
        jenis_pihak_ketiga: 'Swasta'
    });
    renderTabelKerjasama();
}

// 6. Hapus Baris Tertentu
function hapusBarisBidang(bidangKe, indexInBidang) {
    let itemsBidang = dataKerjasamaPihakKetiga.filter(item => parseInt(item.bidang || item.bidang_ke) === bidangKe);
    if (itemsBidang.length <= 1) {
        alert("Minimal harus ada 1 baris pada setiap bidang.");
        return;
    }
    
    const targetItem = itemsBidang[indexInBidang];
    if (targetItem && targetItem.id) {
        deleteRow(targetItem.id);
        return;
    }

    const globalIndex = dataKerjasamaPihakKetiga.indexOf(targetItem);
    if (globalIndex > -1) {
        dataKerjasamaPihakKetiga.splice(globalIndex, 1);
        renderTabelKerjasama();
    }
}

// 7. Update Nilai Field Secara Realtime
function updateFieldData(bidangKe, indexInBidang, field, value) {
    let itemsBidang = dataKerjasamaPihakKetiga.filter(item => parseInt(item.bidang || item.bidang_ke) === bidangKe);
    const targetItem = itemsBidang[indexInBidang];
    
    if (targetItem) {
        const globalIndex = dataKerjasamaPihakKetiga.indexOf(targetItem);
        if (globalIndex > -1) {
            if (field === 'biaya_desa' || field === 'biaya_pihak_ketiga') {
                dataKerjasamaPihakKetiga[globalIndex][field] = parseFloat(value) || 0;
            } else {
                dataKerjasamaPihakKetiga[globalIndex][field] = value;
                if (field === 'sub_kegiatan') dataKerjasamaPihakKetiga[globalIndex]['nama_kegiatan'] = value;
                if (field === 'mendukung_sdgs') dataKerjasamaPihakKetiga[globalIndex]['sdgs_desa'] = value;
                if (field === 'volume') dataKerjasamaPihakKetiga[globalIndex]['volume_satuan'] = value;
            }
        }
    }
}

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID').format(angka);
}

// 8. Tombol Simpan Manual ke Database Supabase
async function simpanDataManual() {
    const year = document.getElementById('select-year')?.value || '2027';
    
    try {
        let res = await fetch('/api/kerjasama-pihak-ketiga/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tahun: year, data: dataKerjasamaPihakKetiga })
        });
        
        let json = await res.json();
        if (json.success) {
            alert(`✅ Berhasil! Data Rencana Kerja Sama Pihak Ketiga Tahun ${year} telah disimpan permanen ke Supabase.`);
            loadDataKerjasamaPihakKetiga();
        } else {
            alert("❌ Gagal menyimpan: " + json.message);
        }
    } catch (err) {
        alert("❌ Terjadi kesalahan koneksi server: " + err.message);
    }
}

// 9. Cetak Dokumen Bersih
function cetakDokumenBersih() {
    const inputCells = document.querySelectorAll('#tabel-kerjasama-body td');
    inputCells.forEach(td => {
        const input = td.querySelector('input, select');
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
        document.querySelectorAll('#tabel-kerjasama-body input, #tabel-kerjasama-body select').forEach(input => {
            input.style.display = '';
        });
    }, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
    loadDataKerjasamaPihakKetiga();
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
