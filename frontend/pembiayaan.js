function switchTab(tab) {
    window.location.href = tab + '.html';
}

let pembiayaanList = [];
let activeYear = 2027;
let currentPembiayaanMode = 'MURNI'; // 'MURNI' | 'PERUBAHAN'
let pembiayaanKomparasiData = null;

const masterBidangList = [
    { key: 1, name: 'Bidang Penyelenggaraan Pemerintahan Desa' },
    { key: 2, name: 'Bidang Pelaksanaan Pembangunan Desa' },
    { key: 3, name: 'Bidang Pembinaan Kemasyarakatan' },
    { key: 4, name: 'Bidang Pemberdayaan Masyarakat' },
    { key: 5, name: 'Bidang Penanggulangan Bencana, Keadaan Darurat Dan Mendesak Desa' }
];

function escHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escAttr(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatRupiah(num) {
    if (!num || num === 0) return 'Rp 0';
    return 'Rp ' + Math.round(num).toLocaleString('id-ID');
}

function formatSelisih(num) {
    if (!num || num === 0) return 'Rp 0';
    const sign = num > 0 ? '+ ' : '- ';
    return sign + 'Rp ' + Math.abs(Math.round(num)).toLocaleString('id-ID');
}

function formatPersen(pct) {
    if (pct === null || pct === undefined || isNaN(pct)) return '0,00%';
    const sign = pct > 0 ? '+' : '';
    return sign + Number(pct).toFixed(2).replace('.', ',') + '%';
}

function switchPembiayaanMode(mode) {
    currentPembiayaanMode = (mode || '').toUpperCase() === 'PERUBAHAN' ? 'PERUBAHAN' : 'MURNI';
    const btnMurni = document.getElementById('tab-btn-pembiayaan-murni');
    const btnPerubahan = document.getElementById('tab-btn-pembiayaan-perubahan');
    const badge = document.getElementById('pembiayaan-mode-badge');
    const btnSync = document.getElementById('btn-sync-rab-perubahan');

    if (currentPembiayaanMode === 'PERUBAHAN') {
        if (btnMurni) {
            btnMurni.className = "px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 text-slate-700 hover:text-slate-900 cursor-pointer";
        }
        if (btnPerubahan) {
            btnPerubahan.className = "px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md cursor-pointer";
        }
        if (badge) {
            badge.className = "bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm";
            badge.innerHTML = `<i class="fas fa-calculator text-amber-600"></i> Mode: Pembiayaan Defenitif Perubahan (PAK)`;
        }
        if (btnSync) btnSync.classList.remove('hidden');
    } else {
        if (btnMurni) {
            btnMurni.className = "px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-indigo-600 text-white shadow-sm cursor-pointer";
        }
        if (btnPerubahan) {
            btnPerubahan.className = "px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 text-slate-700 hover:text-slate-900 cursor-pointer";
        }
        if (badge) {
            badge.className = "bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm";
            badge.innerHTML = `<i class="fas fa-info-circle text-indigo-500"></i> Mode: Pembiayaan Asli (Murni)`;
        }
        if (btnSync) btnSync.classList.add('hidden');
    }

    loadPembiayaanData();
}

function renderKomparasiPembiayaanHtml(komp) {
    if (!komp || !komp.penerimaan || !komp.pengeluaran || !komp.netto) return '';
    return `
        <div class="mb-8 p-5 bg-gradient-to-br from-amber-50/90 via-orange-50/70 to-slate-50 border border-amber-200/90 rounded-2xl shadow-sm no-print">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-amber-200 pb-3">
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-600 text-sm">
                        <i class="fas fa-scale-balanced"></i>
                    </div>
                    <div>
                        <h4 class="text-sm font-bold text-slate-900">Matriks Komparasi Pembiayaan Netto Perubahan (PAK APBDes)</h4>
                        <p class="text-[11px] text-slate-500">Perbandingan Rencana Pembiayaan Semula (Murni) vs Menjadi (Defenitif Perubahan)</p>
                    </div>
                </div>
                <span class="text-xs font-bold px-3 py-1 rounded-lg bg-amber-200/70 text-amber-900 border border-amber-300 shadow-2xs">
                    Tahun Anggaran ${activeYear}
                </span>
            </div>

            <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
                <table class="min-w-full text-xs border-collapse">
                    <thead>
                        <tr class="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                            <th class="p-2.5 text-center w-10 border-r border-slate-200">No</th>
                            <th class="p-2.5 text-left border-r border-slate-200">Uraian Pembiayaan</th>
                            <th class="p-2.5 text-right w-40 border-r border-slate-200">Semula (Murni)</th>
                            <th class="p-2.5 text-right w-44 border-r border-slate-200 bg-amber-50/60 text-amber-950">Menjadi (Perubahan)</th>
                            <th class="p-2.5 text-right w-40 border-r border-slate-200">Selisih (Rp)</th>
                            <th class="p-2.5 text-center w-24">Deviasi (%)</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200 font-sans">
                        <!-- 1. Penerimaan Pembiayaan -->
                        <tr class="bg-indigo-50/80 font-bold text-indigo-950">
                            <td class="p-2 text-center border-r border-slate-200">1</td>
                            <td colspan="5" class="p-2 uppercase tracking-wide">PENERIMAAN PEMBIAYAAN</td>
                        </tr>
                        <tr class="hover:bg-slate-50">
                            <td class="p-2 text-center text-slate-500 border-r border-slate-200">1.1</td>
                            <td class="p-2 text-slate-800 border-r border-slate-200 font-medium">Sisa Lebih Perhitungan Anggaran (SiLPA) Tahun Sebelumnya</td>
                            <td class="p-2 text-right font-mono text-slate-700 border-r border-slate-200">${formatRupiah(komp.penerimaan.silpa.semula)}</td>
                            <td class="p-2 text-right font-mono font-bold text-indigo-900 border-r border-slate-200 bg-amber-50/40">${formatRupiah(komp.penerimaan.silpa.menjadi)}</td>
                            <td class="p-2 text-right font-mono font-bold border-r border-slate-200 ${komp.penerimaan.silpa.selisih >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${formatSelisih(komp.penerimaan.silpa.selisih)}</td>
                            <td class="p-2 text-center font-mono font-bold ${komp.penerimaan.silpa.persen >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${formatPersen(komp.penerimaan.silpa.persen)}</td>
                        </tr>
                        <tr class="hover:bg-slate-50">
                            <td class="p-2 text-center text-slate-500 border-r border-slate-200">1.2</td>
                            <td class="p-2 text-slate-800 border-r border-slate-200 font-medium">Pencairan Dana Cadangan</td>
                            <td class="p-2 text-right font-mono text-slate-700 border-r border-slate-200">${formatRupiah(komp.penerimaan.pencairan_cadangan.semula)}</td>
                            <td class="p-2 text-right font-mono font-bold text-indigo-900 border-r border-slate-200 bg-amber-50/40">${formatRupiah(komp.penerimaan.pencairan_cadangan.menjadi)}</td>
                            <td class="p-2 text-right font-mono font-bold border-r border-slate-200 ${komp.penerimaan.pencairan_cadangan.selisih >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${formatSelisih(komp.penerimaan.pencairan_cadangan.selisih)}</td>
                            <td class="p-2 text-center font-mono font-bold ${komp.penerimaan.pencairan_cadangan.persen >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${formatPersen(komp.penerimaan.pencairan_cadangan.persen)}</td>
                        </tr>
                        <tr class="hover:bg-slate-50">
                            <td class="p-2 text-center text-slate-500 border-r border-slate-200">1.3</td>
                            <td class="p-2 text-slate-800 border-r border-slate-200 font-medium">Hasil Penjualan Kekayaan Desa yang Dipisahkan</td>
                            <td class="p-2 text-right font-mono text-slate-700 border-r border-slate-200">${formatRupiah(komp.penerimaan.penjualan_kekayaan.semula)}</td>
                            <td class="p-2 text-right font-mono font-bold text-indigo-900 border-r border-slate-200 bg-amber-50/40">${formatRupiah(komp.penerimaan.penjualan_kekayaan.menjadi)}</td>
                            <td class="p-2 text-right font-mono font-bold border-r border-slate-200 ${komp.penerimaan.penjualan_kekayaan.selisih >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${formatSelisih(komp.penerimaan.penjualan_kekayaan.selisih)}</td>
                            <td class="p-2 text-center font-mono font-bold ${komp.penerimaan.penjualan_kekayaan.persen >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${formatPersen(komp.penerimaan.penjualan_kekayaan.persen)}</td>
                        </tr>
                        <tr class="bg-indigo-100/60 font-bold text-indigo-950">
                            <td class="p-2 border-r border-slate-200"></td>
                            <td class="p-2 uppercase tracking-wide border-r border-slate-200">JUMLAH PENERIMAAN PEMBIAYAAN</td>
                            <td class="p-2 text-right font-mono border-r border-slate-200">${formatRupiah(komp.penerimaan.total.semula)}</td>
                            <td class="p-2 text-right font-mono font-black text-indigo-900 border-r border-slate-200 bg-amber-100/50">${formatRupiah(komp.penerimaan.total.menjadi)}</td>
                            <td class="p-2 text-right font-mono font-bold border-r border-slate-200 ${komp.penerimaan.total.selisih >= 0 ? 'text-emerald-700' : 'text-rose-700'}">${formatSelisih(komp.penerimaan.total.selisih)}</td>
                            <td class="p-2 text-center font-mono font-bold ${komp.penerimaan.total.persen >= 0 ? 'text-emerald-700' : 'text-rose-700'}">${formatPersen(komp.penerimaan.total.persen)}</td>
                        </tr>

                        <!-- 2. Pengeluaran Pembiayaan -->
                        <tr class="bg-rose-50/80 font-bold text-rose-950">
                            <td class="p-2 text-center border-r border-slate-200">2</td>
                            <td colspan="5" class="p-2 uppercase tracking-wide">PENGELUARAN PEMBIAYAAN</td>
                        </tr>
                        <tr class="hover:bg-slate-50">
                            <td class="p-2 text-center text-slate-500 border-r border-slate-200">2.1</td>
                            <td class="p-2 text-slate-800 border-r border-slate-200 font-medium">Pembentukan Dana Cadangan</td>
                            <td class="p-2 text-right font-mono text-slate-700 border-r border-slate-200">${formatRupiah(komp.pengeluaran.pembentukan_cadangan.semula)}</td>
                            <td class="p-2 text-right font-mono font-bold text-rose-900 border-r border-slate-200 bg-amber-50/40">${formatRupiah(komp.pengeluaran.pembentukan_cadangan.menjadi)}</td>
                            <td class="p-2 text-right font-mono font-bold border-r border-slate-200 ${komp.pengeluaran.pembentukan_cadangan.selisih >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${formatSelisih(komp.pengeluaran.pembentukan_cadangan.selisih)}</td>
                            <td class="p-2 text-center font-mono font-bold ${komp.pengeluaran.pembentukan_cadangan.persen >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${formatPersen(komp.pengeluaran.pembentukan_cadangan.persen)}</td>
                        </tr>
                        <tr class="hover:bg-slate-50">
                            <td class="p-2 text-center text-slate-500 border-r border-slate-200">2.2</td>
                            <td class="p-2 text-slate-800 border-r border-slate-200 font-medium">Penyertaan Modal Desa / BUMDes</td>
                            <td class="p-2 text-right font-mono text-slate-700 border-r border-slate-200">${formatRupiah(komp.pengeluaran.penyertaan_modal.semula)}</td>
                            <td class="p-2 text-right font-mono font-bold text-rose-900 border-r border-slate-200 bg-amber-50/40">${formatRupiah(komp.pengeluaran.penyertaan_modal.menjadi)}</td>
                            <td class="p-2 text-right font-mono font-bold border-r border-slate-200 ${komp.pengeluaran.penyertaan_modal.selisih >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${formatSelisih(komp.pengeluaran.penyertaan_modal.selisih)}</td>
                            <td class="p-2 text-center font-mono font-bold ${komp.pengeluaran.penyertaan_modal.persen >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${formatPersen(komp.pengeluaran.penyertaan_modal.persen)}</td>
                        </tr>
                        <tr class="bg-rose-100/60 font-bold text-rose-950">
                            <td class="p-2 border-r border-slate-200"></td>
                            <td class="p-2 uppercase tracking-wide border-r border-slate-200">JUMLAH PENGELUARAN PEMBIAYAAN</td>
                            <td class="p-2 text-right font-mono border-r border-slate-200">${formatRupiah(komp.pengeluaran.total.semula)}</td>
                            <td class="p-2 text-right font-mono font-black text-rose-900 border-r border-slate-200 bg-amber-100/50">${formatRupiah(komp.pengeluaran.total.menjadi)}</td>
                            <td class="p-2 text-right font-mono font-bold border-r border-slate-200 ${komp.pengeluaran.total.selisih >= 0 ? 'text-emerald-700' : 'text-rose-700'}">${formatSelisih(komp.pengeluaran.total.selisih)}</td>
                            <td class="p-2 text-center font-mono font-bold ${komp.pengeluaran.total.persen >= 0 ? 'text-emerald-700' : 'text-rose-700'}">${formatPersen(komp.pengeluaran.total.persen)}</td>
                        </tr>

                        <!-- 3. Pembiayaan Netto -->
                        <tr class="bg-amber-100/90 font-extrabold text-slate-900 text-xs border-t-2 border-amber-300">
                            <td class="p-2.5 text-center border-r border-slate-300">3</td>
                            <td class="p-2.5 uppercase tracking-wide border-r border-slate-300">PEMBIAYAAN NETTO (PENERIMAAN - PENGELUARAN)</td>
                            <td class="p-2.5 text-right font-mono border-r border-slate-300">${formatRupiah(komp.netto.semula)}</td>
                            <td class="p-2.5 text-right font-mono text-amber-950 font-black border-r border-slate-300 bg-amber-200/60">${formatRupiah(komp.netto.menjadi)}</td>
                            <td class="p-2.5 text-right font-mono font-black border-r border-slate-300 ${komp.netto.selisih >= 0 ? 'text-emerald-700' : 'text-rose-700'}">${formatSelisih(komp.netto.selisih)}</td>
                            <td class="p-2.5 text-center font-mono font-black ${komp.netto.persen >= 0 ? 'text-emerald-700' : 'text-rose-700'}">${formatPersen(komp.netto.persen)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

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

document.addEventListener('DOMContentLoaded', () => {
    try {
        localStorage.removeItem('pembiayaan_cache');
        localStorage.removeItem('rkpdes_cache');
    } catch(e) {}

    const inputTgl = document.getElementById('tgl-cetak') || document.getElementById('input-tanggal-pembiayaan');
    const selectTim = document.getElementById('tim-penyusun') || document.getElementById('select-tim-penyusun');

    if (inputTgl) {
        inputTgl.addEventListener('change', updateFooterPrint);
        inputTgl.addEventListener('input', updateFooterPrint);
    }
    if (selectTim) {
        selectTim.addEventListener('change', updateFooterPrint);
        selectTim.addEventListener('input', updateFooterPrint);
    }

    loadPembiayaanData();
});

function updateFooterPrint() {
    const valTgl = document.getElementById('tgl-cetak')?.value || document.getElementById('input-tanggal-pembiayaan')?.value;
    const valTim = document.getElementById('tim-penyusun')?.value || document.getElementById('select-tim-penyusun')?.value;

    // Update Teks Tanggal di Footer Cetak
    const elTglText = document.getElementById('footer-tgl-text');
    if (elTglText) {
        if (valTgl) {
            const dateObj = new Date(valTgl);
            if (!isNaN(dateObj.getTime())) {
                const formatted = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                elTglText.textContent = `Batetangnga, ${formatted}`;
            } else {
                elTglText.textContent = `Batetangnga, ${valTgl}`;
            }
        } else {
            elTglText.textContent = 'Batetangnga, ....................';
        }
    }

    // Update Teks Nama Tim Penyusun di Footer Cetak
    const elTimText = document.getElementById('footer-tim-text');
    if (elTimText) {
        let nama = valTim || '';
        if (nama.includes('|')) {
            nama = nama.split('|')[0];
        }
        elTimText.textContent = nama ? `( ${nama.toUpperCase()} )` : '( ABDUL AZIS, S. Pd )';
    }
}

function getBidangKey(item) {
    if (typeof item.bidang === 'number' && item.bidang >= 1 && item.bidang <= 5) return item.bidang;
    const bNum = parseInt(item.bidang, 10);
    if (!isNaN(bNum) && bNum >= 1 && bNum <= 5) return bNum;

    const bStr = String(item.bidang || '');
    if (bStr.includes('1') || bStr.toLowerCase().includes('penyelenggaraan')) return 1;
    if (bStr.includes('2') || bStr.toLowerCase().includes('pembangunan')) return 2;
    if (bStr.includes('3') || bStr.toLowerCase().includes('pembinaan')) return 3;
    if (bStr.includes('4') || bStr.toLowerCase().includes('pemberdayaan')) return 4;
    if (bStr.includes('5') || bStr.toLowerCase().includes('bencana')) return 5;

    const kode = String(item.kode_unik_full || item.kode_unik || '');
    if (kode.startsWith('01') || kode.startsWith('1.')) return 1;
    if (kode.startsWith('02') || kode.startsWith('2.')) return 2;
    if (kode.startsWith('03') || kode.startsWith('3.')) return 3;
    if (kode.startsWith('04') || kode.startsWith('4.')) return 4;
    if (kode.startsWith('05') || kode.startsWith('5.')) return 5;

    return 1;
}

function deduplicateItems(items) {
    if (!Array.isArray(items)) return [];
    const seen = new Set();
    const result = [];
    for (const item of items) {
        const kode = String(item.kode_unik_full || item.kode_unik || item.id || '').trim();
        if (kode && !seen.has(kode)) {
            seen.add(kode);
            result.push(item);
        } else if (!kode) {
            result.push(item);
        }
    }
    return result;
}

function sortAscendingByKode(dataArray) {
    if (!Array.isArray(dataArray)) return [];
    return [...dataArray].sort((a, b) => String(a.kode_unik_full || a.kode_unik || a.kode || '').localeCompare(String(b.kode_unik_full || b.kode_unik || b.kode || ''), undefined, { numeric: true, sensitivity: 'base' }));
}

function getNamaKegiatanPembiayaan(item) {
    if (!item) return '';
    let rpjmObj = item.rpjm_data;
    if (typeof rpjmObj === 'string') {
        try { rpjmObj = JSON.parse(rpjmObj); } catch(e) {}
    }
    if (rpjmObj && typeof rpjmObj === 'object' && rpjmObj.nama_kegiatan) {
        return rpjmObj.nama_kegiatan;
    }
    return item.nama_kegiatan || item.jenis_kegiatan || item.kegiatan_nama || item.group || item.subgroup || '';
}

function getSmartGroupNama(item, groupPrefix) {
    if (!item) return `Kelompok ${groupPrefix}`;
    let rpjmObj = item.rpjm_data;
    if (typeof rpjmObj === 'string') {
        try { rpjmObj = JSON.parse(rpjmObj); } catch(e) {}
    }
    if (item.group && typeof item.group === 'string' && !item.group.includes('undefined')) return item.group;
    if (item.group_nama && typeof item.group_nama === 'string' && !item.group_nama.includes('undefined')) return item.group_nama;
    if (item.sub_bidang_nama) return item.sub_bidang_nama;
    if (rpjmObj && typeof rpjmObj === 'object' && rpjmObj.sub_bidang_nama) return rpjmObj.sub_bidang_nama;
    if (rpjmObj && typeof rpjmObj === 'object' && rpjmObj.group) return rpjmObj.group;
    if (item.jenis_kegiatan) return item.jenis_kegiatan;
    if (item.nama_kegiatan) return item.nama_kegiatan;
    return `Kelompok ${groupPrefix}`;
}

function getSmartSubGroupNama(item, subGroupPrefix) {
    if (!item) return `Subgroup ${subGroupPrefix}`;
    let rpjmObj = item.rpjm_data;
    if (typeof rpjmObj === 'string') {
        try { rpjmObj = JSON.parse(rpjmObj); } catch(e) {}
    }
    if (item.subgroup && typeof item.subgroup === 'string' && !item.subgroup.includes('undefined')) return item.subgroup;
    if (item.sub_group_nama && typeof item.sub_group_nama === 'string' && !item.sub_group_nama.includes('undefined')) return item.sub_group_nama;
    if (item.kegiatan_nama) return item.kegiatan_nama;
    if (rpjmObj && typeof rpjmObj === 'object' && rpjmObj.kegiatan_nama) return rpjmObj.kegiatan_nama;
    if (rpjmObj && typeof rpjmObj === 'object' && rpjmObj.subgroup) return rpjmObj.subgroup;
    if (rpjmObj && typeof rpjmObj === 'object' && rpjmObj.nama_kegiatan) return rpjmObj.nama_kegiatan;
    if (item.jenis_kegiatan) return item.jenis_kegiatan;
    if (item.nama_kegiatan) return item.nama_kegiatan;
    return `Subgroup ${subGroupPrefix}`;
}

// EKSTRAKSI OTOMATIS CHILD RINCIAN ITEMS DARI TABEL/ARRAY RAB
function extractChildItems(item) {
    if (!item) return null;

    let rawList = null;

    if (Array.isArray(item.items) && item.items.length > 0) rawList = item.items;
    else if (Array.isArray(item.rab_items) && item.rab_items.length > 0) rawList = item.rab_items;
    else if (Array.isArray(item.uraian_items) && item.uraian_items.length > 0) rawList = item.uraian_items;
    else if (Array.isArray(item.rincian) && item.rincian.length > 0) rawList = item.rincian;
    else if (typeof item.items === 'string') {
        try {
            const parsed = JSON.parse(item.items);
            if (Array.isArray(parsed) && parsed.length > 0) rawList = parsed;
        } catch (e) {}
    } else if (typeof item.uraian_rab === 'string') {
        try {
            const parsed = JSON.parse(item.uraian_rab);
            if (Array.isArray(parsed) && parsed.length > 0) rawList = parsed;
        } catch (e) {}
    }

    return rawList;
}

// PEMETAAN KOLOM RESMI DARI TABEL `rab` (item.uraian, item.jenis_kegiatan)
function getCleanUraianText(item) {
    if (item.uraian && typeof item.uraian === 'string' && item.uraian.trim().toLowerCase() !== 'uraian' && item.uraian.trim() !== '-') {
        return item.uraian.trim();
    }
    if (item.jenis_kegiatan && typeof item.jenis_kegiatan === 'string' && item.jenis_kegiatan.trim()) {
        return item.jenis_kegiatan.trim();
    }
    if (item.nama_kegiatan && typeof item.nama_kegiatan === 'string' && item.nama_kegiatan.trim()) {
        return item.nama_kegiatan.trim();
    }
    return '-';
}

function extractFirstItemObj(row) {
    if (!row) return {};
    let itemsArr = row.items;
    if (typeof itemsArr === 'string') {
        try { itemsArr = JSON.parse(itemsArr); } catch(e) {}
    }
    if (Array.isArray(itemsArr) && itemsArr.length > 0) {
        return itemsArr[0];
    }
    if (itemsArr && typeof itemsArr === 'object' && !Array.isArray(itemsArr)) {
        return itemsArr;
    }
    return row;
}

// 1. EXTRACTOR DENGAN FALLBACK AMAN
function getGroupKey(row) {
    let itemObj = (row.items && Array.isArray(row.items) && row.items[0]) ? row.items[0] : row;
    if (typeof itemObj === 'string') {
        try { itemObj = JSON.parse(itemObj); } catch(e) {}
    }
    return (itemObj.group || row.group_nama || row.group || 'Kelompok Utama').toString().trim();
}

function getNamaKegiatanKey(row) {
    if (row.rpjm_data && typeof row.rpjm_data === 'object' && row.rpjm_data.nama_kegiatan) {
        return row.rpjm_data.nama_kegiatan.toString().trim();
    }
    return (row.nama_kegiatan || row.jenis_kegiatan || 'Kegiatan Utama').toString().trim();
}

function getSubGroupKey(row) {
    if (!row) return 'Subgroup Utama';

    // 1. Ambil itemObj
    let itemObj = (row.items && Array.isArray(row.items) && row.items[0]) ? row.items[0] : row;
    if (typeof itemObj === 'string') {
        try { itemObj = JSON.parse(itemObj); } catch(e) {}
    }

    // 2. BACA LANGSUNG DARI PROPERTI SUBGROUP ITEM!
    let sg = itemObj.subgroup || row.subgroup || row.sub_group_nama || itemObj.sub_group;

    // 3. Fallback HANYA jika benar-benar kosong/null
    if (!sg || sg === 'null' || sg === 'undefined' || sg.toString().trim() === '') {
        sg = (row.rpjm_data && row.rpjm_data.nama_kegiatan) || row.nama_kegiatan || 'Subgroup Utama';
    }

    return sg.toString().trim();
}

function editDiRAB(kode_unik, tahun) {
    if (!kode_unik || !tahun) {
        alert('Kode Unik atau Tahun tidak valid untuk diedit.');
        return;
    }
    // Redirect to rab.html with parameters
    window.location.href = `rab.html?kode_unik=${encodeURIComponent(kode_unik)}&tahun=${tahun}`;
}


function getKolomSumberPembiayaan(sumberStr) {
    const s = String(sumberStr || '').toUpperCase().trim();
    if (!s) return 'lainnya';

    if (s.startsWith('ADD') || s.includes('ALOKASI DANA')) {
        return 'ADD';
    }
    if (s.startsWith('DDS') || s.includes('APBN') || s === 'DANA DESA' || s.startsWith('DANA DESA')) {
        return 'DDS';
    }
    if (s.startsWith('PAD') || s.includes('PENDAPATAN ASLI DESA') || s.includes('PADESA')) {
        return 'PAD';
    }
    if (s.startsWith('PBH') || s.includes('BAGI HASIL') || s.includes('PAJAK') || s.includes('PENDAPATAN BAGI HASIL')) {
        return 'PBH';
    }
    if (s.includes('TK. II') || s.includes('TK.II') || s.includes('TINGKAT II') || s.includes('KABUPATEN') || s.includes('KOTA') || s.includes('APBD II')) {
        return 'APBD_KAB';
    }
    if (s.includes('TK. I') || s.includes('TK.I') || s.includes('TINGKAT I') || s.includes('PROVINSI') || s.includes('APBD I') || s.includes('BKK')) {
        return 'APBD_PROV';
    }
    return 'lainnya';
}

function resolveJenisBidangFallback(item) {
    let rpjmObj = item.rpjm_data || {};
    if (typeof rpjmObj === 'string') {
        try { rpjmObj = JSON.parse(rpjmObj); } catch(e) {}
    }
    const val = (item.jenis_bidang || rpjmObj.jenis_bidang || item.sub_bidang || '').trim();
    if (val && val !== 'Sub Bidang Umum') return val;
    const kode = String(item.kode_unik_full || item.kode_unik || '').trim();
    if (kode.startsWith('01.01.') || kode.startsWith('1.1.')) return 'Penyelenggaran Belanja Siltap, Tunjangan dan Operasional Pemerintahan Desa';
    if (kode.startsWith('01.02.') || kode.startsWith('1.2.')) return 'Penyediaan Sarana Prasarana Pemerintahan Desa';
    if (kode.startsWith('01.03.') || kode.startsWith('1.3.')) return 'Administrasi Kependudukan, Pencatatan Sipil, Statistik dan Kearsipan';
    if (kode.startsWith('01.04.') || kode.startsWith('1.4.')) return 'Penyelenggaraan Tata Praja Pemerintahan, Perencanaan, Keuangan dan Pelaporan';
    if (kode.startsWith('01.05.') || kode.startsWith('1.5.')) return 'Sub Bidang Pertanahan';
    if (kode.startsWith('02.01.') || kode.startsWith('2.1.')) return 'Sub Bidang Pendidikan';
    if (kode.startsWith('02.02.') || kode.startsWith('2.2.')) return 'Sub Bidang Kesehatan';
    if (kode.startsWith('02.03.') || kode.startsWith('2.3.')) return 'Sub Bidang Pekerjaan Umum dan Penataan Ruang';
    if (kode.startsWith('02.04.') || kode.startsWith('2.4.')) return 'Sub Bidang Kawasan Permukiman';
    if (kode.startsWith('02.05.') || kode.startsWith('2.5.')) return 'Sub Bidang Kehutanan dan Lingkungan Hidup';
    if (kode.startsWith('03.01.') || kode.startsWith('3.1.')) return 'Sub Bidang Ketenteraman, Ketertiban Umum, dan Perlindungan Masyarakat';
    if (kode.startsWith('03.02.') || kode.startsWith('3.2.')) return 'Sub Bidang Kebudayaan dan Keagamaan';
    if (kode.startsWith('03.03.') || kode.startsWith('3.3.')) return 'Sub Bidang Kepemudaan dan Olah Raga';
    if (kode.startsWith('03.04.') || kode.startsWith('3.4.')) return 'Sub Bidang Kelembagaan Masyarakat';
    if (kode.startsWith('04.01.') || kode.startsWith('4.1.')) return 'Sub Bidang Pertanian dan Peternakan';
    if (kode.startsWith('04.02.') || kode.startsWith('4.2.')) return 'Sub Bidang Peningkatan Kapasitas Aparatur Desa';
    if (kode.startsWith('04.03.') || kode.startsWith('4.3.')) return 'Sub Bidang Pemberdayaan Perempuan, Perlindungan Anak dan Keluarga';
    if (kode.startsWith('04.04.') || kode.startsWith('4.4.')) return 'Sub Bidang Koperasi, Usaha Mikro Kecil dan Menengah (UMKM)';
    if (kode.startsWith('04.05.') || kode.startsWith('4.5.')) return 'Sub Bidang Dukungan Penanaman Modal';
    if (kode.startsWith('04.06.') || kode.startsWith('4.6.')) return 'Sub Bidang Perdagangan dan Perindustrian';
    if (kode.startsWith('05.01.') || kode.startsWith('5.1.')) return 'Sub Bidang Penanggulangan Bencana';
    if (kode.startsWith('05.02.') || kode.startsWith('5.2.')) return 'Sub Bidang Keadaan Darurat';
    if (kode.startsWith('05.03.') || kode.startsWith('5.3.')) return 'Sub Bidang Keadaan Mendesak';
    return val || 'Penyelenggaran Belanja Siltap, Tunjangan dan Operasional Pemerintahan Desa';
}

function resolveJenisKegiatanKelompokFallback(item) {
    let rpjmObj = item.rpjm_data || {};
    if (typeof rpjmObj === 'string') {
        try { rpjmObj = JSON.parse(rpjmObj); } catch(e) {}
    }
    const val = (item.jenis_kegiatan || rpjmObj.jenis_kegiatan || '').trim();
    if (val && val !== 'Kelompok Kegiatan Umum') return val;
    const kode = String(item.kode_unik_full || item.kode_unik || '').trim();
    if (kode.startsWith('01.01.01.') || kode.startsWith('1.1.1.')) return 'Penyediaan Penghasilan Tetap dan Tunjangan Kepala Desa';
    if (kode.startsWith('01.01.02.') || kode.startsWith('1.1.2.')) return 'Penyediaan Penghasilan Tetap dan Tunjangan Perangkat Desa';
    if (kode.startsWith('01.01.03.') || kode.startsWith('1.1.3.')) return 'Penyediaan Jaminan Sosial bagi Kepala Desa dan Perangkat Desa';
    if (kode.startsWith('01.01.04.') || kode.startsWith('1.1.4.')) return 'Penyediaan Operasional Pemerintah Desa (ATK, Honor PKPKD dan PPKD dll)';
    return val || 'Kelompok Kegiatan Utama';
}

function getSubItemBullet(index) {
    if (index < 26) return String.fromCharCode(97 + index) + '.';
    const f = String.fromCharCode(97 + Math.floor(index / 26) - 1);
    const s = String.fromCharCode(97 + (index % 26));
    return `${f}${s}.`;
}

// 2. FUNGSI RENDER TABEL UTAMA (SATU LAYOUT UNIFIED RESMI WITH 11 COLUMNS)
function renderTabelPembiayaan(rawData) {
    if (!Array.isArray(rawData) || rawData.length === 0) return '';

    // Sort strictly by kode_unik_full ascending
    rawData.sort((a, b) => {
        const ka = String(a.kode_unik_full || a.kode_unik || '').trim();
        const kb = String(b.kode_unik_full || b.kode_unik || '').trim();
        return ka.localeCompare(kb, undefined, { numeric: true, sensitivity: 'base' });
    });

    let html = '';
    let globalItemNo = 1;

    let totalPAD = 0;
    let totalDDS = 0;
    let totalADD = 0;
    let totalPBH = 0;
    let totalAPBDProv = 0;
    let totalAPBDKab = 0;
    let totalLainnya = 0;
    let totalSemua = 0;

    for (let b = 1; b <= 5; b++) {
        const namaBidang = masterBidangList.find(mb => mb.key === b)?.name || `Bidang ${b}`;
        const itemsBidang = rawData.filter(item => getBidangKey(item) === b);

        // Render Level 1 Bidang Section Header
        html += `
            <tr class="bg-slate-200/90 font-extrabold text-slate-900 border border-slate-300">
                <td class="text-center border border-slate-300 font-bold py-1.5 px-2 bg-slate-200 text-slate-900">${b}</td>
                <td colspan="9" class="align-top border border-slate-300 font-extrabold bg-slate-200 text-slate-900 px-3 py-1.5 leading-snug uppercase tracking-wide">
                    ${b}. ${namaBidang}
                </td>
                <td class="border border-slate-300 no-print print:hidden"></td>
            </tr>
        `;

        if (itemsBidang.length > 0) {
            // Build hierarchy map: Sub-Bidang -> Kelompok Kegiatan -> Activities
            const subMap = new Map();
            itemsBidang.forEach(item => {
                const subName = resolveJenisBidangFallback(item);
                const kelName = resolveJenisKegiatanKelompokFallback(item);
                const subKey = subName || 'Sub Bidang Utama';
                const kelKey = kelName || 'Kelompok Kegiatan Utama';

                if (!subMap.has(subKey)) subMap.set(subKey, new Map());
                const kelMap = subMap.get(subKey);
                if (!kelMap.has(kelKey)) kelMap.set(kelKey, []);
                kelMap.get(kelKey).push(item);
            });

            subMap.forEach((kelMap, subName) => {
                // Render Sub-Bidang Level 2 Header Row
                if (subName) {
                    html += `
                        <tr class="bg-indigo-50/90 font-bold text-indigo-950 border border-slate-300">
                            <td class="border border-slate-300 bg-indigo-50/90"></td>
                            <td colspan="9" class="align-top border border-slate-300 px-3 py-1.5 text-xs text-indigo-950 font-extrabold uppercase tracking-wide bg-indigo-50/90">
                                📁 ${escHtml(subName)}
                            </td>
                            <td class="border border-slate-300 bg-indigo-50/90 no-print print:hidden"></td>
                        </tr>
                    `;
                }

                kelMap.forEach((actList, kelName) => {
                    // Render Kelompok Level 3 Header Row
                    if (kelName && kelName !== subName) {
                        html += `
                            <tr class="bg-slate-100/90 font-semibold text-slate-800 border border-slate-300">
                                <td class="border border-slate-300 bg-slate-100/90"></td>
                                <td colspan="9" class="align-top border border-slate-300 px-5 py-1 text-[11px] text-slate-800 font-bold italic bg-slate-100/90">
                                    ▸ ${escHtml(kelName)}
                                </td>
                                <td class="border border-slate-300 bg-slate-100/90 no-print print:hidden"></td>
                            </tr>
                        `;
                    }

                    // Render Activity Level 4 Rows & child Uraian items grouped by Group Belanja -> Sub Group Belanja
                    actList.forEach((act) => {
                        const namaKegiatan = act.nama_kegiatan || act.jenis_kegiatan || '-';
                        const itemKey = act.kode_unik_full || act.kode_unik;

                        html += `
                            <tr class="bg-white border border-slate-300 font-bold hover:bg-slate-50 transition">
                                <td class="border border-slate-300 text-center font-bold text-slate-600 text-xs py-1.5">${globalItemNo++}</td>
                                <td class="border border-slate-300 text-xs font-mono text-slate-500 px-2 py-1.5">${escHtml(act.kode_unik_full || act.kode_unik || '')}</td>
                                <td class="border border-slate-300 p-2 font-bold text-slate-900 text-xs">
                                    ${escHtml(namaKegiatan)}
                                </td>
                                <td colspan="7" class="border border-slate-300 bg-slate-50/50"></td>
                                <td class="border border-slate-300 text-center px-2 py-1 no-print print:hidden whitespace-nowrap">
                                    <button onclick="editDiRAB('${itemKey}', '${act.tahun}')" class="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded text-xs font-semibold shadow-sm transition">
                                        <i class="fas fa-pencil-alt mr-1"></i> Edit RAB
                                    </button>
                                </td>
                            </tr>
                        `;

                        // Child Uraian items breakdown (ekstraksi rincian item / per jabatan)
                        let childItems = act.items;
                        if (typeof childItems === 'string') {
                            try { childItems = JSON.parse(childItems); } catch(e) {}
                        }

                        const listUraian = (Array.isArray(childItems) && childItems.length > 0)
                            ? childItems
                            : [{
                                group: act.group_nama || 'Belanja Barang dan Jasa',
                                subgroup: act.sub_group_nama || 'Sub Group Belanja',
                                uraian: act.uraian || act.nama_kegiatan,
                                volume: act.volume,
                                satuan: act.satuan,
                                harga_satuan: act.harga_satuan,
                                jumlah: Number(act.jumlah_anggaran || act.harga_satuan * act.volume || 0),
                                sumber: act.sumber_dana || 'ADD'
                            }];

                        // Group listUraian by Group Belanja -> Sub Group Belanja
                        const gMap = new Map();
                        listUraian.forEach(c => {
                            const gName = (c.group || act.group_nama || '').trim();
                            const sgName = (c.subgroup || c.sub_kelompok || act.sub_group_nama || '').trim();
                            if (!gMap.has(gName)) gMap.set(gName, new Map());
                            const sgMap = gMap.get(gName);
                            if (!sgMap.has(sgName)) sgMap.set(sgName, []);
                            sgMap.get(sgName).push(c);
                        });

                        gMap.forEach((sgMap, gName) => {
                            if (gName && gName.toLowerCase() !== namaKegiatan.toLowerCase()) {
                                html += `
                                    <tr class="bg-amber-50/70 font-bold border border-slate-300">
                                        <td class="border border-slate-300"></td>
                                        <td class="border border-slate-300"></td>
                                        <td colspan="8" class="border border-slate-300 px-3 py-1 text-xs text-amber-900 font-extrabold italic pl-6">
                                            📦 ${escHtml(gName)}
                                        </td>
                                        <td class="border border-slate-300 no-print print:hidden"></td>
                                    </tr>
                                `;
                            }

                            sgMap.forEach((uList, sgName) => {
                                if (sgName && sgName.toLowerCase() !== (gName || '').toLowerCase() && sgName.toLowerCase() !== namaKegiatan.toLowerCase()) {
                                    html += `
                                        <tr class="bg-slate-50/90 font-semibold border border-slate-300">
                                            <td class="border border-slate-300"></td>
                                            <td class="border border-slate-300"></td>
                                            <td colspan="8" class="border border-slate-300 px-3 py-1 text-[11.5px] text-slate-800 font-semibold italic pl-8">
                                                📂 ${escHtml(sgName)}
                                            </td>
                                            <td class="border border-slate-300 no-print print:hidden"></td>
                                        </tr>
                                    `;
                                }

                                uList.forEach((c, itemIdx) => {
                                    const charLabel = getSubItemBullet(itemIdx);
                                    const vol = (c.volume != null && c.volume !== '' && Number(c.volume) > 0) ? Number(c.volume) : null;
                                    const sat = c.satuan ? String(c.satuan).trim() : '';
                                    const volSat = (vol && sat) ? ` <span class="text-slate-500 font-normal">(${vol} ${escHtml(sat)})</span>` : (sat ? ` <span class="text-slate-500 font-normal">(${escHtml(sat)})</span>` : '');
                                    const hrg = Number(c.harga_satuan || c.harga || 0);
                                    const tarifStr = (hrg > 0 && vol && vol > 1) ? ` <span class="text-slate-400 text-[11px]">@ Rp ${Math.round(hrg).toLocaleString('id-ID')}</span>` : '';

                                    const nomVal = Number(c.jumlah || c.total || (vol && hrg ? vol * hrg : 0) || hrg || 0);
                                    const valStr = nomVal > 0 ? formatRupiah(nomVal) : '-';

                                    const colType = getKolomSumberPembiayaan(c.sumber || c.sumber_dana || act.sumber_dana);
                                    const isPAD = colType === 'PAD';
                                    const isDDS = colType === 'DDS';
                                    const isADD = colType === 'ADD';
                                    const isBagiHasil = colType === 'PBH';
                                    const isAPBDProv = colType === 'APBD_PROV';
                                    const isAPBDKab = colType === 'APBD_KAB';
                                    const isLainnya = colType === 'lainnya';

                                    if (isPAD) totalPAD += nomVal;
                                    else if (isDDS) totalDDS += nomVal;
                                    else if (isADD) totalADD += nomVal;
                                    else if (isBagiHasil) totalPBH += nomVal;
                                    else if (isAPBDProv) totalAPBDProv += nomVal;
                                    else if (isAPBDKab) totalAPBDKab += nomVal;
                                    else totalLainnya += nomVal;
                                    totalSemua += nomVal;

                                    html += `
                                        <tr class="border border-slate-300 hover:bg-slate-50 transition">
                                            <td class="border border-slate-300 text-center py-1 text-slate-400 text-[10px]"></td>
                                            <td class="border border-slate-300"></td>
                                            <td class="border border-slate-300 text-left pl-10 text-xs text-slate-800">
                                                <span class="font-semibold text-slate-700">${charLabel}</span> ${escHtml(c.uraian || '-')}${volSat}${tarifStr}
                                            </td>
                                            <td class="border border-slate-300 text-right px-2 py-1 text-xs font-mono">${isPAD ? valStr : '-'}</td>
                                            <td class="border border-slate-300 text-right px-2 py-1 text-xs font-mono">${isDDS ? valStr : '-'}</td>
                                            <td class="border border-slate-300 text-right px-2 py-1 text-xs font-mono">${isADD ? valStr : '-'}</td>
                                            <td class="border border-slate-300 text-right px-2 py-1 text-xs font-mono">${isBagiHasil ? valStr : '-'}</td>
                                            <td class="border border-slate-300 text-right px-2 py-1 text-xs font-mono">${isAPBDProv ? valStr : '-'}</td>
                                            <td class="border border-slate-300 text-right px-2 py-1 text-xs font-mono">${isAPBDKab ? valStr : '-'}</td>
                                            <td class="border border-slate-300 text-right px-2 py-1 text-xs font-mono">${isLainnya ? valStr : '-'}</td>
                                            <td class="border border-slate-300 text-center no-print print:hidden"></td>
                                        </tr>
                                    `;
                                });
                            });
                        });
                    });
                });
            });
        } else {
            html += `
                <tr class="hover:bg-slate-50 transition">
                    <td class="border border-slate-300 text-center text-slate-400 py-1.5">-</td>
                    <td colspan="2" class="border border-slate-300 p-2 text-slate-400 italic text-xs">Belum ada kegiatan pembiayaan untuk bidang ini</td>
                    <td class="border border-slate-300 p-1 text-center text-slate-400">-</td>
                    <td class="border border-slate-300 p-1 text-center text-slate-400">-</td>
                    <td class="border border-slate-300 p-1 text-center text-slate-400">-</td>
                    <td class="border border-slate-300 p-1 text-center text-slate-400">-</td>
                    <td class="border border-slate-300 p-1 text-center text-slate-400">-</td>
                    <td class="border border-slate-300 p-1 text-center text-slate-400">-</td>
                    <td class="border border-slate-300 p-1 text-center text-slate-400">-</td>
                    <td class="border border-slate-300 text-center py-1.5 no-print print:hidden"></td>
                </tr>
            `;
        }
    }

    // Render Baris Grand Total Pengeluaran Pembiayaan
    html += `
        <tr class="bg-slate-200 font-extrabold text-slate-900 border-2 border-slate-400">
            <td colspan="3" class="text-center py-2 px-3 uppercase tracking-wider font-extrabold border border-slate-400">JUMLAH TOTAL PENGELUARAN PEMBIAYAAN</td>
            <td class="text-right px-2 py-2 font-mono font-bold border border-slate-400">${totalPAD > 0 ? formatRupiah(totalPAD) : '-'}</td>
            <td class="text-right px-2 py-2 font-mono font-bold border border-slate-400">${totalDDS > 0 ? formatRupiah(totalDDS) : '-'}</td>
            <td class="text-right px-2 py-2 font-mono font-bold border border-slate-400">${totalADD > 0 ? formatRupiah(totalADD) : '-'}</td>
            <td class="text-right px-2 py-2 font-mono font-bold border border-slate-400">${totalPBH > 0 ? formatRupiah(totalPBH) : '-'}</td>
            <td class="text-right px-2 py-2 font-mono font-bold border border-slate-400">${totalAPBDProv > 0 ? formatRupiah(totalAPBDProv) : '-'}</td>
            <td class="text-right px-2 py-2 font-mono font-bold border border-slate-400">${totalAPBDKab > 0 ? formatRupiah(totalAPBDKab) : '-'}</td>
            <td class="text-right px-2 py-2 font-mono font-bold border border-slate-400">${totalLainnya > 0 ? formatRupiah(totalLainnya) : '-'}</td>
            <td class="border border-slate-400 no-print print:hidden"></td>
        </tr>
        <tr class="row-total-pembiayaan bg-slate-900 text-white font-extrabold border-2 border-slate-900" style="background-color: #0f172a !important; color: #ffffff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;">
            <td colspan="3" class="text-center py-3 px-3 uppercase tracking-wider font-extrabold border border-slate-700" style="background-color: #0f172a !important; color: #ffffff !important; font-weight: 800 !important; font-size: 11.5px !important; letter-spacing: 0.5px;">TOTAL KESELURUHAN ANGGARAN PEMBIAYAAN</td>
            <td colspan="7" class="text-center px-4 py-3 font-mono text-sm font-black border border-slate-700 text-amber-300" style="background-color: #0f172a !important; color: #fef08a !important; font-weight: 900 !important; font-size: 13.5px !important;">
                ${formatRupiah(totalSemua)}
            </td>
            <td class="border border-slate-700 no-print print:hidden" style="background-color: #0f172a !important;"></td>
        </tr>
    `;

    return html;
}

// B. INJECT CONTAINER CETAK LENGKAP DENGAN HIDDEN AKSI UTK PRINT
function injectToDOM(htmlHasil) {
    const container = document.getElementById('livePreviewContainer') 
                   || document.getElementById('table-container') 
                   || document.querySelector('.overflow-x-auto');

    if (!container) return;

    // SELALU inject dokumen resmi lengkap (kop, identitas, thead, tabel, footer).
    // Jangan short-circuit ke tbody statis yang TIDAK punya kolom header,
    // karena hasil cetak jadi tanpa judul/header/tanda tangan.
    container.innerHTML = `
        <style>
            .row-total-pembiayaan, .row-total-pembiayaan td {
                background-color: #0f172a !important;
                color: #ffffff !important;
                font-weight: bold !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            @media print {
                .no-print, .no-print * {
                    display: none !important;
                }
                .row-total-pembiayaan, .row-total-pembiayaan td {
                    background-color: #0f172a !important;
                    color: #ffffff !important;
                    font-weight: bold !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
            }
        </style>

        <div class="w-full bg-white p-6 shadow-sm border rounded-lg font-serif text-slate-900">
            <!-- HEADER KOP JUDUL -->
            <div class="text-center font-bold text-base mb-1 tracking-wide uppercase">
                ${currentPembiayaanMode === 'PERUBAHAN' ? 'DATA DAN INFORMASI TENTANG RENCANA PEMBIAYAAN DEFENITIF PERUBAHAN DESA' : 'DATA DAN INFORMASI TENTANG RENCANA PEMBIAYAAN DEFENITIF DESA'}
            </div>
            <div class="text-center font-bold text-sm mb-6">
                TAHUN ANGGARAN ${activeYear || 2027}
            </div>

            <!-- CONTAINER MATRIKS KOMPARASI (KHUSUS MODE PERUBAHAN) -->
            ${(currentPembiayaanMode === 'PERUBAHAN' && pembiayaanKomparasiData) ? renderKomparasiPembiayaanHtml(pembiayaanKomparasiData) : ''}

            <!-- IDENTITAS DESA -->
            <div class="mb-6 text-xs font-bold leading-relaxed flex justify-between border-none">
                <div class="space-y-1">
                    <div class="flex"><span class="w-24">DESA</span><span>: BATETANGNGA</span></div>
                    <div class="flex"><span class="w-24">KECAMATAN</span><span>: BINUANG</span></div>
                </div>
                <div class="space-y-1">
                    <div class="flex"><span class="w-24">KABUPATEN</span><span>: POLEWALI MANDAR</span></div>
                    <div class="flex"><span class="w-24">PROVINSI</span><span>: SULAWESI BARAT</span></div>
                </div>
            </div>

            <!-- TABEL PEMBIAYAAN MATRIX 10-KOLOM -->
            <div class="overflow-x-auto mb-8">
                <table class="min-w-full border-collapse border border-slate-400 text-xs text-slate-800">
                    <thead>
                        <tr class="bg-slate-100 font-bold text-center border border-slate-400">
                            <th rowspan="2" class="border border-slate-400 px-2 py-1.5 w-8">No</th>
                            <th rowspan="2" class="border border-slate-400 px-2 py-1.5 w-48">Bidang</th>
                            <th rowspan="2" class="border border-slate-400 px-2 py-1.5">Nama Program / Kegiatan</th>
                            <th colspan="6" class="border border-slate-400 px-2 py-1">Jumlah Dana Defenitif</th>
                            <th rowspan="2" class="border border-slate-400 px-2 py-1.5 w-32">Sumber Keuangan Lainnya</th>
                            <th rowspan="2" class="border border-slate-400 px-2 py-1.5 w-20 no-print print:hidden">Aksi</th>
                        </tr>
                        <tr class="bg-slate-50 text-[10px] text-center border border-slate-400 font-bold">
                            <th class="border border-slate-400 px-1 py-1">PADesa</th>
                            <th class="border border-slate-400 px-1 py-1">Dana Desa (APBN)</th>
                            <th class="border border-slate-400 px-1 py-1">Alokasi Dana Desa</th>
                            <th class="border border-slate-400 px-1 py-1">Bagi Hasil Pajak</th>
                            <th class="border border-slate-400 px-1 py-1">APBD Prov</th>
                            <th class="border border-slate-400 px-1 py-1">APBD Kab/Kota</th>
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
                            <td class="border border-slate-400">j</td>
                            <td class="border border-slate-400 no-print print:hidden"></td>
                        </tr>
                    </thead>
                    <tbody id="tabel-pembiayaan-body">
                        ${htmlHasil}
                    </tbody>
                </table>
            </div>

            <!-- FOOTER TANDA TANGAN SINKRON -->
            <div class="flex justify-between items-start text-xs mt-6 px-4 font-sans">
                <div class="text-center">
                    <p class="mb-1 font-bold">Mengetahui,</p>
                    <p class="font-bold">Kepala Desa Batetangnga</p>
                    <div class="h-16"></div>
                    <p class="font-bold underline uppercase">SUMAILA DAMANG</p>
                </div>
                <div class="text-center">
                    <p id="footer-tgl-text" class="mb-1">Batetangnga, ....................</p>
                    <p class="font-bold">Disusun oleh,</p>
                    <p class="font-bold">Ketua Tim Penyusun RKPDesa</p>
                    <div class="h-16"></div>
                    <p id="footer-tim-text" class="font-bold underline uppercase">( ABDUL AZIS, S. Pd )</p>
                </div>
            </div>
        </div>
    `;

    updateFooterPrint();
    console.log("🔥 SAKTI: Kop Atas, Tabel 10-Kolom (Hidden Aksi utk Print), dan Footer Tanda Tangan berhasil di-inject!");
}

window.getGroupKey = getGroupKey;
window.getNamaKegiatanKey = getNamaKegiatanKey;
window.getSubGroupKey = getSubGroupKey;
window.renderTabelPembiayaan = renderTabelPembiayaan;
window.injectToDOM = injectToDOM;

// BUILD LINEAR BIDANG ROWS DENGAN 3-LEVEL NESTED GROUPING (Group -> Nama Kegiatan -> Subgroup -> Items)
function buildLinearBidangRows(itemsInBidang) {
    const rows = [];
    if (!Array.isArray(itemsInBidang) || itemsInBidang.length === 0) return rows;

    const sortedItems = sortAscendingByKode(deduplicateItems(itemsInBidang));

    // ==========================================
    // 1. STRUKTUR GROUPING 3-LEVEL
    // ==========================================
    const groupedData = {};

    sortedItems.forEach(row => {
        // Ambil item internal dari JSONB items
        let itemObj = (row.items && Array.isArray(row.items) && row.items[0]) ? row.items[0] : extractFirstItemObj(row);
        if (typeof itemObj === 'string') {
            try { itemObj = JSON.parse(itemObj); } catch(e) {}
        }

        // A. LEVEL 1: GROUP
        const gKey = (itemObj.group || row.group_nama || row.group || 'Kelompok Utama').toString().trim();

        // B. LEVEL 2: NAMA KEGIATAN
        let nKey = 'Kegiatan Utama';
        if (row.rpjm_data && typeof row.rpjm_data === 'object' && row.rpjm_data.nama_kegiatan) {
            nKey = row.rpjm_data.nama_kegiatan.toString().trim();
        } else if (row.nama_kegiatan) {
            nKey = row.nama_kegiatan.toString().trim();
        } else if (itemObj.nama_kegiatan) {
            nKey = itemObj.nama_kegiatan.toString().trim();
        } else if (row.jenis_kegiatan) {
            nKey = row.jenis_kegiatan.toString().trim();
        }

        // C. LEVEL 3: SUBGROUP
        const sgKey = (itemObj.subgroup || row.subgroup || row.sub_group_nama || 'Subgroup Utama').toString().trim();

        // Susun Hirarki Objek
        if (!groupedData[gKey]) groupedData[gKey] = {};
        if (!groupedData[gKey][nKey]) groupedData[gKey][nKey] = {};
        if (!groupedData[gKey][nKey][sgKey]) groupedData[gKey][nKey][sgKey] = [];

        groupedData[gKey][nKey][sgKey].push(row);
    });

    const abc = 'abcdefghijklmnopqrstuvwxyz';

    // ==========================================
    // 2. RENDERING ROW MATRIX (3 LEVEL HIRARKI)
    // ==========================================
    Object.keys(groupedData).forEach(gKey => {
        // [BARIS LEVEL 1] GROUP
        rows.push({
            type: 'main_header',
            name: gKey
        });

        Object.keys(groupedData[gKey]).forEach(nKey => {
            // [BARIS LEVEL 2] NAMA KEGIATAN (TEBAL & MIRING)
            rows.push({
                type: 'kegiatan_header',
                name: nKey
            });

            Object.keys(groupedData[gKey][nKey]).forEach(sgKey => {
                // [BARIS LEVEL 3] SUBGROUP (TEBAL NORMAL CASE)
                rows.push({
                    type: 'sub_header',
                    name: sgKey
                });

                // RESET PENOMORAN ABJAD 'a.' PER SUBGROUP!
                let letterIndex = 0;

                groupedData[gKey][nKey][sgKey].forEach((item, index) => {
                    const childDetails = extractChildItems(item);

                    if (childDetails && childDetails.length > 0) {
                        childDetails.forEach((child, childIdx) => {
                            const charPrefix = abc[letterIndex % 26];
                            letterIndex++;

                            const rawChildText = child.uraian || child.jenis_kegiatan || child.nama || child.nama_item || child.kegiatan;
                            const childName = (rawChildText && typeof rawChildText === 'string' && rawChildText.trim().toLowerCase() !== 'uraian') ? rawChildText.trim() : (nKey || '-');
                            const childCost = Number(child.jumlah_anggaran || child.pagu_rab || child.jumlah_biaya || child.jumlah || child.biaya || child.total || 0);
                            const childSumber = String(child.sumber_dana || child.sumber_dana_rab || child.sumber_biaya || child.sumber || item.sumber_dana || item.sumber_biaya || 'ADD').toUpperCase();
                            const parentKey = String(item.kode_unik_full || item.kode_unik || item.id || index) + '_' + childIdx;

                            rows.push({
                                type: 'uraian',
                                name: `${charPrefix}. ${childName}`,
                                cost: childCost,
                                sumber_biaya: childSumber,
                                parent_key: parentKey,
                                item: item
                            });
                        });
                    } else {
                        const charPrefix = abc[letterIndex % 26];
                        letterIndex++;

                        const labelUraian = getCleanUraianText(item);
                        const nominal = Number(item.jumlah_anggaran || item.pagu_rab || item.jumlah_biaya || item.total_biaya || 0);
                        const sumberDana = String(item.sumber_dana || item.sumber_dana_rab || item.sumber_biaya || item.sumber || 'ADD').toUpperCase();
                        const parentKey = String(item.kode_unik_full || item.kode_unik || item.id || index);

                        rows.push({
                            type: 'uraian',
                            name: `${charPrefix}. ${labelUraian}`,
                            cost: nominal,
                            sumber_biaya: sumberDana,
                            parent_key: parentKey,
                            item: item
                        });
                    }
                });
            });
        });
    });

    return rows;
}

function getFormattedDate() {
    const inputDate = document.getElementById('input-tanggal-pembiayaan')?.value;
    if (inputDate) {
        const [year, month, day] = inputDate.split('-');
        if (year && month && day) {
            const d = new Date(Number(year), Number(month) - 1, Number(day));
            if (!isNaN(d.getTime())) {
                return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            }
        }
    }
    const today = new Date();
    return today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getTimPenyusunInfo() {
    const select = document.getElementById('select-tim-penyusun');
    const val = select ? select.value : '';

    if (val === 'manual') {
        const nama = document.getElementById('input-nama-manual-tim')?.value?.trim() || 'Abdul Azis, S. Pd';
        const jabatan = document.getElementById('input-jabatan-manual-tim')?.value?.trim() || 'Ketua Tim Penyusun RKPDesa';
        return { nama, jabatan };
    }

    if (val && val.includes('|')) {
        const parts = val.split('|');
        return { nama: parts[0], jabatan: parts[1] };
    }

    return { nama: 'Abdul Azis, S. Pd', jabatan: 'Ketua Tim Penyusun RKPDesa' };
}

function toggleManualTimPenyusun() {
    const select = document.getElementById('select-tim-penyusun');
    const container = document.getElementById('manual-tim-container');
    if (select && container) {
        if (select.value === 'manual') {
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }
    }
    updateLivePreview();
}

// NORMALISASI BARIS TABEL `rab` -> BENTUK KANONIK RENDERER.
// TIDAK menyentuh nilai anggaran: `rab` adalah sumber kebenaran.
function normalisasiRabRows(row) {
    if (!row) return row;
    const bidang = normalizeBidang(row.bidang || (row.rpjm_data && row.rpjm_data.bidang));
    const uraian = String(row.uraian || row.nama_kegiatan || (row.rpjm_data && row.rpjm_data.nama_kegiatan) || '').trim();
    
    let parsedItems = row.items;
    if (typeof parsedItems === 'string') {
        try { parsedItems = JSON.parse(parsedItems); } catch(_) { parsedItems = []; }
    }

    return {
        id: row.id,
        kode_unik: row.kode_unik || '',
        kode_unik_full: row.kode_unik_full || row.kode_unik || '',
        tahun: row.tahun,
        bidang: bidang,
        jenis_bidang: row.jenis_bidang || '',
        jenis_kegiatan: row.jenis_kegiatan || '',
        group_nama: row.group_nama || null,
        sub_group_nama: row.sub_group_nama || null,
        nama_kegiatan: row.nama_kegiatan || uraian,
        uraian: uraian,
        volume: row.volume,
        satuan: row.satuan,
        harga_satuan: Number(row.harga_satuan || 0),
        jumlah_anggaran: Number(row.jumlah_anggaran || 0),
        items: Array.isArray(parsedItems) ? parsedItems : [],
        sumber_dana: row.sumber_dana || '',
        lokasi: row.lokasi_kegiatan || row.lokasi || '',
        rpjm_data: { ...(row.rpjm_data || {}), bidang: bidang }
    };
}

// FETCH DATA RESMI SUPABASE FROM TABEL 'rab' WITH FALLBACK
async function loadPembiayaanData() {
    activeYear = Number(document.getElementById('select-year')?.value) || 2027;
    const container = document.getElementById('livePreviewContainer');
    if (!container) return;
    container.innerHTML = `
        <div class="text-center py-12 text-slate-400">
            <i class="fas fa-circle-notch animate-spin text-3xl mb-4"></i>
            <p>Mengambil Data Pembiayaan Pembangunan Desa (${currentPembiayaanMode}) Tahun ${activeYear}...</p>
        </div>
    `;

    try {
        // 1. Ambil Pembiayaan Netto & Komparasi
        try {
            const resNetto = await fetch(`/api/pembiayaan?tahun=${activeYear}&tipe=${currentPembiayaanMode}`, { cache: 'no-store' });
            const jsonNetto = await resNetto.json();
            if (jsonNetto.success && jsonNetto.komparasi) {
                pembiayaanKomparasiData = jsonNetto.komparasi;
            } else {
                pembiayaanKomparasiData = null;
            }
        } catch (errNetto) {
            console.warn("Gagal muat data pembiayaan netto:", errNetto.message);
            pembiayaanKomparasiData = null;
        }

        // 2. Ambil data kegiatan RAB
        let rawData = [];
        try {
            const res = await fetch(`/api/pembiayaan-netto/rab?tahun=${activeYear}&tipe=${currentPembiayaanMode}`, { cache: 'no-store' });
            const json = await res.json();
            if (json.success && Array.isArray(json.data) && json.data.length > 0) {
                rawData = json.data;
            } else {
                // Fallback ke endpoint /api/rab dengan param with_items & tipe
                const resFallback = await fetch(`/api/rab?tahun=${activeYear}&tipe=${currentPembiayaanMode}&with_items=true&for_module=pembiayaan_netto`, { cache: 'no-store' });
                const jsonFallback = await resFallback.json();
                if (jsonFallback.success && Array.isArray(jsonFallback.data)) {
                    rawData = jsonFallback.data;
                }
            }
        } catch (errApi) {
            console.warn("Fallback ke API tidak tersedia:", errApi.message);
        }

        // Normalisasi kolom tabel `rab` -> bentuk kanonik renderer. Nilai anggaran
        // tetap dari `rab` (tidak di-rehitung/ditimpa) agar sumbernya benar-benar RAB.
        if (typeof normalisasiRabRows === 'function') {
            rawData = (Array.isArray(rawData) ? rawData : []).map(normalisasiRabRows);
        }

        if (window.DEBUG_PEMBIAYAAN) console.log("RAW SUPABASE DATA FULL (TABEL RAB):", JSON.stringify(rawData, null, 2));
        pembiayaanList = sortAscendingByKode(deduplicateItems(rawData));

        const htmlHasil = renderTabelPembiayaan(rawData);
        injectToDOM(htmlHasil);
    } catch (err) {
        container.innerHTML = `<div class="text-center py-8 text-red-500 font-bold">❌ Gagal koneksi ke server: ${err.message}</div>`;
    }
}

async function importPembiayaanData() {
    activeYear = Number(document.getElementById('select-year')?.value) || 2027;
    showToast(`Memproses sinkronisasi data RAB/RKPDesa Tahun ${activeYear}...`, 'success');
    try {
        const res = await fetch(`/api/rkpdes-data/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tahun: activeYear, tipe: currentPembiayaanMode })
        });
        const json = await res.json();
        if (json.success) {
            showToast(`✅ Sinkronisasi Berhasil! Memuat ulang data...`, 'success');
            loadPembiayaanData();
        } else {
            showToast(`❌ Gagal: ${json.error}`, 'error');
        }
    } catch (err) {
        showToast(`❌ Error: ${err.message}`, 'error');
    }
}

