// ============================================
// DATA PERENCANAAN DESA JS
// ============================================

let currentTab = 'master';
let cachedData = [];

document.addEventListener('DOMContentLoaded', () => {
    const storedYear = localStorage.getItem('ACTIVE_TAHUN_ANGGARAN') || '2027';
    const selectYearEl = document.getElementById('select-tahun-data');
    if (selectYearEl) selectYearEl.value = storedYear;

    window.addEventListener('tahunChanged', (e) => {
        if (e && e.detail && e.detail.tahun) {
            if (selectYearEl) selectYearEl.value = e.detail.tahun;
            loadActiveTabData();
        }
    });

    loadActiveTabData();
});

function switchTab(tabName) {
    currentTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${tabName}`)?.classList.add('active');

    const titles = {
        'master': 'Tabel Data Master RPJMDes',
        'rkpdes': 'Tabel Data RKPDes (Tahun Anggaran)',
        'durkpdes': 'Tabel Data DU-RKPDes (Daftar Usulan)',
        'rab': 'Tabel Data RAB Kegiatan Desa',
        'stunting': 'Tabel Data Kegiatan Konvergensi Stunting'
    };

    if (document.getElementById('tab-title')) {
        document.getElementById('tab-title').innerHTML = `<i class="fas fa-table text-indigo-600"></i> ${titles[tabName] || 'Tabel Data'}`;
    }

    loadActiveTabData();
}

async function loadActiveTabData() {
    const tahun = document.getElementById('select-tahun-data')?.value || '2027';
    const tbody = document.getElementById('data-tbody');
    const thead = document.getElementById('data-thead');

    if (!tbody || !thead) return;

    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-indigo-600 font-bold"><i class="fas fa-spinner fa-spin mr-2"></i> Memuat data perencanaan...</td></tr>';

    try {
        let endpoint = '';
        if (currentTab === 'master') endpoint = '/api/master';
        else if (currentTab === 'rkpdes') endpoint = `/api/rkpdes?tahun=${tahun}`;
        else if (currentTab === 'durkpdes') endpoint = `/api/du-rkpdes?tahun=${tahun}`;
        else if (currentTab === 'rab') endpoint = `/api/rab?tahun=${tahun}`;
        else if (currentTab === 'stunting') endpoint = `/api/stunting?tahun=${tahun}`;

        const res = await fetch(endpoint);
        const json = await res.json();

        if (json.success && Array.isArray(json.data)) {
            cachedData = json.data;
            renderTableData(cachedData);
        } else {
            cachedData = [];
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-slate-400">📭 Data tidak ditemukan.</td></tr>';
            document.getElementById('data-count-badge').innerText = 'Total: 0 Data';
        }
    } catch (err) {
        console.error('❌ Error loading data:', err);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-rose-500 font-bold">❌ Error koneksi: ${err.message}</td></tr>`;
    }
}

