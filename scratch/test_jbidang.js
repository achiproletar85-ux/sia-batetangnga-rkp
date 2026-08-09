const supabase = require('../backend/config/supabase');

(async () => {
    const { data: stdList } = await supabase.from('rpjmdes_standar').select('*');
    const stdMap = new Map();
    (stdList || []).forEach(s => {
        if (s.kode_unik_full) stdMap.set(String(s.kode_unik_full).trim(), s);
        if (s.kode_unik) stdMap.set(String(s.kode_unik).trim(), s);
    });

    const { data: rabData } = await supabase.from('rab').select('*').eq('tahun', 2027);
    console.log("=== CHECKING JENIS BIDANG MAPPING FOR RAB 2027 ===");
    (rabData || []).forEach((r, idx) => {
        const k = String(r.kode_unik_full || r.kode_unik || '').trim();
        const std = stdMap.get(k);
        const jBid = r.jenis_bidang || (std && std.jenis_bidang) || 'Sub Bidang Umum';
        console.log(`[${idx+1}] Kode: ${k} | Jenis Bidang: ${jBid} | Kegiatan: ${r.nama_kegiatan}`);
    });

    process.exit(0);
})();
