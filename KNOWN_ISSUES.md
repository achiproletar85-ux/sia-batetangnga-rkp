# KNOWN ISSUES — SIA Batetangnga

Daftar masalah yang diketahui, ditemukan selama audit & stabilisasi egress
Supabase (September 2026) serta audit arsitektur modul RAB (September 2026).
Item di sini bukan bagian dari refactor egress, melainkan catatan teknis untuk
perbaikan berikutnya.

---

## 1. 🔴 `POST /api/rkpdes/clear-and-sync` menyisipkan kolom yang tidak ada di tabel `rkpdes`

**Status:** 🟠 Terbuka — bug pra-ada, belum diperbaiki

> **KOREKSI CATATAN LAMA:** entri sebelumnya menyatakan `buildRkpPayLoadFromRAB()`
> "tidak pernah didefinisikan". Hasil verifikasi ulang: fungsi itu **ADA** di
> `server.js` (sekitar baris 4700). Yang benar-benar hilang adalah
> `mergeRkpFromRab` — lihat item 2.

**Lokasi:** `server.js` — `buildRkpPayLoadFromRAB()` + endpoint `POST /api/rkpdes/clear-and-sync`

**Bukti (probe skema live, September 2026):** tabel `rkpdes` **tidak memiliki** kolom
`jenis_bidang`, `nama_kegiatan`, `kode_unik`, `sub_kegiatan`, `kode_bidang`,
`kode_sub`, `kode_kegiatan`, `sub_bidang`, `items`, `rpjm_data`, dan `uraian`.

Namun `buildRkpPayLoadFromRAB()` menghasilkan baris berisi **`jenis_bidang`** dan
**`nama_kegiatan`** → `INSERT` ditolak PostgREST (PGRST204 / 42703).

**Dampak:**
- Endpoint gagal 500 **setelah** tahap `DELETE FROM rkpdes WHERE tahun = …` dijalankan.
  Urutannya berbahaya: **hapus dulu, insert gagal** → berpotensi menghapus data RKPDes
  yang ada tanpa menggantinya.
- Tabel `rkpdes` saat ini berisi **0 baris**, konsisten dengan sinkronisasi yang tidak
  pernah berhasil.

**Rekomendasi perbaikan berikutnya:**
1. Selaraskan keluaran `buildRkpPayLoadFromRAB()` dengan kolom `rkpdes` yang benar-benar ada
   (buang `jenis_bidang` & `nama_kegiatan`, atau `ALTER TABLE rkpdes` untuk menambahkannya).
2. Ubah urutan operasi: **bangun payload dulu → validasi → baru delete + insert**.
3. Bungkus dalam satu transaksi (RPC) agar tidak ada kondisi "kosong di tengah jalan".
4. Tambahkan smoke test endpoint pada tahun dummy.

---

## 2. 🔴 `mergeRkpFromRab` dipanggil tetapi tidak pernah didefinisikan

**Status:** 🟠 Terbuka — bug pra-ada, belum diperbaiki

**Lokasi:** `server.js` — di dalam `POST /api/rab`, sekitar baris 3051:

```js
if (typeof mergeRkpFromRab === 'function') {
    await mergeRkpFromRab(tahunSync);
}
```

**Bukti:** grep seluruh `server.js`, `frontend/`, `backend/`, `scripts/` →
satu-satunya kemunculan adalah call-site di atas.

**Dampak:**
- Karena dijaga `typeof … === 'function'`, tidak ada error yang muncul — sinkronisasi
  otomatis **"RAB → RKPDes" setelah simpan RAB adalah no-op senyap**.
- Komentar di sekitar kode menyatakan RAB baru "langsung turun ke tabel rkpdes tanpa
  menekan Sync/Import RAB". Klaim itu **tidak benar** saat ini.
- Ini menjelaskan mengapa `rkpdes` berisi 0 baris.

**Rekomendasi perbaikan berikutnya:**
1. Implementasikan `mergeRkpFromRab(tahun)` (boleh mendelegasikan ke
   `buildRkpPayLoadFromRAB()` + upsert), **setelah** item 1 dibereskan.
2. Selama belum ada, hapus/ubah komentar yang menyesatkan dan catat statusnya di UI.

---

