import { sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import * as fetchService from './inspiration-fetch.service.js';

let intervalId: ReturnType<typeof setInterval> | null = null;
let isRunning = false;
let lastCleanup = 0;

const TICK_INTERVAL_MS = 60_000; // 1 minute
const STARTUP_DELAY_MS = 5_000; // 5 seconds
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RETENTION_DAYS = 30;

async function tick() {
  if (isRunning) return;
  isRunning = true;

  try {
    const results = await fetchService.fetchAllDue();
    if (results.length > 0) {
      const succeeded = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;
      console.log(`📡 Inspiration sync: ${succeeded} succeeded, ${failed} failed`);
    }
  } catch (err) {
    console.error('Inspiration worker tick error:', err);
  }

  // Run daily cleanup
  try {
    const now = Date.now();
    if (now - lastCleanup >= CLEANUP_INTERVAL_MS) {
      await cleanupOldItems();
      lastCleanup = now;
    }
  } catch (err) {
    console.error('Inspiration cleanup error:', err);
  }

  isRunning = false;
}

async function cleanupOldItems() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffStr = cutoff.toISOString();

  const result = db.run(sql`
    DELETE FROM inspiration_items
    WHERE status NOT IN ('saved', 'used')
      AND is_saved = 0
      AND created_at < ${cutoffStr}
  `);

  const deleted = result.changes;
  if (deleted > 0) {
    console.log(`🧹 Cleaned up ${deleted} old inspiration items`);
  }
}

export function startInspirationWorker() {
  if (intervalId) return;

  console.log('📡 Inspiration worker starting (first tick in 5s)');

  setTimeout(() => {
    tick();
    intervalId = setInterval(tick, TICK_INTERVAL_MS);
  }, STARTUP_DELAY_MS);
}

export function stopInspirationWorker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('📡 Inspiration worker stopped');
  }
}
