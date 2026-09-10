const supabase = require('../backend/config/supabase');

(async () => {
    try {
        console.log("=== CHECKING RAB TABLE (2027) ===");
        const { data: rabData, error: rabErr } = await supabase.from('rab').select('*').eq('tahun', 2027);
        if (rabErr) console.error("RAB Error:", rabErr);
        else {
            console.log(`Found ${rabData ? rabData.length : 0} rows in 'rab' table for 2027.`);
            let totalRab = 0;
            if (rabData) {
                rabData.forEach(r => {
                    const items = Array.isArray(r.items) ? r.items : [];
                    const itemsSum = items.reduce((s, it) => s + (Number(it.jumlah) || 0), 0);
                    const rowBiaya = Number(r.jumlah_anggaran || r.total_biaya || 0) || itemsSum;
                    totalRab += rowBiaya;
                    console.log(`- RAB ID: ${r.id}, Kode: ${r.kode_unik_full || r.kode_unik}, Kegiatan: ${r.nama_kegiatan || r.jenis_kegiatan}, Total: ${rowBiaya} (jumlah_anggaran: ${r.jumlah_anggaran}, total_biaya: ${r.total_biaya}, itemsSum: ${itemsSum}, items.length: ${items.length})`);
                });
            }
            console.log(`TOTAL RAB (2027): Rp ${totalRab.toLocaleString('id-ID')}`);
        }

        console.log("\n=== CHECKING RKPDES TABLE (2027) ===");
        const { data: rkpData, error: rkpErr } = await supabase.from('rkpdes').select('*').eq('tahun', 2027);
        if (rkpErr) console.error("RKPDes Error:", rkpErr);
        else {
            console.log(`Found ${rkpData ? rkpData.length : 0} rows in 'rkpdes' table for 2027.`);
            let totalRkp = 0;
            if (rkpData) {
                rkpData.forEach(r => {
                    const rowBiaya = Number(r.prakiraan_biaya || 0);
                    totalRkp += rowBiaya;
                    console.log(`- RKP ID: ${r.id}, Kode: ${r.kode_unik_full || r.kode_unik}, Kegiatan: ${r.jenis_kegiatan || r.nama_kegiatan}, Biaya: ${rowBiaya}`);
                });
            }
            console.log(`TOTAL RKPDES (2027): Rp ${totalRkp.toLocaleString('id-ID')}`);
        }

        console.log("\n=== CHECKING OTHER YEARS IN RAB ===");
        const { data: allRab } = await supabase.from('rab').select('tahun');
        const rabYears = [...new Set((allRab || []).map(r => r.tahun))];
        console.log("RAB years found:", rabYears);

        console.log("\n=== CHECKING OTHER YEARS IN RKPDES ===");
        const { data: allRkp } = await supabase.from('rkpdes').select('tahun');
        const rkpYears = [...new Set((allRkp || []).map(r => r.tahun))];
        console.log("RKPDes years found:", rkpYears);

        for (const yr of rabYears) {
            const { data: yRab } = await supabase.from('rab').select('*').eq('tahun', yr);
            let sumY = 0;
            (yRab || []).forEach(r => {
                const items = Array.isArray(r.items) ? r.items : [];
                const itemsSum = items.reduce((s, it) => s + (Number(it.jumlah) || 0), 0);
                sumY += Number(r.jumlah_anggaran || r.total_biaya || 0) || itemsSum;
            });
            console.log(`Year ${yr} RAB Total: Rp ${sumY.toLocaleString('id-ID')} (${(yRab || []).length} rows)`);
        }

        for (const yr of rkpYears) {
            const { data: yRkp } = await supabase.from('rkpdes').select('*').eq('tahun', yr);
            let sumY = 0;
            (yRkp || []).forEach(r => sumY += Number(r.prakiraan_biaya || 0));
            console.log(`Year ${yr} RKPDes Total: Rp ${sumY.toLocaleString('id-ID')} (${(yRkp || []).length} rows)`);
        }

    } catch (e) {
        console.error("Script error:", e);
    }
    process.exit(0);
})();
