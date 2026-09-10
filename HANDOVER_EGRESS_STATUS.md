# HANDOVER STATUS — AUDIT & REFAKTOR EGRESS SUPABASE (ZERO-WILDCARD)

> Status darurat: egress Supabase 4.82 GB / 5 GB (96%), grace period s.d. 18 Sep 2026.
> Dokumen ini mencatat posisi kerja saat **pengalihan model (glm-5.3-flash → DeepSeek)**.
> **Belum ada git commit / push — dilarang dilakukan sampai verifikasi manual selesai.**

Dibuat: 10 Sep 2026 · Branch: `main` (tidak ada commit sama sekali, lihat §4)

---

## 1. FILE YANG SUDAH SELESAI DIREFACTOR / DIBUAT

| File | Status | Keterangan |
|---|---|---|
| `agent_rules.md` | ✅ SELESAI (159 baris) | Aturan baku protokol efisiensi kuota: zero-wildcard, kolom eksplisit, isolasi data besar, limit & filter, anti re-fetch |
| `scripts/audit-supabase-calls.cjs` | ✅ SELESAI | Skrip audit mandiri: scan sumber, exit 1 jika ada `.select('*')` / `.select()` kosong. Ignore `node_modules`, `dist`, `.git` |
| `server.js` | 🟡 SEBAGIAN | 19 konstanta daftar kolom eksplisit sudah ditambahkan (lihat §3); **66 wildcard masih tersisa** (awal: ~95 → sudah diganti ~29 di sesi pertama: endpoint dokumen_form_data, master-klasifikasi, sdgs, rancangan, rpjmdes-standar, dst.) |
| `.freebuff/run.md` | ✅ (di luar scope egress) | Run doc preview server (Express port 5500/random, `npm run dev`) |

**Konstanta kolom yang SUDAH ada di `server.js` (baris 263–1255):**
`RAB_FULL_COLUMNS`, `RAB_LIST_COLUMNS`, `RANCANGAN_LIST_COLUMNS`, `RPJMDES_LIST_COLUMNS`, `RAB_SYNC_COLUMNS`, `PRIORITAS_COLUMNS`, `EVALUASI_COLUMNS`, `RKPDES_COLUMNS`, `VERIF_PROPOSAL_COLUMNS`, `USULAN_COLUMNS`, `USULAN_SDGS_COLUMNS`, `LAPORAN_PERKEMBANGAN_COLUMNS`, `LAPORAN_MANUAL_COLUMNS`, `TIM_PENYUSUN_COLUMNS`, `PEMBIAYAAN_COLUMNS`, `PAGU_ANGGARAN_COLUMNS`, `ANGGARAN_COLUMNS`, `TEMPLATES_COLUMNS`, `RKTL_COLUMNS`.

`node --check server.js` → **SYNTAX OK** ✅ (belum ada error).

---

## 2. FILE YANG BELUM DISENTUH (RENCANA KERJA TERSISA)

| File | Sisa wildcard | Aksi yang diperlukan |
|---|---|---|
| `server.js` | **66** | Ganti tiap `.select('*')` / `.select()` dengan konstanta di §3 (per endpoint, sesuaikan kebutuhan kolom UI) |
| `frontend/rab.js` | 3 | `.select('*')` → kolom eksplisit |
| `frontend/rpjmdesModule.js` | 4 | `.select('*')` → kolom eksplisit |
| `backend/services/rpjmdesService.js` | 4 | `.select('*')` → kolom eksplisit |
| `scripts/import-csv.js` | 1 | `.select('*')` → kolom eksplisit |
| `package.json` | — | **Belum** ada `"audit:egress"` & `"check:all"` — harus ditambahkan (catatan: proyek ini **tidak punya tsc/vite build**; `check:all` perlu diadaptasi, mis. `node --check` + audit) |
| Caching in-memory data referensi statis | — | Belum diterapkan (dropdown_sdgs, anggaran, master-klasifikasi, loadRpjmLookup) |
| Audit `useEffect` / realtime `.channel(` | — | Belum diverifikasi; proyek ini plain JS (tanpa React) — perlu grep `.channel(` / `supabase.realtime` di server.js & backend |
| `sync-surat-tanah/` | 3 file | Sub-proyek Vercel terpisah (`server.js`, `public/app.js`) — perlu keputusan apakah ikut di-audit atau dikecualikan |

