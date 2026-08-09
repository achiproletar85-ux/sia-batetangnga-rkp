// ============================================
// VERIFIKASI PROPOSAL & RAB MODULE JS
// ============================================

const ITEMS_PEMERIKSAAN = [
    "Sketsa lokasi kegiatan",
    "Dokumen survey teknis",
    "Gambar desain",
    "Perhitungan volume",
    "Survey harga bahan dan alat",
    "Kesepakatan pembayaran upah kerja",
    "Perhitungan RAB",
    "Kajian dampak lingkungan",
    "Pernyataan hibah lahan",
    "Pernyataan tidak minta ganti rugi",
    "Kesanggupan swadaya",
    "Rencana penggunaan alat berat",
    "Pernyataan kesiapan warga",
    "Data pemanfaat"
];

let verifikasiList = [];
let currentVerifikasiId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadVerifikasiList();
    setupEventListeners();
});

function setupEventListeners() {
    ['input-wakil-masyarakat', 'input-pendamping-profesional', 'input-dinas-instansi', 'input-tanggal'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', updateTTDText);
        document.getElementById(id)?.addEventListener('change', updateTTDText);
    });
    updateTTDText();
}

function updateTTDText() {
    const wakil = document.getElementById('input-wakil-masyarakat')?.value || 'H. ABDULLAH';
    const pendamping = document.getElementById('input-pendamping-profesional')?.value || 'RAHMAN, ST';
    const dinas = document.getElementById('input-dinas-instansi')?.value || 'IR. M. YUSUF';
    const tgl = document.getElementById('input-tanggal')?.value || '2026-08-02';

    if (document.getElementById('ttd-wakil-masyarakat')) document.getElementById('ttd-wakil-masyarakat').innerText = wakil.toUpperCase();
    if (document.getElementById('ttd-pendamping-profesional')) document.getElementById('ttd-pendamping-profesional').innerText = pendamping.toUpperCase();
    if (document.getElementById('ttd-dinas-instansi')) document.getElementById('ttd-dinas-instansi').innerText = dinas.toUpperCase();

    if (tgl) {
        const parts = tgl.split('-');
        if (parts.length === 3) {
            const bulanNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            const formattedDate = `${parts[2]} ${bulanNames[parseInt(parts[1]) - 1]} ${parts[0]}`;
            if (document.getElementById('text-tanggal-ttd')) document.getElementById('text-tanggal-ttd').innerText = formattedDate;
        }
    }
}

window.addEventListener('tahunChanged', (e) => {
    if (e && e.detail && e.detail.tahun) {
        if (typeof loadVerifikasiList === 'function') loadVerifikasiList();
    }
});

// 1. Load List Data Verifikasi & RAB List
function loadVerifikasiList() {
    const tahun = localStorage.getItem('ACTIVE_TAHUN_ANGGARAN') || document.getElementById('select-tahun')?.value || '2027';
    console.log(`📥 Loading verifikasi proposal for tahun ${tahun}...`);

    loadKegiatanRAB();

    fetch(`/api/verifikasi-proposal?tahun=${tahun}`)
        .then(res => res.json())
        .then(data => {
            if (data.success && Array.isArray(data.data)) {
                verifikasiList = data.data;
            } else {
                verifikasiList = [];
            }
            renderSelectDropdown();
        })
        .catch(err => {
            console.error('❌ Error loading verifikasi list:', err);
            verifikasiList = [];
            renderSelectDropdown();
        });
}