## 3. 🟠 `/api/rab/list` dahulu menarik seluruh tabel lintas tahun

**Status:** 🟢 **Selesai** (perbaikan RAB Perubahan)

`listRabsFromDb()` kini wajib menerima `tahun` dan `tipe`, dan memiliki batas keras
`RAB_LIST_LIMIT = 2000`. Frontend (`loadSavedRabList`, `populateGroupCetakDropdown`)
selalu mengirim tahun + versi aktif sehingga pemfilteran tidak lagi dilakukan setelah
seluruh tabel terunduh.

---

## 4. 🟠 `/api/pagu-indikatif` selalu jatuh ke fallback

**Status:** 🟠 Terbuka — perilaku pra-ada yang harus dipertahankan

`GET /api/pagu-indikatif` menjalankan `order('tahun')` pada tabel `anggaran`, padahal
tabel `anggaran` (7 baris) **tidak memiliki kolom `tahun`** — hanya `id, sumber`.
Kueri selalu error → `isTableMissingError()` bernilai true → **selalu fallback ke
`pagu_anggaran`** (12 baris).

**Dampak:** hasil akhir tetap benar, tetapi satu kueri gagal terbuang di setiap
pemanggilan. Frontend saat ini hanya memakai `/api/pagu-anggaran`, jadi dampaknya kecil.

**Rekomendasi:** luruskan `ANGGARAN_COLUMNS`/urutan kueri, atau hapus jalur `anggaran`
bila memang sudah tidak dipakai.

---

## 5. 🟡 `validatePaguBudget()` menghitung alokasi dari kolom yang tidak dikirim

**Status:** 🟠 Terbuka

`frontend/rab.js` menghitung alokasi per sumber dana dengan membaca `rab.items` dari
`savedRabList`. Namun `/api/rab/list` memakai `RAB_LIST_COLUMNS` yang **sengaja tidak
memuat `items`** (egress policy). Akibatnya `Array.isArray(rab.items)` selalu false dan
perhitungan jatuh ke `rab.jumlah_anggaran` (total seluruh sumber dana untuk baris itu).

**Dampak:** validasi over-budget per sumber dana bisa **kurang teliti** — bukan
kebocoran egress, melainkan potensi salah tolak/terima saat menyimpan item.

**Rekomendasi:** hitung validasi di server (endpoint ringan
`GET /api/rab/alokasi?tahun=&sumber=` memakai agregasi), bukan di klien.

---

## 6. 🟡 `saveRabToDb()` memakai `MAX(id) + 1`

**Status:** 🟠 Terbuka

Karena kolom `id` pada tabel `rab` tidak memiliki default, `saveRabToDb()` (dan
`POST /api/rab/clone-to-perubahan`) menghitung `nextId` dari `MAX(id) + 1`.
Dua pengguna yang menyimpan bersamaan dapat memperoleh id yang sama (race condition).

**Rekomendasi:** ubah kolom `id` menjadi `bigint GENERATED BY DEFAULT AS IDENTITY`, atau
tambahkan `UNIQUE (tahun, kode_unik_full, tipe_anggaran)` + upsert berbasis konflik.
Catatan: constraint unik juga akan menghilangkan kebutuhan pencarian manual baris.

---

## 7. 🟡 Dead code "direct Supabase" di `frontend/rab.js`

**Status:** 🟠 Terbuka — tidak aktif, tetapi berbahaya bila dihidupkan

Tiga blok di `frontend/rab.js` (`populateGroupCetakDropdown`, `cetakPdfByGroup`) memakai
`window.supabaseClient`. Variabel tersebut **tidak pernah didefinisikan** di seluruh
frontend (tidak ada `createClient` maupun CDN supabase-js), sehingga blok itu tidak
pernah dieksekusi. Bila suatu saat dihidupkan, blok tersebut menyebut kolom yang
**tidak ada** (`volume_rab`, `kode_kegiatan`) dan akan langsung error.

**Rekomendasi:** hapus blok tersebut, atau pindahkan ke endpoint server dengan daftar
kolom eksplisit.

---

<!-- Format entri baru:
## N. Judul singkat
**Status:** 🟠 Terbuka / 🟢 Selesai
**Lokasi:** file & baris
**Dampak:** ...
**Rekomendasi:** ...
-->
