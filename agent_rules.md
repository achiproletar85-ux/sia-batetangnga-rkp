# ATURAN BAKU PENGEMBANGAN — PROTOKOL EFISIENSI KUOTA SUPABASE

> **STATUS: WAJIB.** Kuota egress Supabase proyek ini KRITIS (96% dari 5 GB).
> Pelanggaran aturan di bawah = kenaikan egress = error `402 Payment Required`
> untuk seluruh aplikasi. Aturan ini mengikat **setiap agen dan pengembang** yang
> mengubah kode di repositori ini.

---

## 1. ZERO-WILDCARD EGRESS (LARANGAN MUTLAK)

**DILARANG KERAS** menulis kueri Supabase berikut:

```js
// ❌ DILARANG — menarik SEMUA kolom termasuk JSON besar & tidak terpakai
supabase.from('rab').select('*')
supabase.from('rkpdes').select('*')
await supabase.from('prioritas_rkpdes').select()   // tanpa parameter = wildcard
```

Setiap `.select(...)` **wajib** menerima daftar kolom eksplisit:

```js
// ✅ BENAR — hanya kolom yang benar-benar dipakai
supabase.from('rab').select('id, kode_unik_full, kode_unik, tahun, nama_kegiatan, jumlah_anggaran')
```

Jika `.select()` adalah hasil `insert/update/upsert` (returning), tetap sebut
kolom yang dibutuhkan, atau gunakan `.select('id')` bila hanya id yang dipakai.

---

## 2. WAJIB EKSPLISIT MENYEBUT NAMA KOLOM

Sebelum menulis daftar kolom, **cek pemakaian aktual** di UI/frontend:

1. Buka halaman/hook yang merender data tersebut.
2. Catat setiap properti yang dibaca (`item.nama_kegiatan`, `row.prakiraan_biaya`, dst).
3. Hanya kolom itulah yang boleh masuk `.select()`.

Aturan tambahan:

- Tidak boleh menambah kolom "sekadar untuk jaga-jaga".
- Ketika menambah fitur baru yang butuh kolom ekstra, tambahkan **hanya kolom itu**
  ke daftar select pada endpoint terkait.
- `.eq('tahun', activeYear)` / filter tahun anggaran **wajib ada** pada kueri data
  transaksional (rab, rkpdes, rancangan_rkpdes, prioritas_*, du_rkpdes, laporan_*,
  verifikasi_proposal, evaluasi_rkpdes, usulan, tim_penyusun, rktl, dokumen_*).
- `.limit(...)` atau `.range(...)` wajib pada penarikan daftar; pengecualian hanya
  untuk tabel referensi kecil yang ter-cache (lihat §5).

---

## 3. ISOLASI DATA BESAR (BLOB / JSON / LAMPIRAN)

Kolom berikut **dilarang ditarik di daftar/tabel ringkasan** karena berukuran besar:

| Tabel                | Kolom berat yang diisolasi              |
|----------------------|------------------------------------------|
| `rab`                | `items`, `rpjm_data`                     |
| `rkpdes`             | — (kolomnya sudah ramping)               |
| `dokumen_form_data`  | `fields`, `tables`, `scanned_fields`     |
| `dokumen_desa`       | `content`, `data`                        |
| `rktl`               | `rktl_items`, `tim_penyusun`             |
| `rpjmdes_standar`    | (semua kolom narasi hanya untuk detail)  |

Aturan:

1. **Endpoint daftar** (tabel ringkasan) hanya menarik kolom skalar ringkas
   (id, kode, nama, angka, tanggal).
2. **Data besar hanya ditarik berdasarkan ID tunggal** saat modal detail dibuka:
   ```js
   // Modal detail RAB dibuka → baru ambil items & rpjm_data 1 baris
   supabase.from('rab')
     .select('id, items, rpjm_data')
     .eq('id', singleId)
     .single();
   ```
3. Jangan pernah memasukkan kolom berat ke loop `.map()` untuk kartu daftar.

