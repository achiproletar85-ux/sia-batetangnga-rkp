// ============================================
// RKTL (RENCANA KERJA DAN TINDAK LANJUT) JS
// ============================================

// Helper Escape HTML untuk keamanan render DOM & cetak
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Helper perapih sub-baris bertingkat (a., b., dll.) dengan indentasi rapi
function formatUraianHtml(text) {
    if (!text) return '-';
    const lines = String(text).split('\n');
    return lines.map(line => {
        const trimmed = line.trim();
        if (/^([a-z]\.|\d+\.|\-|\•)/i.test(trimmed)) {
            return `<div style="padding-left: 14px; margin-top: 2px;">${escapeHtml(trimmed)}</div>`;
        }
        return `<div>${escapeHtml(line)}</div>`;
    }).join('');
}

const DEFAULT_RKTL_STEPS = [
    {
        hari_tanggal: "Senin, 06 Juli 2026",
        pukul: "09.00 - 12.30 WITA",
        tempat: "Aula Kantor Desa Batetangnga",
        uraian: "Rembuk Stunting",
        keterangan: "BA Rembuk Stunting",
        keluaran: "Berita Acara & Rekomendasi Prioritas Stunting"
    },
    {
        hari_tanggal: "Kamis, 09 Juli 2026",
        pukul: "09.00 - 13.00 WITA",
        tempat: "Aula Kantor Desa Batetangnga",
        uraian: "Pembentukan Tim Penyusun RKP Desa",
        keterangan: "Musyawarah Mufakat",
        keluaran: "SK Kepala Desa tentang Tim Penyusun RKP Desa"
    },
    {
        hari_tanggal: "Senin - Rabu, 13-15 Juli 2026",
        pukul: "08.30 - 16.00 WITA",
        tempat: "Ruang Rapat Kantor Desa",
        uraian: "Pencermatan dan penyelarasan rencana kegiatan dan pembiayaan Pembangunan Desa:\na. Pencermatan Pagu Indikatif Desa\nb. Penyelarasan Program/Kegiatan Masuk Desa",
        keterangan: "Mencermati: Dok. RPJMD, Renstra OPD, RPKD, Jasmas, Pagu Indikatif Desa: DD, ADD, BHP, BKK, dll.",
        keluaran: "Format Data Pagu Indikatif & Daftar Program Masuk Desa"
    },
    {
        hari_tanggal: "Kamis - Jumat, 16-17 Juli 2026",
        pukul: "09.00 - 15.30 WITA",
        tempat: "Sekretariat Tim Penyusun",
        uraian: "Pencermatan Ulang RPJM Desa:\na. Pengkajian Ulang Prioritas RPJM Desa\nb. Rekapitulasi SDGs Desa",
        keterangan: "Dok. RPJM Desa, Hasil Laju Capaian SDGs Desa",
        keluaran: "Format Daftar Usulan Program Berdasarkan RPJM Desa"
    },
    {
        hari_tanggal: "Senin - Jumat, 20-24 Juli 2026",
        pukul: "08.30 - 16.00 WITA",
        tempat: "Ruang Kerja Tim Penyusun",
        uraian: "Penyusunan Rancangan RKP Desa dan DU-RKP Desa:\na. Penyusunan Matriks RKP Desa\nb. Penyusunan Rancangan RAB Kegiatan\nc. Pengintegrasian Prioritas Nasional & Stunting",
        keterangan: "Berdasarkan daftar rencana program dan kegiatan yang masuk ke Desa, data dan informasi tentang rencana pembiayaan Pembangunan Desa, data dan informasi hasil pencermatan RPJM Desa, daftar kegiatan yang mendukung penanganan aksi program prioritas nasional (konvergensi pencegahan stunting, dll)",
        keluaran: "Draft Rancangan Dokumen RKP Desa & DU-RKP Desa"
    },
    {
        hari_tanggal: "Selasa, 28 Juli 2026",
        pukul: "09.00 - 15.00 WITA",
        tempat: "Aula Kantor Desa Batetangnga",
        uraian: "Musrenbang Desa pembahasan rancangan RKP Desa dan Daftar Usulan RKP Desa",
        keterangan: "Menetapkan prioritas, program, kegiatan, dan kebutuhan Pembangunan Desa yang didanai oleh APB Desa, swadaya, dan/atau APBD dan APBN.",
        keluaran: "BA Musrenbangdes Pembahasan Rancangan RKP Desa"
    },
    {
        hari_tanggal: "Minggu, 02 Agustus 2026",
        pukul: "09.00 - 13.00 WITA",
        tempat: "Aula Kantor Desa Batetangnga",
        uraian: "Musyawarah Desa tentang pembahasan dan pengesahan PERDES RKP Desa dan DU-RKP Desa",
        keterangan: "Membahas, menetapkan dan mengesahkan dokumen RKP Desa dan DU-RKP Desa dengan penandatangan Peraturan Desa tentang RKP Desa oleh Kepala Desa dan Ketua BPD.",
        keluaran: "Perdes RKP Desa & Berita Acara Pengesahan BPD"
    }
];

