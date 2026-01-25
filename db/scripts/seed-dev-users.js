/* eslint-disable no-console */
// Load env vars from .env for local development
require('dotenv').config({ path: '.env' });
const bcrypt = require('bcryptjs');
const { query, pool } = require('../../src/db/pool');

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('❌ Refusing to run dev seed in production');
  }

  console.log('🌱 Seeding dev users...');

  const adminEmail = 'admin@yourplace.dev';
  const hostEmail = 'host@yourplace.dev';
  const password = 'password123';

  const passwordHash = await bcrypt.hash(password, 10);

  // Admin
  await query(
    `
    INSERT INTO users (full_name, email, password_hash, role, locale)
    VALUES ($1, $2, $3, 'admin', 'en')
    ON CONFLICT (email) DO UPDATE
      SET role = 'admin'
    `,
    ['Dev Admin', adminEmail, passwordHash]
  );

  // Host
  await query(
    `
    INSERT INTO users (full_name, email, password_hash, role, locale)
    VALUES ($1, $2, $3, 'host', 'en')
    ON CONFLICT (email) DO UPDATE
      SET role = 'host'
    `,
    ['Dev Host', hostEmail, passwordHash]
  );

  console.log('✅ Dev users seeded');
  console.log('--------------------------------');
  console.log('Admin:');
  console.log(`  email: ${adminEmail}`);
  console.log(`  password: ${password}`);
  console.log('Host:');
  console.log(`  email: ${hostEmail}`);
  console.log(`  password: ${password}`);
}

seed()
  .catch((err) => {
    console.error(err);
  })
  .finally(async () => {
    await pool.end();
  });