function updateLivePreview() {
    const dataToRender = (Array.isArray(pembiayaanList) && pembiayaanList.length > 0) 
        ? pembiayaanList 
        : [];
    const htmlHasil = renderTabelPembiayaan(dataToRender);
    injectToDOM(htmlHasil);
}

// ============================================================
// KELOLA PEMBIAYAAN NETTO (SILPA, DANA CADANGAN, BUMDES)
// ============================================================
async function bukaModalKelolaPembiayaan() {
    const modal = document.getElementById('modalKelolaPembiayaan');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
    const badge = document.getElementById('modal-pembiayaan-tipe-badge');
    if (badge) {
        if (currentPembiayaanMode === 'PERUBAHAN') {
            badge.className = "px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-500/30 text-amber-200 border border-amber-500/50";
            badge.textContent = "MODE: PERUBAHAN (PAK)";
        } else {
            badge.className = "px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-500/30 text-indigo-300 border border-indigo-500/40";
            badge.textContent = "MODE: MURNI";
        }
    }
    const th = Number(document.getElementById('select-year')?.value) || 2027;
    await loadPembiayaanNettoData(th, currentPembiayaanMode);
}

function tutupModalKelolaPembiayaan() {
    const modal = document.getElementById('modalKelolaPembiayaan');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

async function loadPembiayaanNettoData(th, mode) {
    const targetMode = mode || currentPembiayaanMode || 'MURNI';
    const ids = ['pembiayaan_silpa', 'pembiayaan_pencairan_cadangan', 'pembiayaan_penjualan_kekayaan', 'pembiayaan_pembentukan_cadangan', 'pembiayaan_penyertaan_modal'];
    // Bersihkan semua input terlebih dahulu agar tahun tanpa data benar-benar kosong
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

    try {
        const res = await fetch(`/api/pembiayaan?tahun=${th}&tipe=${targetMode}`);
        const json = await res.json();
        const d = json.data;
        if (json.success && json.data && Object.keys(d).length > 0) {
            const silpaEl = document.getElementById('pembiayaan_silpa');
            const pcadEl = document.getElementById('pembiayaan_pencairan_cadangan');
            const pkekEl = document.getElementById('pembiayaan_penjualan_kekayaan');
            const bcadEl = document.getElementById('pembiayaan_pembentukan_cadangan');
            const pmodalEl = document.getElementById('pembiayaan_penyertaan_modal');

            if (silpaEl) silpaEl.value = Number(d.silpa_tahun_sebelumnya || 0).toLocaleString('id-ID');
            if (pcadEl) pcadEl.value = Number(d.pencairan_dana_cadangan || 0).toLocaleString('id-ID');
            if (pkekEl) pkekEl.value = Number(d.hasil_penjualan_kekayaan || 0).toLocaleString('id-ID');
            if (bcadEl) bcadEl.value = Number(d.pembentukan_dana_cadangan || 0).toLocaleString('id-ID');
            if (pmodalEl) pmodalEl.value = Number(d.penyertaan_modal_desa || 0).toLocaleString('id-ID');
        }
    } catch (e) {
        console.warn("⚠️ Gagal muat pembiayaan dari Supabase:", e);
    }
}

async function simpanPembiayaanForm() {
    const th = Number(document.getElementById('select-year')?.value) || 2027;

    const parseNum = id => {
        const el = document.getElementById(id);
        if (!el) return 0;
        return Number(el.value.replace(/[^0-9]/g, '')) || 0;
    };

    const payload = {
        silpa_tahun_sebelumnya: parseNum('pembiayaan_silpa'),
        pencairan_dana_cadangan: parseNum('pembiayaan_pencairan_cadangan'),
        hasil_penjualan_kekayaan: parseNum('pembiayaan_penjualan_kekayaan'),
        pembentukan_dana_cadangan: parseNum('pembiayaan_pembentukan_cadangan'),
        penyertaan_modal_desa: parseNum('pembiayaan_penyertaan_modal')
    };

    try {
        const res = await fetch(`/api/pembiayaan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tahun: th, tipe: currentPembiayaanMode, pembiayaanData: payload })
        });
        const resJson = await res.json();
        if (resJson.success) {
            showToast(`✅ Data Pembiayaan ${currentPembiayaanMode} tahun ${th} berhasil disimpan!`, 'success');
        } else {
            showToast(`⚠️ warning: ${resJson.message || resJson.error}`, 'warning');
        }
    } catch(e) {
        showToast('⚠️ Gagal koneksi ke server', 'error');
    }

    tutupModalKelolaPembiayaan();
    loadPembiayaanData();
}

function formatNumberInput(el) {
    let raw = el.value.replace(/[^0-9]/g, '');
    if (raw) {
        el.value = Number(raw).toLocaleString('id-ID');
    } else {
        el.value = '';
    }
}

// MODAL TAMBAH URAIAN BELANJA BARU (tombol aktif + tersimpan ke RAB/Supabase)
async function bukaModalTambahUraian() {
    const modal = document.getElementById('modalTambahUraian');
    if (modal) { modal.classList.remove('hidden'); modal.style.display = 'flex'; }

    const prefixField = document.getElementById('tambah-uraian-prefix');
    try {
        const res = await fetch(`/api/rpjmdes/last-kode?prefix=01`, { cache: 'no-store' });
        const json = await res.json();
        prefixField.value = (json.success && json.nextKode) || '01.00.00.00.';
    } catch (e) {
        prefixField.value = '01.00.00.00.';
    }

    ['tambah-uraian-nama', 'tambah-uraian-biaya'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const sumber = document.getElementById('tambah-uraian-sumber-biaya');
    if (sumber) sumber.value = 'ADD';
    const sg = document.getElementById('tambah-uraian-subgroup-display');
    if (sg) sg.value = 'Kelompok Utama';
}

function closeModalTambahUraian() {
    const modal = document.getElementById('modalTambahUraian');
    if (modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
}

async function saveTambahUraianItem(event) {
    if (event) event.preventDefault();

    const prefix = (document.getElementById('tambah-uraian-prefix').value || '').trim();
    const nama = (document.getElementById('tambah-uraian-nama').value || '').trim();
    const biaya = Number(String(document.getElementById('tambah-uraian-biaya').value || '').replace(/[^0-9]/g, '') || 0);
    const sumber = document.getElementById('tambah-uraian-sumber-biaya').value;
    const th = activeYear || Number(document.getElementById('select-year')?.value) || 2027;

    if (!prefix || !nama) { showToast('❌ Kode & Nama Uraian wajib diisi', 'error'); return; }

    const bidangNum = Number(String(prefix).startsWith('02') ? 2 : 1);
    const items = [{ uraian: nama, jumlah: biaya, sumber: sumber, volume: 1, satuan: 'Paket', harga: biaya }];

    const payload = {
        kode_unik: prefix,
        kode_unik_full: prefix,
        tahun: Number(th),
        nama_kegiatan: nama,
        uraian: nama,
        items: items,
        jumlah_anggaran: biaya,
        volume: 1,
        satuan: 'Paket',
        harga_satuan: biaya,
        sumber_dana: sumber,
        bidang: bidangNum,
        lokasi_kegiatan: 'Desa Batetangnga',
        rpjm_data: { nama_kegiatan: nama, bidang: bidangNum }
    };

    try {
        const res = await fetch('/api/rab', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
            showToast('✅ Uraian baru berhasil ditambahkan & tersimpan ke Supabase!', 'success');
            closeModalTambahUraian();
            loadPembiayaanData();
        } else {
            showToast('❌ ' + (json.error || 'Gagal menyimpan'), 'error');
        }
    } catch (e) {
        showToast('⚠️ Gagal koneksi ke server', 'error');
    }
}

window.bukaModalKelolaPembiayaan = bukaModalKelolaPembiayaan;
window.tutupModalKelolaPembiayaan = tutupModalKelolaPembiayaan;
window.loadPembiayaanNettoData = loadPembiayaanNettoData;
window.simpanPembiayaanForm = simpanPembiayaanForm;
window.formatNumberInput = formatNumberInput;
window.bukaModalTambahUraian = bukaModalTambahUraian;
window.closeModalTambahUraian = closeModalTambahUraian;
window.saveTambahUraianItem = saveTambahUraianItem;
window.switchPembiayaanMode = switchPembiayaanMode;
window.formatSelisih = formatSelisih;
window.formatPersen = formatPersen;
window.renderKomparasiPembiayaanHtml = renderKomparasiPembiayaanHtml;
