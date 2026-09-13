-- ============================================================
-- SQL SCRIPT: RPC get_pagu_indikatif_perubahan
-- Menghitung agregasi pagu indikatif perubahan secara otomatis
-- langsung di sisi database (zero egress waste).
-- Menggabungkan seluruh kegiatan murni dengan kegiatan yang diubah pada PAK
-- sehingga kegiatan yang tidak bergeser tetap mempertahankan anggaran aslinya.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_pagu_indikatif_perubahan(p_tahun integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result json;
BEGIN
    WITH 
    -- Plafon sumber dana dari pagu_anggaran
    plafon_sd AS (
        SELECT 
            sumber_dana,
            COALESCE(pagu, 0) AS pagu_plafon
        FROM public.pagu_anggaran
        WHERE tahun = p_tahun
    ),
    -- Data kegiatan murni
    rab_murni AS (
        SELECT id, kode_unik, kode_unik_full, nama_kegiatan, uraian, bidang, status, group_nama, sub_group_nama, lokasi, volume, satuan, harga_satuan, sumber_dana, COALESCE(jumlah_anggaran, 0) AS jumlah_anggaran
        FROM public.rab
        WHERE tahun = p_tahun AND (tipe_anggaran = 'MURNI' OR tipe_anggaran IS NULL)
    ),
    -- Data kegiatan perubahan
    rab_perubahan AS (
        SELECT id, id_referensi_murni, kode_unik, kode_unik_full, nama_kegiatan, uraian, bidang, status, group_nama, sub_group_nama, lokasi, volume, satuan, harga_satuan, sumber_dana, COALESCE(jumlah_anggaran, 0) AS jumlah_anggaran
        FROM public.rab
        WHERE tahun = p_tahun AND tipe_anggaran = 'PERUBAHAN'
    ),
    -- Gabungkan kegiatan: jika ada di perubahan gunakan perubahan, jika tidak gunakan murni!
    merged_kegiatan AS (
        SELECT 
            COALESCE(p.id, m.id) AS id,
            COALESCE(p.kode_unik, m.kode_unik) AS kode_unik,
            COALESCE(p.kode_unik_full, m.kode_unik_full) AS kode_unik_full,
            COALESCE(p.nama_kegiatan, m.nama_kegiatan) AS nama_kegiatan,
            COALESCE(p.uraian, m.uraian) AS uraian,
            COALESCE(p.bidang, m.bidang) AS bidang,
            COALESCE(p.sumber_dana, m.sumber_dana) AS sumber_dana,
            COALESCE(p.volume, m.volume) AS volume,
            COALESCE(p.satuan, m.satuan) AS satuan,
            COALESCE(p.harga_satuan, m.harga_satuan) AS harga_satuan,
            m.jumlah_anggaran AS belanja_murni,
            COALESCE(p.jumlah_anggaran, m.jumlah_anggaran) AS belanja_perubahan
        FROM rab_murni m
        LEFT JOIN rab_perubahan p ON (
            p.id_referensi_murni = m.id 
            OR (p.id_referensi_murni IS NULL AND p.kode_unik_full = m.kode_unik_full AND p.kode_unik_full IS NOT NULL AND p.kode_unik_full != '')
            OR (p.id_referensi_murni IS NULL AND LOWER(TRIM(p.nama_kegiatan)) = LOWER(TRIM(m.nama_kegiatan)))
        )
        UNION ALL
        SELECT 
            p.id,
            p.kode_unik,
            p.kode_unik_full,
            p.nama_kegiatan,
            p.uraian,
            p.bidang,
            p.sumber_dana,
            p.volume,
            p.satuan,
            p.harga_satuan,
            0 AS belanja_murni,
            p.jumlah_anggaran AS belanja_perubahan
        FROM rab_perubahan p
        WHERE NOT EXISTS (
            SELECT 1 FROM rab_murni m 
            WHERE p.id_referensi_murni = m.id 
               OR (p.id_referensi_murni IS NULL AND p.kode_unik_full = m.kode_unik_full AND p.kode_unik_full IS NOT NULL AND p.kode_unik_full != '')
               OR (p.id_referensi_murni IS NULL AND LOWER(TRIM(p.nama_kegiatan)) = LOWER(TRIM(m.nama_kegiatan)))
        )
    ),
    -- Agregasi belanja per sumber dana standar dari merged_kegiatan
    belanja_sd AS (
        SELECT 
            CASE 
                WHEN UPPER(sumber_dana) LIKE '%ADD%' OR UPPER(sumber_dana) LIKE '%ALOKASI DANA%' THEN 'ADD'
                WHEN UPPER(sumber_dana) LIKE '%DDS%' OR UPPER(sumber_dana) LIKE '%DANA DESA%' OR UPPER(sumber_dana) LIKE '%APBN%' THEN 'DDS'
                WHEN UPPER(sumber_dana) LIKE '%BAGI HASIL%' OR UPPER(sumber_dana) LIKE '%PAJAK%' OR UPPER(sumber_dana) LIKE '%RETRIBUSI%' OR UPPER(sumber_dana) LIKE '%PBH%' THEN 'PBH'
                WHEN UPPER(sumber_dana) LIKE '%PROV%' OR UPPER(sumber_dana) LIKE '%BKK%' OR UPPER(sumber_dana) LIKE '%TK. I%' OR UPPER(sumber_dana) LIKE '%TK I%' THEN 'APBD Tk. I'
                WHEN UPPER(sumber_dana) LIKE '%KAB%' OR UPPER(sumber_dana) LIKE '%KOTA%' OR UPPER(sumber_dana) LIKE '%TK. II%' OR UPPER(sumber_dana) LIKE '%TK II%' THEN 'APBD Tk. II'
                WHEN UPPER(sumber_dana) LIKE '%PAD%' OR UPPER(sumber_dana) LIKE '%ASLI%' OR UPPER(sumber_dana) LIKE '%DLL%' THEN 'PAD'
                ELSE 'LAINNYA'
            END AS sumber_clean,
            COALESCE(SUM(belanja_murni), 0) AS total_murni,
            COALESCE(SUM(belanja_perubahan), 0) AS total_perubahan
        FROM merged_kegiatan
        GROUP BY 1
    ),
    -- Daftar sumber dana baku
    master_sd AS (
        SELECT unnest(ARRAY['ADD', 'DDS', 'PBH', 'APBD Tk. I', 'APBD Tk. II', 'PAD']) AS sumber_clean
    ),
    -- Rekap sumber dana
    rekap_sd AS (
        SELECT 
            m.sumber_clean AS sumber_dana,
            COALESCE(p.pagu_plafon, 0) AS pagu_murni,
            COALESCE(b.total_murni, 0) AS belanja_murni,
            COALESCE(b.total_perubahan, 0) AS pagu_perubahan,
            COALESCE(b.total_perubahan, 0) - COALESCE(b.total_murni, 0) AS selisih_murni,
            CASE 
                WHEN COALESCE(b.total_murni, 0) > 0 THEN 
                    ROUND(((COALESCE(b.total_perubahan, 0) - COALESCE(b.total_murni, 0))::numeric / b.total_murni::numeric) * 100, 2)
                ELSE 0 
            END AS persentase_murni,
            COALESCE(p.pagu_plafon, 0) - COALESCE(b.total_perubahan, 0) AS sisa_plafon,
            CASE 
                WHEN COALESCE(p.pagu_plafon, 0) = 0 AND COALESCE(b.total_perubahan, 0) = 0 THEN 'Seimbang'
                WHEN COALESCE(p.pagu_plafon, 0) > 0 AND COALESCE(b.total_perubahan, 0) > COALESCE(p.pagu_plafon, 0) THEN 'Melampaui Pagu'
                WHEN COALESCE(p.pagu_plafon, 0) > 0 AND COALESCE(b.total_perubahan, 0) <= COALESCE(p.pagu_plafon, 0) THEN 'Sesuai Pagu'
                ELSE 'Sesuai Pagu'
            END AS status_keseimbangan
        FROM master_sd m
        LEFT JOIN plafon_sd p ON m.sumber_clean = p.sumber_dana
        LEFT JOIN belanja_sd b ON m.sumber_clean = b.sumber_clean
    ),
    -- Agregasi per bidang
    master_bidang AS (
        SELECT unnest(ARRAY[
            'Bidang Penyelenggaraan Pemerintahan Desa',
            'Bidang Pelaksanaan Pembangunan Desa',
            'Bidang Pembinaan Kemasyarakatan',
            'Bidang Pemberdayaan Masyarakat',
            'Bidang Penanggulangan Bencana, Keadaan Darurat dan Mendesak Desa'
        ]) AS bidang
    ),
    belanja_bid AS (
        SELECT 
            CASE 
                WHEN LOWER(bidang) LIKE '%pembangunan%' THEN 'Bidang Pelaksanaan Pembangunan Desa'
                WHEN LOWER(bidang) LIKE '%pembinaan%' THEN 'Bidang Pembinaan Kemasyarakatan'
                WHEN LOWER(bidang) LIKE '%pemberdayaan%' THEN 'Bidang Pemberdayaan Masyarakat'
                WHEN LOWER(bidang) LIKE '%penanggulangan%' OR LOWER(bidang) LIKE '%darurat%' OR LOWER(bidang) LIKE '%bencana%' THEN 'Bidang Penanggulangan Bencana, Keadaan Darurat dan Mendesak Desa'
                ELSE 'Bidang Penyelenggaraan Pemerintahan Desa'
            END AS bidang_clean,
            COALESCE(SUM(belanja_murni), 0) AS total_murni,
            COALESCE(SUM(belanja_perubahan), 0) AS total_perubahan
        FROM merged_kegiatan
        GROUP BY 1
    ),
    rekap_bid AS (
        SELECT 
            mb.bidang,
            COALESCE(b.total_murni, 0) AS belanja_murni,
            COALESCE(b.total_perubahan, 0) AS belanja_perubahan,
            COALESCE(b.total_perubahan, 0) - COALESCE(b.total_murni, 0) AS selisih,
            CASE 
                WHEN COALESCE(b.total_murni, 0) > 0 THEN 
                    ROUND(((COALESCE(b.total_perubahan, 0) - COALESCE(b.total_murni, 0))::numeric / b.total_murni::numeric) * 100, 2)
                ELSE 0 
            END AS persentase
        FROM master_bidang mb
        LEFT JOIN belanja_bid b ON mb.bidang = b.bidang_clean
    )
    SELECT json_build_object(
        'tahun', p_tahun,
        'sumber_dana', (SELECT json_agg(r) FROM rekap_sd r),
        'bidang', (SELECT json_agg(b) FROM rekap_bid b),
        'total_plafon_murni', (SELECT COALESCE(SUM(pagu_murni), 0) FROM rekap_sd),
        'total_belanja_murni', (SELECT COALESCE(SUM(belanja_murni), 0) FROM rekap_sd),
        'total_pagu_perubahan', (SELECT COALESCE(SUM(pagu_perubahan), 0) FROM rekap_sd),
        'total_selisih', (SELECT COALESCE(SUM(pagu_perubahan) - SUM(belanja_murni), 0) FROM rekap_sd),
        'rincian', (
            SELECT json_agg(
                json_build_object(
                    'id', mk.id,
                    'kode_unik', mk.kode_unik,
                    'kode_unik_full', mk.kode_unik_full,
                    'nama_kegiatan', mk.nama_kegiatan,
                    'uraian', mk.uraian,
                    'bidang', mk.bidang,
                    'sumber_dana', mk.sumber_dana,
                    'volume', mk.volume,
                    'satuan', mk.satuan,
                    'harga_satuan', mk.harga_satuan,
                    'jumlah_anggaran', mk.belanja_perubahan,
                    'belanja_murni', mk.belanja_murni,
                    'belanja_perubahan', mk.belanja_perubahan
                ) ORDER BY mk.kode_unik_full
            ) FROM merged_kegiatan mk
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_pagu_indikatif_perubahan(integer) TO anon, authenticated, service_role;
