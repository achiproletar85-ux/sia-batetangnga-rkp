// ============================================
// STUNTING MODULE JS (5 BIDANG RKPDes)
// ============================================

const BIDANG_STUNTING = [
    { id: 1, kode: '1', name: "Bidang 1: Penyelenggaraan Pemerintahan Desa" },
    { id: 2, kode: '2', name: "Bidang 2: Pelaksanaan Pembangunan Desa" },
    { id: 3, kode: '3', name: "Bidang 3: Pembinaan Kemasyarakatan" },
    { id: 4, kode: '4', name: "Bidang 4: Pemberdayaan Masyarakat" },
    { id: 5, kode: '5', name: "Bidang 5: Penanggulangan Bencana, Keadaan Darurat Dan Mendesak Desa" }
];

let stuntingList = [];
let rawRabList = [];

document.addEventListener('DOMContentLoaded', () => {
    const storedYear = localStorage.getItem('ACTIVE_TAHUN_ANGGARAN') || '2027';
    const selectYearEl = document.getElementById('select-tahun');
    if (selectYearEl) selectYearEl.value = storedYear;

    window.addEventListener('tahunChanged', (e) => {
        if (e && e.detail && e.detail.tahun) {
            if (selectYearEl) selectYearEl.value = e.detail.tahun;
            loadStuntingData();
        }
    });

    loadStuntingData();
    updateTTD();
});

// Helper Format Rupiah
function formatRupiah(number) {
    if (isNaN(number) || number === null || number === undefined) return 'Rp 0';
    return 'Rp ' + parseInt(number).toLocaleString('id-ID');
}

function parseNumber(str) {
    if (!str) return 0;
    if (typeof str === 'number') return str;
    return parseInt(str.toString().replace(/[^0-9]/g, '')) || 0;
}

// 1. Load Data Stunting dari Database
function loadStuntingData() {
    const tahun = document.getElementById('select-tahun')?.value || '2027';
    document.getElementById('judul-tahun').innerText = tahun;
    
    console.log(`📥 Loading stunting data for tahun ${tahun}...`);

    fetch(`/api/stunting?tahun=${tahun}`)
        .then(res => res.json())
        .then(data => {
            if (data.success && Array.isArray(data.data)) {
                stuntingList = data.data;
            } else {
                stuntingList = [];
            }
            renderStuntingTable();
        })
        .catch(err => {
            console.error('❌ Error loading stunting data:', err);
            stuntingList = [];
            renderStuntingTable();
        });
}

