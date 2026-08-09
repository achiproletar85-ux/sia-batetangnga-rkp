const supabase = require('../backend/config/supabase');

(async () => {
    const tables = [
        'rkpdes', 'rab', 'rancangan_rkpdes', 'du_rkpdes', 'rpjmdes_standar', 
        'prioritas_usulan', 'pagu_indikatif', 'pembiayaan', 'program_masuk_desa',
        'kerjasama_pihak_ketiga'
    ];

    console.log("=== GLOBAL DATABASE SEARCH FOR 378612000 / 378.612.000 ===");

    for (const t of tables) {
        try {
            const { data, error } = await supabase.from(t).select('*');
            if (error) {
                console.log(`Table '${t}' error/missing: ${error.message}`);
                continue;
            }
            if (!data) continue;
            
            data.forEach(row => {
                const str = JSON.stringify(row);
                if (str.includes('378612000') || str.includes('378.612.000') || str.includes('378612')) {
                    console.log(`FOUND IN TABLE '${t}': ID=${row.id}, Row=`, row);
                }
            });
        } catch(e) {
            console.error(`Error checking ${t}:`, e.message);
        }
    }

    process.exit(0);
})();
