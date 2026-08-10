// ==========================================
// FILE: frontend/pagu-indikatif.js
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Event Listener Sinkronisasi Tanggal & Tim Penyusun
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
});

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
        elNama.textContent = nama ? `( ${nama} )` : '( ABDUL AZIS, S. Pd )';
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
        let jBidang = (row.rpjm_data && row.rpjm_data.jenis_bidang) || row.jenis_bidang || row.sub_bidang || row.sub_group_nama || row.sub_kegiatan || row.jenis_kegiatan || '';
        if (!jBidang || /^\d[\d.]*$/.test(jBidang.toString().trim())) {
            jBidang = 'Penyelenggaran Belanja Siltap, Tunjangan dan Operasional Pemerintahan Desa';
        }
        jBidang = jBidang.toString().trim();
        if (!groupedData[targetBidangKey][jBidang]) groupedData[targetBidangKey][jBidang] = {};

        // C. Level 3: Sub Kegiatan / Jenis Kegiatan
        let jKegiatan = (row.rpjm_data && row.rpjm_data.jenis_kegiatan) || row.jenis_kegiatan || row.group_nama || '';
        if (!jKegiatan || /^\d[\d.]*$/.test(jKegiatan.toString().trim())) {
            jKegiatan = (row.rpjm_data && row.rpjm_data.nama_kegiatan && !/^\d[\d.]*$/.test(row.rpjm_data.nama_kegiatan)) 
                ? row.rpjm_data.nama_kegiatan 
                : (row.nama_kegiatan || row.uraian || 'Kegiatan Desa');
        }
        jKegiatan = jKegiatan.toString().trim();
        if (!groupedData[targetBidangKey][jBidang][jKegiatan]) groupedData[targetBidangKey][jBidang][jKegiatan] = {};

        // D. Level 4: Uraian / Nama Kegiatan
        let nKegiatan = row.nama_kegiatan || row.uraian || jKegiatan || 'Kegiatan Desa';
        if (row.rpjm_data && typeof row.rpjm_data === 'object' && row.rpjm_data.nama_kegiatan && !/^\d[\d.]*$/.test(row.rpjm_data.nama_kegiatan)) {
            nKegiatan = row.rpjm_data.nama_kegiatan.toString().trim();
        }
        nKegiatan = nKegiatan.toString().trim();

        let itemsArr = (row.items && Array.isArray(row.items) && row.items.length > 0) ? row.items : [];
        if (itemsArr.length === 0) {
            const budgetVal = Number(row.prakiraan_biaya || row.jumlah_anggaran || row.anggaran_rab || row.pagu_rpjm || 0);
            const sumberVal = row.sumber_pembiayaan || row.sumber_dana_rab || row.sumber_dana || 'DDS';
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
            const jml = Number(item.jumlah || row.jumlah_anggaran || row.prakiraan_biaya || row.pagu_rab || 0);
            if (!jml || jml <= 0) return;
            const s = (item.sumber || row.sumber_pembiayaan || row.sumber_dana_rab || row.sumber_dana || '').toUpperCase();

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

    // Selalu render 5 Bidang (I-V) dengan urutan tetap, meskipun datanya kosong.
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

        // Baris Bidang (Romawi) SELALU tampil di bagian ATAS, walau data kosong.
        html += headerRow(bd.romawi, bd.label);
        noUrut = 0; // nomor "No" direset ke 1 setiap berganti Bidang

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
            <div class="text-center font-bold text-base mb-6 tracking-wide uppercase">
                PAGU INDIKATIF DESA
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
                    <p id="footer-pagu-tim" class="font-bold underline uppercase">( .................................... )</p>
                </div>
            </div>
        </div>
    `;

    updateFooterPaguIndikatif();
}

if (typeof window !== 'undefined') {
    window.renderTabelPaguIndikatif = renderTabelPaguIndikatif;
    window.updateFooterPaguIndikatif = updateFooterPaguIndikatif;
    window.injectPaguIndikatifToDOM = injectPaguIndikatifToDOM;
}
