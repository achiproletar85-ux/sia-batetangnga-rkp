require('dotenv').config();
const supabase = require('../backend/config/supabase');

async function inspectYearsAndCodes() {
    console.log('=== RINCIAN TAHUN DAN JUMLAH DATA PER TABEL ===\n');
    
    // 1. dokumen_form_data
    const { data: docData } = await supabase.from('dokumen_form_data').select('doc_code, tahun, fields, tables');
    console.log(`📄 dokumen_form_data (${docData ? docData.length : 0} item):`);
    (docData || []).forEach(d => {
        const fieldCount = d.fields ? Object.keys(d.fields).length : 0;
        const tableCount = d.tables ? Object.keys(d.tables).length : 0;
        console.log(`   - Code: ${d.doc_code} | Tahun: ${d.tahun} | Fields: ${fieldCount} | Tables: ${tableCount}`);
    });

    // 2. rkpdes
    const { data: rkp } = await supabase.from('rkpdes').select('tahun');
    const rkpYears = {};
    (rkp || []).forEach(r => rkpYears[r.tahun] = (rkpYears[r.tahun] || 0) + 1);
    console.log('\n📊 rkpdes per tahun:', rkpYears);

    // 3. du_rkpdes
    const { data: du } = await supabase.from('du_rkpdes').select('tahun');
    const duYears = {};
    (du || []).forEach(r => duYears[r.tahun] = (duYears[r.tahun] || 0) + 1);
    console.log('\n📊 du_rkpdes per tahun:', duYears);

    // 4. usulan
    const { data: usulan } = await supabase.from('usulan').select('tahun');
    const usulanYears = {};
    (usulan || []).forEach(r => usulanYears[r.tahun] = (usulanYears[r.tahun] || 0) + 1);
    console.log('\n📊 usulan per tahun:', usulanYears);

    // 5. rab
    const { data: rab } = await supabase.from('rab').select('tahun');
    const rabYears = {};
    (rab || []).forEach(r => rabYears[r.tahun] = (rabYears[r.tahun] || 0) + 1);
    console.log('\n📊 rab per tahun:', rabYears);
}

inspectYearsAndCodes();
