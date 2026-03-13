import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db, seedDefaultUser } from './index.js';
import { resolve } from 'path';

console.log('Running migrations...');
migrate(db, { migrationsFolder: resolve(import.meta.dirname, '../../drizzle') });
console.log('Migrations complete.');

seedDefaultUser();
console.log('Default user seeded.');
