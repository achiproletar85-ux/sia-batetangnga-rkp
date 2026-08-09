const supabase = require('./backend/config/supabase');
(async () => {
  const { data: rk } = await supabase.from('rancangan_rkpdes').select('bidang, kode_bidang, jenis_bidang, sub_kegiatan, nama_kegiatan, jenis_kegiatan, volume_satuan').eq('tahun',2027).limit(4);
  rk.forEach(r=>console.log(JSON.stringify({bidang:[r.bidang,typeof r.bidang], kode_bidang:r.kode_bidang, jb:r.jenis_bidang, sk:r.sub_kegiatan, nk:r.nama_kegiatan, jk:r.jenis_kegiatan, vol:r.volume_satuan})));
  const { data: p } = await supabase.from('prioritas_usulan').select('bidang, jenis_bidang, jenis_kegiatan, nama_kegiatan, kode_unik_full, lokasi_kegiatan, volume, volume_kegiatan, pagu_rpjm, sumber_dana').eq('tahun',2023).limit(4);
  console.log('prioritas_usulan:');
  p.forEach(r=>console.log(JSON.stringify({bidang:r.bidang, jb:r.jenis_bidang, jk:r.jenis_kegiatan, nk:r.nama_kegiatan, kode:r.kode_unik_full, lok:r.lokasi_kegiatan, vol:r.volume, volv:r.volume_kegiatan, pagu:r.pagu_rpjm, src:r.sumber_dana})));
})();
