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

async function loadSDGsData() {
    const activeYear = document.getElementById('tahun-select')?.value || 2027;

    // Sinkronkan badge tahun di banner atas
    const bannerTahun = document.getElementById('banner-tahun-text');
    if (bannerTahun) bannerTahun.textContent = activeYear;

    try {
        // Fetch data via endpoint Express lokal (sumber: rancangan_rkpdes)
        const res = await fetch(`/api/sdgs-rancangan?tahun=${activeYear}`, { cache: 'no-store' });
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

        // Map ulang & bersihkan properti pengusul mutlak dari payload API
        rawData = rawData.map(item => {
            const p = (item.pengusul && String(item.pengusul).trim() !== '' && String(item.pengusul).trim() !== '-')
                ? String(item.pengusul).trim()
                : ((item.nama_pengusul && String(item.nama_pengusul).trim() !== '' && String(item.nama_pengusul).trim() !== '-')
                    ? String(item.nama_pengusul).trim()
                    : ((item.rpjm_data && item.rpjm_data.nama_pengusul && String(item.rpjm_data.nama_pengusul).trim() !== '' && String(item.rpjm_data.nama_pengusul).trim() !== '-')
                        ? String(item.rpjm_data.nama_pengusul).trim()
                        : (item.pengusul || item.nama_pengusul || (item.rpjm_data && item.rpjm_data.nama_pengusul) || '-')));
            return {
                ...item,
                pengusul: p,
                nama_pengusul: p
            };
        });

        // Perbarui ringkasan statistik pada banner atas
        const totalUsulan = rawData.length;
        const fokusSet = new Set();
        rawData.forEach(r => {
            if (r.sdgs_ke) fokusSet.add(parseInt(r.sdgs_ke));
        });
        const totalFokus = fokusSet.size;

        const statUsulanEl = document.getElementById('stat-total-usulan');
        if (statUsulanEl) statUsulanEl.textContent = totalUsulan;
        const statFokusEl = document.getElementById('stat-total-fokus');
        if (statFokusEl) statFokusEl.textContent = `${totalFokus} / 18`;

        const htmlTabel = renderTabelSDGs(rawData, activeYear);
        injectSDGsToDOM(htmlTabel, activeYear);
    } catch (err) {
        console.error("❌ Error loading usulan_sdgs:", err);
        const container = document.getElementById('livePreviewContainer') 
                       || document.getElementById('sdgsContainer');
        if (container) {
            container.innerHTML = `
                <div class="bg-amber-50 border border-amber-200 text-amber-800 p-6 rounded-xl text-center my-6 text-xs font-sans shadow-sm">
                    <div class="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-2 text-base">
                        <i class="fas fa-triangle-exclamation"></i>
                    </div>
                    <p class="font-bold text-sm mb-1 text-amber-900">Gagal Memuat Data SDGs</p>
                    <p class="mb-2 text-slate-600">Pesan Error: <code class="bg-amber-100 px-1.5 py-0.5 rounded text-amber-900 font-mono">${err.message}</code></p>
                    <p class="text-[11px] text-slate-500">Pastikan server backend SIA Batetangnga aktif di port yang sesuai.</p>
                </div>
            `;
        }
    }
}

