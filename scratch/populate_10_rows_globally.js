require('dotenv').config();
const supabase = require('../backend/config/supabase');

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

const tablesPayload = {
  susunan_tim: TEN_ROWS,
  tabel_kegiatan: TEN_ROWS,
  tabel_daftar_hadir: TEN_ROWS,
  tabel_tim_penyusun: TEN_ROWS,
  tabel_sk_tim_penyusun: TEN_ROWS
};

async function populate10RowsGlobally() {
  console.log('=== POPULATING 10 ROWS GLOBALLY FOR ALL YEARS (2026 & 2027) ===');

  const years = ['2026', '2027'];
  for (const yr of years) {
    // 1. Update GLOBAL_MASTER
    const { data: existingG } = await supabase
      .from('dokumen_form_data')
      .select('*')
      .eq('doc_code', 'GLOBAL_MASTER')
      .eq('tahun', yr)
      .maybeSingle();

    const gFields = existingG?.fields || {};
    const gTables = { ...(existingG?.tables || {}), ...tablesPayload };

    await supabase.from('dokumen_form_data').upsert({
      doc_code: 'GLOBAL_MASTER',
      tahun: yr,
      fields: gFields,
      tables: gTables,
      updated_at: new Date().toISOString()
    }, { onConflict: 'doc_code,tahun' });

    console.log(`✅ GLOBAL_MASTER for year ${yr} updated with 10 table rows!`);

    // 2. Update DOC-02B
    const { data: existingDoc } = await supabase
      .from('dokumen_form_data')
      .select('*')
      .eq('doc_code', 'DOC-02B')
      .eq('tahun', yr)
      .maybeSingle();

    const dFields = existingDoc?.fields || {};
    const dTables = { ...(existingDoc?.tables || {}), ...tablesPayload };

    await supabase.from('dokumen_form_data').upsert({
      doc_code: 'DOC-02B',
      tahun: yr,
      fields: dFields,
      tables: dTables,
      updated_at: new Date().toISOString()
    }, { onConflict: 'doc_code,tahun' });

    console.log(`✅ DOC-02B for year ${yr} updated with 10 table rows!`);
  }

  console.log('\n🎉 ALL YEARS (2026 & 2027) UPDATED WITH 10 TABLE ROWS IN SUPABASE!');
}

populate10RowsGlobally();
