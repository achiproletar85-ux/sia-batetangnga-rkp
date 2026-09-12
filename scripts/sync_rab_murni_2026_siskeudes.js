const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Harap pastikan SUPABASE_URL dan SUPABASE_KEY tersedia di file .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const dataPath = path.resolve('RAB_Murni_2026_Siskeudes_Resmi.json');
if (!fs.existsSync(dataPath)) {
  console.error(`❌ File ${dataPath} tidak ditemukan.`);
  process.exit(1);
}

const rawItems = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const BIDANG_MAP = {
  '01': 'Bidang Penyelenggaraan Pemerintahan Desa',
  '02': 'Bidang Pelaksanaan Pembangunan Desa',
  '03': 'Bidang Pembinaan Kemasyarakatan Desa',
  '04': 'Bidang Pemberdayaan Masyarakat Desa',
  '05': 'Bidang Penanggulangan Bencana, Keadaan Darurat dan Mendesak Desa'
};

async function syncSiskeudes() {
  console.log('🚀 Memulai sinkronisasi RAB Murni 2026 rujukan Siskeudes...');

  const grouped = {};

  rawItems.forEach((item) => {
    const kode = item.kode;
    if (!grouped[kode]) {
      const prefix = kode.slice(0, 2);
      grouped[kode] = {
        kode_unik_full: kode,
        tahun: 2026,
        tipe_anggaran: 'MURNI',
        nama_kegiatan: item.kegiatan,
        bidang: BIDANG_MAP[prefix] || 'Bidang Penyelenggaraan Pemerintahan Desa',
        sumber_dana: item.sumber,
        jumlah_anggaran: 0,
        items: [],
        status: 'Aktif'
      };
    }

    grouped[kode].jumlah_anggaran += item.total;
    grouped[kode].items.push({
      no_urut: grouped[kode].items.length + 1,
      kelompok_belanja: item.kelompok,
      sub_kelompok: item.sub_kelompok,
      kode_rekening: item.rek,
      uraian: item.uraian,
      volume: item.vol,
      satuan: item.satuan,
      harga_satuan: item.harga,
      total: item.total,
      sumber_dana: item.sumber
    });
  });

  const records = Object.values(grouped);
  console.log(`📦 Terbentuk ${records.length} kegiatan RAB Murni 2026.`);

  let totalRupiah = 0;
  let successCount = 0;

  for (const record of records) {
    totalRupiah += record.jumlah_anggaran;
    const { error } = await supabase
      .from('rab')
      .upsert(record, { onConflict: 'kode_unik_full,tahun,tipe_anggaran' });

    if (error) {
      console.error(`❌ Gagal upsert ${record.kode_unik_full} (${record.nama_kegiatan}):`, error.message);
    } else {
      console.log(`  ✓ [${record.kode_unik_full}] ${record.nama_kegiatan} -> Rp${record.jumlah_anggaran.toLocaleString('id-ID')}`);
      successCount++;
    }
  }

  console.log(`\n✅ SUKSES: ${successCount}/${records.length} kegiatan berhasil disimpan ke Supabase!`);
  console.log(`💰 Total Anggaran RAB Murni 2026: Rp${totalRupiah.toLocaleString('id-ID')}`);
}

syncSiskeudes().catch((err) => {
  console.error('Terjadi kesalahan:', err);
  process.exit(1);
});
