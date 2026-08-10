// ============================================
// RKTL (RENCANA KERJA DAN TINDAK LANJUT) JS
// ============================================

const DEFAULT_RKTL_STEPS = [
    {
        uraian: "Rembuk Stunting",
        keterangan: "BA Rembuk Stunting"
    },
    {
        uraian: "Pembentukan Tim Penyusun RKP Desa",
        keterangan: "Musyawarah Mufakat"
    },
    {
        uraian: "Pencermatan dan penyelarasan rencana kegiatan dan pembiayaan Pembangunan Desa",
        keterangan: "Mencermati: Dok. RPJMD, Renstra OPD, RPKD, Jasmas, Pagu Indikatif Desa: DD, ADD, BHP, BKK, dll."
    },
    {
        uraian: "Pencermatan Ulang RPJM Desa",
        keterangan: "Dok. RPJM Desa, Hasil Laju Capaian SDGs Desa"
    },
    {
        uraian: "Penyusunan Rancangan RKP Desa dan DU-RKP Desa",
        keterangan: "Berdasarkan daftar rencana program dan kegiatan yang masuk ke Desa, data dan informasi tentang rencana pembiayaan Pembangunan Desa, data dan informasi hasil pencermatan RPJM Desa, daftar kegiatan yang mendukung penanganan aksi program prioritas nasional (konvergensi pencegahan stunting, dll)"
    },
    {
        uraian: "Musrenbang Desa pembahasan rancangan RKP Desa dan Daftar Usulan RKP Desa",
        keterangan: "Menetapkan prioritas, program, kegiatan, dan kebutuhan Pembangunan Desa yang didanai oleh APB Desa, swadaya, dan/atau APBD dan APBN."
    },
    {
        uraian: "Musyawarah Desa tentang pembahasan dan pengesahan PERDES RKP Desa dan DU-RKP Desa",
        keterangan: "Membahas, menetapkan dan mengesahkan dokumen RKP Desa dan DU-RKP Desa dengan penandatangan Peraturan Desa tentang RKP Desa oleh Kepala Desa dan Ketua BPD."
    }
];

const DEFAULT_TIM_PENYUSUN = [
    { nama: "SUMAILA DAMANG", jabatan_tim: "Pembina" },
    { nama: "SYARIFUDDIN", jabatan_tim: "Ketua" },
    { nama: "BUSTAMIN. B", jabatan_tim: "Sekretaris" },
    { nama: "MISBAHUDDIN", jabatan_tim: "Anggota" }
];

let rktlRowsData = [];
let timPenyusunData = [];