const DEFAULT_RKTL_PERUBAHAN_STEPS = [
    {
        hari_tanggal: "Kamis, 10 September 2026",
        pukul: "09.00 - 13.00 WITA",
        tempat: "Aula Kantor Desa Batetangnga",
        uraian: "Musyawarah Desa Pembahasan Keadaan Luar Biasa / Perubahan RKP Desa",
        keterangan: "BA Musdes Pembahasan Alasan Perubahan RKP Desa dan Penelaahan Kebutuhan Mendesak / Pergeseran Anggaran.",
        keluaran: "BA Musdes Kesepakatan Perubahan RKP Desa"
    },
    {
        hari_tanggal: "Senin, 14 September 2026",
        pukul: "09.00 - 12.00 WITA",
        tempat: "Aula Kantor Desa Batetangnga",
        uraian: "Pembentukan / Penugasan Tim Penyusun Dokumen Perubahan RKP Desa",
        keterangan: "Surat Keputusan Kepala Desa tentang Penugasan Tim Penyusun Perubahan RKP Desa.",
        keluaran: "SK Tim Penyusun Perubahan RKP Desa"
    },
    {
        hari_tanggal: "Selasa - Rabu, 15-16 September 2026",
        pukul: "08.30 - 16.00 WITA",
        tempat: "Ruang Rapat Kantor Desa",
        uraian: "Pencermatan dan Penyelarasan Rancangan Kegiatan serta Sumber Pembiayaan Perubahan:\na. Pencermatan Perubahan Pagu Indikatif\nb. Evaluasi Realisasi Belanja Semester Berjalan",
        keterangan: "Mencermati perubahan pagu indikatif, pergeseran belanja program prioritas, serta hasil realisasi semester berjalan.",
        keluaran: "Matriks Rincian Pergeseran Anggaran dan Kegiatan"
    },
    {
        hari_tanggal: "Kamis - Jumat, 17-18 September 2026",
        pukul: "08.30 - 16.30 WITA",
        tempat: "Sekretariat Tim Penyusun",
        uraian: "Penyusunan Rancangan Dokumen Perubahan RKP Desa:\na. Penyusunan Matriks Semula - Menjadi\nb. Penyusunan Penyesuaian Program Prioritas & Stunting",
        keterangan: "Menyusun matriks perbandingan program kegiatan (Semula - Menjadi) beserta rincian perubahan anggaran.",
        keluaran: "Draft Dokumen Rancangan Perubahan RKP Desa"
    },
    {
        hari_tanggal: "Selasa, 22 September 2026",
        pukul: "09.00 - 14.30 WITA",
        tempat: "Aula Kantor Desa Batetangnga",
        uraian: "Musrenbang Desa Pembahasan Rancangan Perubahan RKP Desa",
        keterangan: "Membahas dan menyepakati prioritas kegiatan perubahan bersama BPD, LPMD, tokoh masyarakat, dan unsur perempuan.",
        keluaran: "BA Musrenbangdes Pembahasan Perubahan RKP Desa"
    },
    {
        hari_tanggal: "Jumat, 25 September 2026",
        pukul: "09.00 - 13.00 WITA",
        tempat: "Aula Kantor Desa Batetangnga",
        uraian: "Musyawarah Desa tentang Pembahasan dan Pengesahan Peraturan Desa tentang Perubahan RKP Desa",
        keterangan: "Pengesahan PERDES Perubahan RKP Desa oleh Kepala Desa dan Ketua BPD.",
        keluaran: "Perdes Perubahan RKP Desa & BA Pengesahan"
    }
];

