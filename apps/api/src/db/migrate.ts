// Migration runner for D1
// Usage: wrangler d1 execute staffnow-db --local --file=./migrations/XXXX_name.sql

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

async function listMigrations(): Promise<string[]> {
  const dir = join(import.meta.dirname, '../../migrations');
  const files = await readdir(dir);
  return files.filter((f) => f.endsWith('.sql')).sort();
}

async function main() {
  const migrations = await listMigrations();
  console.log('Available migrations:');
  migrations.forEach((m) => console.log(`  ${m}`));
  console.log('\nRun each migration with:');
  console.log('  npx wrangler d1 execute staffnow-db --local --file=./migrations/<filename>');
  console.log('\nOr run all:');
  console.log('  for f in migrations/*.sql; do npx wrangler d1 execute staffnow-db --local --file="$f"; done');
}

main().catch(console.error);