function renderTableData(items) {
    const thead = document.getElementById('data-thead');
    const tbody = document.getElementById('data-tbody');
    document.getElementById('data-count-badge').innerText = `Total: ${items.length} Data`;

    if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-slate-400">📭 Belum ada data untuk kategori ini.</td></tr>';
        return;
    }

    if (currentTab === 'master') {
        thead.innerHTML = `
            <tr class="bg-slate-100 text-slate-800 font-bold text-center border-b border-slate-300">
                <th class="p-2 border border-slate-300 w-12">NO</th>
                <th class="p-2 border border-slate-300 w-32">KODE UNIK</th>
                <th class="p-2 border border-slate-300">NAMA KEGIATAN</th>
                <th class="p-2 border border-slate-300 w-44">PAGU RPJMDES</th>
                <th class="p-2 border border-slate-300 w-44">BIDANG</th>
                <th class="p-2 border border-slate-300 w-36">LOKASI</th>
            </tr>
        `;
        tbody.innerHTML = items.map((row, i) => `
            <tr class="hover:bg-slate-50 border-b border-slate-200">
                <td class="p-2 text-center font-bold text-slate-600 border border-slate-300">${i + 1}</td>
                <td class="p-2 font-mono font-bold text-slate-700 border border-slate-300">${row.kode_unik_full || row.kode_unik || '-'}</td>
                <td class="p-2 font-bold text-slate-800 border border-slate-300">${row.nama_kegiatan || '-'}</td>
                <td class="p-2 font-bold text-emerald-600 border border-slate-300">Rp ${(row.pagu_rpjm || 0).toLocaleString('id-ID')}</td>
                <td class="p-2 font-semibold text-slate-600 border border-slate-300">${row.bidang || '-'}</td>
                <td class="p-2 text-slate-600 border border-slate-300">${row.lokasi || '-'}</td>
            </tr>
        `).join('');
    } else if (currentTab === 'rkpdes' || currentTab === 'durkpdes') {
        thead.innerHTML = `
            <tr class="bg-slate-100 text-slate-800 font-bold text-center border-b border-slate-300">
                <th class="p-2 border border-slate-300 w-12">NO</th>
                <th class="p-2 border border-slate-300 w-24">TAHUN</th>
                <th class="p-2 border border-slate-300">NAMA KEGIATAN</th>
                <th class="p-2 border border-slate-300 w-40">VOLUME / SATUAN</th>
                <th class="p-2 border border-slate-300 w-44">JUMLAH (RP)</th>
                <th class="p-2 border border-slate-300 w-36">LOKASI</th>
            </tr>
        `;
        tbody.innerHTML = items.map((row, i) => `
            <tr class="hover:bg-slate-50 border-b border-slate-200">
                <td class="p-2 text-center font-bold text-slate-600 border border-slate-300">${i + 1}</td>
                <td class="p-2 text-center font-bold text-slate-700 border border-slate-300">${row.tahun || '-'}</td>
                <td class="p-2 font-bold text-slate-800 border border-slate-300">${row.nama_kegiatan || row.kegiatan || '-'}</td>
                <td class="p-2 font-semibold text-slate-700 border border-slate-300">${row.volume || row.volume_satuan || '-'}</td>
                <td class="p-2 font-bold text-emerald-600 border border-slate-300">Rp ${(row.jumlah || row.biaya || row.pagu || 0).toLocaleString('id-ID')}</td>
                <td class="p-2 text-slate-600 border border-slate-300">${row.lokasi || '-'}</td>
            </tr>
        `).join('');
    } else if (currentTab === 'rab') {
        thead.innerHTML = `
            <tr class="bg-slate-100 text-slate-800 font-bold text-center border-b border-slate-300">
                <th class="p-2 border border-slate-300 w-12">NO</th>
                <th class="p-2 border border-slate-300">NAMA KEGIATAN</th>
                <th class="p-2 border border-slate-300 w-44">BIDANG</th>
                <th class="p-2 border border-slate-300 w-36">LOKASI</th>
                <th class="p-2 border border-slate-300 w-44">TOTAL ANGGARAN (RP)</th>
            </tr>
        `;
        tbody.innerHTML = items.map((row, i) => `
            <tr class="hover:bg-slate-50 border-b border-slate-200">
                <td class="p-2 text-center font-bold text-slate-600 border border-slate-300">${i + 1}</td>
                <td class="p-2 font-bold text-slate-800 border border-slate-300">${row.nama_kegiatan || '-'}</td>
                <td class="p-2 font-semibold text-slate-600 border border-slate-300">${row.bidang || '-'}</td>
                <td class="p-2 text-slate-600 border border-slate-300">${row.lokasi || '-'}</td>
                <td class="p-2 font-bold text-emerald-600 border border-slate-300">Rp ${(row.jumlah_anggaran || row.total_anggaran || row.pagu || 0).toLocaleString('id-ID')}</td>
            </tr>
        `).join('');
    } else if (currentTab === 'stunting') {
        thead.innerHTML = `
            <tr class="bg-slate-100 text-slate-800 font-bold text-center border-b border-slate-300">
                <th class="p-2 border border-slate-300 w-12">NO</th>
                <th class="p-2 border border-slate-300">KEGIATAN PENCEGAHAN STUNTING</th>
                <th class="p-2 border border-slate-300 w-40">SASARAN</th>
                <th class="p-2 border border-slate-300 w-44">ANGGARAN (RP)</th>
                <th class="p-2 border border-slate-300 w-36">STATUS</th>
            </tr>
        `;
        tbody.innerHTML = items.map((row, i) => `
            <tr class="hover:bg-slate-50 border-b border-slate-200">
                <td class="p-2 text-center font-bold text-slate-600 border border-slate-300">${i + 1}</td>
                <td class="p-2 font-bold text-slate-800 border border-slate-300">${row.nama_kegiatan || row.kegiatan || '-'}</td>
                <td class="p-2 font-semibold text-slate-700 border border-slate-300">${row.sasaran || '-'}</td>
                <td class="p-2 font-bold text-emerald-600 border border-slate-300">Rp ${(row.biaya || row.anggaran || 0).toLocaleString('id-ID')}</td>
                <td class="p-2 text-center font-bold text-indigo-700 border border-slate-300">${row.status || 'Terencana'}</td>
            </tr>
        `).join('');
    }
}

function filterDataTabel() {
    const q = (document.getElementById('search-input')?.value || '').toLowerCase();
    if (!q) {
        renderTableData(cachedData);
        return;
    }
    const filtered = cachedData.filter(item => {
        const text = JSON.stringify(item).toLowerCase();
        return text.includes(q);
    });
    renderTableData(filtered);
}
