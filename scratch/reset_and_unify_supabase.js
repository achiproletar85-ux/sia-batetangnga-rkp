require('dotenv').config();
const supabase = require('../backend/config/supabase');

const DOC_CODES = [
  'GLOBAL_MASTER',
  'DOC-01', 'DOC-02A', 'DOC-02B', 'DOC-03',
  'DOC-19', 'DOC-20', 'DOC-21', 'DOC-22',
  'DOC-24', 'DOC-25', 'DOC-27', 'DOC-28',
  'DOC-29', 'DOC-30', 'DOC-31', 'DOC-39',
  'DOC-33', 'DOC-34'
];

const MASTER_FIELDS = {
  tahun: '2027',
  tahun1: '2026',
  tahun2: '2025',
  tahun0: '2027',
  nama_desa: 'Desa Batetangnga',
  kades: 'SUMAILA DAMANG',
  nama_kepala_desa: 'SUMAILA DAMANG',
  nama_ketua_bpd: 'HAERUDDIN, S.Pd.',
  tempat: 'Aula Kantor Desa Batetangnga',
  tempat_musrembang: 'Aula Kantor Desa Batetangnga',
  sk_tim: '188.4/05/SK-DES/X/2024',
  ska: '188.4/05/SK-DES/X/2024',
  pimpinan_musrembang: 'SUMAILA DAMANG',
  tgl_musdes_tim_hari: 'Kamis, 15 Oktober 2024',
  tgl_musdes_tim_bulan: '15 Oktober 2024',
  tgl_musdes_tim_terbilang: 'Lima belas bulan Oktober tahun dua ribu dua puluh empat',
  tgl_surat_tim: '15 Oktober 2024',
  tgl_musrembang_hari: 'Kamis, 24 Oktober 2024',
  tgl_tatip_bulan: '24 Oktober 2024',
  rpjmdes1: 'Rencana Pembangunan Jangka Menengah Desa Batetangnga Tahun 2020-2026',
  kewenangan1: 'Peraturan Desa Batetangnga Nomor 03 Tahun 2021 tentang Kewenangan Desa',
  apbdes1: 'Anggaran Pendapatan dan Belanja Desa (APBDes) Batetangnga Tahun 2025',
  kecamatan: 'Binuang',
  kabupaten: 'Polewali Mandar',
  provinsi: 'Sulawesi Barat',
  alamat_kantor: 'Jl. Poros Batetangnga No. 01, Desa Batetangnga'
};

