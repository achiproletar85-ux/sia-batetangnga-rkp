const supabase = require('../backend/config/supabase');

(async () => {
    const { data: rabData } = await supabase.from('rab').select('*').eq('tahun', 2027);
    console.log("=== ALL RAB ROWS FOR 2027 ===");
    let totalAllRab = 0;
    (rabData || []).forEach((r, idx) => {
        const items = Array.isArray(r.items) ? r.items : [];
        const itemsSum = items.reduce((s, it) => s + (Number(it.jumlah) || 0), 0);
        const rowBiaya = Number(r.jumlah_anggaran || r.total_biaya || 0) || itemsSum;
        totalAllRab += rowBiaya;
        console.log(`[${idx+1}] Kode: ${r.kode_unik_full || r.kode_unik} | Nama: ${r.nama_kegiatan} | Jumlah Anggaran: ${r.jumlah_anggaran} | Total Biaya: ${r.total_biaya} | Items Sum: ${itemsSum} | Items Count: ${items.length}`);
        if (items.length > 0) {
            items.forEach((it, iIdx) => {
                console.log(`     -> Sub-item [${iIdx+1}]: ${it.uraian || it.nama_kegiatan || it.nama} = Rp ${Number(it.jumlah || 0).toLocaleString('id-ID')}`);
            });
        }
    });
    console.log(`TOTAL RAB: Rp ${totalAllRab.toLocaleString('id-ID')}`);

    process.exit(0);
})();
