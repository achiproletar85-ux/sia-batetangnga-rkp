// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const supabase = require('./backend/config/supabase');

const app = express();
const os = require('os');
const WRITABLE_BASE = process.env.USER_DATA_PATH || (process.env.VERCEL ? os.tmpdir() : __dirname);

const FRONTEND_PATH = path.resolve(__dirname, 'frontend');
const TEMPLATES_PATH = path.resolve(WRITABLE_BASE, 'templates');
const DOCUMEN_STORAGE_PATH = path.join(WRITABLE_BASE, 'backend', 'dokumen-desa-storage.json');
app.use(cors());
// ✅ INCREASE PAYLOAD LIMIT
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- GLOBAL MASTER CACHE UNTUK MENGURANGI SUPABASE EGRESS ---
const MasterCache = {
    rpjmdesStandar: null,
    lastFetch: 0
};
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 Jam

async function getCachedRpjmdesStandar() {
    const now = Date.now();
    if (MasterCache.rpjmdesStandar && (now - MasterCache.lastFetch) < CACHE_TTL_MS) {
        return MasterCache.rpjmdesStandar;
    }
    const { data } = await supabase.from('rpjmdes_standar').select('*'); // Ambil sekali saja per jam
    if (data && data.length > 0) {
        MasterCache.rpjmdesStandar = data;
        MasterCache.lastFetch = now;
    }
    return data || [];
}
// -----------------------------------------------------------

//  Frontend Middleware: Sajikan semua file statis dari folder 'frontend' dengan header NO-CACHE
app.use(express.static(FRONTEND_PATH, {
    etag: false,
    maxAge: 0,
    setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
}));

app.use((req, res, next) => {
    console.log(`➡️ ${req.method} ${req.url}`);
    next();
});

const uploadDir = path.join(WRITABLE_BASE, 'uploads', 'templates');
try {
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.mkdirSync(TEMPLATES_PATH, { recursive: true });
} catch (err) {
    console.warn('⚠️ Warning: Gagal membuat direktori upload:', err.message);
}


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const safeName = String(file.originalname || 'template').replace(/[^a-zA-Z0-9._-]/g, '-');
        cb(null, `${Date.now()}-${safeName}`);
    }
});
const upload = multer({ storage });

function ensureDokumenStorage() {
    return; // ✅ Penyimpanan lokal NONAKTIF — data hanya di Supabase
}

function readDokumenStoreFull() {
    return { documents: [], pakets: [], master_fields: {}, settings: {}, logs: [] };
}

function writeDokumenStoreFull(store) {
    return; // ✅ Penyimpanan lokal NONAKTIF — data hanya di Supabase
}

function readDokumenStorage() {
    return [];
}

function writeDokumenStorage(records) {
    return; // ✅ Penyimpanan lokal NONAKTIF — data hanya di Supabase
}

