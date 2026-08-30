const supabase = require('../backend/config/supabase');

async function cleanupDuplicates() {
  console.log('🧹 Memulai pembersihan baris duplikat di dokumen_form_data...');
  
  const { data, error } = await supabase
    .from('dokumen_form_data')
    .select('id, doc_code, tahun, updated_at');
    
  if (error) {
    console.error('❌ Error fetching data:', error.message);
    return;
  }
  
  console.log(`📊 Total baris sebelum pembersihan: ${data.length}`);

  // Kelompokkan baris berdasarkan doc_code dan tahun
  const grouped = {};
  data.forEach(item => {
    const key = `${item.doc_code}_${item.tahun}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  let deletedCount = 0;

  for (const [key, items] of Object.entries(grouped)) {
    if (items.length > 1) {
      console.log(`⚠️ Menemukan ${items.length} duplikat untuk key: ${key}`);
      
      // Urutkan berdasarkan updated_at terbaru
      items.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
      
      // Baris pertama (index 0) adalah yang terbaru, sisanya akan dihapus
      const idsToDelete = items.slice(1).map(x => x.id);
      
      const { error: delErr } = await supabase
        .from('dokumen_form_data')
        .delete()
        .in('id', idsToDelete);
        
      if (delErr) {
        console.error(`❌ Gagal menghapus duplikat untuk ${key}:`, delErr.message);
      } else {
        console.log(`✅ Berhasil menghapus ${idsToDelete.length} baris lama untuk ${key}`);
        deletedCount += idsToDelete.length;
      }
    }
  }

  console.log(`\n🎉 Pembersihan selesai. Total baris dihapus: ${deletedCount}`);
  
  const { count } = await supabase.from('dokumen_form_data').select('*', { count: 'exact', head: true });
  console.log(`📊 Total baris akhir di dokumen_form_data: ${count}`);
}

cleanupDuplicates();