---

## 4. KONTROL LIMIT & FILTER

Setiap penarikan data wajib:

```js
let query = supabase
    .from('rancangan_rkpdes')
    .select('id, tahun, kode_unik_full, nama_kegiatan, prakiraan_biaya')
    .eq('tahun', activeYear)          // ✅ filter tahun anggaran aktif
    .order('kode_unik_full')
    .limit(500);                      // ✅ pembatas baris
```

- Frontend yang butuh pagination memakai `.range(from, to)`, bukan menarik semua.
- Pencarian teks memakai `.ilike(...)` + filter + limit di sisi **database**,
  bukan menarik seluruh tabel lalu memfilter di JavaScript.

---

## 5. CEGAH RE-FETCHING & LEAKS

### 5.1 Polling / useEffect
- **Dilarang** memanggil fetch Supabase di dalam loop `setInterval` tanpa kebutuhan nyata.
- `useEffect` (atau setara load-on-show) hanya boleh fetch **sekali per interaksi
  pengguna**; guard dengan token/request-id untuk mencegah fetch ganda.
- Endpoint polling yang ada (`/api/sync-status/:code/:tahun`) hanya dipanggil
  saat pengguna membuka editor dokumen, bukan di latar belakang.

### 5.2 Realtime
- Channel realtime Supabase **nonaktif** di proyek ini (penghematan kuota pesan + egress).
- Jika suatu saat benar-benar krusial, wajib:
  - hanya event `*` yang benar-benar dirender UI,
  - filter `.eq('tahun', ...)` pada channel,
  - `channel.unsubscribe()` + cleanup penuh saat unmount.

### 5.3 In-memory cache untuk data referensi statis
Data yang jarang berubah **wajib di-cache di memori proses server** dan di-seed
sekali saat startup (pola sudah ada di `seedTemplateConfigCache()`):

- `dropdown_sdgs` (`/api/sdgs`) → cache `sdgsListCache`
- `anggaran` sumber dana (`/api/sumber-dana`) → cache `sumberDanaCache`
- `master_klasifikasi` (`/api/master-klasifikasi`) → cache `masterKlasifikasiCache`

Cache referensi tidak perlu `.limit()` karena ukurannya kecil & ter-cache,
tetapi tetap wajib kolom eksplisit.

---

## 6. AUDIT OTOMATIS (GATE PIPELINE)

Skrip `scripts/audit-supabase-calls.cjs` memindai seluruh `src/` + `frontend/`
+ `server.js` + `backend/` dan **gagal (exit 1)** bila menemukan:

- `.select('*')`
- `.select()` tanpa argumen

Jalankan sebelum commit:

```bash
npm run audit:egress   # audit cepat pola wildcard
npm run check:all      # audit:egress && tsc --noEmit && vite build
```

**Definisi selesai untuk setiap perubahan kode:** audit lolos, typecheck lolos,
build lolos — dan tidak ada satu pun `.select()` baru tanpa daftar kolom.

---

## 7. RINGKASAN CHECKLIST COMMIT

- [ ] Tidak ada `.select('*')` / `.select()` kosong
- [ ] Daftar kolom = persis yang dirender UI
- [ ] Kolom JSON/lampiran hanya di endpoint detail-by-id
- [ ] Filter tahun aktif + limit/range pada kueri daftar
- [ ] Tidak ada polling/re-fetch berulang; listener selalu di-cleanup
- [ ] Referensi statis ter-cache in-memory
- [ ] `npm run check:all` hijau

---

## 8. PROTOKOL RAB PERUBAHAN (SNAPSHOT VERSI)

Fitur RAB Perubahan memakai **metode snapshot pada tabel yang sama** (`rab`), bukan
tabel terpisah. Dua kolom penanda:

| Kolom | Nilai | Arti |
|---|---|---|
| `tipe_anggaran` | `'MURNI'` (default) \| `'PERUBAHAN'` | versi anggaran |
| `id_referensi_murni` | `bigint` \| `null` | id baris MURNI asal (null untuk MURNI) |

