const { Client } = require('pg');
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL or SUPABASE_DB_URL tidak ditemukan di .env');
  process.exit(1);
}

(async () => {
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    console.log('Connected to database');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS rab (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        kode_unik_full text NOT NULL,
        tahun text NOT NULL,
        items jsonb NOT NULL,
        total_biaya numeric NOT NULL,
        rpjm_data jsonb,
        saved_at timestamp with time zone NOT NULL,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now(),
        UNIQUE (kode_unik_full, tahun)
      );
    `;

    await client.query(createTableSQL);
    console.log('Table rab created or already exists.');
  } catch (error) {
    console.error('Failed to create rab table:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
