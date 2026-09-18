require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const MASTER_COLS = 'id, bidang, sub_bidang, jenis_kegiatan, kode_klasifikasi, kode_bidang, kode_sub, kode_kegiatan';
const RKPDES_COLS = 'id, tahun, kode_bidang, kode_sub, kode_kegiatan, kode_unik_full, nama_kegiatan, jenis_kegiatan, bidang, prakiraan_biaya';
const RAB_COLS = 'id, tahun, tipe_anggaran, kode_unik_full, nama_kegiatan, jenis_kegiatan, group_nama, sub_group_nama, bidang, jumlah_anggaran, items, id_referensi_murni';

async function main() {
    console.log('========================================================================');
    console.log(' ENFORCE MASTER KLASIFIKASI & RELOCATION BY KODE_UNIK');
    console.log('========================================================================');
    
    // 1. Fetch master_klasifikasi
    const { data: master, error: errMaster } = await supabase
        .from('master_klasifikasi')
        .select(MASTER_COLS);
    if (errMaster) throw errMaster;
    console.log('✅ Loaded master_klasifikasi:', master.length, 'records');

    const kegMap = new Map();
    const subMap = new Map();
    const bidMap = new Map();

    master.forEach(m => {
        const k = (m.kode_kegiatan || m.kode_klasifikasi || '').replace(/\.+$/, '');
        if (k && !kegMap.has(k)) kegMap.set(k, m);

        const s = (m.kode_sub || '').replace(/\.+$/, '');
        if (s && !subMap.has(s)) subMap.set(s, m);

        const b = (m.kode_bidang || '').replace(/\.+$/, '');
        if (b && !bidMap.has(b)) bidMap.set(b, m);
    });

    // 2. Fetch and check RKPDES
    const { data: rkpdes, error: errRkp } = await supabase
        .from('rkpdes')
        .select(RKPDES_COLS);
    if (errRkp) throw errRkp;
    console.log('✅ Loaded rkpdes:', rkpdes.length, 'records');

    let rkpUpdates = 0;
    for (const r of rkpdes) {
        const full = (r.kode_unik_full || '').replace(/\.+$/, '');
        const parts = full.split('.');
        const bidKey = parts[0];
        const subKey = parts.slice(0, 2).join('.');
        const kegKey = parts.slice(0, 3).join('.');

        const stdKeg = kegMap.get(kegKey);
        const stdSub = subMap.get(subKey);
        const stdBid = bidMap.get(bidKey);

        const patch = {};
        if (stdKeg && r.jenis_kegiatan !== stdKeg.jenis_kegiatan) {
            patch.jenis_kegiatan = stdKeg.jenis_kegiatan;
        }
        if (stdKeg && (!r.kode_kegiatan || r.kode_kegiatan.replace(/\.+$/, '') !== kegKey)) {
            patch.kode_kegiatan = kegKey + '.';
        }
        if (stdSub && (!r.kode_sub || r.kode_sub.replace(/\.+$/, '') !== subKey)) {
            patch.kode_sub = subKey + '.';
        }
        if (stdBid && (!r.kode_bidang || r.kode_bidang.replace(/\.+$/, '') !== bidKey)) {
            patch.kode_bidang = bidKey + '.';
        }

        if (Object.keys(patch).length > 0) {
            console.log('Relocating rkpdes ID ' + r.id + ' (' + r.kode_unik_full + ' - ' + r.nama_kegiatan + '):', patch);
            const { error: errUp } = await supabase.from('rkpdes').update(patch).eq('id', r.id);
            if (errUp) console.error('  Failed update rkpdes ID ' + r.id + ':', errUp.message);
            else rkpUpdates++;
        }
    }
    console.log('RKPDes updates performed:', rkpUpdates);

    // 3. Fetch and check all RAB records
    const { data: allRab, error: errAllRab } = await supabase
        .from('rab')
        .select(RAB_COLS);
    if (errAllRab) throw errAllRab;
    console.log('✅ Loaded rab:', allRab.length, 'records');

    let rabUpdates = 0;
    for (const rb of allRab) {
        const full = (rb.kode_unik_full || '').replace(/\.+$/, '');
        const parts = full.split('.');
        const bidKey = parts[0];
        const kegKey = parts.slice(0, 3).join('.');

        const stdKeg = kegMap.get(kegKey);
        const stdBid = bidMap.get(bidKey);

        const patch = {};
        if (stdKeg && rb.jenis_kegiatan && rb.jenis_kegiatan !== stdKeg.jenis_kegiatan) {
            patch.jenis_kegiatan = stdKeg.jenis_kegiatan;
        }
        if (stdBid && rb.bidang && rb.bidang !== stdBid.bidang && rb.bidang !== 'Bidang Penyelenggaraan Pemerintahan Desa' && rb.bidang !== 'Bidang Penyelenggaraan Pemerintah Desa') {
            patch.bidang = stdBid.bidang;
        }

        if (Object.keys(patch).length > 0) {
            console.log('Aligning rab ID ' + rb.id + ' (' + rb.kode_unik_full + ' - ' + rb.nama_kegiatan + '):', patch);
            const { error: errUp } = await supabase.from('rab').update(patch).eq('id', rb.id);
            if (errUp) console.error('  Failed update rab ID ' + rb.id + ':', errUp.message);
            else rabUpdates++;
        }
    }
    console.log('RAB updates performed:', rabUpdates);

    // 4. Check RAB Tunjangan BPD specifically
    const { data: bpdRab, error: errRab } = await supabase
        .from('rab')
        .select(RAB_COLS)
        .ilike('kode_unik_full', '01.01.05%')
        .eq('tahun', 2026);
    if (errRab) throw errRab;

    console.log('\n--- VERIFIKASI TUNJANGAN BPD 2026 (SEMULA VS MENJADI) ---');
    bpdRab.forEach(rb => {
        console.log('ID: ' + rb.id + ' | Tipe: ' + rb.tipe_anggaran + ' | Kode: ' + rb.kode_unik_full + ' | Anggaran: Rp ' + Number(rb.jumlah_anggaran).toLocaleString('id-ID'));
        console.log('  Group: ' + rb.group_nama + ' | SubGroup: ' + rb.sub_group_nama + ' | JenisKeg: ' + rb.jenis_kegiatan);
        const it = Array.isArray(rb.items) ? rb.items : (typeof rb.items === 'string' ? JSON.parse(rb.items) : []);
        const totalItems = it.reduce((s, x) => s + (Number(x.total ?? x.jumlah ?? (x.volume * (x.harga || x.harga_satuan))) || 0), 0);
        console.log('  Items Count: ' + it.length + ' | Items Total: Rp ' + totalItems.toLocaleString('id-ID'));
    });

    console.log('\n========================================================================');
    console.log(' MASTER KLASIFIKASI ENFORCEMENT COMPLETED SUCCESSFULLY');
    console.log('========================================================================');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
