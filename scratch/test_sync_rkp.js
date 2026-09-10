const supabase = require('../backend/config/supabase');

(async () => {
    try {
        console.log("=== TRIGGERING CLEAR AND SYNC FOR 2027 ===");
        
        // 1. Delete data lama rkpdes 2027
        const { error: delErr } = await supabase.from('rkpdes').delete().eq('tahun', 2027);
        if (delErr) throw delErr;
        console.log("Cleared old rkpdes 2027 table rows.");

        // 2. Query RAB 2027
        const { data: rabData, error: rabErr } = await supabase.from('rab').select('*').eq('tahun', 2027);
        if (rabErr) throw rabErr;
        console.log(`Found ${rabData.length} RAB rows for 2027.`);

        // 3. Re-build payload using updated buildRkpPayLoadFromRAB equivalent logic
        let itemCounter = 0;
        const rows = [];
        for (const rab of rabData) {
            itemCounter++;
            const baseKode = String(rab.kode_unik_full || rab.kode_unik || '').trim();
            const items = Array.isArray(rab.items) ? rab.items : [];
            const itemsSum = items.reduce((s, it) => s + (Number(it.jumlah || (it.volume * it.harga_satuan)) || 0), 0);
            const totalAnggaran = Number(rab.jumlah_anggaran || rab.total_biaya || 0) || itemsSum;

            rows.push({
                tahun: 2027,
                kode_unik_full: baseKode || `RAB.${String(itemCounter).padStart(3, '0')}`,
                bidang: rab.bidang || '-',
                jenis_kegiatan: rab.nama_kegiatan || '-',
                lokasi: rab.lokasi || rab.lokasi_kegiatan || 'Desa Batetangnga',
                volume: String(rab.volume || 1),
                satuan: rab.satuan || 'Paket',
                waktu_pelaksanaan: '12 Bulan',
                prakiraan_biaya: totalAnggaran,
                sumber_pembiayaan: rab.sumber_dana || 'DDS',
                pola_pelaksanaan: 'Swakelola',
                status_rab: 'Sudah Dibuat',
                verifikasi_proposal: 'Belum',
                stunting: rab.stunting || 'Tidak'
            });
        }

        const { data: insertedData, error: insErr } = await supabase.from('rkpdes').insert(rows).select();
        if (insErr) throw insErr;

        console.log(`Successfully inserted ${insertedData.length} clean rows into 'rkpdes' table.`);
        let grandTotal = 0;
        insertedData.forEach((r, idx) => {
            grandTotal += Number(r.prakiraan_biaya || 0);
            console.log(`[${idx+1}] Kode: ${r.kode_unik_full} | Kegiatan: ${r.jenis_kegiatan} | Biaya: Rp ${Number(r.prakiraan_biaya).toLocaleString('id-ID')} | Sumber: ${r.sumber_pembiayaan}`);
        });

        console.log(`\nGRAND TOTAL RKPDES (2027): Rp ${grandTotal.toLocaleString('id-ID')}`);

    } catch(e) {
        console.error("Test sync error:", e);
    }
    process.exit(0);
})();
