// ============================================================
// MODUL USULAN MASYARAKAT (MUSRENBANG DESA)
// Format Hemat Kertas & Pengelompokan Khusus Aparat Desa
// ============================================================

let usulanList = [];
let allDistinctLokasi = [];
let selectedLokasiSet = new Set();
let searchKeyword = '';

function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `fixed bottom-6 right-6 px-6 py-3 rounded-2xl text-white font-bold shadow-xl z-50 ${type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatTanggalIndonesia(tanggalStr) {
    if (!tanggalStr) {
        const today = new Date();
        const tgl = String(today.getDate()).padStart(2, '0');
        const bln = today.getMonth();
        const thn = today.getFullYear();
        const namaBulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        return `${tgl} ${namaBulan[bln]} ${thn}`;
    }
    const parts = tanggalStr.split('-');
    if (parts.length !== 3) return tanggalStr;
    const tahun = parts[0];
    const bulanAngka = parseInt(parts[1], 10) - 1;
    const hari = parseInt(parts[2], 10);
    const namaBulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${hari} ${namaBulan[bulanAngka] || ''} ${tahun}`;
}

const API_USULAN = '/api/usulan';

async function loadUsulanData() {
    const year = document.getElementById('select-year')?.value || '2027';
    const tbody = document.getElementById('table-body');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center py-8 text-slate-400 font-semibold"><i class="fas fa-spinner fa-spin mr-2 text-indigo-500"></i> Memuat data usulan tahun ' + year + '...</td></tr>';
    }

    try {
        const res = await fetch(`${API_USULAN}?tahun=${year}`);
        const json = await res.json();
        usulanList = Array.isArray(json.data) ? json.data : [];
    } catch (error) {
        console.warn('Gagal memuat usulan dari server:', error);
        usulanList = [];
    }

    initLokasiFilter();
    renderTable();
}

function displayName(item) {
    return item.kegiatan || item.nama_kegiatan || '-';
}

function isPemerintahanDesa(item) {
    const b = String(item.bidang || '').toLowerCase();
    const k = String(item.kode_unik_full || item.kode_unik || '').trim();
    return b.includes('pemerintah') || k.startsWith('01.') || b === '1';
}

// ============================================================
// LOGIKA FILTER LOKASI BERBASIS MULTI-SELECT
// ============================================================
function initLokasiFilter() {
    const lokasiMap = new Map();
    usulanList.forEach(item => {
        const loc = String(item.lokasi || 'Desa Batetangnga').trim();
        if (loc) {
            lokasiMap.set(loc, (lokasiMap.get(loc) || 0) + 1);
        }
    });

    allDistinctLokasi = Array.from(lokasiMap.keys()).sort((a, b) => a.localeCompare(b, 'id'));
    // Default: Semua lokasi dipilih
    selectedLokasiSet = new Set(allDistinctLokasi);

    renderLokasiCheckboxes();
    updateLokasiLabel();
}

function renderLokasiCheckboxes(filterKeyword = '') {
    const container = document.getElementById('lokasi-checkbox-list');
    if (!container) return;

    const kw = filterKeyword.toLowerCase().trim();
    const filteredLokasi = allDistinctLokasi.filter(loc => loc.toLowerCase().includes(kw));

    if (filteredLokasi.length === 0) {
        container.innerHTML = '<div class="text-slate-400 text-[11px] py-2 text-center">Tidak ada lokasi yang cocok</div>';
        return;
    }

    container.innerHTML = filteredLokasi.map(loc => {
        const isChecked = selectedLokasiSet.has(loc);
        return `
            <label class="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-xs select-none transition">
                <input type="checkbox" value="${escapeHtml(loc)}" ${isChecked ? 'checked' : ''} onchange="toggleSingleLokasi('${escapeHtml(loc)}', this.checked)" class="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" />
                <span class="text-slate-700 font-medium">${escapeHtml(loc)}</span>
            </label>
        `;
    }).join('');
}

function toggleLokasiDropdown(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('dropdown-lokasi-menu');
    if (!menu) return;
    const isHidden = menu.classList.contains('hidden');
    if (isHidden) {
        menu.classList.remove('hidden');
        renderLokasiCheckboxes();
    } else {
        menu.classList.add('hidden');
    }
}

function toggleSingleLokasi(loc, isChecked) {
    if (isChecked) {
        selectedLokasiSet.add(loc);
    } else {
        selectedLokasiSet.delete(loc);
    }
    updateLokasiLabel();
}

function selectAllLokasi(select) {
    if (select) {
        selectedLokasiSet = new Set(allDistinctLokasi);
    } else {
        selectedLokasiSet.clear();
    }
    renderLokasiCheckboxes(document.getElementById('search-lokasi-input')?.value || '');
    updateLokasiLabel();
}

