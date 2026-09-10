const BASE='http://localhost:5500';
const json=(m,b)=>fetch(BASE+m,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
(async()=>{
  // 1. sync dengan item tanpa extra fields (paling dasar)
  console.log('--- rancangan sync item dasar ---');
  let r=await json('/api/rancangan-rkpdes/sync',{tahun:2099,data:[{nama_kegiatan:'Rancangan Uji',bidang:'Bidang A'}]});
  let t=await r.text(); console.log(r.status,t);

  // lihat kolom tabel rancangan_rkpdes langsung via REST
  const fs=require('fs'); const env=fs.readFileSync(String.raw`C:\Users\Lenovo LOQ\Desktop\sia-batetangga\.env`,'utf8');
  const URL=env.match(/SUPABASE_URL=(\S+)/)[1]; const KEY=env.match(/SUPABASE_KEY=(\S+)/)[1];
  r=await fetch(`${URL}/rest/v1/rancangan_rkpdes?select=*&tahun=eq.2099`,{headers:{apikey:KEY,Authorization:'Bearer '+KEY}});
  console.log('baris tersisa tahun 2099:',JSON.stringify(await r.json()));
})();
