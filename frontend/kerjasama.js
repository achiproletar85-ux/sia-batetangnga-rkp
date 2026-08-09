// ============================================================
// MODUL RENCANA KERJA SAMA DENGAN PIHAK KETIGA (WITH EDIT & DELETE)
// ============================================================

const NAMA_BIDANG = {
    1: "Penyelenggaraan Pemerintahan Desa",
    2: "Pelaksanaan Pembangunan Desa",
    3: "Pembinaan Kemasyarakatan",
    4: "Pemberdayaan Masyarakat",
    5: "Penanggulangan Bencana, Darurat Dan Mendesak Desa"
};

let dataKerjasama = [];
let editingRowId = null;
let originalRowBackup = null;

window.addEventListener('tahunChanged', (e) => {
    if (e && e.detail && e.detail.tahun) {
        if (typeof loadDataKerjasama === 'function') loadDataKerjasama();
    }
});

// 1. Load Data Berdasarkan Tahun yang Dipilih dari Supabase
async function loadDataKerjasama() {
    const year = localStorage.getItem('ACTIVE_TAHUN_ANGGARAN') || document.getElementById('select-year')?.value || '2027';
    const elHeaderTahun = document.getElementById('header-tahun');
    if (elHeaderTahun) elHeaderTahun.textContent = year;

    const tbody = document.getElementById('tabel-kerjasama-body');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="12" class="text-center py-6 text-slate-400 font-sans italic">
                <i class="fas fa-spinner fa-spin mr-2"></i> Memuat data kerja sama pihak ketiga tahun ${year}...
            </td>
        </tr>
    `;

    try {
        let res = await fetch(`/api/kerjasama?tahun=${year}`);
        if (res.ok) {
            let json = await res.json();
            dataKerjasama = json.data || [];
        } else {
            dataKerjasama = [];
        }
    } catch (e) {
        console.warn("Gagal terhubung ke server, menggunakan memori lokal.");
        dataKerjasama = [];
    }

    renderTabelKerjasama();
}

// 2. Render Tabel 5 Bidang Baku (Memastikan Baris Bertambah ke Bawah & Fitur Edit/Delete)
function renderTabelKerjasama() {
    const tbody = document.getElementById('tabel-kerjasama-body');
    if (!tbody) return;

    let html = '';
    let grandTotalDesa = 0;
    let grandTotalPihakKetiga = 0;

    for (let b = 1; b <= 5; b++) {
        const namaBidang = NAMA_BIDANG[b];
        
        // Ambil data yang sesuai dengan bidang ke-b
        let itemsBidang = dataKerjasama.filter(item => parseInt(item.bidang_ke) === b);
        
        // Jika kosong, sediakan minimal 1 baris kosong agar bisa diisi
        if (itemsBidang.length === 0) {
            itemsBidang = [{
                id: null,
                bidang_ke: b,
                nama_kegiatan: '',
                sdgs_desa: '',
                lokasi: '',
                volume_satuan: '',
                penerima_manfaat: '',
                biaya_desa: 0,
                sumber_dana: '',
                biaya_pihak_ketiga: 0,
                nama_pihak_ketiga: ''
            }];
        }

        let subTotalDesa = 0;
        let subTotalPihakKetiga = 0;
        let rowsHtml = '';

        itemsBidang.forEach((item, idx) => {
            const bDesa = parseFloat(item.biaya_desa) || 0;
            const bPihak3 = parseFloat(item.biaya_pihak_ketiga) || 0;
            const isEditing = editingRowId && String(editingRowId) === String(item.id);
            
            subTotalDesa += bDesa;
            subTotalPihakKetiga += bPihak3;

            rowsHtml += `
                <tr data-id="${item.id || ''}" class="border border-slate-400 ${isEditing ? 'bg-amber-50/80 border-indigo-500' : 'hover:bg-slate-50'} transition">
                    <td class="border border-slate-400 text-center font-bold py-1.5">${idx + 1}</td>
                    <td class="border border-slate-400 px-2 py-1.5 font-semibold text-slate-700 w-36">
                        ${idx === 0 ? `<strong>${b}.</strong> ${namaBidang}` : ''}
                    </td>
                    <td class="border border-slate-400 p-1">
                        <input type="text" value="${item.nama_kegiatan || ''}" oninput="updateFieldData(${b}, ${idx}, 'nama_kegiatan', this.value)" class="w-full p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border-0 focus:bg-amber-50 rounded text-xs" />
                    </td>
                    <td class="border border-slate-400 p-1 text-center">
                        <input type="text" value="${item.sdgs_desa || ''}" oninput="updateFieldData(${b}, ${idx}, 'sdgs_desa', this.value)" class="w-full text-center p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border-0 focus:bg-amber-50 rounded text-xs" />
                    </td>
                    <td class="border border-slate-400 p-1">
                        <input type="text" value="${item.lokasi || ''}" oninput="updateFieldData(${b}, ${idx}, 'lokasi', this.value)" class="w-full p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border-0 focus:bg-amber-50 rounded text-xs" />
                    </td>
                    <td class="border border-slate-400 p-1">
                        <input type="text" value="${item.volume_satuan || ''}" oninput="updateFieldData(${b}, ${idx}, 'volume_satuan', this.value)" class="w-full p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border-0 focus:bg-amber-50 rounded text-xs" />
                    </td>
                    <td class="border border-slate-400 p-1">
                        <input type="text" value="${item.penerima_manfaat || ''}" oninput="updateFieldData(${b}, ${idx}, 'penerima_manfaat', this.value)" class="w-full p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border-0 focus:bg-amber-50 rounded text-xs" />
                    </td>
                    <td class="border border-slate-400 p-1 text-right">
                        <input type="number" value="${bDesa > 0 ? bDesa : ''}" oninput="updateFieldData(${b}, ${idx}, 'biaya_desa', this.value)" class="w-full text-right p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border-0 focus:bg-amber-50 rounded text-xs font-mono" />
                    </td>
                    <td class="border border-slate-400 p-1">
                        <input type="text" value="${item.sumber_dana || ''}" oninput="updateFieldData(${b}, ${idx}, 'sumber_dana', this.value)" class="w-full text-center p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border-0 focus:bg-amber-50 rounded text-xs" />
                    </td>
                    <td class="border border-slate-400 p-1 text-right">
                        <input type="number" value="${bPihak3 > 0 ? bPihak3 : ''}" oninput="updateFieldData(${b}, ${idx}, 'biaya_pihak_ketiga', this.value)" class="w-full text-right p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border-0 focus:bg-amber-50 rounded text-xs font-mono" />
                    </td>
                    <td class="border border-slate-400 p-1">
                        <input type="text" value="${item.nama_pihak_ketiga || ''}" oninput="updateFieldData(${b}, ${idx}, 'nama_pihak_ketiga', this.value)" class="w-full p-1 ${isEditing ? 'bg-white ring-2 ring-indigo-400 font-bold' : 'bg-transparent'} border-0 focus:bg-amber-50 rounded text-xs" />
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
                <td colspan="7" class="border border-slate-500 text-center px-3 py-1.5 uppercase tracking-wide text-xs">Jumlah Per Bidang ${b}</td>
                <td class="border border-slate-500 text-right px-2 py-1.5 font-mono text-xs font-bold">${subTotalDesa > 0 ? formatRupiah(subTotalDesa) : '-'}</td>
                <td class="border border-slate-500"></td>
                <td class="border border-slate-500 text-right px-2 py-1.5 font-mono text-xs font-bold">${subTotalPihakKetiga > 0 ? formatRupiah(subTotalPihakKetiga) : '-'}</td>
                <td colspan="2" class="border border-slate-500 no-print"></td>
            </tr>
        `;
    }

    html += `
        <tr class="bg-indigo-950 text-white font-extrabold text-sm">
            <td colspan="7" class="border border-slate-600 text-center px-4 py-2.5 uppercase tracking-wider">J U M L A H &nbsp; T O T A L</td>
            <td class="border border-slate-600 text-right px-3 py-2.5 font-mono">${formatRupiah(grandTotalDesa)}</td>
            <td class="border border-slate-600"></td>
            <td class="border border-slate-600 text-right px-3 py-2.5 font-mono">${formatRupiah(grandTotalPihakKetiga)}</td>
            <td colspan="2" class="border border-slate-600 no-print"></td>
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
    const item = dataKerjasama.find(i => String(i.id) === String(id));
    if (!item) return;

    editingRowId = id;
    originalRowBackup = JSON.parse(JSON.stringify(item));
    renderTabelKerjasama();
}

