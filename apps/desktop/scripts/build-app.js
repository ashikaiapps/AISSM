// Full build: compile main process + build web frontend + copy to desktop
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.join(__dirname, '..');
const projectRoot = path.join(desktopRoot, '..', '..');
const webRoot = path.join(projectRoot, 'apps', 'web');
const apiRoot = path.join(projectRoot, 'apps', 'api');

// Step 1: Build the Electron main process
console.log('🔨 Step 1/4: Building Electron main process...');
execSync('node scripts/build-main.js', { cwd: desktopRoot, stdio: 'inherit' });

// Step 2: Build the API
console.log('🔨 Step 2/4: Building API...');
execSync('npm run build', { cwd: apiRoot, stdio: 'inherit' });

// Step 3: Build the web frontend
console.log('🔨 Step 3/4: Building web frontend...');
execSync('npm run build', { cwd: webRoot, stdio: 'inherit' });

// Step 4: Copy web dist to desktop/web-dist
console.log('📦 Step 4/4: Copying web build to desktop...');
const webDistSrc = path.join(webRoot, 'dist');
const webDistDest = path.join(desktopRoot, 'web-dist');

if (fs.existsSync(webDistDest)) {
  fs.rmSync(webDistDest, { recursive: true });
}
fs.cpSync(webDistSrc, webDistDest, { recursive: true });

console.log('✅ Full build complete! Run `npm run dist` to package.');
