// Dev script: build main process, then launch Electron pointing at Vite dev server
import { spawn, execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.join(__dirname, '..');
const projectRoot = path.join(desktopRoot, '..', '..');

console.log('🔨 Building Electron main process...');
execSync('node scripts/build-main.js', { cwd: desktopRoot, stdio: 'inherit' });

console.log('🚀 Launching Electron (dev mode)...');
console.log('   API: npm run dev:api from project root');
console.log('   Web: npm run dev:web from project root');
console.log('   Make sure both are running before launching!\n');

const electron = spawn(
  'npx',
  ['electron', '.'],
  {
    cwd: desktopRoot,
    env: {
      ...process.env,
      NODE_ENV: 'development',
    },
    stdio: 'inherit',
    shell: true,
  }
);

electron.on('exit', (code) => {
  console.log(`Electron exited with code ${code}`);
  process.exit(code ?? 0);
});