function filterLokasiCheckboxes() {
    const kw = document.getElementById('search-lokasi-input')?.value || '';
    renderLokasiCheckboxes(kw);
}

function applyLokasiFilter() {
    const menu = document.getElementById('dropdown-lokasi-menu');
    if (menu) menu.classList.add('hidden');
    renderTable();
}

// Tutup dropdown bila klik di luar
document.addEventListener('click', (e) => {
    const menu = document.getElementById('dropdown-lokasi-menu');
    const btn = document.getElementById('btn-toggle-lokasi-filter');
    if (!menu || !btn) return;
    if (!menu.contains(e.target) && !btn.contains(e.target)) {
        menu.classList.add('hidden');
    }
});

function updateLokasiLabel() {
    const lbl = document.getElementById('lbl-lokasi-selected');
    if (!lbl) return;

    if (selectedLokasiSet.size === 0) {
        lbl.textContent = '0 Lokasi Dipilih';
        lbl.className = 'text-rose-600 font-bold';
    } else if (selectedLokasiSet.size === allDistinctLokasi.length) {
        lbl.textContent = 'Semua Lokasi';
        lbl.className = 'text-indigo-600 font-bold';
    } else {
        lbl.textContent = `${selectedLokasiSet.size} Lokasi Terpilih`;
        lbl.className = 'text-emerald-600 font-bold';
    }
}

function filterUsulanTable() {
    const input = document.getElementById('search-usulan-input');
    searchKeyword = (input?.value || '').toLowerCase().trim();
    renderTable();
}

// ============================================================
// RENDER TABEL UTAMA PADA LAYAR
// ============================================================
function getFilteredUsulanList() {
    return usulanList.filter(item => {
        // Filter lokasi
        const loc = String(item.lokasi || 'Desa Batetangnga').trim();
        const matchLokasi = selectedLokasiSet.size === 0 || selectedLokasiSet.has(loc);

        // Filter search keyword
        if (!matchLokasi) return false;
        if (!searchKeyword) return true;

        const kode = String(item.kode_unik_full || item.kode_unik || '').toLowerCase();
        const nama = String(displayName(item)).toLowerCase();
        const bidang = String(item.bidang || '').toLowerCase();
        const pengusul = String(item.nama_pengusul || item.pengusul || '').toLowerCase();
        const lk = loc.toLowerCase();
        return kode.includes(searchKeyword) || nama.includes(searchKeyword) || bidang.includes(searchKeyword) || pengusul.includes(searchKeyword) || lk.includes(searchKeyword);
    });
}