Migrasi: `supabase_add_tipe_anggaran_rab.sql` (idempoten; data lama otomatis MURNI).

### 8.1 Aturan kueri versi

1. **Setiap** kueri ke tabel `rab` **wajib** menyebut `tipe_anggaran`.
   Tanpa filter versi, satu `(kode_unik_full, tahun)` dapat mengembalikan DUA baris —
   `.single()` akan error dan daftar menjadi ganda.
2. Daftar ringkasan (`/api/rab/list`) **wajib** menyertakan `tahun` + `tipe`.
   Batas keras `RAB_LIST_LIMIT = 2000`.
3. Detail (`/api/rab?kode_unik_full=…`) memakai `RAB_FULL_COLUMNS` (dengan `items`
   dan `rpjm_data`) **hanya** saat modal/detail dibuka.
4. Perbandingan (`/api/rab/perbandingan`) memakai `RAB_COMPARE_COLUMNS` — **tanpa**
   `rpjm_data` — dan dipanggil per `prefix` kode, bukan seluruh tahun.
5. Cek versi (`/api/rab/versi-status`) memakai `head: true, count: 'exact'` sehingga
   **nol baris** yang tertarik.
6. Kolom `tipe_anggaran` **tidak boleh** ditulis lewat payload legacy tanpa fallback:
   semua kueri RAB memakai `rabQueryWithTipeFallback()` agar aplikasi tetap jalan sebelum
   migrasi dijalankan (baris diperlakukan sebagai MURNI).

### 8.2 Aturan integritas versi

- Baris `MURNI` **read-only** begitu `PERUBAHAN` untuk kegiatan+tahun tersebut ada.
  Ditegakkan di server (409 `locked: true` pada `POST`/`DELETE`) **dan** di UI.
- Salinan MURNI → PERUBAHAN hanya boleh dibuat oleh
  `POST /api/rab/clone-to-perubahan`; endpoint ini **melewati** kegiatan yang sudah punya
  versi PERUBAHAN (aman diklik berulang).
- Setiap item hasil salinan diberi jejak `urutan_murni` + `id_referensi_murni`.
  Jejak ini **wajib dipertahankan** saat item diedit (`addRabItem`), karena menjadi kunci
  penjajaran SEMULA ↔ MENJADI.
- Sinkronisasi balik ke `rpjmdes_standar` **hanya** dijalankan untuk versi `MURNI`,
  agar nilai PERUBAHAN tidak menimpa baseline RPJMDes.

### 8.3 Aturan perhitungan laporan

- Penjajaran item: `urutan_murni` → fallback kunci komposit
  (group + subgroup + uraian + satuan).
- Item hanya di `PERUBAHAN` → SEMULA = 0 (belanja baru).
- Item hanya di `MURNI` → MENJADI = 0 (belanja dihapus).
- `BERTAMBAH / (BERKURANG) = JUMLAH_MENJADI - JUMLAH_SEMULA`;
  negatif ditampilkan dalam tanda kurung, mis. `(1.200.000)`.
- Template cetak baku Kemenkeu: judul *PERUBAHAN RENCANA ANGGARAN BIAYA (RAB)*,
  header tabel **2 tingkat** (NO | URAIAN | SEMULA[3] | MENJADI[3] | BERTAMBAH/(BERKURANG)),
  total per kegiatan + total keseluruhan, serta **3 kolom tanda tangan**
  (Kepala Desa — Sekretaris Desa — PKA), A4 landscape.

### 8.4 Pengujian wajib

```bash
npm run test:rab-perubahan   # 33 asersi logika penjajaran & selisih
npm run check:all            # audit egress + syntax + uji di atas
```

Setiap perubahan pada `alignRabItems()`, `rabItemJumlah()`, atau konstanta kolom RAB
**harus** disertai penyesuaian `scripts/test-rab-perubahan.cjs`.