// 2. Render Tabel Stunting 2 Bidang
function renderStuntingTable() {
    const tbody = document.getElementById('stunting-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    let globalNo = 1;

    BIDANG_STUNTING.forEach(bidang => {
        // Filter item berdasarkan bidang
        const itemsInBidang = stuntingList.filter(item => parseInt(item.bidang) === bidang.id);

        // Header Row Bidang
        const trBidang = document.createElement('tr');
        trBidang.className = "bg-rose-50 font-extrabold text-slate-800 border-y-2 border-rose-300";
        trBidang.innerHTML = `
            <td colspan="10" class="p-2 text-left uppercase text-rose-900 tracking-wider">
                <i class="fas fa-[#fa5252] fa-folder-open text-rose-600 mr-2"></i> ${bidang.name}
            </td>
            <td class="p-2 text-center no-print">
                <button onclick="addRow(${bidang.id})" class="bg-rose-600 hover:bg-rose-700 text-white font-bold px-2 py-1 text-[11px] rounded shadow transition flex items-center gap-1 mx-auto">
                    <i class="fas fa-plus"></i> Tambah
                </button>
            </td>
        `;
        tbody.appendChild(trBidang);

        if (itemsInBidang.length === 0) {
            const trEmpty = document.createElement('tr');
            trEmpty.className = "text-center text-slate-400 italic bg-white";
            trEmpty.innerHTML = `
                <td colspan="11" class="p-3 text-xs">
                    Belum ada kegiatan pencegahan stunting di ${bidang.name}. Klik <b>"Pilih dari RKPDes"</b> di atas atau <b>"+ Tambah"</b>.
                </td>
            `;
            tbody.appendChild(trEmpty);
        } else {
            itemsInBidang.forEach((item, idx) => {
                const tr = document.createElement('tr');
                tr.className = "hover:bg-rose-50/40 transition bg-white border-b border-slate-200 text-xs";
                if (item.id) tr.setAttribute('data-id', item.id);

                const jenisKeg = String(item.jenis_kegiatan || '').replace(/"/g, '&quot;');
                const lokasi = String(item.lokasi || '-').replace(/"/g, '&quot;');
                const volume = String(item.volume_satuan || item.volume || '-').replace(/"/g, '&quot;');
                const penerima = String(item.penerima_manfaat || '-').replace(/"/g, '&quot;');
                const waktu = String(item.waktu_pelaksanaan || '-').replace(/"/g, '&quot;');
                const sumber = String(item.sumber_biaya || 'DDS').replace(/"/g, '&quot;');
                const pola = String(item.pola_pelaksanaan || 'Swakelola');
                const biaya = parseInt(item.biaya || 0);

                tr.innerHTML = `
                    <td class="p-1.5 text-center font-bold text-slate-600 border border-slate-300">${globalNo++}</td>
                    <td class="p-1.5 text-center text-slate-600 font-semibold border border-slate-300">${bidang.name.split(':')[1]?.trim() || bidang.name}</td>
                    <td class="p-1 border border-slate-300">
                        <textarea onchange="updateFieldData(${bidang.id}, ${idx}, 'jenis_kegiatan', this.value)" class="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-rose-500 rounded outline-none resize-y font-medium text-slate-800 min-h-[34px]" placeholder="Nama / Jenis Kegiatan Stunting...">${jenisKeg}</textarea>
                    </td>
                    <td class="p-1 border border-slate-300">
                        <input type="text" value="${lokasi}" onchange="updateFieldData(${bidang.id}, ${idx}, 'lokasi', this.value)" class="w-full px-1 py-0.5 text-xs border border-transparent hover:border-slate-300 focus:border-rose-500 rounded outline-none text-center" placeholder="Lokasi...">
                    </td>
                    <td class="p-1 border border-slate-300">
                        <input type="text" value="${volume}" onchange="updateFieldData(${bidang.id}, ${idx}, 'volume_satuan', this.value)" class="w-full px-1 py-0.5 text-xs border border-transparent hover:border-slate-300 focus:border-rose-500 rounded outline-none text-center" placeholder="Volume & Satuan...">
                    </td>
                    <td class="p-1 border border-slate-300">
                        <input type="text" value="${penerima}" onchange="updateFieldData(${bidang.id}, ${idx}, 'penerima_manfaat', this.value)" class="w-full px-1 py-0.5 text-xs border border-transparent hover:border-slate-300 focus:border-rose-500 rounded outline-none text-center" placeholder="Anak / Ibu Hamil...">
                    </td>
                    <td class="p-1 border border-slate-300">
                        <input type="text" value="${waktu}" onchange="updateFieldData(${bidang.id}, ${idx}, 'waktu_pelaksanaan', this.value)" class="w-full px-1 py-0.5 text-xs border border-transparent hover:border-slate-300 focus:border-rose-500 rounded outline-none text-center" placeholder="Waktu Pelaksanaan...">
                    </td>
                    <td class="p-1 border border-slate-300">
                        <input type="text" value="${formatRupiah(biaya)}" onfocus="this.value = parseNumber(this.value)" onblur="this.value = formatRupiah(this.value)" onchange="updateFieldData(${bidang.id}, ${idx}, 'biaya', this.value)" class="w-full px-1 py-0.5 text-xs border border-transparent hover:border-slate-300 focus:border-rose-500 rounded outline-none text-right font-bold text-slate-800" placeholder="Rp 0">
                    </td>
                    <td class="p-1 border border-slate-300">
                        <input type="text" value="${sumber}" onchange="updateFieldData(${bidang.id}, ${idx}, 'sumber_biaya', this.value)" class="w-full px-1 py-0.5 text-xs border border-transparent hover:border-slate-300 focus:border-rose-500 rounded outline-none text-center font-semibold text-rose-800" placeholder="Sumber Biaya...">
                    </td>
                    <td class="p-1 border border-slate-300">
                        <select onchange="updateFieldData(${bidang.id}, ${idx}, 'pola_pelaksanaan', this.value)" class="w-full px-1 py-0.5 text-xs border border-transparent hover:border-slate-300 focus:border-rose-500 rounded outline-none text-center bg-transparent font-medium">
                            <option value="Swakelola" ${pola === 'Swakelola' ? 'selected' : ''}>Swakelola</option>
                            <option value="Kerjasama Antar Desa" ${pola === 'Kerjasama Antar Desa' ? 'selected' : ''}>Kerjasama Antar Desa</option>
                            <option value="Kerjasama Pihak Ketiga" ${pola === 'Kerjasama Pihak Ketiga' ? 'selected' : ''}>Kerjasama Pihak Ketiga</option>
                        </select>
                    </td>
                    <td class="p-1 text-center border border-slate-300 no-print">
                        <div class="flex justify-center items-center gap-1">
                            ${item.id ? `<button onclick="editRow('${item.id}')" class="text-indigo-600 hover:text-indigo-800 p-1 font-bold text-xs" title="Edit Baris Ini"><i class="fas fa-edit"></i></button>` : ''}
                            <button onclick="deleteRow(${bidang.id}, ${idx})" class="text-rose-600 hover:text-rose-800 p-1 font-bold text-xs" title="Hapus Baris">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    });
}

// 3. Modal Checklist RAB
function bukaModalRAB() {
    const tahun = document.getElementById('select-tahun')?.value || '2027';
    console.log(`📥 Fetching RAB checklist for stunting tahun ${tahun}...`);

    fetch(`/api/stunting/tarik-rab?tahun=${tahun}`)
        .then(res => res.json())
        .then(data => {
            if (data.success && Array.isArray(data.data) && data.data.length > 0) {
                rawRabList = data.data;
                renderModalRABList();
                document.getElementById('modal-rab').classList.remove('hidden');
            } else {
                alert(`📭 Tidak ada data RKPDes untuk tahun ${tahun}`);
            }
        })
        .catch(err => {
            console.error('❌ Error fetching RKPDes:', err);
            alert('❌ Gagal mengambil data RKPDes');
        });
}

function tutupModalRAB() {
    document.getElementById('modal-rab').classList.add('hidden');
}

function renderModalRABList() {
    const tbody = document.getElementById('modal-rab-list');
    const searchVal = (document.getElementById('modal-search')?.value || '').toLowerCase().trim();
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!rawRabList || rawRabList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="p-8 text-center text-slate-400 font-medium">
                    📭 Tidak ada data RKPDes untuk tahun ini
                </td>
            </tr>
        `;
        updateSelectedCount();
        return;
    }

    let visibleCount = 0;
    const keywords = ['stunting', 'posyandu', 'pmt', 'gizi', 'sanitasi', 'air bersih', 'jamban', 'ibu hamil', 'balita', 'kesehatan', 'paud', 'makanan tambahan', 'timbangan'];

    rawRabList.forEach((item, idx) => {
        const namaKeg = String(item.uraian || item.nama_kegiatan || item.jenis_kegiatan || '-').trim();
        const kode = String(item.kode_unik || item.kode || item.kode_unik_full || '-').trim();
        const bidang = String(item.bidang || item.sub_bidang || '-').trim();
        const volume = String(item.volume_satuan || item.volume || '-').trim();
        const biaya = parseInt(item.biaya || item.total_biaya || item.jumlah_anggaran || 0);

        if (searchVal && !namaKeg.toLowerCase().includes(searchVal) && !kode.toLowerCase().includes(searchVal)) {
            return;
        }

        visibleCount++;
        const recKeg = keywords.some(k => namaKeg.toLowerCase().includes(k));
        const stSelected = item.stunting_selected === true || item.stunting_selected === 'Ya' || item.stunting === true || item.stunting === 'Ya';

        const tr = document.createElement('tr');
        tr.className = `hover:bg-slate-50 border-b border-slate-200 text-xs ${recKeg ? 'bg-rose-50/50 font-medium' : ''}`;

        tr.innerHTML = `
            <td class="p-2 text-center border border-slate-200">
                <input type="checkbox" class="rab-item-checkbox rounded text-rose-600 focus:ring-rose-500 cursor-pointer" data-idx="${idx}" ${stSelected ? 'checked' : ''} onchange="updateSelectedCount()">
            </td>
            <td class="p-2 text-center font-mono text-slate-600 border border-slate-200">${kode}</td>
            <td class="p-2 text-slate-600 border border-slate-200">${bidang}</td>
            <td class="p-2 font-semibold text-slate-800 border border-slate-200">
                ${namaKeg}
                ${recKeg ? '<span class="ml-1.5 text-[10px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded">Rekomendasi Stunting</span>' : ''}
                ${stSelected ? '<span class="ml-1.5 text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded">Sudah Dipilih</span>' : ''}
            </td>
            <td class="p-2 text-center text-slate-600 border border-slate-200">${volume}</td>
            <td class="p-2 text-right font-bold text-slate-800 border border-slate-200">${formatRupiah(biaya)}</td>
        `;
        tbody.appendChild(tr);
    });

    if (visibleCount === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="p-8 text-center text-slate-400 font-medium">
                    🔍 Tidak ada kegiatan RKPDes yang sesuai pencarian "${searchVal}"
                </td>
            </tr>
        `;
    }

    updateSelectedCount();
}

function filterModalRAB() {
    renderModalRABList();
}

function toggleCheckAllRAB(el) {
    const checkboxes = document.querySelectorAll('.rab-item-checkbox');
    checkboxes.forEach(cb => cb.checked = el.checked);
    updateSelectedCount();
}

function updateSelectedCount() {
    const checked = document.querySelectorAll('.rab-item-checkbox:checked');
    const label = document.getElementById('modal-selected-count');
    if (label) {
        label.innerText = `${checked.length} kegiatan dipilih`;
    }
}

// Tarik Kegiatan Terpilih dari Modal (tandai di tabel rkpdes)
async function tarikRABTerpilih() {
    const checkboxes = document.querySelectorAll('.rab-item-checkbox:checked');
    if (checkboxes.length === 0) {
        alert('⚠️ Pilih minimal 1 kegiatan dari RKP');
        return;
    }

    const ids = [];
    checkboxes.forEach(cb => {
        const idx = parseInt(cb.getAttribute('data-idx'));
        const rabItem = rawRabList[idx];
        if (rabItem) {
            const id = rabItem.rkpdes_id || rabItem.id;
            if (id) ids.push(id);
        }
    });

    if (ids.length === 0) {
        alert('⚠️ Kegiatan terpilih tidak memiliki ID valid di RKP.');
        return;
    }

    try {
        const res = await fetch('/api/stunting/tarik-rab', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
        const json = await res.json();
        if (json.success) {
            tutupModalRAB();
            alert(`✅ ${json.message}`);
            loadStuntingData();
        } else {
            alert('❌ Gagal: ' + (json.error || 'Terjadi kesalahan'));
        }
    } catch (err) {
        console.error('❌ Error tarikRABTerpilih:', err);
        alert('❌ Gagal menghubungi server: ' + err.message);
    }
}

// 4. Update Field Realtime
function updateFieldData(bidangNum, idxInBidang, field, value) {
    const itemsInBidang = stuntingList.filter(item => parseInt(item.bidang) === bidangNum);
    const targetItem = itemsInBidang[idxInBidang];

    if (targetItem) {
        const globalIdx = stuntingList.indexOf(targetItem);
        if (globalIdx > -1) {
            if (field === 'biaya') {
                stuntingList[globalIdx][field] = parseNumber(value);
            } else {
                stuntingList[globalIdx][field] = value;
            }
        }
    }
}

// 5. Tambah & Hapus Baris
function addRow(bidangNum) {
    const tahun = parseInt(document.getElementById('select-tahun')?.value || '2027');
    stuntingList.push({
        tahun: tahun,
        bidang: bidangNum,
        jenis_kegiatan: '',
        lokasi: 'Desa Batetangnga',
        volume_satuan: '1 Paket',
        penerima_manfaat: 'Balita & Ibu Hamil',
        waktu_pelaksanaan: '12 Bulan',
        biaya: 0,
        sumber_biaya: 'DDS',
        pola_pelaksanaan: 'Swakelola'
    });
    renderStuntingTable();
}

async function deleteRow(bidangNum, idxInBidang) {
    const itemsInBidang = stuntingList.filter(item => parseInt(item.bidang) === bidangNum);
    const targetItem = itemsInBidang[idxInBidang];

    if (!targetItem) return;
    if (!confirm(`Hapus kegiatan "${targetItem.jenis_kegiatan || 'Baris ini'}"?`)) return;

    const id = targetItem.id;
    const globalIdx = stuntingList.indexOf(targetItem);
    if (globalIdx > -1) {
        stuntingList.splice(globalIdx, 1);
    }

    if (id) {
        try {
            const res = await fetch(`/api/stunting?id=${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                console.log("✅ Data deleted from DB:", id);
            }
        } catch (err) {
            console.error("❌ Error deleteRow:", err);
        }
    }
    renderStuntingTable();
}

// 5b. Edit & Save Manual Per Baris
function editRow(id) {
    const item = stuntingList.find(i => String(i.id) === String(id));
    if (!item) return;

    const tr = document.querySelector(`tr[data-id="${id}"]`);
    if (!tr) return;

    const bidangId = parseInt(item.bidang) || 1;
    const biaya = parseInt(item.biaya || 0);
    const pola = String(item.pola_pelaksanaan || 'Swakelola');

    tr.innerHTML = `
        <td class="p-1.5 text-center font-bold text-slate-600 border border-slate-300">#</td>
        <td class="p-1 border border-slate-300">
            <select class="w-full p-1 text-xs border border-rose-400 rounded outline-none font-semibold">
                ${BIDANG_STUNTING.map(b => `<option value="${b.id}" ${bidangId === b.id ? 'selected' : ''}>${b.name}</option>`).join('')}
            </select>
        </td>
        <td class="p-1 border border-slate-300">
            <input type="text" value="${String(item.jenis_kegiatan || '').replace(/"/g, '&quot;')}" class="w-full px-1.5 py-1 text-xs border border-rose-400 rounded outline-none font-medium" placeholder="Jenis Kegiatan...">
        </td>
        <td class="p-1 border border-slate-300">
            <input type="text" value="${String(item.lokasi || '-').replace(/"/g, '&quot;')}" class="w-full px-1 py-1 text-xs border border-rose-400 rounded outline-none text-center" placeholder="Lokasi...">
        </td>
        <td class="p-1 border border-slate-300">
            <input type="text" value="${String(item.volume_satuan || item.volume || '-').replace(/"/g, '&quot;')}" class="w-full px-1 py-1 text-xs border border-rose-400 rounded outline-none text-center" placeholder="Volume...">
        </td>
        <td class="p-1 border border-slate-300">
            <input type="text" value="${String(item.penerima_manfaat || '-').replace(/"/g, '&quot;')}" class="w-full px-1 py-1 text-xs border border-rose-400 rounded outline-none text-center" placeholder="Penerima Manfaat...">
        </td>
        <td class="p-1 border border-slate-300">
            <input type="text" value="${String(item.waktu_pelaksanaan || '-').replace(/"/g, '&quot;')}" class="w-full px-1 py-1 text-xs border border-rose-400 rounded outline-none text-center" placeholder="Waktu...">
        </td>
        <td class="p-1 border border-slate-300">
            <input type="number" value="${biaya}" class="w-full px-1 py-1 text-xs border border-rose-400 rounded outline-none text-right font-bold" placeholder="0">
        </td>
        <td class="p-1 border border-slate-300">
            <input type="text" value="${String(item.sumber_biaya || 'DDS').replace(/"/g, '&quot;')}" class="w-full px-1 py-1 text-xs border border-rose-400 rounded outline-none text-center font-semibold" placeholder="Sumber...">
        </td>
        <td class="p-1 border border-slate-300">
            <select class="w-full px-1 py-1 text-xs border border-rose-400 rounded outline-none text-center font-medium">
                <option value="Swakelola" ${pola === 'Swakelola' ? 'selected' : ''}>Swakelola</option>
                <option value="Kerjasama Antar Desa" ${pola === 'Kerjasama Antar Desa' ? 'selected' : ''}>Kerjasama Antar Desa</option>
                <option value="Kerjasama Pihak Ketiga" ${pola === 'Kerjasama Pihak Ketiga' ? 'selected' : ''}>Kerjasama Pihak Ketiga</option>
            </select>
        </td>
        <td class="p-1 text-center border border-slate-300 no-print">
            <div class="flex justify-center items-center gap-1">
                <button onclick="saveRow('${item.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded shadow text-xs" title="Simpan Edit">
                    <i class="fas fa-save"></i>
                </button>
                <button onclick="cancelEdit('${item.id}')" class="bg-slate-500 hover:bg-slate-600 text-white p-1.5 rounded shadow text-xs" title="Batal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </td>
    `;
}

function cancelEdit(id) {
    renderStuntingTable();
}

function saveRow(id) {
    const tr = document.querySelector(`tr[data-id="${id}"]`);
    if (!tr) return;

    const inputs = tr.querySelectorAll('input, select');
    if (inputs.length < 9) return;

    const updatedData = {
        id: id,
        bidang: parseInt(inputs[0].value) || 1,
        jenis_kegiatan: inputs[1].value,
        lokasi: inputs[2].value,
        volume_satuan: inputs[3].value,
        penerima_manfaat: inputs[4].value,
        waktu_pelaksanaan: inputs[5].value,
        biaya: parseInt(inputs[6].value) || 0,
        sumber_biaya: inputs[7].value,
        pola_pelaksanaan: inputs[8].value
    };

    fetch('/api/stunting', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const index = stuntingList.findIndex(i => String(i.id) === String(id));
            if (index !== -1) {
                stuntingList[index] = { ...stuntingList[index], ...updatedData };
            }
            renderStuntingTable();
            alert('✅ Data berhasil diupdate ke database!');
        } else {
            alert('❌ Gagal update: ' + data.error);
        }
    })
    .catch(err => {
        console.error('❌ Error saveRow:', err);
        alert('❌ Gagal update data');
    });
}

// 6. Simpan Ke Database (Batch Sync 50)
async function saveToDatabase() {
    const tahun = document.getElementById('select-tahun')?.value || '2027';

    if (stuntingList.length === 0) {
        alert('📭 Tidak ada data untuk disimpan.');
        return;
    }

    const validData = stuntingList.filter(item => (item.jenis_kegiatan && item.jenis_kegiatan.trim() !== '') || item.biaya > 0);

    console.log(`💾 Syncing ${validData.length} records to Supabase for tahun ${tahun}...`);

    try {
        const res = await fetch('/api/stunting/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tahun: parseInt(tahun),
                data: validData
            })
        });

        const json = await res.json();
        if (json.success) {
            alert(`✅ ${json.message || 'Berhasil menyimpan data ke Supabase!'}`);
            loadStuntingData();
        } else {
            alert(`❌ Gagal menyimpan: ${json.error}`);
        }
    } catch (err) {
        console.error('❌ Error saveToDatabase:', err);
        alert('❌ Terjadi kesalahan saat menghubungi server');
    }
}

// 7. Dynamic Signature Binding
function updateTTD() {
    const tgl = document.getElementById('tanggal-input')?.value || '2026-08-02';
    const kades = document.getElementById('kepala-desa-input')?.value || 'SUMAILA DAMANG';
    const ketua = document.getElementById('ketua-tim-input')?.value || 'AHMAD';

    if (document.getElementById('kepala-desa-ttd')) document.getElementById('kepala-desa-ttd').innerText = kades.toUpperCase();
    if (document.getElementById('ketua-tim-ttd')) document.getElementById('ketua-tim-ttd').innerText = ketua.toUpperCase();

    if (tgl) {
        const parts = tgl.split('-');
        if (parts.length === 3) {
            const bulanNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            const formattedDate = `${parts[2]} ${bulanNames[parseInt(parts[1]) - 1]} ${parts[0]}`;
            if (document.getElementById('tanggal-ttd')) document.getElementById('tanggal-ttd').innerText = formattedDate;
        }
    }
}

// 8. Cetak PDF / Print Window
function printPDF() {
    const tahun = document.getElementById('select-tahun')?.value || '2027';
    const tgl = document.getElementById('tanggal-input')?.value || '2026-08-02';
    const kades = document.getElementById('kepala-desa-input')?.value || 'SUMAILA DAMANG';
    const ketua = document.getElementById('ketua-tim-input')?.value || 'AHMAD';

    let formattedDate = tgl;
    const parts = tgl.split('-');
    if (parts.length === 3) {
        const bulanNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        formattedDate = `${parts[2]} ${bulanNames[parseInt(parts[1]) - 1]} ${parts[0]}`;
    }

    let rowsHtml = '';
    let globalNo = 1;

    BIDANG_STUNTING.forEach(bidang => {
        const itemsInBidang = stuntingList.filter(item => parseInt(item.bidang) === bidang.id);
        
        rowsHtml += `
            <tr style="background-color: #ffe3e3; font-weight: bold;">
                <td colspan="10" style="border: 1px solid #000; padding: 4px 6px; text-transform: uppercase;">
                    ${bidang.name}
                </td>
            </tr>
        `;

        if (itemsInBidang.length === 0) {
            rowsHtml += `
                <tr>
                    <td colspan="10" style="border: 1px solid #000; padding: 4px 6px; text-align: center; font-style: italic; color: #666;">
                        - Tidak ada kegiatan -
                    </td>
                </tr>
            `;
        } else {
            itemsInBidang.forEach(item => {
                rowsHtml += `
                    <tr>
                        <td style="border: 1px solid #000; padding: 4px 6px; text-align: center;">${globalNo++}</td>
                        <td style="border: 1px solid #000; padding: 4px 6px; text-align: center;">${bidang.name.split(':')[1]?.trim() || bidang.name}</td>
                        <td style="border: 1px solid #000; padding: 4px 6px;">${item.jenis_kegiatan || '-'}</td>
                        <td style="border: 1px solid #000; padding: 4px 6px; text-align: center;">${item.lokasi || '-'}</td>
                        <td style="border: 1px solid #000; padding: 4px 6px; text-align: center;">${item.volume_satuan || '-'}</td>
                        <td style="border: 1px solid #000; padding: 4px 6px; text-align: center;">${item.penerima_manfaat || '-'}</td>
                        <td style="border: 1px solid #000; padding: 4px 6px; text-align: center;">${item.waktu_pelaksanaan || '-'}</td>
                        <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: bold;">${formatRupiah(item.biaya)}</td>
                        <td style="border: 1px solid #000; padding: 4px 6px; text-align: center;">${item.sumber_biaya || 'DDS'}</td>
                        <td style="border: 1px solid #000; padding: 4px 6px; text-align: center;">${item.pola_pelaksanaan || 'Swakelola'}</td>
                    </tr>
                `;
            });
        }
    });

    const printWin = window.open('', '_blank');
    printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>LAPORAN RINCIAN KEGIATAN PENCEGAHAN STUNTING DALAM RKPDESA - TAHUN ${tahun}</title>
            <style>
                @page { size: landscape; margin: 10mm; }
                body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: #000; margin: 0; padding: 10px; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                .uppercase { text-transform: uppercase; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 9.5px; }
                th { border: 1.5px solid #000; background-color: #f1f5f9; padding: 5px 3px; font-weight: bold; text-align: center; }
                td { border: 1px solid #000; padding: 4px 4px; word-wrap: break-word; }
                .ttd-wrapper { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid; }
                .ttd-box { width: 300px; text-align: center; }
                .ttd-jabatan { font-weight: bold; margin-bottom: 55px; }
                .ttd-nama { font-weight: bold; text-decoration: underline; text-transform: uppercase; }
            </style>
        </head>
        <body>
            <div class="text-center">
                <h2 style="margin: 0; font-size: 14px;" class="font-bold uppercase">LAPORAN RINCIAN KEGIATAN PENCEGAHAN STUNTING DALAM RKPDESA</h2>
                <p style="margin: 4px 0;" class="font-bold">DESA BATETANGNGA KECAMATAN BINUANG KABUPATEN POLEWALI MANDAR PROVINSI SULAWESI BARAT</p>
                <p style="margin: 2px 0;" class="font-bold">TAHUN ANGGARAN ${tahun}</p>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 30px;">NO</th>
                        <th style="width: 140px;">BIDANG</th>
                        <th>JENIS KEGIATAN</th>
                        <th style="width: 110px;">LOKASI</th>
                        <th style="width: 90px;">VOLUME &amp; SATUAN</th>
                        <th style="width: 120px;">PENERIMA MANFAAT</th>
                        <th style="width: 100px;">WAKTU PELAKSANAAN</th>
                        <th style="width: 110px;">BIAYA (Rp)</th>
                        <th style="width: 80px;">SUMBER BIAYA</th>
                        <th style="width: 130px;">POLA PELAKSANAAN</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>

            <div class="ttd-wrapper">
                <div class="ttd-box">
                    <p style="margin: 0;">Mengetahui,</p>
                    <p class="ttd-jabatan uppercase">Kepala Desa Batetangnga</p>
                    <p class="ttd-nama">${kades}</p>
                </div>
                <div class="ttd-box">
                    <p style="margin: 0;">Batetangnga, ${formattedDate}</p>
                    <p class="ttd-jabatan uppercase">Ketua Tim Penyusun</p>
                    <p class="ttd-nama">${ketua}</p>
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
