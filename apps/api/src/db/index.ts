import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';
import { env } from '../config/env.js';
import * as schema from './schema.js';
import { resolve, dirname } from 'path';
import { mkdirSync } from 'fs';

const dbPath = resolve(process.cwd(), env.DATABASE_URL);
mkdirSync(dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export { schema };

// Ensure a default user exists (no user auth yet)
// Called after migrations — NOT at module load time
export function seedDefaultUser() {
  db.insert(schema.users)
    .values({
      id: 'default-user',
      email: 'default@socialkeys.local',
      name: 'Default User',
    })
    .onConflictDoNothing()
    .run();
}
