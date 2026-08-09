const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_SERVICE_ROLE
  || process.env.SUPABASE_ANON_KEY
  || process.env.SUPABASE_KEY;

console.log('📡 SUPABASE_URL:', supabaseUrl ? 'ADA ✅' : 'TIDAK ADA ❌');
console.log('📡 SUPABASE_KEY:', supabaseKey ? 'ADA ✅' : 'TIDAK ADA ❌');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: SUPABASE_URL atau SUPABASE_KEY tidak ditemukan di .env!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

console.log('✅ Supabase connected!');
module.exports = supabase;