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

const dataPath = path.resolve('RAB_Murni_2023_Siskeudes_Resmi.json');
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

async function syncSiskeudes2023() {
  console.log('🚀 Memulai sinkronisasi RAB Murni 2023 rujukan Siskeudes (Format 4 Blok Sub-Kegiatan)...');

  const grouped = {};

  rawItems.forEach((item) => {
    const kode = item.kode_unik_full || (item.kode + '.' + (item.sub_kegiatan_no || '01') + '.');
    if (!grouped[kode]) {
      const prefix = kode.slice(0, 2);
      const namaSubKegiatan = item.sub_kegiatan_nama || item.kegiatan;
      grouped[kode] = {
        kode_unik: kode,
        kode_unik_full: kode,
        tahun: 2023,
        tipe_anggaran: 'MURNI',
        nama_kegiatan: namaSubKegiatan,
        bidang: BIDANG_MAP[prefix] || 'Bidang Penyelenggaraan Pemerintahan Desa',
        sumber_dana: item.sumber,
        jumlah_anggaran: 0,
        volume: 1,
        satuan: 'Paket',
        harga_satuan: 0,
        lokasi: 'Desa Batetangnga',
        lokasi_kegiatan: 'Desa Batetangnga',
        jenis_kegiatan: item.kegiatan || namaSubKegiatan,
        group_nama: item.kelompok || '',
        sub_group_nama: item.sub_kelompok || '',
        rpjm_data: {
          kode_unik_full: kode,
          nama_kegiatan: namaSubKegiatan,
          kegiatan_induk: item.kegiatan,
          bidang: BIDANG_MAP[prefix] || 'Bidang Penyelenggaraan Pemerintahan Desa',
          sumber_dana: item.sumber
        },
        items: [],
        status: 'Aktif'
      };
    }

    grouped[kode].jumlah_anggaran += item.total;
    grouped[kode].harga_satuan = grouped[kode].jumlah_anggaran;
    grouped[kode].items.push({
      group: item.kelompok,
      subgroup: item.sub_kelompok,
      kelompok_belanja: item.kelompok,
      sub_kelompok: item.sub_kelompok,
      kode_rekening: item.rek,
      uraian: item.uraian,
      volume: item.vol,
      satuan: item.satuan,
      harga: item.harga,
      harga_satuan: item.harga,
      jumlah: item.total,
      total: item.total,
      sumber: item.sumber,
      sumber_dana: item.sumber
    });
  });

  const records = Object.values(grouped);
  console.log(`📦 Terbentuk ${records.length} sub-kegiatan RAB Murni 2023 (format 4 blok).`);

  // Bersihkan data lama 2023 MURNI agar tidak tercampur antara kode 3-blok lama dan 4-blok baru
  const { error: delErr } = await supabase
    .from('rab')
    .delete()
    .eq('tahun', 2023)
    .eq('tipe_anggaran', 'MURNI');

  if (delErr) {
    console.warn('⚠️ Peringatan saat membersihkan data lama 2023:', delErr.message);
  } else {
    console.log('🧹 Berhasil membersihkan entri RAB 2023 MURNI lama.');
  }

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
  console.log(`💰 Total Anggaran RAB Murni 2023: Rp${totalRupiah.toLocaleString('id-ID')}`);
}

syncSiskeudes2023().catch((err) => {
  console.error('Terjadi kesalahan:', err);
  process.exit(1);
});
