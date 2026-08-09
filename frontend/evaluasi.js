// frontend/evaluasi.js
// Module: Evaluasi Pelaksanaan RKP Desa (Baku Kementrian)

const NAMA_BIDANG_EVALUASI = {
    1: "Bidang Penyelenggaraan Pemerintahan Desa",
    2: "Bidang Pelaksanaan Pembangunan Desa",
    3: "Bidang Pembinaan Kemasyarakatan",
    4: "Bidang Pemberdayaan Masyarakat",
    5: "Bidang Penanggulangan Bencana, Keadaan Darurat dan Mendesak Desa"
};

let evaluasiList = [];
let editingRowId = null;
let masterHierarchy = [];
let masterHierarchyLoaded = false;

function escHtml(val) {
    return String(val ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function escAttr(val) {
    return escHtml(val);
}

function parseNumber(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const clean = String(val).replace(/[^0-9.-]+/g, "");
    return parseFloat(clean) || 0;
}

function formatRupiah(num) {
    const val = parseNumber(num);
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
}

function formatTanggalIndonesia(tglStr) {
    if (!tglStr) {
        return new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    const d = new Date(tglStr);
    if (isNaN(d.getTime())) return tglStr;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function ensureMasterHierarchy() {
    if (masterHierarchyLoaded) return;
    try {
        const res = await fetch(`/api/rpjmdes`, { cache: 'no-store' });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            masterHierarchy = json.data;
        }
    } catch (err) {
        console.error("⚠️ Gagal memuat master hierarki:", err);
    } finally {
        masterHierarchyLoaded = true;
    }
}

function resolveHierarchyFromKode(kode) {
    const k = String(kode || '').trim();
    if (!k) return null;
    const parts = k.split('.').filter(Boolean);
    if (!parts.length) return null;
    const prefix4 = parts.slice(0, 4).join('.') + '.';
    const prefix3 = parts.slice(0, 3).join('.') + '.';
    const prefix2 = parts.slice(0, 2).join('.') + '.';

    let hit = masterHierarchy.find(m => String(m.kode_unik_full || '').trim() === prefix4)
        || masterHierarchy.find(m => String(m.kode_unik_full || '').trim() === prefix3)
        || masterHierarchy.find(m => String(m.kode_unik_full || '').trim() === prefix2);
    if (!hit) return null;
    return {
        bidang: hit.bidang || '',
        sub_bidang: hit.jenis_bidang || '',
        jenis_kegiatan: hit.jenis_kegiatan || ''
    };
}

function kodePrefixFor(kode) {
    const k = String(kode || '').trim();
    const parts = k.split('.').filter(Boolean);
    return parts.length ? parts.join('.') : k;
}

function enrichRowHierarchy(row) {
    if (!row) return;
    const resolved = resolveHierarchyFromKode(row.kode_unik);
    if (!resolved) return;
    if (!row.sub_bidang) row.sub_bidang = resolved.sub_bidang || '';
    if (!row.jenis_kegiatan) row.jenis_kegiatan = resolved.jenis_kegiatan || '';
    if (!String(row.bidang)) row.bidang = evalBidangNumRow(resolved);
    return row;
}

function evalBidangNumRow(resolved) {
    const t = String(resolved.bidang || '').toLowerCase();
    if (t.includes('pemerintahan')) return 1;
    if (t.includes('pembangunan')) return 2;
    if (t.includes('kemasyarakatan')) return 3;
    if (t.includes('pemberdayaan')) return 4;
    if (t.includes('bencana')) return 5;
    return 1;
}

window.addEventListener('tahunChanged', (e) => {
    if (e && e.detail && e.detail.tahun) {
        if (typeof loadEvaluasiData === 'function') loadEvaluasiData();
    }
});

// 1. Load Data Evaluasi
async function loadEvaluasiData() {
    const rkpYear = parseInt(localStorage.getItem('ACTIVE_TAHUN_ANGGARAN') || document.getElementById('select-year')?.value || '2027');

    console.log(`📡 Memuat Data Evaluasi RKP Tahun ${rkpYear}...`);

    try {
        await ensureMasterHierarchy();
        const res = await fetch(`/api/evaluasi?tahun=${rkpYear}`);
        const json = await res.json();

        if (json.success && json.data && json.data.length > 0) {
            evaluasiList = json.data.map(item => ({
                id: item.id || null,
                tahun: rkpYear,
                bidang: parseInt(item.bidang) || 1,
                kode_unik: item.kode_unik || item.kode_unik_full || item.kode_bidang || '',
                sub_bidang: item.sub_bidang || '',
                jenis_kegiatan: item.jenis_kegiatan || '',
                sub_kegiatan: item.sub_kegiatan || item.kegiatan || '',
                lokasi: item.lokasi || 'Desa Batetangnga',
                nominal: parseNumber(item.nominal),
                realisasi: Boolean(item.realisasi),
                keterangan: item.keterangan || ''
            }));
            evaluasiList.forEach(row => enrichRowHierarchy(row));
            renderEvaluasiTable();
            return;
        }

        console.log(`⚠️ Data evaluasi tahun ${rkpYear} belum ada, menarik otomatis dari RKPDes...`);
        await tarikDariRAB(false);
    } catch (err) {
        console.error("❌ Error loadEvaluasiData:", err);
        renderEvaluasiTable();
    }
}

function resolveJenisBidangFallback(item) {
    let rpjmObj = {};
    if (typeof item.rpjm_data === 'string') {
        try { rpjmObj = JSON.parse(item.rpjm_data); } catch(e) {}
    } else if (typeof item.rpjm_data === 'object' && item.rpjm_data !== null) {
        rpjmObj = item.rpjm_data;
    }
    const val = (item.jenis_bidang || rpjmObj.jenis_bidang || item.sub_bidang || item._jenisBidang || '').trim();
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
    let rpjmObj = {};
    if (typeof item.rpjm_data === 'string') {
        try { rpjmObj = JSON.parse(item.rpjm_data); } catch(e) {}
    } else if (typeof item.rpjm_data === 'object' && item.rpjm_data !== null) {
        rpjmObj = item.rpjm_data;
    }
    const val = (item.jenis_kegiatan || item.jenis_kegiatan_kelompok || rpjmObj.jenis_kegiatan || '').trim();
    if (val && val !== 'Kelompok Kegiatan Umum') return val;
    const kode = String(item.kode_unik_full || item.kode_unik || '').trim();
    if (kode.startsWith('01.01.01.') || kode.startsWith('1.1.1.')) return 'Penyediaan Penghasilan Tetap dan Tunjangan Kepala Desa';
    if (kode.startsWith('01.01.02.') || kode.startsWith('1.1.2.')) return 'Penyediaan Penghasilan Tetap dan Tunjangan Perangkat Desa';
    if (kode.startsWith('01.01.03.') || kode.startsWith('1.1.3.')) return 'Penyediaan Jaminan Sosial bagi Kepala Desa dan Perangkat Desa';
    if (kode.startsWith('01.01.04.') || kode.startsWith('1.1.4.')) return 'Penyediaan Operasional Pemerintah Desa (ATK, Honor PKPKD dan PPKD dll)';
    return val || 'Kelompok Kegiatan Utama';
}

// 2. Render Tabel Evaluasi (5 Bidang Wajib, Ultra-Fast < 40ms)
function renderEvaluasiTable() {
    const tbody = document.getElementById('tabel-evaluasi-body');
    if (!tbody) return;

    const rkpYear = parseInt(document.getElementById('select-year')?.value || '2027');

    let html = '';
    let grandTotalNominal = 0;

    for (let b = 1; b <= 5; b++) {
        const namaBidang = NAMA_BIDANG_EVALUASI[b];
        let itemsBidang = evaluasiList.filter(item => parseInt(item.bidang) === b);

        itemsBidang.sort((a, b) => {
            const ka = String(a.kode_unik || a.kode_unik_full || '').trim();
            const kb = String(b.kode_unik || b.kode_unik_full || '').trim();
            return ka.localeCompare(kb, undefined, { numeric: true });
        });

        let subTotalNominal = 0;

        // Render Bidang Level 1 Section Header
        html += `
            <tr class="bg-slate-200/90 font-extrabold text-slate-900 border border-slate-300">
                <td class="text-center border border-slate-300 font-bold py-1.5 px-2 bg-slate-200 text-slate-900">${b}</td>
                <td colspan="6" class="align-top border border-slate-300 font-extrabold bg-slate-200 text-slate-900 px-3 py-1.5 leading-snug uppercase tracking-wide">
                    ${b}. ${namaBidang}
                </td>
            </tr>
        `;

        if (itemsBidang.length > 0) {
            // Build hierarchy map: Sub-Bidang -> Kelompok Kegiatan -> Items
            const subMap = new Map();
            itemsBidang.forEach(item => {
                const subName = resolveJenisBidangFallback(item);
                const kelName = resolveJenisKegiatanKelompokFallback(item);
                const subKey = subName || 'Penyelenggaran Belanja Siltap, Tunjangan dan Operasional Pemerintahan Desa';
                const kelKey = kelName || 'Kelompok Kegiatan Utama';

                if (!subMap.has(subKey)) subMap.set(subKey, new Map());
                const kelMap = subMap.get(subKey);
                if (!kelMap.has(kelKey)) kelMap.set(kelKey, []);
                kelMap.get(kelKey).push(item);
            });

            let globalItemNo = 1;

            subMap.forEach((kelMap, subName) => {
                // Render Sub-Bidang Level 2 Header Row
                if (subName) {
                    html += `
                        <tr class="bg-indigo-50/90 font-bold text-indigo-950 border border-slate-300">
                            <td class="border border-slate-300 bg-indigo-50/90"></td>
                            <td colspan="6" class="align-top border border-slate-300 px-3 py-1.5 text-xs text-indigo-950 font-extrabold uppercase tracking-wide bg-indigo-50/90">
                                <i class="fas fa-folder-open text-indigo-600 mr-1.5"></i> ${escHtml(subName)}
                            </td>
                        </tr>
                    `;
                }

                kelMap.forEach((items, kelName) => {
                    // Render Kelompok Level 3 Header Row
                    if (kelName && kelName !== subName) {
                        html += `
                            <tr class="bg-slate-100/90 font-semibold text-slate-800 border border-slate-300">
                                <td class="border border-slate-300 bg-slate-100/90"></td>
                                <td colspan="6" class="align-top border border-slate-300 px-5 py-1 text-[11px] text-slate-800 font-bold italic bg-slate-100/90">
                                    <i class="fas fa-caret-right text-slate-500 mr-1.5"></i> ${escHtml(kelName)}
                                </td>
                            </tr>
                        `;
                    }

                    // Render Activity Level 4 Rows
                    items.forEach((item) => {
                        const nominalVal = parseNumber(item.nominal) || 0;
                        subTotalNominal += nominalVal;
                        const itemKey = item.id || item.kode_unik || globalItemNo;
                        const isEditing = editingRowId && String(editingRowId) === String(item.id);
                        const namaKegiatan = item.nama_kegiatan || item.sub_kegiatan || item.jenis_kegiatan || '-';

                        html += `
                            <tr data-id="${item.id || ''}" class="border border-slate-300 ${isEditing ? 'bg-amber-50/80 border-indigo-500 font-semibold' : 'hover:bg-slate-50'} transition">
                                <td class="border border-slate-300 text-center font-bold text-slate-500 py-1.5 text-xs">${globalItemNo++}</td>
                                <td class="border border-slate-300 p-2 font-semibold text-slate-900 text-xs pl-8">
                                    <div class="font-bold text-slate-900 text-xs">${escHtml(namaKegiatan)}</div>
                                </td>
                                <td class="border border-slate-300 p-1">
                                    <input type="text" value="${escAttr(item.lokasi || '')}" oninput="updateFieldDataByItem('${itemKey}', 'lokasi', this.value)" placeholder="Dusun / RT / RW..." class="w-full p-1.5 bg-transparent border border-slate-200 focus:bg-amber-50 rounded text-xs" />
                                </td>
                                <td class="border border-slate-300 p-1 text-right font-bold text-slate-900 text-xs whitespace-nowrap">
                                    ${formatRupiah(nominalVal)}
                                </td>
                                <td class="border border-slate-300 p-1 text-center">
                                    <input type="checkbox" ${item.realisasi ? 'checked' : ''} onchange="toggleRealisasiByItem('${itemKey}', this.checked)" class="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer align-middle" />
                                    <span class="ml-1 text-[11px] font-bold ${item.realisasi ? 'text-emerald-700' : 'text-slate-400'}">${item.realisasi ? 'Ya (√)' : 'Tidak'}</span>
                                </td>
                                <td class="border border-slate-300 p-1">
                                    <input type="text" value="${escAttr(item.keterangan || '')}" oninput="updateFieldDataByItem('${itemKey}', 'keterangan', this.value)" placeholder="Keterangan RKP..." class="w-full p-1.5 bg-transparent border border-slate-200 focus:bg-amber-50 rounded text-xs" />
                                </td>
                                <td class="border border-slate-300 text-center py-1.5 no-print whitespace-nowrap">
                                    <div class="flex justify-center items-center gap-1">
                                        ${isEditing ? `
                                            <button onclick="saveEditRow('${item.id}')" title="Simpan Perubahan" class="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition">💾</button>
                                            <button onclick="cancelEditRow()" title="Batal Edit" class="px-2 py-0.5 bg-slate-400 hover:bg-slate-500 text-white rounded text-xs font-bold transition">❌</button>
                                        ` : `
                                            <button onclick="editRow('${item.id}')" title="Edit Data" class="text-blue-600 hover:text-blue-800 p-1 font-bold">✏️</button>
                                            <button onclick="deleteRow('${item.id}')" title="Hapus Data" class="text-red-600 hover:text-red-800 p-1 font-bold">🗑️</button>
                                            <button onclick="addRow(${b})" title="Tambah Baris" class="text-emerald-600 hover:text-emerald-800 p-1 font-bold">➕</button>
                                        `}
                                    </div>
                                </td>
                            </tr>
                        `;
                    });
                });
            });
        } else {
            // Empty Bidang
            html += `
                <tr class="hover:bg-slate-50 transition">
                    <td class="border border-slate-300 text-center text-slate-400 py-1.5">-</td>
                    <td class="border border-slate-300 p-2 text-slate-400 italic text-xs">Belum ada kegiatan untuk bidang ini</td>
                    <td class="border border-slate-300 p-1 text-center text-slate-400">-</td>
                    <td class="border border-slate-300 p-1 text-right text-slate-400 font-mono text-xs">Rp 0</td>
                    <td class="border border-slate-300 p-1 text-center text-slate-400">-</td>
                    <td class="border border-slate-300 p-1 text-center text-slate-400">-</td>
                    <td class="border border-slate-300 text-center py-1.5 no-print">
                        <button onclick="addRow(${b})" title="Tambah Baris" class="text-emerald-600 hover:text-emerald-800 p-1 font-bold">➕</button>
                    </td>
                </tr>
            `;
        }

        grandTotalNominal += subTotalNominal;

        html += `
            <tr class="bg-slate-100 font-bold text-slate-900">
                <td colspan="3" class="border border-slate-400 text-right px-3 py-1.5 uppercase text-xs">JUMLAH PER BIDANG ${b}</td>
                <td class="border border-slate-400 text-right px-2 py-1.5 font-mono text-xs font-bold text-indigo-950">${subTotalNominal > 0 ? formatRupiah(subTotalNominal) : '-'}</td>
                <td colspan="3" class="border border-slate-400 no-print"></td>
            </tr>
        `;
    }

    html += `
        <tr class="bg-indigo-950 text-white font-extrabold text-sm">
            <td colspan="3" class="border border-slate-600 text-right px-4 py-2.5 uppercase">J U M L A H &nbsp; T O T A L &nbsp; E V A L U A S I</td>
            <td class="border border-slate-600 text-right px-3 py-2.5 font-mono">${formatRupiah(grandTotalNominal)}</td>
            <td colspan="3" class="border border-slate-600 no-print"></td>
        </tr>
    `;

    requestAnimationFrame(() => {
        tbody.innerHTML = html;
    });
}

function updateFieldDataByItem(idOrKode, field, value) {
    const targetItem = evaluasiList.find(i => String(i.id || i.kode_unik) === String(idOrKode));
    if (targetItem) {
        if (field === 'nominal') {
            targetItem[field] = parseNumber(value);
        } else {
            targetItem[field] = value;
        }
    }
}

function toggleRealisasiByItem(idOrKode, isChecked) {
    const targetItem = evaluasiList.find(i => String(i.id || i.kode_unik) === String(idOrKode));
    if (targetItem) {
        targetItem.realisasi = Boolean(isChecked);
        renderEvaluasiTable();
    }
}

// 3. Tarik Data dari RKPDes Tahun Terpilih (Urut Berdasarkan Kode Unik)
async function tarikDariRAB(showAlert = true) {
    const tahunTarget = document.getElementById('select-year')?.value || '2027';
    const tahunEvaluasi = parseInt(tahunTarget);

    console.log(`📥 Menarik data RKPDes tahun ${tahunEvaluasi}...`);

    try {
        await ensureMasterHierarchy();
        const res = await fetch(`/api/evaluasi/tarik-rab?tahun=${tahunEvaluasi}`);
        const data = await res.json();

        if (data.success && data.data && data.data.length > 0) {
            // ✅ URUTKAN DATA BERDASARKAN KODE_UNIK
            const sortedData = data.data.sort((a, b) => {
                const kodeA = a.kode_unik || a.kode_unik_full || '';
                const kodeB = b.kode_unik || b.kode_unik_full || '';
                return kodeA.localeCompare(kodeB);
            });

            // ✅ KELOMPOKKAN BERDASARKAN BIDANG DARI KODE_UNIK
            const grouped = {};
            sortedData.forEach(item => {
                let bidang = 1;
                const kodeStr = item.kode_unik || item.kode_unik_full || '';
                if (kodeStr) {
                    const match = String(kodeStr).match(/^0?([1-5])/);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        if (num >= 1 && num <= 5) bidang = num;
                    }
                } else if (typeof item.bidang === 'number' && item.bidang >= 1 && item.bidang <= 5) {
                    bidang = item.bidang;
                }

                if (!grouped[bidang]) grouped[bidang] = [];
                grouped[bidang].push(item);
            });

            const mappedData = [];
            Object.keys(grouped).sort((a, b) => parseInt(a) - parseInt(b)).forEach(bidang => {
                grouped[bidang].forEach((item) => {
                    const kodeUnik = item.kode_unik || item.kode_unik_full || '';
                    mappedData.push({
                        id: null,
                        tahun: tahunEvaluasi,
                        bidang: parseInt(bidang),
                        kode_unik: kodeUnik,
                        sub_bidang: item.sub_bidang || '',
                        jenis_kegiatan: item.jenis_kegiatan || item.nama_kegiatan || item.kegiatan || '',
                        sub_kegiatan: item.nama_kegiatan || item.kegiatan || item.jenis_kegiatan || item.sub_kegiatan || item.uraian || '',
                        lokasi: item.lokasi || item.lokasi_kegiatan || 'Desa Batetangnga',
                        nominal: parseNumber(item.total_biaya || item.jumlah_anggaran || item.pagu || item.nominal || 0),
                        realisasi: false,
                        keterangan: '',
                        kode_unik_full: kodeUnik,
                        kode_bidang: kodeUnik
                    });
                });
            });

            evaluasiList = mappedData.map(row => enrichRowHierarchy(row));
            renderEvaluasiTable();
            if (showAlert) alert(`✅ Berhasil menarik ${mappedData.length} data dari RKPDes tahun ${tahunEvaluasi} (Urut Kode Unik)`);
        } else {
            evaluasiList = [];
            renderEvaluasiTable();
            if (showAlert) alert(`📭 Tidak ada data RKPDes untuk tahun ${tahunEvaluasi}`);
        }
    } catch (error) {
        console.error('❌ Error tarikDariRAB:', error);
        if (showAlert) alert(`❌ Gagal menarik data: ${error.message}`);
    }
}

// 4. Update Field Realtime
function updateFieldData(bidangNum, idxInBidang, field, value) {
    let itemsBidang = evaluasiList.filter(item => parseInt(item.bidang) === bidangNum);
    const targetItem = itemsBidang[idxInBidang];

    if (targetItem) {
        const globalIdx = evaluasiList.indexOf(targetItem);
        if (globalIdx > -1) {
            if (field === 'nominal') {
                evaluasiList[globalIdx][field] = parseNumber(value);
            } else {
                evaluasiList[globalIdx][field] = value;
            }
        }
    }
}

// 5. Toggle Realisasi
function toggleRealisasi(bidangNum, idxInBidang, isChecked) {
    let itemsBidang = evaluasiList.filter(item => parseInt(item.bidang) === bidangNum);
    const targetItem = itemsBidang[idxInBidang];

    if (targetItem) {
        const globalIdx = evaluasiList.indexOf(targetItem);
        if (globalIdx > -1) {
            evaluasiList[globalIdx].realisasi = Boolean(isChecked);
            renderEvaluasiTable();
        }
    }
}

// 6. Tambah, Edit, Hapus Row
function addRow(bidangNum) {
    const rkpYear = parseInt(document.getElementById('select-year')?.value || '2027');

    evaluasiList.push({
        id: null,
        tahun: rkpYear,
        bidang: bidangNum,
        kode_unik: '',
        sub_bidang: '',
        jenis_kegiatan: '',
        sub_kegiatan: '',
        lokasi: 'Desa Batetangnga',
        nominal: 0,
        realisasi: false,
        keterangan: ''
    });

    renderEvaluasiTable();
}

function editRow(id) {
    editingRowId = id;
    renderEvaluasiTable();
}

function cancelEditRow() {
    editingRowId = null;
    renderEvaluasiTable();
}

async function saveEditRow(id) {
    const target = evaluasiList.find(i => String(i.id) === String(id));
    if (!target) return;

    try {
        const res = await fetch('/api/evaluasi', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(target)
        });

        const json = await res.json();
        if (json.success) {
            editingRowId = null;
            alert("✅ Data evaluasi berhasil diupdate!");
            loadEvaluasiData();
        } else {
            alert("❌ Gagal update: " + json.error);
        }
    } catch (err) {
        alert("❌ Error koneksi: " + err.message);
    }
}

async function deleteRow(id) {
    if (!confirm("Yakin ingin menghapus data evaluasi ini?")) return;

    if (!id) {
        evaluasiList = evaluasiList.filter(i => String(i.id) !== String(id));
        renderEvaluasiTable();
        return;
    }

    try {
        const res = await fetch(`/api/evaluasi?id=${id}`, { method: 'DELETE' });
        const json = await res.json();

        if (json.success) {
            alert("✅ Data evaluasi berhasil dihapus!");
            loadEvaluasiData();
        } else {
            alert("❌ Gagal menghapus: " + json.error);
        }
    } catch (err) {
        alert("❌ Error koneksi: " + err.message);
    }
}

// 7. Simpan ke Database (Batch Sync 50)
async function saveToDatabase() {
    const rkpYear = parseInt(document.getElementById('select-year')?.value || '2027');

    console.log(`📡 Memanggil endpoint: /api/evaluasi/sync untuk tahun ${rkpYear} dengan ${evaluasiList.length} data...`);

    try {
        const res = await fetch('/api/evaluasi/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tahun: rkpYear, data: evaluasiList })
        });

        const textResponse = await res.text();
        let json;
        try {
            json = JSON.parse(textResponse);
        } catch (e) {
            console.error("❌ Respon server bukan JSON:", textResponse.substring(0, 150));
            alert("❌ Gagal menyimpan: Respon dari server bukan JSON. Silakan periksa log server.");
            return;
        }

        if (json.success) {
            alert(`✅ ${json.message}`);
            loadEvaluasiData();
        } else {
            alert("❌ Gagal menyimpan: " + (json.error || json.message));
        }
    } catch (err) {
        console.error("❌ Exception saveToDatabase:", err);
        alert("❌ Error koneksi: " + err.message);
    }
}

