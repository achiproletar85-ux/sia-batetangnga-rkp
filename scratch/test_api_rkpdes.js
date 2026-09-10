const supabase = require('../backend/config/supabase');

(async () => {
    console.log("=== VERIFYING RKPDes DATA FOR TAHUN 2027 ===");
    const { data: rkpData, error } = await supabase
        .from('rkpdes')
        .select('*')
        .eq('tahun', 2027);

    if (error) {
        console.error("Error:", error);
        process.exit(1);
    }

    console.log(`Retrieved ${rkpData.length} records from 'rkpdes' table.`);
    let grandTotal = 0;
    rkpData.forEach((r, idx) => {
        const cost = Number(r.prakiraan_biaya || 0);
        grandTotal += cost;
        console.log(`[${idx+1}] Kode: ${r.kode_unik_full} | Kegiatan: ${r.jenis_kegiatan} | Biaya: Rp ${cost.toLocaleString('id-ID')} | Sumber: ${r.sumber_pembiayaan}`);
    });

    console.log(`========================================`);
    console.log(`GRAND TOTAL RKPDES: Rp ${grandTotal.toLocaleString('id-ID')}`);

    const { data: rabData } = await supabase.from('rab').select('*').eq('tahun', 2027);
    let grandTotalRab = 0;
    rabData.forEach(r => {
        const items = Array.isArray(r.items) ? r.items : [];
        const itemsSum = items.reduce((s, it) => s + (Number(it.jumlah || (it.volume * it.harga_satuan)) || 0), 0);
        grandTotalRab += Number(r.jumlah_anggaran || r.total_biaya || 0) || itemsSum;
    });
    console.log(`GRAND TOTAL RAB:    Rp ${grandTotalRab.toLocaleString('id-ID')}`);

    if (grandTotal === grandTotalRab) {
        console.log("✅ PERFECT MATCH! RKPDES and RAB totals are 100% synchronized!");
    } else {
        console.log("❌ MISMATCH DETECTED!");
    }

    process.exit(0);
})();