document.addEventListener('DOMContentLoaded', () => {
    loadRKTLData();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('select-tahun')?.addEventListener('change', () => {
        const tahun = document.getElementById('select-tahun').value;
        if (document.getElementById('judul-tahun-doc')) {
            document.getElementById('judul-tahun-doc').innerText = tahun;
        }
    });
}

window.addEventListener('tahunChanged', (e) => {
    if (e && e.detail && e.detail.tahun) {
        if (typeof loadRKTLData === 'function') loadRKTLData();
    }
});

// 1. Load Data RKTL dari Database per Tahun
async function loadRKTLData() {
    const tahun = localStorage.getItem('ACTIVE_TAHUN_ANGGARAN') || document.getElementById('select-tahun')?.value || '2027';
    if (document.getElementById('judul-tahun-doc')) {
        document.getElementById('judul-tahun-doc').innerText = tahun;
    }
    console.log(`📥 Loading RKTL & Master Tim data for tahun ${tahun}...`);

    try {
        // Fetch Master Tim Penyusun first
        const timRes = await fetch(`/api/tim-penyusun?tahun=${tahun}`);
        const timJson = await timRes.json();

        if (timJson.success && Array.isArray(timJson.data) && timJson.data.length > 0) {
            timPenyusunData = timJson.data.map(item => ({
                nama: item.nama || '',
                jabatan: item.jabatan_tim || item.jabatan || 'Anggota',
                alamat: item.alamat || 'Batetangnga',
                unsur: item.unsur || 'Masyarakat'
            }));
        } else {
            timPenyusunData = JSON.parse(JSON.stringify(DEFAULT_TIM_PENYUSUN));
        }

        // Fetch RKTL data
        const rktlRes = await fetch(`/api/rktl?tahun=${tahun}`);
        const rktlJson = await rktlRes.json();

        if (rktlJson.success && Array.isArray(rktlJson.data) && rktlJson.data.length > 0) {
            rktlRowsData = rktlJson.data;
            const first = rktlJson.data[0];
            if (first.tanggal_ttd && document.getElementById('input-tanggal-ttd')) {
                document.getElementById('input-tanggal-ttd').value = first.tanggal_ttd.split('T')[0];
            }
            if (first.ketua_tim && document.getElementById('input-ketua-tim')) {
                document.getElementById('input-ketua-tim').value = first.ketua_tim;
            }
            if (first.kepala_desa && document.getElementById('input-kepala-desa')) {
                document.getElementById('input-kepala-desa').value = first.kepala_desa;
            }
            if (document.getElementById('input-fasilitator-nama')) {
                document.getElementById('input-fasilitator-nama').value = first.fasilitator_nama || 'RAHMAN, ST';
            }
            if (document.getElementById('input-fasilitator-jabatan')) {
                document.getElementById('input-fasilitator-jabatan').value = first.fasilitator_jabatan || 'Pendamping Desa';
            }
        } else {
            rktlRowsData = JSON.parse(JSON.stringify(DEFAULT_RKTL_STEPS));
        }

        renderRKTLTable();
        renderTimPenyusunTable();
    } catch (err) {
        console.error('❌ Error loading RKTL data:', err);
        rktlRowsData = JSON.parse(JSON.stringify(DEFAULT_RKTL_STEPS));
        timPenyusunData = JSON.parse(JSON.stringify(DEFAULT_TIM_PENYUSUN));
        renderRKTLTable();
        renderTimPenyusunTable();
    }
}

// 2. Render Tabel Agenda RKTL (Semua Uraian Editable & Fleksibel Baris)
function renderRKTLTable() {
    const tbody = document.getElementById('tabel-rktl-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    const list = (rktlRowsData && rktlRowsData.length > 0) ? rktlRowsData : DEFAULT_RKTL_STEPS;
    const countLabel = document.getElementById('jumlah-rktl-count');
    if (countLabel) countLabel.innerText = list.length;

    list.forEach((item, idx) => {
        const uraianVal = item.uraian !== undefined ? item.uraian : '';
        const tglVal = item.tanggal_tempat || '';
        const ketVal = item.keterangan !== undefined ? item.keterangan : '';

        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 border-b border-slate-200 text-xs";

        tr.innerHTML = `
            <td class="p-2 text-center font-bold text-slate-600 border border-slate-300">${idx + 1}</td>
            <td class="p-1 border border-slate-300">
                <textarea id="uraian-rktl-${idx}" rows="2" onchange="updateRKTLRowData(${idx}, 'uraian', this.value)" class="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded outline-none resize-y font-bold text-slate-800" placeholder="Uraian Kegiatan Agenda...">${String(uraianVal).replace(/"/g, '&quot;')}</textarea>
            </td>
            <td class="p-1 border border-slate-300">
                <input type="text" id="tgl-rktl-${idx}" value="${String(tglVal).replace(/"/g, '&quot;')}" onchange="updateRKTLRowData(${idx}, 'tanggal_tempat', this.value)" class="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded outline-none text-center font-semibold" placeholder="Tanggal & Tempat...">
            </td>
            <td class="p-1 border border-slate-300">
                <textarea id="ket-rktl-${idx}" rows="2" onchange="updateRKTLRowData(${idx}, 'keterangan', this.value)" class="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded outline-none resize-y text-slate-700 font-medium" placeholder="Keterangan...">${String(ketVal).replace(/"/g, '&quot;')}</textarea>
            </td>
            <td class="p-1 text-center border border-slate-300 no-print">
                <button onclick="hapusBarisRKTL(${idx})" class="text-rose-600 hover:text-rose-800 p-1 font-bold text-xs" title="Hapus Baris Kegiatan">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateRKTLRowData(idx, key, val) {
    if (rktlRowsData[idx]) {
        rktlRowsData[idx][key] = val;
    }
}

function syncCurrentRKTLInputs() {
    const count = rktlRowsData.length;
    for (let i = 0; i < count; i++) {
        const uraian = document.getElementById(`uraian-rktl-${i}`)?.value || '';
        const tgl = document.getElementById(`tgl-rktl-${i}`)?.value || '';
        const ket = document.getElementById(`ket-rktl-${i}`)?.value || '';
        if (rktlRowsData[i]) {
            rktlRowsData[i] = { ...rktlRowsData[i], uraian, tanggal_tempat: tgl, keterangan: ket };
        }
    }
}

function tambahBarisRKTL() {
    syncCurrentRKTLInputs();
    rktlRowsData.push({ uraian: "", tanggal_tempat: "", keterangan: "" });
    renderRKTLTable();
}

function hapusBarisRKTL(index) {
    syncCurrentRKTLInputs();
    if (rktlRowsData.length <= 1) {
        alert('⚠️ Minimal 1 kegiatan RKTL.');
        return;
    }
    const item = rktlRowsData[index];
    if (confirm(`Hapus baris kegiatan "${item.uraian || 'Baris ' + (index + 1)}"?`)) {
        rktlRowsData.splice(index, 1);
        renderRKTLTable();
    }
}

// 3. Render Tabel Tim Penyusun (Fleksibel Tambah / Hapus)
function renderTimPenyusunTable() {
    const tbody = document.getElementById('tabel-tim-penyusun-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    const list = (timPenyusunData && timPenyusunData.length > 0) ? timPenyusunData : DEFAULT_TIM_PENYUSUN;

    const countLabel = document.getElementById('jumlah-tim-count');
    if (countLabel) countLabel.innerText = list.length;

    list.forEach((item, idx) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 border-b border-slate-200 text-xs";

        const ttdColHtml = (idx % 2 === 0) 
            ? `<div class="text-left font-bold text-slate-700 pl-3 text-xs py-2">${idx + 1}. ........................</div>`
            : `<div class="text-right font-bold text-slate-700 pr-3 text-xs py-2">${idx + 1}. ........................</div>`;

        tr.innerHTML = `
            <td class="p-2 text-center font-bold text-slate-600 border border-slate-300">${idx + 1}</td>
            <td class="p-1 border border-slate-300">
                <input type="text" id="tim-nama-${idx}" value="${String(item.nama || '').replace(/"/g, '&quot;')}" onchange="updateTimItemData(${idx}, 'nama', this.value)" class="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded outline-none font-bold uppercase text-slate-800" placeholder="Nama Anggota...">
            </td>
            <td class="p-1 border border-slate-300">
                <input type="text" id="tim-jabatan-${idx}" value="${String(item.jabatan || '').replace(/"/g, '&quot;')}" onchange="updateTimItemData(${idx}, 'jabatan', this.value)" class="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded outline-none font-semibold text-slate-700" placeholder="Jabatan Dalam Tim...">
            </td>
            <td class="p-1 border border-slate-300 text-center">
                ${ttdColHtml}
            </td>
            <td class="p-1 text-center border border-slate-300 no-print">
                <button onclick="hapusAnggotaTim(${idx})" class="text-rose-600 hover:text-rose-800 p-1 font-bold text-xs" title="Hapus Anggota Tim">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateTimItemData(idx, key, val) {
    if (timPenyusunData[idx]) {
        timPenyusunData[idx][key] = val;
    }
}

function syncCurrentTimInputs() {
    const count = timPenyusunData.length;
    for (let i = 0; i < count; i++) {
        const nama = document.getElementById(`tim-nama-${i}`)?.value || '';
        const jabatan = document.getElementById(`tim-jabatan-${i}`)?.value || '';
        if (timPenyusunData[i]) {
            timPenyusunData[i] = { nama, jabatan };
        }
    }
}

function tambahAnggotaTim() {
    syncCurrentTimInputs();
    timPenyusunData.push({ nama: "", jabatan: "Anggota (Perangkat Desa)" });
    renderTimPenyusunTable();
}

function hapusAnggotaTim(index) {
    syncCurrentTimInputs();
    if (timPenyusunData.length <= 1) {
        alert('⚠️ Minimal 1 orang anggota tim penyusun.');
        return;
    }
    const item = timPenyusunData[index];
    if (confirm(`Hapus "${item.nama || 'Anggota Baris ini'}" dari Tim Penyusun?`)) {
        timPenyusunData.splice(index, 1);
        renderTimPenyusunTable();
    }
}

// 4. Reset Default RKTL
function resetDefaultRKTL() {
    if (!confirm('Kembalikan semua isian RKTL, Keterangan, dan Tim Penyusun ke format default?')) return;
    rktlRowsData = JSON.parse(JSON.stringify(DEFAULT_RKTL_STEPS));
    timPenyusunData = JSON.parse(JSON.stringify(DEFAULT_TIM_PENYUSUN));
    document.getElementById('input-kepala-desa').value = 'SUMAILA DAMANG';
    document.getElementById('input-ketua-tim').value = 'ABDUL AZIS, S. Pd';
    document.getElementById('input-tanggal-ttd').value = '2026-08-02';
    if (document.getElementById('input-fasilitator-nama')) document.getElementById('input-fasilitator-nama').value = 'RAHMAN, ST';
    if (document.getElementById('input-fasilitator-jabatan')) document.getElementById('input-fasilitator-jabatan').value = 'Pendamping Desa';
    renderRKTLTable();
    renderTimPenyusunTable();
}

// 5. Simpan Ke Database
async function simpanRKTL() {
    const tahun = parseInt(document.getElementById('select-tahun')?.value || '2027');
    const tglTTD = document.getElementById('input-tanggal-ttd')?.value || '2026-08-02';
    const ketuaTim = document.getElementById('input-ketua-tim')?.value || 'ABDUL AZIS, S. Pd';
    const kepalaDesa = document.getElementById('input-kepala-desa')?.value || 'SUMAILA DAMANG';
    const fasNama = document.getElementById('input-fasilitator-nama')?.value || 'RAHMAN, ST';
    const fasJabatan = document.getElementById('input-fasilitator-jabatan')?.value || 'Pendamping Desa';

    syncCurrentRKTLInputs();
    syncCurrentTimInputs();

    if (rktlRowsData.length === 0) {
        alert('⚠️ Tambahkan minimal 1 baris agenda RKTL!');
        return;
    }

    const itemsData = rktlRowsData.map((row, idx) => ({
        no_urut: idx + 1,
        uraian: row.uraian || '',
        tanggal_tempat: row.tanggal_tempat || '-',
        keterangan: row.keterangan || '',
        tanggal_ttd: tglTTD,
        ketua_tim: ketuaTim,
        kepala_desa: kepalaDesa,
        fasilitator_nama: fasNama,
        fasilitator_jabatan: fasJabatan,
        fasilitator: `${fasNama} (${fasJabatan})`,
        tim_penyusun: timPenyusunData
    }));

    console.log(`💾 Syncing ${itemsData.length} RKTL rows & ${timPenyusunData.length} team members to Supabase for tahun ${tahun}...`);

    try {
        // Sync Master Data Tim Penyusun
        await fetch('/api/tim-penyusun/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tahun: tahun, data: timPenyusunData })
        });

        // Sync RKTL rows
        const res = await fetch('/api/rktl/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tahun: tahun, data: itemsData })
        });
        const json = await res.json();

        if (json.success) {
            alert('✅ Data RKTL & Master Tim Penyusun berhasil disimpan ke database!');
            loadRKTLData();
        } else {
            alert('❌ Gagal menyimpan data RKTL: ' + json.error);
        }
    } catch (err) {
        console.error('❌ Error simpanRKTL:', err);
        alert('❌ Terjadi kesalahan koneksi server');
    }
}