function loadKegiatanRAB() {
    const tahun = document.getElementById('select-tahun')?.value || '2027';
    console.log(`📥 Loading RAB list for verifikasi proposal tahun ${tahun}...`);

    fetch(`/api/verifikasi-proposal/rab-list?tahun=${tahun}`)
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('select-kegiatan-rab');
            if (!select) return;
            select.innerHTML = '<option value="">-- Pilih Kegiatan dari RAB --</option>';

            if (data.success && Array.isArray(data.data)) {
                data.data.forEach(item => {
                    const opt = document.createElement('option');
                    opt.value = JSON.stringify(item);
                    opt.textContent = `${item.nama_kegiatan || item.uraian || item.kegiatan || '-'} (${item.bidang || 'Pembangunan'})`;
                    select.appendChild(opt);
                });
            }
        })
        .catch(err => {
            console.error('❌ Error loadKegiatanRAB:', err);
        });
}

function pilihKegiatanRAB() {
    const select = document.getElementById('select-kegiatan-rab');
    const val = select?.value;
    if (!val) return;

    try {
        const item = JSON.parse(val);
        if (document.getElementById('input-bidang')) document.getElementById('input-bidang').value = item.bidang || 'Bidang Pembangunan Desa';
        if (document.getElementById('input-kegiatan')) document.getElementById('input-kegiatan').value = item.nama_kegiatan || item.uraian || item.kegiatan || '';
        if (document.getElementById('input-lokasi')) document.getElementById('input-lokasi').value = item.lokasi || 'Desa Batetangnga';
        if (document.getElementById('input-volume')) document.getElementById('input-volume').value = item.volume || item.volume_satuan || '1 Paket';
    } catch (err) {
        console.error('❌ Error parsing RAB option:', err);
    }
}

function renderSelectDropdown() {
    const select = document.getElementById('select-verifikasi');
    if (!select) return;

    select.innerHTML = '<option value="new">+ Buat Verifikasi Baru</option>';
    verifikasiList.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.innerText = `${item.kegiatan || 'Tanpa Nama'} (${item.lokasi || 'Batetangnga'})`;
        select.appendChild(opt);
    });

    if (currentVerifikasiId) {
        select.value = currentVerifikasiId;
        const activeItem = verifikasiList.find(i => String(i.id) === String(currentVerifikasiId));
        if (activeItem) {
            populateForm(activeItem);
            return;
        }
    }

    if (verifikasiList.length > 0) {
        select.value = verifikasiList[0].id;
        currentVerifikasiId = verifikasiList[0].id;
        populateForm(verifikasiList[0]);
    } else {
        buatVerifikasiBaru();
    }
}

function pilihVerifikasi() {
    const val = document.getElementById('select-verifikasi')?.value;
    if (val === 'new') {
        buatVerifikasiBaru();
    } else {
        currentVerifikasiId = val;
        const item = verifikasiList.find(i => String(i.id) === String(val));
        if (item) populateForm(item);
    }
}

function buatVerifikasiBaru() {
    currentVerifikasiId = null;
    document.getElementById('select-verifikasi').value = 'new';

    document.getElementById('input-bidang').value = 'Bidang Pembangunan Desa';
    document.getElementById('input-kegiatan').value = '';
    document.getElementById('input-lokasi').value = 'Desa Batetangnga';
    document.getElementById('input-volume').value = '1 Paket';
    document.getElementById('input-tanggal').value = '2026-08-02';

    const radios = document.getElementsByName('hasil_layak');
    if (radios.length > 0) radios[0].checked = true;

    document.getElementById('input-wakil-masyarakat').value = 'H. ABDULLAH';
    document.getElementById('input-pendamping-profesional').value = 'RAHMAN, ST';
    document.getElementById('input-dinas-instansi').value = 'IR. M. YUSUF';
    document.getElementById('input-catatan').value = '';

    render14Items(null);
    updateTTDText();
}

