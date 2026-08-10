const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://kymmbbngwlfglamirdwg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_SERVICE_ROLE
  || process.env.SUPABASE_ANON_KEY
  || process.env.SUPABASE_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5bW1iYm5nd2xmZ2xhbWlyZHdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5ODAxMTksImV4cCI6MjEwMDU1NjExOX0.OSOvvmChRDrTH83nBYNsugIkEKZInWe1LHSEaAf22m0';

console.log('📡 SUPABASE_URL:', supabaseUrl ? 'ADA ✅' : 'TIDAK ADA ❌');
console.log('📡 SUPABASE_KEY:', supabaseKey ? 'ADA ✅' : 'TIDAK ADA ❌');

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

console.log('✅ Supabase connected!');
module.exports = supabase;