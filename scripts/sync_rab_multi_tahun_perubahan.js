const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Harap pastikan SUPABASE_URL dan SUPABASE_KEY tersedia di .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BIDANG_MAP = {
  '01': 'Bidang Penyelenggaraan Pemerintahan Desa',
  '02': 'Bidang Pelaksanaan Pembangunan Desa',
  '03': 'Bidang Pembinaan Kemasyarakatan Desa',
  '04': 'Bidang Pemberdayaan Masyarakat Desa',
  '05': 'Bidang Penanggulangan Bencana, Keadaan Darurat dan Mendesak Desa'
};

function parseNumber(str) {
  if (!str) return 0;
  const isNegative = str.includes('(') && str.includes(')');
  const cleaned = str.replace(/[()]/g, '').replace(/\./g, '').replace(',', '.').trim();
  const val = parseFloat(cleaned) || 0;
  return isNegative ? -val : val;
}

function parseVolSat(str) {
  if (!str) return { vol: 1, satuan: 'Paket' };
  const m = str.trim().match(/^([\d.,]+)\s+(.*)$/);
  if (m) {
    return {
      vol: parseNumber(m[1]),
      satuan: m[2].trim() || 'Paket'
    };
  }
  return { vol: parseNumber(str), satuan: 'Paket' };
}