function renderTabelSDGs(rawData, activeYear) {
    if (!Array.isArray(rawData) || rawData.length === 0) {
        return `
            <tr>
                <td colspan="11" class="text-center py-12 bg-slate-50 text-slate-500 border border-slate-300 print:border-black">
                    <div class="flex flex-col items-center justify-center gap-2">
                        <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xl no-print">
                            <i class="fas fa-inbox"></i>
                        </div>
                        <p class="font-bold text-sm text-slate-700">Tidak ada data usulan SDGs untuk tahun ${activeYear || ''}.</p>
                        <p class="text-xs text-slate-400 max-w-md no-print">Klik tombol "Tarik Program Urgen" di bagian atas untuk mengimpor atau memindahkan usulan prioritas dari perencanaan tahun lain.</p>
                    </div>
                </td>
            </tr>
        `;
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
            const pName = (item.pengusul && String(item.pengusul).trim() !== '' && String(item.pengusul).trim() !== '-')
                ? String(item.pengusul).trim()
                : ((item.nama_pengusul && String(item.nama_pengusul).trim() !== '' && String(item.nama_pengusul).trim() !== '-')
                    ? String(item.nama_pengusul).trim()
                    : ((item.rpjm_data && item.rpjm_data.nama_pengusul && String(item.rpjm_data.nama_pengusul).trim() !== '' && String(item.rpjm_data.nama_pengusul).trim() !== '-')
                        ? String(item.rpjm_data.nama_pengusul).trim()
                        : (item.pengusul || item.nama_pengusul || (item.rpjm_data && item.rpjm_data.nama_pengusul) || '-')));

            html += `
                <tr class="border-b border-slate-200 hover:bg-indigo-50/40 transition-colors duration-150 ${isChecked ? 'bg-emerald-50/60' : (index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50')} print:border-black print:bg-transparent">
                    ${isFirst ? `
                    <td rowspan="${rowSpan}" class="border border-slate-300 text-center font-bold align-middle py-3 px-2 bg-slate-50/90 text-slate-800 print:border-black print:bg-transparent print:p-1">
                        <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-extrabold border border-indigo-200 shadow-xs print:border-none print:bg-transparent print:text-black print:w-auto print:h-auto print:text-[8.5pt]">
                            ${sdgsKey}
                        </span>
                    </td>` : ''}
                    <td class="border border-slate-300 text-center py-2 px-1 text-slate-600 font-medium print:border-black print:text-black print:py-1">${noUrut}</td>
                    <td class="border border-slate-300 px-3 py-2 text-left font-medium text-slate-900 leading-snug print:border-black print:text-black print:py-1">${esc(item.uraian_kegiatan) || '-'}</td>
                    <td class="border border-slate-300 px-3 py-2 text-left text-slate-700 print:border-black print:text-black print:py-1">${esc(pName)}</td>
                    <td class="border border-slate-300 px-3 py-2 text-left text-slate-700 print:border-black print:text-black print:py-1">${esc(item.lokasi_kegiatan) || 'Desa Batetangnga'}</td>
                    <td class="border border-slate-300 text-center px-2 py-2 text-slate-700 font-medium print:border-black print:text-black print:py-1">${esc(item.prakiraan_volume) || '-'}</td>
                    <td class="border border-slate-300 text-center px-2 py-2 text-slate-800 font-mono text-xs print:border-black print:text-black print:py-1">${item.penerima_l ?? 0}</td>
                    <td class="border border-slate-300 text-center px-2 py-2 text-slate-800 font-mono text-xs print:border-black print:text-black print:py-1">${item.penerima_p ?? 0}</td>
                    <td class="border border-slate-300 text-center px-2 py-2 text-slate-800 font-mono text-xs print:border-black print:text-black print:py-1">${item.penerima_rtm ?? 0}</td>
                    <td class="border border-slate-300 px-3 py-2 text-left text-xs text-slate-600 print:border-black print:text-black print:py-1">${esc(item.keterangan) || esc(item.uraian_kegiatan) || '-'}</td>
                    <td class="border border-slate-300 text-center px-1.5 py-2 kolom-aksi no-print whitespace-nowrap">
                        <button onclick="deleteUsulan('${item.id}')" title="Hapus Usulan" class="p-1.5 text-rose-500 hover:text-white hover:bg-rose-600 rounded-md transition shadow-xs cursor-pointer">
                            <i class="fas fa-trash-alt text-xs"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    });

    return html;
}

function injectSDGsToDOM(htmlHasil, activeYear) {
    const container = document.getElementById('sdgsContainer');
    if (!container) return;

    const displayYear = activeYear || document.getElementById('tahun-select')?.value || 2027;

    container.innerHTML = `
        <div class="w-full bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 text-slate-900 font-sans print:border-none print:shadow-none print:p-0 print:m-0">
            <!-- HEADER JUDUL KOP -->
            <div class="text-center mb-6">
                <div class="font-black text-base md:text-lg tracking-wide uppercase text-slate-900 print:text-black">
                    DAFTAR USULAN MASYARAKAT DIPILAH BERDASARKAN TUJUAN SDGs DESA
                </div>
                <div class="text-xs md:text-sm font-bold text-indigo-700 mt-1 uppercase print:text-black">
                    TAHUN ANGGARAN ${displayYear}
                </div>
            </div>

            <!-- IDENTITAS DESA -->
            <div class="mb-5 text-xs font-bold leading-relaxed">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-700 print:bg-transparent print:border-none print:p-0 print:text-black">
                    <div class="flex items-center gap-1.5"><span class="text-slate-400 print:text-black">DESA:</span> <span class="text-slate-900 font-bold print:text-black">BATETANGNGA</span></div>
                    <div class="flex items-center gap-1.5"><span class="text-slate-400 print:text-black">KECAMATAN:</span> <span class="text-slate-900 font-bold print:text-black">BINUANG</span></div>
                    <div class="flex items-center gap-1.5"><span class="text-slate-400 print:text-black">KABUPATEN:</span> <span class="text-slate-900 font-bold print:text-black">POLEWALI MANDAR</span></div>
                    <div class="flex items-center gap-1.5"><span class="text-slate-400 print:text-black">PROVINSI:</span> <span class="text-slate-900 font-bold print:text-black">SULAWESI BARAT</span></div>
                </div>
            </div>

            <!-- TABEL MATRIKS USULAN SDGs -->
            <div class="table-wrapper overflow-x-auto mb-8 rounded-lg border border-slate-300 print:border-none print:overflow-visible">
                <table class="min-w-full border-collapse border border-slate-300 text-xs text-slate-800 print:border-black print:text-[8pt]">
                    <thead>
                        <tr class="bg-slate-800 text-white font-bold text-center border border-slate-700 print:bg-slate-100 print:text-black print:border-black">
                            <th rowspan="2" class="border border-slate-700 px-3 py-3 w-14 text-center font-bold text-slate-100 uppercase tracking-wider text-[11px] print:border-black print:text-black print:py-1">SDGs ke-</th>
                            <th rowspan="2" class="border border-slate-700 px-2 py-3 w-12 text-center font-bold text-slate-100 uppercase tracking-wider text-[11px] print:border-black print:text-black print:py-1">No.</th>
                            <th rowspan="2" class="border border-slate-700 px-4 py-3 min-w-[240px] text-left font-bold text-slate-100 uppercase tracking-wider text-[11px] print:border-black print:text-black print:py-1">Usulan Kegiatan</th>
                            <th rowspan="2" class="border border-slate-700 px-3 py-3 min-w-[130px] text-left font-bold text-slate-100 uppercase tracking-wider text-[11px] print:border-black print:text-black print:py-1">Pengusul</th>
                            <th rowspan="2" class="border border-slate-700 px-3 py-3 min-w-[140px] text-left font-bold text-slate-100 uppercase tracking-wider text-[11px] print:border-black print:text-black print:py-1">Lokasi Kegiatan</th>
                            <th rowspan="2" class="border border-slate-700 px-3 py-3 min-w-[130px] text-center font-bold text-slate-100 uppercase tracking-wider text-[11px] print:border-black print:text-black print:py-1">Prakiraan Volume & Satuan</th>
                            <th colspan="3" class="border border-slate-700 px-2 py-1.5 text-center font-bold text-slate-100 uppercase tracking-wider text-[11px] print:border-black print:text-black print:py-1">Penerima Manfaat</th>
                            <th rowspan="2" class="border border-slate-700 px-3 py-3 min-w-[140px] text-left font-bold text-slate-100 uppercase tracking-wider text-[11px] print:border-black print:text-black print:py-1">Keterangan</th>
                            <th rowspan="2" class="border border-slate-700 px-2 py-3 w-16 text-center font-bold text-slate-100 uppercase tracking-wider text-[11px] no-print">Aksi</th>
                        </tr>
                        <tr class="bg-slate-700 text-slate-200 text-[10px] text-center font-bold border border-slate-600 print:bg-slate-100 print:text-black print:border-black">
                            <th class="border border-slate-600 px-2 py-1 w-12 print:border-black">LK</th>
                            <th class="border border-slate-600 px-2 py-1 w-12 print:border-black">PR</th>
                            <th class="border border-slate-600 px-2 py-1 w-12 print:border-black">RTM</th>
                        </tr>
                        <tr class="bg-slate-100 text-slate-600 text-[10px] text-center italic border border-slate-300 print:border-black print:text-black">
                            <td class="border border-slate-300 py-0.5 print:border-black">a</td>
                            <td class="border border-slate-300 py-0.5 print:border-black">b</td>
                            <td class="border border-slate-300 py-0.5 print:border-black">c</td>
                            <td class="border border-slate-300 py-0.5 print:border-black">d</td>
                            <td class="border border-slate-300 py-0.5 print:border-black">e</td>
                            <td class="border border-slate-300 py-0.5 print:border-black">f</td>
                            <td class="border border-slate-300 py-0.5 print:border-black">g</td>
                            <td class="border border-slate-300 py-0.5 print:border-black">h</td>
                            <td class="border border-slate-300 py-0.5 print:border-black">i</td>
                            <td class="border border-slate-300 py-0.5 print:border-black">j</td>
                            <td class="border border-slate-300 py-0.5 no-print"></td>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200 print:divide-black">
                        ${htmlHasil}
                    </tbody>
                </table>
            </div>

            <!-- FOOTER TANDA TANGAN -->
            <div class="print-signature flex justify-between items-start text-xs mt-8 px-6 font-sans">
                <div class="text-center">
                    <p class="mb-1 font-bold text-slate-700 print:text-black">Mengetahui,</p>
                    <p class="font-bold text-slate-900 print:text-black">Kepala Desa Batetangnga</p>
                    <div class="h-16"></div>
                    <p class="font-bold underline uppercase text-slate-900 print:text-black">SUMAILA DAMANG</p>
                </div>
                <div class="text-center">
                    <p id="footer-sdgs-tgl" class="mb-1 text-slate-600 print:text-black">Batetangnga, ....................</p>
                    <p class="font-bold text-slate-700 print:text-black">Disusun oleh,</p>
                    <p class="font-bold text-slate-900 print:text-black">Ketua Tim Penyusun RKPDesa</p>
                    <div class="h-16"></div>
                    <p id="footer-sdgs-tim" class="font-bold underline uppercase text-slate-900 print:text-black">( ABDUL AZIS, S. Pd )</p>
                </div>
            </div>
        </div>
    `;

    updateFooterSDGs();
}

// Handler penghapusan usulan SDGs
window.deleteUsulan = async function(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus usulan SDGs ini?')) return;
    try {
        const res = await fetch(`/api/sdgs-rancangan/${id}`, { method: 'DELETE' });
        const j = await res.json();
        if (j.success) {
            loadSDGsData();
        } else {
            alert('Gagal menghapus data: ' + (j.message || 'Error server'));
        }
    } catch (err) {
        console.error("Error deleting usulan:", err);
        alert('Terjadi kesalahan jaringan saat menghapus usulan.');
    }
};

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
        const res = await fetch(`/api/sdgs-rancangan?tahun=${tahunAsal}`, { cache: 'no-store' });
        const result = await res.json();
        const rawData = Array.isArray(result) ? result : (result.data || []);

        if (rawData.length === 0) {
            container.innerHTML = `<p class="text-center py-4 italic text-slate-500">Tidak ada data usulan pada tahun ${tahunAsal}.</p>`;
            return;
        }

        let html = '';
        rawData.forEach(item => {
            const safeItem = JSON.stringify(item).replace(/&/g, '&amp;').replace(/'/g, '&apos;');
            const pName = (item.pengusul && String(item.pengusul).trim() !== '' && String(item.pengusul).trim() !== '-')
                ? String(item.pengusul).trim()
                : ((item.nama_pengusul && String(item.nama_pengusul).trim() !== '' && String(item.nama_pengusul).trim() !== '-')
                    ? String(item.nama_pengusul).trim()
                    : ((item.rpjm_data && item.rpjm_data.nama_pengusul && String(item.rpjm_data.nama_pengusul).trim() !== '' && String(item.rpjm_data.nama_pengusul).trim() !== '-')
                        ? String(item.rpjm_data.nama_pengusul).trim()
                        : (item.pengusul || item.nama_pengusul || (item.rpjm_data && item.rpjm_data.nama_pengusul) || '-')));
            html += `
                <label class="flex items-start gap-2.5 bg-white p-2.5 rounded border border-slate-200 hover:border-indigo-300 cursor-pointer shadow-sm">
                    <input type="checkbox" class="cb-tarik-item mt-1 rounded text-indigo-600" value="${item.id}" data-item='${safeItem}'>
                    <div class="flex-1">
                        <div class="font-bold text-slate-800">${esc(item.uraian_kegiatan)}</div>
                        <div class="text-[11px] text-slate-500 flex gap-3 mt-0.5">
                            <span>📍 ${esc(item.lokasi_kegiatan) || 'Desa Batetangnga'}</span>
                            <span>👤 Pengusul: ${esc(pName)}</span>
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
            const pName = rawItem.pengusul || rawItem.nama_pengusul || (rawItem.rpjm_data && rawItem.rpjm_data.nama_pengusul) || '';
            // Salin ke rancangan_rkpdes tahun target (sumber lengkap SDGs)
            const payload = {
                tahun: parseInt(targetTahun),
                bidang: rawItem.bidang || 1,
                sdgs_ke: rawItem.sdgs_ke || 18,
                uraian_kegiatan: rawItem.uraian_kegiatan,
                pengusul: pName,
                nama_pengusul: pName,
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