function renderTable() {
    const tbody = document.getElementById('table-body');
    const badge = document.getElementById('usulan-summary-badge');
    if (!tbody) return;

    const filtered = getFilteredUsulanList();

    if (badge) {
        badge.innerHTML = `Menampilkan <b class="text-indigo-700 font-bold">${filtered.length}</b> dari total <b class="text-slate-800">${usulanList.length}</b> usulan terdaftar`;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center py-8 text-slate-400 font-medium">📭 Tidak ada data usulan yang sesuai dengan filter lokasi/pencarian.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map((item, idx) => `
        <tr class="hover:bg-amber-50/50 transition">
            <td class="font-semibold text-slate-500 text-center">${idx + 1}</td>
            <td class="text-center font-mono text-xs font-bold text-indigo-700 whitespace-nowrap">${escapeHtml(item.kode_unik_full || item.kode_unik || '-')}</td>
            <td class="text-slate-700 font-medium text-xs">
                ${isPemerintahanDesa(item) 
                    ? `<span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">Aparat Desa</span> <span class="text-slate-600 block text-[11px]">${escapeHtml(item.bidang || 'Penyelenggaraan Pemerintahan')}</span>` 
                    : escapeHtml(item.bidang || 'Pelaksanaan Pembangunan Desa')}
            </td>
            <td class="font-bold text-slate-900">${escapeHtml(displayName(item))}</td>
            <td class="text-slate-600 font-medium">${escapeHtml(item.lokasi || '-')}</td>
            <td class="text-slate-600 text-center">${escapeHtml(item.volume || '-')}</td>
            <td class="font-bold text-emerald-600 text-right font-mono">Rp ${(Number(item.biaya) || 0).toLocaleString('id-ID')}</td>
            <td class="text-slate-600 text-xs">${escapeHtml(item.sasaran || '-')}</td>
            <td class="text-slate-600 text-xs">${escapeHtml(item.nama_pengusul || item.pengusul || '-')}</td>
            <td class="text-center no-print">
                <button type="button" onclick="hapusUsulan('${item.id}')" title="Hapus Usulan" class="px-2 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-bold transition border border-red-200">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// ============================================================
// TAMBAH & HAPUS DATA
// ============================================================
async function tambahUsulan() {
    const kegiatan = document.getElementById('input-kegiatan')?.value.trim();
    const bidang = document.getElementById('input-bidang')?.value.trim();
    const lokasi = document.getElementById('input-lokasi')?.value.trim();
    const biaya = parseFloat(document.getElementById('input-biaya')?.value) || 0;
    const volume = document.getElementById('input-volume')?.value.trim();
    const sasaran = document.getElementById('input-sasaran')?.value.trim();
    const pengusul = document.getElementById('input-pengusul')?.value.trim();

    if (!kegiatan) {
        showToast('⚠️ Gagasan usulan kegiatan wajib diisi!', 'error');
        return;
    }
    if (!lokasi) {
        showToast('⚠️ Lokasi / Dusun wajib diisi!', 'error');
        return;
    }

    const year = document.getElementById('select-year')?.value || '2027';

    try {
        const res = await fetch(API_USULAN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kegiatan, bidang, lokasi, biaya, volume, sasaran, pengusul, tahun: year })
        });
        const json = await res.json();
        if (json.success) {
            showToast('✅ Usulan masyarakat berhasil disimpan!', 'success');
            document.getElementById('input-kegiatan').value = '';
            document.getElementById('input-lokasi').value = '';
            document.getElementById('input-biaya').value = '';
            document.getElementById('input-volume').value = '';
            document.getElementById('input-sasaran').value = '';
            document.getElementById('input-pengusul').value = '';
            await loadUsulanData();
        } else {
            showToast(json.message || 'Gagal menyimpan usulan', 'error');
        }
    } catch (error) {
        console.error('Error tambahUsulan:', error);
        showToast('Gagal menyimpan usulan ke server: ' + error.message, 'error');
    }
}