// 8. Cetak PDF / Print PDF Window
function printPDF() {
    const rkpYear = parseInt(document.getElementById('select-year')?.value || '2027');
    const evalYear = rkpYear;

    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
        alert("⚠️ Izinkan pop-up browser untuk mencetak PDF!");
        return;
    }

    let tableRowsHtml = '';
    let grandTotal = 0;

    for (let b = 1; b <= 5; b++) {
        const namaBidang = NAMA_BIDANG_EVALUASI[b];
        let itemsBidang = evaluasiList.filter(item => parseInt(item.bidang) === b);

        itemsBidang.sort((a, b) => {
            const ka = String(a.kode_unik || a.kode_unik_full || '').trim();
            const kb = String(b.kode_unik || b.kode_unik_full || '').trim();
            return ka.localeCompare(kb, undefined, { numeric: true });
        });

        let subTotal = 0;

        // Render Bidang Level 1 Section Header
        tableRowsHtml += `
            <tr style="background-color: #e2e8f0; font-weight: bold; font-size: 10px;">
                <td style="text-align: center; border: 1px solid #334155;">${b}</td>
                <td colspan="5" style="border: 1px solid #334155; text-transform: uppercase; padding: 5px 6px;">
                    ${b}. ${namaBidang}
                </td>
            </tr>
        `;

        if (itemsBidang.length > 0) {
            // Build hierarchy map: Sub-Bidang -> Kelompok Kegiatan -> Items
            const subMap = new Map();
            itemsBidang.forEach(item => {
                const subName = resolveJenisBidangFallback(item);
                const kelName = resolveJenisKegiatanKelompokFallback(item);
                const subKey = subName || 'Penyelenggaran Belanja Siltap, Tunjangan dan Operasional Pemerintahan Desa';
                const kelKey = kelName || 'Kelompok Kegiatan Utama';

                if (!subMap.has(subKey)) subMap.set(subKey, new Map());
                const kelMap = subMap.get(subKey);
                if (!kelMap.has(kelKey)) kelMap.set(kelKey, []);
                kelMap.get(kelKey).push(item);
            });

            let globalItemNo = 1;

            subMap.forEach((kelMap, subName) => {
                // Render Sub-Bidang Level 2 Header Row
                if (subName) {
                    tableRowsHtml += `
                        <tr style="background-color: #f1f5f9; font-weight: bold; font-size: 9.5px;">
                            <td style="border: 1px solid #334155;"></td>
                            <td colspan="5" style="border: 1px solid #334155; text-transform: uppercase; padding: 4px 8px; color: #0f172a;">
                                📁 ${escHtml(subName)}
                            </td>
                        </tr>
                    `;
                }

                kelMap.forEach((items, kelName) => {
                    // Render Kelompok Level 3 Header Row
                    if (kelName && kelName !== subName) {
                        tableRowsHtml += `
                            <tr style="background-color: #f8fafc; font-style: italic; font-weight: bold; font-size: 9px;">
                                <td style="border: 1px solid #334155;"></td>
                                <td colspan="5" style="border: 1px solid #334155; padding: 3px 12px; color: #1e293b;">
                                    ▸ ${escHtml(kelName)}
                                </td>
                            </tr>
                        `;
                    }

                    // Render Activity Level 4 Rows
                    items.forEach((item) => {
                        const nom = parseNumber(item.nominal) || 0;
                        subTotal += nom;
                        const namaKegiatan = item.nama_kegiatan || item.sub_kegiatan || item.jenis_kegiatan || '-';

                        tableRowsHtml += `
                            <tr>
                                <td style="text-align: center; border: 1px solid #334155;">${globalItemNo++}</td>
                                <td style="border: 1px solid #334155; padding-left: 16px;">
                                    <strong style="display:block; font-size: 9.5px; color: #000;">${escHtml(namaKegiatan)}</strong>
                                </td>
                                <td style="border: 1px solid #334155;">${escHtml(item.lokasi || 'Desa Batetangnga')}</td>
                                <td style="text-align: right; border: 1px solid #334155; font-weight: bold;">${nom > 0 ? formatRupiah(nom) : '-'}</td>
                                <td style="text-align: center; border: 1px solid #334155; font-weight: bold; color: ${item.realisasi ? '#15803d' : '#475569'};">${item.realisasi ? 'Ya (√)' : 'Tidak'}</td>
                                <td style="border: 1px solid #334155;">${escHtml(item.keterangan || '-')}</td>
                            </tr>
                        `;
                    });
                });
            });
        } else {
            tableRowsHtml += `
                <tr>
                    <td style="text-align: center; border: 1px solid #334155;">-</td>
                    <td style="border: 1px solid #334155; font-style: italic; color: #64748b;">Belum ada kegiatan untuk bidang ini</td>
                    <td style="text-align: center; border: 1px solid #334155;">-</td>
                    <td style="text-align: right; border: 1px solid #334155;">Rp 0</td>
                    <td style="text-align: center; border: 1px solid #334155;">-</td>
                    <td style="border: 1px solid #334155;">-</td>
                </tr>
            `;
        }

        grandTotal += subTotal;
        tableRowsHtml += `
            <tr style="background-color: #f1f5f9; font-weight: bold;">
                <td colspan="3" style="text-align: right; border: 1px solid #334155;">JUMLAH PER BIDANG ${b}</td>
                <td style="text-align: right; border: 1px solid #334155; font-weight: font-extrabold;">${subTotal > 0 ? formatRupiah(subTotal) : '-'}</td>
                <td colspan="2" style="border: 1px solid #334155;"></td>
            </tr>
        `;
    }

    tableRowsHtml += `
        <tr style="background-color: #0f172a; color: #ffffff; font-weight: bold; font-size: 10.5px;">
            <td colspan="3" style="text-align: right; border: 1px solid #0f172a; padding: 6px;">J U M L A H &nbsp; T O T A L &nbsp; E V A L U A S I</td>
            <td style="text-align: right; border: 1px solid #0f172a; padding: 6px;">${formatRupiah(grandTotal)}</td>
            <td colspan="2" style="border: 1px solid #0f172a;"></td>
        </tr>
    `;

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Evaluasi Pelaksanaan RKP Desa - ${evalYear}</title>
            <style>
                @page {
                    size: landscape;
                    margin: 8mm 6mm;
                }
                body {
                    font-family: 'Times New Roman', Arial, sans-serif;
                    font-size: 9.5px;
                    color: #000000;
                    margin: 0;
                    padding: 0;
                }
                .header {
                    text-align: center;
                    margin-bottom: 12px;
                    border-bottom: 2px solid #000;
                    padding-bottom: 6px;
                }
                .header h1 {
                    font-size: 13px;
                    margin: 2px 0;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .header h2 {
                    font-size: 11px;
                    margin: 2px 0;
                    color: #000;
                    text-transform: uppercase;
                }
                .meta-table {
                    width: 100%;
                    border: none;
                    font-weight: bold;
                    margin: 6px 0;
                    font-size: 9.5px;
                }
                .meta-table td { border: none; padding: 1px 4px; }
                table.data-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 9px;
                }
                table.data-table th, table.data-table td {
                    border: 1px solid #000000;
                    padding: 4px 6px;
                    word-wrap: break-word;
                }
                table.data-table th {
                    background: #f8fafc;
                    color: #0f172a;
                    text-align: center;
                    text-transform: uppercase;
                    font-weight: bold;
                    font-size: 9.5px;
                }
                .ttd {
                    margin-top: 25px;
                    display: flex;
                    justify-content: space-between;
                    font-weight: bold;
                    font-size: 10px;
                }
                .ttd-box { width: 240px; text-align: center; }
                .ttd-space { height: 45px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>EVALUASI PELAKSANAAN RKP DESA TAHUN ANGGARAN ${evalYear}</h1>
                <h2>DESA BATETANGNGA KECAMATAN BINUANG KABUPATEN POLEWALI MANDAR</h2>
                <table class="meta-table">
                    <tr>
                        <td width="25%">DESA: BATETANGNGA</td>
                        <td width="25%">KECAMATAN: BINUANG</td>
                        <td width="25%">KABUPATEN: POLEWALI MANDAR</td>
                        <td width="25%">PROVINSI: SULAWESI BARAT</td>
                    </tr>
                </table>
            </div>

            <table class="data-table">
                <thead>
                    <tr>
                        <th width="30">No</th>
                        <th>Jenis Kegiatan</th>
                        <th width="150">Lokasi Kegiatan</th>
                        <th width="120">Nominal (Rp)</th>
                        <th width="80">Realisasi (√)</th>
                        <th width="150">Keterangan</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRowsHtml}
                </tbody>
            </table>

            <div class="ttd">
                <div class="ttd-box">
                    <p>Mengetahui,</p>
                    <p>Kepala Desa Batetangnga</p>
                    <div class="ttd-space"></div>
                    <p style="text-decoration: underline;">SUMAILA DAMANG</p>
                </div>
                <div class="ttd-box">
                    <p>Batetangnga, ${formatTanggalIndonesia()}</p>
                    <p>Disusun oleh,<br>Ketua Tim Penyusun RKPDesa</p>
                    <div class="ttd-space"></div>
                    <p style="text-decoration: underline;">ABDUL AZIS, S. Pd</p>
                </div>
            </div>
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
    }, 500);
}

document.addEventListener('DOMContentLoaded', () => {
    loadEvaluasiData();
});