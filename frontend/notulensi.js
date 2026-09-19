/**
 * NOTULENSI.JS - MANAJEMEN MULTI-RECORD NOTULENSI RAPAT & KEGIATAN DESA
 * Sistem Informasi Akuntansi Desa Batetangnga
 * Menjamin integritas daftar multi-record tanpa overwriting/collapse.
 */

let notulensiList = [];
let activeTahun = 2027;
let currentEditingId = null;

// Helper: Escape HTML
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Ambil tahun dari URL atau localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const tahunParam = urlParams.get('tahun');
    if (tahunParam && !isNaN(parseInt(tahunParam, 10))) {
        activeTahun = parseInt(tahunParam, 10);
    } else {
        try {
            const savedYear = localStorage.getItem('sia_tahun_anggaran') || localStorage.getItem('rab_tahun_anggaran');
            if (savedYear && !isNaN(parseInt(savedYear, 10))) {
                activeTahun = parseInt(savedYear, 10);
            }
        } catch (_) {}
    }

    const selectEl = document.getElementById('select-tahun-notulensi');
    if (selectEl) selectEl.value = activeTahun.toString();

    const formTahunEl = document.getElementById('form-notulensi-tahun');
    if (formTahunEl) formTahunEl.value = activeTahun.toString();

    const labelTahunEl = document.getElementById('label-tahun-tabel');
    if (labelTahunEl) labelTahunEl.innerText = activeTahun;

    // 2. Muat data seluruh notulensi dari server
    loadNotulensiList(activeTahun);
});

// Ganti filter tahun
function gantiTahunNotulensi(tahun) {
    activeTahun = parseInt(tahun, 10) || 2027;
    const labelTahunEl = document.getElementById('label-tahun-tabel');
    if (labelTahunEl) labelTahunEl.innerText = activeTahun;

    const formTahunEl = document.getElementById('form-notulensi-tahun');
    if (formTahunEl) formTahunEl.value = activeTahun.toString();

    loadNotulensiList(activeTahun);
}

