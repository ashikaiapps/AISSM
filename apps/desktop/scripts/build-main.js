// Build the Electron main process and preload with esbuild
import { build } from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '..', 'src');
const outDir = path.join(__dirname, '..', 'dist');

async function buildMain() {
  // Main process
  await build({
    entryPoints: [path.join(srcDir, 'main.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    outfile: path.join(outDir, 'main.js'),
    external: ['electron', 'electron-store'],
    sourcemap: true,
    banner: {
      js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
    },
  });

  // Preload script (must be CommonJS for Electron sandbox)
  await build({
    entryPoints: [path.join(srcDir, 'preload.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: path.join(outDir, 'preload.js'),
    external: ['electron'],
    sourcemap: true,
  });

  console.log('✅ Electron main + preload built');
}

buildMain().catch((err) => {
  console.error(err);
  process.exit(1);
});
