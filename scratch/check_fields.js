const supabase = require('../backend/config/supabase');

(async () => {
    const { data: rkpData } = await supabase.from('rkpdes').select('*').eq('tahun', 2027);
    console.log("=== RKPDes Sample Rows (2027) ===");
    (rkpData || []).slice(0, 5).forEach((r, idx) => {
        console.log(`Row ${idx+1}:`, {
            id: r.id,
            kode_unik_full: r.kode_unik_full,
            bidang: r.bidang,
            jenis_bidang: r.jenis_bidang || r.sub_bidang,
            jenis_kegiatan: r.jenis_kegiatan,
            nama_kegiatan: r.nama_kegiatan,
            prakiraan_biaya: r.prakiraan_biaya
        });
    });

    const { data: stdData } = await supabase.from('rpjmdes_standar').select('*').limit(5);
    console.log("\n=== RPJMDes Standar Sample Rows ===");
    (stdData || []).forEach((s, idx) => {
        console.log(`Std ${idx+1}:`, {
            kode_unik_full: s.kode_unik_full,
            bidang: s.bidang,
            jenis_bidang: s.jenis_bidang,
            jenis_kegiatan: s.jenis_kegiatan,
            nama_kegiatan: s.nama_kegiatan
        });
    });

    process.exit(0);
})();