const DEFAULT_TIM_PENYUSUN = [
    { nama: "SUMAILA DAMANG", jabatan_tim: "Pembina" },
    { nama: "SYARIFUDDIN", jabatan_tim: "Ketua" },
    { nama: "BUSTAMIN. B", jabatan_tim: "Sekretaris" },
    { nama: "MISBAHUDDIN", jabatan_tim: "Anggota" }
];

let currentRktlMode = 'MURNI'; // 'MURNI' | 'PERUBAHAN'
let rktlRowsData = [];
let timPenyusunData = [];

document.addEventListener('DOMContentLoaded', () => {
    // Deteksi mode dari query URL: ?tipe=perubahan atau localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const tipeParam = urlParams.get('tipe');
    if (tipeParam && String(tipeParam).toLowerCase() === 'perubahan') {
        currentRktlMode = 'PERUBAHAN';
    } else if (tipeParam && String(tipeParam).toLowerCase() === 'murni') {
        currentRktlMode = 'MURNI';
    } else {
        try {
            const savedMode = localStorage.getItem('sia_tipe_anggaran') || localStorage.getItem('rab_tipe_anggaran');
            if (savedMode && String(savedMode).toUpperCase().includes('PERUBAHAN')) {
                currentRktlMode = 'PERUBAHAN';
            } else {
                currentRktlMode = 'MURNI';
            }
        } catch (_) {}
    }

    const tahunParam = urlParams.get('tahun');
    let initialYear = null;
    if (tahunParam) {
        initialYear = parseInt(tahunParam, 10);
    } else {
        try {
            const savedYear = localStorage.getItem('sia_tahun_anggaran') || localStorage.getItem('rab_tahun_anggaran');
            if (savedYear) {
                const parsedY = parseInt(savedYear, 10);
                if (Number.isFinite(parsedY) && parsedY >= 2020 && parsedY <= 2035) initialYear = parsedY;
            } else {
                const cal = new Date().getFullYear();
                if (cal >= 2022 && cal <= 2030) initialYear = cal;
            }
        } catch (_) {}
    }

    const selTahun = document.getElementById('select-tahun');
    if (selTahun && initialYear) {
        selTahun.value = String(initialYear);
        if (document.getElementById('judul-tahun-doc')) {
            document.getElementById('judul-tahun-doc').innerText = String(initialYear);
        }
    }

    updateRktlModeUI();
    loadRKTLData();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('select-tahun')?.addEventListener('change', () => {
        const tahun = document.getElementById('select-tahun').value;
        try {
            localStorage.setItem('sia_tahun_anggaran', String(tahun));
            localStorage.setItem('rab_tahun_anggaran', String(tahun));
        } catch (_) {}
        if (document.getElementById('judul-tahun-doc')) {
            document.getElementById('judul-tahun-doc').innerText = tahun;
        }
    });
}

// Ganti Mode RKTL: Murni vs Perubahan
function switchRktlMode(mode) {
    currentRktlMode = (mode && String(mode).toUpperCase() === 'PERUBAHAN') ? 'PERUBAHAN' : 'MURNI';
    try {
        localStorage.setItem('sia_tipe_anggaran', currentRktlMode);
        localStorage.setItem('rab_tipe_anggaran', currentRktlMode);
    } catch (_) {}
    updateRktlModeUI();
    loadRKTLData();
}

function updateRktlModeUI() {
    const isPerubahan = currentRktlMode === 'PERUBAHAN';
    const btnMurni = document.getElementById('tab-btn-rktl-murni');
    const btnPerubahan = document.getElementById('tab-btn-rktl-perubahan');
    const badgeInfo = document.getElementById('tab-badge-info');
    const modeTitle = document.getElementById('rktl-mode-title');
    const modeSubtitle = document.getElementById('rktl-mode-subtitle');
    const modeIcon = document.getElementById('rktl-mode-icon');
    const docPrefix = document.getElementById('judul-dokumen-prefix');
    const docSub = document.getElementById('judul-dokumen-sub');
    const btnCopyMurni = document.getElementById('btn-copy-murni');

    if (btnMurni && btnPerubahan) {
        if (isPerubahan) {
            btnPerubahan.className = "px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm cursor-pointer";
            btnMurni.className = "px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 text-slate-700 hover:text-slate-900 cursor-pointer";
        } else {
            btnMurni.className = "px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-indigo-600 text-white shadow-sm cursor-pointer";
            btnPerubahan.className = "px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 text-slate-700 hover:text-slate-900 cursor-pointer";
        }
    }

    if (badgeInfo) {
        if (isPerubahan) {
            badgeInfo.className = "bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 rounded-lg font-bold flex items-center gap-1.5";
            badgeInfo.innerHTML = '<i class="fas fa-file-signature text-amber-600"></i> Mode: RKTL Perubahan';
        } else {
            badgeInfo.className = "bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1 rounded-lg font-bold flex items-center gap-1.5";
            badgeInfo.innerHTML = '<i class="fas fa-tasks text-indigo-600"></i> Mode: RKTL Murni';
        }
    }

    if (modeTitle) {
        modeTitle.innerText = isPerubahan ? 'RKTL (RENCANA KERJA DAN TINDAK LANJUT) - PERUBAHAN' : 'RKTL (RENCANA KERJA DAN TINDAK LANJUT)';
    }

    if (modeSubtitle) {
        modeSubtitle.innerText = isPerubahan
            ? 'Perubahan Penyusunan Dokumen RKP Desa Tahun 2026/2027 (Format Baku Kementerian)'
            : 'Penyusunan Dokumen RKP Desa Tahun 2026/2027 (Format Baku Kementerian)';
    }

    if (modeIcon) {
        modeIcon.className = isPerubahan ? 'fas fa-file-signature text-amber-600' : 'fas fa-tasks text-indigo-600';
    }

    if (docPrefix) {
        docPrefix.innerText = isPerubahan ? 'RENCANA KERJA DAN TINDAK LANJUT (RKTL) PERUBAHAN' : 'RENCANA KERJA DAN TINDAK LANJUT (RKTL)';
    }

    if (docSub) {
        docSub.innerText = isPerubahan ? 'PERUBAHAN PENYUSUNAN DOKUMEN RKP DESA TAHUN' : 'PENYUSUNAN DOKUMEN RKP DESA TAHUN';
    }

    if (btnCopyMurni) {
        if (isPerubahan) {
            btnCopyMurni.classList.remove('hidden');
        } else {
            btnCopyMurni.classList.add('hidden');
        }
    }
}

// 1. Load Data RKTL dari Database per Tahun & Tipe (Murni vs Perubahan)
async function loadRKTLData() {
    const tahun = document.getElementById('select-tahun')?.value || '2027';
    if (document.getElementById('judul-tahun-doc')) {
        document.getElementById('judul-tahun-doc').innerText = tahun;
    }
    console.log(`📥 Loading RKTL (${currentRktlMode}) & Master Tim data for tahun ${tahun}...`);

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

        // Fetch RKTL data with explicit tipe
        const rktlRes = await fetch(`/api/rktl?tahun=${tahun}&tipe=${currentRktlMode}`);
        const rktlJson = rktlRes.ok ? await rktlRes.json() : { success: true, data: [] };

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
            // Gunakan default list sesuai mode
            const defaultSteps = currentRktlMode === 'PERUBAHAN' ? DEFAULT_RKTL_PERUBAHAN_STEPS : DEFAULT_RKTL_STEPS;
            rktlRowsData = JSON.parse(JSON.stringify(defaultSteps));
        }

        renderRKTLTable();
        renderTimPenyusunTable();
    } catch (err) {
        console.error('❌ Error loading RKTL data:', err);
        const defaultSteps = currentRktlMode === 'PERUBAHAN' ? DEFAULT_RKTL_PERUBAHAN_STEPS : DEFAULT_RKTL_STEPS;
        rktlRowsData = JSON.parse(JSON.stringify(defaultSteps));
        timPenyusunData = JSON.parse(JSON.stringify(DEFAULT_TIM_PENYUSUN));
        renderRKTLTable();
        renderTimPenyusunTable();
    }
}

