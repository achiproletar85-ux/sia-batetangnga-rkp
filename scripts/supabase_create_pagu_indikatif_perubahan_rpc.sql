-- ============================================================
-- SQL SCRIPT: RPC get_pagu_indikatif_perubahan
-- Menghitung agregasi pagu indikatif perubahan secara otomatis
-- langsung di sisi database (zero egress waste).
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
    -- Agregasi belanja murni per sumber dana standar
    belanja_murni_sd AS (
        SELECT 
            CASE 
                WHEN UPPER(sumber_dana) LIKE '%ADD%' OR UPPER(sumber_dana) LIKE '%ALOKASI DANA%' THEN 'ADD'
                WHEN UPPER(sumber_dana) LIKE '%DDS%' OR UPPER(sumber_dana) LIKE '%DANA DESA%' OR UPPER(sumber_dana) LIKE '%APBN%' THEN 'DDS'
                WHEN UPPER(sumber_dana) LIKE '%BAGI HASIL%' OR UPPER(sumber_dana) LIKE '%PAJAK%' OR UPPER(sumber_dana) LIKE '%RETRIBUSI%' OR UPPER(sumber_dana) LIKE '%PBH%' THEN 'PBH'
                WHEN UPPER(sumber_dana) LIKE '%PROV%' OR UPPER(sumber_dana) LIKE '%BKK%' OR UPPER(sumber_dana) LIKE '%TK. I%' OR UPPER(sumber_dana) LIKE '%TK I%' THEN 'APBD Tk. I'
                WHEN UPPER(sumber_dana) LIKE '%KAB%' OR UPPER(sumber_dana) LIKE '%KOTA%' OR UPPER(sumber_dana) LIKE '%TK. II%' OR UPPER(sumber_dana) LIKE '%TK II%' THEN 'APBD Tk. II'
                WHEN UPPER(sumber_dana) LIKE '%PAD%' OR UPPER(sumber_dana) LIKE '%ASLI%' THEN 'PAD'
                ELSE 'LAINNYA'
            END AS sumber_clean,
            COALESCE(SUM(jumlah_anggaran), 0) AS total_murni
        FROM public.rab
        WHERE tahun = p_tahun AND (tipe_anggaran = 'MURNI' OR tipe_anggaran IS NULL)
        GROUP BY 1
    ),
    -- Agregasi belanja perubahan per sumber dana standar
    belanja_perubahan_sd AS (
        SELECT 
            CASE 
                WHEN UPPER(sumber_dana) LIKE '%ADD%' OR UPPER(sumber_dana) LIKE '%ALOKASI DANA%' THEN 'ADD'
                WHEN UPPER(sumber_dana) LIKE '%DDS%' OR UPPER(sumber_dana) LIKE '%DANA DESA%' OR UPPER(sumber_dana) LIKE '%APBN%' THEN 'DDS'
                WHEN UPPER(sumber_dana) LIKE '%BAGI HASIL%' OR UPPER(sumber_dana) LIKE '%PAJAK%' OR UPPER(sumber_dana) LIKE '%RETRIBUSI%' OR UPPER(sumber_dana) LIKE '%PBH%' THEN 'PBH'
                WHEN UPPER(sumber_dana) LIKE '%PROV%' OR UPPER(sumber_dana) LIKE '%BKK%' OR UPPER(sumber_dana) LIKE '%TK. I%' OR UPPER(sumber_dana) LIKE '%TK I%' THEN 'APBD Tk. I'
                WHEN UPPER(sumber_dana) LIKE '%KAB%' OR UPPER(sumber_dana) LIKE '%KOTA%' OR UPPER(sumber_dana) LIKE '%TK. II%' OR UPPER(sumber_dana) LIKE '%TK II%' THEN 'APBD Tk. II'
                WHEN UPPER(sumber_dana) LIKE '%PAD%' OR UPPER(sumber_dana) LIKE '%ASLI%' THEN 'PAD'
                ELSE 'LAINNYA'
            END AS sumber_clean,
            COALESCE(SUM(jumlah_anggaran), 0) AS total_perubahan
        FROM public.rab
        WHERE tahun = p_tahun AND tipe_anggaran = 'PERUBAHAN'
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
            COALESCE(bm.total_murni, 0) AS belanja_murni,
            COALESCE(bp.total_perubahan, 0) AS pagu_perubahan,
            COALESCE(bp.total_perubahan, 0) - COALESCE(bm.total_murni, 0) AS selisih_murni,
            CASE 
                WHEN COALESCE(bm.total_murni, 0) > 0 THEN 
                    ROUND(((COALESCE(bp.total_perubahan, 0) - COALESCE(bm.total_murni, 0))::numeric / bm.total_murni::numeric) * 100, 2)
                ELSE 0 
            END AS persentase_murni,
            COALESCE(p.pagu_plafon, 0) - COALESCE(bp.total_perubahan, 0) AS sisa_plafon,
            CASE 
                WHEN COALESCE(p.pagu_plafon, 0) = 0 AND COALESCE(bp.total_perubahan, 0) = 0 THEN 'Seimbang'
                WHEN COALESCE(p.pagu_plafon, 0) > 0 AND COALESCE(bp.total_perubahan, 0) > COALESCE(p.pagu_plafon, 0) THEN 'Melampaui Pagu'
                WHEN COALESCE(p.pagu_plafon, 0) > 0 AND COALESCE(bp.total_perubahan, 0) <= COALESCE(p.pagu_plafon, 0) THEN 'Sesuai Pagu'
                ELSE 'Sesuai Pagu'
            END AS status_keseimbangan
        FROM master_sd m
        LEFT JOIN plafon_sd p ON m.sumber_clean = p.sumber_dana
        LEFT JOIN belanja_murni_sd bm ON m.sumber_clean = bm.sumber_clean
        LEFT JOIN belanja_perubahan_sd bp ON m.sumber_clean = bp.sumber_clean
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
    belanja_murni_bid AS (
        SELECT 
            CASE 
                WHEN LOWER(bidang) LIKE '%pembangunan%' THEN 'Bidang Pelaksanaan Pembangunan Desa'
                WHEN LOWER(bidang) LIKE '%pembinaan%' THEN 'Bidang Pembinaan Kemasyarakatan'
                WHEN LOWER(bidang) LIKE '%pemberdayaan%' THEN 'Bidang Pemberdayaan Masyarakat'
                WHEN LOWER(bidang) LIKE '%penanggulangan%' OR LOWER(bidang) LIKE '%darurat%' OR LOWER(bidang) LIKE '%bencana%' THEN 'Bidang Penanggulangan Bencana, Keadaan Darurat dan Mendesak Desa'
                ELSE 'Bidang Penyelenggaraan Pemerintahan Desa'
            END AS bidang_clean,
            COALESCE(SUM(jumlah_anggaran), 0) AS total_murni
        FROM public.rab
        WHERE tahun = p_tahun AND (tipe_anggaran = 'MURNI' OR tipe_anggaran IS NULL)
        GROUP BY 1
    ),
    belanja_perubahan_bid AS (
        SELECT 
            CASE 
                WHEN LOWER(bidang) LIKE '%pembangunan%' THEN 'Bidang Pelaksanaan Pembangunan Desa'
                WHEN LOWER(bidang) LIKE '%pembinaan%' THEN 'Bidang Pembinaan Kemasyarakatan'
                WHEN LOWER(bidang) LIKE '%pemberdayaan%' THEN 'Bidang Pemberdayaan Masyarakat'
                WHEN LOWER(bidang) LIKE '%penanggulangan%' OR LOWER(bidang) LIKE '%darurat%' OR LOWER(bidang) LIKE '%bencana%' THEN 'Bidang Penanggulangan Bencana, Keadaan Darurat dan Mendesak Desa'
                ELSE 'Bidang Penyelenggaraan Pemerintahan Desa'
            END AS bidang_clean,
            COALESCE(SUM(jumlah_anggaran), 0) AS total_perubahan
        FROM public.rab
        WHERE tahun = p_tahun AND tipe_anggaran = 'PERUBAHAN'
        GROUP BY 1
    ),
    rekap_bid AS (
        SELECT 
            mb.bidang,
            COALESCE(bmb.total_murni, 0) AS belanja_murni,
            COALESCE(bpb.total_perubahan, 0) AS belanja_perubahan,
            COALESCE(bpb.total_perubahan, 0) - COALESCE(bmb.total_murni, 0) AS selisih,
            CASE 
                WHEN COALESCE(bmb.total_murni, 0) > 0 THEN 
                    ROUND(((COALESCE(bpb.total_perubahan, 0) - COALESCE(bmb.total_murni, 0))::numeric / bmb.total_murni::numeric) * 100, 2)
                ELSE 0 
            END AS persentase
        FROM master_bidang mb
        LEFT JOIN belanja_murni_bid bmb ON mb.bidang = bmb.bidang_clean
        LEFT JOIN belanja_perubahan_bid bpb ON mb.bidang = bpb.bidang_clean
    )
    SELECT json_build_object(
        'tahun', p_tahun,
        'sumber_dana', (SELECT json_agg(r) FROM rekap_sd r),
        'bidang', (SELECT json_agg(b) FROM rekap_bid b),
        'total_plafon_murni', (SELECT COALESCE(SUM(pagu_murni), 0) FROM rekap_sd),
        'total_belanja_murni', (SELECT COALESCE(SUM(belanja_murni), 0) FROM rekap_sd),
        'total_pagu_perubahan', (SELECT COALESCE(SUM(pagu_perubahan), 0) FROM rekap_sd),
        'total_selisih', (SELECT COALESCE(SUM(pagu_perubahan) - SUM(belanja_murni), 0) FROM rekap_sd)
    ) INTO v_result;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pagu_indikatif_perubahan(integer) TO anon, authenticated, service_role;