function parseYearFile(year) {
  const filePath = `C:/Users/Lenovo LOQ/.gemini/antigravity/brain/6447c8d9-9906-4ed2-b701-1fbd37a6fa58/scratch/extracted_text_perubahan_${year}.txt`;
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const lines = fs.readFileSync(filePath, 'utf8').split('\n');

  let currentParentCode = '';
  let currentParentName = '';
  let currentSubNo = '01';
  let currentSubName = '';
  let currentKelompok = '';
  let currentSubKelompok = '';
  let currentRek = '';

  const parentMap = {};
  for (const l of lines) {
    const m = l.trim().match(/^([1-5]\.\d+\.\d+)\.\s+(.+)$/);
    if (m && !l.trim().startsWith('5.')) {
      const p = m[1].split('.').map(x => x.padStart(2, '0')).join('.');
      parentMap[p] = m[2].trim();
    }
  }

  const rawItems = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check parent kegiatan header
    const mParent = line.match(/^([1-5]\.\d+\.\d+)\.\s+(.+)$/);
    if (mParent && !line.startsWith('5.')) {
      const pParts = mParent[1].split('.');
      const pCode = pParts.map(x => x.padStart(2, '0')).join('.');
      if (pCode !== currentParentCode) {
        currentParentCode = pCode;
        currentParentName = mParent[2].trim();
        currentSubNo = '01';
        currentSubName = currentParentName;
      }
    }

    // Check sub-kegiatan with package number: e.g. Name \t 01. \t Amount1 \t Amount2
    const mSubHeader = line.match(/^([^\t\d]+)\t+(\d{2})\.\s+[\d.,]+\s+[\d.,]+/);
    if (mSubHeader) {
      currentSubNo = mSubHeader[2];
      currentSubName = mSubHeader[1].trim();
    }

    // In 2022: e.g. Penghasilan Tetap Kepala Desa \t 5.1.1.01. \t Amount1 \t Amount2
    const mSub2022 = line.match(/^([^\t\d]+)\t+(5\.\d+\.\d+\.\d{2}\.?)\s+[\d.,]+\s+[\d.,]+/);
    if (mSub2022 && (!mSubHeader || (!line.includes('\t01.\t') && !line.includes('\t02.\t')))) {
      const rek = mSub2022[2];
      const name = mSub2022[1].trim();
      if (currentParentCode === '01.01.01') {
        if (rek.startsWith('5.1.1.01')) { currentSubNo = '01'; currentSubName = name; }
        else if (rek.startsWith('5.1.1.02')) { currentSubNo = '02'; currentSubName = name; }
      } else if (currentParentCode === '01.01.02') {
        if (rek.startsWith('5.1.2.01')) { currentSubNo = '01'; currentSubName = name; }
        else if (rek.startsWith('5.1.2.02')) { currentSubNo = '02'; currentSubName = name; }
      } else if (currentParentCode === '01.01.03') {
        if (rek.startsWith('5.1.3.01')) { currentSubNo = '01'; currentSubName = name; }
        else if (rek.startsWith('5.1.3.02')) { currentSubNo = '02'; currentSubName = name; }
        else if (rek.startsWith('5.1.3.03')) { currentSubNo = '03'; currentSubName = name; }
        else if (rek.startsWith('5.1.3.04')) { currentSubNo = '04'; currentSubName = name; }
      }
    }

    // Check Kelompok: 5.1.1. ...
    const mKel = line.match(/^5\.\d+\.\d+\.\s*\t?([^\t\d]+)/);
    if (mKel) {
      currentKelompok = mKel[1].trim();
    }

    // Check Subkelompok & Rekening
    const mSubKel1 = line.match(/^([^0-9\t]+)\t+(5\.\d+\.\d+\.\d{2}\.?)/);
    const mSubKel2 = line.match(/^(5\.\d+\.\d+\.\d{2}\.?)\s*\t+([^0-9\t]+)/);
    if (mSubKel1 && !/ADD|DDS|PBH|PAD|DLL/i.test(line)) {
      currentSubKelompok = mSubKel1[1].trim();
      currentRek = mSubKel1[2].trim();
      if (!currentRek.endsWith('.')) currentRek += '.';
    } else if (mSubKel2 && !/ADD|DDS|PBH|PAD|DLL/i.test(line)) {
      currentRek = mSubKel2[1].trim();
      currentSubKelompok = mSubKel2[2].trim();
      if (!currentRek.endsWith('.')) currentRek += '.';
    }

    // Check Belanja Item line: contains ADD/DDS/PBH/PAD/DLL
    if (/\b(ADD|DDS|PBH|PAD|DLL)\b/.test(line)) {
      const parts = line.split('\t').map(s => s.trim()).filter(Boolean);
      if (parts.length >= 6) {
        const uraian = parts[0];
        const semulaVs = parseVolSat(parts[1]);
        const semulaHarga = parseNumber(parts[2]);
        const semulaJumlah = parseNumber(parts[3]);
        const sumber = parts[4];

        let menjadiVs = { vol: 0, satuan: semulaVs.satuan };
        let menjadiHarga = 0;
        let menjadiJumlah = 0;

        if (parts.length >= 9) {
          menjadiVs = parseVolSat(parts[6]);
          menjadiHarga = parseNumber(parts[7]);
          const p8 = parts[8].split(/\s+/);
          menjadiJumlah = parseNumber(p8[0]);
        } else if (parts.length === 8) {
          menjadiVs = parseVolSat(parts[5]);
          menjadiHarga = parseNumber(parts[6]);
          menjadiJumlah = parseNumber(parts[7].split(/\s+/)[0]);
        }

        const kodeUnikFull = `${currentParentCode}.${currentSubNo}.`;

        rawItems.push({
          parent_kode: currentParentCode,
          kegiatan_induk: currentParentName,
          sub_kegiatan_no: currentSubNo,
          sub_kegiatan_nama: currentSubName || currentParentName,
          kode_unik_full: kodeUnikFull,
          kelompok: currentKelompok,
          sub_kelompok: currentSubKelompok,
          rek: currentRek,
          uraian,
          sumber,
          semula: {
            vol: semulaVs.vol,
            satuan: semulaVs.satuan,
            harga: semulaHarga,
            jumlah: semulaJumlah
          },
          menjadi: {
            vol: menjadiVs.vol,
            satuan: menjadiVs.satuan,
            harga: menjadiHarga,
            jumlah: menjadiJumlah
          }
        });
      }
    }
  }

  return rawItems;
}

