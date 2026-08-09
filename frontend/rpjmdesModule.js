/**
 * RPJMDesa & RAB Supabase Data Module (Browser Web Client)
 * Native ES6 JavaScript Client for public.rpjmdes_standar
 * 
 * Primary Key Lookup: kode_unik
 */

window.RPJMDesModule = (function () {

    /**
     * 1. Format & Default Payload Constructor (100% Field Mapping)
     */
    function buildPayload(inputData = {}) {
        const volumeRab = parseFloat(inputData.volume_rab) || 0;
        const hargaSatuanRab = parseFloat(inputData.harga_satuan_rab) || 0;
        const totalRab = volumeRab * hargaSatuanRab || parseFloat(inputData.total_rab) || 0;

        const manfaatL = parseInt(inputData.manfaat_l, 10) || 0;
        const manfaatP = parseInt(inputData.manfaat_p, 10) || 0;
        const manfaatRtm = parseInt(inputData.manfaat_rtm, 10) || 0;
        const totalManfaat = manfaatL + manfaatP + manfaatRtm;

        const dirasakan = parseInt(inputData.dirasakan, 10) || 0;
        const parah = parseInt(inputData.parah, 10) || 0;
        const hambat = parseInt(inputData.hambat, 10) || 0;
        const sering = parseInt(inputData.sering, 10) || 0;
        const potensiSkor = parseInt(inputData.potensi_skor, 10) || 0;
        const jumlahNilaiTotal = dirasakan + parah + hambat + sering + potensiSkor;

        let uraianPeringkat = inputData.uraian_peringkat || '-';
        if (jumlahNilaiTotal >= 401) uraianPeringkat = 'I';
        else if (jumlahNilaiTotal >= 301) uraianPeringkat = 'II';
        else if (jumlahNilaiTotal >= 201) uraianPeringkat = 'III';
        else if (jumlahNilaiTotal >= 101) uraianPeringkat = 'IV';
        else if (jumlahNilaiTotal > 0) uraianPeringkat = 'V';

        const visiMisi = parseInt(inputData.visi_misi, 10) || 0;
        const pokokBpd = parseInt(inputData.pokok_bpd, 10) || 0;
        const programMasyarakat = parseInt(inputData.program_masyarakat, 10) || 0;
        const prioritasSdgsSkor = parseInt(inputData.prioritas_sdgs_skor, 10) || 0;
        const totalKesesuaian = visiMisi + pokokBpd + programMasyarakat + prioritasSdgsSkor;

        let ranking = inputData.ranking || '-';
        if (totalKesesuaian >= 301) ranking = 'I';
        else if (totalKesesuaian >= 201) ranking = 'II';
        else if (totalKesesuaian >= 101) ranking = 'III';
        else if (totalKesesuaian > 0) ranking = 'IV';

        const kodeUnik = (inputData.kode_unik || inputData.kode_unik_full || '').trim();

        return {
            // 1. Identitas & Kode
            kode_bidang: inputData.kode_bidang || '',
            kode_sub: inputData.kode_sub || '',
            kode_kegiatan: inputData.kode_kegiatan || '',
            kode_unik_full: inputData.kode_unik_full || kodeUnik,
            kode_unik: kodeUnik,
            kode_unik_h: inputData.kode_unik_h || kodeUnik,
            no_urut: inputData.no_urut !== undefined ? inputData.no_urut : null,

            // 2. Kegiatan & Lokasi
            bidang: inputData.bidang || 'Bidang Penyelenggaraan Pemerintahan Desa',
            jenis_bidang: inputData.jenis_bidang || '-',
            jenis_kegiatan: inputData.jenis_kegiatan || '-',
            nama_kegiatan: inputData.nama_kegiatan || '-',
            sifat_kegiatan: inputData.sifat_kegiatan || 'Rutin',
            lokasi_kegiatan: inputData.lokasi_kegiatan || '-',
            usulan_berdasarkan: inputData.usulan_berdasarkan || '-',
            nama_pengusul: inputData.nama_pengusul || '-',
            data_existing: inputData.data_existing || '-',
            sdgs: inputData.sdgs || '-',

            // 3. Ekstensi RAB & Keuangan
            uraian_rab: inputData.uraian_rab || inputData.nama_kegiatan || '-',
            volume_rab: volumeRab,
            satuan_rab: inputData.satuan_rab || 'Paket',
            harga_satuan_rab: hargaSatuanRab,
            total_rab: totalRab, // otomatis volume_rab * harga_satuan_rab
            volume_kegiatan: inputData.volume_kegiatan || `${volumeRab} ${inputData.satuan_rab || 'Paket'}`,
            pagu_rpjm: parseFloat(inputData.pagu_rpjm) || totalRab,
            anggaran_perubahan: parseFloat(inputData.anggaran_perubahan) || 0,
            sumber_dana: inputData.sumber_dana || 'DDS',
            pola_pelaksanaan: inputData.pola_pelaksanaan || 'Swakelola',

            // 4. Penerima Manfaat
            manfaat_l: manfaatL,
            manfaat_p: manfaatP,
            manfaat_rtm: manfaatRtm,
            total_manfaat: totalManfaat,
            penerima_manfaat_bg: parseInt(inputData.penerima_manfaat_bg, 10) || totalManfaat,

            // 5. Target Tahun (2023 - 2030)
            target_2023: inputData.target_2023 || '-',
            target_2024: inputData.target_2024 || '-',
            target_2025: inputData.target_2025 || '-',
            target_2026: inputData.target_2026 || '-',
            target_2027: inputData.target_2027 || '-',
            target_2028: inputData.target_2028 || '-',
            target_2029: inputData.target_2029 || '-',
            target_2030: inputData.target_2030 || '-',
            waktu_pelaksanaan: inputData.waktu_pelaksanaan || '12 Bulan',

            // 6. Masalah & Potensi
            masalah: inputData.masalah || '-',
            penyebab: inputData.penyebab || '-',
            potensi: inputData.potensi || '-',
            alternatif_pemecahan: inputData.alternatif_pemecahan || '-',
            tindakan_masalah: inputData.tindakan_masalah || '-',
            tindakan_layak: inputData.tindakan_layak || '-',

            // 7. Skoring & Prioritas
            dirasakan: dirasakan,
            parah: parah,
            hambat: hambat,
            sering: sering,
            potensi_skor: potensiSkor,
            jumlah_nilai_total: jumlahNilaiTotal,
            uraian_peringkat: uraianPeringkat,

            // 8. Kesesuaian & Visi Misi
            visi_misi: visiMisi,
            pokok_bpd: pokokBpd,
            program_masyarakat: programMasyarakat,
            prioritas_sdgs_skor: prioritasSdgsSkor,
            total_kesesuaian: totalKesesuaian,

            // 9. Kontrol Sistem
            skala_prioritas: inputData.skala_prioritas || 'Ya',
            urutan_prioritas: inputData.urutan_prioritas || '1',
            ranking: ranking,
            status_sembunyi: inputData.status_sembunyi || '',
            updated_at: new Date().toISOString()
        };
    }

    /**
     * GET Data By kode_unik
     */
    async function getByKodeUnik(supabaseClient, kodeUnik) {
        try {
            if (!kodeUnik || typeof kodeUnik !== 'string') {
                return { success: false, data: null, error: 'kode_unik wajib diisi!' };
            }

            const { data, error } = await supabaseClient
                .from('rpjmdes_standar')
                .select('*')
                .eq('kode_unik', kodeUnik.trim())
                .maybeSingle();

            if (error) throw error;

            return { success: true, data: data || null, error: null };
        } catch (err) {
            console.error('❌ Error getByKodeUnik:', err.message);
            return { success: false, data: null, error: err.message };
        }
    }

    /**
     * UPSERT Data By kode_unik (Insert / Update otomatis)
     */
    async function upsertByKodeUnik(supabaseClient, inputData) {
        try {
            const kodeUnik = (inputData.kode_unik || inputData.kode_unik_full || '').trim();
            if (!kodeUnik) {
                return { success: false, data: null, error: 'Field kode_unik wajib diisi!' };
            }

            const payload = buildPayload(inputData);

            const { data, error } = await supabaseClient
                .from('rpjmdes_standar')
                .upsert([payload], { onConflict: 'kode_unik' })
                .select();

            if (error) throw error;

            const resData = Array.isArray(data) && data.length > 0 ? data[0] : data;
            return { success: true, data: resData, error: null };
        } catch (err) {
            console.error('❌ Error upsertByKodeUnik:', err.message);
            return { success: false, data: null, error: err.message };
        }
    }

    /**
     * INSERT Data
     */
    async function insertRPJMDes(supabaseClient, inputData) {
        try {
            const payload = buildPayload(inputData);
            payload.created_at = new Date().toISOString();

            const { data, error } = await supabaseClient
                .from('rpjmdes_standar')
                .insert([payload])
                .select();

            if (error) throw error;

            const resData = Array.isArray(data) && data.length > 0 ? data[0] : data;
            return { success: true, data: resData, error: null };
        } catch (err) {
            return { success: false, data: null, error: err.message };
        }
    }

    /**
     * UPDATE Data By kode_unik
     */
    async function updateByKodeUnik(supabaseClient, kodeUnik, updateFields) {
        try {
            if (!kodeUnik) return { success: false, data: null, error: 'kode_unik wajib diisi!' };

            if (updateFields.volume_rab !== undefined || updateFields.harga_satuan_rab !== undefined) {
                const vol = parseFloat(updateFields.volume_rab) || 0;
                const hrg = parseFloat(updateFields.harga_satuan_rab) || 0;
                updateFields.total_rab = vol * hrg;
            }

            updateFields.updated_at = new Date().toISOString();

            const { data, error } = await supabaseClient
                .from('rpjmdes_standar')
                .update(updateFields)
                .eq('kode_unik', kodeUnik.trim())
                .select();

            if (error) throw error;

            const resData = Array.isArray(data) && data.length > 0 ? data[0] : data;
            return { success: true, data: resData, error: null };
        } catch (err) {
            return { success: false, data: null, error: err.message };
        }
    }

    function getCodeHierarchy(item) {
        if (!item) return { kBid: '', kSub: '', kKeg: '', kUnik: '' };
        const fullCode = String(item.kode_unik_full || item.kode_unik || item.kode_klasifikasi || item.kode || '').trim();
        const parts = fullCode.split('.').filter(p => p.length > 0);

        const kBid = String(
            item.kode_bidang || 
            (parts[0] ? parts[0] + '.' : '')
        ).trim();

        const kSub = String(
            item.kode_sub || item.kode_sub_bidang || item.kode_jenis_bidang || 
            (parts[0] && parts[1] ? parts[0] + '.' + parts[1] + '.' : '')
        ).trim();

        const kKeg = String(
            item.kode_kegiatan || 
            (parts[0] && parts[1] && parts[2] ? parts[0] + '.' + parts[1] + '.' + parts[2] + '.' : '')
        ).trim();

        const kUnik = fullCode;

        return { kBid, kSub, kKeg, kUnik };
    }

    function sortHierarchical(dataArray) {
        if (!Array.isArray(dataArray)) return dataArray;
        return dataArray.sort((a, b) => {
            const hA = getCodeHierarchy(a);
            const hB = getCodeHierarchy(b);

            if (hA.kBid !== hB.kBid && hA.kBid && hB.kBid) {
                return hA.kBid.localeCompare(hB.kBid, undefined, { numeric: true, sensitivity: 'base' });
            }
            if (hA.kSub !== hB.kSub && hA.kSub && hB.kSub) {
                return hA.kSub.localeCompare(hB.kSub, undefined, { numeric: true, sensitivity: 'base' });
            }
            if (hA.kKeg !== hB.kKeg && hA.kKeg && hB.kKeg) {
                return hA.kKeg.localeCompare(hB.kKeg, undefined, { numeric: true, sensitivity: 'base' });
            }
            return hA.kUnik.localeCompare(hB.kUnik, undefined, { numeric: true, sensitivity: 'base' });
        });
    }

    return {
        buildPayload,
        getCodeHierarchy,
        sortHierarchical,
        getByKodeUnik,
        upsertByKodeUnik,
        insertRPJMDes,
        updateByKodeUnik
    };
})();