**Belum dilakukan sama sekali:** `npm run check:all`, verifikasi build, git commit, git push.

---

## 3. SKEMA KOLOM TERVERIFIKASI DARI SUPABASE (LIVE PROBE)

Probe langsung via `@supabase/supabase-js` (10 Sep 2026). Tabel **berisi** → dari baris aktual;
tabel **kosong** → dari payload insert di kode / file SQL migrasi.

- **prioritas_rkpdes**: bidang, bidang_kode, created_at, data_eksisting, id, jenis_bidang, jenis_kegiatan, kode_bidang, kode_kegiatan, kode_sub, kode_unik, kode_unik_full, lokasi, mendukung_sdgs, nama_bidang, nama_kegiatan, pagu_rpjm, penerima_manfaat, prakiraan_biaya, ranking, skor_kabupaten, skor_kewenangan, skor_sdgs, skor_sumber_daya, sub_bidang, sub_kegiatan, sumber_pembiayaan, tahun, total_manfaat, total_skor, updated_at, volume, volume_satuan, waktu_pelaksanaan
- **rkpdes**: bidang, created_at, data_eksisting, id, jenis_kegiatan, kode_unik_full, lokasi, mendukung_sdgs, penerima_manfaat, pola_pelaksanaan, prakiraan_biaya, sasaran_manfaat, satuan, status_rab, stunting, sumber_pembiayaan, tahun, target_capaian, total_manfaat, updated_at, verifikasi_proposal, volume, waktu_pelaksanaan
- **verifikasi_proposal**: bidang, catatan, created_at, dinas_instansi, hasil_layak, id, item1–item14, kegiatan, lokasi, pendamping_profesional, tahun, tanggal_pemeriksaan, updated_at, volume, wakil_masyarakat
- **laporan_perkembangan**: biaya, bidang, bulan, created_at, id, keterangan, lokasi, nama_kegiatan, penerima_jumlah, penerima_lk, penerima_pr, penerima_rtm, progres_biaya, progres_fisik, rencana_hari, sub_bidang, tahun, tgl_mulai, updated_at, volume_satuan
- **usulan**: biaya, bidang, created_at, data_eksisting, id, kegiatan, kode_unik, kode_unik_full, laki_laki, lokasi, nama_kegiatan, pengusul, perempuan, prioritas, rtm, sasaran, sdgs, sumber_dana, tahun, tahun_usulan, updated_at, volume
- **tim_penyusun**: created_at, id, jabatan_tim, nama, tahun
- **rktl**: created_at, fasilitator, id, ketua_tim, rktl_items, tahun, tanggal_ttd, tim_penyusun, updated_at
- **dokumen_desa**: content, created_at, data, docid, id, kategori, nama_dokumen, tahun, template_id, updated_at
- **dokumen_templates**: code, created_at, documentid, fields, id, is_real, name, stage, table_headers, updated_at
- **users**: created_at, id, is_active, last_login_ip, login_at, name, password, role, updated_at, username
- **pembiayaan**: created_at, hasil_penjualan_kekayaan, id, pembentukan_dana_cadangan, pencairan_dana_cadangan, penyertaan_modal_desa, silpa_tahun_sebelumnya, tahun, updated_at
- **pagu_anggaran**: created_at, id, keterangan, pagu, sumber_dana, tahun, updated_at
- **anggaran**: created_at, id, kode_unik, sumber
- **evaluasi_rkpdes** *(kosong)*: id, tahun, tahun_rkp, tahun_evaluasi, kode_bidang, bidang, no_urut, kegiatan, lokasi_kegiatan, nominal_anggaran, realisasi, keterangan, created_at (dari payload insert)
- **laporan_manual** *(kosong)*: id, tahun, tipe, uraian, keterangan, created_at, updated_at (dari SQL migrasi)
- **usulan_sdgs** *(kosong, kolom BELUM terverifikasi live)*: usulan dari frontend `sdgs.js` — id, sdgs_ke, uraian_kegiatan, pengusul, lokasi_kegiatan, prakiraan_volume, penerima_l, penerima_p, penerima_rtm, keterangan, is_checked. **⚠️ Verifikasi kolom aktual sebelum dipakai di `.select()` (tabel kosong → select kolom salah = error PGRST204).**

