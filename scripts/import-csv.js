const fs = require('fs');
const path = require('path');
const supabase = require('../backend/config/supabase');

function parseCsv(content) {
  const rows = [];
  let current = '';
  let inQuotes = false;
  let row = [];

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === ',') {
      row.push(current);
      current = '';
      continue;
    }

    if (!inQuotes && (ch === '\r' || ch === '\n')) {
      if (ch === '\r' && next === '\n') {
        i++;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
      continue;
    }

    current += ch;
  }

  if (current !== '' || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

function normalizePrefix(prefix) {
  if (!prefix) return '';
  const trimmed = String(prefix).trim();
  return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
}

function mapHeader(header) {
  const key = String(header || '').trim().replace(/_/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const map = {
    'kode bidang': 'kode_bidang',
    'kode sub': 'kode_sub',
    'kode kegiatan': 'kode_kegiatan',
    'kode unik full': 'kode_unik_full',
    'kode unik': 'kode_unik_full',
    'nama kegiatan': 'nama_kegiatan',
    'pagu rpjm': 'pagu_rpjm',
    'sifat kegiatan': 'sifat_kegiatan',
    'volume kegiatan': 'volume_kegiatan',
    'lokasi kegiatan': 'lokasi_kegiatan',
    'usulan berdasarkan': 'usulan_berdasarkan',
    'bidang': 'bidang',
    'jenis bidang': 'jenis_bidang',
    'jenis kegiatan': 'jenis_kegiatan',
    'sdgs': 'sdgs',
    'data exiting': 'data_existing',
    'nama pengusul': 'nama_pengusul',
    'penerima manfaat laki-laki': 'manfaat_l',
    'penerima manfaat perempuan': 'manfaat_p',
    'penerima manfaat rtm': 'manfaat_rtm',
    'total penerima manfaat': 'total_manfaat',
    'waktu pelaksanaan': 'waktu_pelaksanaan',
    'anggaran perubahan': 'anggaran_perubahan',
    'sumber dana': 'sumber_dana',
    'pola pelaksanaan': 'pola_pelaksanaan',
    'skala prioritas': 'skala_prioritas',
    'urutan prioritas': 'urutan_prioritas',
    'masalah': 'masalah',
    'penyebab': 'penyebab',
    'potensi': 'potensi',
    'alternatif pemecahan': 'alternatif_pemecahan',
    'tindakan masalah': 'tindakan_masalah',
    'tindakan yang layak': 'tindakan_layak',
    'nama kegiatan': 'nama_kegiatan',
    'dirasakan oleh banyak orang': 'dirasakan',
    'sangat parah/mendesak': 'parah',
    'menghambat peningkatan pendapatan': 'hambat',
    'sering terjadi/berulang': 'sering',
    'tersedia potensi untuk memecahkan masalah': 'potensi_skor',
    'jumlah nilai total': 'jumlah_nilai_total',
    'uraian peringkat': 'uraian_peringkat',
    'kesesuaian dengan visi dan misi kepala desa': 'visi_misi',
    'kesesuaian dengan pokok pikiran bpd': 'pokok_bpd',
    'kesesuaian dengan program masyarakat': 'program_masyarakat',
    'kesesuaian dengan prioritas sdgs': 'prioritas_sdgs_skor',
    'ranking': 'ranking',
    'pagu': 'pagu_rpjm'
  };

  const targetMatch = key.match(/^target\s*(\d{4})$/);
  if (targetMatch) {
    return `target_${targetMatch[1]}`;
  }

  return map[key] || '';
}

function parseNumber(value) {
  if (value === undefined || value === null) return null;
  const num = String(value).replace(/[^0-9\-]/g, '');
  return num === '' ? null : parseInt(num, 10);
}

function splitCodeParts(prefix) {
  const normalized = normalizePrefix(prefix);
  const parts = normalized.split('.').filter(Boolean);
  return parts;
}

async function getPrefixState(prefix, prefixState) {
  const normalizedPrefix = normalizePrefix(prefix);
  if (prefixState[normalizedPrefix]) return prefixState[normalizedPrefix];

  const { data, error } = await supabase
    .from('rpjmdes_standar')
    .select('kode_unik_full')
    .ilike('kode_unik_full', `${normalizedPrefix}%`)
    .order('kode_unik_full', { ascending: true });

  if (error) {
    throw new Error(`Error membaca kode unik terakhir: ${error.message}`);
  }

  const existingCodes = new Set();
  let highest = 0;

  if (data && data.length > 0) {
    data.forEach(item => {
      const code = String(item.kode_unik_full || '').trim();
      if (!code) return;
      const normalizedCode = code.endsWith('.') ? code : `${code}.`;
      existingCodes.add(normalizedCode);

      const suffix = normalizedCode.slice(normalizedPrefix.length).split('.')[0];
      const suffixNum = parseInt(suffix, 10);
      if (!Number.isNaN(suffixNum) && suffixNum > highest) {
        highest = suffixNum;
      }
    });
  }

  prefixState[normalizedPrefix] = {
    existingCodes,
    importCodes: new Set(),
    nextSuffix: highest + 1
  };
  return prefixState[normalizedPrefix];
}

async function buildPayload(row, headerKeys, prefixState) {
  const record = {};
  for (let i = 0; i < headerKeys.length; i += 1) {
    const key = headerKeys[i];
    const value = row[i] != null ? row[i].trim() : '';
    if (!key) continue;

    if (['pagu_rpjm', 'anggaran_perubahan', 'total_manfaat', 'penerima_manfaat_bg'].includes(key)) {
      record[key] = parseNumber(value) || 0;
    } else if (['manfaat_l', 'manfaat_p', 'manfaat_rtm', 'dirasakan', 'parah', 'hambat', 'sering', 'potensi_skor', 'visi_misi', 'pokok_bpd', 'program_masyarakat', 'prioritas_sdgs_skor'].includes(key)) {
      record[key] = parseNumber(value) || 0;
    } else {
      record[key] = value || null;
    }
  }

  const baseCodeValue = record.kode_kegiatan || record.jenis_kegiatan || record['Kode_Klasifikasi_Dasar'];
  const normalizedBaseCode = normalizePrefix(baseCodeValue);
  if (!normalizedBaseCode || !normalizedBaseCode.match(/^\d{2}(\.\d{2})*\.$/)) {
    throw new Error(`Tidak dapat menemukan Kode Klasifikasi Dasar yang valid di baris: ${JSON.stringify(record)}`);
  }

  record.kode_kegiatan = normalizedBaseCode;
  record.kode_bidang = `${normalizedBaseCode.split('.').filter(Boolean).slice(0, 1).join('.')}.`;
  record.kode_sub = `${normalizedBaseCode.split('.').filter(Boolean).slice(0, 2).join('.')}.`;

  const prefix = normalizedBaseCode;
  const state = await getPrefixState(prefix, prefixState);

  const normalizeCode = (code) => {
    const trimmed = String(code || '').trim();
    return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
  };

  if (record.kode_unik_full) {
    const kodeUnik = normalizeCode(record.kode_unik_full);
    if (state.existingCodes.has(kodeUnik)) {
      return { skip: true, reason: `Kode unik sudah ada di database: ${kodeUnik}` };
    }
    if (state.importCodes.has(kodeUnik)) {
      return { skip: true, reason: `Kode unik duplikat di file: ${kodeUnik}` };
    }
    record.kode_unik_full = kodeUnik;
    record.kode_unik_h = kodeUnik;
  } else {
    let nextCode = `${prefix}${String(state.nextSuffix).padStart(2, '0')}.`;
    while (state.existingCodes.has(nextCode) || state.importCodes.has(nextCode)) {
      state.nextSuffix += 1;
      nextCode = `${prefix}${String(state.nextSuffix).padStart(2, '0')}.`;
    }
    record.kode_unik_full = nextCode;
    record.kode_unik_h = nextCode;
    state.nextSuffix += 1;
  }

  state.existingCodes.add(record.kode_unik_full);
  state.importCodes.add(record.kode_unik_full);

  if (!record.nama_kegiatan) {
    record.nama_kegiatan = record.jenis_kegiatan || `Kegiatan ${record.kode_unik_full}`;
  }

  record.total_manfaat = (parseInt(record.manfaat_l, 10) || 0) + (parseInt(record.manfaat_p, 10) || 0) + (parseInt(record.manfaat_rtm, 10) || 0);
  record.penerima_manfaat_bg = record.total_manfaat;

  record.total_kesesuaian = (parseInt(record.visi_misi, 10) || 0) + (parseInt(record.pokok_bpd, 10) || 0) + (parseInt(record.program_masyarakat, 10) || 0) + (parseInt(record.prioritas_sdgs_skor, 10) || 0);
  if (record.total_kesesuaian >= 301) record.ranking = 'I';
  else if (record.total_kesesuaian >= 201) record.ranking = 'II';
  else if (record.total_kesesuaian >= 101) record.ranking = 'III';
  else record.ranking = 'IV';

  const masalahScore = (parseInt(record.dirasakan, 10) || 0) + (parseInt(record.parah, 10) || 0) + (parseInt(record.hambat, 10) || 0) + (parseInt(record.sering, 10) || 0) + (parseInt(record.potensi_skor, 10) || 0);
  record.jumlah_nilai_total = masalahScore;
  record.uraian_peringkat = masalahScore >= 401 ? 'I' : masalahScore >= 301 ? 'II' : masalahScore >= 201 ? 'III' : masalahScore >= 101 ? 'IV' : 'V';

  return record;
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: node scripts/import-csv.js <file.csv>');
    process.exit(1);
  }

  const absolutePath = path.resolve(csvPath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`File tidak ditemukan: ${absolutePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(absolutePath, 'utf8');
  const rows = parseCsv(content);
  if (rows.length < 2) {
    console.error('File CSV harus memiliki paling sedikit 1 baris header dan 1 baris data.');
    process.exit(1);
  }

  const headerRow = rows.shift();
  const headerKeys = headerRow.map(mapHeader);

  const payloads = [];
  const prefixState = {};
  let skippedCount = 0;

  for (const [index, row] of rows.entries()) {
    if (row.every(cell => !cell || !cell.trim())) continue;
    try {
      const result = await buildPayload(row, headerKeys, prefixState);
      if (result.skip) {
        skippedCount += 1;
        console.log(`Baris ${index + 2} dilewati: ${result.reason}`);
        continue;
      }
      payloads.push(result);
    } catch (error) {
      console.error(`Error pada baris ${index + 2}: ${error.message}`);
      process.exit(1);
    }
  }

  console.log(`Menyiapkan ${payloads.length} baris untuk diimpor...`);
  if (skippedCount > 0) {
    console.log(`Melewati ${skippedCount} baris karena kode unik sudah ada atau duplikat.`);
  }

  const batchSize = 50;
  let imported = 0;

  for (let i = 0; i < payloads.length; i += batchSize) {
    const batch = payloads.slice(i, i + batchSize);
    const { data, error } = await supabase.from('rpjmdes_standar').insert(batch).select();
    if (error) {
      console.error('Gagal memasukkan batch:', error.message);
      process.exit(1);
    }

    const insertedCount = Array.isArray(data) ? data.length : batch.length;
    imported += insertedCount;
    console.log(`✔️ Batch ${Math.floor(i / batchSize) + 1}: ${insertedCount} baris disimpan.`);
  }

  console.log(`✅ Impor selesai: ${imported} baris masuk ke database.`);
}

main().catch(error => {
  console.error('Import gagal:', error.message);
  process.exit(1);
});
