require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
 
async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
 
  try {
    console.log('Running migrations...');
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations/001_init.sql'),
      'utf8'
    );
    await pool.query(sql);
    console.log('Migration 001_init.sql completed successfully.');
 
    // Run seed if first time
    const { rows } = await pool.query('SELECT COUNT(*) FROM cars');
    if (parseInt(rows[0].count) === 0) {
      console.log('Seeding database...');
      const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
      await pool.query(seedSql);
      console.log('Seed completed.');
    }
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}
 
migrate();