function cancelEditRow() {
    if (editingRowId && originalRowBackup) {
        const idx = dataKerjasama.findIndex(i => String(i.id) === String(editingRowId));
        if (idx > -1) {
            dataKerjasama[idx] = originalRowBackup;
        }
    }
    editingRowId = null;
    originalRowBackup = null;
    renderTabelKerjasama();
}

async function saveEditRow(id) {
    const item = dataKerjasama.find(i => String(i.id) === String(id));
    if (!item) return;

    try {
        const response = await fetch('/api/kerjasama', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });
        const result = await response.json();

        if (result.success) {
            alert('✅ Data berhasil diupdate!');
            editingRowId = null;
            originalRowBackup = null;
            loadDataKerjasama(); // Refresh
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
    if (!confirm('🗑️ Yakin ingin menghapus data ini?')) return;
    
    try {
        const response = await fetch(`/api/kerjasama?id=${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Data berhasil dihapus!');
            loadDataKerjasama(); // Refresh
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
    dataKerjasama.push({
        id: null,
        bidang_ke: bidangKe,
        nama_kegiatan: '',
        sdgs_desa: '',
        lokasi: '',
        volume_satuan: '',
        penerima_manfaat: '',
        biaya_desa: 0,
        sumber_dana: '',
        biaya_pihak_ketiga: 0,
        nama_pihak_ketiga: ''
    });
    renderTabelKerjasama();
}

// 6. Hapus Baris Tertentu
function hapusBarisBidang(bidangKe, indexInBidang) {
    let itemsBidang = dataKerjasama.filter(item => parseInt(item.bidang_ke) === bidangKe);
    if (itemsBidang.length <= 1) {
        alert("Minimal harus ada 1 baris pada setiap bidang.");
        return;
    }
    
    const targetItem = itemsBidang[indexInBidang];
    if (targetItem && targetItem.id) {
        deleteRow(targetItem.id);
        return;
    }

    const globalIndex = dataKerjasama.indexOf(targetItem);
    if (globalIndex > -1) {
        dataKerjasama.splice(globalIndex, 1);
        renderTabelKerjasama();
    }
}

// 7. Update Nilai Field Secara Realtime
function updateFieldData(bidangKe, indexInBidang, field, value) {
    let itemsBidang = dataKerjasama.filter(item => parseInt(item.bidang_ke) === bidangKe);
    const targetItem = itemsBidang[indexInBidang];
    
    if (targetItem) {
        const globalIndex = dataKerjasama.indexOf(targetItem);
        if (globalIndex > -1) {
            if (field === 'biaya_desa' || field === 'biaya_pihak_ketiga') {
                dataKerjasama[globalIndex][field] = parseFloat(value) || 0;
            } else {
                dataKerjasama[globalIndex][field] = value;
            }
        }
    } else {
        dataKerjasama.push({
            id: null,
            bidang_ke: bidangKe,
            nama_kegiatan: field === 'nama_kegiatan' ? value : '',
            sdgs_desa: field === 'sdgs_desa' ? value : '',
            lokasi: field === 'lokasi' ? value : '',
            volume_satuan: field === 'volume_satuan' ? value : '',
            penerima_manfaat: field === 'penerima_manfaat' ? value : '',
            biaya_desa: field === 'biaya_desa' ? (parseFloat(value) || 0) : 0,
            sumber_dana: field === 'sumber_dana' ? value : '',
            biaya_pihak_ketiga: field === 'biaya_pihak_ketiga' ? (parseFloat(value) || 0) : 0,
            nama_pihak_ketiga: field === 'nama_pihak_ketiga' ? value : ''
        });
    }
}

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID').format(angka);
}

// 8. Tombol Simpan Manual ke Database Supabase
async function simpanDataManual() {
    const year = document.getElementById('select-year')?.value || '2027';
    
    try {
        let res = await fetch('/api/kerjasama', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tahun: year, data: dataKerjasama })
        });
        
        let json = await res.json();
        if (json.success) {
            alert(`✅ Berhasil! Data Rencana Kerja Sama Pihak Ketiga Tahun ${year} telah disimpan permanen ke Supabase.`);
            loadDataKerjasama();
        } else {
            alert("❌ Gagal menyimpan: " + json.message);
        }
    } catch (err) {
        alert("❌ Terjadi kesalahan koneksi server: " + err.message);
    }
}

// 9. Cetak Dokumen Bersih — kloning tabel asli dari DOM supaya struktur persis
// yang tampil di web, input diubah jadi teks, elemen no-print dibuang.
function cetakDokumenBersih() {
    const year = document.getElementById('select-year')?.value || '2027';
    const tgl = document.getElementById('tgl-cetak')?.value || '';
    const namaKetua = document.getElementById('nama-ketua-tim')?.value?.trim() || '............................................';

    const printWindow = window.open('', '_blank', 'width=1400,height=900');
    if (!printWindow) {
        alert("⚠️ Izinkan pop-up browser untuk mencetak dokumen!");
        return;
    }

    // Kloning tabel persis seperti yang tampil di web
    const tbl = document.querySelector('#tabel-kerjasama-table');
    if (!tbl) {
        alert("⚠️ Tabel kerjasama tidak ditemukan.");
        printWindow.close();
        return;
    }
    const clone = tbl.cloneNode(true);

    // Input → div teks statis
    clone.querySelectorAll('input').forEach(inp => {
        const div = document.createElement('div');
        div.textContent = inp.value || '';
        if (inp.classList.contains('text-right')) div.style.textAlign = 'right';
        if (inp.classList.contains('text-center')) div.style.textAlign = 'center';
        if (inp.classList.contains('font-mono')) div.style.fontFamily = 'monospace';
        inp.replaceWith(div);
    });

    // Buang seluruh elemen no-print (tombol Aksi, dst.)
    clone.querySelectorAll('.no-print').forEach(el => el.remove());

    // PErbaiki jumlah kolom tiap baris <tbody> agar selalu 11 (penghapusan sel
    // no-print bisa mengurangi colspan pada baris subtotal/total sehingga salah satu
    // kolom jadi "kurang"). thead memakai rowspan sehingga dilewati.
    const TARGET_COLS = 11;
    const rowSpanCount = (tr) => {
        let n = 0;
        tr.querySelectorAll(':scope > th, :scope > td').forEach(c => {
            n += parseInt(c.getAttribute('colspan') || '1', 10);
        });
        return n;
    };
    clone.querySelectorAll('tbody tr').forEach(tr => {
        let n = rowSpanCount(tr);
        while (n < TARGET_COLS) {
            const fill = document.createElement('td');
            tr.appendChild(fill);
            n += 1;
        }
    });

    printWindow.document.write(
        '<!DOCTYPE html>\n' +
        '<html lang="id">\n' +
        '<head>\n' +
'        <meta charset="UTF-8">\n' +
        '        <script src="https://cdn.tailwindcss.com"></script>\n' +
        '        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">\n' +
        '    <title>Daftar Rencana Kerja Sama Pihak Ketiga - ' + year + '</title>\n' +
        '    <style>\n' +
        '        @page { size: A4 landscape; margin: 8mm 7mm; }\n' +
        '        body { font-family: Arial, sans-serif; font-size: 10px; color: #000; margin: 0; padding: 0; }\n' +
        '        .header { text-align: center; margin-bottom: 10px; }\n' +
        '        .header h1 { font-size: 13px; margin: 2px 0; text-transform: uppercase; letter-spacing: 0.5px; }\n' +
        '        .header h3 { font-size: 11px; margin: 2px 0; text-transform: uppercase; }\n' +
        '        .meta-table { width: 100%; border-collapse: collapse; font-weight: bold; margin: 10px 0; }\n' +
        '        .meta-table td { border: none; padding: 1px 2px; font-size: 10.5px; }\n' +
        '        table.data-table { width: 100%; border-collapse: collapse; font-size: 9px; }\n' +
        '        table.data-table th, table.data-table td {\n' +
        '            border: 1px solid #444; padding: 3px;\n' +
        '            word-wrap: break-word; word-break: break-word;\n' +
        '            overflow-wrap: break-word; overflow: visible;\n' +
        '            white-space: normal; vertical-align: top;\n' +
        '        }\n' +
        '        table.data-table input { border: none; background: transparent; width: 100%; }\n' +
        '        .ttd { margin-top: 30px; display: flex; justify-content: space-between; font-weight: bold; font-size: 11px; }\n' +
        '        .ttd-box { width: 240px; text-align: center; }\n' +
        '        .ttd-space { height: 55px; }\n' +
        '        .ttd-box p { margin: 2px 0; }\n' +
        '        .ttd-box .underline { text-decoration: underline; text-transform: uppercase; }\n' +
        '    </style>\n' +
        '</head>\n' +
        '<body>\n' +
        '    <div class="header">\n' +
        '        <h1>DAFTAR RENCANA KERJA SAMA DENGAN PIHAK KETIGA</h1>\n' +
        '        <h3>RKP DESA TAHUN ' + year + '</h3>\n' +
        '    </div>\n' +
        '\n' +
        '    <table class="meta-table">\n' +
        '        <tr>\n' +
        '            <td width="25%">DESA: BATETANGNGA</td>\n' +
        '            <td width="25%">KECAMATAN: BINUANG</td>\n' +
        '            <td width="25%">KABUPATEN: POLEWALI MANDAR</td>\n' +
        '            <td width="25%">PROVINSI: SULAWESI BARAT</td>\n' +
        '        </tr>\n' +
        '    </table>\n' +
        '\n' +
        '    <table class="data-table">\n' +
        '        ' + clone.innerHTML + '\n' +
        '    </table>\n' +
        '\n' +
        '    <div class="ttd">\n' +
        '        <div class="ttd-box">\n' +
        '            <p>Mengetahui,</p>\n' +
        '            <p>Kepala Desa Batetangnga</p>\n' +
        '            <div class="ttd-space"></div>\n' +
        '            <p class="underline">SUMAILA DAMANG</p>\n' +
        '        </div>\n' +
        '        <div class="ttd-box">\n' +
        '            <p>Batetangnga, ' + formatTanggalIndonesia(tgl) + '</p>\n' +
        '            <p>Disusun oleh,<br>Ketua Tim Penyusun RKPDesa</p>\n' +
        '            <div class="ttd-space"></div>\n' +
        '            <p class="underline">' + namaKetua + '</p>\n' +
        '        </div>\n' +
        '    </div>\n' +
        '</body>\n' +
        '</html>');

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
}

document.addEventListener('DOMContentLoaded', () => {
    loadDataKerjasama();
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