// 6. Copy RKTL Ke Tahun Lain
async function copyKeTahunLain() {
    syncCurrentRKTLInputs();
    syncCurrentTimInputs();

    if (rktlRowsData.length === 0) {
        alert('⚠️ Tidak ada data RKTL untuk dicopy.');
        return;
    }

    const activeTahun = document.getElementById('select-tahun')?.value || '2027';
    const targetTahunStr = prompt(`Masukkan TAHUN tujuan untuk menyalin RKTL dari tahun ${activeTahun} (contoh: 2028):`, '2028');
    if (!targetTahunStr) return;

    const targetTahunInt = parseInt(targetTahunStr.trim());
    if (isNaN(targetTahunInt) || targetTahunInt < 2000 || targetTahunInt > 2100) {
        alert('⚠️ Tahun tujuan tidak valid!');
        return;
    }

    if (targetTahunInt === parseInt(activeTahun)) {
        alert('⚠️ Tahun tujuan harus berbeda dengan tahun saat ini.');
        return;
    }

    if (!confirm(`Salin ${rktlRowsData.length} kegiatan RKTL & ${timPenyusunData.length} anggota tim dari tahun ${activeTahun} ke tahun ${targetTahunInt}?`)) return;

    const tglTTD = document.getElementById('input-tanggal-ttd')?.value || '2026-08-02';
    const ketuaTim = document.getElementById('input-ketua-tim')?.value || 'ABDUL AZIS, S. Pd';
    const kepalaDesa = document.getElementById('input-kepala-desa')?.value || 'SUMAILA DAMANG';
    const fasNama = document.getElementById('input-fasilitator-nama')?.value || 'RAHMAN, ST';
    const fasJabatan = document.getElementById('input-fasilitator-jabatan')?.value || 'Pendamping Desa';

    const copiedPayload = rktlRowsData.map((row, idx) => ({
        no_urut: idx + 1,
        uraian: row.uraian || '',
        tanggal_tempat: row.tanggal_tempat || '-',
        keterangan: row.keterangan || '',
        tanggal_ttd: tglTTD,
        ketua_tim: ketuaTim,
        kepala_desa: kepalaDesa,
        fasilitator_nama: fasNama,
        fasilitator_jabatan: fasJabatan,
        fasilitator: `${fasNama} (${fasJabatan})`,
        tim_penyusun: timPenyusunData
    }));

    try {
        const res = await fetch('/api/rktl/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tahun: targetTahunInt, data: copiedPayload })
        });
        const json = await res.json();
        if (json.success) {
            alert(`✅ Berhasil menyalin data RKTL ke tahun ${targetTahunInt}!`);
            document.getElementById('select-tahun').value = targetTahunInt.toString();
            loadRKTLData();
        } else {
            alert('❌ Gagal menyalin: ' + json.error);
        }
    } catch (err) {
        console.error('❌ Error copyKeTahunLain:', err);
        alert('❌ Terjadi kesalahan saat menghubungi server');
    }
}