function buildSubActivities(year, rawItems) {
  const grouped = {};

  rawItems.forEach(item => {
    const kode = item.kode_unik_full;
    if (!grouped[kode]) {
      const prefix = kode.slice(0, 2);
      grouped[kode] = {
        kode_unik: kode,
        kode_unik_full: kode,
        tahun: year,
        nama_kegiatan: item.sub_kegiatan_nama || item.kegiatan_induk,
        bidang: BIDANG_MAP[prefix] || 'Bidang Penyelenggaraan Pemerintahan Desa',
        sumber_dana: item.sumber,
        jenis_kegiatan: item.kegiatan_induk,
        group_nama: item.kelompok,
        sub_group_nama: item.sub_kelompok,
        lokasi: 'Desa Batetangnga',
        lokasi_kegiatan: 'Desa Batetangnga',
        status: 'Aktif',
        rawList: []
      };
    }
    grouped[kode].rawList.push(item);
  });

  const murniRecords = [];
  const perubahanRecords = [];

  for (const kode in grouped) {
    const g = grouped[kode];
    const prefix = kode.slice(0, 2);

    // 1. Buat MURNI record (dari Semula)
    const murniItems = [];
    let murniTotal = 0;

    g.rawList.forEach((it, idx) => {
      // Hanya sertakan item dengan anggaran semula > 0
      if (it.semula.jumlah > 0 || it.semula.vol > 0) {
        murniItems.push({
          group: it.kelompok,
          subgroup: it.sub_kelompok,
          kelompok_belanja: it.kelompok,
          sub_kelompok: it.sub_kelompok,
          kode_rekening: it.rek,
          uraian: it.uraian,
          volume: it.semula.vol,
          satuan: it.semula.satuan,
          harga: it.semula.harga,
          harga_satuan: it.semula.harga,
          jumlah: it.semula.jumlah,
          total: it.semula.jumlah,
          sumber: it.sumber,
          sumber_dana: it.sumber,
          urutan_murni: murniItems.length
        });
        murniTotal += it.semula.jumlah;
      }
    });

    if (murniItems.length > 0 || murniTotal > 0) {
      murniRecords.push({
        kode_unik: kode,
        kode_unik_full: kode,
        tahun: year,
        tipe_anggaran: 'MURNI',
        nama_kegiatan: g.nama_kegiatan,
        bidang: g.bidang,
        sumber_dana: g.sumber_dana,
        jumlah_anggaran: murniTotal,
        volume: 1,
        satuan: 'Paket',
        harga_satuan: murniTotal,
        lokasi: g.lokasi,
        lokasi_kegiatan: g.lokasi_kegiatan,
        jenis_kegiatan: g.jenis_kegiatan,
        group_nama: g.group_nama,
        sub_group_nama: g.sub_group_nama,
        rpjm_data: {
          kode_unik_full: kode,
          nama_kegiatan: g.nama_kegiatan,
          kegiatan_induk: g.jenis_kegiatan,
          bidang: g.bidang,
          sumber_dana: g.sumber_dana
        },
        items: murniItems,
        status: 'Aktif'
      });
    }

    // 2. Buat PERUBAHAN record (dari Menjadi)
    const perubahanItems = [];
    let perubahanTotal = 0;

    g.rawList.forEach((it) => {
      // Cari padanan urutan di murniItems
      const murniIdx = murniItems.findIndex(m => m.uraian === it.uraian && m.group === it.kelompok);

      if (it.menjadi.jumlah > 0 || it.menjadi.vol > 0) {
        perubahanItems.push({
          group: it.kelompok,
          subgroup: it.sub_kelompok,
          kelompok_belanja: it.kelompok,
          sub_kelompok: it.sub_kelompok,
          kode_rekening: it.rek,
          uraian: it.uraian,
          volume: it.menjadi.vol,
          satuan: it.menjadi.satuan,
          harga: it.menjadi.harga,
          harga_satuan: it.menjadi.harga,
          jumlah: it.menjadi.jumlah,
          total: it.menjadi.jumlah,
          sumber: it.sumber,
          sumber_dana: it.sumber,
          urutan_murni: murniIdx >= 0 ? murniIdx : null,
          item_baru: murniIdx < 0,
          semula_volume: it.semula.vol,
          semula_harga: it.semula.harga,
          semula_jumlah: it.semula.jumlah
        });
        perubahanTotal += it.menjadi.jumlah;
      }
    });

    if (perubahanItems.length > 0 || perubahanTotal > 0) {
      perubahanRecords.push({
        kode_unik: kode,
        kode_unik_full: kode,
        tahun: year,
        tipe_anggaran: 'PERUBAHAN',
        nama_kegiatan: g.nama_kegiatan,
        bidang: g.bidang,
        sumber_dana: g.sumber_dana,
        jumlah_anggaran: perubahanTotal,
        volume: 1,
        satuan: 'Paket',
        harga_satuan: perubahanTotal,
        lokasi: g.lokasi,
        lokasi_kegiatan: g.lokasi_kegiatan,
        jenis_kegiatan: g.jenis_kegiatan,
        group_nama: g.group_nama,
        sub_group_nama: g.sub_group_nama,
        rpjm_data: {
          kode_unik_full: kode,
          nama_kegiatan: g.nama_kegiatan,
          kegiatan_induk: g.jenis_kegiatan,
          bidang: g.bidang,
          sumber_dana: g.sumber_dana
        },
        items: perubahanItems,
        status: 'Aktif'
      });
    }
  }

  return { murniRecords, perubahanRecords };
}

