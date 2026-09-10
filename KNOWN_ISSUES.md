# KNOWN ISSUES — SIA Batetangnga

Daftar masalah yang diketahui, ditemukan selama audit & stabilisasi egress
Supabase (September 2026). Item di sini bukan bagian dari refactor egress,
melainkan catatan teknis untuk perbaikan berikutnya.

---

## 1. `buildRkpPayLoadFromRAB()` tidak terdefinisi (endpoint clear-and-sync rkpdes)

**Status:** 🟠 Terbuka — bug pra-ada, belum diperbaiki

**Lokasi:**
- `server.js` — endpoint `POST /api/rkpdes/clear-and-sync` memanggil:
  ```js
  const { rows: rkpdesPayload } = await buildRkpPayLoadFromRAB(tahunInt);
  ```
- Fungsi `buildRkpPayLoadFromRAB` **tidak pernah didefinisikan** di `server.js`,
  `backend/`, maupun `scripts/` (diverifikasi via grep seluruh repo; bahkan salinan
  `dist/win-unpacked/resources/app/server.js` hanya memiliki call-site, tanpa definisi).

**Dampak:**
- Saat endpoint `POST /api/rkpdes/clear-and-sync` dipanggil, JavaScript melempar
  `ReferenceError: buildRkpPayLoadFromRAB is not defined` → endpoint gagal (500)
  setelah data RAB tahun tersebut dihapus dari tabel `rkpdes` (tahap 1 delete sudah
  dieksekusi sebelum error). **Risiko kehilangan data sementara jika endpoint dipakai
  tanpa perbaikan.**

**Akar masalah (dugaan):**
- Refactor sebelumnya menggantikan logika inline (lihat `scratch/test_sync_rkp.js`
  yang berisi "buildRkpPayLoadFromRAB equivalent logic") dengan pemanggilan fungsi
  yang lupa didaftarkan di `server.js`.

**Rekomendasi perbaikan berikutnya:**
1. Ekstrak logika transformasi RAB → payload rkpdes dari `scratch/test_sync_rkp.js`
   menjadi fungsi `buildRkpPayLoadFromRAB(tahunInt)` di `server.js` (atau modul
   `backend/services/`), dengan kolom eksplisit sesuai protokol egress.
2. Pindahkan pemanggilan fungsi ke **setelah** validasi, dan jangan hapus data
   `rkpdes` sebelum payload berhasil dibangun (ubah urutan: build dulu, baru delete+insert).
3. Tambahkan try/catch yang mengembalikan 500 dengan pesan jelas tanpa menghapus data.
4. Tambahkan smoke test endpoint (`POST /api/rkpdes/clear-and-sync` pada tahun dummy).

---

## 2. (Kosong — isi saat temuan berikutnya tercatat)

<!-- Format entri baru:
## N. Judul singkat
**Status:** 🟠 Terbuka / 🟢 Selesai
**Lokasi:** file & baris
**Dampak:** ...
**Rekomendasi:** ...
-->