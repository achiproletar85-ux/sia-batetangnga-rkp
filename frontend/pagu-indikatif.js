// ==========================================
// FILE: frontend/pagu-indikatif.js
// Logika Pagu Indikatif Desa: Murni & Perubahan (PAK)
// ==========================================

let currentPaguMode = 'MURNI';

function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `fixed bottom-6 right-6 px-6 py-3 rounded-2xl text-white font-bold shadow-xl z-50 transition-all duration-300 ${
        type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
    }`;
    toast.classList.remove('hidden');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.add('hidden'), 3500);
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // 1. Cek parameter URL (?tipe=perubahan)
        const params = new URLSearchParams(window.location.search);
        const tipeParam = params.get('tipe') || params.get('mode');
        if (tipeParam && tipeParam.toUpperCase() === 'PERUBAHAN') {
            currentPaguMode = 'PERUBAHAN';
        } else {
            currentPaguMode = 'MURNI';
        }

        // 2. Sinkronkan kontrol tanggal cetak & tim penyusun
        const inputTgl = document.getElementById('tgl-cetak') || document.getElementById('input-tanggal-pembiayaan');
        const selectTim = document.getElementById('tim-penyusun') || document.getElementById('select-tim-penyusun');

        if (inputTgl) {
            inputTgl.addEventListener('change', updateFooterPaguIndikatif);
            inputTgl.addEventListener('input', updateFooterPaguIndikatif);
        }
        if (selectTim) {
            selectTim.addEventListener('change', updateFooterPaguIndikatif);
            selectTim.addEventListener('input', updateFooterPaguIndikatif);
        }

        // 3. Terapkan tampilan mode aktif dan muat data awal
        updatePaguModeUI();
        loadPaguIndikatifData();
    });
}

function switchPaguMode(mode) {
    currentPaguMode = String(mode || '').toUpperCase() === 'PERUBAHAN' ? 'PERUBAHAN' : 'MURNI';

    // Perbarui query param URL tanpa reload halaman
    try {
        const url = new URL(window.location.href);
        if (currentPaguMode === 'PERUBAHAN') {
            url.searchParams.set('tipe', 'perubahan');
        } else {
            url.searchParams.delete('tipe');
        }
        window.history.replaceState({}, '', url.toString());
    } catch (e) {
        console.warn('Gagal memperbarui URL parameter:', e);
    }

    updatePaguModeUI();
    loadPaguIndikatifData();
}

function updatePaguModeUI() {
    const btnMurni = document.getElementById('tab-btn-pagu-murni');
    const btnPerubahan = document.getElementById('tab-btn-pagu-perubahan');
    const badge = document.getElementById('pagu-mode-badge');
    const btnSync = document.getElementById('btn-sync-rab-perubahan');
    const docTitle = document.getElementById('pagu-doc-title');
    const komparasiContainer = document.getElementById('komparasi-container');

    if (currentPaguMode === 'PERUBAHAN') {
        if (btnMurni) {
            btnMurni.className = 'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 text-slate-700 hover:text-slate-900 cursor-pointer bg-transparent';
        }
        if (btnPerubahan) {
            btnPerubahan.className = 'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm cursor-pointer';
        }
        if (badge) {
            badge.className = 'bg-amber-50 border border-amber-300 text-amber-900 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm';
            badge.innerHTML = '<i class="fas fa-check-circle text-amber-600"></i> Otomatis terkalkulasi dari RAB Perubahan';
        }
        if (btnSync) {
            btnSync.classList.remove('hidden');
        }
        if (docTitle) {
            docTitle.textContent = 'PAGU INDIKATIF PERUBAHAN DESA';
        }
        if (komparasiContainer) {
            komparasiContainer.classList.remove('hidden');
        }
    } else {
        if (btnMurni) {
            btnMurni.className = 'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-indigo-600 text-white shadow-sm cursor-pointer';
        }
        if (btnPerubahan) {
            btnPerubahan.className = 'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 text-slate-700 hover:text-slate-900 cursor-pointer bg-transparent';
        }
        if (badge) {
            badge.className = 'bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm';
            badge.innerHTML = '<i class="fas fa-info-circle text-indigo-500"></i> Mode: Pagu Indikatif Asli (Murni)';
        }
        if (btnSync) {
            btnSync.classList.add('hidden');
        }
        if (docTitle) {
            docTitle.textContent = 'PAGU INDIKATIF DESA';
        }
        if (komparasiContainer) {
            komparasiContainer.classList.add('hidden');
            komparasiContainer.innerHTML = '';
        }
    }
}

async function refreshPaguPerubahan() {
    const btnSync = document.getElementById('btn-sync-rab-perubahan');
    if (btnSync) {
        btnSync.disabled = true;
        btnSync.innerHTML = '<i class="fas fa-circle-notch animate-spin"></i> Menyinkronkan...';
    }
    try {
        await loadPaguIndikatifData();
        showToast('Data Pagu Indikatif Perubahan berhasil disinkronkan dari RAB Perubahan!', 'success');
    } catch (err) {
        showToast('Gagal menyinkronkan data: ' + err.message, 'error');
    } finally {
        if (btnSync) {
            btnSync.disabled = false;
            btnSync.innerHTML = '<i class="fas fa-rotate"></i> Sinkronkan / Refresh dari RAB Perubahan';
        }
    }
}