async function hapusUsulan(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus usulan ini dari database?')) return;
    try {
        const res = await fetch(`${API_USULAN}/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
            showToast('✅ Usulan berhasil dihapus!', 'success');
        } else {
            showToast(json.message || 'Gagal menghapus usulan', 'error');
        }
    } catch (error) {
        console.error('Error hapusUsulan:', error);
        showToast('Gagal menghapus usulan dari server: ' + error.message, 'error');
    }
    await loadUsulanData();
}

// ============================================================
// CETAK LEMBAR USULAN MASYARAKAT (MUSRENBANG)
// 1. Format Hemat Kertas: TANPA KOLOM BIAYA DAN SASARAN
// 2. Filter Lokasi Multi-select Dipertahankan
// 3. Pengecualian: Bidang Penyelenggaraan Pemerintahan Desa
//    Digabungkan menjadi SATU BAGIAN KHUSUS APARAT DESA
// ============================================================
function cetakUsulanMusrenbang() {
    const activeYear = document.getElementById('select-year')?.value || '2027';
    const inputTgl = document.getElementById('tgl-cetak')?.value;
    const tglIndo = formatTanggalIndonesia(inputTgl);

    // Ambil data yang telah difilter berdasarkan multi-select lokasi yang aktif
    const itemsToPrint = getFilteredUsulanList();

    if (itemsToPrint.length === 0) {
        alert('⚠️ Tidak ada data usulan yang dipilih untuk dicetak. Periksa kembali filter lokasi Anda.');
        return;
    }

    // PISAHKAN: Usulan Aparat Desa (Bidang Pemerintahan) vs Usulan Murni Masyarakat
    const itemsAparat = itemsToPrint.filter(item => isPemerintahanDesa(item));
    const itemsMasyarakat = itemsToPrint.filter(item => !isPemerintahanDesa(item));

    // Kelompokkan usulan murni masyarakat berdasarkan Bidang
    const groupsMasyarakat = {};
    itemsMasyarakat.forEach(item => {
        const rawBidang = String(item.bidang || 'Bidang Pelaksanaan Pembangunan Desa').trim();
        if (!groupsMasyarakat[rawBidang]) {
            groupsMasyarakat[rawBidang] = [];
        }
        groupsMasyarakat[rawBidang].push(item);
    });

    let noUrut = 1;
    let tableRowsHtml = '';

    // =========================================================================
    // 1. KATEGORI KHUSUS: USULAN/KEGIATAN PENYELENGGARAAN PEMERINTAHAN DESA
    // Sifatnya khusus untuk kegiatan/keperluan Aparat Desa, digabungkan menjadi
    // SATU baris/kategori khusus saja secara ringkas (format hemat kertas)
    // =========================================================================
    if (itemsAparat.length > 0) {
        tableRowsHtml += `
            <tr style="background-color: #e2e8f0; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                <td colspan="6" style="border: 1px solid #000; padding: 5px 8px; text-transform: uppercase; font-size: 9.5px; letter-spacing: 0.5px;">
                    Usulan/Kegiatan Penyelenggaraan Pemerintahan Desa - Khusus Aparat Desa
                </td>
            </tr>
            <tr>
                <td style="border: 1px solid #000; text-align: center; font-weight: bold; vertical-align: middle;">${noUrut++}</td>
                <td style="border: 1px solid #000; text-align: center; font-family: monospace; font-weight: bold; font-size: 8.5px; vertical-align: middle;">01.01.01.01.</td>
                <td style="border: 1px solid #000; padding: 5px 6px;">
                    <div style="font-weight: bold; color: #111;">
                        Operasional Pemerintah Desa, Penghasilan Tetap (Siltap), Tunjangan, Operasional BPD/RT &amp; Sarana Aparat Desa
                    </div>
                    <div style="font-size: 8px; color: #444; font-style: italic; margin-top: 2px;">
                        *) Catatan Khusus: Bidang ini diperuntukkan khusus operasional &amp; kapasitas Aparat Desa (${itemsAparat.length} rincian kegiatan terdaftar lengkap di dokumen definitif APBDes/RKPDes).
                    </div>
                </td>
                <td style="border: 1px solid #000; text-align: center; vertical-align: middle;">Kantor Desa Batetangnga</td>
                <td style="border: 1px solid #000; text-align: center; vertical-align: middle;">1 Tahun</td>
                <td style="border: 1px solid #000; text-align: center; vertical-align: middle; font-weight: 600;">Pemerintah Desa</td>
            </tr>
        `;
    }

    // =========================================================================
    // 2. KATEGORI USULAN MURNI MASYARAKAT (Pembangunan, Pembinaan, Pemberdayaan, Bencana)
    // Diurai per usulan masyarakat per lokasi dusun terpilih
    // =========================================================================
    for (const [bidangName, items] of Object.entries(groupsMasyarakat)) {
        tableRowsHtml += `
            <tr style="background-color: #f1f5f9; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                <td colspan="6" style="border: 1px solid #000; padding: 5px 8px; text-transform: uppercase; font-size: 9.5px; letter-spacing: 0.5px;">
                    ${escapeHtml(bidangName)}
                </td>
            </tr>
        `;

        items.forEach(item => {
            tableRowsHtml += `
                <tr>
                    <td style="border: 1px solid #000; text-align: center; vertical-align: middle;">${noUrut++}</td>
                    <td style="border: 1px solid #000; text-align: center; font-family: monospace; font-size: 8.5px; font-weight: 600; vertical-align: middle;">${escapeHtml(item.kode_unik_full || item.kode_unik || '-')}</td>
                    <td style="border: 1px solid #000; padding: 4px 6px; font-weight: 500;">${escapeHtml(displayName(item))}</td>
                    <td style="border: 1px solid #000; text-align: center; vertical-align: middle;">${escapeHtml(item.lokasi || '-')}</td>
                    <td style="border: 1px solid #000; text-align: center; vertical-align: middle;">${escapeHtml(item.volume || '-')}</td>
                    <td style="border: 1px solid #000; text-align: center; vertical-align: middle;">${escapeHtml(item.nama_pengusul || item.pengusul || 'Masyarakat')}</td>
                </tr>
            `;
        });
    }

    // Ringkasan info lokasi yang sedang difilter
    const infoLokasiCetak = selectedLokasiSet.size === allDistinctLokasi.length
        ? 'Seluruh Dusun / Wilayah Desa Batetangnga'
        : `${selectedLokasiSet.size} Lokasi Terpilih (${Array.from(selectedLokasiSet).slice(0, 4).join(', ')}${selectedLokasiSet.size > 4 ? ', dst.' : ''})`;

    const printWindow = window.open('', '_blank', 'width=1100,height=750');
    if (!printWindow) {
        alert('⚠️ Izinkan pop-up browser untuk mencetak lembar usulan!');
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <title>Kamus Usulan Masyarakat Desa Batetangnga - ${activeYear}</title>
            <style>
                @page {
                    size: A4 portrait;
                    margin: 10mm 10mm 12mm 10mm;
                }
                body {
                    font-family: 'Arial', 'Segoe UI', sans-serif;
                    font-size: 9.5px;
                    line-height: 1.35;
                    margin: 0;
                    padding: 0;
                    color: #000;
                }
                .header-kop {
                    text-align: center;
                    border-bottom: 2px solid #000;
                    padding-bottom: 8px;
                    margin-bottom: 10px;
                }
                .header-kop h1 {
                    font-size: 13px;
                    font-weight: 900;
                    margin: 0 0 3px 0;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .header-kop h2 {
                    font-size: 11px;
                    font-weight: bold;
                    margin: 0 0 2px 0;
                    text-transform: uppercase;
                }
                .header-kop p {
                    font-size: 9px;
                    margin: 0;
                    color: #222;
                }
                .meta-table {
                    width: 100%;
                    border: none;
                    margin-bottom: 8px;
                    font-size: 9.5px;
                    font-weight: bold;
                }
                .meta-table td {
                    border: none;
                    padding: 2px 4px;
                }
                table.data-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 9px;
                }
                table.data-table th, table.data-table td {
                    border: 1px solid #000;
                    padding: 4px 5px;
                }
                table.data-table th {
                    background-color: #e2e8f0;
                    text-align: center;
                    font-weight: bold;
                    text-transform: uppercase;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .signatures {
                    margin-top: 24px;
                    display: flex;
                    justify-content: space-between;
                    font-size: 9.5px;
                    page-break-inside: avoid;
                }
                .sig-box {
                    width: 250px;
                    text-align: center;
                }
                .sig-space {
                    height: 52px;
                }
            </style>
        </head>
        <body>
            <div class="header-kop">
                <h1>KAMUS USULAN MASYARAKAT DESA BATETANGNGA</h1>
                <h2>DESA BATETANGNGA KECAMATAN BINUANG KABUPATEN POLEWALI MANDAR</h2>
                <p>TAHUN ANGGARAN ${activeYear} &bull; FORMAT HEMAT KERTAS USULAN PRIORITAS</p>
            </div>

            <table class="meta-table">
                <tr>
                    <td width="18%">DESA</td>
                    <td width="32%">: BATETANGNGA</td>
                    <td width="18%">KABUPATEN</td>
                    <td width="32%">: POLEWALI MANDAR</td>
                </tr>
                <tr>
                    <td>KECAMATAN</td>
                    <td>: BINUANG</td>
                    <td>CAKUPAN FILTER</td>
                    <td>: ${escapeHtml(infoLokasiCetak)}</td>
                </tr>
            </table>

            <table class="data-table">
                <thead>
                    <tr>
                        <th style="width: 28px;">No</th>
                        <th style="width: 105px;">Kode Unik Full</th>
                        <th>Gagasan Usulan Program / Kegiatan</th>
                        <th style="width: 125px;">Lokasi / Dusun</th>
                        <th style="width: 85px;">Volume &amp; Satuan</th>
                        <th style="width: 110px;">Pengusul / Delegasi</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRowsHtml}
                </tbody>
            </table>

            <div class="signatures">
                <div class="sig-box">
                    <p style="margin: 0; font-weight: bold;">Mengetahui,</p>
                    <p style="margin: 2px 0 0 0; font-weight: bold;">Kepala Desa Batetangnga</p>
                    <div class="sig-space"></div>
                    <p style="margin: 0; font-weight: bold; text-decoration: underline; text-transform: uppercase;">SUMAILA DAMANG</p>
                </div>
                <div class="sig-box">
                    <p style="margin: 0;">Batetangnga, ${tglIndo}</p>
                    <p style="margin: 2px 0 0 0; font-weight: bold;">Ketua Musrenbang Desa / Tim Penyusun</p>
                    <div class="sig-space"></div>
                    <p style="margin: 0; font-weight: bold; text-decoration: underline;">( .................................................. )</p>
                </div>
            </div>
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
    }, 450);
}

// Window Exposures
window.loadUsulanData = loadUsulanData;
window.tambahUsulan = tambahUsulan;
window.hapusUsulan = hapusUsulan;
window.toggleLokasiDropdown = toggleLokasiDropdown;
window.toggleSingleLokasi = toggleSingleLokasi;
window.selectAllLokasi = selectAllLokasi;
window.filterLokasiCheckboxes = filterLokasiCheckboxes;
window.applyLokasiFilter = applyLokasiFilter;
window.filterUsulanTable = filterUsulanTable;
window.cetakUsulanMusrenbang = cetakUsulanMusrenbang;

document.addEventListener('DOMContentLoaded', () => {
    // Inisialisasi tgl cetak ke hari ini jika kosong
    const inputTgl = document.getElementById('tgl-cetak');
    if (inputTgl && !inputTgl.value) {
        inputTgl.value = new Date().toISOString().split('T')[0];
    }
    loadUsulanData();
});