// ==========================================
// SCRIPT MIGRASI: usulan-storage.json -> Supabase tabel usulan
// CARA PAKAI (setelah tabel usulan dibuat di SQL Editor):
//   Supabase Project settings -> API -> cari Service Role key MASUKKAN ke .env sebagai SERVICE_ROLE_KEY,
//   atau jalankan lewat server (anon key punya grant insert).
//   node migrasi_usulan.js
// ==========================================
require('dotenv').config({ path: require('path').resolve(__dirname, '.env'), quiet: true });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
// Gunakan SERVICE_ROLE_KEY jika tersedia; fallback ke anon (tergantung RLS policy "Allow insert all").
const SUPABASE_KEY = process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('GAGAL: SUPABASE_URL / SUPABASE_KEY tidak ditemukan di .env');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
  const file = path.join(__dirname, 'backend', '_storage_backup', 'usulan-storage.json');
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const arr = Object.values(raw);
  console.log(`Total baris backup: ${arr.length}`);

  // Cek apakah tabel sudah ada dengan insert percobaan kosong (0 rows) / select
  const { error: selErr } = await supabase.from('usulan').select('id').limit(1);
  if (selErr) {
    console.error('GAGAL: tabel usulan belum ada di Supabase.');
    console.error('1) Buka Supabase -> SQL Editor -> jalankan supabase_create_usulan.sql');
    console.error('2) lalu jalankan script ini lagi.');
    console.error('Pesan error:', selErr.message);
    process.exit(1);
  }

  const rows = arr.map(x => ({
    tahun: x.tahun || 2027,
    bidang: x.bidang || null,
    kode_unik_full: x.kode_unik_full || x.kode_unik || null,
    kode_unik: x.kode_unik || null,
    prioritas: x.prioritas != null ? Math.round(x.prioritas) : null,
    nama_kegiatan: x.nama_kegiatan || x.kegiatan || null,
    kegiatan: x.nama_kegiatan || x.kegiatan || null,
    sdgs: x.sdgs || null,
    data_eksisting: x.data_eksisting || null,
    lokasi: x.lokasi || null,
    volume: x.volume || null,
    biaya: Number(x.biaya) || 0,
    sasaran: x.sasaran || null,
    pengusul: x.pengusul || null,
    laki_laki: parseInt(x.laki_laki, 10) || 0,
    perempuan: parseInt(x.perempuan, 10) || 0,
    rtm: parseInt(x.rtm, 10) || 0,
    sumber_dana: x.sumber_dana || null
  }));

  // Insert berkelompok (batch) supaya tidak meledakkan request count
  const BATCH = 50;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { data, error } = await supabase.from('usulan').insert(chunk).select('id');
    if (error) {
      console.error(`ERROR batch ${i / BATCH}:`, error.message);
      if (error.message.includes('duplicate')) {
        console.log('Ada id duplikat — hentikan. Bersihkan tabel lalu ulangi.');
      }
      process.exit(1);
    }
    inserted += (data ? data.length : chunk.length);
    console.log(`Batch ${i / BATCH + 1}: ${inserted} / ${rows.length}`);
  }

  console.log(`✅ DONE. Berhasil migrasi ${inserted} usulan ke Supabase.`);
  // Verifikasi
  const { data: got, error } = await supabase.from('usulan').select('id').eq('tahun', 2027);
  if (!error) console.log(`Verifikasi: ${(got || []).length} baris usulan tahun 2027 di tabel usulan.`);
})();