function renderMatriksKomparasiPagu(compData, activeYear) {
    if (!compData) return '';
    const sumberList = Array.isArray(compData.sumber_dana) ? compData.sumber_dana : [];
    const bidangList = Array.isArray(compData.bidang) ? compData.bidang : [];

    const totalPlafon = Number(compData.total_plafon_murni || 0);
    const totalBelanjaMurni = Number(compData.total_belanja_murni || 0);
    const totalPaguPerubahan = Number(compData.total_pagu_perubahan || 0);
    const totalSelisih = Number(compData.total_selisih !== undefined ? compData.total_selisih : (totalPaguPerubahan - totalBelanjaMurni));
    const totalPersen = totalBelanjaMurni > 0 ? ((totalSelisih / totalBelanjaMurni) * 100) : 0;

    const badgeStatus = (status) => {
        const s = String(status || 'Sesuai Pagu').trim();
        if (s === 'Melampaui Pagu') {
            return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300"><i class="fas fa-triangle-exclamation mr-1 text-[9px]"></i> Melampaui Pagu</span>`;
        }
        if (s === 'Seimbang') {
            return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-300"><i class="fas fa-equals mr-1 text-[9px]"></i> Seimbang</span>`;
        }
        return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300"><i class="fas fa-circle-check mr-1 text-[9px]"></i> Sesuai Pagu</span>`;
    };

    const formatDiff = (diff, pct) => {
        const d = Number(diff || 0);
        const p = Number(pct || 0);
        if (d === 0) return `<span class="text-slate-500 font-medium">Rp 0 (0.00%)</span>`;
        const sign = d > 0 ? '+' : '';
        const color = d > 0 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold';
        return `<span class="${color}">${sign}Rp ${Math.abs(Math.round(d)).toLocaleString('id-ID')} (${sign}${p.toFixed(2)}%)</span>`;
    };

    let sdRowsHtml = '';
    sumberList.forEach((r, idx) => {
        const plafon = Number(r.pagu_murni || 0);
        const bMurni = Number(r.belanja_murni || 0);
        const pPerub = Number(r.pagu_perubahan || 0);
        const selisih = Number(r.selisih_murni !== undefined ? r.selisih_murni : (pPerub - bMurni));
        const persen = Number(r.persentase_murni || 0);
        const sisaPlafon = Number(r.sisa_plafon !== undefined ? r.sisa_plafon : (plafon - pPerub));

        sdRowsHtml += `
            <tr class="border-b border-slate-300 hover:bg-slate-50 transition">
                <td class="border border-slate-300 px-2 py-1.5 text-center font-medium">${idx + 1}</td>
                <td class="border border-slate-300 px-3 py-1.5 font-bold text-slate-800">${r.sumber_dana}</td>
                <td class="border border-slate-300 px-3 py-1.5 text-right font-medium">${plafon > 0 ? 'Rp ' + plafon.toLocaleString('id-ID') : '-'}</td>
                <td class="border border-slate-300 px-3 py-1.5 text-right font-medium">${bMurni > 0 ? 'Rp ' + bMurni.toLocaleString('id-ID') : '-'}</td>
                <td class="border border-slate-300 px-3 py-1.5 text-right font-bold text-indigo-900 bg-amber-50/50">${pPerub > 0 ? 'Rp ' + pPerub.toLocaleString('id-ID') : '-'}</td>
                <td class="border border-slate-300 px-3 py-1.5 text-right">${formatDiff(selisih, persen)}</td>
                <td class="border border-slate-300 px-3 py-1.5 text-right font-medium ${sisaPlafon < 0 ? 'text-rose-600 font-bold' : 'text-slate-700'}">${sisaPlafon !== 0 ? (sisaPlafon < 0 ? '-' : '') + 'Rp ' + Math.abs(sisaPlafon).toLocaleString('id-ID') : 'Rp 0'}</td>
                <td class="border border-slate-300 px-3 py-1.5 text-center">${badgeStatus(r.status_keseimbangan)}</td>
            </tr>
        `;
    });

    let bidRowsHtml = '';
    bidangList.forEach((b, idx) => {
        const bMurni = Number(b.belanja_murni || 0);
        const bPerub = Number(b.belanja_perubahan || 0);
        const selisih = Number(b.selisih !== undefined ? b.selisih : (bPerub - bMurni));
        const persen = Number(b.persentase || 0);

        bidRowsHtml += `
            <tr class="border-b border-slate-300 hover:bg-slate-50 transition">
                <td class="border border-slate-300 px-2 py-1.5 text-center font-medium">${idx + 1}</td>
                <td class="border border-slate-300 px-3 py-1.5 font-bold text-slate-800">${b.bidang}</td>
                <td class="border border-slate-300 px-3 py-1.5 text-right font-medium">${bMurni > 0 ? 'Rp ' + bMurni.toLocaleString('id-ID') : '-'}</td>
                <td class="border border-slate-300 px-3 py-1.5 text-right font-bold text-indigo-900 bg-amber-50/50">${bPerub > 0 ? 'Rp ' + bPerub.toLocaleString('id-ID') : '-'}</td>
                <td class="border border-slate-300 px-3 py-1.5 text-right">${formatDiff(selisih, persen)}</td>
            </tr>
        `;
    });

    return `
        <div class="space-y-6">
            <!-- NOTIFIKASI INFORMASI OTOMATIS -->
            <div class="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 p-4 rounded-xl shadow-sm text-slate-800 no-print">
                <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                        <i class="fas fa-calculator text-sm"></i>
                    </div>
                    <div class="flex-1 text-xs">
                        <div class="font-black text-sm text-amber-950 mb-0.5">
                            Matriks Komparasi Pagu Indikatif Perubahan (Otomatis dari RAB Perubahan)
                        </div>
                        <p class="text-slate-600 leading-relaxed">
                            Pagu Indikatif Perubahan ini <strong>terakumulasi otomatis</strong> dari seluruh rincian belanja pada tabel <code>rab</code> bertipe <code>PERUBAHAN</code>. Deviasi dihitung terhadap realisasi belanja penetapan Murni serta plafon awal sumber dana.
                        </p>
                    </div>
                </div>
            </div>

            <!-- 1. TABEL REKAPITULASI SUMBER DANA -->
            <div class="border border-slate-400 rounded-lg overflow-hidden bg-white shadow-sm">
                <div class="bg-slate-100 px-4 py-2 border-b border-slate-400 font-bold text-xs text-slate-800 flex justify-between items-center">
                    <span class="flex items-center gap-2">
                        <i class="fas fa-wallet text-indigo-700"></i>
                        TABEL 1. KOMPARASI PAGU SUMBER DANA (PLAFON AWAL VS BELANJA RAB PERUBAHAN)
                    </span>
                    <span class="text-[11px] font-normal text-slate-500">Tahun Anggaran ${activeYear}</span>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full border-collapse border border-slate-400 text-xs text-slate-800">
                        <thead>
                            <tr class="bg-slate-100 font-bold text-center border-b border-slate-400">
                                <th class="border border-slate-400 px-2 py-2 w-10">No</th>
                                <th class="border border-slate-400 px-3 py-2 text-left">Sumber Dana</th>
                                <th class="border border-slate-400 px-3 py-2 text-right w-36">Plafon Awal (Murni)</th>
                                <th class="border border-slate-400 px-3 py-2 text-right w-36">Belanja Murni</th>
                                <th class="border border-slate-400 px-3 py-2 text-right w-40 bg-amber-100/60 text-indigo-950">Pagu Perubahan (RAB)</th>
                                <th class="border border-slate-400 px-3 py-2 text-right w-44">Selisih Deviasi (Rp & %)</th>
                                <th class="border border-slate-400 px-3 py-2 text-right w-36">Sisa Plafon</th>
                                <th class="border border-slate-400 px-3 py-2 text-center w-36">Status Keseimbangan</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sdRowsHtml}
                        </tbody>
                        <tfoot>
                            <tr class="bg-slate-200 font-black border-t-2 border-slate-500">
                                <td colspan="2" class="border border-slate-400 px-3 py-2 text-center uppercase tracking-wider">JUMLAH TOTAL</td>
                                <td class="border border-slate-400 px-3 py-2 text-right font-black">${totalPlafon > 0 ? 'Rp ' + totalPlafon.toLocaleString('id-ID') : '-'}</td>
                                <td class="border border-slate-400 px-3 py-2 text-right font-black">${totalBelanjaMurni > 0 ? 'Rp ' + totalBelanjaMurni.toLocaleString('id-ID') : '-'}</td>
                                <td class="border border-slate-400 px-3 py-2 text-right font-black text-indigo-950 bg-amber-200/50">${totalPaguPerubahan > 0 ? 'Rp ' + totalPaguPerubahan.toLocaleString('id-ID') : '-'}</td>
                                <td class="border border-slate-400 px-3 py-2 text-right font-black">${formatDiff(totalSelisih, totalPersen)}</td>
                                <td class="border border-slate-400 px-3 py-2 text-right font-black ${(totalPlafon - totalPaguPerubahan) < 0 ? 'text-rose-600' : 'text-slate-800'}">Rp ${Math.abs(totalPlafon - totalPaguPerubahan).toLocaleString('id-ID')}</td>
                                <td class="border border-slate-400 px-3 py-2 text-center">${badgeStatus(totalPaguPerubahan > totalPlafon && totalPlafon > 0 ? 'Melampaui Pagu' : (totalPaguPerubahan === 0 && totalPlafon === 0 ? 'Seimbang' : 'Sesuai Pagu'))}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <!-- 2. TABEL REKAPITULASI PER BIDANG -->
            <div class="border border-slate-400 rounded-lg overflow-hidden bg-white shadow-sm">
                <div class="bg-slate-100 px-4 py-2 border-b border-slate-400 font-bold text-xs text-slate-800 flex justify-between items-center">
                    <span class="flex items-center gap-2">
                        <i class="fas fa-layer-group text-emerald-700"></i>
                        TABEL 2. KOMPARASI BELANJA PER BIDANG (MURNI VS PERUBAHAN)
                    </span>
                    <span class="text-[11px] font-normal text-slate-500">Tahun Anggaran ${activeYear}</span>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full border-collapse border border-slate-400 text-xs text-slate-800">
                        <thead>
                            <tr class="bg-slate-100 font-bold text-center border-b border-slate-400">
                                <th class="border border-slate-400 px-2 py-2 w-10">No</th>
                                <th class="border border-slate-400 px-3 py-2 text-left">Bidang Pembangunan & Penyelenggaraan</th>
                                <th class="border border-slate-400 px-3 py-2 text-right w-48">Belanja Murni (Rp)</th>
                                <th class="border border-slate-400 px-3 py-2 text-right w-48 bg-amber-100/60 text-indigo-950">Belanja Perubahan (Rp)</th>
                                <th class="border border-slate-400 px-3 py-2 text-right w-52">Selisih Bertambah/(Berkurang)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bidRowsHtml}
                        </tbody>
                        <tfoot>
                            <tr class="bg-slate-200 font-black border-t-2 border-slate-500">
                                <td colspan="2" class="border border-slate-400 px-3 py-2 text-center uppercase tracking-wider">TOTAL BELANJA SELURUH BIDANG</td>
                                <td class="border border-slate-400 px-3 py-2 text-right font-black">${totalBelanjaMurni > 0 ? 'Rp ' + totalBelanjaMurni.toLocaleString('id-ID') : '-'}</td>
                                <td class="border border-slate-400 px-3 py-2 text-right font-black text-indigo-950 bg-amber-200/50">${totalPaguPerubahan > 0 ? 'Rp ' + totalPaguPerubahan.toLocaleString('id-ID') : '-'}</td>
                                <td class="border border-slate-400 px-3 py-2 text-right font-black">${formatDiff(totalSelisih, totalPersen)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    `;
}

