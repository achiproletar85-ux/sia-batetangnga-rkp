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
