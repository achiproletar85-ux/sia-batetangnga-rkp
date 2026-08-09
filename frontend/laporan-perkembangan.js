// laporan-perkembangan.js
let laporanList = [];

const bidangNames = {
    1: 'Penyelenggaraan Pemerintahan Desa',
    2: 'Pembangunan Desa',
    3: 'Pembinaan Kemasyarakatan',
    4: 'Pemberdayaan Masyarakat Desa',
    5: 'Penanggulangan Bencana, keadaan Darurat dan Mendesak Desa'
};

function formatRupiah(number) {
    const num = parseInt(number) || 0;
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

function parseNumber(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const clean = String(val).replace(/[^0-9]/g, '');
    return parseInt(clean, 10) || 0;
}

function getBulanNumber(bulan) {
    const map = {
        'Januari': 1, 'Februari': 2, 'Maret': 3, 'April': 4,
        'Mei': 5, 'Juni': 6, 'Juli': 7, 'Agustus': 8,
        'September': 9, 'Oktober': 10, 'November': 11, 'Desember': 12
    };
    return map[bulan] || 1;
}

window.addEventListener('tahunChanged', (e) => {
    if (e && e.detail && e.detail.tahun) {
        if (typeof updateJudul === 'function') updateJudul();
        if (typeof loadLaporanData === 'function') loadLaporanData();
    }
});

function updateJudul() {
    const bulan = document.getElementById('select-bulan')?.value || 'Agustus';
    const tahun = localStorage.getItem('ACTIVE_TAHUN_ANGGARAN') || document.getElementById('select-tahun')?.value || '2027';
    const tahunTarik = (parseInt(tahun) || 2027) - 1;

    const bulanEl = document.getElementById('judul-bulan');
    if (bulanEl) bulanEl.innerText = bulan;

    // Judul menampilkan TAHUN SUMBER yang ditarik dari RKPDes (tahun terpilih − 1)
    const tahunEl = document.getElementById('judul-tahun');
    if (tahunEl) tahunEl.innerText = tahunTarik;
}

function updateTTD() {
    const tanggal = document.getElementById('tanggal-input')?.value || '2026-08-02';
    const kepalaDesa = document.getElementById('kepala-desa-input')?.value || 'SUMAILA DAMANG';
    const ketuaTim = document.getElementById('ketua-tim-input')?.value || 'Abdul Azis, S. Pd';

    const tglEl = document.getElementById('tanggal-cetak');
    if (tglEl) {
        try {
            const date = new Date(tanggal + 'T00:00:00');
            tglEl.textContent = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch (e) {
            tglEl.textContent = tanggal;
        }
    }

    const kepalaEl = document.getElementById('kepala-desa-nama');
    if (kepalaEl) kepalaEl.textContent = kepalaDesa;

    const ketuaEl = document.getElementById('ketua-tim-nama');
    if (ketuaEl) ketuaEl.textContent = ketuaTim;
}

document.addEventListener('DOMContentLoaded', () => {
    updateTTD();
    updateJudul();
    loadLaporanData();
});

// Helper: hitung nomor bidang (1-5) dari kode unik / bidang item.
function laporanBidangNum(item) {
    const kodeStr = item.kode_unik || item.kode_unik_full || '';
    if (kodeStr) {
        const match = String(kodeStr).match(/^0?([1-5])/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num >= 1 && num <= 5) return num;
        }
    }
    if (typeof item.bidang === 'number' && item.bidang >= 1 && item.bidang <= 5) return item.bidang;
    if (item.bidang) {
        const num = parseInt(item.bidang, 10);
        if (num >= 1 && num <= 5) return num;
    }
    return 1;
}

// Helper: bangun objek baris laporan dari baris rkpdes (sumber tarik).
// Kolom RENCANA WAKTU / PROGRES / KETERANGAN dikosongkan (isi manual).
function buildLaporanItemFromRkp(item, tahun, bulan) {
    return {
        id: item.id && item.id !== 'null' ? item.id : null,
        kode_unik_full: item.kode_unik_full || '',
        tahun: parseInt(tahun),
        bulan: bulan,
        bidang: laporanBidangNum(item),
        sub_bidang: item.sub_bidang || item.group_nama || '-',
        nama_kegiatan: item.nama_kegiatan || item.kegiatan || item.jenis_kegiatan || item.uraian || '',
        lokasi: item.lokasi || item.lokasi_kegiatan || 'Desa Batetangnga',
        volume_satuan: item.volume_satuan || ((item.volume_rab && item.satuan_rab) ? `${item.volume_rab} ${item.satuan_rab}` : (item.volume || '-')),
        biaya: parseInt(item.biaya || item.total_biaya || item.prakiraan_biaya || item.pagu || item.nominal || 0),
        penerima_jumlah: parseInt(item.penerima_jumlah || item.total_manfaat || 0),
        penerima_lk: parseInt(item.penerima_lk || item.manfaat_l || item.penerima_laki || 0),
        penerima_pr: parseInt(item.penerima_pr || item.manfaat_p || item.penerima_perempuan || 0),
        penerima_rtm: parseInt(item.penerima_rtm || item.manfaat_rtm || 0),
        // Dikosongkan: diisi manual oleh pengguna
        rencana_hari: 0,
        tgl_mulai: '',
        progres_fisik: 0,
        progres_biaya: 0,
        keterangan: ''
    };
}

// 1. Load Laporan Perkembangan — selalu menarik dari RKPDes (tahun terpilih − 1)
// sebagai sumber kebenaran, lalu menggabungkan kolom manual yang sudah tersimpan di DB.
async function loadLaporanData() {
    const tahun = localStorage.getItem('ACTIVE_TAHUN_ANGGARAN') || document.getElementById('select-tahun')?.value || '2027';
    const bulan = document.getElementById('select-bulan')?.value || 'Agustus';
    const tahunTarik = (parseInt(tahun) || 2027) - 1;

    updateJudul();
    console.log(`📡 Load Laporan Perkembangan — sumber RKPDes ${tahunTarik} (periode ${tahun} ${bulan})...`);

    try {
        // 1) Baris kanonik dari RKPDes(tahun−1)
        const rkpRes = await fetch(`/api/laporan-perkembangan/tarik-rab?tahun=${tahunTarik}`);
        const rkpJson = await rkpRes.json();

        // 2) Kolom manual yang sudah tersimpan utk periode terpilih
        let savedMap = new Map();
        try {
            const savedRes = await fetch(`/api/laporan-perkembangan?tahun=${tahun}&bulan=${encodeURIComponent(bulan)}`);
            const savedJson = await savedRes.json();
            if (savedJson.success && Array.isArray(savedJson.data)) {
                for (const r of savedJson.data) {
                    const key = String(r.nama_kegiatan || '').trim();
                    if (key) savedMap.set(key, r);
                }
            }
        } catch (e) { /* abaikan — hanya bonus manual */ }

        if (rkpJson.success && Array.isArray(rkpJson.data) && rkpJson.data.length > 0) {
            laporanList = rkpJson.data.map(item => {
                const row = buildLaporanItemFromRkp(item, tahun, bulan);
                // id fresh diisi dari DB oleh refreshIdsFromServer() setelah replace-sync
                row.id = null;
                const saved = savedMap.get(String(item.nama_kegiatan || item.jenis_kegiatan || '').trim());
                if (saved) {
                    row.rencana_hari = Number(saved.rencana_hari || 0);
                    row.tgl_mulai = saved.tgl_mulai || '';
                    row.progres_fisik = Number(saved.progres_fisik || 0);
                    row.progres_biaya = Number(saved.progres_biaya || 0);
                    row.keterangan = saved.keterangan || '';
                }
                return row;
            });
            renderLaporanTable();
            // Sinkronkan (replace) agar isi laporan_perkembangan persis = RKPDes sumber,
            // lalu segarkan ID dari DB (id lama basi setelah replace).
            const okSync = await syncToSupabase(tahun, bulan, null, true);
            if (okSync) await refreshIdsFromServer(tahun, bulan);
        } else {
            console.log(`📭 Tidak ada data RKPDes ${tahunTarik}. Kolom dibiarkan kosong utk isi manual.`);
            laporanList = [];
            renderLaporanTable();
        }
    } catch (err) {
        console.error("❌ Error loadLaporanData:", err);
        laporanList = [];
        renderLaporanTable();
    }
}

// 2. Render Tabel 5 Bidang Baku
function renderLaporanTable() {
    const tbody = document.getElementById('laporan-body');
    if (!tbody) return;

    let html = '';
    let grandTotalBiaya = 0;
    let grandTotalProgresBiaya = 0;
    let totalKegiatanCount = 0;

    for (let b = 1; b <= 5; b++) {
        const itemsInBidang = laporanList.filter(item => parseInt(item.bidang) === b);
        let subtotalBiaya = 0;
        let subtotalProgresBiaya = 0;

        // Header Bidang Wajib
        html += `
            <tr class="bg-slate-200 text-slate-900 font-bold border-b border-t border-slate-300">
                <td class="p-2 text-center font-extrabold">${b}</td>
                <td colspan="14" class="p-2 uppercase tracking-wide text-blue-950 font-bold">
                    BIDANG ${b}: ${bidangNames[b]}
                </td>
                <td class="p-2 text-center no-print">
                    <button onclick="addRow(${b})" title="Tambah Kegiatan di Bidang ${b}" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2 py-1 rounded transition">
                        <i class="fas fa-plus"></i> Tambah
                    </button>
                </td>
            </tr>
        `;

        if (itemsInBidang.length === 0) {
            html += `
                <tr class="italic text-slate-400 bg-white">
                    <td class="p-2 text-center border border-slate-300">-</td>
                    <td colspan="14" class="p-2 text-center border border-slate-300">Belum ada kegiatan pembangunan untuk Bidang ${b}</td>
                    <td class="p-2 text-center border border-slate-300 no-print"></td>
                </tr>
            `;
        } else {
            itemsInBidang.forEach((item, idx) => {
                totalKegiatanCount++;
                const biaya = parseInt(item.biaya) || 0;
                const progresBiaya = parseInt(item.progres_biaya) || 0;
                subtotalBiaya += biaya;
                subtotalProgresBiaya += progresBiaya;
                grandTotalBiaya += biaya;
                grandTotalProgresBiaya += progresBiaya;

                html += `
                    <tr class="hover:bg-blue-50/50 transition border-b border-slate-200 text-xs">
                        <td class="p-1 text-center font-semibold text-slate-600 border border-slate-300">${b}.${idx + 1}</td>
                        <td class="p-1 border border-slate-300">
                            <input type="text" value="${(item.sub_bidang || '-').replace(/"/g, '&quot;')}" onchange="updateFieldData(${b}, ${idx}, 'sub_bidang', this.value)" class="w-full px-1 py-0.5 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded outline-none" placeholder="Sub Bidang...">
                        </td>
                        <td class="p-1 border border-slate-300">
                            <input type="text" value="${(item.nama_kegiatan || '').replace(/"/g, '&quot;')}" onchange="updateFieldData(${b}, ${idx}, 'nama_kegiatan', this.value)" class="w-full px-1 py-0.5 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded outline-none font-semibold text-slate-800" placeholder="Nama Kegiatan...">
                        </td>
                        <td class="p-1 border border-slate-300">
                            <input type="text" value="${(item.lokasi || '-').replace(/"/g, '&quot;')}" onchange="updateFieldData(${b}, ${idx}, 'lokasi', this.value)" class="w-full px-1 py-0.5 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded outline-none" placeholder="Lokasi...">
                        </td>
                        <td class="p-1 border border-slate-300">
                            <input type="text" value="${(item.volume_satuan || '-').replace(/"/g, '&quot;')}" onchange="updateFieldData(${b}, ${idx}, 'volume_satuan', this.value)" class="w-full px-1 py-0.5 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded outline-none text-center" placeholder="Volume...">
                        </td>
                        <td class="p-1 border border-slate-300">
                            <input type="text" value="${formatRupiah(biaya)}" onfocus="this.value = parseNumber(this.value)" onblur="this.value = formatRupiah(this.value)" onchange="updateFieldData(${b}, ${idx}, 'biaya', this.value)" class="biaya-input w-full px-1 py-0.5 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded outline-none text-right font-semibold text-blue-800" placeholder="Rp 0">
                        </td>

                        <!-- REALISASI MANFAAT (JML, LK, PR, RTM) -->
                        <td class="p-1 border border-slate-300">
                            <input type="number" value="${item.penerima_jumlah || 0}" onchange="updateFieldData(${b}, ${idx}, 'penerima_jumlah', this.value)" class="w-full px-0.5 py-0.5 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded outline-none text-center">
                        </td>
                        <td class="p-1 border border-slate-300">
                            <input type="number" value="${item.penerima_lk || 0}" onchange="updateFieldData(${b}, ${idx}, 'penerima_lk', this.value)" class="w-full px-0.5 py-0.5 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded outline-none text-center">
                        </td>
                        <td class="p-1 border border-slate-300">
                            <input type="number" value="${item.penerima_pr || 0}" onchange="updateFieldData(${b}, ${idx}, 'penerima_pr', this.value)" class="w-full px-0.5 py-0.5 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded outline-none text-center">
                        </td>
                        <td class="p-1 border border-slate-300">
                            <input type="number" value="${item.penerima_rtm || 0}" onchange="updateFieldData(${b}, ${idx}, 'penerima_rtm', this.value)" class="w-full px-0.5 py-0.5 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded outline-none text-center">
                        </td>

                        <!-- RENCANA WAKTU (HARI & TGL MULAI) -->
                        <td class="p-1 border border-slate-300">
                            <input type="number" value="${item.rencana_hari || 0}" onchange="updateFieldData(${b}, ${idx}, 'rencana_hari', this.value)" class="w-full px-0.5 py-0.5 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded outline-none text-center" placeholder="Hari">
                        </td>
                        <td class="p-1 border border-slate-300">
                            <input type="date" value="${item.tgl_mulai || ''}" onchange="updateFieldData(${b}, ${idx}, 'tgl_mulai', this.value)" class="w-full px-0.5 py-0.5 text-[11px] border border-transparent hover:border-slate-300 focus:border-blue-500 rounded outline-none text-center">
                        </td>

                        <!-- PROGRES KEGIATAN (FISIK % & BIAYA RP) -->
                        <td class="p-1 border border-slate-300">
                            <input type="number" min="0" max="100" value="${item.progres_fisik || 0}" onchange="updateFieldData(${b}, ${idx}, 'progres_fisik', this.value)" class="progres-fisik-input w-full px-0.5 py-0.5 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded outline-none text-center font-bold text-amber-700" placeholder="%">
                        </td>
                        <td class="p-1 border border-slate-300">
                            <input type="text" value="${formatRupiah(progresBiaya)}" onfocus="this.value = parseNumber(this.value)" onblur="this.value = formatRupiah(this.value)" onchange="onProgresBiayaChange(${b}, ${idx}, this.value, this)" class="progres-biaya-input w-full px-1 py-0.5 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded outline-none text-right font-bold text-emerald-700" placeholder="Rp 0">
                        </td>

                        <td class="p-1 border border-slate-300">
                            <input type="text" value="${(item.keterangan || '-').replace(/"/g, '&quot;')}" onchange="updateFieldData(${b}, ${idx}, 'keterangan', this.value)" class="w-full px-1 py-0.5 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded outline-none" placeholder="Keterangan...">
                        </td>

                        <td class="p-1 text-center border border-slate-300 no-print">
                            <button onclick="deleteRow(${b}, ${idx}, '${item.id || ''}')" title="Hapus Kegiatan" class="text-rose-600 hover:text-rose-800 p-1 transition">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
        }

        // Subtotal Bidang
        html += `
            <tr class="bg-blue-50/70 text-blue-950 font-bold border-b-2 border-slate-300 text-xs">
                <td colspan="5" class="p-2 text-right uppercase tracking-wide">SUBTOTAL BIDANG ${b}:</td>
                <td class="p-2 text-right text-blue-900 font-extrabold">${formatRupiah(subtotalBiaya)}</td>
                <td colspan="7" class="p-2 text-right uppercase tracking-wide">PROGRES BIAYA:</td>
                <td class="p-2 text-right text-emerald-800 font-extrabold">${formatRupiah(subtotalProgresBiaya)}</td>
                <td colspan="2" class="p-2"></td>
            </tr>
        `;
    }

    requestAnimationFrame(() => {
        tbody.innerHTML = html;

        const grandAnggaran = document.getElementById('grand-total-anggaran');
        if (grandAnggaran) grandAnggaran.innerText = formatRupiah(grandTotalBiaya);

        const grandProgres = document.getElementById('grand-total-progres-biaya');
        if (grandProgres) grandProgres.innerText = formatRupiah(grandTotalProgresBiaya);

        const statEl = document.getElementById('stat-summary');
        if (statEl) statEl.innerText = `Total Kegiatan: ${totalKegiatanCount} | Total Biaya: ${formatRupiah(grandTotalBiaya)} | Total Realisasi Biaya: ${formatRupiah(grandTotalProgresBiaya)}`;
    });
}

// 3. Tarik Data dari RKPDes (bukan RAB) — RENCANA WAKTU, PROGRES & KETERANGAN dikosongkan
function tarikDariRAB(showAlert = true) {
    const tahun = document.getElementById('select-tahun')?.value || '2027';
    const bulan = document.getElementById('select-bulan')?.value || 'Agustus';
    // Tahun yang ditarik = tahun terpilih dikurangi 1 (misal pilih 2027 → tarik RKPDes 2026)
    const tahunTarik = (parseInt(tahun) || 2027) - 1;
    updateJudul();

    console.log(`📥 Menarik data RKPDes tahun ${tahunTarik} (untuk periode ${tahun})...`);

    fetch(`/api/laporan-perkembangan/tarik-rab?tahun=${tahunTarik}`)
        .then(res => res.json())
        .then(data => {
            if (data.success && data.data && data.data.length > 0) {
                const mappedData = data.data.map((item) => buildLaporanItemFromRkp(item, tahun, bulan));
                // ID diisi ulang dari DB setelah sync (id dari RKPDes tidak valid utk laporan)
                mappedData.forEach(r => { r.id = null; });

                laporanList = mappedData;
                renderLaporanTable();
                // AUTO-SIMPAN (replace) → laporan_perkembangan persis = RKPDes sumber
                syncToSupabase(tahun, bulan, null, true).then(ok => {
                    if (ok && showAlert) alert(`✅ ${mappedData.length} data dari RKPDes ${tahunTarik} tersimpan ke Supabase untuk periode ${tahun}`);
                    if (ok) refreshIdsFromServer(tahun, bulan);
                });
            } else {
                // Kosong → biarkan kosong (data akan diisi manual)
                laporanList = [];
                renderLaporanTable();
                if (showAlert) alert(`📭 Tidak ada data RKPDes tahun ${tahunTarik}. Kolom dibiarkan kosong untuk diisi manual.`);
            }
        })
        .catch(err => {
            console.error('❌ Error:', err);
            if (showAlert) alert('❌ Gagal menarik data');
        });
}

// 4. Update Field Realtime
function updateFieldData(bidangNum, idxInBidang, field, value) {
    const itemsInBidang = laporanList.filter(item => parseInt(item.bidang) === bidangNum);
    const targetItem = itemsInBidang[idxInBidang];

    if (targetItem) {
        const globalIdx = laporanList.indexOf(targetItem);
        if (globalIdx > -1) {
            if (['biaya', 'penerima_jumlah', 'penerima_lk', 'penerima_pr', 'penerima_rtm', 'rencana_hari', 'progres_fisik', 'progres_biaya'].includes(field)) {
                laporanList[globalIdx][field] = parseNumber(value);
            } else {
                laporanList[globalIdx][field] = value;
            }
            scheduleAutoSave(laporanList[globalIdx]);
        }
    }
}

function onProgresBiayaChange(bidangNum, idx, value, inputEl) {
    const parsedBiayaReal = parseNumber(value);
    updateFieldData(bidangNum, idx, 'progres_biaya', parsedBiayaReal);

    const row = inputEl.closest('tr');
    if (row) {
        const itemsInBidang = laporanList.filter(item => parseInt(item.bidang) === bidangNum);
        const item = itemsInBidang[idx];
        if (item) {
            const totalBiaya = parseInt(item.biaya) || 0;
            let progres = 0;
            if (totalBiaya > 0) {
                progres = Math.round((parsedBiayaReal / totalBiaya) * 100);
                if (progres > 100) progres = 100;
            }

            const globalIdx = laporanList.indexOf(item);
            if (globalIdx > -1) {
                laporanList[globalIdx].progres_fisik = progres;
                scheduleAutoSave(laporanList[globalIdx]);
            }

            const progresInput = row.querySelector('.progres-fisik-input');
            if (progresInput) {
                progresInput.value = progres;
            }
        }
    }
}

// 5. Tambah & Hapus Row
function addRow(bidangNum) {
    const tahun = parseInt(document.getElementById('select-tahun')?.value || '2027');
    const bulan = document.getElementById('select-bulan')?.value || 'Agustus';

laporanList.push({
        id: null,
        tahun: tahun,
        bulan: bulan,
        bidang: bidangNum,
        sub_bidang: '-',
        nama_kegiatan: '',
        lokasi: 'Desa Batetangga',
        volume_satuan: '-',
        biaya: 0,
        penerima_jumlah: 0,
        penerima_lk: 0,
        penerima_pr: 0,
        penerima_rtm: 0,
        rencana_hari: 0,
        tgl_mulai: '',
        progres_fisik: 0,
        progres_biaya: 0,
        keterangan: ''
    });
    renderLaporanTable();
    const newItem = laporanList[laporanList.length - 1];
    scheduleAutoSave(newItem);
}

async function deleteRow(bidangNum, idxInBidang, id) {
    if (!confirm("Apakah Anda yakin ingin menghapus kegiatan ini?")) return;

    const itemsInBidang = laporanList.filter(item => parseInt(item.bidang) === bidangNum);
    const targetItem = itemsInBidang[idxInBidang];

    if (targetItem) {
        const globalIdx = laporanList.indexOf(targetItem);
        if (globalIdx > -1) {
            laporanList.splice(globalIdx, 1);
        }
    }

    if (!id || id === 'null' || id === 'undefined') {
        renderLaporanTable();
        return;
    }

    try {
        const res = await fetch(`/api/laporan-perkembangan?id=${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
            alert("✅ Data berhasil dihapus dari database");
        }
    } catch (err) {
        console.error("❌ Error deleteRow:", err);
    }
    renderLaporanTable();
}

// 6. Update Progres Fisik Berdasarkan Realisasi Biaya
function updateProgres() {
    const tahun = document.getElementById('select-tahun')?.value || '2027';
    const bulan = document.getElementById('select-bulan')?.value || 'Agustus';

    if (!confirm(`Update progres fisik berdasarkan realisasi untuk ${bulan} ${tahun}?`)) return;

    fetch(`/api/laporan-perkembangan?tahun=${tahun}&bulan=${encodeURIComponent(bulan)}`)
        .then(res => res.json())
        .then(data => {
            if (!data.success || !data.data || data.data.length === 0) {
                alert('📭 Tidak ada data untuk diupdate');
                return;
            }

            let updatedCount = 0;
            const updates = data.data.map(item => {
                const totalBiaya = item.biaya || 0;
                const realisasiBiaya = item.progres_biaya || 0;
                let progres = 0;

                if (totalBiaya > 0) {
                    progres = Math.round((realisasiBiaya / totalBiaya) * 100);
                    if (progres > 100) progres = 100;
                }

                if (item.progres_fisik !== progres) {
                    updatedCount++;
                    return { id: item.id, progres_fisik: progres };
                }
                return null;
            }).filter(Boolean);

            if (updates.length === 0) {
                alert('✅ Semua data sudah sesuai, tidak ada yang perlu diupdate');
                return;
            }

            const promises = updates.map(update => {
                return fetch('/api/laporan-perkembangan', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(update)
                });
            });

            Promise.all(promises)
                .then(responses => {
                    const allOk = responses.every(r => r.ok);
                    if (allOk) {
                        alert(`✅ Berhasil update progres ${updatedCount} data!`);
                        loadLaporanData();
                    } else {
                        alert('❌ Gagal update sebagian data');
                    }
                })
                .catch(err => {
                    console.error('❌ Error:', err);
                    alert('❌ Gagal update progres');
                });
        })
        .catch(err => {
            console.error('❌ Error:', err);
            alert('❌ Gagal mengambil data');
        });
}

// 7. Simpan Ke Database (Batch Sync 50)
async function saveToDatabase() {
    const tahun = document.getElementById('select-tahun')?.value || '2027';
    const bulan = document.getElementById('select-bulan')?.value || 'Agustus';

    await syncToSupabase(tahun, bulan, (msg) => alert(msg));
}

// Sync laporanList ke tabel laporan_perkembangan di Supabase.
// replace=true → hapus baris lama periode tsb dulu (laporan persis = RKPDes sumber).
async function syncToSupabase(tahun, bulan, notify, replace = false) {
    console.log(`📡 Simpan data Laporan Perkembangan tahun ${tahun} bulan ${bulan} (${laporanList.length} items, replace=${replace})...`);
    try {
        const res = await fetch('/api/laporan-perkembangan/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tahun: tahun, bulan: bulan, replace: replace, data: laporanList })
        });
        const textResponse = await res.text();
        let json;
        try {
            json = JSON.parse(textResponse);
        } catch (e) {
            const errMsg = "❌ Gagal menyimpan: Respon dari server bukan JSON.";
            console.error(errMsg, textResponse.substring(0, 150));
            if (notify) notify(errMsg);
            return false;
        }
        if (json.success) {
            if (notify) notify(`✅ ${json.message}`);
            return true;
        } else {
            const errMsg = "❌ Gagal menyimpan: " + (json.error || json.message);
            if (notify) notify(errMsg);
            return false;
        }
    } catch (err) {
        console.error("❌ Exception syncToSupabase:", err);
        if (notify) notify("❌ Error koneksi: " + err.message);
        return false;
    }
}

// Segarkan ID baris dari DB (id lama basi setelah replace-sync).
function rowKegiatanKey(r) {
    return `${String(r.nama_kegiatan || '').trim()}|${String(r.volume_satuan || '')}`;
}
async function refreshIdsFromServer(tahun, bulan) {
    try {
        const res = await fetch(`/api/laporan-perkembangan?tahun=${tahun}&bulan=${encodeURIComponent(bulan)}`);
        const json = await res.json();
        if (!json.success || !Array.isArray(json.data)) return;
        const byKey = new Map();
        for (const r of json.data) {
            const key = rowKegiatanKey(r);
            if (key && r.id) byKey.set(key, r);
        }
        for (const it of laporanList) {
            const dbRow = byKey.get(rowKegiatanKey(it));
            if (dbRow && dbRow.id) it.id = dbRow.id;
        }
    } catch (e) {
        console.warn("❌ Gagal segarkan ID:", e);
    }
}

// AUTO-SIMPAN: setiap perubahan field langsung di-PUT ke DB (debounce 600ms).
let autoSaveTimers = new WeakMap();
function scheduleAutoSave(item) {
    if (!item) return;
    if (autoSaveTimers.has(item)) clearTimeout(autoSaveTimers.get(item));
    autoSaveTimers.set(item, setTimeout(async () => {
        autoSaveTimers.delete(item);
        try {
            const res = await fetch('/api/laporan-perkembangan', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
            const json = await res.json();
            if (json.success && json.data && json.data.id) {
                item.id = json.data.id;
            } else if (!json.success) {
                console.warn("⚠️ Auto-save gagal:", json.error || json.message);
            }
        } catch (err) {
            console.error("❌ Auto-save error:", err);
        }
    }, 600));
}

// 8. Cetak PDF Dedicated Pop-Up Window
function printPDF() {
    const tahun = document.getElementById('select-tahun')?.value || '2027';
    const tahunTarik = (parseInt(tahun) || 2027) - 1;
    const bulan = document.getElementById('select-bulan')?.value || 'Agustus';
    const bulanTxt = String(bulan).toUpperCase();
    const kepalaDesa = document.getElementById('kepala-desa-input')?.value || 'SUMAILA DAMANG';
    const ketuaTim = document.getElementById('ketua-tim-input')?.value || 'Abdul Azis, S. Pd';
    const tanggalInput = document.getElementById('tanggal-input')?.value || '2026-08-02';

    let tanggalFormatted = '2 Agustus 2026';
    try {
        const d = new Date(tanggalInput + 'T00:00:00');
        tanggalFormatted = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {}

    const printWindow = window.open('', '_blank', 'width=1200,height=800');

    const printArea = document.getElementById('laporan-print-area');
    let mainContent = '';
    if (printArea) {
        const clone = printArea.cloneNode(true);
        // Ubah semua input/select menjadi teks biasa agar bisa wrap saat dicetak
        clone.querySelectorAll('input').forEach(inp => {
            const div = document.createElement('div');
            div.className = inp.className;
            div.textContent = inp.value || '';
            const parent = inp.parentNode;
            const cls = inp.className || '';
            if (cls.includes('text-right')) div.style.textAlign = 'right';
            if (cls.includes('text-center')) div.style.textAlign = 'center';
            parent.replaceChild(div, inp);
        });
        // Lebar kolom eksplisit (table-layout: fixed diambil dari <colgroup>)
        const tbl = clone.querySelector('table');
        if (tbl && !tbl.querySelector('colgroup')) {
            const widths = [3, 16, 14, 11, 6, 8, 4, 3, 3, 3, 4, 7, 3, 7, 7, 2];
            const colgroup = document.createElement('colgroup');
            widths.forEach(w => {
                const col = document.createElement('col');
                col.style.width = w + '%';
                colgroup.appendChild(col);
            });
            tbl.insertBefore(colgroup, tbl.firstChild);
        }
        const oldFooter = clone.querySelector('.mt-8.flex') || clone.querySelector('.mt-12.flex');
        if (oldFooter) oldFooter.remove();
        mainContent = clone.innerHTML;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Laporan Perkembangan Pembangunan - ${bulanTxt} ${tahunTarik}</title>
            <style>
                @page { size: landscape; margin: 6mm; }
                body { font-family: 'Times New Roman', serif; font-size: 9.5px; padding: 8px; color: black; }
                .no-print { display: none !important; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 8.5px; table-layout: fixed; }
                th, td {
                    border: 1px solid #000; padding: 3px 4px;
                    word-wrap: break-word; word-break: break-word;
                    overflow-wrap: break-word; overflow: visible;
                    white-space: normal; vertical-align: top;
                }
                th { background-color: #f1f5f9; text-align: center; font-weight: bold; }
                input { border: none; background: transparent; width: 100%; font-size: 8.5px; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                .uppercase { text-transform: uppercase; }

                .ttd-wrapper {
                    margin-top: 35px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    font-size: 10.5px;
                }
                .ttd-left, .ttd-right { width: 45%; }
                .ttd-jabatan { font-weight: bold; margin-bottom: 45px; }
                .ttd-nama { font-weight: bold; margin-top: 5px; }
                .ttd-garis { border-bottom: 1.5px solid #000; width: 200px; margin-top: 5px; }
            </style>
        </head>
        <body>
            ${mainContent}
            
            <div class="ttd-wrapper">
                <div class="ttd-left">
                    <p>Mengetahui,</p>
                    <p class="ttd-jabatan">Kepala Desa Batetangnga</p>
                    <div class="ttd-garis"></div>
                    <p class="ttd-nama">${kepalaDesa}</p>
                </div>
                <div class="ttd-right" style="text-align: right;">
                    <p>Batetangnga, ${tanggalFormatted}</p>
                    <p>Disusun Oleh,</p>
                    <p class="ttd-jabatan">Ketua TPK / Tim Pelaksana Kegiatan</p>
                    <div class="ttd-garis" style="margin-left: auto;"></div>
                    <p class="ttd-nama">${ketuaTim}</p>
                </div>
            </div>

            <script>
                setTimeout(() => {
                    window.print();
                    window.close();
                }, 500);
            </script>
        </body>
        </html>
    `);

    printWindow.document.close();
}

