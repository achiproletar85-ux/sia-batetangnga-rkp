const supabase = require('../backend/config/supabase');

(async () => {
    console.log("=== SEARCHING FOR 378.612.000 OR SIMILAR IN RKPDES & RAB ===");
    
    // Check RKPDES table for 378612000 or items summing to 378612000
    const { data: rkpData } = await supabase.from('rkpdes').select('*').eq('tahun', 2027);
    
    console.log("All RKPDes rows with prakiraan_biaya:");
    let sumByGroup = {};
    (rkpData || []).forEach(r => {
        console.log(`ID: ${r.id} | Kode: ${r.kode_unik_full || r.kode_unik} | Kegiatan: ${r.jenis_kegiatan || r.nama_kegiatan} | Biaya: ${r.prakiraan_biaya}`);
        const baseKode = (r.kode_unik_full || r.kode_unik || '').split('.')[0] + '.' + (r.kode_unik_full || r.kode_unik || '').split('.')[1];
        sumByGroup[baseKode] = (sumByGroup[baseKode] || 0) + Number(r.prakiraan_biaya || 0);
    });

    console.log("\nSummed by main prefix:", sumByGroup);

    const { data: rabData } = await supabase.from('rab').select('*').eq('tahun', 2027);
    console.log("\nAll RAB rows with total:");
    (rabData || []).forEach(r => {
        const items = Array.isArray(r.items) ? r.items : [];
        const itemsSum = items.reduce((s, it) => s + (Number(it.jumlah) || 0), 0);
        const rowBiaya = Number(r.jumlah_anggaran || r.total_biaya || 0) || itemsSum;
        console.log(`RAB Kode: ${r.kode_unik_full || r.kode_unik} | Kegiatan: ${r.nama_kegiatan} | Total: ${rowBiaya}`);
    });

    process.exit(0);
})();