// 1. GET: Ambil daftar seluruh notulensi dari server
async function loadNotulensiList(tahun) {
    const tbody = document.getElementById('notulensi-table-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="p-8 text-center text-slate-400 font-medium">
                    <i class="fas fa-spinner fa-spin mr-2"></i> Memuat daftar notulensi tahun ${tahun}...
                </td>
            </tr>
        `;
    }

    try {
        const res = await fetch(`/api/notulensi?tahun=${tahun}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

        const json = await res.json();
        // Multi-Record preservation: Selalu perlakukan respon sebagai array
        if (json && json.success && Array.isArray(json.data)) {
            notulensiList = json.data;
        } else if (Array.isArray(json)) {
            notulensiList = json;
        } else {
            notulensiList = [];
        }

        renderNotulensiTable(notulensiList);
        updateCountBadge(notulensiList.length);
    } catch (err) {
        console.error('❌ Gagal memuat data notulensi:', err);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="p-8 text-center text-rose-500 font-semibold">
                        <i class="fas fa-triangle-exclamation mr-2"></i> Gagal memuat data: ${escapeHtml(err.message)}
                    </td>
                </tr>
            `;
        }
        notulensiList = [];
        updateCountBadge(0);
    }
}

// Update Badge Counter
function updateCountBadge(count) {
    const badge = document.getElementById('notulensi-count-badge');
    if (badge) {
        badge.innerText = `${count} Notulensi Terdaftar`;
    }
}

// 2. Render Tabel Multi-Record
function renderNotulensiTable(list) {
    const tbody = document.getElementById('notulensi-table-body');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="p-12 text-center text-slate-400">
                    <div class="flex flex-col items-center justify-center space-y-2">
                        <i class="fas fa-folder-open text-4xl text-slate-300"></i>
                        <p class="font-bold text-slate-600 text-sm">Belum ada notulensi untuk tahun ${activeTahun}</p>
                        <p class="text-xs text-slate-400">Klik tombol "Tambah Notulensi" untuk mencatat kegiatan rapat baru.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    list.forEach((item, idx) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 border-b border-slate-100 transition-colors";

        const pembahasanArr = Array.isArray(item.pembahasan) ? item.pembahasan : [];
        const poinCount = pembahasanArr.length;

        tr.innerHTML = `
            <td class="p-3 text-center font-bold text-slate-500">${idx + 1}</td>
            <td class="p-3 font-semibold text-slate-800">${escapeHtml(item.tanggal || '-')}</td>
            <td class="p-3 text-slate-600">${escapeHtml(item.waktu || '-')}</td>
            <td class="p-3">
                <div class="font-bold text-indigo-900">${escapeHtml(item.judul || '-')}</div>
                <div class="text-[11px] text-slate-400 mt-0.5">${poinCount} poin pembahasan</div>
            </td>
            <td class="p-3 text-slate-600">${escapeHtml(item.tempat || '-')}</td>
            <td class="p-3 font-semibold text-slate-700">${escapeHtml(item.notulis || '-')}</td>
            <td class="p-3 font-semibold text-slate-700">${escapeHtml(item.pimpinan || '-')}</td>
            <td class="p-3 text-center">
                <div class="flex items-center justify-center gap-1.5">
                    <button onclick="cetakNotulensi(${item.id})" class="p-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-bold text-xs transition" title="Cetak PDF">
                        <i class="fas fa-print"></i>
                    </button>
                    <button onclick="editNotulensi(${item.id})" class="p-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold text-xs transition" title="Edit Notulensi">
                        <i class="fas fa-pen-to-square"></i>
                    </button>
                    <button onclick="hapusNotulensi(${item.id})" class="p-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-xs transition" title="Hapus Notulensi">
                        <i class="fas fa-trash-can"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 3. Filter Notulensi
function filterNotulensiList(query) {
    if (!query || !query.trim()) {
        renderNotulensiTable(notulensiList);
        return;
    }
    const q = query.toLowerCase().trim();
    const filtered = notulensiList.filter(item => {
        const judul = String(item.judul || '').toLowerCase();
        const tempat = String(item.tempat || '').toLowerCase();
        const notulis = String(item.notulis || '').toLowerCase();
        const pimpinan = String(item.pimpinan || '').toLowerCase();
        return judul.includes(q) || tempat.includes(q) || notulis.includes(q) || pimpinan.includes(q);
    });
    renderNotulensiTable(filtered);
}

// 4. Modal Handlers
function bukaModalNotulensi(item = null) {
    const modal = document.getElementById('modalNotulensi');
    const titleEl = document.getElementById('modalNotulensiTitle');
    const form = document.getElementById('formNotulensi');
    if (!modal || !form) return;

    if (item) {
        currentEditingId = item.id;
        if (titleEl) titleEl.innerText = 'Edit Notulensi Rapat';

        document.getElementById('form-notulensi-id').value = item.id;
        document.getElementById('form-notulensi-judul').value = item.judul || '';
        document.getElementById('form-notulensi-tahun').value = (item.tahun || activeTahun).toString();
        document.getElementById('form-notulensi-tanggal').value = item.tanggal || '';
        document.getElementById('form-notulensi-waktu').value = item.waktu || '';
        document.getElementById('form-notulensi-tempat').value = item.tempat || 'Aula Kantor Desa Batetangnga';
        document.getElementById('form-notulensi-peserta').value = item.peserta || '';
        document.getElementById('form-notulensi-notulis').value = item.notulis || 'AHMAD';
        document.getElementById('form-notulensi-pimpinan').value = item.pimpinan || 'SUMAILA DAMANG';

        const container = document.getElementById('pembahasan-container');
        if (container) {
            container.innerHTML = '';
            const pembahasan = Array.isArray(item.pembahasan) ? item.pembahasan : [];
            if (pembahasan.length === 0) {
                tambahBarisPembahasan();
            } else {
                pembahasan.forEach(p => tambahBarisPembahasan(p));
            }
        }
    } else {
        currentEditingId = null;
        if (titleEl) titleEl.innerText = 'Tambah Notulensi Baru';

        form.reset();
        document.getElementById('form-notulensi-id').value = '';
        document.getElementById('form-notulensi-tahun').value = activeTahun.toString();
        document.getElementById('form-notulensi-tempat').value = 'Aula Kantor Desa Batetangnga';
        document.getElementById('form-notulensi-notulis').value = 'AHMAD';
        document.getElementById('form-notulensi-pimpinan').value = 'SUMAILA DAMANG';

        const container = document.getElementById('pembahasan-container');
        if (container) {
            container.innerHTML = '';
            tambahBarisPembahasan();
        }
    }

    modal.classList.remove('hidden');
}

function tutupModalNotulensi() {
    const modal = document.getElementById('modalNotulensi');
    if (modal) modal.classList.add('hidden');
    currentEditingId = null;
}

// 5. Tambah & Hapus Baris Pembahasan Dinamis
function tambahBarisPembahasan(val = '') {
    const container = document.getElementById('pembahasan-container');
    if (!container) return;

    const div = document.createElement('div');
    div.className = "flex items-center gap-2 pembahasan-row";
    div.innerHTML = `
        <span class="text-slate-400 text-xs font-bold w-5 text-center">&bull;</span>
        <input type="text" value="${escapeHtml(val)}" placeholder="Poin pembahasan atau keputusan rapat..." class="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-medium text-slate-800">
        <button type="button" onclick="this.parentElement.remove()" class="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg font-bold text-xs" title="Hapus baris">
            <i class="fas fa-trash-can"></i>
        </button>
    `;
    container.appendChild(div);
}

// 6. Simpan Form (POST / PUT) dengan Perlindungan Multi-Record
async function simpanNotulensiForm(event) {
    event.preventDefault();
    const btnSimpan = document.getElementById('btn-simpan-notulensi');
    const originalText = btnSimpan ? btnSimpan.innerHTML : 'Simpan Notulensi';

    if (btnSimpan) {
        btnSimpan.disabled = true;
        btnSimpan.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Menyimpan...';
    }

    try {
        const id = currentEditingId;
        const judul = document.getElementById('form-notulensi-judul')?.value || '';
        const tahun = parseInt(document.getElementById('form-notulensi-tahun')?.value || activeTahun, 10);
        const tanggal = document.getElementById('form-notulensi-tanggal')?.value || '';
        const waktu = document.getElementById('form-notulensi-waktu')?.value || '';
        const tempat = document.getElementById('form-notulensi-tempat')?.value || '';
        const peserta = document.getElementById('form-notulensi-peserta')?.value || '';
        const notulis = document.getElementById('form-notulensi-notulis')?.value || 'AHMAD';
        const pimpinan = document.getElementById('form-notulensi-pimpinan')?.value || 'SUMAILA DAMANG';

        // Kumpulkan poin pembahasan
        const rows = document.querySelectorAll('#pembahasan-container .pembahasan-row input');
        const pembahasan = [];
        rows.forEach(input => {
            const text = input.value.trim();
            if (text) pembahasan.push(text);
        });

        const payload = {
            tahun,
            judul,
            tanggal,
            waktu,
            tempat,
            peserta,
            pembahasan,
            notulis,
            pimpinan
        };

        let res;
        if (id) {
            // Edit existing record
            res = await fetch(`/api/notulensi/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            // Insert new record (never overwriting others)
            res = await fetch('/api/notulensi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        const json = await res.json().catch(() => null);
        if (!res.ok || !json || !json.success) {
            const errMsg = (json && (json.error || json.message)) ? (json.error || json.message) : `HTTP ${res.status}`;
            throw new Error(errMsg);
        }

        tutupModalNotulensi();
        alert(id ? '✅ Notulensi berhasil diperbarui!' : '✅ Notulensi baru berhasil disimpan!');

        // CRITICAL: Refresh full list from server to preserve all records!
        await loadNotulensiList(activeTahun);

    } catch (err) {
        console.error('❌ Gagal menyimpan notulensi:', err);
        alert(`❌ Gagal menyimpan: ${err.message}`);
    } finally {
        if (btnSimpan) {
            btnSimpan.disabled = false;
            btnSimpan.innerHTML = originalText;
        }
    }
}

// 7. Edit Action
function editNotulensi(id) {
    const item = notulensiList.find(n => n.id === id);
    if (!item) {
        alert('⚠️ Data notulensi tidak ditemukan.');
        return;
    }
    bukaModalNotulensi(item);
}

// 8. Hapus Action
async function hapusNotulensi(id) {
    const item = notulensiList.find(n => n.id === id);
    const judul = item ? item.judul : `ID ${id}`;
    if (!confirm(`Hapus notulensi "${judul}"? Tindakan ini tidak dapat dibatalkan.`)) {
        return;
    }

    try {
        const res = await fetch(`/api/notulensi/${id}`, { method: 'DELETE' });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json || !json.success) {
            throw new Error((json && (json.error || json.message)) || `HTTP ${res.status}`);
        }
        alert('✅ Notulensi berhasil dihapus!');
        await loadNotulensiList(activeTahun);
    } catch (err) {
        console.error('❌ Gagal menghapus notulensi:', err);
        alert(`❌ Gagal menghapus: ${err.message}`);
    }
}

// 9. Cetak Dokumen Resmi PDF
function cetakNotulensi(id) {
    const item = notulensiList.find(n => n.id === id);
    if (!item) {
        alert('⚠️ Data notulensi tidak ditemukan.');
        return;
    }

    const pembahasan = Array.isArray(item.pembahasan) ? item.pembahasan : [];
    let pembahasanHtml = '';
    if (pembahasan.length > 0) {
        pembahasan.forEach((p, i) => {
            pembahasanHtml += `<li style="margin-bottom: 6px;">${escapeHtml(p)}</li>`;
        });
    } else {
        pembahasanHtml = '<li>-</li>';
    }

    const printWin = window.open('', '_blank');
    printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Notulensi - ${escapeHtml(item.judul || 'Rapat')}</title>
            <style>
                @page { size: portrait; margin: 15mm; }
                body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000; line-height: 1.5; margin: 0; padding: 10px; }
                .text-center { text-align: center; }
                .font-bold { font-weight: bold; }
                .uppercase { text-transform: uppercase; }
                
                /* KOP RESMI */
                .kop-header { text-align: center; border-bottom: 2.5px solid #000; padding-bottom: 8px; margin-bottom: 15px; }
                .kop-header h4 { margin: 0; font-size: 12pt; font-weight: bold; }
                .kop-header h3 { margin: 2px 0; font-size: 14pt; font-weight: bold; }
                .kop-header p { margin: 2px 0; font-size: 10pt; font-style: italic; }

                /* JUDUL */
                .doc-title { text-align: center; margin: 20px 0 15px 0; }
                .doc-title h3 { margin: 0; font-size: 13pt; text-decoration: underline; font-weight: bold; }

                /* METADATA */
                table.meta-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11pt; }
                table.meta-table td { padding: 4px 6px; vertical-align: top; }
                .meta-label { width: 160px; font-weight: bold; }
                .meta-colon { width: 15px; text-align: center; }

                /* PEMBAHASAN */
                .pembahasan-box { margin-top: 15px; }
                .pembahasan-box h4 { margin: 0 0 8px 0; font-size: 11pt; font-weight: bold; }
                ol.pembahasan-list { margin: 0; padding-left: 24px; font-size: 11pt; }

                /* TANDA TANGAN */
                .ttd-wrapper { margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid; text-align: center; font-size: 11pt; }
                .ttd-box { width: 45%; min-width: 220px; }
                .ttd-nama { font-weight: bold; display: inline-block; min-width: 180px; border-bottom: 1.5px solid #000; padding-bottom: 2px; }
            </style>
        </head>
        <body>
            <div class="kop-header">
                <h4>PEMERINTAH KABUPATEN POLEWALI MANDAR</h4>
                <h4>KECAMATAN BINUANG</h4>
                <h3>DESA BATETANGNGA</h3>
                <p>Alamat: Jalan Poros Batetangnga, Kode Pos 91353</p>
            </div>

            <div class="doc-title">
                <h3 class="uppercase">NOTULENSI RAPAT / KEGIATAN</h3>
                <p style="margin: 3px 0; font-size: 11pt;">TAHUN ANGGARAN ${item.tahun || activeTahun}</p>
            </div>

            <table class="meta-table">
                <tr>
                    <td class="meta-label">Agenda / Kegiatan</td>
                    <td class="meta-colon">:</td>
                    <td class="font-bold">${escapeHtml(item.judul || '-')}</td>
                </tr>
                <tr>
                    <td class="meta-label">Hari / Tanggal</td>
                    <td class="meta-colon">:</td>
                    <td>${escapeHtml(item.tanggal || '-')}</td>
                </tr>
                <tr>
                    <td class="meta-label">Waktu</td>
                    <td class="meta-colon">:</td>
                    <td>${escapeHtml(item.waktu || '-')}</td>
                </tr>
                <tr>
                    <td class="meta-label">Tempat</td>
                    <td class="meta-colon">:</td>
                    <td>${escapeHtml(item.tempat || '-')}</td>
                </tr>
                <tr>
                    <td class="meta-label">Peserta Hadir</td>
                    <td class="meta-colon">:</td>
                    <td>${escapeHtml(item.peserta || '-')}</td>
                </tr>
            </table>

            <div class="pembahasan-box">
                <h4>HASIL PEMBAHASAN &amp; KEPUTUSAN :</h4>
                <ol class="pembahasan-list">
                    ${pembahasanHtml}
                </ol>
            </div>

            <div class="ttd-wrapper">
                <div class="ttd-box">
                    <p style="margin:0;">Notulis / Sekretaris,</p>
                    <div style="height: 60px;"></div>
                    <p class="ttd-nama">${escapeHtml(item.notulis || 'AHMAD')}</p>
                </div>
                <div class="ttd-box">
                    <p style="margin:0;">Pimpinan Musyawarah / Rapat,</p>
                    <div style="height: 60px;"></div>
                    <p class="ttd-nama">${escapeHtml(item.pimpinan || 'SUMAILA DAMANG')}</p>
                </div>
            </div>

            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `);
    printWin.document.close();
}

// Window scope exports
if (typeof window !== 'undefined') {
    window.loadNotulensiList = loadNotulensiList;
    window.gantiTahunNotulensi = gantiTahunNotulensi;
    window.bukaModalNotulensi = bukaModalNotulensi;
    window.tutupModalNotulensi = tutupModalNotulensi;
    window.tambahBarisPembahasan = tambahBarisPembahasan;
    window.simpanNotulensiForm = simpanNotulensiForm;
    window.editNotulensi = editNotulensi;
    window.hapusNotulensi = hapusNotulensi;
    window.cetakNotulensi = cetakNotulensi;
    window.filterNotulensiList = filterNotulensiList;
}