async function loadPaguIndikatifData() {
    const activeYear = Number(document.getElementById('select-year')?.value) || 2027;
    const tahunHeader = document.getElementById('tahun-header');
    if (tahunHeader) tahunHeader.textContent = `TAHUN ANGGARAN ${activeYear}`;

    const tbody = document.getElementById('tabel-pagu-body');
    const komparasiContainer = document.getElementById('komparasi-container');
    const isPerubahan = currentPaguMode === 'PERUBAHAN';

    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-12 text-slate-400">
                    <i class="fas fa-circle-notch animate-spin text-3xl mb-4 text-indigo-600"></i>
                    <p>Mengambil Data Pagu Indikatif ${isPerubahan ? 'Perubahan (PAK)' : 'Asli (Murni)'} Tahun ${activeYear}...</p>
                </td>
            </tr>
        `;
    }

    try {
        if (isPerubahan) {
            // MODE PERUBAHAN
            // 1. Muat data agregasi komparasi
            if (komparasiContainer) {
                komparasiContainer.classList.remove('hidden');
                komparasiContainer.innerHTML = `
                    <div class="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500 animate-pulse">
                        <i class="fas fa-circle-notch animate-spin mr-2"></i> Menghitung rekapitulasi pagu perubahan dan komparasi sumber dana...
                    </div>
                `;
                try {
                    const resComp = await fetch(`/api/pagu-indikatif/perubahan?tahun=${activeYear}`, { cache: 'no-store' });
                    if (resComp.ok) {
                        const jsonComp = await resComp.json();
                        if (jsonComp.success && jsonComp.data) {
                            komparasiContainer.innerHTML = renderMatriksKomparasiPagu(jsonComp.data, activeYear);
                        } else {
                            komparasiContainer.innerHTML = `<div class="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs">Peringatan: Data agregasi pagu perubahan tidak tersedia.</div>`;
                        }
                    }
                } catch (eComp) {
                    console.warn('Gagal memuat komparasi pagu perubahan:', eComp);
                    komparasiContainer.innerHTML = `<div class="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">Gagal memuat matriks komparasi: ${eComp.message}</div>`;
                }
            }

            // 2. Muat rincian kegiatan belanja RAB PERUBAHAN
            let rawData = [];
            try {
                const resRab = await fetch(`/api/rab?tahun=${activeYear}&tipe=PERUBAHAN`, { cache: 'no-store' });
                if (resRab.ok) {
                    const raw = await resRab.json();
                    const list = Array.isArray(raw) ? raw : (raw.data || []);
                    if (Array.isArray(list) && list.length > 0) {
                        rawData = list;
                    }
                }
            } catch (eRab) {
                console.warn('Error fetching RAB Perubahan data:', eRab);
            }

            if (tbody) {
                const htmlHasil = renderTabelPaguIndikatif(rawData);
                if (htmlHasil && htmlHasil.trim()) {
                    tbody.innerHTML = htmlHasil;
                } else {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="7" class="text-center py-10 text-slate-500">
                                <div class="max-w-md mx-auto p-4 bg-amber-50/80 border border-amber-200 rounded-xl">
                                    <i class="fas fa-clipboard-question text-amber-500 text-3xl mb-2"></i>
                                    <p class="font-bold text-slate-700">Belum Ada Rincian Kegiatan RAB Perubahan Tahun ${activeYear}</p>
                                    <p class="text-xs text-slate-500 mt-1">
                                        Data pagu indikatif perubahan terisi otomatis saat terdapat belanja kegiatan di menu <strong>RAB Desa (Perubahan)</strong>.
                                    </p>
                                </div>
                            </td>
                        </tr>
                    `;
                }
            }
        } else {
            // MODE MURNI
            if (komparasiContainer) {
                komparasiContainer.classList.add('hidden');
                komparasiContainer.innerHTML = '';
            }

            let rawData = [];
            let isFromRab = false;
            try {
                const res = await fetch(`/api/rab?tahun=${activeYear}&tipe=MURNI`, { cache: 'no-store' });
                if (res.ok) {
                    const raw = await res.json();
                    const rabList = Array.isArray(raw) ? raw : (raw.data || []);
                    if (Array.isArray(rabList) && rabList.length > 0) {
                        rawData = rabList;
                        isFromRab = true;
                    }
                }
            } catch (e) {
                console.warn('Error fetching RAB data:', e);
            }

            if (!isFromRab || rawData.length === 0) {
                try {
                    const resFallback = await fetch(`/api/rkpdes?tahun=${activeYear}`, { cache: 'no-store' });
                    if (resFallback.ok) {
                        const rawFallback = await resFallback.json();
                        const fallbackList = Array.isArray(rawFallback) ? rawFallback : (rawFallback.data || []);
                        if (Array.isArray(fallbackList) && fallbackList.length > 0) {
                            rawData = fallbackList;
                        }
                    }
                } catch (e) {
                    console.warn('Error fetching fallback RKPDes data:', e);
                }
            }

            if (!isFromRab && typeof window.normalisasiRkpdesRows === 'function' && rawData.length > 0) {
                rawData = window.normalisasiRkpdesRows(rawData);
            }

            if (tbody) {
                const htmlHasil = renderTabelPaguIndikatif(rawData);
                if (htmlHasil && htmlHasil.trim()) {
                    tbody.innerHTML = htmlHasil;
                } else {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="7" class="text-center py-8 text-slate-400">
                                Tidak ada data Pagu Indikatif untuk tahun ${activeYear}.
                            </td>
                        </tr>
                    `;
                }
            }
        }
    } catch (err) {
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-8 text-red-500 font-bold">
                        ❌ Gagal memuat data: ${err.message}
                    </td>
                </tr>
            `;
        }
    }
}

