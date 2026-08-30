const supabase = require('../backend/config/supabase');

async function auditDokumenFormData() {
  const { data, error } = await supabase.from('dokumen_form_data').select('*');
  if (error) {
    console.error('Error fetching dokumen_form_data:', error);
    return;
  }
  console.log(`Total rows in dokumen_form_data: ${data.length}`);

  const counts = {};
  data.forEach(item => {
    const key = `${item.doc_code}_${item.tahun}`;
    counts[key] = (counts[key] || 0) + 1;
  });

  const duplicates = Object.entries(counts).filter(([k, v]) => v > 1);
  console.log(`Duplicate (doc_code, tahun) combinations:`, duplicates);

  // Group by doc_code
  const codes = {};
  data.forEach(item => {
    if (!codes[item.doc_code]) codes[item.doc_code] = [];
    codes[item.doc_code].push(item.tahun);
  });
  console.log('Years per doc_code:', codes);
}

auditDokumenFormData();
