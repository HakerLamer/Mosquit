#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const readline = require('readline');
 
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
 
async function createAdmin() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise(resolve => rl.question(q, resolve));
 
  console.log('=== Создание администратора Mosquit ===\n');
 
  const email = await ask('Email: ');
  const password = await ask('Пароль (мин. 6 символов): ');
  rl.close();
 
  if (!email || !password || password.length < 6) {
    console.error('Некорректные данные');
    process.exit(1);
  }
 
  try {
    const password_hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, 'admin')
       ON CONFLICT (email) DO UPDATE SET password_hash = $2, role = 'admin', is_blocked = false`,
      [email.toLowerCase(), password_hash]
    );
    console.log(`\nАдминистратор ${email} создан/обновлён успешно!`);
  } catch (err) {
    console.error('Ошибка:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}
 
createAdmin();