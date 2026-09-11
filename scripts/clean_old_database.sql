-- ============================================================
-- PROTOKOL NOL TRAFIK: PENGOSONGAN DATABASE SUPABASE LAMA
-- Target Proyek Lama: kymmbbngwlfglamirdwg
-- ============================================================
-- PENTING:
-- Jalankan skrip ini HANYA setelah Supabase baru (kzvnzgoxzaplaztbvzjy)
-- terbukti 100% aktif, terverifikasi identik, dan seluruh data
-- telah dicadangkan ke lokal di scripts/backup_migration/data/.
--
-- Tujuan: Mengosongkan seluruh tabel di database lama agar kuota
-- egress < 100 MB tidak tersedot oleh kueri liar hingga tanggal
-- reset kuota (tanggal 25).
-- ============================================================

BEGIN;

TRUNCATE TABLE public.rab CASCADE;
TRUNCATE TABLE public.rkpdes CASCADE;
TRUNCATE TABLE public.du_rkpdes CASCADE;
TRUNCATE TABLE public.rpjmdes_standar CASCADE;
TRUNCATE TABLE public.rancangan_rkpdes CASCADE;
TRUNCATE TABLE public.prioritas_rkpdes CASCADE;
TRUNCATE TABLE public.prioritas_usulan CASCADE;
TRUNCATE TABLE public.usulan CASCADE;
TRUNCATE TABLE public.master_klasifikasi CASCADE;
TRUNCATE TABLE public.dokumen_desa CASCADE;
TRUNCATE TABLE public.dokumen_form_data CASCADE;
TRUNCATE TABLE public.dokumen_templates CASCADE;
TRUNCATE TABLE public.dropdown_sdgs CASCADE;
TRUNCATE TABLE public.pagu_anggaran CASCADE;
TRUNCATE TABLE public.anggaran CASCADE;
TRUNCATE TABLE public.kerjasama_pihak_ketiga CASCADE;
TRUNCATE TABLE public.pembiayaan CASCADE;
TRUNCATE TABLE public.rktl CASCADE;
TRUNCATE TABLE public.laporan_komponen_manual CASCADE;
TRUNCATE TABLE public.program_masuk_desa CASCADE;
TRUNCATE TABLE public.users CASCADE;

COMMIT;

-- Verifikasi: Semua tabel harus 0 baris
SELECT 
    schemaname,
    relname AS tabel,
    n_live_tup AS estimasi_baris
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY relname;