async function syncAllYears() {
  const years = [2022, 2023, 2024, 2025];
  console.log('🚀 Memulai sinkronisasi Multi-Tahun RAB Perubahan (2022 - 2025) Format 4 Blok...');

  for (const year of years) {
    console.log(`\n======================================================`);
    console.log(`📌 PROSES TAHUN ANGGARAN ${year}`);
    console.log(`======================================================`);

    const rawItems = parseYearFile(year);
    const { murniRecords, perubahanRecords } = buildSubActivities(year, rawItems);

    console.log(`  Items mentah: ${rawItems.length}`);
    console.log(`  Sub-kegiatan MURNI:     ${murniRecords.length}`);
    console.log(`  Sub-kegiatan PERUBAHAN: ${perubahanRecords.length}`);

    // Simpan file JSON rujukan resmi lokal
    const jsonPath = path.resolve(`RAB_${year}_Siskeudes_Resmi.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(rawItems, null, 2), 'utf8');
    console.log(`  💾 Tersimpan lokal ke: ${path.basename(jsonPath)}`);

    // Hapus data lama tahun bersangkutan di tabel public.rab agar sinkronisasi bersih
    const { error: delErr } = await supabase
      .from('rab')
      .delete()
      .eq('tahun', year);

    if (delErr) {
      console.warn(`  ⚠️ Peringatan saat membersihkan data ${year}:`, delErr.message);
    } else {
      console.log(`  🧹 Berhasil membersihkan entri rab lama tahun ${year}.`);
    }

    // Upsert MURNI records
    let murniTotalRupiah = 0;
    let murniSuccess = 0;
    for (const rec of murniRecords) {
      murniTotalRupiah += rec.jumlah_anggaran;
      const { error } = await supabase
        .from('rab')
        .upsert(rec, { onConflict: 'kode_unik_full,tahun,tipe_anggaran' });

      if (error) {
        console.error(`    ❌ Gagal MURNI [${rec.kode_unik_full}]:`, error.message);
      } else {
        murniSuccess++;
      }
    }
    console.log(`  ✓ MURNI: ${murniSuccess}/${murniRecords.length} sub-kegiatan tersimpan (Total Rp ${murniTotalRupiah.toLocaleString('id-ID')})`);

    // Upsert PERUBAHAN records
    let perubTotalRupiah = 0;
    let perubSuccess = 0;
    for (const rec of perubahanRecords) {
      perubTotalRupiah += rec.jumlah_anggaran;
      const { error } = await supabase
        .from('rab')
        .upsert(rec, { onConflict: 'kode_unik_full,tahun,tipe_anggaran' });

      if (error) {
        console.error(`    ❌ Gagal PERUBAHAN [${rec.kode_unik_full}]:`, error.message);
      } else {
        perubSuccess++;
      }
    }
    console.log(`  ✓ PERUBAHAN: ${perubSuccess}/${perubahanRecords.length} sub-kegiatan tersimpan (Total Rp ${perubTotalRupiah.toLocaleString('id-ID')})`);
  }

  console.log(`\n======================================================`);
  console.log(`🎉 SINKRONISASI MULTI-TAHUN SELESAI DENGAN SUKSES!`);
  console.log(`======================================================`);
}

syncAllYears().catch(err => {
  console.error('❌ Terjadi kesalahan fatal:', err);
  process.exit(1);
});
