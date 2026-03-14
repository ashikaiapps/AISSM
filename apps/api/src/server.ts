import { app } from './app.js';
import { env } from './config/env.js';
import { seedDefaultUser } from './db/index.js';
import { startInspirationWorker } from './services/inspiration-worker.js';

// Validate secrets in non-test environments
if (env.NODE_ENV !== 'test') {
  try {
    env.validateSecrets();
  } catch (e) {
    console.warn(`⚠️  ${(e as Error).message}`);
    console.warn('   Copy .env.example to .env and update the secret values.');
  }
}

// Seed default user (tables must exist — run db:migrate first)
try {
  seedDefaultUser();
} catch {
  console.warn('⚠️  Could not seed default user. Run `npm run db:migrate` first.');
}

app.listen(env.PORT, () => {
  console.log(`🚀 SocialKeys API running at ${env.API_URL}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
  startInspirationWorker();
});