// 7. Cetak PDF / Print Window (Format Word Kementrian)
function printPDF() {
    const tahun = document.getElementById('select-tahun')?.value || '2027';
    const kepalaDesa = document.getElementById('input-kepala-desa')?.value || 'SUMAILA DAMANG';
    const ketuaTim = document.getElementById('input-ketua-tim')?.value || 'ABDUL AZIS, S. Pd';
    const tgl = document.getElementById('input-tanggal-ttd')?.value || '2026-08-02';
    const fasNama = document.getElementById('input-fasilitator-nama')?.value || 'RAHMAN, ST';
    const fasJabatan = document.getElementById('input-fasilitator-jabatan')?.value || 'Pendamping Desa';

    let formattedDate = tgl;
    const parts = tgl.split('-');
    if (parts.length === 3) {
        const bulanNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        formattedDate = `${parts[2]} ${bulanNames[parseInt(parts[1]) - 1]} ${parts[0]}`;
    }

    syncCurrentRKTLInputs();

    let rowsHtml = '';
    rktlRowsData.forEach((row, idx) => {
        const uraianVal = row.uraian || '-';
        const tglVal = row.tanggal_tempat || '-';
        const ketVal = row.keterangan || '-';

        rowsHtml += `
            <tr>
                <td style="text-align: center; border: 1px solid #000; padding: 5px; font-weight: bold;">${idx + 1}</td>
                <td style="border: 1px solid #000; padding: 5px; font-weight: bold;">${uraianVal}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center;">${tglVal}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: left; font-size: 9.5px;">${ketVal}</td>
            </tr>
        `;
    });

    syncCurrentTimInputs();

    let timRowsHtml = '';
    const count = timPenyusunData.length > 0 ? timPenyusunData.length : DEFAULT_TIM_PENYUSUN.length;
    for (let i = 0; i < count; i++) {
        const item = timPenyusunData[i] || {};
        const nama = item.nama || '-';
        const jabatan = item.jabatan || '-';
        const ttdAlign = (i % 2 === 0) ? 'text-align: left; padding-left: 14px;' : 'text-align: right; padding-right: 14px;';

        timRowsHtml += `
            <tr>
                <td style="text-align: center; border: 1px solid #000; padding: 6px 4px; font-weight: bold;">${i + 1}</td>
                <td style="border: 1px solid #000; padding: 6px 6px; font-weight: bold; text-transform: uppercase;">${nama}</td>
                <td style="border: 1px solid #000; padding: 6px 6px;">${jabatan}</td>
                <td style="border: 1px solid #000; padding: 6px 6px; ${ttdAlign} font-weight: bold; width: 220px;">${i + 1}. ........................</td>
            </tr>
        `;
    }

    const printWin = window.open('', '_blank');
    printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>RKTL PENYUSUNAN DOKUMEN RKP DESA TAHUN ${tahun}</title>
            <style>
                @page { size: portrait; margin: 12mm; }
                body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: #000; margin: 0; padding: 10px; }
                .text-center { text-align: center; }
                .font-bold { font-weight: bold; }
                .uppercase { text-transform: uppercase; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9.5px; }
                th { border: 1.5px solid #000; background-color: #f1f5f9; padding: 6px; font-weight: bold; text-align: center; }
                td { border: 1px solid #000; padding: 5px 6px; word-wrap: break-word; }
                .ttd-wrapper { margin-top: 30px; display: flex; justify-content: space-between; page-break-inside: avoid; text-align: center; }
                .ttd-box { width: 48%; min-width: 280px; }
                .ttd-jabatan { font-weight: bold; margin-bottom: 70px; text-transform: uppercase; letter-spacing: 0.5px; }
                .ttd-nama { font-weight: bold; display: inline-block; min-width: 260px; border-bottom: 1.5px solid #000; padding-bottom: 2px; }
                .fasilitator-box { margin-top: 30px; border: 1.5px solid #000; padding: 15px; page-break-inside: avoid; }
            </style>
        </head>
        <body>
            <div class="text-center">
                <h3 style="margin: 0; font-size: 13px;" class="font-bold uppercase">
                    RENCANA KERJA DAN TINDAK LANJUT (RKTL)<br>
                    PENYUSUNAN DOKUMEN RKP DESA TAHUN ${tahun}
                </h3>
                <p style="margin: 3px 0;" class="font-bold uppercase">DESA BATETANGNGA KECAMATAN BINUANG KABUPATEN POLEWALI MANDAR</p>
                <p style="margin: 2px 0;" class="font-bold uppercase">PROVINSI SULAWESI BARAT</p>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 30px;">NO</th>
                        <th style="width: 230px;">URAIAN KEGIATAN</th>
                        <th style="width: 140px;">TANGGAL / TEMPAT</th>
                        <th>KETERANGAN</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>

            <div class="ttd-wrapper">
                <div class="ttd-box">
                    <p style="margin:0; font-weight: bold;">Mengetahui,</p>
                    <p class="ttd-jabatan">KEPALA DESA BATETANGNGA</p>
                    <p class="ttd-nama">${kepalaDesa}</p>
                </div>
                <div class="ttd-box">
                    <p style="margin:0; font-weight: bold;">Batetangnga, ${formattedDate}</p>
                    <p class="ttd-jabatan">KETUA TIM PENYUSUN RKP DESA</p>
                    <p class="ttd-nama">${ketuaTim}</p>
                </div>
            </div>

            <h4 style="margin-top: 30px; margin-bottom: 6px;" class="uppercase font-bold">TIM PENYUSUN RKP DESA TAHUN ${tahun}</h4>
            <table style="min-width: 100%;">
                <thead>
                    <tr>
                        <th style="width: 30px;">NO</th>
                        <th>NAMA ANGGOTA</th>
                        <th>JABATAN TIM</th>
                        <th style="width: 220px;">TANDA TANGAN</th>
                    </tr>
                </thead>
                <tbody>
                    ${timRowsHtml}
                </tbody>
            </table>

            <div class="fasilitator-box">
                <h4 style="margin: 0 0 10px 0; text-transform: uppercase; font-weight: bold; text-align: center;">DIFASILITASI OLEH:</h4>
                <div style="text-align: center; width: 300px; margin: 0 auto;">
                    <p style="margin: 0; font-weight: bold;">Pendamping Desa / Fasilitator</p>
                    <div style="height: 70px;"></div>
                    <p style="font-weight: bold; text-transform: uppercase; border-bottom: 1.5px solid #000; margin: 0; padding-bottom: 2px; display: inline-block; min-width: 260px;">${fasNama}</p>
                    <p style="margin: 4px 0 0 0; font-weight: bold; font-size: 10px;">${fasJabatan}</p>
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
