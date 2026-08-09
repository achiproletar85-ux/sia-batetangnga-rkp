// ==========================================
// FILE: frontend/sdgs.js
// TAB: SDGs DESA (INDIKATOR/FOKUS SDGs — MENARIK DARI rancangan_rkpdes)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const inputTgl = document.getElementById('tgl-cetak');
    const selectTim = document.getElementById('tim-penyusun');
    const selectTahun = document.getElementById('tahun-select');
    const printBtn = document.getElementById('print-btn');

    if (inputTgl) inputTgl.addEventListener('change', updateFooterSDGs);
    if (selectTim) selectTim.addEventListener('change', updateFooterSDGs);
    if (selectTahun) selectTahun.addEventListener('change', loadSDGsData);
    if (printBtn) printBtn.addEventListener('click', () => window.print());

    loadSDGsData();
});

function esc(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function updateFooterSDGs() {
    const valTgl = document.getElementById('tgl-cetak')?.value;
    const valTim = document.getElementById('tim-penyusun')?.value;

    const elTgl = document.getElementById('footer-sdgs-tgl');
    const elNama = document.getElementById('footer-sdgs-tim');

    if (elTgl) {
        if (valTgl) {
            const d = new Date(valTgl);
            elTgl.textContent = `Batetangnga, ${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
        } else {
            elTgl.textContent = 'Batetangnga, ....................';
        }
    }

    if (elNama) {
        elNama.textContent = valTim ? `( ${valTim.toUpperCase()} )` : '( ABDUL AZIS, S. Pd )';
    }
}

window.addEventListener('tahunChanged', (e) => {
    if (e && e.detail && e.detail.tahun) {
        if (typeof loadSDGsData === 'function') loadSDGsData();
    }
});

async function loadSDGsData() {
    try {
        const activeYear = localStorage.getItem('ACTIVE_TAHUN_ANGGARAN') || document.getElementById('tahun-select')?.value || 2027;

        // Fetch data via endpoint Express lokal (sumber: rancangan_rkpdes)
        const res = await fetch(`/api/sdgs-rancangan?tahun=${activeYear}`);
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const result = await res.json();
        
        // Parsing fleksibel (Array langsung atau result.data)
        let rawData = [];
        if (Array.isArray(result)) {
            rawData = result;
        } else if (result && Array.isArray(result.data)) {
            rawData = result.data;
        }

        const htmlTabel = renderTabelSDGs(rawData);
        injectSDGsToDOM(htmlTabel);
    } catch (err) {
        console.error("❌ Error loading usulan_sdgs:", err);
        const container = document.getElementById('livePreviewContainer') 
                       || document.getElementById('sdgsContainer');
        if (container) {
            container.innerHTML = `
                <div class="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-center my-6 text-xs font-sans">
                    <p class="font-bold text-sm mb-1">⚠️ Gagal Memuat Data SDGs</p>
                    <p class="mb-1">Pesan Error: <code class="bg-amber-100 px-1 py-0.5 rounded">${err.message}</code></p>
                    <p>Pastikan server Express berjalan di <code>http://localhost:5500</code>.</p>
                </div>
            `;
        }
    }
}

function renderTabelSDGs(rawData) {
    if (!Array.isArray(rawData) || rawData.length === 0) {
        return `<tr><td colspan="11" class="text-center py-4 italic text-slate-500">Tidak ada data usulan SDGs untuk tahun ini.</td></tr>`;
    }

    // 1. Grouping Data berdasarkan sdgs_ke (1 - 18)
    const groupedSDGs = {};
    rawData.forEach(row => {
        let sdgsNum = parseInt(row.sdgs_ke) || 18;
        if (!groupedSDGs[sdgsNum]) groupedSDGs[sdgsNum] = [];
        groupedSDGs[sdgsNum].push(row);
    });

    // Urutkan key SDGs (1, 2, 3...)
    const sortedKeys = Object.keys(groupedSDGs).map(Number).sort((a, b) => a - b);
    let html = '';

    sortedKeys.forEach(sdgsKey => {
        const items = groupedSDGs[sdgsKey];
        const rowSpan = items.length;

        items.forEach((item, index) => {
            const isFirst = index === 0;
            const noUrut = index + 1;
            const isChecked = item.is_checked || false;

            html += `
                <tr class="border border-slate-400 hover:bg-slate-50 ${isChecked ? 'bg-green-50' : ''}">
                    ${isFirst ? `<td rowspan="${rowSpan}" class="border border-slate-400 text-center font-bold align-top py-2 bg-slate-50 text-slate-900">${sdgsKey}</td>` : ''}
                    <td class="border border-slate-400 text-center py-1.5">${noUrut}</td>
                    <td class="border border-slate-400 px-2 text-left font-medium text-slate-800">${esc(item.uraian_kegiatan) || '-'}</td>
                    <td class="border border-slate-400 px-2 text-left">${esc(item.pengusul) || '-'}</td>
                    <td class="border border-slate-400 px-2 text-left">${esc(item.lokasi_kegiatan) || 'Desa Batetangnga'}</td>
                    <td class="border border-slate-400 text-center px-1">${esc(item.prakiraan_volume) || '-'}</td>
                    <td class="border border-slate-400 text-center px-1">${item.penerima_l ?? 0}</td>
                    <td class="border border-slate-400 text-center px-1">${item.penerima_p ?? 0}</td>
                    <td class="border border-slate-400 text-center px-1">${item.penerima_rtm ?? 0}</td>
                    <td class="border border-slate-400 px-2 text-left text-xs">${esc(item.keterangan) || esc(item.uraian_kegiatan) || '-'}</td>
                    <td class="border border-slate-400 text-center px-1 py-1 kolom-aksi whitespace-nowrap">
                        <button onclick="deleteUsulan('${item.id}')" title="Hapus" class="text-red-500 hover:text-red-700 mx-0.5">🗑️</button>
                    </td>
                </tr>
            `;
        });
    });

    return html;
}

function injectSDGsToDOM(htmlHasil) {
    const container = document.getElementById('sdgsContainer');
    if (!container) return;

    const activeYear = localStorage.getItem('ACTIVE_TAHUN_ANGGARAN') || '2027';

    container.innerHTML = `
        <style>
            @media print {
                body * { visibility: hidden; }
                #sdgsContainer, #sdgsContainer * { visibility: visible; }
                #sdgsContainer { position: absolute; left: 0; top: 0; width: 100%; }
                .no-print { display: none; }
            }
        </style>
        <div class="w-full bg-white p-6 shadow-sm border rounded-lg font-serif text-slate-900">
            <!-- HEADER JUDUL KOP -->
            <div class="text-center font-bold text-base mb-6 tracking-wide uppercase">
                DAFTAR USULAN MASYARAKAT DIPILAH BERDASARKAN TUJUAN SDGs DESA<br>
                <span class="text-indigo-700 font-extrabold text-sm">TAHUN ANGGARAN ${activeYear}</span>
            </div>

            <!-- IDENTITAS DESA -->
            <div class="mb-6 text-xs font-bold leading-relaxed space-y-1">
                <div class="flex"><span class="w-28">DESA</span><span>: BATETANGNGA</span></div>
                <div class="flex"><span class="w-28">KECAMATAN</span><span>: BINUANG</span></div>
                <div class="flex"><span class="w-28">KABUPATEN</span><span>: POLEWALI MANDAR</span></div>
                <div class="flex"><span class="w-28">PROVINSI</span><span>: SULAWESI BARAT</span></div>
            </div>

            <!-- TABEL MATRIKS USULAN SDGs -->
            <div class="overflow-x-auto mb-8">
                <table class="min-w-full border-collapse border border-slate-400 text-xs text-slate-800">
                    <thead>
                        <tr class="bg-slate-100 font-bold text-center border border-slate-400">
                            <th rowspan="2" class="border border-slate-400 px-2 py-2 w-12">SDGs ke-</th>
                            <th rowspan="2" class="border border-slate-400 px-2 py-2 w-10">No.</th>
                            <th rowspan="2" class="border border-slate-400 px-2 py-2 w-64">Usulan Kegiatan</th>
                            <th rowspan="2" class="border border-slate-400 px-2 py-2 w-32">Pengusul</th>
                            <th rowspan="2" class="border border-slate-400 px-2 py-2 w-36">Lokasi Kegiatan</th>
                            <th rowspan="2" class="border border-slate-400 px-2 py-2 w-28">Prakiraan Volume dan Satuan</th>
                            <th colspan="3" class="border border-slate-400 px-2 py-1">Penerima Manfaat</th>
                            <th rowspan="2" class="border border-slate-400 px-2 py-2 w-28">KET.</th>
                            <th rowspan="2" class="border border-slate-400 px-2 py-2 w-20 no-print">Aksi</th>
                        </tr>
                        <tr class="bg-slate-50 text-[11px] text-center border border-slate-400 font-bold">
                            <th class="border border-slate-400 px-2 py-1 w-12">LK</th>
                            <th class="border border-slate-400 px-2 py-1 w-12">PR</th>
                            <th class="border border-slate-400 px-2 py-1 w-12">RTM</th>
                        </tr>
                        <tr class="bg-slate-200 text-[10px] text-center italic border border-slate-400">
                            <td class="border border-slate-400">a</td>
                            <td class="border border-slate-400">b</td>
                            <td class="border border-slate-400">c</td>
                            <td class="border border-slate-400">d</td>
                            <td class="border border-slate-400">e</td>
                            <td class="border border-slate-400">f</td>
                            <td class="border border-slate-400">g</td>
                            <td class="border border-slate-400">h</td>
                            <td class="border border-slate-400">i</td>
                            <td class="border border-slate-400"></td>
                            <td class="border border-slate-400 no-print"></td>
                        </tr>
                    </thead>
                    <tbody>
                        ${htmlHasil}
                    </tbody>
                </table>
            </div>

            <!-- FOOTER TANDA TANGAN -->
            <div class="flex justify-between items-start text-xs mt-6 px-4 font-sans">
                <div class="text-center">
                    <p class="mb-1 font-bold">Mengetahui,</p>
                    <p class="font-bold">Kepala Desa Batetangnga</p>
                    <div class="h-16"></div>
                    <p class="font-bold underline uppercase">SUMAILA DAMANG</p>
                </div>
                <div class="text-center">
                    <p id="footer-sdgs-tgl" class="mb-1">Batetangnga, ....................</p>
                    <p class="font-bold">Disusun oleh,</p>
                    <p class="font-bold">Ketua Tim Penyusun RKPDesa</p>
                    <div class="h-16"></div>
                    <p id="footer-sdgs-tim" class="font-bold underline uppercase">( ABDUL AZIS, S. Pd )</p>
                </div>
            </div>
        </div>
    `;

    updateFooterSDGs();
}


// Ensure modal functions are accessible globally in DOM
window.bukaModalTarikData = function() {
    const modal = document.getElementById('modalTarikData');
    if (modal) {
        modal.classList.remove('hidden');
        loadUsulanTahunAsal();
    } else {
        alert('Elemen #modalTarikData tidak ditemukan di HTML!');
    }
};

window.tutupModalTarikData = function() {
    const modal = document.getElementById('modalTarikData');
    if (modal) modal.classList.add('hidden');
};

window.loadUsulanTahunAsal = async function() {
    const tahunAsal = document.getElementById('select-tahun-asal')?.value || '2028';
    const container = document.getElementById('container-daftar-asal');
    if (!container) return;

    container.innerHTML = `<p class="text-center py-4 italic text-slate-500">Memuat data tahun ${tahunAsal}...</p>`;

    try {
        const res = await fetch(`/api/sdgs-rancangan?tahun=${tahunAsal}`);
        const result = await res.json();
        const rawData = Array.isArray(result) ? result : (result.data || []);

        if (rawData.length === 0) {
            container.innerHTML = `<p class="text-center py-4 italic text-slate-500">Tidak ada data usulan pada tahun ${tahunAsal}.</p>`;
            return;
        }

        let html = '';
        rawData.forEach(item => {
            const safeItem = JSON.stringify(item).replace(/&/g, '&amp;').replace(/'/g, '&apos;');
            html += `
                <label class="flex items-start gap-2.5 bg-white p-2.5 rounded border border-slate-200 hover:border-indigo-300 cursor-pointer shadow-sm">
                    <input type="checkbox" class="cb-tarik-item mt-1 rounded text-indigo-600" value="${item.id}" data-item='${safeItem}'>
                    <div class="flex-1">
                        <div class="font-bold text-slate-800">${esc(item.uraian_kegiatan)}</div>
                        <div class="text-[11px] text-slate-500 flex gap-3 mt-0.5">
                            <span>📍 ${esc(item.lokasi_kegiatan) || 'Desa Batetangnga'}</span>
                            <span>👤 Pengusul: ${esc(item.pengusul) || '-'}</span>
                            <span>📦 Vol: ${esc(item.prakiraan_volume) || '-'}</span>
                        </div>
                    </div>
                </label>
            `;
        });
        container.innerHTML = html;
    } catch (err) {
        console.error("Error loading usulan tahun asal:", err);
        container.innerHTML = `<p class="text-center py-4 text-red-500">Gagal memuat data dari tahun ${tahunAsal}.</p>`;
    }
};

window.eksekusiTarikData = async function() {
    const tahunAsal = document.getElementById('select-tahun-asal').value;
    const modePergeseran = document.querySelector('input[name="modePergeseran"]:checked')?.value || 'salin';
    const targetTahun = document.getElementById('tahun-select')?.value || 2027;

    const checkboxes = document.querySelectorAll('.cb-tarik-item:checked');
    if (checkboxes.length === 0) {
        alert('Pilih setidaknya satu program kegiatan yang ingin ditarik!');
        return;
    }

    let countSuccess = 0;

    for (const cb of checkboxes) {
        const idData = cb.value;
        const rawItem = JSON.parse(cb.dataset.item);

        if (modePergeseran === 'salin') {
            // Salin ke rancangan_rkpdes tahun target (sumber lengkap SDGs)
            const payload = {
                tahun: parseInt(targetTahun),
                bidang: rawItem.bidang || 1,
                sdgs_ke: rawItem.sdgs_ke || 18,
                uraian_kegiatan: rawItem.uraian_kegiatan,
                pengusul: rawItem.pengusul || '',
                lokasi_kegiatan: rawItem.lokasi_kegiatan || 'Desa Batetangnga',
                prakiraan_volume: rawItem.prakiraan_volume || '',
                penerima_l: rawItem.penerima_l ?? 0,
                penerima_p: rawItem.penerima_p ?? 0,
                penerima_rtm: rawItem.penerima_rtm ?? 0,
                keterangan: `(Urgen - Ditarik dari Perencanaan Tahun ${tahunAsal})`
            };

            const res = await fetch('/api/sdgs-rancangan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const j = await res.json();
            if (j.success) countSuccess++;

        } else if (modePergeseran === 'pindah') {
            // Pindah tahun: update tahun target pada baris rancangan_rkpdes
            const res = await fetch(`/api/sdgs-rancangan/${idData}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tahun: parseInt(targetTahun) })
            });
            const j = await res.json();
            if (res.ok && j.success !== false) countSuccess++;
        }
    }

    alert(`✅ Berhasil memproses ${countSuccess} kegiatan ke Tahun ${targetTahun}!`);
    tutupModalTarikData();
    if (typeof loadSDGsData === 'function') loadSDGsData();
};