function populateForm(item) {
    currentVerifikasiId = item.id;
    document.getElementById('input-bidang').value = item.bidang || '';
    document.getElementById('input-kegiatan').value = item.kegiatan || '';
    document.getElementById('input-lokasi').value = item.lokasi || '';
    document.getElementById('input-volume').value = item.volume || '';
    if (item.tanggal_pemeriksaan) {
        document.getElementById('input-tanggal').value = item.tanggal_pemeriksaan.split('T')[0];
    }

    const radios = document.getElementsByName('hasil_layak');
    if (radios.length > 0) {
        radios[0].checked = Boolean(item.hasil_layak);
        if (radios.length > 1) radios[1].checked = !Boolean(item.hasil_layak);
    }

    document.getElementById('input-wakil-masyarakat').value = item.wakil_masyarakat || 'H. ABDULLAH';
    document.getElementById('input-pendamping-profesional').value = item.pendamping_profesional || 'RAHMAN, ST';
    document.getElementById('input-dinas-instansi').value = item.dinas_instansi || 'IR. M. YUSUF';
    document.getElementById('input-catatan').value = item.catatan || '';

    render14Items(item);
    updateTTDText();
}

// 2. Render 14 Item Tabel
function render14Items(itemData) {
    const tbody = document.getElementById('tabel-14-item');
    if (!tbody) return;

    tbody.innerHTML = '';

    ITEMS_PEMERIKSAAN.forEach((title, idx) => {
        const itemKey = `item${idx + 1}`;
        const val = itemData ? (itemData[itemKey] || 'Ada & Memenuhi Syarat') : 'Ada & Memenuhi Syarat';

        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 border-b border-slate-200 text-xs";

        tr.innerHTML = `
            <td class="p-2 text-center font-bold text-slate-600 border border-slate-300">${idx + 1}</td>
            <td class="p-2 font-semibold text-slate-800 border border-slate-300">${title}</td>
            <td class="p-1 border border-slate-300">
                <select id="select-item-${idx + 1}" class="w-full p-1.5 text-xs border border-slate-300 rounded outline-none focus:border-indigo-500 font-medium">
                    <option value="Ada & Memenuhi Syarat" ${val === 'Ada & Memenuhi Syarat' ? 'selected' : ''}>✅ Ada &amp; Memenuhi Syarat</option>
                    <option value="Ada & Tidak Memenuhi Syarat" ${val === 'Ada & Tidak Memenuhi Syarat' ? 'selected' : ''}>⚠️ Ada &amp; Tidak Memenuhi Syarat</option>
                    <option value="Tidak Ada" ${val === 'Tidak Ada' ? 'selected' : ''}>❌ Tidak Ada</option>
                </select>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 3. Simpan Verifikasi ke Database
async function simpanVerifikasi() {
    const tahun = parseInt(document.getElementById('select-tahun')?.value || '2027');
    const kegiatan = document.getElementById('input-kegiatan')?.value || '';

    if (!kegiatan.trim()) {
        alert('⚠️ Nama Kegiatan wajib diisi!');
        return;
    }

    const radios = document.getElementsByName('hasil_layak');
    let hasilLayak = true;
    if (radios.length > 0) {
        hasilLayak = radios[0].checked;
    }

    const payload = {
        tahun: tahun,
        bidang: document.getElementById('input-bidang')?.value || '',
        kegiatan: kegiatan,
        lokasi: document.getElementById('input-lokasi')?.value || '',
        volume: document.getElementById('input-volume')?.value || '',
        tanggal_pemeriksaan: document.getElementById('input-tanggal')?.value || null,
        hasil_layak: hasilLayak,
        wakil_masyarakat: document.getElementById('input-wakil-masyarakat')?.value || '',
        pendamping_profesional: document.getElementById('input-pendamping-profesional')?.value || '',
        dinas_instansi: document.getElementById('input-dinas-instansi')?.value || '',
        catatan: document.getElementById('input-catatan')?.value || ''
    };

    // Gather 14 items
    for (let i = 1; i <= 14; i++) {
        payload[`item${i}`] = document.getElementById(`select-item-${i}`)?.value || 'Ada & Memenuhi Syarat';
    }

    console.log("💾 Saving verifikasi proposal:", payload);

    try {
        let res;
        if (currentVerifikasiId) {
            payload.id = currentVerifikasiId;
            res = await fetch('/api/verifikasi-proposal', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch('/api/verifikasi-proposal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        const json = await res.json();
        if (json.success) {
            alert('✅ Verifikasi proposal berhasil disimpan ke database!');
            if (json.data && json.data.id) {
                currentVerifikasiId = json.data.id;
            }
            loadVerifikasiList();
        } else {
            alert('❌ Gagal menyimpan: ' + json.error);
        }
    } catch (err) {
        console.error('❌ Error simpanVerifikasi:', err);
        alert('❌ Terjadi kesalahan saat menghubungi server');
    }
}

// 4. Hapus Verifikasi
async function hapusVerifikasi() {
    if (!currentVerifikasiId) {
        alert('⚠️ Pilih data verifikasi yang ingin dihapus');
        return;
    }

    const kegiatan = document.getElementById('input-kegiatan')?.value || 'Dokumen ini';
    if (!confirm(`Hapus verifikasi proposal untuk kegiatan "${kegiatan}"?`)) return;

    try {
        const res = await fetch(`/api/verifikasi-proposal?id=${currentVerifikasiId}`, { method: 'DELETE' });
        const json = await res.json();

        if (json.success) {
            alert('✅ Verifikasi proposal berhasil dihapus!');
            currentVerifikasiId = null;
            loadVerifikasiList();
        } else {
            alert('❌ Gagal menghapus: ' + json.error);
        }
    } catch (err) {
        console.error('❌ Error hapusVerifikasi:', err);
        alert('❌ Gagal menghapus data');
    }
}

// 5. Cetak PDF / Print Window
function printPDF() {
    const tahun = document.getElementById('select-tahun')?.value || '2027';
    const bidang = document.getElementById('input-bidang')?.value || '-';
    const kegiatan = document.getElementById('input-kegiatan')?.value || '-';
    const lokasi = document.getElementById('input-lokasi')?.value || 'Desa Batetangnga';
    const volume = document.getElementById('input-volume')?.value || '-';
    const tgl = document.getElementById('input-tanggal')?.value || '2026-08-02';

    const radios = document.getElementsByName('hasil_layak');
    const isLayak = radios.length > 0 ? radios[0].checked : true;

    const wakil = document.getElementById('input-wakil-masyarakat')?.value || 'H. ABDULLAH';
    const pendamping = document.getElementById('input-pendamping-profesional')?.value || 'RAHMAN, ST';
    const dinas = document.getElementById('input-dinas-instansi')?.value || 'IR. M. YUSUF';
    const catatan = document.getElementById('input-catatan')?.value || '-';

    let formattedDate = tgl;
    const parts = tgl.split('-');
    if (parts.length === 3) {
        const bulanNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        formattedDate = `${parts[2]} ${bulanNames[parseInt(parts[1]) - 1]} ${parts[0]}`;
    }

    let itemsRowsHtml = '';
    ITEMS_PEMERIKSAAN.forEach((title, idx) => {
        const val = document.getElementById(`select-item-${idx + 1}`)?.value || 'Ada & Memenuhi Syarat';
        let badge = '✅ Ada & Memenuhi Syarat';
        if (val === 'Ada & Tidak Memenuhi Syarat') badge = '⚠️ Ada & Tidak Memenuhi Syarat';
        if (val === 'Tidak Ada') badge = '❌ Tidak Ada';

        itemsRowsHtml += `
            <tr>
                <td style="text-align: center; border: 1px solid #000; padding: 4px;">${idx + 1}</td>
                <td style="border: 1px solid #000; padding: 4px;">${title}</td>
                <td style="border: 1px solid #000; padding: 4px; font-weight: bold;">${badge}</td>
            </tr>
        `;
    });

    const printWin = window.open('', '_blank');
    printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>PEMERIKSAAN PROPOSAL DAN RAB - ${kegiatan}</title>
            <style>
                @page { size: portrait; margin: 12mm; }
                body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10.5px; color: #000; margin: 0; padding: 10px; }
                .text-center { text-align: center; }
                .font-bold { font-weight: bold; }
                .uppercase { text-transform: uppercase; }
                table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 10px; }
                th { border: 1.5px solid #000; background-color: #f1f5f9; padding: 5px; font-weight: bold; text-align: center; }
                td { border: 1px solid #000; padding: 4px 6px; }
                .meta-table td { border: none; padding: 2px 4px; font-weight: bold; }
                .ttd-wrapper { margin-top: 35px; display: flex; justify-content: space-between; page-break-inside: avoid; text-align: center; }
                .ttd-box { width: 30%; }
                .ttd-jabatan { font-weight: bold; margin-bottom: 50px; }
                .ttd-nama { font-weight: bold; text-decoration: underline; text-transform: uppercase; }
            </style>
        </head>
        <body>
            <div class="text-center">
                <h2 style="margin: 0; font-size: 14px;" class="font-bold uppercase">PEMERIKSAAN PROPOSAL DAN RAB</h2>
                <p style="margin: 3px 0;" class="font-bold uppercase">DESA BATETANGNGA KECAMATAN BINUANG KABUPATEN POLEWALI MANDAR</p>
                <p style="margin: 2px 0;" class="font-bold uppercase">PROVINSI SULAWESI BARAT - TAHUN ${tahun}</p>
            </div>

            <table class="meta-table" style="margin-top: 15px; border: 1px solid #000; padding: 8px;">
                <tr>
                    <td style="width: 130px;">1. BIDANG</td>
                    <td>: ${bidang}</td>
                </tr>
                <tr>
                    <td>2. KEGIATAN</td>
                    <td>: ${kegiatan}</td>
                </tr>
                <tr>
                    <td>3. LOKASI</td>
                    <td>: ${lokasi}</td>
                </tr>
                <tr>
                    <td>4. VOLUME</td>
                    <td>: ${volume}</td>
                </tr>
                <tr>
                    <td>5. TGL PEMERIKSAAN</td>
                    <td>: ${formattedDate}</td>
                </tr>
            </table>

            <h4 style="margin-top: 15px; margin-bottom: 5px;">DOKUMEN DAN KELENGKAPAN YANG DIPERIKSA (14 ITEM)</h4>
            <table>
                <thead>
                    <tr>
                        <th style="width: 35px;">NO</th>
                        <th>JENIS DOKUMEN / KELENGKAPAN</th>
                        <th style="width: 220px;">STATUS KELENGKAPAN</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRowsHtml}
                </tbody>
            </table>

            <div style="margin-top: 15px; border: 1.5px solid #000; padding: 8px; font-weight: bold;">
                HASIL PEMERIKSAAN: <span style="font-size: 12px; text-transform: uppercase; text-decoration: underline;">${isLayak ? '✅ LAYAK (Diteruskan ke RKPDes)' : '❌ TIDAK LAYAK (Perlu Perbaikan)'}</span>
            </div>

            <div style="margin-top: 10px; border: 1px solid #000; padding: 8px;">
                <strong>CATATAN / REKOMENDASI:</strong>
                <p style="margin: 4px 0 0 0; white-space: pre-wrap;">${catatan}</p>
            </div>

            <p style="text-align: center; margin-top: 25px; font-weight: bold;">Batetangnga, ${formattedDate}</p>
            <div class="ttd-wrapper">
                <div class="ttd-box">
                    <p class="ttd-jabatan">Wakil Masyarakat</p>
                    <p class="ttd-nama">${wakil}</p>
                </div>
                <div class="ttd-box">
                    <p class="ttd-jabatan">Pendamping Profesional</p>
                    <p class="ttd-nama">${pendamping}</p>
                </div>
                <div class="ttd-box">
                    <p class="ttd-jabatan">Dinas / Instansi Terkait</p>
                    <p class="ttd-nama">${dinas}</p>
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