function updateFooterPaguIndikatif() {
    const valTgl = document.getElementById('tgl-cetak')?.value || document.getElementById('input-tanggal-pembiayaan')?.value;
    const valTim = document.getElementById('tim-penyusun')?.value || document.getElementById('select-tim-penyusun')?.value;

    const elTgl = document.getElementById('footer-pagu-tgl');
    const elNama = document.getElementById('footer-pagu-tim');

    if (elTgl) {
        if (valTgl) {
            const d = new Date(valTgl);
            if (!isNaN(d.getTime())) {
                elTgl.textContent = `Desa Batetangnga, ${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
            } else {
                elTgl.textContent = `Desa Batetangnga, ${valTgl}`;
            }
        } else {
            elTgl.textContent = 'Desa Batetangnga, ....................';
        }
    }

    if (elNama) {
        let nama = valTim || '';
        if (nama.includes('|')) nama = nama.split('|')[0];
        elNama.textContent = nama ? `( ${nama.toUpperCase()} )` : '( ABDUL AZIS, S. Pd )';
    }
}

function sortByKodeUnikFull(dataArray) {
    if (!Array.isArray(dataArray)) return dataArray;
    const parse = (k) => String(k || '').split('.').map(p => p.replace(/\D/g, '')).map((n) => n ? Number(n) : 0);
    return dataArray.slice().sort((a, b) => {
        const ka = parse(a.kode_unik_full || a.kode_unik || a.kode_klasifikasi || a.kode || '');
        const kb = parse(b.kode_unik_full || b.kode_unik || b.kode_klasifikasi || b.kode || '');
        const maxLen = Math.max(ka.length, kb.length);
        for (let i = 0; i < maxLen; i++) {
            const da = ka[i] || 0, db = kb[i] || 0;
            if (da !== db) return da - db;
        }
        return 0;
    });
}

const SUB_BIDANG_MAP = {
    '01.01': 'Penyelenggaraan Belanja Siltap, Tunjangan dan Operasional Pemerintahan Desa',
    '01.02': 'Sarana dan Prasarana Pemerintahan Desa',
    '01.03': 'Administrasi Kependudukan, Pencatatan Sipil, Statistik dan Kearsipan',
    '01.04': 'Tata Praja Pemerintahan, Perencanaan, Keuangan dan Pelaporan',
    '01.05': 'Pertanahan',
    '02.01': 'Pendidikan',
    '02.02': 'Kesehatan',
    '02.03': 'Pekerjaan Umum dan Penataan Ruang',
    '02.04': 'Kawasan Permukiman',
    '02.05': 'Kehutanan dan Lingkungan Hidup',
    '02.06': 'Perhubungan, Komunikasi dan Informatika',
    '02.07': 'Energi dan Sumber Daya Mineral',
    '02.08': 'Pariwisata',
    '03.01': 'Ketenteraman, Ketertiban Umum dan Perlindungan Masyarakat',
    '03.02': 'Kebudayaan dan Keagamaan',
    '03.03': 'Kepemudaan dan Olahraga',
    '03.04': 'Kelembagaan Masyarakat',
    '04.01': 'Kelautan dan Perikanan',
    '04.02': 'Pertanian dan Peternakan',
    '04.03': 'Peningkatan Kapasitas Aparatur Desa',
    '04.04': 'Pemberdayaan Perempuan, Perlindungan Anak dan Keluarga',
    '04.05': 'Koperasi, Usaha Mikro Kecil dan Menengah (UMKM)',
    '04.06': 'Dukungan Penanaman Modal',
    '04.07': 'Perdagangan dan Perindustrian',
    '05.01': 'Penanggulangan Bencana',
    '05.02': 'Keadaan Darurat',
    '05.03': 'Keadaan Mendesak'
};

function renderTabelPaguIndikatif(rawData) {
    if (!Array.isArray(rawData)) return '';

    const groupedData = {};
    const sorted = sortByKodeUnikFull(rawData);

    sorted.forEach(row => {
        // A. Level 1: Bidang Utama (Romawi I - V)
        const bName = (row.rpjm_data && row.rpjm_data.bidang) || row.bidang || '';
        let targetBidangKey = "Bidang Penyelenggaraan Pemerintahan Desa";
        const bLower = String(bName).toLowerCase();

        if (bLower.includes('pembangunan')) targetBidangKey = "Bidang Pelaksanaan Pembangunan Desa";
        else if (bLower.includes('pembinaan')) targetBidangKey = "Bidang Pembinaan Kemasyarakatan";
        else if (bLower.includes('pemberdayaan')) targetBidangKey = "Bidang Pemberdayaan Masyarakat";
        else if (bLower.includes('penanggulangan') || bLower.includes('darurat') || bLower.includes('bencana')) {
            targetBidangKey = "Bidang Penanggulangan Bencana, Darurat dan Mendesak";
        }
        if (!groupedData[targetBidangKey]) groupedData[targetBidangKey] = {};

        // B. Level 2: Sub Bidang / Jenis Bidang
        const prefix = String(row.kode_unik_full || row.kode_unik || '').slice(0, 5);
        let jBidang = (row.rpjm_data && row.rpjm_data.jenis_bidang) || row.sub_bidang || SUB_BIDANG_MAP[prefix] || row.jenis_bidang || row.sub_group_nama || row.sub_kegiatan || '';
        if (!jBidang || /^\d[\d.]*$/.test(jBidang.toString().trim())) {
            jBidang = SUB_BIDANG_MAP[prefix] || 'Penyelenggaran Belanja Siltap, Tunjangan dan Operasional Pemerintahan Desa';
        }
        jBidang = jBidang.toString().trim();
        if (!groupedData[targetBidangKey][jBidang]) groupedData[targetBidangKey][jBidang] = {};

        // C. Level 3: Sub Kegiatan / Jenis Kegiatan
        let jKegiatan = row.jenis_kegiatan || (row.rpjm_data && row.rpjm_data.jenis_kegiatan) || row.group_nama || '';
        if (!jKegiatan || /^\d[\d.]*$/.test(jKegiatan.toString().trim())) {
            jKegiatan = (row.rpjm_data && row.rpjm_data.nama_kegiatan && !/^\d[\d.]*$/.test(row.rpjm_data.nama_kegiatan)) 
                ? row.rpjm_data.nama_kegiatan 
                : (row.nama_kegiatan || row.uraian || 'Kegiatan Desa');
        }
        jKegiatan = jKegiatan.toString().trim();
        if (!groupedData[targetBidangKey][jBidang][jKegiatan]) groupedData[targetBidangKey][jBidang][jKegiatan] = {};

        // D. Level 4: Uraian / Nama Kegiatan
        let nKegiatan = row.nama_kegiatan || row.uraian || (row.rpjm_data && row.rpjm_data.nama_kegiatan) || jKegiatan || 'Kegiatan Desa';
        nKegiatan = nKegiatan.toString().trim();

        let itemsArr = (row.items && Array.isArray(row.items) && row.items.length > 0) ? row.items : [];
        if (itemsArr.length === 0) {
            const budgetVal = Number(row.jumlah_anggaran || row.total_anggaran || row.anggaran || row.prakiraan_biaya || row.anggaran_rab || row.pagu_rpjm || 0);
            const sumberVal = row.sumber_dana || row.sumber_pembiayaan || row.sumber_dana_rab || 'DDS';
            if (budgetVal > 0) {
                itemsArr = [{ jumlah: budgetVal, sumber: sumberVal }];
            } else {
                return; // skip rows with 0 budget
            }
        }

        if (!groupedData[targetBidangKey][jBidang][jKegiatan][nKegiatan]) {
            groupedData[targetBidangKey][jBidang][jKegiatan][nKegiatan] = { dds: 0, add: 0, bagi_hasil: 0, apbd_prov: 0, apbd_kab: 0, total: 0 };
        }
        itemsArr.forEach(item => {
            const jml = Number(item.jumlah || item.jumlah_anggaran || item.total_anggaran || item.anggaran || row.jumlah_anggaran || row.total_anggaran || row.anggaran || row.prakiraan_biaya || row.pagu_rab || 0);
            if (!jml || jml <= 0) return;
            const s = (item.sumber || item.sumber_dana || row.sumber_dana || row.sumber_pembiayaan || row.sumber_dana_rab || '').toUpperCase();

            if (s.includes('ADD') || s.includes('ALOKASI DANA DESA') || s.includes('ALOKASI DANA')) {
                groupedData[targetBidangKey][jBidang][jKegiatan][nKegiatan].add += jml;
            } else if (s.includes('DDS') || s.includes('DANA DESA') || s.includes('APBN')) {
                groupedData[targetBidangKey][jBidang][jKegiatan][nKegiatan].dds += jml;
            } else if (s.includes('BAGI HASIL') || s.includes('PAJAK') || s.includes('RETRIBUSI') || s.includes('PBH')) {
                groupedData[targetBidangKey][jBidang][jKegiatan][nKegiatan].bagi_hasil += jml;
            } else if (s.includes('PROVINSI') || s.includes('BKK') || s.includes('PROV') || s.includes('TK. I') || s.includes('TK I') || s.includes('TINGKAT I')) {
                groupedData[targetBidangKey][jBidang][jKegiatan][nKegiatan].apbd_prov += jml;
            } else if (s.includes('KABUPATEN') || s.includes('KOTA') || s.includes('KAB') || s.includes('TK. II') || s.includes('TK II') || s.includes('TINGKAT II')) {
                groupedData[targetBidangKey][jBidang][jKegiatan][nKegiatan].apbd_kab += jml;
            } else {
                groupedData[targetBidangKey][jBidang][jKegiatan][nKegiatan].add += jml;
            }
            groupedData[targetBidangKey][jBidang][jKegiatan][nKegiatan].total += jml;
        });
    });

    let html = '';
    let noUrut = 0;
    const fmt = (num) => num > 0 ? 'Rp ' + num.toLocaleString('id-ID') : '';
    const cell = (b, k) => fmt(b[k]);
    const empty = () => ({ dds:0, add:0, bagi_hasil:0, apbd_prov:0, apbd_kab:0 });
    const acc = (target, src) => { ['dds','add','bagi_hasil','apbd_prov','apbd_kab'].forEach(k => target[k] += (src[k]||0)); };
    const hasAny = (o) => ['dds','add','bagi_hasil','apbd_prov','apbd_kab'].some(k => Number(o[k]||0) > 0);

    const BIDANG_ORDER = [
        { romawi: 'I',   label: 'Bidang Penyelenggaraan Pemerintahan Desa' },
        { romawi: 'II',  label: 'Bidang Pelaksanaan Pembangunan Desa' },
        { romawi: 'III', label: 'Bidang Pembinaan Kemasyarakatan' },
        { romawi: 'IV',  label: 'Bidang Pemberdayaan Masyarakat' },
        { romawi: 'V',   label: 'Bidang Penanggulangan Bencana, Darurat dan Mendesak' }
    ];

    const headerRow = (romawi, labelTd) => `
        <tr class="border border-slate-400 bg-slate-100 font-bold">
            <td class="border border-slate-400 text-center py-2 font-bold">${romawi}</td>
            <td class="border border-slate-400 px-2 font-bold">${labelTd}</td>
            <td class="border border-slate-400 text-center"></td>
            <td class="border border-slate-400 text-center"></td>
            <td class="border border-slate-400 text-center"></td>
            <td class="border border-slate-400 text-center"></td>
            <td class="border border-slate-400 text-center"></td>
        </tr>`;

    const totalRow = (labelTd, sum, cls) => `
        <tr class="${cls} border border-slate-400">
            <td class="border border-slate-400 text-center py-2"></td>
            <td class="border border-slate-400 px-2 font-black">${labelTd}</td>
            <td class="border border-slate-400 text-right px-2">${cell(sum,'dds')}</td>
            <td class="border border-slate-400 text-right px-2">${cell(sum,'add')}</td>
            <td class="border border-slate-400 text-right px-2">${cell(sum,'bagi_hasil')}</td>
            <td class="border border-slate-400 text-right px-2">${cell(sum,'apbd_prov')}</td>
            <td class="border border-slate-400 text-right px-2">${cell(sum,'apbd_kab')}</td>
        </tr>`;

    let grand = empty();

    BIDANG_ORDER.forEach(bd => {
        const jBidangObj = groupedData[bd.label] || {};
        let bdSum = empty();

        html += headerRow(bd.romawi, bd.label);
        noUrut = 0;

        Object.keys(jBidangObj).forEach(jBidangKey => {
            const jKegObj = jBidangObj[jBidangKey];
            let jbSum = empty();

            Object.keys(jKegObj).forEach(jKegiatanKey => {
                const nKegObj = jKegObj[jKegiatanKey];
                let jkSum = empty();
                let rowsHtml = '';

                Object.keys(nKegObj).forEach(nKey => {
                    const d = nKegObj[nKey];
                    if (!hasAny(d)) return;
                    acc(jkSum, d);
                    noUrut++;
                    rowsHtml += `
                        <tr class="border border-slate-400 hover:bg-slate-50">
                            <td class="border border-slate-400 text-center py-1">${noUrut}</td>
                            <td class="border border-slate-400 px-8 text-slate-800">${nKey}</td>
                            <td class="border border-slate-400 text-right px-2">${cell(d,'dds')}</td>
                            <td class="border border-slate-400 text-right px-2">${cell(d,'add')}</td>
                            <td class="border border-slate-400 text-right px-2">${cell(d,'bagi_hasil')}</td>
                            <td class="border border-slate-400 text-right px-2">${cell(d,'apbd_prov')}</td>
                            <td class="border border-slate-400 text-right px-2">${cell(d,'apbd_kab')}</td>
                        </tr>
                    `;
                });

                if (!hasAny(jkSum)) return;
                acc(jbSum, jkSum);
                html += `
                    <tr class="border border-slate-400">
                        <td class="border border-slate-400"></td>
                        <td class="border border-slate-400 px-6 font-bold italic text-slate-800">${jKegiatanKey}</td>
                        <td class="border border-slate-400 text-center"></td>
                        <td class="border border-slate-400 text-center"></td>
                        <td class="border border-slate-400 text-center"></td>
                        <td class="border border-slate-400 text-center"></td>
                        <td class="border border-slate-400 text-center"></td>
                    </tr>
                `;
                html += rowsHtml;
                if (hasAny(jkSum)) {
                    html += totalRow(`Sub Jumlah ${jKegiatanKey}`, jkSum, 'font-bold bg-slate-50');
                }
            });

            if (!hasAny(jbSum)) return;
            acc(bdSum, jbSum);
            html += `
                <tr class="font-bold bg-slate-50 border border-slate-400">
                    <td class="border border-slate-400"></td>
                    <td class="border border-slate-400 px-4 font-bold text-slate-900">${jBidangKey}</td>
                    <td class="border border-slate-400 text-center"></td>
                    <td class="border border-slate-400 text-center"></td>
                    <td class="border border-slate-400 text-center"></td>
                    <td class="border border-slate-400 text-center"></td>
                    <td class="border border-slate-400 text-center"></td>
                </tr>
            `;
        });

        if (hasAny(bdSum)) {
            acc(grand, bdSum);
            html += totalRow(`Jumlah ${bd.label}`, bdSum, 'font-bold bg-slate-50');
        }
    });

    if (hasAny(grand)) {
        html += totalRow('JUMLAH TOTAL PAGU INDIKATIF', grand, 'font-black bg-slate-200');
    }

    return html;
}

function injectPaguIndikatifToDOM(htmlHasil) {
    const container = document.getElementById('livePreviewContainer') 
                   || document.getElementById('paguIndikatifContainer')
                   || document.querySelector('.overflow-x-auto');

    if (!container) return;

    container.innerHTML = `
        <div class="w-full bg-white p-6 shadow-sm border rounded-lg font-serif text-slate-900">
            <!-- 1. JUDUL KOP ATAS RESMI -->
            <div id="pagu-doc-title" class="text-center font-bold text-base mb-6 tracking-wide uppercase">
                ${currentPaguMode === 'PERUBAHAN' ? 'PAGU INDIKATIF PERUBAHAN DESA' : 'PAGU INDIKATIF DESA'}
            </div>

            <!-- 2. IDENTITAS DESA BERTIKAT KIRI -->
            <div class="mb-6 text-xs font-bold leading-relaxed space-y-1">
                <div class="flex"><span class="w-28">DESA</span><span>: BATETANGNGA</span></div>
                <div class="flex"><span class="w-28">KECAMATAN</span><span>: BINUANG</span></div>
                <div class="flex"><span class="w-28">KABUPATEN</span><span>: POLEWALI MANDAR</span></div>
                <div class="flex"><span class="w-28">PROVINSI</span><span>: SULAWESI BARAT</span></div>
            </div>

            <!-- 3. TABEL MATRIKS PAGU INDIKATIF -->
            <div class="overflow-x-auto mb-8">
                <table class="min-w-full border-collapse border border-slate-400 text-xs text-slate-800">
                    <thead>
                        <tr class="bg-slate-50 font-bold text-center border border-slate-400">
                            <th rowspan="3" class="border border-slate-400 px-2 py-2 w-10">No</th>
                            <th rowspan="3" class="border border-slate-400 px-2 py-2 w-72">Indikatif Program/ Kegiatan Desa</th>
                            <th colspan="5" class="border border-slate-400 px-2 py-1">Sumber Dana Indikatif</th>
                        </tr>
                        <tr class="bg-slate-50 text-[11px] text-center border border-slate-400 font-bold">
                            <th rowspan="2" class="border border-slate-400 px-2 py-1.5 w-32">Dana Desa (APBN)</th>
                            <th rowspan="2" class="border border-slate-400 px-2 py-1.5 w-40">Alokasi Dana Desa (bagian dana perimbangan kab./ kota)</th>
                            <th rowspan="2" class="border border-slate-400 px-2 py-1.5 w-36">Dana bagian dari hasil pajak dan retribusi</th>
                            <th colspan="2" class="border border-slate-400 px-2 py-1">Bantuan keuangan</th>
                        </tr>
                        <tr class="bg-slate-50 text-[10px] text-center border border-slate-400 font-bold">
                            <th class="border border-slate-400 px-2 py-1 w-28">APBD Provinsi</th>
                            <th class="border border-slate-400 px-2 py-1 w-32">APBD Kabupaten/ Kota</th>
                        </tr>
                    </thead>
                    <tbody id="tabel-pagu-body">
                        ${htmlHasil}
                    </tbody>
                </table>
            </div>

            <!-- 4. FOOTER TANDA TANGAN RESMI (HANYA KANAN BAWAH) -->
            <div class="flex justify-end text-xs mt-8 pr-6 font-sans">
                <div class="text-center w-80">
                    <p id="footer-pagu-tgl" class="mb-1">Desa Batetangnga, ....................</p>
                    <p class="font-bold mb-16">Ketua Tim Penyusun RKPDesa</p>
                    <p id="footer-pagu-tim" class="font-bold underline uppercase">( ABDUL AZIS, S. Pd )</p>
                </div>
            </div>
        </div>
    `;

    updateFooterPaguIndikatif();
}

if (typeof window !== 'undefined') {
    window.currentPaguMode = currentPaguMode;
    window.switchPaguMode = switchPaguMode;
    window.updatePaguModeUI = updatePaguModeUI;
    window.refreshPaguPerubahan = refreshPaguPerubahan;
    window.renderMatriksKomparasiPagu = renderMatriksKomparasiPagu;
    window.loadPaguIndikatifData = loadPaguIndikatifData;
    window.renderTabelPaguIndikatif = renderTabelPaguIndikatif;
    window.updateFooterPaguIndikatif = updateFooterPaguIndikatif;
    window.injectPaguIndikatifToDOM = injectPaguIndikatifToDOM;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        renderTabelPaguIndikatif,
        renderMatriksKomparasiPagu,
        SUB_BIDANG_MAP,
        sortByKodeUnikFull
    };
}