async function saveDokumenToSupabase(payload) {
    try {
        const { data, error } = await supabase.from('dokumen_desa').insert([payload]).select();
        if (!error && data) return { success: true, data: data[0] };
        return { success: false, error: error?.message || 'Supabase insert failed' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getDokumenFromSupabase(tahun) {
    try {
        const { data, error } = await supabase.from('dokumen_desa').select('*').eq('tahun', parseInt(tahun || '2027')).order('created_at', { ascending: true });
        if (!error && Array.isArray(data)) return data;
        return [];
    } catch (error) {
        return [];
    }
}

const RAB_TABLE = 'rab';

const RPJMDES_STORAGE_PATH = path.join(__dirname, 'backend', 'rpjmdes-storage.json');
function ensureRpjmdesStorage() {
    return; // ✅ Penyimpanan lokal NONAKTIF
}
function readRpjmdesStorage() {
    return {};
}
function writeRpjmdesStorage(data) {
    return; // ✅ Penyimpanan lokal NONAKTIF
}

function isTableMissingError(error) {
    const message = String(error?.message || '').toLowerCase();
    // common Postgres / PostgREST messages when a table is missing
    if (!message) return false;
    if (message.includes('does not exist')) return true;
    if (message.includes('no such table')) return true;
    if (message.includes('could not find the table')) return true;
    // also check for relation "public.<table>" does not exist patterns
    if (message.includes('relation') && message.includes('does not exist')) return true;
    return false;
}

function sortHierarchical(dataArray) {
    if (!Array.isArray(dataArray)) return dataArray;
    return dataArray.sort((a, b) => {
        const kBidA = String(a.kode_bidang || '').trim();
        const kBidB = String(b.kode_bidang || '').trim();
        if (kBidA !== kBidB && kBidA && kBidB) return kBidA.localeCompare(kBidB, undefined, { numeric: true, sensitivity: 'base' });

        const kSubA = String(a.kode_sub || a.kode_sub_bidang || a.kode_jenis_bidang || '').trim();
        const kSubB = String(b.kode_sub || b.kode_sub_bidang || b.kode_jenis_bidang || '').trim();
        if (kSubA !== kSubB && kSubA && kSubB) return kSubA.localeCompare(kSubB, undefined, { numeric: true, sensitivity: 'base' });

        const kKegA = String(a.kode_kegiatan || '').trim();
        const kKegB = String(b.kode_kegiatan || '').trim();
        if (kKegA !== kKegB && kKegA && kKegB) return kKegA.localeCompare(kKegB, undefined, { numeric: true, sensitivity: 'base' });

        const kUnikA = String(a.kode_unik_full || a.kode_unik || a.kode_klasifikasi || a.kode || '').trim();
        const kUnikB = String(b.kode_unik_full || b.kode_unik || b.kode_klasifikasi || b.kode || '').trim();
        return kUnikA.localeCompare(kUnikB, undefined, { numeric: true, sensitivity: 'base' });
    });
}

async function getRabFromDb(kode_unik_full, tahun) {
    const { data, error } = await supabase
        .from(RAB_TABLE)
        .select('*')
        .eq('kode_unik_full', kode_unik_full)
        .eq('tahun', tahun)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return null;
        }
        throw error;
    }
    return data;
}

// ============================================
// MERGE MASTER RANCANGAN_RKPDES + ANGGARAN DARI TABEL RAB
// Struktur & profil kegiatan diambil dari master rancangan_rkpdes,
// sedangkan nilai anggaran (volume, satuan, harga, jumlah, sumber_dana)
// ditarik dari tabel `rab`. Cocokkan berdasarkan kode_unik_full + tahun.
// ============================================
async function getMergedRkpRows(tahunInt, extraRabFields) {
    // ============================================================
    // SUMBER DATA UTAMA ADALAH TABEL `rab`
    // Sesuai permintaan pengguna, data tidak lagi digabung dari `rancangan_rkpdes`
    // untuk mencegah data "siluman" atau tidak konsisten.
    // Fungsi ini sekarang hanya mengambil data dari `rab` dan memformatnya.
    // ============================================================
    console.log(`[INFO] getMergedRkpRows dipanggil untuk tahun ${tahunInt}, hanya mengambil dari tabel 'rab'.`);

    const { data: rabData, error: rabError } = await supabase
        .from(RAB_TABLE)
        .select('*')
        .eq('tahun', tahunInt);

    if (rabError) {
        console.error(`[ERROR] Gagal mengambil data dari tabel 'rab':`, rabError.message);
        // Mengembalikan array kosong jika terjadi error agar tidak crash
        return [];
    }
    
    if (!rabData || rabData.length === 0) {
        console.log(`[INFO] Tidak ada data di tabel 'rab' untuk tahun ${tahunInt}.`);
        return [];
    }

    // Transformasi data RAB agar sesuai dengan struktur yang diharapkan oleh frontend.
    // Ini memastikan bahwa hanya data yang ada di RAB yang akan ditampilkan.
    const result = rabData.map(rab => {
        const rpjm = rab.rpjm_data || {};
        const merged = {
            // Kolom-kolom inti dari RAB
            id: rab.id,
            kode_unik_full: rab.kode_unik_full,
            kode_unik: rab.kode_unik,
            tahun: rab.tahun,
            uraian: rab.uraian || rab.nama_kegiatan || rpjm.nama_kegiatan || '',
            nama_kegiatan: rab.nama_kegiatan || rab.uraian || rpjm.nama_kegiatan || '',
            jenis_kegiatan: rab.jenis_kegiatan || rpjm.jenis_kegiatan || '',
            lokasi: rab.lokasi_kegiatan || rab.lokasi || rpjm.lokasi_kegiatan || 'Desa Batetangnga',
            lokasi_kegiatan: rab.lokasi_kegiatan || rab.lokasi || rpjm.lokasi_kegiatan || 'Desa Batetangnga',
            bidang: rab.bidang || rpjm.bidang || '',
            
            // Kolom Anggaran dari RAB (sumber tunggal)
            jumlah_anggaran: Number(rab.jumlah_anggaran || 0),
            volume: rab.volume ?? '',
            satuan: rab.satuan ?? '',
            harga_satuan: Number(rab.harga_satuan || 0),
            sumber_dana: rab.sumber_dana || '',
            items: rab.items && Array.isArray(rab.items) ? rab.items : [],

            // Kolom dari rpjm_data (jika ada) sebagai pelengkap, BUKAN sumber utama
            pola_pelaksanaan: rpjm.pola_pelaksanaan || 'Swakelola',
            waktu_pelaksanaan: rpjm.waktu_pelaksanaan || '12 Bulan',
            manfaat_l: rpjm.manfaat_l || 0,
            manfaat_p: rpjm.manfaat_p || 0,
            manfaat_rtm: rpjm.manfaat_rtm || 0,
            total_manfaat: rpjm.total_manfaat || 0,
            sdgs: rpjm.sdgs || '',

            // Kolom tambahan untuk UI
            prakiraan_biaya: Number(rab.jumlah_anggaran || 0), // Fallback
        };

        if (extraRabFields) {
            merged.anggaran_rab = Number(rab.jumlah_anggaran || 0);
            merged.volume_rab = rab.volume;
            merged.satuan_rab = rab.satuan;
            merged.harga_satuan_rab = Number(rab.harga_satuan || 0);
            merged.sumber_dana_rab = rab.sumber_dana;
            merged.have_rab = true; // Selalu true karena sumbernya adalah RAB
        }

        return merged;
    });

    return result;
}
async function saveRabToDb(record) {
    const safeKode = String(record.kode_unik || record.kode_unik_full || 'RAB-' + Date.now()).trim();
    const safeTahun = parseInt(record.tahun, 10) || 2027;
    const itemsArray = Array.isArray(record.items) ? record.items : [];

    const firstItem = itemsArray[0] || {};

    const totalBiaya = Number(record.jumlah_anggaran || record.total_biaya || record.total_rab || 0) || itemsArray.reduce((sum, it) => sum + (Number(it.jumlah) || 0), 0);
    const volumeVal = Number(record.volume || record.volume_rab || firstItem.volume || 1);
    const satuanVal = String(record.satuan || record.satuan_rab || firstItem.satuan || 'Paket');
    const hargaSatuanVal = Number(record.harga_satuan || record.harga_satuan_rab || firstItem.harga || totalBiaya);
    const uraianText = String(record.nama_kegiatan || record.uraian || firstItem.uraian || record.rpjm_data?.nama_kegiatan || 'Rincian RAB Kegiatan').trim();

    // Payload kanonik: satu kolom per makna (nama_kegiatan, uraian, volume, satuan,
    // harga_satuan, jumlah_anggaran, sumber_sumber). Backup kolom lama tetap dibaca saat
    // migrasi/fallback tetapi tidak lagi ditulis.
    if (!record.rpjm_data || typeof record.rpjm_data !== 'object') {
        record.rpjm_data = {};
    }
    const rd = record.rpjm_data;
    const dbPayload = {
        kode_unik: safeKode,
        kode_unik_full: String(record.kode_unik_full || safeKode).trim(),
        tahun: safeTahun,
        nama_kegiatan: uraianText,
        uraian: uraianText,
        // Profil lengkap kegiatan (dari rpjm_data / rpjmdes_standar) agar tersimpan utuh
        bidang: String(record.bidang || rd.bidang || rd.nama_bidang || '').trim(),
        status: String(record.status || rd.status || 'draft').trim(),
        group_nama: String(record.group_nama || firstItem.group || '').trim(),
        sub_group_nama: String(record.sub_group_nama || firstItem.subgroup || '').trim(),
        lokasi: String(record.lokasi || rd.lokasi_kegiatan || rd.lokasi || 'Desa Batetangnga').trim(),
        lokasi_kegiatan: String(record.lokasi_kegiatan || rd.lokasi_kegiatan || record.lokasi || '').trim(),
        jenis_kegiatan: String(record.jenis_kegiatan || rd.jenis_kegiatan || rd.nama_kegiatan || '').trim(),
        volume: volumeVal,
        satuan: satuanVal,
        harga_satuan: hargaSatuanVal,
        jumlah_anggaran: totalBiaya,
        sumber_dana: String(record.sumber_dana || record.sumber_dana_rab || rd.sumber_dana || firstItem.sumber || 'DDS'),
        items: itemsArray,
        rpjm_data: record.rpjm_data || {},
        saved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    try {
        // Cari baris yang sudah ada berdasarkan (kode_unik_full, tahun) tanpa
        // bergantung pada unique constraint. Jika ada → update by id; jika tidak → insert
        // dengan id eksplisit (kolom id tidak punya default di tabel hasil rebuild).
        const kodeFull = String(dbPayload.kode_unik_full || safeKode).trim();
        const { data: existingRows, error: selErr } = await supabase
            .from('rab')
            .select('id')
            .eq('kode_unik_full', kodeFull)
            .eq('tahun', safeTahun)
            .limit(1);

        if (selErr) {
            console.error("Supabase Error Details (select):", selErr);
            throw selErr;
        }

        let result;
        if (existingRows && existingRows.length > 0) {
            const { data: upd, error: updErr } = await supabase
                .from('rab')
                .update(dbPayload)
                .eq('id', existingRows[0].id)
                .select();
            if (updErr) {
                console.error("Supabase Error Details (update):", updErr);
                throw updErr;
            }
            result = Array.isArray(upd) && upd.length > 0 ? upd[0] : dbPayload;
        } else {
            const { data: maxRow } = await supabase
                .from('rab')
                .select('id')
                .order('id', { ascending: false })
                .limit(1);
            const nextId = (maxRow && maxRow[0] && Number(maxRow[0].id)) ? Number(maxRow[0].id) + 1 : 1;
            const { data: ins, error: insErr } = await supabase
                .from('rab')
                .insert([{ id: nextId, ...dbPayload }])
                .select();
            if (insErr) {
                console.error("Supabase Error Details (insert):", insErr);
                throw insErr;
            }
            result = Array.isArray(ins) && ins.length > 0 ? ins[0] : dbPayload;
        }

        // Also update total_rab in public.rpjmdes_standar for consistency.
        // Kolom kode_unik di rpjmdes_standar bernilai literal "null"; kecocokan
        // hanya valid lewat kode_unik_full (dengan titik akhir).
        try {
            const kodeFullRp = String(kodeFull || safeKode).trim();
            const { data: rpjmRows, error: rpjmSelErr } = await supabase
                .from('rpjmdes_standar')
                .select('id, kode_unik_full')
                .or(`kode_unik_full.eq.${kodeFullRp},kode_unik_h.eq.${kodeFullRp}`)
                .limit(1);
            if (rpjmSelErr) throw rpjmSelErr;
            if (rpjmRows && rpjmRows.length > 0) {
                await supabase
                    .from('rpjmdes_standar')
                    .update({
                        total_rab: totalBiaya,
                        volume_rab: volumeVal,
                        satuan_rab: satuanVal,
                        harga_satuan_rab: hargaSatuanVal,
                        uraian_rab: JSON.stringify(itemsArray),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', rpjmRows[0].id);
            }
        } catch (eRpjm) {
            console.warn('⚠️ Sync to rpjmdes_standar skipped:', eRpjm.message);
        }

        return result;
    } catch (err) {
        console.error("Supabase Error Details (Exception):", err);
        throw err;
    }
}

async function listRabsFromDb() {
    const { data, error } = await supabase
        .from(RAB_TABLE)
        .select('*')
        .order('kode_unik_full', { ascending: true });

    if (error) throw error;
    if (Array.isArray(data)) {
        sortHierarchical(data);
    }
    return data;
}

async function deleteRabFromDb(kode_unik_full, tahun) {
    const safeTahun = parseInt(tahun, 10) || 2027;
    const { data, error } = await supabase
        .from(RAB_TABLE)
        .delete()
        .eq('kode_unik_full', String(kode_unik_full).trim())
        .eq('tahun', safeTahun);

    if (error) {
        console.error("Supabase Error Details (deleteRabFromDb):", error);
        throw error;
    }
    return data;
}

// ---------------------- UNITS (satuan) ----------------------
const UNITS_TABLE = 'rab_units';
const UNITS_STORAGE_PATH = path.join(__dirname, 'backend', 'units-storage.json');

function ensureUnitsStorage() {
    return; // ✅ Penyimpanan lokal NONAKTIF
}

function readUnitsStorage() {
    return [];
}

function writeUnitsStorage(data) {
    return; // ✅ Penyimpanan lokal NONAKTIF
}

async function listUnitsFromDb() {
    const { data, error } = await supabase
        .from(UNITS_TABLE)
        .select('name')
        .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map(d => d.name).filter(Boolean);
}

async function saveUnitToDb(name) {
    const record = { name };
    const { data, error } = await supabase
        .from(UNITS_TABLE)
        .upsert([record], { onConflict: ['name'] })
        .select()
        .single();

    if (error) throw error;
    return data;
}

async function deleteUnitFromDb(name) {
    const { data, error } = await supabase
        .from(UNITS_TABLE)
        .delete()
        .eq('name', name);

    if (error) throw error;
    return data;
}



// ============================================================
// ========== TEMPLATE SETTINGS API (FIELDS & HEADERS) ========
// ============================================================

// ========== TEMPLATE CONFIG (FIELDS & TABLE HEADERS) — PERSISTEN DI SUPABASE ==========
// In-memory cache, di-seed dari Supabase saat server start, dan ditulis balik
// ke Supabase (kolom fields & table_headers) setiap kali ada perubahan.
const templateConfigCache = {};

async function seedTemplateConfigCache() {
    try {
        const { data, error } = await supabase
            .from('dokumen_templates')
            .select('code, fields, table_headers');
        if (error) throw error;
        for (const row of data || []) {
            if (row && row.code && (row.fields || row.table_headers)) {
                templateConfigCache[row.code] = {
                    fields: row.fields || [],
                    tableHeaders: row.table_headers || []
                };
            }
        }
        console.log(`🧠 TemplateConfig cache ter-seed: ${Object.keys(templateConfigCache).length} template`);
    } catch (e) {
        console.warn('⚠️ TemplateConfig seed gagal:', e.message);
    }
}
const DEFAULT_DOC_TABLE_HEADERS = {
    'DOC-02B': ['No', 'Nama', 'Tempat, Tanggal Lahir', 'Jabatan', 'Unsur'],
    'DOC-20': ['No', 'Nama Peserta', 'Alamat / Dusun', 'Jabatan / Unsur', 'Tanda Tangan'],
    'DOC-27': ['No', 'Jenis Kegiatan', 'Lokasi Kegiatan', 'Volume / Satuan', 'Pagu Indikatif (Rp)', 'Sumber Dana'],
    'DOC-34': ['No', 'Nama Tim Verifikasi', 'Jabatan / Instansi', 'Keterangan']
};

// Helper to get the specific template config (dari cache; fallback ke default).
function getTemplateSettings(docCode) {
    const codeUpper = String(docCode || '').toUpperCase();
    if (!templateConfigCache[codeUpper]) {
        templateConfigCache[codeUpper] = {
            fields: [
                { key: 'sk_tim', label: 'Nomor SK Tim', type: 'text' },
                { key: 'tahun', label: 'Tahun Anggaran', type: 'text' },
                { key: 'tgl_musdes_tim_hari', label: 'Hari & Tanggal Musdes', type: 'text' }
            ],
            tableHeaders: DEFAULT_DOC_TABLE_HEADERS[codeUpper] || []
        };
    }
    return templateConfigCache[codeUpper];
}

// Simpan config ke cache + Supabase (kolom fields & table_headers).
// Jika kolom belum ada di DB (PGRST204), data TETAP disimpan di cache (dipakai
// UI pada sesi ini) tapi dictandai persisted:false agar frontend bisa memberi tahu.
async function saveTemplateSettings(docCode, settings) {
    templateConfigCache[docCode] = settings;
    try {
        const { error } = await supabase
            .from('dokumen_templates')
            .upsert({
                code: docCode.toUpperCase(),
                fields: settings.fields || [],
                table_headers: settings.tableHeaders || [],
                updated_at: new Date().toISOString()
            }, { onConflict: 'code' });
        if (error) {
            const missingColumns = error.code === 'PGRST204' || /Could not find the 'fields' column/.test(error.message) || /Could not find the 'table_headers' column/.test(error.message);
            if (missingColumns) {
                console.warn(`⚠️ [Kolom] fields/table_headers belum ada di DB (${docCode}). Data hanya di cache. Jalankan supabase_add_template_config_columns.sql`);
                return { success: true, persisted: false, error: error.message };
            }
            return { success: false, error: error.message };
        }
        return { success: true, persisted: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}


// GET /api/templates/:code/fields
// Also serves as the main endpoint to get all settings for the modal
app.get('/api/templates/:code/fields', async (req, res) => {
    try {
        const { code } = req.params;
        const codeUpper = String(code).toUpperCase();

        const { data } = await supabase
            .from('dokumen_templates')
            .select('fields, table_headers')
            .eq('code', codeUpper)
            .maybeSingle();

        if (data && (Array.isArray(data.fields) && data.fields.length > 0 || Array.isArray(data.table_headers) && data.table_headers.length > 0)) {
            return res.json({
                success: true,
                fields: data.fields || [],
                tableHeaders: data.table_headers || []
            });
        }

        const settings = getTemplateSettings(codeUpper);
        res.json({
            success: true,
            fields: settings.fields || [],
            tableHeaders: settings.tableHeaders || []
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/templates/:code/fields (Add new field)
app.post('/api/templates/:code/fields', async (req, res) => {
    try {
        const { code } = req.params;
        const { key, label, type } = req.body;
        const codeUpper = String(code).toUpperCase();
        if (!key || !label) {
            return res.status(400).json({ success: false, message: 'Key and label are required.' });
        }

        const settings = getTemplateSettings(codeUpper);
        if (settings.fields.some(f => f.key === key)) {
            return res.status(400).json({ success: false, message: `Field with key "${key}" already exists.` });
        }

        const newField = { key, label, type: type || 'text' };
        settings.fields.push(newField);
        const saved = await saveTemplateSettings(codeUpper, settings);
        if (!saved.success) {
            return res.status(500).json({ success: false, message: `GAGAL simpan ke Supabase: ${saved.error}` });
        }

        res.status(201).json({ success: true, field: newField, persisted: !!saved.persisted, message: "Field added successfully." });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/templates/:code/fields (Update a single field's label)
app.put('/api/templates/:code/fields', async (req, res) => {
    try {
        const { code } = req.params;
        const { key, label } = req.body;
        const codeUpper = String(code).toUpperCase();
        if (!key || !label) {
            return res.status(400).json({ success: false, message: 'Key and label are required for update.' });
        }

        const settings = getTemplateSettings(codeUpper);
        const field = settings.fields.find(f => f.key === key);

        if (!field) {
            return res.status(404).json({ success: false, message: `Field with key "${key}" not found.` });
        }

        field.label = label;
        const saved = await saveTemplateSettings(codeUpper, settings);
        if (!saved.success) {
            return res.status(500).json({ success: false, message: `GAGAL simpan ke Supabase: ${saved.error}` });
        }

        res.json({ success: true, persisted: saved.persisted !== false, message: 'Field label updated successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// PUT /api/templates/:code/all (Save all changes at once to Supabase)
app.put('/api/templates/:code/all', async (req, res) => {
    try {
        const { code } = req.params;
        const { fields, tableHeaders } = req.body;
        const codeUpper = String(code).toUpperCase();

        if (!Array.isArray(fields) || !Array.isArray(tableHeaders)) {
            return res.status(400).json({ success: false, message: '`fields` and `tableHeaders` must be arrays.' });
        }

        const settings = getTemplateSettings(codeUpper);
        settings.fields = fields;
        settings.tableHeaders = tableHeaders;

        const saved = await saveTemplateSettings(codeUpper, settings);
        if (!saved.success) {
            return res.status(500).json({ success: false, message: `GAGAL simpan ke Supabase: ${saved.error}` });
        }

        res.json({
            success: true,
            persisted: true,
            message: `Konfigurasi template ${codeUpper} (fields & tableHeaders) berhasil disimpan permanen ke Supabase.`
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// GET /api/templates/:code/all (load fields & tableHeaders langsung dari Supabase)
app.get('/api/templates/:code/all', async (req, res) => {
    try {
        const { code } = req.params;
        const codeUpper = String(code).toUpperCase();

        const { data } = await supabase
            .from('dokumen_templates')
            .select('fields, table_headers')
            .eq('code', codeUpper)
            .maybeSingle();

        if (data && (Array.isArray(data.fields) && data.fields.length > 0 || Array.isArray(data.table_headers) && data.table_headers.length > 0)) {
            templateConfigCache[codeUpper] = {
                fields: data.fields || [],
                tableHeaders: data.table_headers || []
            };
            return res.json({
                success: true,
                fields: data.fields || [],
                tableHeaders: data.table_headers || []
            });
        }

        const settings = getTemplateSettings(codeUpper);
        res.json({
            success: true,
            fields: settings.fields || [],
            tableHeaders: settings.tableHeaders || []
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// DELETE /api/templates/:code/fields/:key
app.delete('/api/templates/:code/fields/:key', async (req, res) => {
    try {
        const { code, key } = req.params;
        const settings = getTemplateSettings(code);

        const initialLength = settings.fields.length;
        settings.fields = settings.fields.filter(f => f.key !== key);

        if (settings.fields.length === initialLength) {
            return res.status(404).json({ success: false, message: `Field "${key}" not found.` });
        }

        const saved = await saveTemplateSettings(code, settings);
        if (!saved.success) {
            return res.status(500).json({ success: false, message: `GAGAL simpan ke Supabase: ${saved.error}` });
        }

        res.json({ success: true, persisted: saved.persisted !== false, message: `Field "${key}" deleted.` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/templates/:code/table-header
app.get('/api/templates/:code/table-header', (req, res) => {
    try {
        const { code } = req.params;
        const settings = getTemplateSettings(code);
        res.json({ success: true, tableHeaders: settings.tableHeaders || [] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// PUT /api/templates/:code/table-header
app.put('/api/templates/:code/table-header', async (req, res) => {
    try {
        const { code } = req.params;
        const { tableHeaders } = req.body;

        if (!Array.isArray(tableHeaders)) {
            return res.status(400).json({ success: false, message: '`tableHeaders` must be an array.' });
        }

        const settings = getTemplateSettings(code);
        settings.tableHeaders = tableHeaders;
        const saved = await saveTemplateSettings(code, settings);
        if (!saved.success) {
            return res.status(500).json({ success: false, message: `GAGAL simpan ke Supabase: ${saved.error}` });
        }

        res.json({ success: true, persisted: saved.persisted !== false, message: 'Table headers updated.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message, message: 'Failed to update table headers.' });
    }
});


// ============================================================
// ========== TEST ENDPOINTS ===================================
// ============================================================

app.get('/api/test-db', async (req, res) => {
    try {
        const { data, error, count } = await supabase
            .from('rpjmdes_standar')
            .select('id', { count: 'exact' })
            .limit(1);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Koneksi Supabase berhasil!',
            totalData: count ?? data?.length ?? 0,
            sampleData: data?.[0] ?? null
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================
// ========== DROPDOWN ENDPOINTS ===============================
// ============================================================

app.get('/api/master-klasifikasi', async (req, res) => {
    try {
        let resultData = [];

        // 1. Query master_klasifikasi
        try {
            const { data, error } = await supabase
                .from('master_klasifikasi')
                .select('*');

            if (!error && Array.isArray(data) && data.length > 0) {
                resultData = data;
            }
        } catch (err1) {
            console.warn('⚠️ Query master_klasifikasi error:', err1.message);
        }

        // 2. Fallback to rpjmdes_standar if master_klasifikasi is empty/error
        if (!resultData || resultData.length === 0) {
            const { data, error } = await supabase
                .from('rpjmdes_standar')
                .select('kode_bidang, bidang, kode_sub, jenis_bidang, kode_kegiatan, jenis_kegiatan, kode_unik_full')
                .not('bidang', 'is', null);

            if (error) throw error;
            resultData = data || [];
        }

        if (Array.isArray(resultData)) {
            sortHierarchical(resultData);
        }

        res.json({ success: true, data: resultData || [] });
    } catch (err) {
        console.error('❌ Error /api/master-klasifikasi:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/bidang-list', (req, res) => {
    const ORDER_BIDANG = [
        "Bidang Penyelenggaraan Pemerintah Desa",
        "Bidang Pelaksanaan Pembangunan Desa",
        "Bidang Pembinaan Kemasyarakatan",
        "Bidang Pemberdayaan Masyarakat",
        "Bidang Penanggulangan Bencana, Darurat Dan Mendesak Desa"
    ];
    res.json({ success: true, data: ORDER_BIDANG });
});

app.get('/api/sdgs', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('dropdown_sdgs')
            .select('*')
            .order('no', { ascending: true });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.log('❌ Error /api/sdgs:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/sumber-dana', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('anggaran')
            .select('sumber')
            .order('id', { ascending: true });

        if (error) throw error;
        const sumberList = data.map(item => item.sumber).filter(Boolean);
        res.json({ success: true, data: sumberList });
    } catch (error) {
        console.log('❌ Error /api/sumber-dana:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// SUMBER DATA RAB: tarik langsung dari rpjmdes_standar
// rpjmdes_standar TIDAK punya kolom 'tahun'. Tahun ditentukan lewat
// kolom target_2023..target_2030 (berisi tahun "2027"/"2028" atau
// "Ya" = ditarik; "-"/kosong = tidak). Kirim SEMUA kolom agar
// frontend RAB dapat menyimpan data lengkap tanpa parsial.
// ============================================================
app.get('/api/rpjmdes-standar', async (req, res) => {
    try {
        const { tahun } = req.query;
        const tahunInt = parseInt(tahun) || 2027;
        console.log(`📡 GET /api/rpjmdes-standar?tahun=${tahunInt}`);

        const { data, error } = await supabase
            .from('rpjmdes_standar')
            .select('*');

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.json({ success: true, data: [], message: 'Data RPJMDes standar tidak ditemukan.' });
        }

        // Hanya kegiatan dengan nilai "Ya" atau teks tahun tsb di kolom
        // target_<TAHUN> yang dianggap ditarik (nilai Tidak/'-'/kosong = tidak).
        const filteredData = data.filter(item => isRpjmTargetDitarik(item, tahunInt));

        const resultData = filteredData.map(item => {
            const kodeUnik = (item.kode_unik && String(item.kode_unik) !== 'null')
                ? item.kode_unik
                : item.kode_unik_full;
            return {
                ...item,
                tahun: tahunInt,
                kode_unik: kodeUnik,
                kode_unik_full: String(item.kode_unik_full || kodeUnik || '').trim(),
                lokasi: item.lokasi_kegiatan || 'Desa Batetangnga',
                volume: item.volume_kegiatan || '1 Paket',
                prakiraan_biaya: parseFloat(item.pagu_rpjm || 0),
                sumber_pembiayaan: item.sumber_dana || '',
                uraian: item.nama_kegiatan || item.jenis_kegiatan || ''
            };
        });

        res.json({
            success: true,
            data: resultData,
            message: `Berhasil memuat ${resultData.length} kegiatan RPJMDes untuk tahun ${tahunInt}.`
        });
    } catch (err) {
        console.error('❌ Error GET /api/rpjmdes-standar:', err.message);
        res.status(500).json({ success: false, error: err.message, data: [] });
    }
});

// ============================================================
// DU-RKP DES API — tabel du_rkpdes, BERDIRI SENDIRI.
// Sumber data: rpjmdes_standar (tarik otomatis tahun terpilih +1,
// dan opsi manual dari tahun lain di modal). TIDAK tersambung
// ke tabel rpjmdes / rkpdes (sinkronisasi dibuat terputus).
// ============================================================

function compareKodeUnikFull(aKode, bKode) {
    const strA = String(aKode || '').trim();
    const strB = String(bKode || '').trim();
    if (!strA && !strB) return 0;
    if (!strA) return 1;
    if (!strB) return -1;
    const partsA = strA.split(/[\.\-\s]+/).filter(Boolean).map(p => parseInt(p, 10) || 0);
    const partsB = strB.split(/[\.\-\s]+/).filter(Boolean).map(p => parseInt(p, 10) || 0);
    const maxLen = Math.max(partsA.length, partsB.length);
    for (let i = 0; i < maxLen; i++) {
        const valA = partsA[i] !== undefined ? partsA[i] : 0;
        const valB = partsB[i] !== undefined ? partsB[i] : 0;
        if (valA !== valB) return valA - valB;
    }
    return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
}

function isRpjmTargetDitarik(item, tahun) {
    const targetCol = `target_${tahun}`;
    const val = String(item[targetCol] || '').trim();
    if (!val) return false;
    if (val.toLowerCase() === 'ya') return true;
    if (val === String(tahun)) return true;
    return false;
}

function duMapFromRancangan(row, tahunInt) {
    const biaya = Number(row.prakiraan_biaya || row.pagu_rpjm || 0);
    const laki = parseInt(row.manfaat_l ?? row.penerima_laki ?? 0, 10) || 0;
    const perempuan = parseInt(row.manfaat_p ?? row.penerima_perempuan ?? 0, 10) || 0;
    const rtm = parseInt(row.manfaat_rtm ?? row.penerima_rtm ?? 0, 10) || 0;
    const totalManfaat = row.total_manfaat || (laki + perempuan + rtm);
    const penerimaStr = totalManfaat > 0
        ? `${totalManfaat} Orang (${laki} L, ${perempuan} P, ${rtm} RTM)`
        : (row.penerima_manfaat || '-');

    return {
        tahun: tahunInt,
        kode_unik_full: String(row.kode_unik_full || row.kode_unik || '').trim(),
        kode_unik: String(row.kode_unik || '').trim(),
        bidang: row.bidang || row.jenis_bidang || 'Bidang Penyelenggaraan Pemerintahan Desa',
        jenis_bidang: row.jenis_bidang || row.sub_bidang || '',
        jenis_kegiatan: row.jenis_kegiatan || '',
        nama_kegiatan: row.nama_kegiatan || row.sub_kegiatan || row.jenis_kegiatan || '',
        sub_kegiatan: row.sub_kegiatan || row.nama_kegiatan || '',
        volume_satuan: row.volume_satuan || row.volume_kegiatan || '12 Bulan',
        volume: row.volume_satuan || row.volume_kegiatan || '12 Bulan',
        mendukung_sdgs: String(row.sdgs || row.mendukung_sdgs || '-'),
        data_eksisting: row.data_eksisting || row.data_existing || 'Perlu Peningkatan',
        lokasi: row.lokasi || row.lokasi_kegiatan || 'Desa Batetangnga',
        penerima_manfaat: penerimaStr,
        waktu_pelaksanaan: row.waktu_pelaksanaan || '12 Bulan',
        prakiraan_biaya: biaya,
        sumber_pembiayaan: row.sumber_pembiayaan || row.sumber_dana || 'ADD',
        pagu_rpjm: biaya,
        updated_at: new Date().toISOString()
    };
}

function duMapFromRpjmStandar(row, tahunInt) {
    const biaya = Number(row.pagu_rpjm || row.prakiraan_biaya || row.total_rab || row.biaya || 0);
    return {
        tahun: tahunInt,
        kode_unik_full: String(row.kode_unik_full || row.kode_unik || '').trim(),
        kode_unik: String(row.kode_unik || '').trim(),
        bidang: row.bidang || 'Bidang Penyelenggaraan Pemerintahan Desa',
        jenis_bidang: row.jenis_bidang || row.sub_kegiatan || '',
        jenis_kegiatan: row.jenis_kegiatan || '',
        nama_kegiatan: row.nama_kegiatan || row.jenis_kegiatan || '',
        sub_kegiatan: row.sub_kegiatan || '',
        volume_satuan: row.volume_satuan || '',
        mendukung_sdgs: row.mendukung_sdgs || row.sdgs || '-',
        data_eksisting: row.data_eksisting || row.data_existing || 'Perlu Peningkatan',
        lokasi: row.lokasi || row.lokasi_kegiatan || 'Desa Batetangnga',
        volume: row.volume || row.volume_kegiatan || '12 Bulan',
        penerima_manfaat: (row.total_manfaat !== null && row.total_manfaat !== undefined && String(row.total_manfaat).trim() !== '' && String(row.total_manfaat).trim() !== '0')
            ? String(row.total_manfaat)
            : String(row.penerima_manfaat || ''),
        waktu_pelaksanaan: row.waktu_pelaksanaan || '12 Bulan',
        prakiraan_biaya: biaya,
        sumber_pembiayaan: row.sumber_dana || row.sumber_pembiayaan || 'ADD',
        pagu_rpjm: biaya,
        updated_at: new Date().toISOString()
    };
}

// Cek apakah baris rpjmdes_standar di-TARIK untuk tahun tertentu.
// Aturan: kolom target_<TAHUN> bernilai "Ya" ATAU teks tahun itu
// (misal target_2027 = '2027') -> ditarik.
// Nilai "Tidak", "-", kosong, atau lainnya -> TIDAK ditarik.
app.get('/api/du-rkpdes', async (req, res) => {
    try {
        const { tahun } = req.query;
        const tahunInt = parseInt(tahun, 10) || (new Date().getFullYear() - 1);
        console.log(`📡 GET /api/du-rkpdes?tahun=${tahunInt}`);

        const { data, error } = await supabase
            .from('du_rkpdes')
            .select('*')
            .eq('tahun', tahunInt)
            .order('bidang', { ascending: true })
            .order('kode_unik_full', { ascending: true });
        if (error) throw error;

        // normalisasi nilai numerik agar konsisten dengan model frontend
        const mapped = (data || []).map(r => ({
            ...r,
            kode_unik_full: String(r.kode_unik_full || r.kode_unik || ''),
            prakiraan_biaya: Number(r.prakiraan_biaya || r.pagu_rpjm || 0),
            pagu_rpjm: Number(r.pagu_rpjm || r.prakiraan_biaya || 0)
        }));

        res.json({
            success: true,
            data: mapped,
            message: `Berhasil memuat ${mapped.length} usulan DU-RKPDes tahun ${tahunInt}.`
        });
    } catch (error) {
        console.error('❌ Error GET /api/du-rkpdes:', error.message);
        res.status(500).json({ success: false, error: error.message, data: [] });
    }
});

// POST /api/du-rkpdes -> simpan ulang seluruh daftar DU-RKPDes untuk tahun tsb (idempoten)
app.post('/api/du-rkpdes', async (req, res) => {
    try {
        const { tahun, data: rows } = req.body || {};
        const tahunInt = parseInt(tahun, 10);
        if (!tahunInt) {
            return res.status(400).json({ success: false, message: 'Parameter tahun diperlukan.' });
        }
        if (!Array.isArray(rows)) {
            return res.status(400).json({ success: false, message: 'Payload data[] diperlukan.' });
        }

        // Buang baris template/kosong (misl. 'Belum Ada Data')
        const validRows = rows.filter(r => {
            if (!r || typeof r !== 'object') return false;
            const nama = String(r.nama_kegiatan || r.jenis_kegiatan || '').trim();
            const bidang = String(r.bidang || '').trim();
            if (nama === '' && bidang === '') return false;
            if (String(bidang).includes('Belum Ada Data') || String(bidang).includes('⚠️')) return false;
            return true;
        });

        const payload = validRows.map(r => ({
            tahun: tahunInt,
            kode_unik_full: String(r.kode_unik_full || r.kode_unik || ''),
            kode_unik: String(r.kode_unik || ''),
            bidang: String(r.bidang || 'Bidang Penyelenggaraan Pemerintahan Desa'),
            jenis_bidang: String(r.jenis_bidang || ''),
            jenis_kegiatan: String(r.jenis_kegiatan || r.nama_kegiatan || ''),
            nama_kegiatan: String(r.nama_kegiatan || r.jenis_kegiatan || ''),
            sub_kegiatan: String(r.sub_kegiatan || ''),
            volume_satuan: String(r.volume_satuan || ''),
            mendukung_sdgs: String(r.mendukung_sdgs || '-'),
            data_eksisting: String(r.data_eksisting || ''),
            lokasi: String(r.lokasi || r.lokasi_kegiatan || 'Desa Batetangnga'),
            volume: String(r.volume || ''),
            penerima_manfaat: String(r.penerima_manfaat || ''),
            waktu_pelaksanaan: String(r.waktu_pelaksanaan || '12 Bulan'),
            prakiraan_biaya: Number(r.prakiraan_biaya || r.pagu_rpjm || r.biaya || 0),
            sumber_pembiayaan: String(r.sumber_pembiayaan || r.sumber_dana || 'ADD'),
            pagu_rpjm: Number(r.pagu_rpjm || r.prakiraan_biaya || r.biaya || 0),
            updated_at: new Date().toISOString()
        }));

        // hapus dulu data lama tahun tsb, lalu simpan ulang (idempotens)
        const { error: delErr } = await supabase
            .from('du_rkpdes')
            .delete()
            .eq('tahun', tahunInt);
        if (delErr) throw delErr;

        if (payload.length > 0) {
            const { error: insErr } = await supabase
                .from('du_rkpdes')
                .insert(payload);
            if (insErr) throw insErr;
        }

        res.json({
            success: true,
            message: `Data DU-RKPDes tahun ${tahunInt} berhasil disimpan (${payload.length} baris).`,
            count: payload.length
        });
    } catch (error) {
        console.error('❌ Error POST /api/du-rkpdes:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/du-rkpdes/tarik-rancangan?tahun=2027 -> ambil data sumber dari rancangan_rkpdes untuk DU-RKPDes
app.get('/api/du-rkpdes/tarik-rancangan', async (req, res) => {
    try {
        const { tahun } = req.query;
        const tahunInt = parseInt(tahun, 10) || 2027;
        console.log(`📡 GET /api/du-rkpdes/tarik-rancangan?tahun=${tahunInt}`);

        const { data, error } = await supabase
            .from('rancangan_rkpdes')
            .select('*')
            .eq('tahun', tahunInt)
            .order('kode_unik_full', { ascending: true });
        if (error) throw error;

        // Deduplikasi berdasarkan kode_unik_full / kode_unik
        const seenKode = new Set();
        const payload = [];
        for (const row of (data || [])) {
            const kode = String(row.kode_unik_full || row.kode_unik || '').trim();
            if (kode) {
                if (seenKode.has(kode)) continue;
                seenKode.add(kode);
            }
            payload.push(duMapFromRancangan(row, tahunInt));
        }

        res.json({
            success: true,
            data: payload,
            message: `Berhasil mengambil ${payload.length} kegiatan dari Rancangan RKPDes tahun ${tahunInt}.`
        });
    } catch (error) {
        console.error('❌ Error GET /api/du-rkpdes/tarik-rancangan:', error.message);
        res.status(500).json({ success: false, error: error.message, data: [] });
    }
});

// POST /api/du-rkpdes/sync -> tarik OTOMATIS dari rancangan_rkpdes
app.post('/api/du-rkpdes/sync', async (req, res) => {
    try {
        const { tahun } = req.body || {};
        const tahunTgt = parseInt(tahun, 10);
        if (!tahunTgt) {
            return res.status(400).json({ success: false, error: 'Parameter tahun diperlukan.' });
        }

        console.log(`📥 POST /api/du-rkpdes/sync (tarik dari rancangan_rkpdes tahun ${tahunTgt})`);

        const { data: rncData, error: rncErr } = await supabase
            .from('rancangan_rkpdes')
            .select('*')
            .eq('tahun', tahunTgt)
            .order('kode_unik_full', { ascending: true });
        if (rncErr) throw rncErr;

        // Deduplikasi berdasarkan kode_unik_full
        const seenKode = new Set();
        const uniqueRancangan = [];
        for (const item of (rncData || [])) {
            const kode = String(item.kode_unik_full || item.kode_unik || '').trim();
            if (kode) {
                if (seenKode.has(kode)) continue;
                seenKode.add(kode);
            }
            uniqueRancangan.push(item);
        }

        // Hapus data lama untuk tahun target, lalu isi ulang dari hasil sinkron
        const { error: delErr } = await supabase
            .from('du_rkpdes')
            .delete()
            .eq('tahun', tahunTgt);
        if (delErr) throw delErr;

        let count = 0;
        if (uniqueRancangan.length > 0) {
            const payload = uniqueRancangan.map(row => duMapFromRancangan(row, tahunTgt));
            const { error: insErr } = await supabase.from('du_rkpdes').insert(payload);
            if (insErr) throw insErr;
            count = payload.length;
        }

        res.json({
            success: true,
            message: `Berhasil menarik ${count} kegiatan dari Rancangan RKPDes tahun ${tahunTgt} ke DU-RKPDes.`,
            count,
            source_kegiatan: count
        });
    } catch (error) {
        console.error('❌ Error POST /api/du-rkpdes/sync:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// PRIORITAS USULAN RENCANA PROGRAM/KEGIATAN (5 BIDANG WAJIB)
// API untuk tabel prioritas_usulan. Sumber: rpjmdes_standar.
// Aturan tarik: tahun terpilih sama dengan kolom target_<TAHUN>
// (mis. tahun 2027 -> isRpiMtargetDitarik(item, 2027)).
// ============================================================

const NAMA_BIDANG_PRIORITAS_5 = [
    "Bidang Penyelenggaraan Pemerintahan Desa",
    "Bidang Pelaksanaan Pembangunan Desa",
    "Bidang Pembinaan Kemasyarakatan",
    "Bidang Pemberdayaan Masyarakat",
    "Bidang Penanggulangan Bencana, Keadaan Darurat dan Mendesak Desa"
];

function namaBidangPrioritas(bidangNum) {
    const n = parseInt(bidangNum, 10);
    return (n >= 1 && n <= 5) ? NAMA_BIDANG_PRIORITAS_5[n - 1] : String(bidangNum || 'Bidang Penyelenggaraan Pemerintahan Desa');
}

function totalManfaatPrioritas(penerimaLaki, penerimaPerempuan, penerimaRtm) {
    return (parseInt(penerimaLaki, 10) || 0) + (parseInt(penerimaPerempuan, 10) || 0) + (parseInt(penerimaRtm, 10) || 0);
}

// Map payload (format frontend) -> kolom tabel prioritas_usulan
function buildPrioritasInsertItem(r, tahunInt) {
    const nama = String(r.sub_kegiatan || r.nama_kegiatan || r.kegiatan || '').trim();
    const laki = parseInt(r.penerima_laki ?? r.manfaat_l ?? 0, 10) || 0;
    const perempuan = parseInt(r.penerima_perempuan ?? r.manfaat_p ?? 0, 10) || 0;
    const rtm = parseInt(r.penerima_rtm ?? r.manfaat_rtm ?? 0, 10) || 0;
    return {
        tahun: tahunInt,
        kode_unik_full: String(r.kode_unik_full || r.kode_unik || '').trim(),
        kode_unik: String(r.kode_unik || '').trim(),
        no_urut: (r.no_urut !== undefined && r.no_urut !== null) ? parseInt(r.no_urut, 10) : null,
        nama_kegiatan: nama,
        jenis_bidang: String(r.jenis_bidang || r.sub_bidang || ''),
        jenis_kegiatan: String(r.jenis_kegiatan || r.kelompok_kegiatan || ''),
        urutan_prioritas: String(r.urutan_prioritas || r.rangking || ''),
        skala_prioritas: String(r.skala_prioritas || ''),
        bidang: namaBidangPrioritas(r.bidang),
        data_existing: String(r.data_eksisting || r.data_existing || ''),
        lokasi_kegiatan: String(r.lokasi || r.lokasi_kegiatan || 'Desa Batetangnga'),
        volume_kegiatan: String(r.volume_satuan || r.volume || r.volume_kegiatan || ''),
        waktu_pelaksanaan: String(r.waktu_pelaksanaan || ''),
        sdgs: String(r.mendukung_sdgs || r.sdgs || ''),
        manfaat_l: laki,
        manfaat_p: perempuan,
        manfaat_rtm: rtm,
        total_manfaat: totalManfaatPrioritas(laki, perempuan, rtm),
        sumber_dana: String(r.sumber_pembiayaan || r.sumber_dana || 'ADD'),
        pagu_rpjm: Number(r.prakiraan_biaya ?? r.pagu_rpjm ?? 0),
        updated_at: new Date().toISOString()
    };
}

// GET /api/prioritas-usulan?tahun=N -> daftar prioritas usulan tahun tsb
app.get('/api/prioritas-usulan', async (req, res) => {
    try {
        const { tahun } = req.query;
        const tahunInt = parseInt(tahun, 10) || (new Date().getFullYear());
        console.log(`📡 GET /api/prioritas-usulan?tahun=${tahunInt}`);

        const { data, error } = await supabase
            .from('prioritas_usulan')
            .select('*')
            .eq('tahun', tahunInt)
            .order('bidang', { ascending: true })
            .order('kode_unik_full', { ascending: true });
        if (error) throw error;

        const mapped = (data || []).map(r => ({
            ...r,
            kode_unik_full: String(r.kode_unik_full || r.kode_unik || ''),
            prakiraan_biaya: Number(r.pagu_rpjm || r.prakiraan_biaya || 0),
            pagu_rpjm: Number(r.pagu_rpjm || r.prakiraan_biaya || 0)
        }));

        res.json({
            success: true,
            data: mapped,
            message: `Berhasil memuat ${mapped.length} usulan Prioritas tahun ${tahunInt}.`
        });
    } catch (error) {
        console.error('❌ Error GET /api/prioritas-usulan:', error.message);
        res.status(500).json({ success: false, error: error.message, data: [] });
    }
});

// POST /api/prioritas-usulan/sync -> replace-all utk tahun tsb (idempoten)
app.post('/api/prioritas-usulan/sync', async (req, res) => {
    try {
        const { tahun, data: rows } = req.body || {};
        const tahunInt = parseInt(tahun, 10);
        if (!tahunInt) {
            return res.status(400).json({ success: false, message: 'Parameter tahun diperlukan.' });
        }
        if (!Array.isArray(rows)) {
            return res.status(400).json({ success: false, message: 'Payload data[] diperlukan.' });
        }

        const validRows = rows.filter(r => {
            if (!r || typeof r !== 'object') return false;
            const nama = String(r.sub_kegiatan || r.nama_kegiatan || '').trim();
            const bidang = String(r.bidang || '').trim();
            if (nama === '' && bidang === '') return false;
            if (String(bidang).includes('Belum Ada Data') || String(bidang).includes('⚠️')) return false;
            return true;
        });

        const payload = validRows.map(r => buildPrioritasInsertItem(r, tahunInt));

        const { error: delErr } = await supabase
            .from('prioritas_usulan')
            .delete()
            .eq('tahun', tahunInt);
        if (delErr) throw delErr;

        let inserted = 0;
        if (payload.length > 0) {
            const { error: insErr } = await supabase.from('prioritas_usulan').insert(payload);
            if (insErr) throw insErr;
            inserted = payload.length;
        }

        res.json({
            success: true,
            message: `Berhasil menyimpan ${inserted} usulan Prioritas tahun ${tahunInt}.`,
            count: inserted
        });
    } catch (error) {
        console.error('❌ Error POST /api/prioritas-usulan/sync:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/prioritas-usulan/tarik-rpjm?tahun=N -> usulan dari rpjmdes_standar
// Aturan: tarik kegiatan rpdesStandar yang di-TARIK utk tahun N (kolom target_N)
app.get('/api/prioritas-usulan/tarik-rpjm', async (req, res) => {
    try {
        const { tahun } = req.query;
        const tahunInt = parseInt(tahun, 10);
        if (!tahunInt) {
            return res.status(400).json({ success: false, error: 'Parameter tahun dibutuhkan.' });
        }
        console.log(`📡 GET /api/prioritas-usulan/tarik-rpjm?tahun=${tahunInt}`);

        const data = await getCachedRpjmdesStandar();
        const error = null;

        const filtered = (data || []).filter(item => isRpjmTargetDitarik(item, tahunInt));
        const payload = filtered.map(row => buildPrioritasInsertItem(row, tahunInt));

        res.json({
            success: true,
            data: payload,
            message: `Berhasil menarik ${payload.length} usulan dari RPJMDes untuk tahun ${tahunInt}.`
        });
    } catch (error) {
        console.error('❌ Error GET /api/prioritas-usulan/tarik-rpjm:', error.message);
        res.status(500).json({ success: false, error: error.message, data: [] });
    }
});

// PUT /api/prioritas-usulan -> update 1 baris per id
app.put('/api/prioritas-usulan', async (req, res) => {
    try {
        const item = req.body || {};
        if (!item.id) {
            return res.status(400).json({ success: false, message: 'Parameter id diperlukan.' });
        }
        const id = parseInt(item.id, 10);
        if (!id) {
            return res.status(400).json({ success: false, message: 'id tidak valid.' });
        }
        const patch = buildPrioritasInsertItem(item, parseInt(item.tahun, 10) || (new Date().getFullYear()));
        patch.updated_at = new Date().toISOString();
        delete patch.tahun;

        const { error } = await supabase.from('prioritas_usulan').update(patch).eq('id', id);
        if (error) throw error;

        res.json({ success: true, message: 'baris prioritas usulan berhasil diupdate.' });
    } catch (error) {
        console.error('❌ Error PUT /api/prioritas-usulan:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/prioritas-usulan?id=xxx
app.delete('/api/prioritas-usulan', async (req, res) => {
    try {
        const { id } = req.query;
        const idInt = parseInt(id, 10);
        if (!idInt) {
            return res.status(400).json({ success: false, message: 'Parameter id diperlukan.' });
        }
        const { error } = await supabase.from('prioritas_usulan').delete().eq('id', idInt);
        if (error) throw error;
        res.json({ success: true, message: 'baris prioritas berhasil dihapus.' });
    } catch (error) {
        console.error('❌ Error DELETE /api/prioritas-usulan:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// RANCANGAN RKPDes & PRIORITAS RKPDes (SKORING/LIVE EDIT)
// Frontend: rancangan-rkpdes.html + prioritas.html
// ============================================================

function extractRancanganBidangNum(item) {
    if (!item) return 1;
    const k = String(item.kode_unik || item.kode_unik_full || item.kode_kegiatan || item.kode_sub || item.kode_bidang || '').trim();
    const m = k.match(/^\s*0?([1-5])\./);
    if (m) return parseInt(m[1], 10);
    const n = parseInt(item.bidang ?? item.bidang_pos ?? item.bidang_ke, 10);
    if (!isNaN(n) && n >= 1 && n <= 5) return n;
    const t = String(item.bidang || item.nama_bidang || item.jenis_bidang || '').toLowerCase();
    if (t.includes('pembangunan')) return 2;
    if (t.includes('pembinaan') || t.includes('kemasyarakatan')) return 3;
    if (t.includes('pemberdayaan')) return 4;
    if (t.includes('bencana') || t.includes('darurat') || t.includes('mendesak')) return 5;
    return 1;
}
const extractRancangBidangNum = extractRancanganBidangNum;

// Persiapkan row INSERT tabel rancangan_rkpdes dari payload frontend
// (rancanganList: obj {bidang:1-5, jenis_bidang, jenis_kegiatan, sub_kegiatan,
//  mendukung_sdgs, data_eksisting, lokasi, volume_satuan, penerima_laki/p/perempuan/rtm,
//  prakiraan_biaya, sumber_pembiayaan, kode_* ...}).
function buildRancanganInsertItem(r, tahunInt) {
    const laki = parseInt(r.penerima_laki ?? r.manfaat_l ?? 0, 10) || 0;
    const perempuan = parseInt(r.penerima_perempuan ?? r.manfaat_p ?? 0, 10) || 0;
    const rtm = parseInt(r.penerima_rtm ?? r.manfaat_rtm ?? 0, 10) || 0;
    const noBidang = extractRancanganBidangNum(r);
    const kodeFull = String(r.kode_unik_full || r.kode_unik || '').trim();
    return {
        tahun: tahunInt,
        bidang: noBidang,
        kode_bidang: String(kodeFull.split('.')[0] + '.' || `0${noBidang}.`),
        kode_sub: String(r.kode_sub || (kodeFull.split('.')[1] ? kodeFull.split('.')[0] + '.' + kodeFull.split('.')[1] : '')),
        kode_kegiatan: String(r.kode_kegiatan || ''),
        kode_unik: String(r.kode_unik || kodeFull),
        kode_unik_full: kodeFull || String(r.kode_unik || ''),
        bidang: noBidang,
        jenis_bidang: String(r.jenis_bidang || r.sub_bidang || namaBidangPrioritas(noBidang)),
        jenis_kegiatan: String(r.jenis_kegiatan || r.kelompok_kegiatan || ''),
        nama_kegiatan: String(r.nama_kegiatan || r.sub_kegiatan || r.jenis_kegiatan || ''),
        sub_kegiatan: String(r.sub_kegiatan || r.nama_kegiatan || ''),
        mendukung_sdgs: String(r.mendukung_sdgs || r.sdgs || '-').replace(/[^0-9]/g, '') || '-',
        sdgs: String(r.mendukung_sdgs || r.sdgs || '').replace(/[^0-9]/g, '') || '-',
        data_eksisting: String(r.data_eksisting || r.data_existing || 'Perlu Peningkatan'),
        data_existing: String(r.data_eksisting || r.data_existing || 'Perlu Peningkatan'),
        lokasi: String(r.lokasi || r.lokasi_kegiatan || 'Desa Batetangnga'),
        lokasi_kegiatan: String(r.lokasi || r.lokasi_kegiatan || 'Desa Batetangnga'),
        volume_satuan: String(r.volume_satuan || r.volume_kegiatan || (r.volume ? `${r.volume} ${r.satuan || ''}`.trim() : '12 Bulan')),
        volume_kegiatan: String(r.volume_satuan || r.volume_kegiatan || (r.volume ? `${r.volume} ${r.satuan || ''}`.trim() : '12 Bulan')),
        penerima_laki: laki,
        penerima_perempuan: perempuan,
        penerima_rtm: rtm,
        manfaat_l: laki,
        manfaat_p: perempuan,
        manfaat_rtm: rtm,
        total_manfaat: laki + perempuan + rtm,
        prakiraan_biaya: Number(r.prakiraan_biaya ?? r.pagu_rpjm ?? 0),
        pagu_rpjm: Number(r.prakiraan_biaya ?? r.pagu_rpjm ?? 0),
        sumber_pembiayaan: String(r.sumber_pembiayaan || r.sumber_dana || 'ADD'),
        sumber_dana: String(r.sumber_pembiayaan || r.sumber_dana || 'ADD'),
        waktu_pelaksanaan: String(r.waktu_pelaksanaan || '12 Bulan'),
        updated_at: new Date().toISOString()
    };
}

// GET /api/rancangan-rkpdes?tahun=N -> daftar baris tabel rancangan_rkpdes
app.get('/api/rancangan-rkpdes', async (req, res) => {
    try {
        const { tahun } = req.query;
        const tahunInt = parseInt(tahun, 10) || (new Date().getFullYear());
        console.log(`📡 GET /api/rancangan-rkpdes?tahun=${tahunInt}`);

        const { data, error } = await supabase
            .from('rancangan_rkpdes')
            .select('*')
            .eq('tahun', tahunInt)
            .order('kode_unik_full', { ascending: true });
        if (error) throw error;

        res.json({
            success: true,
            data: data || [],
            message: `Berhasil memuat ${(data || []).length} baris Rancangan RKPDes tahun ${tahunInt}.`
        });
    } catch (error) {
        console.error('❌ Error GET /api/rancangan-rkpdes:', error.message);
        res.status(500).json({ success: false, error: error.message, data: [] });
    }
});

// GET /api/rancangan-rkpdes/tarik-rpjm?tahun=N -> tarik dari rpjmdes_standar berdasarkan target_N
app.get('/api/rancangan-rkpdes/tarik-rpjm', async (req, res) => {
    try {
        const { tahun } = req.query;
        const tahunInt = parseInt(tahun, 10);
        if (!tahunInt) {
            return res.status(400).json({ success: false, error: 'Parameter tahun dibutuhkan.', data: [] });
        }
        console.log(`📡 GET /api/rancangan-rkpdes/tarik-rpjm?tahun=${tahunInt}`);

        const { data, error } = await supabase
            .from('rpjmdes_standar')
            .select('*')
            .order('kode_unik_full', { ascending: true });
        if (error) throw error;

        const filtered = (data || []).filter(item => isRpjmTargetDitarik(item, tahunInt));

        const payload = filtered.map(row => {
            const laki = parseInt(row.manfaat_l ?? row.penerima_laki ?? 0, 10) || 0;
            const perempuan = parseInt(row.manfaat_p ?? row.penerima_perempuan ?? 0, 10) || 0;
            const rtm = parseInt(row.manfaat_rtm ?? row.penerima_rtm ?? 0, 10) || 0;
            const noBidang = extractRancangBidangNum(row);
            const kodeFull = String(row.kode_unik_full || row.kode_unik || '').trim();
            const biaya = Number(row.pagu_rpjm ?? row.prakiraan_biaya ?? row.total_rab ?? 0);

            return {
                id: null,
                tahun: tahunInt,
                bidang: noBidang,
                kode_bidang: row.kode_bidang || `0${noBidang}.`,
                kode_sub: row.kode_sub || '',
                kode_kegiatan: row.kode_kegiatan || '',
                kode_unik: row.kode_unik || kodeFull,
                kode_unik_full: kodeFull,
                jenis_bidang: row.jenis_bidang || row.sub_bidang || '',
                jenis_kegiatan: row.jenis_kegiatan || '',
                nama_kegiatan: row.nama_kegiatan || row.sub_kegiatan || row.jenis_kegiatan || '',
                sub_kegiatan: row.nama_kegiatan || row.sub_kegiatan || row.jenis_kegiatan || '',
                mendukung_sdgs: String(row.sdgs || row.mendukung_sdgs || '-').replace(/[^0-9]/g, '') || '-',
                sdgs: String(row.sdgs || row.mendukung_sdgs || '-').replace(/[^0-9]/g, '') || '-',
                data_eksisting: row.data_existing || row.data_eksisting || 'Perlu Peningkatan',
                data_existing: row.data_existing || row.data_eksisting || 'Perlu Peningkatan',
                lokasi: row.lokasi_kegiatan || row.lokasi || 'Desa Batetangnga',
                lokasi_kegiatan: row.lokasi_kegiatan || row.lokasi || 'Desa Batetangnga',
                volume_satuan: row.volume_kegiatan || row.volume_satuan || row.volume || '12 Bulan',
                volume_kegiatan: row.volume_kegiatan || row.volume_satuan || row.volume || '12 Bulan',
                volume: row.volume || row.volume_kegiatan || '',
                penerima_laki: laki,
                penerima_perempuan: perempuan,
                penerima_rtm: rtm,
                manfaat_l: laki,
                manfaat_p: perempuan,
                manfaat_rtm: rtm,
                total_manfaat: laki + perempuan + rtm,
                prakiraan_biaya: biaya,
                pagu_rpjm: biaya,
                sumber_pembiayaan: row.sumber_dana || row.sumber_pembiayaan || 'ADD',
                sumber_dana: row.sumber_dana || row.sumber_pembiayaan || 'ADD',
                waktu_pelaksanaan: row.waktu_pelaksanaan || '12 Bulan',
                id_rpjm_ref: row.id || null
            };
        });

        res.json({
            success: true,
            data: payload,
            message: `Berhasil menarik ${payload.length} kegiatan dari RPJMDes Standar untuk Rancangan RKPDes tahun ${tahunInt}.`
        });
    } catch (error) {
        console.error('❌ Error GET /api/rancangan-rkpdes/tarik-rpjm:', error.message);
        res.status(500).json({ success: false, error: error.message, data: [] });
    }
});

// GET /api/rancangan-rkpdes/tarik-prioritas?tahun=N -> tarik dari prioritas_usulan
app.get('/api/rancangan-rkpdes/tarik-prioritas', async (req, res) => {
    try {
        const { tahun } = req.query;
        const tahunInt = parseInt(tahun, 10);
        if (!tahunInt) {
            return res.status(400).json({ success: false, error: 'Parameter tahun dibutuhkan.', data: [] });
        }
        console.log(`📡 GET /api/rancangan-rkpdes/tarik-prioritas?tahun=${tahunInt}`);

        const { data, error } = await supabase
            .from('prioritas_usulan')
            .select('*')
            .eq('tahun', tahunInt)
            .order('kode_unik_full', { ascending: true });
        if (error) throw error;

        const payload = (data || []).map(row => ({
            id: null,
            tahun: tahunInt,
            bidang: extractRancanganBidangNum(row),
            kode_bidang: row.kode_bidang || `0${extractRancanganBidangNum(row)}.`,
            kode_sub: row.kode_sub || '',
            kode_kegiatan: row.kode_kegiatan || '',
            kode_unik: row.kode_unik || row.kode_unik_full || '',
            kode_unik_full: String(row.kode_unik_full || row.kode_unik || ''),
            jenis_bidang: row.jenis_bidang || row.sub_bidang || '',
            jenis_kegiatan: row.jenis_kegiatan || '',
            nama_kegiatan: row.nama_kegiatan || row.jenis_kegiatan || '',
            sub_kegiatan: row.nama_kegiatan || row.sub_kegiatan || '',
            mendukung_sdgs: String(row.sdgs || row.mendukung_sdgs || '-').replace(/[^0-9]/g, '') || '-',
            sdgs: String(row.sdgs || row.mendukung_sdgs || '-').replace(/[^0-9]/g, '') || '-',
            data_eksisting: row.data_existing || row.data_eksisting || 'Perlu Peningkatan',
            data_existing: row.data_existing || row.data_eksisting || 'Perlu Peningkatan',
            lokasi: row.lokasi_kegiatan || row.lokasi || 'Desa Batetangnga',
            lokasi_kegiatan: row.lokasi_kegiatan || row.lokasi || 'Desa Batetangnga',
            volume_satuan: row.volume_kegiatan || row.volume || row.volume_satuan || '12 Bulan',
            volume_kegiatan: row.volume_kegiatan || row.volume || row.volume_satuan || '12 Bulan',
            volume: row.volume || row.volume_kegiatan || '',
            penerima_laki: parseInt(row.manfaat_l ?? 0, 10) || 0,
            penerima_perempuan: parseInt(row.manfaat_p ?? 0, 10) || 0,
            penerima_rtm: parseInt(row.manfaat_rtm ?? 0, 10) || 0,
            manfaat_l: parseInt(row.manfaat_l ?? 0, 10) || 0,
            manfaat_p: parseInt(row.manfaat_p ?? 0, 10) || 0,
            manfaat_rtm: parseInt(row.manfaat_rtm ?? 0, 10) || 0,
            total_manfaat: parseInt(row.total_manfaat ?? ((parseInt(row.manfaat_l ?? 0, 10) || 0) + (parseInt(row.manfaat_p ?? 0, 10) || 0) + (parseInt(row.manfaat_rtm ?? 0, 10) || 0)), 10),
            prakiraan_biaya: Number(row.pagu_rpjm ?? row.prakiraan_biaya ?? 0),
            pagu_rpjm: Number(row.pagu_rpjm ?? row.prakiraan_biaya ?? 0),
            sumber_pembiayaan: row.sumber_dana || 'ADD',
            sumber_dana: row.sumber_dana || 'ADD',
            waktu_pelaksanaan: row.waktu_pelaksanaan || '12 Bulan',
            skor_kewenangan: Number(row.skor_kewenangan ?? row.visi_misi ?? 0),
            skor_sdgs: Number(row.skor_sdgs ?? row.pokok_bpd ?? 0),
            skor_kabupaten: Number(row.skor_kabupaten ?? row.program_masyarakat ?? 0),
            skor_sumber_daya: Number(row.skor_sumber_daya ?? row.prioritas_sdgs_skor ?? 0),
            total_skor: Number(row.total_skor ?? 0),
            ranking: row.ranking || ''
        }));

        res.json({
            success: true,
            data: payload,
            message: `Berhasil menarik ${payload.length} usulan dari modul Prioritas Usulan untuk Rancangan RKPDes tahun ${tahunInt}.`
        });
    } catch (error) {
        console.error('❌ Error GET /api/rancangan-rkpdes/tarik-prioritas:', error.message);
        res.status(500).json({ success: false, error: error.message, data: [] });
    }
});

// POST /api/rancangan-rkpdes/sync -> replace-all utk tahun tsb (idempoten)
app.post('/api/rancangan-rkpdes/sync', async (req, res) => {
    try {
        const { tahun, data: rows } = req.body || {};
        const tahunInt = parseInt(tahun, 10);
        if (!tahunInt) {
            return res.status(400).json({ success: false, message: 'Parameter tahun diperlukan.' });
        }
        
        let sourceRows = rows;
        if (!Array.isArray(sourceRows) || sourceRows.length === 0) {
            const { data: rpjmData, error: rpjmErr } = await supabase
                .from('rpjmdes_standar')
                .select('*')
                .order('kode_unik_full', { ascending: true });
            if (rpjmErr) throw rpjmErr;
            sourceRows = (rpjmData || []).filter(item => isRpjmTargetDitarik(item, tahunInt));
        }

        const seenKodeSync = new Set();
        const validRows = [];
        for (const r of sourceRows) {
            if (!r || typeof r !== 'object') continue;
            const nama = String(r.sub_kegiatan || r.nama_kegiatan || r.jenis_kegiatan || '').trim();
            const bidang = extractRancanganBidangNum(r);
            if (nama === '' && !bidang) continue;
            if (String(r.bidang || '').includes('Belum Ada Data') || String(r.bidang || '').includes('⚠️')) continue;

            const kode = String(r.kode_unik_full || r.kode_unik || '').trim();
            if (kode) {
                if (seenKodeSync.has(kode)) continue;
                seenKodeSync.add(kode);
            }
            validRows.push(r);
        }

        validRows.sort((a, b) => compareKodeUnikFull(a.kode_unik_full || a.kode_unik, b.kode_unik_full || b.kode_unik));

        const { error: delErr } = await supabase
            .from('rancangan_rkpdes')
            .delete()
            .eq('tahun', tahunInt);
        if (delErr) throw delErr;

        let inserted = 0;
        if (validRows.length > 0) {
            const payload = validRows.map(r => buildRancanganInsertItem(r, tahunInt));
            const { error: insErr } = await supabase
                .from('rancangan_rkpdes')
                .insert(payload);
            if (insErr) throw insErr;
            inserted = payload.length;
        }

        res.json({
            success: true,
            message: `Berhasil menarik ${inserted} baris Rancangan RKPDes tahun ${tahunInt}.`,
            count: inserted
        });
    } catch (error) {
        console.error('❌ Error POST /api/rancangan-rkpdes/sync:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/rancangan-rkpdes?id=xxx (uuid)
app.delete('/api/rancangan-rkpdes', async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ success: false, message: 'Parameter id diperlukan.' });
        }
        const { error } = await supabase
            .from('rancangan_rkpdes')
            .delete()
            .eq('id', id);
        if (error) throw error;
        res.json({ success: true, message: 'baris Rancangan berhasil dihapus.' });
    } catch (error) {
        console.error('❌ Error DELETE /api/rancangan-rkpdes:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/prioritas-rkpdes/tarik-rancangan?tahun=2027 -> tarik data dari tabel rancangan_rkpdes
app.get('/api/prioritas-rkpdes/tarik-rancangan', async (req, res) => {
    try {
        const { tahun } = req.query;
        const tahunInt = parseInt(tahun, 10) || (new Date().getFullYear());
        console.log(`📡 GET /api/prioritas-rkpdes/tarik-rancangan?tahun=${tahunInt}`);

        const { data, error } = await supabase
            .from('rancangan_rkpdes')
            .select('*')
            .eq('tahun', tahunInt);
        if (error) throw error;

        const seenKode = new Set();
        const validRows = [];
        (data || []).forEach(r => {
            const kode = String(r.kode_unik_full || r.kode_unik || '').trim();
            if (kode) {
                if (seenKode.has(kode)) return;
                seenKode.add(kode);
            }
            const rpjm = rpjmScoreMap.get(kode) || {};
            validRows.push({
                ...r,
                skor_kewenangan: parseNumScore(rpjm.visi_misi, 100),
                skor_sdgs: parseNumScore(rpjm.pokok_bpd, 100),
                skor_kabupaten: parseNumScore(rpjm.program_masyarakat, 100),
                skor_sumber_daya: parseNumScore(rpjm.prioritas_sdgs_skor, 100)
            });
        });

        validRows.sort((a, b) => compareKodeUnikFull(a.kode_unik_full || a.kode_unik, b.kode_unik_full || b.kode_unik));

        res.json({
            success: true,
            data: validRows,
            message: `Berhasil mengambil ${validRows.length} data Rancangan RKPDes tahun ${tahunInt}.`
        });
    } catch (error) {
        console.error('❌ Error GET /api/prioritas-rkpdes/tarik-rancangan:', error.message);
        res.status(500).json({ success: false, error: error.message, data: [] });
    }
});

// POST /api/prioritas-rkpdes/sync -> tarik & simpan dari rancangan_rkpdes ke tabel prioritas_rkpdes
app.post('/api/prioritas-rkpdes/sync', async (req, res) => {
    try {
        const { tahun } = req.body || {};
        const tahunInt = parseInt(tahun, 10);
        if (!tahunInt) {
            return res.status(400).json({ success: false, error: 'Parameter tahun diperlukan.' });
        }

        const { data: rancanganRows, error: rErr } = await supabase
            .from('rancangan_rkpdes')
            .select('*')
            .eq('tahun', tahunInt);
        if (rErr) throw rErr;

        const { data: rpjmRows } = await supabase
            .from('rpjmdes_standar')
            .select('kode_unik_full, visi_misi, pokok_bpd, program_masyarakat, prioritas_sdgs_skor');

        const rpjmScoreMap = new Map();
        (rpjmRows || []).forEach(rp => {
            const k = String(rp.kode_unik_full || '').trim();
            if (k) rpjmScoreMap.set(k, rp);
        });

        const { data: existingPrioritas } = await supabase
            .from('prioritas_rkpdes')
            .select('*')
            .eq('tahun', tahunInt);
        
        const existingScoreMap = new Map();
        (existingPrioritas || []).forEach(ex => {
            const k = String(ex.kode_unik_full || ex.kode_unik || '').trim();
            if (k) existingScoreMap.set(k, ex);
        });

        const parseNumScore = (val, fallback) => {
            if (val !== null && val !== undefined && val !== '') {
                const n = parseInt(val, 10);
                if (!isNaN(n)) return Math.min(100, Math.max(0, n));
            }
            return fallback;
        };

        const seenKodeSync = new Set();
        const validRows = [];
        for (const r of (rancanganRows || [])) {
            if (!r || typeof r !== 'object') continue;
            const kode = String(r.kode_unik_full || r.kode_unik || '').trim();
            if (kode) {
                if (seenKodeSync.has(kode)) continue;
                seenKodeSync.add(kode);
            }
            validRows.push(r);
        }

        validRows.sort((a, b) => compareKodeUnikFull(a.kode_unik_full || a.kode_unik, b.kode_unik_full || b.kode_unik));

        const { error: delErr } = await supabase
            .from('prioritas_rkpdes')
            .delete()
            .eq('tahun', tahunInt);
        if (delErr) throw delErr;

        let inserted = 0;
        if (validRows.length > 0) {
            const payload = validRows.map(r => {
                const kodeFull = String(r.kode_unik_full || r.kode_unik || '').trim();
                const old = existingScoreMap.get(kodeFull) || {};
                const rpjm = rpjmScoreMap.get(kodeFull) || {};
                const noBidang = extractRancanganBidangNum(r);

                const sk1 = parseNumScore(old.skor_kewenangan, parseNumScore(rpjm.visi_misi, 100));
                const sk2 = parseNumScore(old.skor_sdgs, parseNumScore(rpjm.pokok_bpd, 100));
                const sk3 = parseNumScore(old.skor_kabupaten, parseNumScore(rpjm.program_masyarakat, 100));
                const sk4 = parseNumScore(old.skor_sumber_daya, parseNumScore(rpjm.prioritas_sdgs_skor, 100));
                const tot = sk1 + sk2 + sk3 + sk4;
                
                let rnk = 'I';
                if (tot >= 301) rnk = 'I';
                else if (tot >= 201) rnk = 'II';
                else if (tot >= 101) rnk = 'III';
                else rnk = 'IV';

                return {
                    tahun: tahunInt,
                    kode_unik_full: kodeFull,
                    kode_unik: String(r.kode_unik || r.kode_unik_full || ''),
                    bidang_kode: String(noBidang),
                    kode_bidang: `0${noBidang}.`,
                    kode_sub: String(r.kode_sub || ''),
                    kode_kegiatan: String(r.kode_kegiatan || ''),
                    nama_bidang: namaBidangPrioritas(noBidang),
                    bidang: String(r.bidang || noBidang),
                    jenis_bidang: String(r.jenis_bidang || r.sub_bidang || 'SUB BIDANG UMUM'),
                    sub_bidang: String(r.sub_bidang || r.jenis_bidang || 'SUB BIDANG UMUM'),
                    jenis_kegiatan: String(r.jenis_kegiatan || 'Kegiatan Umum'),
                    nama_kegiatan: String(r.sub_kegiatan || r.nama_kegiatan || '-'),
                    sub_kegiatan: String(r.sub_kegiatan || r.nama_kegiatan || '-'),
                    mendukung_sdgs: String(r.mendukung_sdgs || '-'),
                    data_eksisting: String(r.data_eksisting || 'Perlu Peningkatan'),
                    lokasi: String(r.lokasi || 'Desa Batetangnga'),
                    volume: String(r.volume_satuan || r.volume || '12 Bulan'),
                    volume_satuan: String(r.volume_satuan || r.volume || '12 Bulan'),
                    prakiraan_biaya: Number(r.prakiraan_biaya || 0),
                    sumber_pembiayaan: String(r.sumber_pembiayaan || 'ADD'),
                    skor_kewenangan: sk1,
                    skor_sdgs: sk2,
                    skor_kabupaten: sk3,
                    skor_sumber_daya: sk4,
                    ranking: rnk
                };
            });

            const { error: insErr } = await supabase
                .from('prioritas_rkpdes')
                .insert(payload);
            if (insErr) throw insErr;
            inserted = payload.length;
        }

        res.json({
            success: true,
            message: `Berhasil menarik & menyimpan ${inserted} kegiatan dari Rancangan RKPDes tahun ${tahunInt}.`,
            count: inserted
        });
    } catch (error) {
        console.error('❌ Error POST /api/prioritas-rkpdes/sync:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

function getBidangPrefix(item) {
    const k = String(item.kode_unik_full || item.kode_unik || '').trim();
    const parts = k.split('.').filter(Boolean);
    if (parts.length >= 2) {
        return parts.slice(0, 2).join('.') + '.';
    }
    if (parts.length >= 1) {
        return parts[0] + '.';
    }
    return String(item.kode_bidang || item.bidang_kode || item.bidang || '').trim();
}

function getJenisKegiatanPrefix(item) {
    const k = String(item.kode_unik_full || item.kode_unik || '').trim();
    const parts = k.split('.').filter(Boolean);
    if (parts.length >= 3) {
        return parts.slice(0, 3).join('.') + '.';
    }
    return getBidangPrefix(item);
}

function comparePrioritasRanking(a, b) {
    // 1. Header Jenis Bidang: Urutkan mutlak berdasarkan kode_unik_full (2 segmen pertama: 01.01., 01.02., 01.03., dst)
    const bPrefA = getBidangPrefix(a);
    const bPrefB = getBidangPrefix(b);
    if (bPrefA !== bPrefB) {
        return compareKodeUnikFull(bPrefA, bPrefB);
    }

    // 2. Header Jenis Kegiatan: Urutkan mutlak berdasarkan kode_unik_full (3 segmen pertama: 01.01.01., 01.01.02., dst)
    const jkPrefA = getJenisKegiatanPrefix(a);
    const jkPrefB = getJenisKegiatanPrefix(b);
    if (jkPrefA !== jkPrefB) {
        return compareKodeUnikFull(jkPrefA, jkPrefB);
    }

    const jkA = String(a.jenis_kegiatan || '').trim();
    const jkB = String(b.jenis_kegiatan || '').trim();
    if (jkA !== jkB && jkA && jkB) {
        const cmpJKName = jkA.localeCompare(jkB, 'id', { numeric: true });
        if (cmpJKName !== 0) return cmpJKName;
    }

    // 3. Baris "Kegiatan / Sub Kegiatan" di dalam Jenis Kegiatan tersebut: Urutkan berdasarkan Ranking I, II, III, IV (Skor Tertinggi ke Terendah)
    const scoreA = Number(a.total_skor ?? ((Number(a.skor_kewenangan || 0)) + (Number(a.skor_sdgs || 0)) + (Number(a.skor_kabupaten || 0)) + (Number(a.skor_sumber_daya || 0))));
    const scoreB = Number(b.total_skor ?? ((Number(b.skor_kewenangan || 0)) + (Number(b.skor_sdgs || 0)) + (Number(b.skor_kabupaten || 0)) + (Number(b.skor_sumber_daya || 0))));

    if (scoreB !== scoreA) {
        return scoreB - scoreA;
    }

    // 4. Jika total skor / ranking sama di dalam Jenis Kegiatan tersebut, urutkan berdasarkan kode_unik_full
    const kodeA = String(a.kode_unik_full || a.kode_unik || '');
    const kodeB = String(b.kode_unik_full || b.kode_unik || '');
    return compareKodeUnikFull(kodeA, kodeB);
}

// GET /api/prioritas-rkpdes (list data prioritas)
app.get('/api/prioritas-rkpdes', async (req, res) => {
    try {
        const { tahun, bidang, bidang_no } = req.query;
        const tahunInt = parseInt(tahun, 10) || (new Date().getFullYear());
        const noBidang = parseInt(bidang_no || bidang, 10);
        console.log(`📡 GET /api/prioritas-rkpdes?tahun=${tahunInt}&bidang_no=${noBidang}`);

        const { data: rancanganRows } = await supabase
            .from('rancangan_rkpdes')
            .select('*')
            .eq('tahun', tahunInt);

        const { data: existingPrioritas, error: fetchErr } = await supabase
            .from('prioritas_rkpdes')
            .select('*')
            .eq('tahun', tahunInt);
        if (fetchErr) throw fetchErr;

        const { data: rpjmRows } = await supabase
            .from('rpjmdes_standar')
            .select('kode_unik_full, visi_misi, pokok_bpd, program_masyarakat, prioritas_sdgs_skor');

        const rpjmScoreMap = new Map();
        (rpjmRows || []).forEach(rp => {
            const k = String(rp.kode_unik_full || '').trim();
            if (k) rpjmScoreMap.set(k, rp);
        });

        const parseNumScore = (val, fallback) => {
            if (val !== null && val !== undefined && val !== '') {
                const n = parseInt(val, 10);
                if (!isNaN(n)) return Math.min(100, Math.max(0, n));
            }
            return fallback;
        };

        const existingMap = new Map();
        (existingPrioritas || []).forEach(p => {
            const k = String(p.kode_unik_full || p.kode_unik || '').trim();
            if (k) existingMap.set(k, p);
        });

        const rancanganKodeSet = new Set();
        const itemsToInsert = [];
        const itemsToUpdate = [];

        (rancanganRows || []).forEach(r => {
            const kodeFull = String(r.kode_unik_full || r.kode_unik || '').trim();
            if (!kodeFull) return;
            if (rancanganKodeSet.has(kodeFull)) return;
            rancanganKodeSet.add(kodeFull);

            const rpjm = rpjmScoreMap.get(kodeFull) || {};
            const nB = extractRancanganBidangNum(r);
            const namaKeg = String(r.sub_kegiatan || r.nama_kegiatan || '-');
            const lokasiKeg = String(r.lokasi || 'Desa Batetangnga');
            const volKeg = String(r.volume_satuan || r.volume || '12 Bulan');
            const biayaKeg = Number(r.prakiraan_biaya || 0);

            if (existingMap.has(kodeFull)) {
                const ex = existingMap.get(kodeFull);
                if (ex.nama_kegiatan !== namaKeg || ex.lokasi !== lokasiKeg || ex.volume !== volKeg || ex.prakiraan_biaya !== biayaKeg) {
                    itemsToUpdate.push({
                        id: ex.id,
                        nama_kegiatan: namaKeg,
                        sub_kegiatan: namaKeg,
                        lokasi: lokasiKeg,
                        volume: volKeg,
                        volume_satuan: volKeg,
                        prakiraan_biaya: biayaKeg
                    });
                }
            } else {
                const sk1 = parseNumScore(rpjm.visi_misi, 100);
                const sk2 = parseNumScore(rpjm.pokok_bpd, 100);
                const sk3 = parseNumScore(rpjm.program_masyarakat, 100);
                const sk4 = parseNumScore(rpjm.prioritas_sdgs_skor, 100);
                const tot = sk1 + sk2 + sk3 + sk4;
                let rnk = 'I';
                if (tot >= 301) rnk = 'I';
                else if (tot >= 201) rnk = 'II';
                else if (tot >= 101) rnk = 'III';
                else rnk = 'IV';

                itemsToInsert.push({
                    tahun: tahunInt,
                    kode_unik_full: kodeFull,
                    kode_unik: String(r.kode_unik || r.kode_unik_full || ''),
                    bidang_kode: String(nB),
                    kode_bidang: `0${nB}.`,
                    kode_sub: String(r.kode_sub || ''),
                    kode_kegiatan: String(r.kode_kegiatan || ''),
                    nama_bidang: namaBidangPrioritas(nB),
                    bidang: String(r.bidang || nB),
                    jenis_bidang: String(r.jenis_bidang || r.sub_bidang || 'SUB BIDANG UMUM'),
                    sub_bidang: String(r.sub_bidang || r.jenis_bidang || 'SUB BIDANG UMUM'),
                    jenis_kegiatan: String(r.jenis_kegiatan || 'Kegiatan Umum'),
                    nama_kegiatan: namaKeg,
                    sub_kegiatan: namaKeg,
                    mendukung_sdgs: String(r.mendukung_sdgs || '-'),
                    data_eksisting: String(r.data_eksisting || 'Perlu Peningkatan'),
                    lokasi: lokasiKeg,
                    volume: volKeg,
                    volume_satuan: volKeg,
                    prakiraan_biaya: biayaKeg,
                    sumber_pembiayaan: String(r.sumber_pembiayaan || 'ADD'),
                    skor_kewenangan: sk1,
                    skor_sdgs: sk2,
                    skor_kabupaten: sk3,
                    skor_sumber_daya: sk4,
                    ranking: rnk
                });
            }
        });

        const idsToDelete = [];
        (existingPrioritas || []).forEach(p => {
            const k = String(p.kode_unik_full || p.kode_unik || '').trim();
            if (k && !rancanganKodeSet.has(k)) {
                idsToDelete.push(p.id);
            }
        });

        if (idsToDelete.length > 0) {
            await supabase.from('prioritas_rkpdes').delete().in('id', idsToDelete);
        }

        if (itemsToInsert.length > 0) {
            await supabase.from('prioritas_rkpdes').insert(itemsToInsert);
        }

        if (itemsToUpdate.length > 0) {
            for (const up of itemsToUpdate) {
                const { id, ...updateData } = up;
                await supabase.from('prioritas_rkpdes').update(updateData).eq('id', id);
            }
        }

        const { data: finalRows, error: getErr } = await supabase
            .from('prioritas_rkpdes')
            .select('*')
            .eq('tahun', tahunInt);
        if (getErr) throw getErr;

        let rows = finalRows || [];
        rows.sort((a, b) => comparePrioritasRanking(a, b));

        if (!isNaN(noBidang) && noBidang >= 1 && noBidang <= 5 && noBidang !== 0) {
            rows = rows.filter(r => extractRancanganBidangNum(r) === noBidang);
        } else if (bidang && !bidang.includes('SEMUA')) {
            const key = String(bidang).toLowerCase();
            rows = rows.filter(r =>
                String(r.jenis_bidang || r.nama_bidang || r.bidang || '').toLowerCase().includes(key)
            );
        }

        res.json({
            success: true,
            data: rows,
            bidang: noBidang || bidang || '',
            message: `Berhasil memuat ${rows.length} data skoring Prioritas RKPDes tahun ${tahunInt}.`
        });
    } catch (error) {
        console.error('❌ Error GET /api/prioritas-rkpdes:', error.message);
        res.status(500).json({ success: false, error: error.message, data: [] });
    }
});

// POST /api/prioritas-rkpdes/upsert -> simpan skor baris prioritas_rkpdes (idempoten per tahun+kode)
app.post('/api/prioritas-rkpdes/upsert', async (req, res) => {
    try {
        const { tahun, items } = req.body || {};
        const tahunInt = parseInt(tahun, 10);
        if (!tahunInt) {
            return res.status(400).json({ success: false, message: 'Parameter tahun diperlukan.' });
        }
        if (!Array.isArray(items)) {
            return res.status(400).json({ success: false, message: 'Payload items[] diperlukan.' });
        }

        const valid = items.filter(it => it && (it.kode_unik_full || it.kode_unik || it.id || it.nama_kegiatan || it.jenis_kegiatan));
        if (valid.length === 0) {
            return res.json({ success: true, message: 'Tidak ada skor valid untuk disimpan.', count: 0 });
        }

        // Kunci uniqueness: (tahun, kode_unik_full). Ambil semua baris lama utk kolisi & mapping update.
        const { data: existing, error: exErr } = await supabase
            .from('prioritas_rkpdes')
            .select('id, kode_unik_full, kode_unik, nama_kegiatan, jenis_bidang, jenis_kegiatan, lokasi, sub_kegiatan, volume, volume_satuan, mendukung_sdgs')
            .eq('tahun', tahunInt);
        if (exErr) throw exErr;

        const mapByKode = new Map();
        (existing || []).forEach(row => {
            mapByKode.set((row.kode_unik_full || row.kode_unik || '').trim(), row.id);
        });

        const upsertRows = [];
        const updatePairs = [];
        for (const r of valid) {
            const now = new Date().toISOString();
            const kodeFull = String(r.kode_unik_full || r.kode_unik || '').trim();
            const noBidang = extractRancanganBidangNum(r);

            const rowPayload = {
                tahun: tahunInt,
                kode_unik_full: kodeFull,
                kode_unik: String(r.kode_unik || r.kode_unik_full || ''),
                bidang_kode: String(r.bidang_kode || noBidang || ''),
                kode_bidang: String(r.kode_bidang || `0${noBidang}.`),
                kode_sub: String(r.kode_sub || ''),
                kode_kegiatan: String(r.kode_kegiatan || ''),
                nama_bidang: r.nama_bidang || namaBidangPrioritas(noBidang) || '',
                bidang: r.bidang || namaBidangPrioritas(noBidang) || '',
                jenis_bidang: String(r.jenis_bidang || r.sub_bidang || ''),
                sub_bidang: String(r.sub_bidang || r.jenis_bidang || ''),
                jenis_kegiatan: String(r.jenis_kegiatan || ''),
                nama_kegiatan: String(r.nama_kegiatan || r.sub_kegiatan || ''),
                sub_kegiatan: String(r.sub_kegiatan || r.nama_kegiatan || ''),
                mendukung_sdgs: String(r.mendukung_sdgs || r.sdgs || ''),
                data_eksisting: String(r.data_eksisting || r.data_existing || ''),
                lokasi: String(r.lokasi || r.lokasi_kegiatan || 'Desa Batetangnga'),
                volume: String(r.volume || r.volume_kegiatan || r.volume_satuan || ''),
                volume_satuan: String(r.volume_satuan || r.volume_kegiatan || r.volume || ''),
                penerima_manfaat: String(r.penerima_manfaat || r.total_manfaat || ''),
                waktu_pelaksanaan: String(r.waktu_pelaksanaan || '12 Bulan'),
                prakiraan_biaya: Number(r.prakiraan_biaya ?? r.pagu_rpjm ?? 0),
                pagu_rpjm: Number(r.pagu_rpjm ?? r.prakiraan_biaya ?? 0),
                sumber_pembiayaan: String(r.sumber_pembiayaan || r.sumber_dana || 'ADD'),
                skor_kewenangan: parseInt(r.skor_kewenangan ?? 0, 10) || 0,
                skor_sdgs: parseInt(r.skor_sdgs ?? 0, 10) || 0,
                skor_kabupaten: parseInt(r.skor_kabupaten ?? 0, 10) || 0,
                skor_sumber_daya: parseInt(r.skor_sumber_daya ?? r.prioritas_sdgs_skor ?? 0, 10) || 0,
                ranking: String(r.ranking || ''),
                updated_at: now
            };

            const existingId = kodeFull ? (mapByKode.get(kodeFull) ?? null) : null;
            if (existingId != null) {
                delete rowPayload.tahun;
                updatePairs.push({ id: existingId, data: rowPayload });
            } else {
                upsertRows.push(rowPayload);
                if (kodeFull) mapByKode.set(kodeFull, 'PENDING_INSERT');
            }
        }

        if (upsertRows.length > 0) {
            const { error: insErr } = await supabase.from('prioritas_rkpdes').insert(upsertRows);
            if (insErr) throw insErr;
        }
        for (const pair of updatePairs) {
            const { error: updErr } = await supabase.from('prioritas_rkpdes').update(pair.data).eq('id', pair.id);
            if (updErr) throw updErr;
        }

        res.json({
            success: true,
            message: `Berhasil menyimpan ${upsertRows.length + updatePairs.length} baris skor Prioritas tahun ${tahunInt}.`,
            count: upsertRows.length + updatePairs.length
        });
    } catch (error) {
        console.error('❌ Error POST /api/prioritas-rkpdes/upsert:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/prioritas-rkpdes?id=xxx
app.delete('/api/prioritas-rkpdes', async (req, res) => {
    try {
        const { id } = req.query;
        const idInt = parseInt(id, 10);
        if (!idInt) {
            return res.status(400).json({ success: false, message: 'Parameter id diperlukan.' });
        }
        const { error } = await supabase.from('prioritas_rkpdes').delete().eq('id', idInt);
        if (error) throw error;
        res.json({ success: true, message: 'baris Prioritas berhasil dihapus.' });
    } catch (error) {
        console.error('❌ Error DELETE /api/prioritas-rkpdes:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/du-rkpdes/tetapkan-prioritas -> salin SEMUA prioritas tahun tsb ke tabel du_rkpdes
app.post('/api/du-rkpdes/tetapkan-prioritas', async (req, res) => {
    try {
        const { tahun, items } = req.body || {};
        const tahunInt = parseInt(tahun, 10);
        if (!tahunInt) {
            return res.status(400).json({ success: false, message: 'Parameter tahun diperlukan.' });
        }
        if (!Array.isArray(items)) {
            return res.status(400).json({ success: false, message: 'Payload items[] diperlukan.' });
        }

        const validRows = items.filter(r => {
            if (!r || typeof r !== 'object') return false;
            const nama = String(r.jenis_jaringan || r.nama_kegiatan || r.sub_kegiatan || '').trim();
            if (nama === '') return false;
            if (String(r.bidang || '').includes('Belum Ada Data') || String(r.bidang || '').includes('⚠️')) return false;
            return true;
        });

        const { error: delErr } = await supabase
            .from('du_rkpdes')
            .delete()
            .eq('tahun', tahunInt);
        if (delErr) throw delErr;

        let inserted = 0;
        if (validRows.length > 0) {
            const payload = validRows.map(r => {
                const laki = parseInt(r.penerima_laki ?? r.manfaat_l ?? r.penerima_laki ?? 0, 10);
                const perempuan = parseInt(r.penerima_perempuan ?? r.manfaat_p ?? 0, 10);
                const rtm = parseInt(r.penerima_rtm ?? r.manfaat_rtm ?? 0, 10);
                const biaya = Number(r.prakiraan_biaya ?? r.pagu_rpjm ?? 0);
                return {
                    tahun: tahunInt,
                    kode_unik_full: String(r.kode_unik_full || r.kode_unik || ''),
                    kode_unik: String(r.kode_unik || ''),
                    bidang: String(r.bidang_kode || r.bidang || '1'),
                    kode_bidang: String(r.kode_bidang || `0${extractRancanganBidangNum(r)}.`),
                    kode_sub: String(r.kode_sub || ''),
                    kode_kegiatan: String(r.kode_kegiatan || ''),
                    jenis_bidang: String(r.jenis_bidang || ''),
                    jenis_kegiatan: String(r.jenis_kegiatan || ''),
                    nama_kegiatan: String(r.nama_kegiatan || r.sub_kegiatan || ''),
                    sub_kegiatan: String(r.sub_kegiatan || ''),
                    mendukung_sdgs: String(r.mendukung_sdgs || r.sdgs || '-'),
                    data_eksisting: String(r.data_eksisting || r.data_existing || ''),
                    lokasi: String(r.lokasi || r.lokasi_kegiatan || 'Desa Batetangnga'),
                    volume_satuan: String(r.volume_satuan || r.volume || ''),
                    volume: String(r.volume || r.volume_satuan || ''),
                    penerima_laki: laki,
                    penerima_perempuan: perempuan,
                    penerima_rtm: rtm,
                    penerima_manfaat: r.penerima_manfaat || (laki + perempuan + rtm) || '',
                    total_manfaat: laki + perempuan + rtm,
                    waktu_pelaksanaan: String(r.waktu_pelaksanaan || '12 Bulan'),
                    prakiraan_biaya: biaya,
                    pagu_rpjm: biaya,
                    sumber_pembebanan: String(r.sumber_pembiayaan || r.sumber_dana || 'ADD'),
                    skor_politik: parseInt(r.skor_kewenangan ?? 0, 10) || 0,
                    skor_sdgs: parseInt(r.skor_sdgs ?? 0, 10) || 0,
                    skor_kabupaten: parseInt(r.skor_kabupaten ?? 0, 10) || 0,
                    skor_sumber_daya: parseInt(r.skor_sumber_daya ?? 0, 10) || 0,
                    total_skor: parseInt(r.total_skor ?? 0, 10) || 0,
                    urutan_prioritas: String(r.urutan_prioritas || r.ranking || ''),
                    updated_by: 'Sistem (tetapkan-prioritas)',
                    updated_at: new Date().toISOString()
                };
            });
            const { error: insErr } = await supabase.from('du_rkpdes').insert(payload);
            if (insErr) throw insErr;
            inserted = payload.length;
        }

        res.json({
            success: true,
            message: `Berhasil menetapkan ${inserted} usulan Prioritas ke DU-RKP tahun ${tahunInt}.`,
            count: inserted
        });
    } catch (error) {
        console.error('❌ Error POST /api/du-rkpdes/tetapkan-prioritas:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint untuk memperbaiki data RAB yang tidak konsisten
app.post('/api/rab/fix-data', async (req, res) => {
    try {
        console.log('🔧 Starting RAB data fix...');

        // 1. Coba jalankan RPC jika tersedia di database
        const { error: rpcError } = await supabase.rpc('perbaiki_rab_inconsistencies');

        if (!rpcError) {
            console.log('✅ RPC perbaiki_rab_inconsistencies berhasil dijalankan.');
        } else {
            console.warn('ℹ️ RPC tidak tersedia, fallback ke update baris per baris:', rpcError.message);
        }

        // 2. Ambil semua RAB yang punya rpjm_data, lalu perbaiki kolom kosong satu per satu
        const { data: rows, error: selErr } = await supabase
            .from('rab')
            .select('id, kode_unik_full, bidang, sumber_dana, jumlah_anggaran, items, rpjm_data');

        if (selErr) throw selErr;

        if (!rows || rows.length === 0) {
            return res.json({ success: true, message: 'Tidak ada data RAB untuk diperbaiki.' });
        }

        let fixedCount = 0;
        for (const row of rows) {
            let rpjmObj = row.rpjm_data;
            if (typeof rpjmObj === 'string') {
                try { rpjmObj = JSON.parse(rpjmObj); } catch (e) { rpjmObj = null; }
            }
            const patch = {};
            // kolom 'bidang' tanpa spasi (skema rab baru)
            if (!row.bidang && rpjmObj && rpjmObj.bidang) patch.bidang = rpjmObj.bidang;
            if (!row.sumber_dana && rpjmObj && rpjmObj.sumber_dana) patch.sumber_dana = rpjmObj.sumber_dana;
            // Jumlahkan items jika jumlah_anggaran belum ada
            if (!row.jumlah_anggaran || Number(row.jumlah_anggaran) === 0) {
                let itemsArr = row.items;
                if (typeof itemsArr === 'string') { try { itemsArr = JSON.parse(itemsArr); } catch (e) { itemsArr = null; } }
                if (Array.isArray(itemsArr)) {
                    const sum = itemsArr.reduce((acc, it) => acc + (Number(it.jumlah || it.jumlah_biaya) || 0), 0);
                    if (sum > 0) patch.jumlah_anggaran = sum;
                }
            }
            patch.updated_at = new Date().toISOString();
            const { error: updErr } = await supabase.from('rab').update(patch).eq('id', row.id);
            if (!updErr) fixedCount++;
        }

        console.log(`✅ RAB data fix completed. ${fixedCount} baris diperbaiki dari ${rows.length}.`);
        res.json({ success: true, message: `Data RAB telah diperbaiki (${fixedCount} baris).` });
    } catch (error) {
        console.error('❌ RAB data fix error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/rab-activities -> Mengambil daftar kegiatan unik untuk dropdown Pilih Kode Unik RAB
// DIASOSIASIKAN LANGSUNG DARIPADA TENTANG: Ditarik dari tabel rancangan_rkpdes untuk tahun target.
app.get('/api/rab-activities', async (req, res) => {
    try {
        const { tahun } = req.query;
        const tahunInt = parseInt(tahun, 10) || 2027;
        console.log(`📡 GET /api/rab-activities (Ditarik dari rancangan_rkpdes) tahun: ${tahunInt}`);

        let { data: rancanganRows, error } = await supabase
            .from('rancangan_rkpdes')
            .select('*')
            .eq('tahun', tahunInt);

        if (error) throw error;

        // Auto-pull dari rpjmdes_standar jika DB rancangan_rkpdes masih kosong untuk tahun tersebut
        if (!rancanganRows || rancanganRows.length === 0) {
            console.log(`🔄 DB rancangan_rkpdes kosong untuk tahun ${tahunInt}, menarik dari rpjmdes_standar...`);
            const stdData = await getCachedRpjmdesStandar();
            if (Array.isArray(stdData) && stdData.length > 0) {
                const targetCol = `target_${tahunInt}`;
                const validToInsert = stdData.filter(item => {
                    const val = String(item[targetCol] || '').trim().toLowerCase();
                    return val && val !== '-' && val !== '0';
                }).map(item => {
                    const noBidang = extractRancanganBidangNum(item);
                    return {
                        tahun: tahunInt,
                        bidang: String(noBidang),
                        kode_bidang: `0${noBidang}.`,
                        kode_sub: String(item.kode_sub || ''),
                        kode_kegiatan: String(item.kode_kegiatan || ''),
                        kode_unik_full: String(item.kode_unik_full || item.kode_unik || '').trim(),
                        kode_unik: String(item.kode_unik || item.kode_unik_full || '').trim(),
                        nama_kegiatan: item.nama_kegiatan || item.jenis_kegiatan || '',
                        sub_kegiatan: item.sub_kegiatan || item.nama_kegiatan || '',
                        jenis_bidang: item.jenis_bidang || item.sub_bidang || 'SUB BIDANG UMUM',
                        jenis_kegiatan: item.jenis_kegiatan || item.nama_kegiatan || 'Kegiatan Umum',
                        lokasi: item.lokasi || 'Desa Batetangnga',
                        volume_satuan: item.volume_satuan || item.volume || '12 Bulan',
                        prakiraan_biaya: Number(item.prakiraan_biaya || 0),
                        sumber_pembiayaan: item.sumber_dana || 'DDS'
                    };
                });

                if (validToInsert.length > 0) {
                    await supabase.from('rancangan_rkpdes').insert(validToInsert);
                    const { data: reFetched } = await supabase.from('rancangan_rkpdes').select('*').eq('tahun', tahunInt);
                    if (reFetched) rancanganRows = reFetched;
                }
            }
        }

        const uniqueActivities = [];
        const seen = new Set();

        (rancanganRows || []).forEach(item => {
            const kode = String(item.kode_unik_full || item.kode_unik || '').trim();
            if (kode && !seen.has(kode)) {
                seen.add(kode);
                uniqueActivities.push({
                    kode_unik_full: kode,
                    kode_unik: item.kode_unik || kode,
                    nama_kegiatan: item.sub_kegiatan || item.nama_kegiatan || 'Kegiatan Tanpa Nama',
                    bidang: item.bidang || '',
                    jenis_bidang: item.jenis_bidang || item.sub_bidang || '',
                    jenis_kegiatan: item.jenis_kegiatan || '',
                    sumber_dana: item.sumber_pembiayaan || item.sumber_dana || 'DDS',
                    lokasi: item.lokasi || 'Desa Batetangnga',
                    volume: item.volume_satuan || item.volume || '12 Bulan',
                    prakiraan_biaya: Number(item.prakiraan_biaya || 0),
                    tahun: tahunInt
                });
            }
        });

        uniqueActivities.sort((a, b) => compareKodeUnikFull(a.kode_unik_full, b.kode_unik_full));

        res.json({ success: true, data: uniqueActivities });
    } catch (error) {
        console.error('❌ Error GET /api/rab-activities:', error.message);
        res.status(500).json({ success: false, error: error.message, data: [] });
    }
});

app.get('/api/rab', async (req, res) => {
    try {
        const { kode_unik_full, tahun } = req.query;
        const tahunInt = parseInt(tahun) || 2027;

        if (!kode_unik_full) {
            console.log(`📡 GET /api/rab?tahun=${tahunInt}`);
            let data = [];
            const { data: supaData, error } = await supabase
                .from('rab')
                .select('*')
                .eq('tahun', tahunInt);

            if (!error && supaData) {
                data = supaData;
            }

            return res.json({ success: true, data: data || [] });
        }

        try {
            const saved = await getRabFromDb(kode_unik_full, tahun);
            if (saved) {
                return res.json({ success: true, data: saved });
            }
            return res.json({ success: true, data: null });
        } catch (error) {
            console.log('❌ Error /api/rab GET by-kode:', error.message);
            res.status(500).json({ success: false, error: error.message, data: [] });
        }
    } catch (error) {
        console.log('❌ Error /api/rab GET:', error.message);
        res.status(500).json({ success: false, error: error.message, data: [] });
    }
});

app.post('/api/rab', async (req, res) => {
    try {
        const payload = req.body;
        const { kode_unik, kode_unik_full, tahun, items, rpjm_data, total_biaya, total_rab } = payload;

        const targetKode = String(kode_unik || kode_unik_full || '').trim();
        if (!targetKode || !tahun || !Array.isArray(items)) {
            return res.status(400).json({ success: false, error: 'kode_unik, tahun, dan items wajib diisi' });
        }

        const noBidang = extractRancanganBidangNum({ bidang: payload.bidang, kode_unik_full: targetKode, kode_unik: targetKode });
        const bidangFull = namaBidangPrioritas(noBidang);

        const record = {
            kode_unik: targetKode,
            kode_unik_full: String(kode_unik_full || targetKode).trim(),
            tahun: Number(tahun),
            nama_kegiatan: rpjm_data?.nama_kegiatan || payload.nama_kegiatan || '-',
            bidang: bidangFull,
            status: payload.status || 'draft',
            group_nama: payload.group_nama || '',
            sub_group_nama: payload.sub_group_nama || '',
            lokasi: payload.lokasi || rpjm_data?.lokasi_kegiatan || rpjm_data?.lokasi || 'Desa Batetangnga',
            lokasi_kegiatan: payload.lokasi_kegiatan || rpjm_data?.lokasi_kegiatan || payload.lokasi || '',
            jenis_kegiatan: payload.jenis_kegiatan || rpjm_data?.jenis_kegiatan || rpjm_data?.nama_kegiatan || '',
            items: items,
            jumlah_anggaran: Number(total_biaya || total_rab || payload.jumlah_anggaran || 0),
            volume: Number(payload.volume || payload.volume_rab || 1),
            satuan: payload.satuan || payload.satuan_rab || 'Paket',
            harga_satuan: Number(payload.harga_satuan || payload.harga_satuan_rab || total_biaya || 0),
            sumber_dana: payload.sumber_dana || payload.sumber_dana_rab || 'DDS',
            rpjm_data: rpjm_data || null,
            saved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const saved = await saveRabToDb(record);
        // Sinkronisasi otomatis: data RAB baru langsung turun ke tabel `rkpdesk`
        // sehingga tab RKPDes/Stouting tampil tanpa perlu menekan "Sync / Import RAB".
        try {
            const tahunSync = Number(tahun || record.tahun || saved.tahun) || 2027;
            await mergeRkpFromRab(tahunSync);
        } catch (syncErr) {
            console.warn('⚠️ Auto-sync RAB→RKPDes gagal (tetap dilanjutkan):', syncErr.message);
        }
        return res.json({ success: true, source: 'supabase', message: 'Data berhasil disimpan ke Supabase', data: saved });
    } catch (error) {
        console.log('❌ Error /api/rab POST:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/rab/list', async (req, res) => {
    try {
        const data = await listRabsFromDb();
        if (Array.isArray(data)) {
            sortHierarchical(data);
        }
        res.json({ success: true, data });
    } catch (error) {
        console.log('❌ Error /api/rab/list:', error.message);
        res.status(500).json({ success: false, error: error.message, data: [] });
    }
});

app.delete('/api/rab', async (req, res) => {
    try {
        const { kode_unik_full, tahun } = req.query;
        if (!kode_unik_full) {
            return res.status(400).json({ success: false, error: 'kode_unik_full diperlukan' });
        }

        const safeTahun = parseInt(tahun, 10) || 2027;

        await deleteRabFromDb(kode_unik_full, safeTahun);
        // Bersihkan baris RKPDes turunan dari RAB yang dihapus tahun tersebut
        try {
            const base = String(kode_unik_full).trim().replace(/\.+$/, '');
            const { data: derivedRows } = await supabase
                .from('rkpdes')
                .select('id, kode_unik_full')
                .eq('tahun', safeTahun);
            if (Array.isArray(derivedRows)) {
                const toDelete = derivedRows.filter(r => {
                    const k = String(r.kode_unik_full || '').trim();
                    return k === base || k.startsWith(base + '.');
                }).map(r => r.id);
                if (toDelete.length > 0) {
                    await supabase.from('rkpdes').delete().in('id', toDelete);
                }
            }
        } catch (e) {
            console.warn('⚠️ Cleanup baris RKPDes turunan gagal:', e.message);
        }
        return res.json({ success: true, message: "RAB Berhasil Dihapus" });
    } catch (error) {
        console.error("Supabase Error Details (DELETE /api/rab):", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// VERIFIKASI PROPOSAL & RAB
// Sumber tabel: `verifikasi_proposal` (Lembar Pemeriksaan Proposal & RAB)
// ============================================================

// GET /api/verifikasi-proposal?tahun=2027  -> daftar verifikasi per tahun
app.get('/api/verifikasi-proposal', async (req, res) => {
    try {
        const { tahun } = req.query;
        const tahunInt = parseInt(tahun, 10);
        if (!tahunInt) {
            return res.status(400).json({ success: false, error: 'Parameter tahun diperlukan.' });
        }
        const { data, error } = await supabase
            .from('verifikasi_proposal')
            .select('*')
            .eq('tahun', tahunInt)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('❌ Error GET /api/verifikasi-proposal:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/verifikasi-proposal/rab-list?tahun=YYYY -> daftar kegiatan RAB utk dropdown tarik
app.get('/api/verifikasi-proposal/rab-list', async (req, res) => {
    try {
        const { tahun } = req.query;
        const tahunInt = parseInt(tahun, 10) || 2027;
        const { data, error } = await supabase
            .from('rab')
            .select('*')
            .eq('tahun', tahunInt)
            .order('nama_kegiatan', { ascending: true });
        if (error) throw error;
        const items = (data || []).map(r => ({
            kode_unik_full: r.kode_unik_full,
            nama_kegiatan: r.nama_kegiatan || r.uraian || r.jenis_kegiatan || '-',
            uraian: r.uraian,
            bidang: r.bidang || 'Bidang Pelaksanaan Pembangunan Desa',
            lokasi: r.lokasi || r.lokasi_kegiatan || 'Desa Batetangnga',
            volume: r.volume || r.volume_rab || '',
            volume_satuan: r.volume !== undefined && r.satuan ? `${r.volume} ${r.satuan}` : (r.volume_rab || '1 Paket'),
            satuan: r.satuan
        }));
        res.json({ success: true, data: items });
    } catch (error) {
        console.error('❌ Error GET /api/verifikasi-proposal/rab-list:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/verifikasi-proposal  -> simpan baru
app.post('/api/verifikasi-proposal', async (req, res) => {
    try {
        const body = req.body || {};
        const tahunInt = parseInt(body.tahun, 10) || 2027;
        const record = {
            tahun: tahunInt,
            bidang: body.bidang || '',
            kegiatan: body.kegiatan || '',
            lokasi: body.lokasi || '',
            volume: body.volume || '',
            tanggal_pemeriksaan: body.tanggal_pemeriksaan || null,
            hasil_layak: Boolean(body.hasil_layak),
            wakil_masyarakat: body.wakil_masyarakat || '',
            pendamping_profesional: body.pendamping_profesional || '',
            dinas_instansi: body.dinas_instansi || '',
            catatan: body.catatan || ''
        };
        for (let i = 1; i <= 14; i++) {
            record[`item${i}`] = body[`item${i}`] || 'Ada & Memenuhi Syarat';
        }
        record.updated_at = new Date().toISOString();
        const { data, error } = await supabase
            .from('verifikasi_proposal')
            .insert([record])
            .select();
        if (error) throw error;
        res.json({ success: true, data: data && data[0] ? data[0] : { id: null } });
    } catch (error) {
        console.error('❌ Error POST /api/verifikasi-proposal:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/verifikasi-proposal  -> perbarui verifikasi
app.put('/api/verifikasi-proposal', async (req, res) => {
    try {
        const body = req.body;
        const id = body.id;
        if (!id) {
            return res.status(400).json({ success: false, error: 'Parameter id diperlukan.' });
        }
        const record = {
            bidang: body.bidang || '',
            kegiatan: body.kegiatan || '',
            lokasi: body.lokasi || '',
            volume: body.volume || '',
            tanggal_pemeriksaan: body.tanggal_pemeriksaan || null,
            hasil_layak: Boolean(body.hasil_layak),
            wakil_masyarakat: body.wakil_masyarakat || '',
            pendamping_profesional: body.pendamping_profesional || '',
            dinas_instansi: body.dinas_instansi || '',
            catatan: body.catatan || '',
            updated_at: new Date().toISOString()
        };
        for (let i = 1; i <= 14; i++) {
            record[`item${i}`] = body[`item${i}`] || 'Ada & Memenuhi Syarat';
        }
        const { data, error } = await supabase
            .from('verifikasi_proposal')
            .update(record)
            .eq('id', id)
            .select();
        if (error) throw error;
        res.json({ success: true, data: data && data[0] ? data[0] : { id } });
    } catch (error) {
        console.error('❌ Error PUT /api/verifikasi-proposal:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/verifikasi-proposal?id=... -> hapus verifikasi
app.delete('/api/verifikasi-proposal', async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ success: false, error: 'Parameter id diperlukan.' });
        }
        const { error } = await supabase
            .from('verifikasi_proposal')
            .delete()
            .eq('id', id);
        if (error) throw error;
        res.json({ success: true, message: 'Verifikasi proposal berhasil dihapus.' });
    } catch (error) {
        console.error('❌ Error DELETE /api/verifikasi-proposal:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// EVALUASI PELAKSANAAN RKP DESA / EVALUASI APBDes
// Sumber tarik: tabel `rkpdes` (tahun terpilih langsung).
// Kolom realisasi & keterangan sengaja DIKOSONGKAN agar diisi manual.
// ============================================================

function evalBidangNum(item) {
    const kodeStr = String(item.kode_unik_full || item.kode_unik || '');
    const m = kodeStr.match(/^0?([1-5])/);
    if (m) return parseInt(m[1], 10);
    const bText = String(item.bidang || '').toLowerCase();
    if (bText.includes('pemerintah')) return 1;
    if (bText.includes('pembangunan')) return 2;
    if (bText.includes('kemasyarakatan')) return 3;
    if (bText.includes('pemberdayaan')) return 4;
    if (bText.includes('bencana')) return 5;
    const n = parseInt(item.bidang, 10);
    if (n >= 1 && n <= 5) return n;
    return 1;
}

// GET /api/evaluasi?tahun=2027 -> data evaluasi tersimpan untuk tahun yg dipilih
app.get('/api/evaluasi', async (req, res) => {
    try {
        const { tahun } = req.query;
        const tahunInt = parseInt(tahun, 10);
        if (!tahunInt) {
            return res.status(400).json({ success: false, error: 'Parameter tahun diperlukan.' });
        }
        const { data, error } = await supabase
            .from('evaluasi_rkpdes')
            .select('*')
            .eq('tahun', tahunInt)
            .order('id', { ascending: true });
        if (error) throw error;

        const stdData = await getCachedRpjmdesStandar();
        const stdMap = new Map();
        if (Array.isArray(stdData)) {
            stdData.forEach(s => {
                if (s.kode_unik_full) stdMap.set(String(s.kode_unik_full).trim(), s);
                if (s.kode_unik) stdMap.set(String(s.kode_unik).trim(), s);
            });
        }

        const mapped = (data || []).map(r => {
            const k = String(r.kode_bidang || r.kode_unik || r.kode_unik_full || '').trim();
            const std = stdMap.get(k) || {};
            return {
                id: r.id,
                tahun: tahunInt,
                bidang: parseInt(r.bidang, 10) || evalBidangNum({ bidang: r.bidang, kode_unik_full: k }),
                kode_unik: k,
                kode_unik_full: k,
                jenis_bidang: r.jenis_bidang || std.jenis_bidang || r.sub_bidang || '',
                sub_bidang: r.sub_bidang || std.jenis_bidang || r.jenis_bidang || '',
                jenis_kegiatan: std.jenis_kegiatan || r.jenis_kegiatan || '',
                nama_kegiatan: std.nama_kegiatan || r.kegiatan || r.sub_kegiatan || '',
                sub_kegiatan: std.nama_kegiatan || r.kegiatan || r.sub_kegiatan || '',
                lokasi: r.lokasi_kegiatan || r.lokasi || 'Desa Batetangnga',
                nominal: Number(r.nominal_anggaran || r.nominal || 0),
                realisasi: r.realisasi === 'Ya' || r.realisasi === 'YA' || r.realisasi === true,
                keterangan: r.keterangan || ''
            };
        });
        res.json({ success: true, data: mapped });
    } catch (error) {
        console.error('❌ Error GET /api/evaluasi:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/evaluasi/tarik-rab?tahun=2027 -> tarik data RKPDes tahun yg dipilih
// (Realisasi & Keterangan dikosongkan, karena akan diisi manual oleh pengguna)
app.get('/api/evaluasi/tarik-rab', async (req, res) => {
    try {
        const { tahun } = req.query;
        const tahunInt = parseInt(tahun, 10);
        if (!tahunInt) {
            return res.status(400).json({ success: false, error: 'Parameter tahun diperlukan.' });
        }
        const { data, error } = await supabase
            .from('rkpdes')
            .select('*')
            .eq('tahun', tahunInt)
            .order('kode_unik_full', { ascending: true });
        if (error) throw error;

        const rows = (data || []).map(item => ({
            kode_unik: item.kode_unik_full || item.kode_unik || '',
            kode_unik_full: item.kode_unik_full || '',
            nama_kegiatan: item.jenis_kegiatan || item.nama_kegiatan || item.sub_kegiatan || item.kegiatan || '',
            jenis_kegiatan: item.jenis_kegiatan || '',
            sub_kegiatan: item.jenis_kegiatan || '',
            bidang: evalBidangNum(item),
            lokasi: item.lokasi || item.lokasi_kegiatan || 'Desa Batetangga',
            jumlah_anggaran: Number(item.prakiraan_biaya || item.jumlah_anggaran || 0),
            nominal: Number(item.prakiraan_biaya || item.jumlah_anggaran || 0),
            total_biaya: Number(item.prakiraan_biaya || item.jumlah_anggaran || 0)
        }));

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('❌ Error GET /api/evaluasi/tarik-rab:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/evaluasi/sync -> menyimpan batch hasil isian manual (Realisasi & Keterangan)
app.post('/api/evaluasi/sync', async (req, res) => {
    try {
        const { tahun, data: rows } = req.body || {};
        const tahunInt = parseInt(tahun, 10);
        if (!tahunInt || !Array.isArray(rows)) {
            return res.status(400).json({ success: false, error: 'Payload {tahun, data[]} diperlukan.' });
        }

        // Hapus dulu data lama tahun tsb agar idempotent
        const { error: delError } = await supabase
            .from('evaluasi_rkpdes')
            .delete()
            .eq('tahun', tahunInt);
        if (delError) throw delError;

        const payload = rows
            .filter(r => r.sub_kegiatan && String(r.sub_kegiatan).trim() !== '')
            .map((r, idx) => {
                const bidangNum = parseInt(r.bidang, 10) || evalBidangNum(r) || 1;
                return {
                    tahun: tahunInt,
                    tahun_rkp: tahunInt,
                    tahun_evaluasi: tahunInt,
                    kode_bidang: String(r.kode_unik || r.kode_bidang || ''),
                    bidang: String(bidangNum),
                    no_urut: idx + 1,
                    kegiatan: r.sub_kegiatan || '',
                    lokasi_kegiatan: r.lokasi || 'Desa Batetangga',
                    nominal_anggaran: Number(r.nominal || r.jumlah_anggaran || 0),
                    realisasi: r.realisasi ? 'Ya' : 'Tidak',
                    keterangan: r.keterangan || '',
                    created_at: new Date().toISOString()
                };
            });

        if (payload.length > 0) {
            const { error: insError } = await supabase
                .from('evaluasi_rkpdes')
                .insert(payload);
            if (insError) throw insError;
        }

        res.json({ success: true, message: `Data evaluasi tahun ${tahunInt} berhasil disimpan (${payload.length} baris).` });
    } catch (error) {
        console.error('❌ Error POST /api/evaluasi/sync:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/evaluasi -> perbarui satu baris evaluasi
app.put('/api/evaluasi', async (req, res) => {
    try {
        const r = req.body || {};
        const id = r.id;
        if (!id) {
            return res.status(400).json({ success: false, error: 'Parameter id diperlukan.' });
        }
        const tahunInt = parseInt(r.tahun, 10) || 0;
        const bidangNum = parseInt(r.bidang, 10) || 1;
        const { error } = await supabase
            .from('evaluasi_rkpdes')
            .update({
                bidang: String(bidangNum),
                lokasi_kegiatan: r.lokasi || 'Desa Batetangga',
                kegiatan: r.sub_kegiatan || '',
                nominal_anggaran: Number(r.nominal || 0),
                realisasi: r.realisasi ? 'Ya' : 'Tidak',
                keterangan: r.keterangan || ''
            })
            .eq('id', id);
        if (error) throw error;
        res.json({ success: true, message: 'Data evaluasi berhasil diupdate.' });
    } catch (error) {
        console.error('❌ Error PUT /api/evaluasi:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/evaluasi?id=... -> hapus satu baris evaluasi
app.delete('/api/evaluasi', async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ success: false, error: 'Parameter id diperlukan.' });
        }
        const { error } = await supabase
            .from('evaluasi_rkpdes')
            .delete()
            .eq('id', id);
        if (error) throw error;
        res.json({ success: true, message: 'Data evaluasi berhasil dihapus.' });
    } catch (error) {
        console.error('❌ Error DELETE /api/evaluasi:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

async function getNextKodeForPrefix(prefix) {
    const normalizedPrefix = prefix.trim().endsWith('.') ? prefix.trim() : `${prefix.trim()}.`;

    const { data, error } = await supabase
        .from('rpjmdes_standar')
        .select('kode_unik_full')
        .ilike('kode_unik_full', `${normalizedPrefix}%`)
        .order('kode_unik_full', { ascending: true });

    if (error) {
        throw error;
    }

    let highestSuffix = 0;

    if (data && data.length > 0) {
        data.forEach(item => {
            const code = item.kode_unik_full || '';
            const suffix = code.slice(normalizedPrefix.length).split('.')[0];
            const suffixNum = parseInt(suffix, 10);
            if (!Number.isNaN(suffixNum) && suffixNum > highestSuffix) {
                highestSuffix = suffixNum;
            }
        });
    }

    const nextNum = highestSuffix + 1;
    return `${normalizedPrefix}${String(nextNum).padStart(2, '0')}.`;
}

app.get('/api/rpjmdes/last-kode', async (req, res) => {
    try {
        const { prefix } = req.query;
        if (!prefix) {
            return res.status(400).json({
                success: false,
                error: 'Prefix parameter required'
            });
        }

        const normalizedPrefix = prefix.trim().endsWith('.') ? prefix.trim() : `${prefix.trim()}.`;
        console.log('🔍 Mencari kode terakhir dengan prefix:', normalizedPrefix);

        const { data, error } = await supabase
            .from('rpjmdes_standar')
            .select('kode_unik_full')
            .ilike('kode_unik_full', `${normalizedPrefix}%`)
            .order('kode_unik_full', { ascending: true });

        if (error) {
            console.log('❌ Error query:', error.message);
            throw error;
        }

        let lastKode = null;
        let highestSuffix = 0;

        if (data && data.length > 0) {
            data.forEach(item => {
                const code = item.kode_unik_full || '';
                const suffix = code.slice(normalizedPrefix.length).split('.')[0];
                const suffixNum = parseInt(suffix, 10);
                if (!Number.isNaN(suffixNum) && suffixNum > highestSuffix) {
                    highestSuffix = suffixNum;
                    lastKode = code;
                }
            });
            console.log('📌 Kode terakhir ditemukan:', lastKode);
        } else {
            console.log('📌 Belum ada data untuk prefix:', normalizedPrefix);
        }

        const nextNum = highestSuffix + 1;
        const nextKode = `${normalizedPrefix}${String(nextNum).padStart(2, '0')}.`;

        res.json({ success: true, data: lastKode, nextKode, prefix: normalizedPrefix });

    } catch (error) {
        console.log('❌ Error /api/rpjmdes/last-kode:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// ========== MASTER DATA (CRUD SEDERHANA) ====================
// ============================================================

app.get('/api/master', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('rpjmdes_standar')
            .select('*')
            .order('kode_bidang', { ascending: true })
            .order('kode_sub', { ascending: true })
            .order('kode_kegiatan', { ascending: true })
            .order('kode_unik_full', { ascending: true });

        if (error) throw error;
        if (Array.isArray(data)) {
            sortHierarchical(data);
        }
        res.json({ success: true, data });
    } catch (error) {
        console.log('❌ Error getMasterData:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/master', async (req, res) => {
    try {
        const payload = req.body;
        console.log('📝 Menyimpan data:', payload.nama_kegiatan);

        if (!payload.nama_kegiatan) {
            return res.status(400).json({
                success: false,
                error: 'Nama kegiatan wajib diisi!'
            });
        }

        if (!payload.kode_unik_full) {
            return res.status(400).json({
                success: false,
                error: 'Kode unik wajib diisi!'
            });
        }

        const { data, error } = await supabase
            .from('rpjmdes_standar')
            .insert([payload])
            .select();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.log('❌ Error createMasterData:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/master/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const payload = req.body;
        const { data, error } = await supabase
            .from('rpjmdes_standar')
            .update(payload)
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.log('❌ Error updateMasterData:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/master/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('rpjmdes_standar')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.log('❌ Error deleteMasterData:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/master/batch-delete', async (req, res) => {
    try {
        const { ids } = req.body;
        if (Array.isArray(ids) && ids.length > 0) {
            const { error } = await supabase
                .from('rpjmdes_standar')
                .delete()
                .in('id', ids);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('rpjmdes_standar')
                .delete()
                .neq('id', 0);
            if (error) throw error;
        }
        res.json({ success: true });
    } catch (error) {
        console.log('❌ Error batchDeleteMasterData:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// ========== RPJMDES API (LENGKAP) ===========================
// ============================================================

app.get('/api/rpjmdes', async (req, res) => {
    try {
        const { tahun, limit, bidang, search, page } = req.query;
        console.log(`📡 GET /api/rpjmdes?tahun=${tahun || 'ALL'}&limit=${limit || 'ALL'}`);

        let { data, error } = await supabase
            .from('rpjmdes_standar')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;

        let filteredData = data || [];

        // ✅ FILTER BERDASARKAN TAHUN (JS LEVEL ACCURACY)
        if (tahun && tahun !== 'ALL') {
            const yearStr = String(tahun).trim();
            const targetCol = `target_${yearStr}`;

            filteredData = filteredData.filter(item => {
                if (item.tahun && String(item.tahun).trim() === yearStr) return true;
                if (item[targetCol]) {
                    const val = String(item[targetCol]).trim().toLowerCase();
                    if (val === yearStr.toLowerCase() || val === 'ya') return true;
                }
                return false;
            });
        }

        if (bidang && bidang !== 'ALL') {
            filteredData = filteredData.filter(item => String(item.bidang || item.bidang_ke) === String(bidang));
        }

        if (search) {
            const q = String(search).toLowerCase();
            filteredData = filteredData.filter(item =>
                (item.nama_kegiatan || '').toLowerCase().includes(q) ||
                (item.kode_unik_full || '').toLowerCase().includes(q)
            );
        }

        const total = filteredData.length;

        if (limit) {
            const parsedLimit = parseInt(limit, 10) || 50;
            if (page) {
                const offset = (parseInt(page, 10) - 1) * parsedLimit;
                filteredData = filteredData.slice(offset, offset + parsedLimit);
            } else {
                filteredData = filteredData.slice(0, parsedLimit);
            }
        }

        console.log(`✅ Found ${filteredData.length} records for year ${tahun || 'ALL'} (out of ${total})`);
        return res.json({ success: true, data: filteredData, total: total });
    } catch (error) {
        console.error('❌ Error GET /api/rpjmdes:', error.message);
        return res.status(500).json({ success: false, error: error.message, data: [] });
    }
});

app.get('/api/rpjmdes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('rpjmdes_standar')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.log('❌ Error /api/rpjmdes/:id:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/rpjmdes/by-kode/:kodeUnik', async (req, res) => {
    try {
        const { kodeUnik } = req.params;
        const { data, error } = await supabase
            .from('rpjmdes_standar')
            .select('*')
            .eq('kode_unik_full', kodeUnik)
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.log('❌ Error /api/rpjmdes/by-kode/:kodeUnik:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/rpjmdes', async (req, res) => {
    try {
        const payload = req.body;
        console.log('📝 Menyimpan RPJMDes:', payload.nama_kegiatan);
        console.log('📝 Kode Unik:', payload.kode_unik_full);

        // Validasi
        if (!payload.nama_kegiatan) {
            return res.status(400).json({
                success: false,
                error: 'Nama kegiatan wajib diisi!'
            });
        }

        if (!payload.kode_unik_full) {
            if (!payload.kode_kegiatan) {
                return res.status(400).json({
                    success: false,
                    error: 'Kode kegiatan dasar wajib diisi untuk menghasilkan kode unik!'
                });
            }
            payload.kode_unik_full = await getNextKodeForPrefix(payload.kode_kegiatan);
            payload.kode_unik_h = payload.kode_unik_full;
            console.log('ℹ️ Kode unik di-generate otomatis:', payload.kode_unik_full);
        } else {
            // Jika kode unik sudah ada, pastikan tidak duplikat di DB.
            const { data: existing, error: existingError } = await supabase
                .from('rpjmdes_standar')
                .select('id')
                .eq('kode_unik_full', payload.kode_unik_full)
                .limit(1);

            if (existingError) throw existingError;
            if (existing && existing.length > 0) {
                if (!payload.kode_kegiatan) {
                    return res.status(400).json({
                        success: false,
                        error: 'Kode unik sudah ada dan kode kegiatan dasar tidak tersedia untuk membuat kode baru.'
                    });
                }
                payload.kode_unik_full = await getNextKodeForPrefix(payload.kode_kegiatan);
                payload.kode_unik_h = payload.kode_unik_full;
                console.log('ℹ️ Duplikat kode unik ditemukan, diganti menjadi:', payload.kode_unik_full);
            }
        }

        // Hitung total manfaat
        const manfaatL = parseInt(payload.manfaat_l) || 0;
        const manfaatP = parseInt(payload.manfaat_p) || 0;
        const manfaatRTM = parseInt(payload.manfaat_rtm) || 0;
        payload.total_manfaat = manfaatL + manfaatP + manfaatRTM;
        payload.penerima_manfaat_bg = payload.total_manfaat;

        // Hitung skor masalah
        const dirasakan = parseInt(payload.dirasakan) || 0;
        const parah = parseInt(payload.parah) || 0;
        const hambat = parseInt(payload.hambat) || 0;
        const sering = parseInt(payload.sering) || 0;
        const potensiSkor = parseInt(payload.potensi_skor) || 0;
        const jumlahNilaiTotal = dirasakan + parah + hambat + sering + potensiSkor;
        payload.jumlah_nilai_total = jumlahNilaiTotal;

        // Tentukan peringkat
        if (jumlahNilaiTotal >= 401) payload.uraian_peringkat = 'I';
        else if (jumlahNilaiTotal >= 301) payload.uraian_peringkat = 'II';
        else if (jumlahNilaiTotal >= 201) payload.uraian_peringkat = 'III';
        else if (jumlahNilaiTotal >= 101) payload.uraian_peringkat = 'IV';
        else payload.uraian_peringkat = 'V';

        // Hitung total kesesuaian
        const visiMisi = parseInt(payload.visi_misi) || 0;
        const pokokBpd = parseInt(payload.pokok_bpd) || 0;
        const programMasyarakat = parseInt(payload.program_masyarakat) || 0;
        const prioritasSdgs = parseInt(payload.prioritas_sdgs_skor) || 0;
        const totalKesesuaian = visiMisi + pokokBpd + programMasyarakat + prioritasSdgs;
        payload.total_kesesuaian = totalKesesuaian;

        // Tentukan ranking
        if (totalKesesuaian >= 301) payload.ranking = 'I';
        else if (totalKesesuaian >= 201) payload.ranking = 'II';
        else if (totalKesesuaian >= 101) payload.ranking = 'III';
        else payload.ranking = 'IV';

        // 🔥 INSERT KE DATABASE
        const { data, error } = await supabase
            .from('rpjmdes_standar')
            .insert([payload])
            .select();

        if (error) {
            console.log('❌ Error insert:', error.message);
            throw error;
        }

        console.log('✅ RPJMDes berhasil disimpan dengan kode:', payload.kode_unik_full);
        res.json({ success: true, data });

    } catch (error) {
        console.log('❌ Error /api/rpjmdes POST:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.put('/api/rpjmdes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const payload = req.body;

        const manfaatL = parseInt(payload.manfaat_l) || 0;
        const manfaatP = parseInt(payload.manfaat_p) || 0;
        const manfaatRTM = parseInt(payload.manfaat_rtm) || 0;
        payload.total_manfaat = manfaatL + manfaatP + manfaatRTM;
        payload.penerima_manfaat_bg = payload.total_manfaat;

        const { data, error } = await supabase
            .from('rpjmdes_standar')
            .update(payload)
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.log('❌ Error /api/rpjmdes PUT:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/rpjmdes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('rpjmdes_standar')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.log('❌ Error /api/rpjmdes DELETE:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// ENDPOINT: USULAN SDGs DESA
// ==========================================
app.get('/api/usulan-sdgs', async (req, res) => {
    try {
        const { tahun } = req.query;

        let query = supabase.from('usulan_sdgs').select('*').limit(200);

        if (tahun) {
            query = query.eq('tahun', parseInt(tahun));
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data: data || []
        });
    } catch (err) {
        console.error("❌ Error fetching usulan_sdgs:", err.message);
        res.status(500).json({
            success: false,
            message: err.message,
            data: []
        });
    }
});

// POST: Tambah Usulan SDGs (duplikasi/salin program urgen)
app.post('/api/usulan-sdgs', async (req, res) => {
    try {
        const payload = req.body;
        const { data, error } = await supabase.from('usulan_sdgs').insert([payload]).select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT: Edit Usulan SDGs
app.put('/api/usulan-sdgs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const payload = req.body;
        const { data, error } = await supabase.from('usulan_sdgs').update(payload).eq('id', id).select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE: Hapus Usulan SDGs (Aman, hanya menghapus dari usulan_sdgs)
app.delete('/api/usulan-sdgs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('usulan_sdgs').delete().eq('id', id);
        if (error) throw error;
        res.json({ success: true, message: 'Data berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// INDIKATOR / FOKUS SDGs DESA — MENARIK DARI prioritas_rkpdes
// ============================================================
// mendukung_sdgs di prioritas_rkpdes bisa berisi "1", "1,2,17", "17".
// Endpoint ini memecahnya menjadi satu baris per nomor SDGs sehingga
// tab SDGs dapat mengelompokkan per SDGs ke- (rowspan), persis seperti
// struktur Matriks Usulan SDGs baku.
app.get('/api/sdgs-prioritas', async (req, res) => {
    try {
        const { tahun } = req.query;
        const tahunInt = parseInt(tahun) || 2027;

        const { data, error } = await supabase
            .from('prioritas_rkpdes')
            .select('*')
            .eq('tahun', tahunInt)
            .order('id', { ascending: true });
        if (error) throw error;

        const rows = [];
        (data || []).forEach(item => {
            const nomorSdgs = String(item.mendukung_sdgs || item.sdgs || '')
                .match(/\d+/g)
                ?.map(Number) || [];

            const kegiatan = item.nama_kegiatan || item.sub_kegiatan || item.jenis_kegiatan || '';

            // Tanpa nomor SDGs → kelompokkan ke 18 (paling umum).
            const daftarSdgs = nomorSdgs.length ? nomorSdgs : [18];

            daftarSdgs.forEach(sdgsKe => {
                if (sdgsKe < 1 || sdgsKe > 18) return;
                rows.push({
                    id: item.id,
                    tahun: tahunInt,
                    sdgs_ke: sdgsKe,
                    no_urut: item.kode_grup || item.no_urut || '',
                    uraian_kegiatan: kegiatan,
                    pengusul: item.nama_pengusul || item.pengusul || '',
                    lokasi_kegiatan: item.lokasi_kegiatan || item.lokasi || 'Desa Batetangnga',
                    prakiraan_volume: item.volume_kegiatan || item.volume_satuan || item.volume || '',
                    penerima_l: 0,
                    penerima_p: 0,
                    penerima_rtm: 0,
                    total_manfaat: item.total_manfaat || 0,
                    keterangan: String(item.mendukung_sdgs || item.sdgs || ''),
                    is_checked: false
                });
            });
        });

        return res.json({ success: true, data: rows, total: rows.length });
    } catch (err) {
        console.error("Error GET /api/sdgs-prioritas:", err.message);
        return res.status(500).json({ success: false, message: err.message, data: [] });
    }
});

// PUT: Edit baris Indikator/Fokus SDGs (menulis balik ke prioritas_rkpdes)
app.put('/api/sdgs-prioritas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;
        const updateData = {};
        if (body.tahun !== undefined) updateData.tahun = parseInt(body.tahun) || 2027;
        if (body.uraian_kegiatan !== undefined) updateData.nama_kegiatan = body.uraian_kegiatan;
        if (body.lokasi_kegiatan !== undefined) updateData.lokasi = body.lokasi_kegiatan;
        if (body.prakiraan_volume !== undefined) updateData.volume = body.prakiraan_volume;
        if (body.sdgs_ke !== undefined || body.keterangan !== undefined) {
            updateData.mendukung_sdgs = String(body.sdgs_ke || body.keterangan || '');
        }
        const { data, error } = await supabase
            .from('prioritas_rkpdes')
            .update(updateData)
            .eq('id', id)
            .select();
        if (error) throw error;
        return res.json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE: Hapus baris Indikator/Fokus SDGs (hapus dari prioritas_rkpdes)
app.delete('/api/sdgs-prioritas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('prioritas_rkpdes').delete().eq('id', id);
        if (error) throw error;
        return res.json({ success: true, message: 'Data berhasil dihapus' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// INDIKATOR / FOKUS SDGs DESA — MENARIK DARI rancangan_rkpdes
// (sumber LENGKAP: sdgs, nama_pengusul, manfaat_l/p/rtm, dll)
// ============================================================
app.get('/api/sdgs-rancangan', async (req, res) => {
    try {
        const { tahun } = req.query;
        const tahunInt = parseInt(tahun) || 2027;

        const { data, error } = await supabase
            .from('rancangan_rkpdes')
            .select('*')
            .eq('tahun', tahunInt)
            .order('kode_unik_full', { ascending: true });
        if (error) throw error;

        const rows = [];
        (data || []).forEach(item => {
            const nomorSdgs = String(item.sdgs || item.mendukung_sdgs || '')
                .match(/\d+/g)
                ?.map(Number) || [];

            const kegiatan = item.nama_kegiatan || item.sub_kegiatan || item.jenis_kegiatan || '';

            // Tanpa nomor SDGs → kelompokkan ke 18 (paling umum).
            const daftarSdgs = nomorSdgs.length ? nomorSdgs : [18];

            daftarSdgs.forEach(sdgsKe => {
                if (sdgsKe < 1 || sdgsKe > 18) return;
                rows.push({
                    id: item.id,
                    tahun: tahunInt,
                    bidang: item.bidang ?? 1,
                    sdgs_ke: sdgsKe,
                    no_urut: item.no_urut || item.urutan_prioritas || '',
                    uraian_kegiatan: kegiatan,
                    pengusul: item.nama_pengusul || item.pengusul || '',
                    lokasi_kegiatan: item.lokasi_kegiatan || item.lokasi || 'Desa Batetangnga',
                    prakiraan_volume: item.volume_kegiatan || item.volume_satuan || item.volume || '',
                    penerima_l: Number(item.manfaat_l ?? item.penerima_laki ?? 0),
                    penerima_p: Number(item.manfaat_p ?? item.penerima_perempuan ?? 0),
                    penerima_rtm: Number(item.manfaat_rtm ?? item.penerima_rtm ?? 0),
                    total_manfaat: Number(item.total_manfaat ?? 0),
                    keterangan: item.data_eksisting || item.data_existing || String(item.sdgs || item.mendukung_sdgs || ''),
                    is_checked: false
                });
            });
        });

        return res.json({ success: true, data: rows, total: rows.length });
    } catch (err) {
        console.error("Error GET /api/sdgs-rancangan:", err.message);
        return res.status(500).json({ success: false, message: err.message, data: [] });
    }
});

// PUT: Edit baris Indikator/Fokus SDGs (menulis balik ke rancangan_rkpdes)
app.put('/api/sdgs-rancangan/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;
        const updateData = {};
        if (body.tahun !== undefined) updateData.tahun = parseInt(body.tahun) || 2027;
        if (body.uraian_kegiatan !== undefined) {
            updateData.nama_kegiatan = body.uraian_kegiatan;
            updateData.sub_kegiatan = body.uraian_kegiatan;
        }
        if (body.pengusul !== undefined) updateData.nama_pengusul = body.pengusul;
        if (body.lokasi_kegiatan !== undefined) {
            updateData.lokasi_kegiatan = body.lokasi_kegiatan;
            updateData.lokasi = body.lokasi_kegiatan;
        }
        if (body.prakiraan_volume !== undefined) {
            updateData.volume_kegiatan = body.prakiraan_volume;
            updateData.volume_satuan = body.prakiraan_volume;
        }
        if (body.penerima_l !== undefined) {
            updateData.manfaat_l = Number(body.penerima_l) || 0;
            updateData.penerima_laki = Number(body.penerima_l) || 0;
        }
        if (body.penerima_p !== undefined) {
            updateData.manfaat_p = Number(body.penerima_p) || 0;
            updateData.penerima_perempuan = Number(body.penerima_p) || 0;
        }
        if (body.penerima_rtm !== undefined) {
            updateData.manfaat_rtm = Number(body.penerima_rtm) || 0;
        }
        if (body.sdgs_ke !== undefined || body.keterangan !== undefined) {
            const sdgs = body.sdgs_ke !== undefined ? body.sdgs_ke : body.keterangan;
            updateData.sdgs = String(sdgs);
            updateData.mendukung_sdgs = String(sdgs);
        }
        updateData.updated_at = new Date();

        const { data, error } = await supabase
            .from('rancangan_rkpdes')
            .update(updateData)
            .eq('id', id)
            .select();
        if (error) throw error;
        return res.json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// POST: Salin satu baris Indikator/Fokus SDGs ke rancangan_rkpdes tahun target
app.post('/api/sdgs-rancangan', async (req, res) => {
    try {
        const body = req.body || {};
        const tahunInt = parseInt(body.tahun) || 2027;
        const payload = {
            tahun: tahunInt,
            bidang: Number(body.bidang) || 1,
            nama_kegiatan: body.uraian_kegiatan,
            sub_kegiatan: body.uraian_kegiatan,
            jenis_kegiatan: body.uraian_kegiatan,
            nama_pengusul: body.pengusul || '',
            lokasi_kegiatan: body.lokasi_kegiatan || 'Desa Batetangnga',
            lokasi: body.lokasi_kegiatan || 'Desa Batetangnga',
            volume_kegiatan: body.prakiraan_volume || '',
            volume_satuan: body.prakiraan_volume || '',
            manfaat_l: Number(body.penerima_l ?? 0),
            manfaat_p: Number(body.penerima_p ?? 0),
            manfaat_rtm: Number(body.penerima_rtm ?? 0),
            penerima_laki: Number(body.penerima_l ?? 0),
            penerima_perempuan: Number(body.penerima_p ?? 0),
            penerima_rtm: Number(body.penerima_rtm ?? 0),
            sdgs: String(body.sdgs_ke || body.keterangan || '18'),
            mendukung_sdgs: String(body.sdgs_ke || body.keterangan || '18'),
            data_eksisting: body.keterangan || '',
            sumber_pembiayaan: body.sumber_dana || 'ADD (Alokasi Dana Desa)'
        };
        const { data, error } = await supabase
            .from('rancangan_rkpdes')
            .insert(payload)
            .select();
        if (error) throw error;
        return res.json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE: Hapus baris Indikator/Fokus SDGs (hapus dari rancangan_rkpdes)
app.delete('/api/sdgs-rancangan/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('rancangan_rkpdes').delete().eq('id', id);
        if (error) throw error;
        return res.json({ success: true, message: 'Data berhasil dihapus' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// ========== USULAN PRIORITAS (tabel usulan) =================
// ============================================================
const USULAN_TABLE = 'usulan';

// GET /api/usulan?tahun=2027
app.get('/api/usulan', async (req, res) => {
    try {
        const { tahun } = req.query;
        let query = supabase.from(USULAN_TABLE).select('*').order('id', { ascending: true }).limit(200);
        if (tahun) {
            query = query.eq('tahun', parseInt(tahun, 10));
        }
        const { data, error } = await query;
        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (err) {
        console.error("❌ Error GET /api/usulan:", err.message);
        res.status(500).json({ success: false, message: err.message, data: [] });
    }
});

// POST /api/usulan
app.post('/api/usulan', async (req, res) => {
    try {
        const p = req.body || {};
        const tahunInt = parseInt(p.tahun, 10) || parseInt(p.tahun_usulan, 10) || 2027;
        const payload = {
            tahun: tahunInt,
            tahun_usulan: tahunInt,
            bidang: p.bidang || null,
            kode_unik_full: p.kode_unik_full || p.kode_unik || null,
            kode_unik: p.kode_unik || null,
            prioritas: parseInt(p.prioritas, 10) || null,
            nama_kegiatan: p.nama_kegiatan || p.kegiatan || null,
            kegiatan: p.kegiatan || p.nama_kegiatan || null,
            sdgs: p.sdgs || null,
            data_eksisting: p.data_eksisting || null,
            lokasi: p.lokasi || null,
            volume: p.volume || null,
            biaya: Number(p.biaya) || 0,
            sasaran: p.sasaran || null,
            pengusul: p.pengusul || null,
            laki_laki: parseInt(p.laki_laki, 10) || 0,
            perempuan: parseInt(p.perempuan, 10) || 0,
            rtm: parseInt(p.rtm, 10) || 0,
            sumber_dana: p.sumber_dana || null,
            updated_at: new Date().toISOString()
        };

        let result;
        if (p.id) {
            const { data: upd, error: updErr } = await supabase
                .from(USULAN_TABLE).update(payload).eq('id', p.id).select();
            if (updErr) throw updErr;
            result = Array.isArray(upd) && upd.length > 0 ? upd[0] : payload;
        } else {
            const { data: data2, error: err2 } = await supabase
                .from(USULAN_TABLE).insert([payload]).select();
            if (err2) throw err2;
            result = Array.isArray(data2) && data2.length > 0 ? data2[0] : payload;
        }
        res.json({ success: true, data: result });
    } catch (err) {
        console.error("❌ Error POST /api/usulan:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/usulan/:id
app.put('/api/usulan/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const p = req.body || {};
        const payload = { ...p, updated_at: new Date().toISOString() };
        const { data, error } = await supabase.from(USULAN_TABLE).update(payload).eq('id', id).select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        console.error("❌ Error PUT /api/usulan:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/usulan/:id
app.delete('/api/usulan/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from(USULAN_TABLE).delete().eq('id', id);
        if (error) throw error;
        res.json({ success: true, message: 'Usulan berhasil dihapus' });
    } catch (err) {
        console.error("❌ Error DELETE /api/usulan:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// ========== BIDANG LIST & STATISTIK =========================
// ============================================================

app.get('/api/bidang-list', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('rpjmdes_standar')
            .select('bidang')
            .not('bidang', 'is', null)
            .order('bidang');

        if (error) throw error;

        const bidangList = [...new Set(data.map(item => item.bidang))];
        res.json({ success: true, data: bidangList });
    } catch (error) {
        console.log('❌ Error /api/bidang-list:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/rpjmdes-stats', async (req, res) => {
    try {
        const { tahun = '2026' } = req.query;
        const column = `target_${tahun}`;

        const { count: totalKegiatan, error: err1 } = await supabase
            .from('rpjmdes_standar')
            .select('*', { count: 'exact', head: true })
            .eq(column, tahun);

        if (err1) throw err1;

        const { data: paguData, error: err2 } = await supabase
            .from('rpjmdes_standar')
            .select('pagu_rpjm')
            .eq(column, tahun);

        if (err2) throw err2;

        const totalPagu = paguData.reduce((sum, item) => sum + (item.pagu_rpjm || 0), 0);

        const { data: bidangData, error: err3 } = await supabase
            .from('rpjmdes_standar')
            .select('bidang, pagu_rpjm')
            .eq(column, tahun);

        if (err3) throw err3;

        const bidangMap = {};
        bidangData.forEach(item => {
            const b = item.bidang || 'Lainnya';
            bidangMap[b] = (bidangMap[b] || 0) + (item.pagu_rpjm || 0);
        });

        res.json({
            success: true,
            data: {
                totalKegiatan,
                totalPagu,
                bidangData: {
                    labels: Object.keys(bidangMap),
                    values: Object.values(bidangMap)
                }
            }
        });
    } catch (error) {
        console.log('❌ Error /api/rpjmdes-stats:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Units endpoints: try DB then fallback to file storage
app.get('/api/units', async (req, res) => {
    try {
        const list = await listUnitsFromDb().catch(err => {
            if (isTableMissingError(err)) return null;
            throw err;
        });
        if (list && list.length) return res.json({ success: true, units: list });
        // fallback to file
        const fileUnits = readUnitsStorage();
        return res.json({ success: true, units: fileUnits });
    } catch (error) {
        console.error('GET /api/units error', error.message);
        const fileUnits = readUnitsStorage();
        res.status(500).json({ success: false, units: fileUnits, error: error.message });
    }
});

app.post('/api/units', async (req, res) => {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ success: false, error: 'missing name' });
    try {
        const dbRes = await saveUnitToDb(name).catch(err => {
            if (isTableMissingError(err)) return null;
            throw err;
        });
        // always write to file as fallback/replica
        existing.push(name);
        writeUnitsStorage(existing);
        res.json({ success: true, unit: dbRes ? dbRes : { name } });
    } catch (error) {
        console.error('POST /api/units error', error.message);
        const existing = readUnitsStorage();
        existing.push(name);
        writeUnitsStorage(existing);
        res.status(500).json({ success: false, unit: { name }, error: error.message });
    }
});

// ============================================================
// ========== RKPDesa DATA ENDPOINTS (FILTERS BY RAB & ENRICHES RPJM)
// ============================================================
const RKPDes_STORAGE_PATH = path.join(__dirname, 'backend', 'rkpdes-storage.json');
const RKPDes_TABLE = 'rkpdes_data';

// GET /api/rkpdes
app.get('/api/rkpdes', async (req, res) => {
    try {
        const { tahun } = req.query;
        const tahunInt = parseInt(tahun) || 2027;
        console.log(`[STRICT] 📡 GET /api/rkpdes from 'rkpdes' table ONLY for year: ${tahunInt}`);

        let { data, error } = await supabase
            .from('rkpdes') // Sumber data utama RKPDes
            .select('*')
            .eq('tahun', tahunInt);
        
        if (error) {
            console.error('❌ Error in GET /api/rkpdes:', error.message);
            if (isTableMissingError(error)) {
                console.warn('⚠️ Tabel `rkpdes` tidak ditemukan.');
                return res.json({ success: true, data: [], source: 'rkpdes-table-missing' });
            }
            return res.status(500).json({ success: false, error: error.message, data: [] });
        }

        if (!data) data = [];

        if (data.length === 0) {
            console.log(`⚠️ Tabel 'rkpdes' kosong untuk tahun ${tahunInt}, mencoba fallback hanya dari data RAB tahun ini...`);
            try {
                const { data: rabData } = await supabase.from('rab').select('id, kode_unik, kode_unik_full, nama_kegiatan, jenis_kegiatan, bidang, jenis_bidang, lokasi, lokasi_kegiatan, volume, satuan, waktu_pelaksanaan, jumlah_anggaran, total_biaya, sumber_dana, sasaran_kegiatan, penerima_manfaat, items, rpjm_data, tahun').eq('tahun', tahunInt);

                const rabMapByCode = new Map();
                if (Array.isArray(rabData)) {
                    rabData.forEach(rb => {
                        if (rb.kode_unik_full) rabMapByCode.set(String(rb.kode_unik_full).trim(), rb);
                        if (rb.kode_unik) rabMapByCode.set(String(rb.kode_unik).trim(), rb);
                    });
                }

                if (rabMapByCode.size > 0 && Array.isArray(rabData)) {
                    const generated = rabData.map(rb => {
                        const code = String(rb.kode_unik_full || rb.kode_unik || '').trim();
                        let rpjmObj = {};
                        if (rb.rpjm_data) {
                            if (typeof rb.rpjm_data === 'string') {
                                try { rpjmObj = JSON.parse(rb.rpjm_data); } catch(e) {}
                            } else if (typeof rb.rpjm_data === 'object') {
                                rpjmObj = rb.rpjm_data;
                            }
                        }
                        const items = Array.isArray(rb.items) ? rb.items : [];
                        const totalBiaya = Number(rb.jumlah_anggaran || rb.total_biaya || 0) || items.reduce((s, it) => s + (Number(it.jumlah) || 0), 0);
                        return {
                            id: rb.id || code,
                            tahun: tahunInt,
                            kode_unik_full: code,
                            bidang: rb.bidang || rpjmObj.bidang || 'Bidang Penyelenggaraan Pemerintah Desa',
                            jenis_bidang: rb.jenis_bidang || rpjmObj.jenis_bidang || '-',
                            jenis_kegiatan: rpjmObj.jenis_kegiatan || rb.jenis_kegiatan || rb.nama_kegiatan || '-',
                            nama_kegiatan: rb.nama_kegiatan || rpjmObj.nama_kegiatan || '-',
                            lokasi: rb.lokasi || rb.lokasi_kegiatan || rpjmObj.lokasi_kegiatan || 'Desa Batetangnga',
                            volume: String(rb.volume || items[0]?.volume || 1),
                            satuan: rb.satuan || rpjmObj.satuan_rab || 'Paket',
                            waktu_pelaksanaan: rpjmObj.waktu_pelaksanaan || '12 Bulan',
                            prakiraan_biaya: totalBiaya,
                            sumber_pembiayaan: rb.sumber_dana || rpjmObj.sumber_dana || 'DDS',
                            pola_pelaksanaan: rpjmObj.pola_pelaksanaan || 'Swakelola',
                            status_rab: 'Sudah Dibuat',
                            data_eksisting: rpjmObj.data_existing || rpjmObj.data_eksisting || '-',
                            target_capaian: rpjmObj.target_capaian || String(rb.volume || 1),
                            mendukung_sdgs: rpjmObj.sdgs || '-'
                        };
                    });
                    data = generated;
                }
            } catch (fallbackErr) {
                console.error('❌ Error during RKPDes fallback generation:', fallbackErr.message);
            }
        }

        try {
            const enrichStd = await getCachedRpjmdesStandar();
            const { data: enrichRab } = await supabase.from('rab').select('id, kode_unik, kode_unik_full, nama_kegiatan, jenis_kegiatan, jumlah_anggaran, total_biaya, items, tahun').eq('tahun', tahunInt);
            const stdMap = new Map();
            const stdNameMap = new Map();
            if (Array.isArray(enrichStd)) {
                enrichStd.forEach(s => {
                    if (s.kode_unik_full) stdMap.set(String(s.kode_unik_full).trim(), s);
                    if (s.kode_unik) stdMap.set(String(s.kode_unik).trim(), s);
                    if (s.nama_kegiatan) stdNameMap.set(String(s.nama_kegiatan).trim().toLowerCase(), s);
                });
            }
            const matchStd = (code, namaKegiatan) => {
                if (code && stdMap.get(String(code).trim())) return stdMap.get(String(code).trim());
                if (namaKegiatan) {
                    const key = String(namaKegiatan).trim().toLowerCase();
                    if (stdNameMap.has(key)) return stdNameMap.get(key);
                    for (const [sKey, sRow] of stdNameMap.entries()) {
                        if (key.includes(sKey) || sKey.includes(key)) return sRow;
                    }
                }
                return null;
            };
            const rabMap = new Map();
            const rabNameMap = new Map();
            if (Array.isArray(enrichRab)) {
                enrichRab.forEach(rb => {
                    if (rb.kode_unik_full) rabMap.set(String(rb.kode_unik_full).trim(), rb);
                    if (rb.kode_unik) rabMap.set(String(rb.kode_unik).trim(), rb);
                    const nameKey = String(rb.nama_kegiatan || rb.jenis_kegiatan || '').trim().toLowerCase();
                    if (nameKey) rabNameMap.set(nameKey, rb);
                });
            }
            data.forEach(row => {
                const baseKode = String(row.kode_unik_full || row.kode_unik || '').trim();
                const cleanPrefix = baseKode.split('..')[0].trim();
                const std = matchStd(baseKode, row.jenis_kegiatan || row.nama_kegiatan);
                
                let rab = rabMap.get(baseKode) || rabMap.get(cleanPrefix);
                if (!rab && (row.jenis_kegiatan || row.nama_kegiatan)) {
                    const rNameKey = String(row.jenis_kegiatan || row.nama_kegiatan).trim().toLowerCase();
                    rab = rabNameMap.get(rNameKey);
                }

                if (rab) {
                    const items = Array.isArray(rab.items) ? rab.items : [];
                    const itemsSum = items.reduce((s, it) => s + (Number(it.jumlah || (it.volume * it.harga_satuan)) || 0), 0);
                    const rabTotal = Number(rab.jumlah_anggaran || rab.total_biaya || 0) || itemsSum;
                    if (rabTotal > 0) {
                        row.prakiraan_biaya = rabTotal;
                    }
                    if (rab.sumber_dana) {
                        row.sumber_pembiayaan = rab.sumber_dana;
                    }
                    row.status_rab = 'Sudah Dibuat';
                }

                const rpjmObj = (rab && (typeof rab.rpjm_data === 'object' ? rab.rpjm_data : (() => { try { return JSON.parse(rab.rpjm_data); } catch(e) { return {}; } })())) || {};

                const dataEks = row.data_eksisting || row.data_existing || rpjmObj.data_eksisting || rpjmObj.data_existing || (std && (std.data_existing || std.data_eksisting));
                if (!row.data_eksisting || row.data_eksisting === '-' || row.data_eksisting === '') {
                    row.data_eksisting = dataEks || '-';
                }

                const target = row.target_capaian || rpjmObj.target_capaian || (std && std.target_capaian_kegiatan) || row.volume;
                if (!row.target_capaian || row.target_capaian === '-' || row.target_capaian === '') {
                    row.target_capaian = target || '-';
                }

                const sdg = row.mendukung_sdgs || row.sdgs || rpjmObj.mendukung_sdgs || rpjmObj.sdgs || (std && (std.sdgs || std.mendukung_sdgs));
                if (!row.mendukung_sdgs || row.mendukung_sdgs === '-' || row.mendukung_sdgs === '') {
                    row.mendukung_sdgs = sdg || '-';
                }

                if (std) {
                    if (std.bidang) row.bidang = std.bidang;
                    if (std.jenis_bidang) row.jenis_bidang = std.jenis_bidang;
                    if (std.jenis_kegiatan) {
                        row.jenis_kegiatan = std.jenis_kegiatan;
                        row.jenis_kegiatan_kelompok = std.jenis_kegiatan;
                    }
                    if (std.nama_kegiatan) row.nama_kegiatan = std.nama_kegiatan;
                    if (std.kode_bidang) row.kode_bidang = std.kode_bidang;
                    if (std.kode_sub) row.kode_sub = std.kode_sub;
                    if (std.kode_kegiatan) row.kode_kegiatan = std.kode_kegiatan;
                }

                const stdTotManfaat = (std && std.total_manfaat != null) ? Number(std.total_manfaat) : NaN;
                if ((!row.penerima_manfaat || row.penerima_manfaat === '-' || row.penerima_manfaat === '') || (row.total_manfaat === 0 && !isNaN(stdTotManfaat) && stdTotManfaat > 0)) {
                    let mL = Number((std && std.manfaat_l != null) ? std.manfaat_l : (rpjmObj.manfaat_l || 0));
                    let mP = Number((std && std.manfaat_p != null) ? std.manfaat_p : (rpjmObj.manfaat_p || 0));
                    let mR = Number((std && std.manfaat_rtm != null) ? std.manfaat_rtm : (rpjmObj.manfaat_rtm || 0));
                    let tot = (!isNaN(stdTotManfaat) && stdTotManfaat > 0) ? stdTotManfaat : (mL + mP + mR);
                    row.total_manfaat = tot;
                    row.penerima_manfaat = tot > 0 ? `${tot} Orang` : row.sasaran_manfaat || '-';
                }
                if (!row.volume || String(row.volume) === '1' || String(row.volume) === '0') {
                    row.volume = String(row.volume || rpjmObj.volume_kegiatan || (std && std.volume_kegiatan) || 1);
                }
            });
        } catch (enrichErr) {
            console.warn('⚠️ Pengayaan RKPDes gagal (dilewati):', enrichErr.message);
        }

        sortHierarchical(data);
        return res.json({ success: true, data, source: 'rkpdes-table' });
    } catch (error) {
        console.error('❌ Unhandled exception in GET /api/rkpdes:', error.message);
        res.status(500).json({ success: false, error: error.message, data: [] });
    }
});

app.post('/api/rkpdes/clear-and-sync', async (req, res) => {
    try {
        const { tahun } = req.body;
        const tahunInt = parseInt(tahun);

        if (!tahunInt) {
            return res.status(400).json({ success: false, error: 'Tahun anggaran valid diperlukan.' });
        }

        // 0. Simpan flag manual (stunting, verifikasi) dari baris yang akan dihapus
        //    agar tidak hilang setelah sinkronisasi ulang (perbaikan "ceklis direset").
        const { data: preExisting } = await supabase
            .from('rkpdes')
            .select('*')
            .eq('tahun', tahunInt);
        const flagByKode = new Map();
        if (Array.isArray(preExisting)) {
            preExisting.forEach(r => {
                const k = String(r.kode_unik_full || '').trim();
                const rec = flagByKode.get(k) || { stunting: null, verifikasi_proposal: null };
                if ((!rec.stunting || rec.stunting === 'Tidak') && r.stunting === 'Ya') rec.stunting = 'Ya';
                if ((!rec.verifikasi_proposal || rec.verifikasi_proposal === 'Belum') && r.verifikasi_proposal === 'Ya') rec.verifikasi_proposal = 'Ya';
                flagByKode.set(k, rec);
            });
        }

        // 1. Delete data lama untuk tahun tersebut
        const { error: deleteError } = await supabase
            .from('rkpdes')
            .delete()
            .eq('tahun', tahunInt);

        if (deleteError) throw deleteError;

        // 2. Ambil data dari tabel RAB
        const { data: rabData, error: rabError } = await supabase
            .from('rab')
            .select('*')
            .eq('tahun', tahunInt);

        if (rabError) throw rabError;

        if (!rabData || rabData.length === 0) {
            return res.json({ success: true, message: 'Tidak ada data RAB untuk tahun ini. Tabel RKPDes telah dikosongkan.' });
        }

// 3. Transformasi dan masukkan data dari RAB ke RKPDes
        const { rows: rkpdesPayload } = await buildRkpPayLoadFromRAB(tahunInt);

        // Terapkan kembali flag manual yang disimpan sebelumnya
        rkpdesPayload.forEach(row => {
            const k = String(row.kode_unik_full || '').trim();
            const rec = flagByKode.get(k);
            if (rec) {
                if (rec.stunting) row.stunting = rec.stunting;
                if (rec.verifikasi_proposal) row.verifikasi_proposal = rec.verifikasi_proposal;
            }
        });

        if (rkpdesPayload.length > 0) {
            const { error: insertError } = await supabase
                .from('rkpdes')
                .insert(rkpdesPayload);

            if (insertError) throw insertError;
        }

        res.json({ success: true, message: `Sinkronisasi berhasil: ${rkpdesPayload.length} data dari RAB telah dimasukkan ke RKPDes.` });
    } catch (error) {
        console.error('❌ Error during clear-and-sync:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});


// ============================================================
// STUNTING & LAPORAN PERKEMBANGAN API
// Sumber data: tabel `rkpdes` (sesuai alur kerja sistem —
// "Penanganan Stunting menarik data dari rkpdes").
// ============================================================

const BULAN_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function bulanToNumber(val) {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') return (val >= 1 && val <= 12) ? val : null;
    const str = String(val).trim();
    const asNum = parseInt(str, 10);
    if (!isNaN(asNum) && asNum >= 1 && asNum <= 12) return asNum;
    const idx = BULAN_NAMES.findIndex(name => name.toLowerCase() === str.toLowerCase());
    return idx >= 0 ? idx + 1 : null;
}

function bulanNumberToName(num) {
    const n = parseInt(num, 10);
    return (n >= 1 && n <= 12) ? BULAN_NAMES[n - 1] : String(num || '');
}

// Bidang RKPDes (1-5) diambil dari nama bidang atau kode unik.
function resolveBidangNumero(item) {
    const text = String(item.bidang || item.nama_bidang || '').trim().toLowerCase();
    const kode = String(item.kode_unik_full || item.kode_unik || '').trim();
    if (text.includes('penyelenggaraan') || text.includes('pemerintahan')) return 1;
    if (text.includes('pembangunan')) return 2;
    if (text.includes('pembinaan kemasyarakatan')) return 3;
    if (text.includes('pemberdayaan')) return 4;
    if (text.includes('bencana') || text.includes('keadaan darurat') || text.includes('mendesak')) return 5;
    const m = kode.match(/^0?([1-5])\b/);
    if (m) return parseInt(m[1], 10);
    const numFromText = parseInt(text.replace(/[^0-9]/g, ''), 10);
    if (numFromText >= 1 && numFromText <= 5) return numFromText;
    return 1;
}

// Bidang RKPDes 1-5 (sama dengan skema RKPDes/laporan perkembangan).
const BIDANG_RKPDES_TEXT = {
    1: 'Bidang Penyelenggaraan Pemerintahan Desa',
    2: 'Bidang Pelaksanaan Pembangunan Desa',
    3: 'Bidang Pembinaan Kemasyarakatan',
    4: 'Bidang Pemberdayaan Masyarakat',
    5: 'Bidang Penanggulangan Bencana, Keadaan Darurat Dan Mendesak Desa'
};

function mapStuntingBidang(item) {
    return resolveBidangNumero(item);
}

function mapRkpdesToStunting(rp) {
    const biaya = Number(rp.prakiraan_biaya || 0);
    const manfaat = rp.penerima_manfaat || rp.sasaran_manfaat || '';
    return {
        id: String(rp.id),
        rkpdes_id: rp.id,
        kode_unik_full: rp.kode_unik_full || '',
        tahun: rp.tahun,
        bidang: mapStuntingBidang(rp),
        jenis_kegiatan: rp.jenis_kegiatan || '',
        nama_kegiatan: rp.jenis_kegiatan || '',
        kegiatan: rp.jenis_kegiatan || '',
        lokasi: rp.lokasi || 'Desa Batetangnga',
        volume: rp.volume || rp.volume_satuan || '',
        volume_satuan: rp.volume_satuan || rp.volume || '',
        penerima_manfaat: manfaat,
        sasaran: manfaat,
        sasaran_manfaat: manfaat,
        waktu_pelaksanaan: rp.waktu_pelaksanaan || '12 Bulan',
        biaya: biaya,
        anggaran: biaya,
        sumber_biaya: rp.sumber_pembiayaan || rp.sumber_dana || 'DDS',
        sumber_pembiayaan: rp.sumber_pembiayaan || rp.sumber_dana || 'DDS',
        pola_pelaksanaan: rp.pola_pelaksanaan || 'Swakelola',
        stunting: rp.stunting || 'Ya',
        status: 'Terencana'
    };
}

function mapRkpdesToLaporan(rp, tahun, bulan, rpjm) {
    const biaya = Number(rp.prakiraan_biaya || 0) || Number(rpjm?.pagu_rpjm || 0);
    const volumeRkp = (rp.volume ? String(rp.volume) : '') + (rp.satuan ? ` ${rp.satuan}` : '');
    return {
        id: null,
        kode_unik_full: rp.kode_unik_full || '',
        rkpdes_id: rp.id,
        tahun: parseInt(tahun, 10) || rp.tahun,
        bulan: bulan || '',
        bidang: resolveBidangNumero(rp),
        sub_bidang: rpjm?.sub_bidang || rpjm?.jenis_bidang || rp.bidang || '-',
        nama_kegiatan: rp.jenis_kegiatan || rp.nama_kegiatan || '',
        lokasi: rp.lokasi || rp.lokasi_kegiatan || 'Desa Batetangnga',
        volume_satuan: volumeRkp || rp.volume_satuan || rpjm?.volume_kegiatan || '1 Paket',
        biaya: biaya,
        penerima_jumlah: Number(rp.total_manfaat || rpjm?.total_manfaat || 0),
        penerima_lk: Number(rp.manfaat_l || rpjm?.manfaat_l || 0),
        penerima_pr: Number(rp.manfaat_p || rpjm?.manfaat_p || 0),
        penerima_rtm: Number(rp.manfaat_rtm || rpjm?.manfaat_rtm || 0),
        // RENCANA WAKTU, PROGRES & KETERANGAN: DIKOSONGKAN — diisi manual oleh pengguna
        rencana_hari: 0,
        tgl_mulai: '',
        progres_fisik: 0,
        progres_biaya: 0,
        keterangan: ''
    };
}

// Tempel data pelengkap dari rpjmdes_standar berdasarkan kode unik rkpdes.
function findRpjmByKode(rpjmMap, kode) {
    const k = String(kode || '').trim().replace(/\.+$/, '');
    if (!k) return null;
    if (rpjmMap.has(k)) return rpjmMap.get(k);
    // Kode rkpdes bisa "01.01.01.01..011" → cari prefiks induk terpanjang
    // yang cocok di rpjmdes_standar ("01.01.01.01.").
    let best = null;
    let bestLen = -1;
    for (const [key, rec] of rpjmMap.entries()) {
        const norm = String(key).trim().replace(/\.+$/, '');
        if (k.startsWith(norm) && norm.length > bestLen) {
            best = rec;
            bestLen = norm.length;
        }
    }
    return best;
}

// Muat seluruh rpjmdes_standar sekali lalu jadikan map {kode_unik_full: record}.
async function loadRpjmLookup() {
    const { data, error } = await supabase
        .from('rpjmdes_standar')
        .select('*');
    if (error) {
        console.warn('⚠️ Gagal memuat rpjmdes_standar:', error.message);
        return new Map();
    }
    const map = new Map();
    (data || []).forEach(rec => {
        const k = String(rec.kode_unik_full || rec.kode_unik || '').trim().replace(/\.+$/, '');
        if (k) map.set(k, rec);
    });
    return map;
}

// ------------------------------------------------------------------
// STUNTING API — sumber: rkpdes (stunting = 'Ya')
// ------------------------------------------------------------------

// GET /api/stunting?tahun=2027 — semua kegiatan ber-stunting di rkpdes
app.get('/api/stunting', async (req, res) => {
    try {
        const { tahun } = req.query;
        const tahunInt = parseInt(tahun) || 2027;
        const { data, error } = await supabase
            .from('rkpdes')
            .select('*')
            .eq('tahun', tahunInt)
            .eq('stunting', 'Ya')
            .order('kode_unik_full', { ascending: true });
        if (error) throw error;
        const rows = (data || []).map(mapRkpdesToStunting);
        return res.json({ success: true, data: rows, total: rows.length, source: 'rkpdes' });
    } catch (err) {
        console.error('❌ Error GET /api/stunting:', err.message);
        return res.status(500).json({ success: false, error: err.message, data: [] });
    }
});

// GET /api/stunting/tarik-rab?tahun=YYYY — daftar kegiatan rkpdes (untuk modal pilih)
app.get('/api/stunting/tarik-rab', async (req, res) => {
    try {
        const { tahun } = req.query;
        const tahunInt = parseInt(tahun) || 2027;
        const { data, error } = await supabase
            .from('rkpdes')
            .select('*')
            .eq('tahun', tahunInt)
            .not('jenis_kegiatan', 'is', null)
            .order('kode_unik_full', { ascending: true });
        if (error) throw error;
        const out = (data || []).map(rp => ({
            id: rp.id,
            rkpdes_id: rp.id,
            kode_unik: rp.kode_unik_full || '',
            kode: rp.kode_unik_full || '',
            kode_unik_full: rp.kode_unik_full || '',
            bidang: rp.bidang || '',
            sub_bidang: rp.bidang || '',
            uraian: rp.jenis_kegiatan || rp.nama_kegiatan || '',
            nama_kegiatan: rp.jenis_kegiatan || rp.nama_kegiatan || '',
            kegiatan: rp.jenis_kegiatan || rp.nama_kegiatan || '',
            jenis_kegiatan: rp.jenis_kegiatan || '',
            lokasi: rp.lokasi || 'Desa Batetangnga',
            volume: rp.volume || '',
            volume_satuan: rp.volume || '',
            biaya: Number(rp.prakiraan_biaya || 0),
            jumlah_anggaran: Number(rp.prakiraan_biaya || 0),
            stunting_selected: rp.stunting === 'Ya'
        }));
        return res.json({ success: true, data: out });
    } catch (err) {
        console.error('❌ Error GET /api/stunting/tarik-rab:', err.message);
        return res.status(500).json({ success: false, error: err.message, data: [] });
    }
});

// POST /api/stunting/tarik-rab — tandai kegiatan terpilih sebagai stunting
app.post('/api/stunting/tarik-rab', async (req, res) => {
    try {
        const { ids } = req.body || {};
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, error: 'Pilih minimal 1 kegiatan dari rkpdes.' });
        }
        const cleanIds = ids.map(id => (typeof id === 'number' && id) || parseInt(id, 10)).filter(Boolean);
        if (cleanIds.length === 0) {
            return res.status(400).json({ success: false, error: 'ID kegiatan tidak valid.' });
        }
        const { error } = await supabase
            .from('rkpdes')
            .update({ stunting: 'Ya', updated_at: new Date().toISOString() })
            .in('id', cleanIds);
        if (error) throw error;
        return res.json({ success: true, message: `${cleanIds.length} kegiatan ditandai sebagai penanganan stunting.` });
    } catch (err) {
        console.error('❌ Error POST /api/stunting/tarik-rab:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// PUT /api/stunting — simpan perubahan baris stunting kembali ke rkpdes
app.put('/api/stunting', async (req, res) => {
    try {
        const item = req.body || {};
        const tahunInt = parseInt(item.tahun || 2027, 10) || 2027;
        const rkpdesId = item.rkpdes_id || item.id || null;
        const payload = {
            jenis_kegiatan: item.jenis_kegiatan || item.nama_kegiatan || '',
            lokasi: item.lokasi || 'Desa Batetangnga',
            volume: String(item.volume_satuan || ''),
            sasaran_manfaat: item.sasaran || item.penerima_manfaat || '',
            penerima_manfaat: item.penerima_manfaat || item.sasaran || '',
            waktu_pelaksanaan: item.waktu_pelaksanaan || '12 Bulan',
            prakiraan_biaya: Number(item.biaya || item.anggaran || 0),
            sumber_pembiayaan: item.sumber_biaya || item.sumber_pembiayaan || 'DDS',
            pola_pelaksanaan: item.pola_pelaksanaan || 'Swakelola',
            stunting: 'Ya',
            updated_at: new Date().toISOString()
        };
        let result;
        if (rkpdesId) {
            const { data, error } = await supabase.from('rkpdes').update(payload).eq('id', rkpdesId).select();
            if (error) throw error;
            result = Array.isArray(data) && data.length > 0 ? data[0] : null;
        } else {
            const bidangText = BIDANG_RKPDES_TEXT[Number(item.bidang)] || BIDANG_RKPDES_TEXT[1];
            const { data, error } = await supabase.from('rkpdes').insert([{
                tahun: tahunInt,
                kode_unik_full: item.kode_unik_full || `STUNTING.${Date.now()}`,
                bidang: bidangText,
                status_rab: 'Belum Dibuat',
                ...payload
            }]).select();
            if (error) throw error;
            result = Array.isArray(data) && data.length > 0 ? data[0] : null;
        }

        return res.json({ success: true, message: 'Data stunting berhasil disimpan ke rkpdes.', data: result });
    } catch (err) {
        console.error('❌ Error PUT /api/stunting:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/stunting?id= — hapus dari laporan stunting (stunting → 'Tidak')
app.delete('/api/stunting', async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) return res.status(400).json({ success: false, error: 'ID diperlukan' });
        const { error } = await supabase
            .from('rkpdes')
            .update({ stunting: 'Tidak', updated_at: new Date().toISOString() })
            .eq('id', parseInt(id, 10));
        if (error) throw error;
        return res.json({ success: true, message: 'Kegiatan dihapus dari laporan stunting (tetap tersimpan di RKPDes).' });
    } catch (err) {
        console.error('❌ Error DELETE /api/stunting:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/stunting/sync — batch simpan seluruh baris stunting ke rpdes
app.post('/api/stunting/sync', async (req, res) => {
    try {
        const { tahun, data: rows } = req.body || {};
        if (!Array.isArray(rows)) {
            return res.status(400).json({ success: false, error: '`data` harus berupa array kegiatan.' });
        }
        const tahunInt = parseInt(tahun || 2027, 10) || 2027;
        let updated = 0;
        let inserted = 0;
        for (const item of rows) {
            const rkpId = item.rkpdes_id || item.id || null;
            const payload = {
                tahun: tahunInt,
                kode_unik_full: item.kode_unik_full || `STUNT-${tahunInt}-${Date.now()}-${updated + inserted}`,
                bidang: BIDANG_RKPDES_TEXT[Number(item.bidang)] || BIDANG_RKPDES_TEXT[1],
                jenis_kegiatan: String(item.jenis_kegiatan || '').trim() || '-',
                lokasi: item.lokasi || 'Desa Batetangnga',
                volume: String(item.volume_satuan || ''),
                sasaran_manfaat: item.sasaran || item.penerima_manfaat || '',
                penerima_manfaat: item.penerima_manfaat || item.sasaran || '',
                waktu_pelaksanaan: item.waktu_pelaksanaan || '12 Bulan',
                prakiraan_biaya: Number(item.biaya || 0),
                sumber_pembiayaan: item.sumber_biaya || item.sumber_pembiayaan || 'DDS',
                pola_pelaksanaan: item.pola_pelaksanaan || 'Swakelola',
                status_rab: 'Belum Dibuat',
                stunting: 'Ya',
                updated_at: new Date().toISOString()
            };
            if (rkpId) {
                const { error } = await supabase
                    .from('rkpdes')
                    .update(payload)
                    .eq('id', rkpId);
                if (error) throw error;
                updated++;
            } else {
                const { error } = await supabase.from('rkpdes').insert(payload);
                if (error) throw error;
                inserted++;
            }
        }
        return res.json({
            success: true,
            message: `Stunting tersinkron: ${updated} update, ${inserted} insert (tahun ${tahunInt}).`
        });
    } catch (err) {
        console.error('❌ Error POST /api/stunting/sync:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// -----------------------------------------------------------------
// LAPORAN PERKEMBANGAN API — sumber awal dari rkpdes, progres disimpan
// ke tabel `laporan_perkembangan`.
// -----------------------------------------------------------------

function mapLaporanRowToFront(row) {
    return {
        id: String(row.id),
        kode_unik_full: row.kode_unik_full || '',
        tahun: row.tahun,
        bulan: bulanNumberToName(row.bulan),
        bidang: Number(row.bidang) || 1,
        sub_bidang: row.sub_bidang || '-',
        nama_kegiatan: row.nama_kegiatan || '',
        lokasi: row.lokasi || 'Desa Batetangnga',
        volume_satuan: row.volume_satuan || '-',
        biaya: Number(row.biaya || 0),
        penerima_jumlah: Number(row.penerima_jumlah || 0),
        penerima_lk: Number(row.penerima_lk || 0),
        penerima_pr: Number(row.penerima_pr || 0),
        penerima_rtm: Number(row.penerima_rtm || 0),
        rencana_hari: Number(row.rencana_hari || 0),
        tgl_mulai: row.tgl_mulai || '',
        progres_fisik: Number(row.progres_fisik || 0),
        progres_biaya: Number(row.progres_biaya || 0),
        keterangan: row.keterangan || ''
    };
}

function buildLaporanPayload(item, bulanNum) {
    const tahunInt = parseInt(item.tahun || 2027, 10) || 2027;
    return {
        tahun: tahunInt,
        bulan: bulanNum || 1,
        bidang: Number(item.bidang) || 1,
        sub_bidang: item.sub_bidang || '-',
        nama_kegiatan: item.nama_kegiatan || '',
        lokasi: item.lokasi || 'Desa Batetangnga',
        volume_satuan: item.volume_satuan || '-',
        biaya: Number(item.biaya || 0),
        penerima_jumlah: Number(item.penerima_jumlah || 0),
        penerima_lk: Number(item.penerima_lk || 0),
        penerima_pr: Number(item.penerima_pr || 0),
        penerima_rtm: Number(item.penerima_rtm || 0),
        rencana_hari: Number(item.rencana_hari || 0),
        tgl_mulai: item.tgl_mulai || null,
        progres_fisik: Number(item.progres_fisik || 0),
        progres_biaya: Number(item.progres_biaya || 0),
        keterangan: item.keterangan || '',
        updated_at: new Date().toISOString()
    };
}

// Patch parsial — hanya kolom yang dikirim yang diubah (updateProgres hanya
// mengirim {id, progres_fisik}, jangan sampai menghapus data lain).
function buildLaporanPatch(item) {
    const patch = { updated_at: new Date().toISOString() };
    if (item.tahun !== undefined) patch.tahun = parseInt(item.tahun, 10) || 2027;
    if (item.bulan !== undefined) patch.bulan = bulanToNumber(item.bulan) || 1;
    if (item.bidang !== undefined) patch.bidang = Number(item.bidang) || 1;
    if (item.sub_bidang !== undefined) patch.sub_bidang = item.sub_bidang;
    if (item.nama_kegiatan !== undefined) patch.nama_kegiatan = item.nama_kegiatan;
    if (item.lokasi !== undefined) patch.lokasi = item.lokasi;
    if (item.volume_satuan !== undefined) patch.volume_satuan = item.volume_satuan;
    if (item.biaya !== undefined) patch.biaya = Number(item.biaya || 0);
    if (item.penerima_jumlah !== undefined) patch.penerima_jumlah = Number(item.penerima_jumlah || 0);
    if (item.penerima_lk !== undefined) patch.penerima_lk = Number(item.penerima_lk || 0);
    if (item.penerima_pr !== undefined) patch.penerima_pr = Number(item.penerima_pr || 0);
    if (item.penerima_rtm !== undefined) patch.penerima_rtm = Number(item.penerima_rtm || 0);
    if (item.rencana_hari !== undefined) patch.rencana_hari = Number(item.rencana_hari || 0);
    if (item.tgl_mulai !== undefined) patch.tgl_mulai = item.tgl_mulai || null;
    if (item.progres_fisik !== undefined) patch.progres_fisik = Number(item.progres_fisik || 0);
    if (item.progres_biaya !== undefined) patch.progres_biaya = Number(item.progres_biaya || 0);
    if (item.keterangan !== undefined) patch.keterangan = item.keterangan;
    return patch;
}

// GET /api/laporan-perkembangan?tahun=2027&bulan=Agustus — data tersimpan (bulan tertentu / semua)
app.get('/api/laporan-perkembangan', async (req, res) => {
    try {
        const { tahun, bulan } = req.query;
        const tahunInt = parseInt(tahun) || 2027;
        const bulanNum = bulanToNumber(bulan);

        const { data, error } = await supabase
            .from('laporan_perkembangan')
            .select('*')
            .eq('tahun', tahunInt);
        if (error) throw error;

        let rows = data || [];
        if (bulanNum != null) {
            rows = rows.filter(r => bulanToNumber(r.bulan) === bulanNum);
        }
        return res.json({ success: true, data: rows.map(mapLaporanRowToFront), source: 'laporan_perkembangan' });
    } catch (err) {
        console.error('❌ Error GET /api/laporan-perkembangan:', err.message);
        return res.status(500).json({ success: false, error: err.message, data: [] });
    }
});

// GET /api/laporan-perkembangan/tarik-rab?tahun=YYYY — tarik data dari rkpdes,
// dilengkapi data pelengkap dari rpjmdes_standar bila kolom masih kosong.
app.get('/api/laporan-perkembangan/tarik-rab', async (req, res) => {
    try {
        const { tahun } = req.query;
        const tahunInt = parseInt(tahun) || 2027;
        const bulan = req.query.bulan || '';
        const rpjmMap = await loadRpjmLookup();
        const { data, error } = await supabase
            .from('rkpdes')
            .select('*')
            .eq('tahun', tahunInt)
            .order('kode_unik_full', { ascending: true });
        if (error) throw error;
        const rows = (data || []).map(rp => {
            const rpjm = findRpjmByKode(rpjmMap, rp.kode_unik_full || rp.kode_unik);
            return mapRkpdesToLaporan(rp, tahunInt, bulan, rpjm);
        });
        return res.json({ success: true, data: rows, source: 'rkpdes' });
    } catch (err) {
        console.error('❌ Error GET /api/laporan-perkembangan/tarik-rab:', err.message);
        return res.status(500).json({ success: false, error: err.message, data: [] });
    }
});

// PUT /api/laporan-perkembangan — simpan satu baris (patch parsial aman; updateProgres hanya mengirim {id, progres_fisik})
app.put('/api/laporan-perkembangan', async (req, res) => {
    try {
        const item = req.body || {};
        const payload = buildLaporanPatch(item);

        let result;
        if (item.id && item.id !== 'null' && item.id !== 'undefined') {
            const { data, error } = await supabase
                .from('laporan_perkembangan')
                .update(payload)
                .eq('id', item.id)
                .select();
            if (error) throw error;
            result = Array.isArray(data) && data.length > 0 ? data[0] : null;
        } else {
            const fullPayload = buildLaporanPayload(item, bulanToNumber(item.bulan));
            const { data, error } = await supabase
                .from('laporan_perkembangan')
                .insert(fullPayload)
                .select();
            if (error) throw error;
            result = Array.isArray(data) && data.length > 0 ? data[0] : null;
        }
        return res.json({ success: true, message: 'Data laporan tersimpan.', data: result });
    } catch (err) {
        console.error('❌ Error PUT /api/laporan-perkembangan:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/laporan-perkembangan?id=
app.delete('/api/laporan-perkembangan', async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) return res.status(400).json({ success: false, error: 'ID diperlukan' });
        const { error } = await supabase
            .from('laporan_perkembangan')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return res.json({ success: true, message: 'Data laporan dihapus.' });
    } catch (err) {
        console.error('❌ Error DELETE /api/laporan-perkembangan:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/laporan-perkembangan/sync — batch simpan semua baris.
// Menerima `replace: true` → hapus semua baris lama utk periode (tahun+bulan) itu
// terlebih dulu, supaya isi laporan persis sama dengan rkpdes sumber (tanpa sisa baris lama).
app.post('/api/laporan-perkembangan/sync', async (req, res) => {
    try {
        const { tahun, bulan, replace, data: rows } = req.body || {};
        if (!Array.isArray(rows)) {
            return res.status(400).json({ success: false, error: '`data` harus berupa array.' });
        }
        const tahunInt = parseInt(tahun) || 2027;
        const bulanNum = bulanToNumber(bulan) || 1;
        if (replace) {
            const { error: delErr } = await supabase
                .from('laporan_perkembangan')
                .delete()
                .eq('tahun', tahunInt)
                .eq('bulan', bulanNum);
            if (delErr) throw delErr;
        }
        let updated = 0;
        let inserted = 0;
        for (const item of rows) {
            const payload = buildLaporanPayload(item, bulanNum);
            // Saat replace, baris lama dihapus → semua baris dianggap baru (insert).
            const hasId = !replace && item.id && item.id !== 'null' && item.id !== 'undefined';
            if (hasId) {
                const { error } = await supabase
                    .from('laporan_perkembangan')
                    .update(payload)
                    .eq('id', item.id);
                if (error) throw error;
                updated++;
            } else {
                const { error } = await supabase
                    .from('laporan_perkembangan')
                    .insert(payload);
                if (error) throw error;
                inserted++;
            }
        }
        return res.json({
            success: true,
            message: `Laporan Perkembangan ${bulanNumberToName(bulanNum)} ${tahunInt} tersimpan: ${updated} update, ${inserted} insert${replace ? ' (replace).' : '.'}`
        });
    } catch (err) {
        console.error('❌ Error POST /api/laporan-perkembangan/sync:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// -----------------------------------------------------------------
// LAPORAN MANUAL API (komponen manual pada Laporan Perkembangan)
// -----------------------------------------------------------------

// GET /api/laporan-manual?tahun=
app.get('/api/laporan-manual', async (req, res) => {
    try {
        const { tahun } = req.query;
        const tahunInt = parseInt(tahun) || 2027;
        const { data, error } = await supabase
            .from('laporan_manual')
            .select('*')
            .eq('tahun', tahunInt)
            .order('id', { ascending: true });
        if (error) throw error;
        return res.json({ success: true, data: data || [] });
    } catch (err) {
        console.error('❌ Error GET /api/laporan-manual:', err.message);
        return res.status(500).json({ success: false, error: err.message, data: [] });
    }
});

// POST /api/laporan-manual
app.post('/api/laporan-manual', async (req, res) => {
    try {
        const p = req.body || {};
        if (!p.tipe) return res.status(400).json({ success: false, error: 'Tipe wajib diisi' });
        const payload = {
            tahun: parseInt(p.tahun, 10) || 2027,
            tipe: p.tipe,
            uraian: p.uraian || 'Judul Kegiatan Baru...',
            keterangan: p.keterangan || '-',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        const { data, error } = await supabase.from('laporan_manual').insert(payload).select();
        if (error) throw error;
        res.status(201).json({ success: true, data: data[0] });
    } catch (err) {
        console.error('❌ Error POST /api/laporan-manual:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// PUT /api/laporan-manual — update (id wajib; uraian/keterangan opsional)
app.put('/api/laporan-manual', async (req, res) => {
    try {
        const p = req.body || {};
        if (!p.id) return res.status(400).json({ success: false, error: 'ID wajib diisi' });
        const patch = { updated_at: new Date().toISOString() };
        if (p.uraian !== undefined) patch.uraian = p.uraian;
        if (p.keterangan !== undefined) patch.keterangan = p.keterangan;
        if (p.tipe !== undefined) patch.tipe = p.tipe;
        const { data, error } = await supabase
            .from('laporan_manual')
            .update(patch)
            .eq('id', p.id)
            .select();
        if (error) throw error;
        return res.json({ success: true, data: data && data.length > 0 ? data[0] : null });
    } catch (err) {
        console.error('❌ Error PUT /api/laporan-manual:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/laporan-manual?id=
app.delete('/api/laporan-manual', async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) return res.status(400).json({ success: false, error: 'ID diperlukan' });
        const { error } = await supabase
            .from('laporan_manual')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return res.json({ success: true, message: 'Data dihapus' });
    } catch (err) {
        console.error('❌ Error DELETE /api/laporan-manual:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});


process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥🔥🔥🔥 UNHANDLED REJECTION 🔥🔥🔥🔥');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
});


// ============================================================
// PAGU INDIKATIF API (anggaran)
// ============================================================
const PAGU_TABLE = 'anggaran';

function readPaguStorage() {
    try {
        const { data, error } = supabase.from(PAGU_TABLE).select('*');
        if (error) return [];
        return data || [];
    } catch (e) {
        return [];
    }
}

app.get('/api/pagu-indikatif', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('anggaran')
            .select('*')
            .order('tahun', { ascending: false });

        if (error) {
            if (isTableMissingError(error)) {
                console.warn('⚠️ Tabel `anggaran` tidak ditemukan, fallback ke `pagu_anggaran`.');
                const { data: fallback, error: fbError } = await supabase
                    .from('pagu_anggaran')
                    .select('*')
                    .order('tahun', { ascending: false });
                if (fbError) {
                    console.error('Error fetching pagu_anggaran fallback:', fbError.message);
                    return res.json({ success: true, data: [] });
                }
                return res.json({ success: true, data: fallback || [] });
            }
            console.error('Error fetching pagu:', error.message);
            return res.status(500).json({ success: false, error: 'Gagal mengambil data pagu dari database.' });
        }
        res.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('Catch error fetching pagu:', error.message);
        res.status(500).json({ success: false, error: 'Terjadi kesalahan pada server saat mengambil data pagu.' });
    }
});

app.post('/api/pagu-indikatif', async (req, res) => {
    try {
        const payload = req.body;
        const { data, error } = await supabase
            .from('anggaran')
            .upsert([payload], { onConflict: ['tahun', 'sumber'] });

        if (error) {
            console.error('Error saving pagu:', error.message);
            return res.status(500).json({ success: false, error: 'Gagal menyimpan data pagu ke database.' });
        }
        res.json({ success: true, data: data || payload });
    } catch (error) {
        console.error('Catch error saving pagu:', error.message);
        res.status(500).json({ success: false, error: 'Terjadi kesalahan pada server saat menyimpan data pagu.' });
    }
});

// ============================================================
// PAGU ANGGARAN API (pagu_anggaran) / PEMBIAYAAN
// ============================================================
app.get('/api/pagu-anggaran', async (req, res) => {
    try {
        const { tahun } = req.query;
        const tahunInt = parseInt(tahun) || 2027;

        const { data, error } = await supabase
            .from('pagu_anggaran')
            .select('*')
            .eq('tahun', tahunInt);

        if (error) {
            console.error('Error fetching pagu_anggaran:', error.message);
            return res.status(500).json({ success: false, error: error.message });
        }

        const paguMap = {
            "ADD": 0,
            "DDS": 0,
            "PBH": 0,
            "APBD Tk. I": 0,
            "APBD Tk. II": 0,
            "PAD": 0
        };

        if (Array.isArray(data)) {
            data.forEach(item => {
                if (item.sumber_dana && paguMap.hasOwnProperty(item.sumber_dana)) {
                    paguMap[item.sumber_dana] = Number(item.pagu || 0);
                }
            });
        }

        res.json({ success: true, data: paguMap });
    } catch (error) {
        console.error('Catch error fetching pagu_anggaran:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/pagu-anggaran', async (req, res) => {
    try {
        const { tahun, paguData } = req.body;
        const tahunInt = parseInt(tahun) || 2027;

        if (!paguData || typeof paguData !== 'object') {
            return res.status(400).json({ success: false, error: 'paguData wajib diisi' });
        }

        const rowsToUpsert = Object.keys(paguData).map(sumber => ({
            tahun: tahunInt,
            sumber_dana: sumber,
            pagu: Number(paguData[sumber] || 0),
            updated_at: new Date().toISOString()
        }));

        const { data, error } = await supabase
            .from('pagu_anggaran')
            .upsert(rowsToUpsert, { onConflict: ['tahun', 'sumber_dana'] });

        if (error) {
            console.error('Error upserting pagu_anggaran:', error.message);
            return res.status(500).json({ success: false, error: error.message });
        }

        res.json({ success: true, message: 'Pagu anggaran berhasil disimpan', data });
    } catch (error) {
        console.error('Catch error saving pagu_anggaran:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/pagu-anggaran stable alias (sinkron dgn pagu-indikatif bila tabel belum ada)
app.get('/api/pembiayaan', async (req, res) => {
    try {
        const { tahun } = req.query;
        const th = parseInt(tahun) || 2027;

        const { data, error } = await supabase
            .from('pembiayaan')
            .select('*')
            .eq('tahun', th)
            .maybeSingle();

        if (error) {
            console.error('Error fetching pembiayaan:', error.message);
            return res.status(500).json({ success: false, error: error.message });
        }

        res.json({ success: true, data });
    } catch (error) {
        console.error('Catch error fetching pembiayaan:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/pembiayaan', async (req, res) => {
    try {
        const { tahun, pembiayaanData } = req.body;
        const th = parseInt(tahun) || 2027;

        if (!pembiayaanData || typeof pembiayaanData !== 'object') {
            return res.status(400).json({ success: false, error: 'pembiayaanData wajib diisi' });
        }

        const payload = { tahun: th, ...pembiayaanData, updated_at: new Date().toISOString() };

        const { data, error } = await supabase
            .from('pembiayaan')
            .upsert(payload, { onConflict: ['tahun'] });

        if (error) {
            console.error('Error upserting pembiayaan:', error.message);
            return res.status(500).json({ success: false, error: error.message });
        }

        res.json({ success: true, message: 'Data pembiayaan berhasil disimpan', data });
    } catch (error) {
        console.error('Catch error saving pembiayaan:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/rkpdes-data/import - Sinkronisasi data RKPDes dari RAB (dipakai tombol Sinkronisasi pembiayaan)
app.post('/api/rkpdes-data/import', async (req, res) => {
    try {
        const { tahun } = req.body;
        const tahunInt = parseInt(tahun);

        if (!tahunInt) {
            return res.status(400).json({ success: false, error: 'Tahun anggaran valid diperlukan.' });
        }

        const { data: rabData, error: rabError } = await supabase
            .from('rab')
            .select('*')
            .eq('tahun', tahunInt);

        if (rabError) throw rabError;

        res.json({ success: true, message: `Data RAB tahun ${tahunInt} siap diimpor: ${Array.isArray(rabData) ? rabData.length : 0} record.`, data: rabData || [] });
    } catch (error) {
        console.error('❌ Error during rkpdes-data/import:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// TIM PENYUSUN API
// ============================================================

app.get('/api/tim-penyusun', async (req, res) => {
    try {
        const { tahun } = req.query;
        if (!tahun) return res.status(400).json({ success: false, error: 'Tahun diperlukan' });

        const { data, error } = await supabase
            .from('tim_penyusun')
            .select('*')
            .eq('tahun', parseInt(tahun));
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/tim-penyusun', async (req, res) => {
    try {
        const payload = req.body;
        if (!Array.isArray(payload)) {
            return res.status(400).json({ success: false, error: 'Payload harus berupa array' });
        }
        const { data, error } = await supabase.from('tim_penyusun').insert(payload).select();
        if (error) throw error;
        res.status(201).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/tim-penyusun/batch', async (req, res) => {
    try {
        const payload = req.body;
        if (!Array.isArray(payload)) {
            return res.status(400).json({ success: false, error: 'Payload harus berupa array' });
        }
        // Asumsi upsert lebih aman di sini
        const { data, error } = await supabase.from('tim_penyusun').upsert(payload, { onConflict: 'id' }).select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/tim-penyusun/by-tahun/:tahun', async (req, res) => {
    try {
        const { tahun } = req.params;
        const { error } = await supabase.from('tim_penyusun').delete().eq('tahun', parseInt(tahun));
        if (error) throw error;
        res.json({ success: true, message: `Semua data tim penyusun untuk tahun ${tahun} telah dihapus.` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/tim-penyusun/sync -> replace-all utk tahun tsb (idempoten)
app.post('/api/tim-penyusun/sync', async (req, res) => {
    try {
        const { tahun, data: rows } = req.body || {};
        const tahunInt = parseInt(tahun, 10);
        if (!tahunInt) {
            return res.status(400).json({ success: false, error: 'Parameter tahun diperlukan.' });
        }
        if (!Array.isArray(rows)) {
            return res.status(400).json({ success: false, error: 'Data harus berupa array.' });
        }

        const { error: delErr } = await supabase
            .from('tim_penyusun')
            .delete()
            .eq('tahun', tahunInt);
        if (delErr) throw delErr;

        if (rows.length === 0) {
            return res.json({ success: true, message: `Tim penyusun tahun ${tahunInt} dikosongkan.`, count: 0 });
        }

        const payload = rows.map(r => ({
            tahun: tahunInt,
            nama: String(r.nama || ''),
            jabatan_tim: String(r.jabatan_tim || r.jabatan || 'Anggota')
        }));

        const { error: insErr } = await supabase.from('tim_penyusun').insert(payload);
        if (insErr) throw insErr;

        res.json({ success: true, message: `Berhasil menyimpan ${payload.length} anggota tim penyusun tahun ${tahunInt}.`, count: payload.length });
    } catch (error) {
        console.error('❌ Error POST /api/tim-penyusun/sync:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});


// ============================================================
// RKTL (RENCANA KERJA DAN TINDAK LANJUT) API
// ============================================================

// GET /api/rktl?tahun=XXXX -> ambil semua baris RKTL utk tahun tsb
app.get('/api/rktl', async (req, res) => {
    try {
        const { tahun } = req.query;
        if (!tahun) return res.status(400).json({ success: false, error: 'Tahun diperlukan' });

        const { data, error } = await supabase
            .from('rktl')
            .select('*')
            .eq('tahun', parseInt(tahun))
            .maybeSingle();
        if (error) throw error;

        const items = (data && Array.isArray(data.rktl_items)) ? data.rktl_items : [];
        res.json({ success: true, data: items });
    } catch (error) {
        console.error('❌ Error GET /api/rktl:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/rktl/sync -> replace-all utk tahun tsb (idempoten)
app.post('/api/rktl/sync', async (req, res) => {
    try {
        const { tahun, data: rows } = req.body || {};
        const tahunInt = parseInt(tahun, 10);
        if (!tahunInt) {
            return res.status(400).json({ success: false, error: 'Parameter tahun diperlukan.' });
        }
        if (!Array.isArray(rows)) {
            return res.status(400).json({ success: false, error: 'Data harus berupa array.' });
        }

        const itemsData = rows.map((r, idx) => ({
            no_urut: r.no_urut || idx + 1,
            uraian: String(r.uraian || ''),
            tanggal_tempat: String(r.tanggal_tempat || ''),
            keterangan: String(r.keterangan || ''),
            tanggal_ttd: r.tanggal_ttd || null,
            ketua_tim: r.ketua_tim || null,
            kepala_desa: r.kepala_desa || null,
            fasilitator_nama: r.fasilitator_nama || null,
            fasilitator_jabatan: r.fasilitator_jabatan || null,
            fasilitator: r.fasilitator || null
        }));

        const first = rows[0] || {};
        const timPenyusun = Array.isArray(first.tim_penyusun)
            ? first.tim_penyusun
            : rows.map(r => r.tim_penyusun).find(Array.isArray) || [];

        // Hapus baris lama untuk tahun tsb (jika ada), lalu simpan 1 baris baru
        const { error: delErr } = await supabase
            .from('rktl')
            .delete()
            .eq('tahun', tahunInt);
        if (delErr) throw delErr;

        const payload = {
            tahun: tahunInt,
            rktl_items: itemsData,
            tim_penyusun: timPenyusun,
            tanggal_ttd: first.tanggal_ttd || null,
            ketua_tim: first.ketua_tim || null,
            fasilitator: first.fasilitator || null
        };

        if (itemsData.length > 0) {
            const { error: insErr } = await supabase.from('rktl').insert(payload);
            if (insErr) throw insErr;
        }

        res.json({ success: true, message: `Berhasil menyimpan ${itemsData.length} baris RKTL tahun ${tahunInt}.`, count: itemsData.length });
    } catch (error) {
        console.error('❌ Error POST /api/rktl/sync:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});


// ============================================================
// DOKUMEN DESA API
// ============================================================

app.get('/api/dokumen-desa', async (req, res) => {
    try {
        const { tahun } = req.query;
        if (!tahun) {
            return res.status(400).json({ success: false, error: 'Tahun diperlukan' });
        }
        const data = await getDokumenFromSupabase(tahun);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/dokumen-desa', upload.single('file'), async (req, res) => {
    try {
        const { tahun, doc_code, doc_name, status, notes } = req.body;
        const file = req.file;

        if (!tahun || !doc_code || !doc_name) {
            return res.status(400).json({ success: false, error: 'Tahun, kode dokumen, dan nama dokumen wajib diisi.' });
        }

        const payload = {
            tahun: parseInt(tahun),
            doc_code,
            doc_name,
            status: status || 'pending',
            notes: notes || '',
            file_path: file ? file.path : null,
            file_name: file ? file.filename : null,
            original_name: file ? file.originalname : null,
            file_size: file ? file.size : null,
            mime_type: file ? file.mimetype : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const result = await saveDokumenToSupabase(payload);
        if (result.success) {
            res.status(201).json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/dokumen-desa/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        const { data, error } = await supabase
            .from('dokumen_desa')
            .update({ status, notes, updated_at: new Date().toISOString() })
            .eq('id', parseInt(id))
            .select();

        if (error) throw error;
        res.json({ success: true, data: data[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/dokumen-desa/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('dokumen_desa')
            .delete()
            .eq('id', parseInt(id));

        if (error) throw error;
        res.json({ success: true, message: 'Dokumen berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// ============================================================
// DOKUMEN ENGINE — TEMPLATES API (Supabase-backed)
// ============================================================

const DEFAULT_MASTER_DOC_ID = '1MQJsTZCMPoYNFD8dg6J0g5tY-KEf8Iu0U6uNRZJ-MnY';

function defaultTemplateSeed() {
  return [
    { code: 'DOC-01', stage: 'A', name: 'Kata Pengantar RKP Desa', documentId: DEFAULT_MASTER_DOC_ID, isReal: true },
    { code: 'DOC-02A', stage: 'A', name: 'BA Pembentukan Tim', documentId: DEFAULT_MASTER_DOC_ID, isReal: true },
    { code: 'DOC-02B', stage: 'A', name: 'SK Tim Penyusun', documentId: DEFAULT_MASTER_DOC_ID, isReal: true },
    { code: 'DOC-03', stage: 'A', name: 'SK Kades Tim Penyusun', documentId: DEFAULT_MASTER_DOC_ID, isReal: true },
    { code: 'DOC-19', stage: 'B', name: 'SK BPD Panitia Musdes', documentId: DEFAULT_MASTER_DOC_ID, isReal: true },
    { code: 'DOC-20', stage: 'B', name: 'BA Daftar Hadir Musdes', documentId: DEFAULT_MASTER_DOC_ID, isReal: true },
    { code: 'DOC-21', stage: 'B', name: 'Pandangan Resmi BPD', documentId: DEFAULT_MASTER_DOC_ID, isReal: true },
    { code: 'DOC-22', stage: 'B', name: 'BA Musdes Penetapan RKP', documentId: DEFAULT_MASTER_DOC_ID, isReal: true },
    { code: 'DOC-24', stage: 'C', name: 'SK Kades Panitia Musrenbang', documentId: DEFAULT_MASTER_DOC_ID, isReal: true },
    { code: 'DOC-25', stage: 'C', name: 'Tata Tertib Musterbang', documentId: DEFAULT_MASTER_DOC_ID, isReal: true },
    { code: 'DOC-27', stage: 'C', name: 'BA Musrenbang', documentId: DEFAULT_MASTER_DOC_ID, isReal: true },
    { code: 'DOC-28', stage: 'D', name: 'Rancangan Perdes RKPDesa', documentId: DEFAULT_MASTER_DOC_ID, isReal: true },
    { code: 'DOC-29', stage: 'D', name: 'SK BPD Panitia Perdes', documentId: DEFAULT_MASTER_DOC_ID, isReal: true },
    { code: 'DOC-30', stage: 'D', name: 'Berita Kesepakatan BPD', documentId: DEFAULT_MASTER_DOC_ID, isReal: true },
    { code: 'DOC-31', stage: 'D', name: 'Perdes RKPDesa Final', documentId: DEFAULT_MASTER_DOC_ID, isReal: true },
    { code: 'DOC-33', stage: 'E', name: 'SK Kades Tim Verifikasi', documentId: DEFAULT_MASTER_DOC_ID, isReal: true },
    { code: 'DOC-34', stage: 'E', name: 'BA Pembentukan Tim Verifikasi', documentId: DEFAULT_MASTER_DOC_ID, isReal: true },
    { code: 'DOC-39', stage: 'D', name: 'SK BPD Persetujuan Perdes', documentId: DEFAULT_MASTER_DOC_ID, isReal: true }
  ];
}

async function loadTemplatesFromDb() {
  try {
    const { data, error } = await supabase.from('dokumen_templates').select('*').order('code', { ascending: true });
    if (error) {
      console.warn('⚠️ [Templates] Baca dari Supabase gagal:', error.message);
      return defaultTemplateSeed();
    }
    if (!data || data.length === 0) return defaultTemplateSeed();
    return data.map(t => {
      const docId = (t.documentid || t.documentId || t.document_id || '').trim();
      return {
        code: t.code,
        stage: t.stage || 'A',
        name: t.name || t.code,
        documentId: docId || DEFAULT_MASTER_DOC_ID,
        isReal: true
      };
    });
  } catch (e) {
    return defaultTemplateSeed();
  }
}

async function saveTemplatesToDb(templates) {
  try {
    const errs = [];
    for (const t of templates) {
      const { error } = await supabase
        .from('dokumen_templates')
        .upsert({
          code: t.code,
          stage: t.stage || 'A',
          name: t.name || t.code,
          documentid: t.documentId || '',
          is_real: t.isReal || t.is_real || false,
          updated_at: new Date().toISOString()
        }, { onConflict: 'code' });
      if (error) errs.push(error.message);
    }
    return errs;
  } catch (e) {
    return [e.message];
  }
}

// GET /api/templates
app.get('/api/templates', async (req, res) => {
  try {
    const templates = await loadTemplatesFromDb();
    res.json({ success: true, templates });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, templates: defaultTemplateSeed() });
  }
});

// POST /api/templates (tambah template baru)
app.post('/api/templates', async (req, res) => {
  try {
    const { code, name, documentId, stage } = req.body;
    if (!code || !documentId) {
      return res.status(400).json({ success: false, message: 'Kode dokumen dan Document ID wajib diisi.' });
    }
    const { error } = await supabase
      .from('dokumen_templates')
      .upsert({
        code: code.toUpperCase(),
        name: name || code,
        documentid: documentId,
        stage: stage || 'A',
        is_real: false,
        updated_at: new Date().toISOString()
      }, { onConflict: 'code' });
    if (error) throw error;
    res.status(201).json({ success: true, message: 'Template berhasil ditambahkan.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/templates/:code (simpan documentId) — perbaiki "field id tidak tersimpan"
app.put('/api/templates/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const { documentId, name, stage } = req.body;
    const newDocId = String(documentId || '').trim();
    if (!newDocId) {
      return res.status(400).json({ success: false, message: 'Document ID tidak boleh kosong.' });
    }
    // When a documentId is provided, it is considered "real".
    const { error } = await supabase
      .from('dokumen_templates')
      .upsert({
        code: code.toUpperCase(),
        documentid: newDocId,
        name: name || code,
        stage: stage || 'A',
        is_real: true, // This marks the template as having a valid ID
        updated_at: new Date().toISOString()
      }, { onConflict: 'code' });
    if (error) throw error;
    res.json({ success: true, message: `Document ID untuk ${code} berhasil disimpan.` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/templates/:code
app.delete('/api/templates/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const { error } = await supabase.from('dokumen_templates').delete().eq('code', code.toUpperCase());
    if (error) throw error;
    res.json({ success: true, message: 'Template berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/scan-placeholders (scan placeholder {{...}} dari Google Docs)
app.post('/api/scan-placeholders', async (req, res) => {
  try {
    const { google_docs_id, doc_code } = req.body;
    if (!google_docs_id) {
      return res.status(400).json({ success: false, error: 'google_docs_id wajib diisi.' });
    }

    let fields = [];
    const defaultGasUrl = 'https://script.google.com/macros/s/AKfycbzX3NSA30tMEXOk6hH5qLA90Odkw7XVsH8foVqF6MP62AcPkJKe-iCxweqZ_vL-KntS/exec';
    const gasUrl = (process.env.GAS_WEB_APP_URL || defaultGasUrl).trim();

    if (gasUrl) {
      try {
        const gasRes = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'scanPlaceholders', documentId: google_docs_id } )
        });
        const gasJson = await gasRes.json();
        if (gasJson.success && Array.isArray(gasJson.fields)) {
          fields = gasJson.fields;
        } else if (gasJson.error) {
          console.warn('[scan] GAS error:', gasJson.error);
        }
      } catch (e) {
        console.warn('[scan] GAS panggilan gagal:', e.message);
      }
    }

    if (fields.length === 0 && doc_code) {
      try {
        const { data } = await supabase.from('dokumen_form_data').select('scanned_fields').eq('doc_code', doc_code).maybeSingle();
        if (data && Array.isArray(data.scanned_fields) && data.scanned_fields.length > 0) {
          fields = data.scanned_fields;
        }
      } catch (e) {}
    }

    if (doc_code) {
      const tahunVal = parseInt(req.body.tahun || req.query.tahun || 2026, 10);
      try {
        await supabase.from('dokumen_form_data').upsert({
          doc_code,
          tahun: tahunVal,
          google_docs_id,
          scanned_fields: fields,
          updated_at: new Date()
        }, { onConflict: 'doc_code,tahun' });
      } catch (e) {}
    }

    res.json({ success: true, fields });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, fields: [] });
  }
});


// ============================================================
// DOKUMEN ENGINE — FORM DATA & SYNC (Supabase-backed)
// ============================================================

const DOC_TABLE_KEY_MAP = {
  'DOC-02B': 'tabel_sk_tim_penyusun',
  'DOC-20': 'tabel_daftar_hadir',
  'DOC-27': 'tabel_kegiatan',
  'DOC-34': 'tabel_tim_verifikasi'
};

function sanitizeTablesForDocCode(docCode, rawTables) {
  const allowedKey = DOC_TABLE_KEY_MAP[docCode] || 'table_rows';
  if (!allowedKey || !rawTables || typeof rawTables !== 'object') {
    return {};
  }
  const rowArray = Array.isArray(rawTables[allowedKey]) ? rawTables[allowedKey] : [];
  return { [allowedKey]: rowArray };
}

// GET /api/dokumen-form-data/:code/:tahun (memuat data form & tabel tersimpan dari Supabase)
app.get('/api/dokumen-form-data/:code/:tahun', async (req, res) => {
  try {
    const { code, tahun } = req.params;
    const tahunInt = parseInt(tahun, 10);
    if (!tahunInt) return res.status(400).json({ success: false, error: 'Tahun tidak valid.' });

    const { data, error } = await supabase
      .from('dokumen_form_data')
      .select('*')
      .eq('doc_code', code)
      .eq('tahun', tahunInt)
      .maybeSingle();
      
    if (error) throw error;

    if (!data) {
      return res.json({ success: true, fields: {}, tables: {}, last_doc_id: null });
    }

    const cleanTables = (code === 'GLOBAL_MASTER') ? {} : sanitizeTablesForDocCode(data.doc_code, data.tables);

    res.json({
      success: true,
      doc_code: data.doc_code,
      google_docs_id: data.google_docs_id,
      fields: data.fields || {},
      tables: cleanTables,
      last_doc_id: data.last_generated_doc_id || null,
      preview_url: data.last_generated_pdf_url || null,
      updated_at: data.updated_at
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/dokumen-form-data (Simpan Draf data form & tabel ke Supabase tanpa Sync GAS)
app.post('/api/dokumen-form-data', async (req, res) => {
  try {
    const { google_docs_id, doc_code, tahun, fields, tables } = req.body;
    const tahunInt = parseInt(tahun, 10);

    if (!doc_code || !tahunInt) {
      return res.status(400).json({ success: false, error: 'doc_code dan tahun wajib diisi.' });
    }

    const cleanTables = (doc_code === 'GLOBAL_MASTER') ? {} : sanitizeTablesForDocCode(doc_code, tables);

    const upsertPayload = {
      doc_code,
      tahun: tahunInt,
      fields: fields || {},
      tables: cleanTables,
      updated_at: new Date().toISOString(),
    };
    if (google_docs_id) {
      upsertPayload.google_docs_id = google_docs_id;
    }

    const { error: dbError } = await supabase
      .from('dokumen_form_data')
      .upsert(upsertPayload, { onConflict: 'doc_code,tahun' });

    if (dbError) {
      console.warn('⚠️ Upsert error, executing fallback update/insert:', dbError.message);
      const { data: existingList } = await supabase
        .from('dokumen_form_data')
        .select('id')
        .eq('doc_code', doc_code)
        .eq('tahun', tahunInt)
        .limit(1);

      const existing = existingList && existingList[0];
      if (existing && existing.id) {
        const { error: updErr } = await supabase.from('dokumen_form_data').update(upsertPayload).eq('id', existing.id);
        if (updErr) throw new Error('Fallback Update Error: ' + updErr.message);
      } else {
        const { error: insErr } = await supabase.from('dokumen_form_data').insert(upsertPayload);
        if (insErr) throw new Error('Fallback Insert Error: ' + insErr.message);
      }
    }

    res.json({
      success: true,
      message: `Draf ${doc_code} (${tahunInt}) berhasil disimpan ke Supabase database.`,
      doc_code,
      tahun: tahunInt,
      synced_fields_count: Object.keys(fields || {}).length
    });
  } catch (error) {
    console.error('Error simpan draf ke Supabase:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/sync-document (Simpan ke Supabase DAN sinkronisasi ke Google Apps Script)
app.post('/api/sync-document', async (req, res) => {
  try {
    const { google_docs_id, doc_code, tahun, fields, tables } = req.body;
    const tahunInt = parseInt(tahun, 10);

    if (!doc_code || !tahunInt) {
      return res.status(400).json({ success: false, error: 'doc_code dan tahun wajib diisi.' });
    }

    const cleanTables = (doc_code === 'GLOBAL_MASTER') ? {} : sanitizeTablesForDocCode(doc_code, tables);

    // ====================================================================
    // JAGA DATA: jangan timpa tabel yang masih berisi data dengan array
    // kosong. Data lama dipertahankan sampai ada data baru yang menggantikannya
    // (hanya berlaku untuk dokumen tabel = yang punya header tersimpan).
    // ====================================================================
    if (doc_code !== 'GLOBAL_MASTER' && typeof cleanTables === 'object') {
      const allowedKey = DOC_TABLE_KEY_MAP[doc_code] || 'table_rows';
      const incomingRows = Array.isArray(cleanTables[allowedKey]) ? cleanTables[allowedKey] : null;
      if (incomingRows !== null && incomingRows.length === 0) {
        try {
          const { data: tplHead } = await supabase
            .from('dokumen_templates')
            .select('table_headers')
            .eq('code', doc_code)
            .maybeSingle();
          const hasHeaders = Array.isArray(tplHead?.table_headers) && tplHead.table_headers.length > 0;
          if (hasHeaders) {
            const { data: existingRow } = await supabase
              .from('dokumen_form_data')
              .select('tables')
              .eq('doc_code', doc_code)
              .eq('tahun', tahunInt)
              .maybeSingle();
            const existingRows = existingRow?.tables?.[allowedKey];
            if (Array.isArray(existingRows) && existingRows.length > 0) {
              cleanTables[allowedKey] = existingRows;
            }
          }
        } catch (e) {}
      }
    }

    // ====================================================================
    // Langkah 1: Simpan data form (fields dan tables) ke Supabase
    // ====================================================================
    try {
        const upsertPayload = {
            doc_code,
            tahun: tahunInt,
            fields: fields || {},
            tables: cleanTables,
            updated_at: new Date().toISOString(),
        };
        if (google_docs_id) {
            upsertPayload.google_docs_id = google_docs_id;
        }

        const { error: dbError } = await supabase
            .from('dokumen_form_data')
            .upsert(upsertPayload, { onConflict: 'doc_code,tahun' });

        if (dbError) {
             console.warn('⚠️ Upsert onConflict error, executing fallback update/insert:', dbError.message);
             const { data: existingList } = await supabase
                 .from('dokumen_form_data')
                 .select('id')
                 .eq('doc_code', doc_code)
                 .eq('tahun', tahunInt)
                 .limit(1);

             const existing = existingList && existingList[0];
             if (existing && existing.id) {
                 const { error: updErr } = await supabase.from('dokumen_form_data').update(upsertPayload).eq('id', existing.id);
                 if (updErr) throw new Error('Fallback Update Error: ' + updErr.message);
             } else {
                 const { error: insErr } = await supabase.from('dokumen_form_data').insert(upsertPayload);
                 if (insErr) throw new Error('Fallback Insert Error: ' + insErr.message);
             }
        } else {
            console.log(`✅ Form data for ${doc_code} (${tahunInt}) saved to Supabase.`);
        }
    } catch (e) {
        console.error('⚠️ Exception saat menyimpan ke Supabase:', e.message);
    }
    // ====================================================================


    const formFields = fields || {};
    const formTables = tables || {};

    const defaultGasUrl = 'https://script.google.com/macros/s/AKfycbzX3NSA30tMEXOk6hH5qLA90Odkw7XVsH8foVqF6MP62AcPkJKe-iCxweqZ_vL-KntS/exec';
    const gasUrl = (process.env.GAS_WEB_APP_URL || defaultGasUrl).trim();

    let previousDocId = null;
    try {
      const { data: fd } = await supabase
        .from('dokumen_form_data')
        .select('last_generated_doc_id')
        .eq('doc_code', doc_code)
        .eq('tahun', tahunInt) // Tambahkan filter tahun
        .maybeSingle();
      previousDocId = fd?.last_generated_doc_id || null;
    } catch (e) {}

    try {
      await supabase.from('dokumen_form_data').update({ syncing: true }).eq('doc_code', doc_code).eq('tahun', tahunInt);
    } catch (e) {}

    let syncResult = { success: false };

    try {
      console.log(`📡 Calling GAS Web App URL: ${gasUrl}`);
      const gasRes = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'syncDocument',
          documentId: google_docs_id,
          code: doc_code,
          isTemplate: true,
          previousDocId: previousDocId,
          data: formFields,
          tables: formTables
        })
      });
      syncResult = await gasRes.json();
      console.log('✅ Response from GAS:', syncResult);
    } catch (err) {
      console.error('❌ Error calling GAS:', err.message);
      syncResult = { success: false, error: err.message };
    }

    if (syncResult && syncResult.success) {
      const newDocId = syncResult.document_id || syncResult.new_document_id || google_docs_id;
      const previewUrl = syncResult.preview_url || `https://docs.google.com/document/d/${newDocId}/preview`;

      try {
        await supabase.from('dokumen_form_data').update({
          syncing: false,
          last_generated_doc_id: newDocId,
          last_generated_pdf_url: previewUrl,
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq('doc_code', doc_code).eq('tahun', tahunInt);
      } catch (e) {}

      return res.json({
        success: true,
        message: syncResult.message || 'Dokumen berhasil disinkronkan ke Google Docs.',
        new_document_id: newDocId,
        synced_fields_count: Object.keys(formFields).length,
        preview_url: previewUrl,
        duplicated: !!syncResult.duplicated
      });
    } else {
      try {
        await supabase.from('dokumen_form_data').update({ syncing: false }).eq('doc_code', doc_code).eq('tahun', tahunInt);
      } catch (e) {}
      return res.json({
        success: true,
        db_saved: true,
        gas_synced: false,
        message: `Data tersimpan di Supabase. Sync Google Docs: ${syncResult.error || syncResult.message || 'Respons GAS pending'}`,
        warning: syncResult.error || 'GAS request skipped or failed'
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// DELETE /api/dokumen-desa/reset-form-data/:code/:tahun
app.delete('/api/dokumen-desa/reset-form-data/:code/:tahun', async (req, res) => {
  try {
    const { code, tahun } = req.params;
    const tahunInt = parseInt(tahun, 10);
    if (!tahunInt) return res.status(400).json({ success: false, error: 'Tahun tidak valid.' });
    
    const { error } = await supabase
      .from('dokumen_form_data')
      .update({ fields: {}, tables: {}, last_generated_doc_id: null, updated_at: new Date().toISOString() })
      .eq('doc_code', code)
      .eq('tahun', tahunInt);

    if (error) throw error;
    res.json({ success: true, message: 'Data form berhasil direset.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/sync-status/:code/:tahun (polling status sinkronisasi)
app.get('/api/sync-status/:code/:tahun', async (req, res) => {
  try {
    const { code, tahun } = req.params;
    const tahunInt = parseInt(tahun, 10);
    if (!tahunInt) return res.status(400).json({ success: false, error: 'Tahun tidak valid.' });

    const { data, error } = await supabase
      .from('dokumen_form_data')
      .select('*')
      .eq('doc_code', code)
      .eq('tahun', tahunInt)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return res.json({ success: true, syncing: false, last_doc_id: null, preview_url: null });
    }
    const lastDocId = data.last_generated_doc_id || data.google_docs_id;
    res.json({
      success: true,
      syncing: !!data.syncing,
      last_doc_id: lastDocId,
      preview_url: data.last_generated_pdf_url || (lastDocId ? `https://docs.google.com/document/d/${lastDocId}/preview` : null)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// Health Check Endpoint
// ============================================================
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// ============================================================
// AUTHENTICATION
// ============================================================

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (error || !data) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, data.password);

        if (match) {
            res.json({ success: true, message: 'Login successful', user: { id: data.id, username: data.username, role: data.role } });
        } else {
            res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


// ============================================================
// USER MANAGEMENT
// ============================================================
app.get('/api/users', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, username, role, created_at'); // Don't send password hash
        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    const { username, password, role, name } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const { data, error } = await supabase
            .from('users')
            .insert([{ username, password: password_hash, role: role || 'user', name: name || username }])
            .select('id, username, role, created_at');

        if (error) throw error;
        res.status(201).json({ success: true, data: data[0] });
    } catch (err) {
        if (err.code === '23505') { // Unique violation
            return res.status(409).json({ success: false, error: 'Username already exists' });
        }
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/ganti-password (Ganti password pengguna dari form frontend)
app.post('/api/ganti-password', async (req, res) => {
    try {
        const { username, oldPassword, newPassword } = req.body;

        if (!username || !oldPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Username, password lama, dan password baru wajib diisi.' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: 'Password baru minimal 8 karakter.' });
        }

        // 1. Cari pengguna berdasarkan username
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .maybeSingle();

        if (error) throw error;

        if (!user) {
            return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
        }

        // 2. Cek apakah password lama cocok
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Password saat ini (lama) tidak sesuai.' });
        }

        // 3. Hash password baru
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(newPassword, salt);

        // 4. Update password di database Supabase
        const { error: updateErr } = await supabase
            .from('users')
            .update({ 
                password: password_hash, 
                updated_at: new Date().toISOString() 
            })
            .eq('username', username);

        if (updateErr) throw updateErr;

        console.log(`🔑 Password untuk pengguna "${username}" berhasil diperbarui.`);
        return res.json({ 
            success: true, 
            message: 'Password berhasil diubah! Silakan login kembali.' 
        });

    } catch (err) {
        console.error('❌ Error /api/ganti-password:', err);
        return res.status(500).json({ success: false, message: err.message || 'Terjadi kesalahan pada server.' });
    }
});

// Fallback for all other GET requests to serve index.html, useful for client-side routing
app.get(/.*$/, (req, res) => {
    console.log('Catch-all route triggered for:', req.path);
    // only serve static files from frontend folder
    const regex = new RegExp(/^(\.\.[\/\\])+/g);
    const safeUrlPath = path.normalize(req.path).replace(regex, '');
    const filePath = path.join(FRONTEND_PATH, safeUrlPath);

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            // If file doesn't exist, it might be a client-side route, so serve index.html
            res.sendFile(path.join(FRONTEND_PATH, 'index.html'));
        } else {
            // Serve the file if it exists
            // Pastikan file JS/HTML selalu fresh di browser (hindari cache lama yang menahan bug fix)
            if (/\.(js|html)$/i.test(req.path)) {
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
            }
            res.sendFile(filePath);
        }
    });
});
// Penanganan uncaughtException agar jika ada error port atau critical error lainnya, proses tidak langsung terhenti tanpa log
process.on('uncaughtException', (err) => {
    console.error('CRITICAL ERROR:', err);
});

function startServer(preferredPort = 5500) {
    return new Promise((resolve, reject) => {
        const initialPort = parseInt(preferredPort || process.env.PORT || 5500, 10);
        const server = app.listen(initialPort, () => {
            const addr = server.address();
            if (!addr) return;
            const actualPort = addr.port;
            console.log(`🚀 Server berjalan di http://localhost:${actualPort}`);
            console.log(`📊 Test API: http://localhost:${actualPort}/api/test-db`);
            console.log(`📋 Master API: http://localhost:${actualPort}/api/master`);
            console.log(`🏥 Health Check API: http://localhost:${actualPort}/api/health`);
            seedTemplateConfigCache();
            resolve(actualPort);
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.warn(`⚠️ Port ${initialPort} terpakai, mencoba mencari port acak...`);
                const fallbackServer = app.listen(0, () => {
                    const fbAddr = fallbackServer.address();
                    const actualPort = fbAddr ? fbAddr.port : 0;
                    console.log(`🚀 Server berjalan di http://localhost:${actualPort}`);
                    seedTemplateConfigCache();
                    resolve(actualPort);
                });
                fallbackServer.on('error', reject);
            } else {
                reject(err);
            }
        });
    });
}

if (require.main === module) {
    startServer(process.env.PORT || 5500).catch((err) => {
        console.error('❌ Gagal menjalankan server:', err);
    });
}

module.exports = app;