Kolom JSON berat: `rab.items`, `rab.rpjm_data`, `rktl.rktl_items`, `dokumen_desa.content`/`data`, `dokumen_templates.fields`/`table_headers` → hanya boleh ditarik di endpoint yang membutuhkan (detail/modal/generasi dokumen), JANGAN di daftar ringkasan.

---

## 4. GIT STATUS SAAT INI (`git status -s`)

**Repo belum punya commit pertama sama sekali** — semua 71 entri berstatus `??` (untracked), tidak ada file staged, tidak ada remote `origin` terkonfigurasi. Konsekuensi:
- `git diff` **kosong** untuk file untracked → untuk verifikasi manual, gunakan `git add -N <file>` (intent-to-add, tidak mengubah konten) lalu `git diff`, atau diff per-file dengan `git diff --no-index /dev/null <file>`.
- **Push ke `origin main` belum mungkin** sampai repo di-commit pertama kali (perlu `git init` sudah ada? — repo ada, tapi 0 commit) dan remote ditambahkan. **Keputusan user diperlukan.**

Ringkasan `git status -s` (semua `??` untracked):

```
?? .freebuff/                  ?? backend/                    ?? dist/
?? .gitignore                  ?? backend_test_dokumen_desa.js ?? favicon.png
?? _audit_6.js                 ?? boot-err.log                ?? frontend/
?? agent_rules.md              ?? boot-err2.log               ?? hapus_rab_backup.sql
?? ahliwaris_doc.json          ?? boot-out.log                ?? index.html
?? "alur kerja sistem.sql"     ?? boot-out2.log               ?? main.js
?? btest-out.txt               ?? migration_blueprint.sql     ?? server.js
?? btest-out2.txt              ?? node_modules/               ?? server-err.log
?? components/                 ?? package-lock.json           ?? server-err2.log
?? package.json                ?? perbaiki_rab.sql            ?? server-out.log
?? preload.js                  ?? script_migrasi_usulan.js    ?? server-out2.log
?? scratch/                    ?? scripts/                    ?? supabase_*.sql (5 file)
?? scratch_rc1.js              ?? sync-surat-tanah/           ?? sisanya (template/ dll.)
```

Catatan tambahan:
- Preview server sedang berjalan (`.freebuff/preview-*.log`, port 58145) — proses `node`/`nodemon` dari `npm run dev`, tidak terkait egress.
- Bug pra-ada yang ditemukan (bukan bagian refaktor ini, perlu laporan): `buildRkpPayLoadFromRAB` dipanggil di baris 4489 `server.js` tapi **tidak terdefinisi** di file mana pun (endpoint sync rkpdes akan 500).

---

## 5. LANGKAH BERIKUTNYA (UNTUK MODEL PENERUS)

1. Selesaikan 66 wildcard di `server.js` pakai konstanta §3 (jangan lupa `.eq('tahun', …)` + `.limit`/`.range`).
2. Refactor `frontend/rab.js`, `frontend/rpjmdesModule.js`, `backend/services/rpjmdesService.js`, `scripts/import-csv.js`.
3. Verifikasi kolom `usulan_sdgs` live (tabel kosong) sebelum dipakai.
4. Tambah `audit:egress` + `check:all` di `package.json` (adaptasi: tanpa tsc/vite — pakai `node --check`).
5. Audit re-fetch & realtime channel; tambah cache in-memory data referensi statis.
6. Jalankan `npm run check:all`, perbaiki sampai lolos.
7. **Tampilkan ringkasan `git diff` untuk verifikasi manual user → baru commit + push (butuh keputusan user: repo 0 commit, belum ada remote).**