import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import pkg from 'pg';
import crypto from 'crypto';

dotenv.config();
const { Client } = pkg;

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(client) {
  const res = await client.query('SELECT filename FROM schema_migrations');
  return new Set(res.rows.map(r => r.filename));
}

async function applyMigration(client, filePath, filename) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const checksum = crypto.createHash('sha256').update(sql).digest('hex');
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)', [filename, checksum]);
    await client.query('COMMIT');
    console.log(`✅ Applied migration: ${filename}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`❌ Failed migration: ${filename}`);
    throw err;
  }
}

async function run() {
  const client = new Client({
    host: process.env.VITE_DB_HOST || 'localhost',
    port: parseInt(process.env.VITE_DB_PORT || '5432'),
    database: process.env.VITE_DB_NAME || 'timetrack',
    user: process.env.VITE_DB_USER || 'timetrack',
    password: process.env.VITE_DB_PASSWORD || 'timetrack_dev_password',
  });

  await client.connect();
  console.log('🔗 Connected to database');

  try {
    await ensureMigrationsTable(client);
    const migrationsDir = path.resolve('server/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const applied = await getAppliedMigrations(client);
    const pending = files.filter(f => !applied.has(f));

    if (pending.length === 0) {
      console.log('👌 No pending migrations');
    } else {
      for (const filename of pending) {
        const filePath = path.join(migrationsDir, filename);
        await applyMigration(client, filePath, filename);
      }
    }
  } finally {
    await client.end();
    console.log('🔌 Disconnected');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});