// 2. Render Tabel Agenda RKTL (Format Baku 7 Kolom Kedinasan)
function renderRKTLTable() {
    const tbody = document.getElementById('tabel-rktl-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    const list = (rktlRowsData && rktlRowsData.length > 0) ? rktlRowsData : DEFAULT_RKTL_STEPS;
    const countLabel = document.getElementById('jumlah-rktl-count');
    if (countLabel) countLabel.innerText = list.length;

    list.forEach((item, idx) => {
        const hariTglVal = item.hari_tanggal !== undefined ? item.hari_tanggal : (item.tanggal_tempat || '');
        const pukulVal = item.pukul !== undefined ? item.pukul : '09.00 - Selesai';
        const tempatVal = item.tempat !== undefined ? item.tempat : 'Aula Kantor Desa Batetangnga';
        const uraianVal = item.uraian !== undefined ? item.uraian : '';
        const ketVal = item.keterangan !== undefined ? item.keterangan : '';
        const keluaranVal = item.keluaran !== undefined ? item.keluaran : (item.output || '');

        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 border-b border-slate-200 text-xs";

        tr.innerHTML = `
            <td class="p-2 text-center font-bold text-slate-600 border border-slate-300">${idx + 1}</td>
            <td class="p-1 border border-slate-300">
                <textarea id="hari-tgl-rktl-${idx}" rows="2" onchange="updateRKTLRowData(${idx}, 'hari_tanggal', this.value)" class="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded outline-none resize-y text-slate-800 text-center font-semibold" placeholder="Hari, Tanggal...">${escapeHtml(hariTglVal)}</textarea>
            </td>
            <td class="p-1 border border-slate-300">
                <input type="text" id="pukul-rktl-${idx}" value="${escapeHtml(pukulVal)}" onchange="updateRKTLRowData(${idx}, 'pukul', this.value)" class="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded outline-none text-center font-medium" placeholder="09.00 - Selesai">
            </td>
            <td class="p-1 border border-slate-300">
                <textarea id="tempat-rktl-${idx}" rows="2" onchange="updateRKTLRowData(${idx}, 'tempat', this.value)" class="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded outline-none resize-y text-slate-800 font-medium" placeholder="Tempat Kegiatan...">${escapeHtml(tempatVal)}</textarea>
            </td>
            <td class="p-1 border border-slate-300">
                <textarea id="uraian-rktl-${idx}" rows="3" onchange="updateRKTLRowData(${idx}, 'uraian', this.value)" class="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded outline-none resize-y font-bold text-slate-800" placeholder="Uraian Kegiatan Agenda...">${escapeHtml(uraianVal)}</textarea>
            </td>
            <td class="p-1 border border-slate-300">
                <textarea id="ket-rktl-${idx}" rows="3" onchange="updateRKTLRowData(${idx}, 'keterangan', this.value)" class="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded outline-none resize-y text-slate-700 font-medium" placeholder="Keterangan...">${escapeHtml(ketVal)}</textarea>
            </td>
            <td class="p-1 border border-slate-300">
                <textarea id="keluaran-rktl-${idx}" rows="3" onchange="updateRKTLRowData(${idx}, 'keluaran', this.value)" class="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded outline-none resize-y text-slate-700 font-medium" placeholder="Keluaran / Output...">${escapeHtml(keluaranVal)}</textarea>
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
        const hariTgl = document.getElementById(`hari-tgl-rktl-${i}`)?.value || '';
        const pukul = document.getElementById(`pukul-rktl-${i}`)?.value || '';
        const tempat = document.getElementById(`tempat-rktl-${i}`)?.value || '';
        const uraian = document.getElementById(`uraian-rktl-${i}`)?.value || '';
        const ket = document.getElementById(`ket-rktl-${i}`)?.value || '';
        const keluaran = document.getElementById(`keluaran-rktl-${i}`)?.value || '';
        const tglTempat = `${hariTgl} ${tempat}`.trim();
        if (rktlRowsData[i]) {
            rktlRowsData[i] = {
                ...rktlRowsData[i],
                hari_tanggal: hariTgl,
                pukul: pukul,
                tempat: tempat,
                uraian: uraian,
                tanggal_tempat: tglTempat || rktlRowsData[i].tanggal_tempat || '-',
                keterangan: ket,
                keluaran: keluaran
            };
        }
    }
}

function tambahBarisRKTL() {
    syncCurrentRKTLInputs();
    rktlRowsData.push({
        hari_tanggal: "",
        pukul: "09.00 - Selesai",
        tempat: "Aula Kantor Desa Batetangnga",
        uraian: "",
        tanggal_tempat: "",
        keterangan: "",
        keluaran: ""
    });
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

// 4. Reset Default RKTL Sesuai Mode Aktif
function resetDefaultRKTL() {
    const modeLabel = currentRktlMode === 'PERUBAHAN' ? 'RKTL Perubahan' : 'RKTL Murni';
    if (!confirm(`Kembalikan semua isian ${modeLabel}, Keterangan, dan Tim Penyusun ke format default?`)) return;
    const defaultSteps = currentRktlMode === 'PERUBAHAN' ? DEFAULT_RKTL_PERUBAHAN_STEPS : DEFAULT_RKTL_STEPS;
    rktlRowsData = JSON.parse(JSON.stringify(defaultSteps));
    timPenyusunData = JSON.parse(JSON.stringify(DEFAULT_TIM_PENYUSUN));
    document.getElementById('input-kepala-desa').value = 'SUMAILA DAMANG';
    document.getElementById('input-ketua-tim').value = 'AHMAD';
    document.getElementById('input-tanggal-ttd').value = '2026-08-02';
    if (document.getElementById('input-fasilitator-nama')) document.getElementById('input-fasilitator-nama').value = 'RAHMAN, ST';
    if (document.getElementById('input-fasilitator-jabatan')) document.getElementById('input-fasilitator-jabatan').value = 'Pendamping Desa';
    renderRKTLTable();
    renderTimPenyusunTable();
}

// 4b. Salin Agenda dari RKTL Murni ke RKTL Perubahan
async function salinDariRktlMurni() {
    const tahun = document.getElementById('select-tahun')?.value || '2027';
    if (!confirm(`Salin seluruh agenda kegiatan dan susunan tim dari RKTL Murni tahun ${tahun} ke RKTL Perubahan?`)) return;

    try {
        const res = await fetch(`/api/rktl?tahun=${tahun}&tipe=MURNI`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            rktlRowsData = JSON.parse(JSON.stringify(json.data));
            const first = json.data[0];
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
            renderRKTLTable();
            alert(`✅ Berhasil menyalin ${rktlRowsData.length} kegiatan dari RKTL Murni! Silakan sesuaikan agenda jika diperlukan, lalu klik "Simpan DB".`);
        } else {
            alert(`⚠️ Data RKTL Murni untuk tahun ${tahun} belum tersimpan di database. Memuat susunan default kegiatan perubahan.`);
            rktlRowsData = JSON.parse(JSON.stringify(DEFAULT_RKTL_PERUBAHAN_STEPS));
            renderRKTLTable();
        }
    } catch (err) {
        console.error('❌ Error salinDariRktlMurni:', err);
        alert('❌ Terjadi kesalahan saat menyalin data dari server.');
    }
}

// 5. Simpan Ke Database (Mempertahankan Tipe Murni / Perubahan)
async function simpanRKTL() {
    const tahun = parseInt(document.getElementById('select-tahun')?.value || '2027');
    const tglTTD = document.getElementById('input-tanggal-ttd')?.value || '2026-08-02';
    const ketuaTim = document.getElementById('input-ketua-tim')?.value || 'AHMAD';
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
        hari_tanggal: row.hari_tanggal || row.tanggal_tempat || '-',
        pukul: row.pukul || '-',
        tempat: row.tempat || 'Aula Kantor Desa Batetangnga',
        uraian: row.uraian || '',
        tanggal_tempat: row.tanggal_tempat || `${row.hari_tanggal || ''} ${row.tempat || ''}`.trim() || '-',
        keterangan: row.keterangan || '',
        keluaran: row.keluaran || '-',
        tanggal_ttd: tglTTD,
        ketua_tim: ketuaTim,
        kepala_desa: kepalaDesa,
        fasilitator_nama: fasNama,
        fasilitator_jabatan: fasJabatan,
        fasilitator: `${fasNama} (${fasJabatan})`,
        tim_penyusun: timPenyusunData
    }));

    const modeLabel = currentRktlMode === 'PERUBAHAN' ? 'RKTL Perubahan' : 'RKTL Murni';
    console.log(`💾 Syncing ${itemsData.length} baris ${modeLabel} & ${timPenyusunData.length} team members to Supabase for tahun ${tahun}...`);

    try {
        // Sync Master Data Tim Penyusun
        await fetch('/api/tim-penyusun/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tahun: tahun, data: timPenyusunData })
        });

        // Sync RKTL rows dengan payload eksplisit tipe
        const res = await fetch('/api/rktl/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tahun: tahun, tipe: currentRktlMode, data: itemsData })
        });
        const json = await res.json();

        if (json.success) {
            alert(`✅ Data ${modeLabel} & Master Tim Penyusun berhasil disimpan ke database!`);
            loadRKTLData();
        } else {
            alert(`❌ Gagal menyimpan data ${modeLabel}: ` + json.error);
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
    const modeLabel = currentRktlMode === 'PERUBAHAN' ? 'RKTL Perubahan' : 'RKTL Murni';
    const targetTahunStr = prompt(`Masukkan TAHUN tujuan untuk menyalin ${modeLabel} dari tahun ${activeTahun} (contoh: 2028):`, '2028');
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

    if (!confirm(`Salin ${rktlRowsData.length} kegiatan ${modeLabel} & ${timPenyusunData.length} anggota tim dari tahun ${activeTahun} ke tahun ${targetTahunInt}?`)) return;

    const tglTTD = document.getElementById('input-tanggal-ttd')?.value || '2026-08-02';
    const ketuaTim = document.getElementById('input-ketua-tim')?.value || 'AHMAD';
    const kepalaDesa = document.getElementById('input-kepala-desa')?.value || 'SUMAILA DAMANG';
    const fasNama = document.getElementById('input-fasilitator-nama')?.value || 'RAHMAN, ST';
    const fasJabatan = document.getElementById('input-fasilitator-jabatan')?.value || 'Pendamping Desa';

    const copiedPayload = rktlRowsData.map((row, idx) => ({
        no_urut: idx + 1,
        hari_tanggal: row.hari_tanggal || row.tanggal_tempat || '-',
        pukul: row.pukul || '-',
        tempat: row.tempat || 'Aula Kantor Desa Batetangnga',
        uraian: row.uraian || '',
        tanggal_tempat: row.tanggal_tempat || `${row.hari_tanggal || ''} ${row.tempat || ''}`.trim() || '-',
        keterangan: row.keterangan || '',
        keluaran: row.keluaran || '-',
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
            body: JSON.stringify({ tahun: targetTahunInt, tipe: currentRktlMode, data: copiedPayload })
        });
        const json = await res.json();
        if (json.success) {
            alert(`✅ Berhasil menyalin data ${modeLabel} ke tahun ${targetTahunInt}!`);
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

// 7. Cetak PDF / Print Window (Format Resmi Kedinasan 7 Kolom & Landscape)
function printPDF() {
    const tahun = document.getElementById('select-tahun')?.value || '2027';
    const kepalaDesa = document.getElementById('input-kepala-desa')?.value || 'SUMAILA DAMANG';
    const ketuaTim = document.getElementById('input-ketua-tim')?.value || 'AHMAD';
    const tgl = document.getElementById('input-tanggal-ttd')?.value || '2026-08-02';
    const fasNama = document.getElementById('input-fasilitator-nama')?.value || 'RAHMAN, ST';
    const fasJabatan = document.getElementById('input-fasilitator-jabatan')?.value || 'Pendamping Desa';

    const isPerubahan = currentRktlMode === 'PERUBAHAN';
    const docJudulPrefix = isPerubahan ? 'RENCANA KERJA DAN TINDAK LANJUT (RKTL) PERUBAHAN' : 'RENCANA KERJA DAN TINDAK LANJUT (RKTL)';
    const docJudulSub = isPerubahan ? `PERUBAHAN PENYUSUNAN DOKUMEN RKP DESA TAHUN ${tahun}` : `PENYUSUNAN DOKUMEN RKP DESA TAHUN ${tahun}`;

    let formattedDate = tgl;
    const parts = tgl.split('-');
    if (parts.length === 3) {
        const bulanNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        formattedDate = `${parts[2]} ${bulanNames[parseInt(parts[1]) - 1]} ${parts[0]}`;
    }

    syncCurrentRKTLInputs();

    let rowsHtml = '';
    rktlRowsData.forEach((row, idx) => {
        const no = idx + 1;
        const hariTglVal = row.hari_tanggal || row.tanggal_tempat || '-';
        const pukulVal = row.pukul || '-';
        const tempatVal = row.tempat || 'Aula Kantor Desa Batetangnga';
        const uraianHtml = formatUraianHtml(row.uraian || '-');
        const ketVal = row.keterangan || '-';
        const keluaranVal = row.keluaran || '-';

        rowsHtml += `
            <tr>
                <td style="text-align: center; border: 1px solid #000; padding: 5px; font-weight: bold;">${no}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 9px;">${escapeHtml(hariTglVal)}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 9px;">${escapeHtml(pukulVal)}</td>
                <td style="border: 1px solid #000; padding: 5px; font-size: 9px;">${escapeHtml(tempatVal)}</td>
                <td style="border: 1px solid #000; padding: 5px; font-size: 9px;">${uraianHtml}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: left; font-size: 9px;">${escapeHtml(ketVal)}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: left; font-size: 9px;">${escapeHtml(keluaranVal)}</td>
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
                <td style="border: 1px solid #000; padding: 6px 6px; font-weight: bold; text-transform: uppercase;">${escapeHtml(nama)}</td>
                <td style="border: 1px solid #000; padding: 6px 6px;">${escapeHtml(jabatan)}</td>
                <td style="border: 1px solid #000; padding: 6px 6px; ${ttdAlign} font-weight: bold; width: 220px;">${i + 1}. ........................</td>
            </tr>
        `;
    }

    const printWin = window.open('', '_blank');
    printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${docJudulSub} / DESA BATETANGNGA KECAMATAN BINUANG KABUPATEN POLEWALI MANDAR PROVINSI SULAWESI BARAT</title>
            <style>
                @page { size: landscape; margin: 10mm; }
                body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9.5px; color: #000; margin: 0; padding: 10px; }
                .text-center { text-align: center; }
                .font-bold { font-weight: bold; }
                .uppercase { text-transform: uppercase; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9px; }
                th { border: 1.5px solid #000; background-color: #f1f5f9; padding: 6px 4px; font-weight: bold; text-align: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                td { border: 1px solid #000; padding: 5px 6px; word-wrap: break-word; }
                .ttd-wrapper { margin-top: 25px; display: flex; justify-content: space-between; page-break-inside: avoid; text-align: center; }
                .ttd-box { width: 45%; min-width: 260px; }
                .ttd-jabatan { font-weight: bold; margin-bottom: 60px; text-transform: uppercase; letter-spacing: 0.5px; }
                .ttd-nama { font-weight: bold; text-transform: uppercase; display: inline-block; min-width: 240px; border-bottom: 1.5px solid #000; padding-bottom: 2px; }
                .fasilitator-box { margin-top: 25px; border: 1.5px solid #000; padding: 12px; page-break-inside: avoid; }
            </style>
        </head>
        <body>
            <div class="text-center">
                <h3 style="margin: 0; font-size: 13px;" class="font-bold uppercase">
                    ${docJudulPrefix}<br>
                    ${docJudulSub}
                </h3>
                <p style="margin: 3px 0;" class="font-bold uppercase">DESA BATETANGNGA KECAMATAN BINUANG KABUPATEN POLEWALI MANDAR</p>
                <p style="margin: 2px 0;" class="font-bold uppercase">PROVINSI SULAWESI BARAT</p>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 30px;">NO.</th>
                        <th style="width: 130px;">HARI, TANGGAL</th>
                        <th style="width: 90px;">PUKUL</th>
                        <th style="width: 130px;">TEMPAT</th>
                        <th style="min-width: 200px;">URAIAN</th>
                        <th style="width: 170px;">KETERANGAN</th>
                        <th style="width: 150px;">KELUARAN</th>
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
                    <p class="ttd-nama">${escapeHtml(kepalaDesa)}</p>
                </div>
                <div class="ttd-box">
                    <p style="margin:0; font-weight: bold;">Batetangnga, ${formattedDate}</p>
                    <p class="ttd-jabatan">KETUA TIM PENYUSUN RKP DESA</p>
                    <p class="ttd-nama">${escapeHtml(ketuaTim)}</p>
                </div>
            </div>

            <h4 style="margin-top: 25px; margin-bottom: 6px;" class="uppercase font-bold">TIM PENYUSUN RKP DESA TAHUN ${tahun}</h4>
            <table style="min-width: 100%;">
                <thead>
                    <tr>
                        <th style="width: 30px;">NO.</th>
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
                <h4 style="margin: 0 0 8px 0; text-transform: uppercase; font-weight: bold; text-align: center;">DIFASILITASI OLEH:</h4>
                <div style="text-align: center; width: 300px; margin: 0 auto;">
                    <p style="margin: 0; font-weight: bold;">Pendamping Desa / Fasilitator</p>
                    <div style="height: 55px;"></div>
                    <p style="font-weight: bold; text-transform: uppercase; border-bottom: 1.5px solid #000; margin: 0; padding-bottom: 2px; display: inline-block; min-width: 260px;">${escapeHtml(fasNama)}</p>
                    <p style="margin: 4px 0 0 0; font-weight: bold; font-size: 10px;">${escapeHtml(fasJabatan)}</p>
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