const TEN_ROWS = [
  {"no":"1","ttl":"Kanang, 31-12-1960","Nama":"SUMAILA DAMANG","nama":"SUMAILA DAMANG","Unsur":"Kepala Desa","col_0":"SUMAILA DAMANG","col_1":"Kanang, 31-12-1960","col_2":"Penanggung Jawab","col_3":"Kepala Desa","unsur":"Kepala Desa","Jabatan":"Penanggung Jawab","jabatan":"Penanggung Jawab","Tempat, Tanggal Lahir":"Kanang, 31-12-1960"},
  {"no":"2","ttl":"Kanang, 04-09-1985","Nama":"Abdul Azis. S. Pd","nama":"Abdul Azis. S. Pd","Unsur":"Sekretaris Desa","col_0":"Abdul Azis. S. Pd","col_1":"Kanang, 04-09-1985","col_2":"Ketua","col_3":"Sekretaris Desa","unsur":"Sekretaris Desa","Jabatan":"Ketua","jabatan":"Ketua","Tempat, Tanggal Lahir":"Kanang, 04-09-1985"},
  {"no":"3","ttl":"Kanang, 31-12-1972","Nama":"Syarifuddin","nama":"Syarifuddin","Unsur":"Kaur Perencanaan","col_0":"Syarifuddin","col_1":"Kanang, 31-12-1972","col_2":"Anggota","col_3":"Kaur Perencanaan","unsur":"Kaur Perencanaan","Jabatan":"Anggota","jabatan":"Anggota","Tempat, Tanggal Lahir":"Kanang, 31-12-1972"},
  {"no":"4","ttl":"Kanang, 21-09-1990","Nama":"Ida Mulyanti","nama":"Ida Mulyanti","Unsur":"Kaur Keuangan","col_0":"Ida Mulyanti","col_1":"Kanang, 21-09-1990","col_2":"Anggota","col_3":"Kaur Keuangan","unsur":"Kaur Keuangan","Jabatan":"Anggota","jabatan":"Anggota","Tempat, Tanggal Lahir":"Kanang, 21-09-1990"},
  {"no":"5","ttl":"Mirring, 15-09-1982","Nama":"Hardiana","nama":"Hardiana","Unsur":"Kasi Kesra","col_0":"Hardiana","col_1":"Mirring, 15-09-1982","col_2":"Anggota","col_3":"Kasi Kesra","unsur":"Kasi Kesra","Jabatan":"Anggota","jabatan":"Anggota","Tempat, Tanggal Lahir":"Mirring, 15-09-1982"},
  {"no":"6","ttl":"Kanang 4 Maret 1993","Nama":"Misbahuddin","nama":"Misbahuddin","Unsur":"Kaur Umum & Tata Usaha","col_0":"Misbahuddin","col_1":"Kanang 4 Maret 1993","col_2":"Anggota","col_3":"Kaur Umum & Tata Usaha","unsur":"Kaur Umum & Tata Usaha","Jabatan":"Anggota","jabatan":"Anggota","Tempat, Tanggal Lahir":"Kanang 4 Maret 1993"},
  {"no":"7","ttl":"Kanang, 06-03-1986","Nama":"Bustamin B","nama":"Bustamin B","Unsur":"Tokoh Pendidik","col_0":"Bustamin B","col_1":"Kanang, 06-03-1986","col_2":"Anggota","col_3":"Tokoh Pendidik","unsur":"Tokoh Pendidik","Jabatan":"Anggota","jabatan":"Anggota","Tempat, Tanggal Lahir":"Kanang, 06-03-1986"},
  {"no":"8","ttl":"Malaysia, 31-10-1997","Nama":"Suasti","nama":"Suasti","Unsur":"Anggota KPM","col_0":"Suasti","col_1":"Malaysia, 31-10-1997","col_2":"Anggota","col_3":"Anggota KPM","unsur":"Anggota KPM","Jabatan":"Anggota","jabatan":"Anggota","Tempat, Tanggal Lahir":"Malaysia, 31-10-1997"},
  {"no":"9","ttl":"Kanang, 07-04-1993","Nama":"Muhammad Alfaidur Rahab","nama":"Muhammad Alfaidur Rahab","Unsur":"Tokoh Pemuda","col_0":"Muhammad Alfaidur Rahab","col_1":"Kanang, 07-04-1993","col_2":"Anggota","col_3":"Tokoh Pemuda","unsur":"Tokoh Pemuda","Jabatan":"Anggota","jabatan":"Anggota","Tempat, Tanggal Lahir":"Kanang, 07-04-1993"},
  {"no":"10","ttl":"Kanang, 25-05-1996","Nama":"Muhaammad Jabbar","nama":"Muhaammad Jabbar","Unsur":"Unsur Masyarakat","col_0":"Muhaammad Jabbar","col_1":"Kanang, 25-05-1996","col_2":"Anggota","col_3":"Unsur Masyarakat","unsur":"Unsur Masyarakat","Jabatan":"Anggota","jabatan":"Anggota","Tempat, Tanggal Lahir":"Kanang, 25-05-1996"}
];

const MASTER_TABLES = {
  susunan_tim: TEN_ROWS,
  tabel_kegiatan: TEN_ROWS,
  tabel_daftar_hadir: TEN_ROWS,
  tabel_tim_penyusun: TEN_ROWS,
  tabel_sk_tim_penyusun: TEN_ROWS
};

async function resetAndUnifySupabase() {
  console.log('⚡ === RESET & SINKRONISASI TOTAL DATABASE SUPABASE === ⚡\n');

  const years = ['2027', '2026'];
  let totalReset = 0;

  for (const yr of years) {
    for (const code of DOC_CODES) {
      const { data: existingDoc } = await supabase
        .from('dokumen_form_data')
        .select('fields')
        .eq('doc_code', code)
        .eq('tahun', yr)
        .maybeSingle();

      const mergedFields = { ...MASTER_FIELDS, ...(existingDoc?.fields || {}) };
      mergedFields.tahun = yr;

      const { error } = await supabase
        .from('dokumen_form_data')
        .upsert({
          doc_code: code,
          tahun: yr,
          fields: mergedFields,
          tables: MASTER_TABLES,
          updated_at: new Date().toISOString()
        }, { onConflict: 'doc_code,tahun' });

      if (error) {
        console.error(`❌ Gagal reset ${code} (${yr}):`, error.message);
      } else {
        totalReset++;
        console.log(`✅ [SUCCESS] Reset & Sinkronisasi ${code} (Tahun: ${yr})`);
      }
    }
  }

  console.log(`\n🎉 SELESAI TOTAL! Total ${totalReset} record dokumen di Supabase berhasil di-reset & disinkronkan seragam!`);
}

resetAndUnifySupabase();
