import { app, BrowserWindow, shell, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, type ChildProcess } from 'child_process';
import fs from 'fs';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IS_DEV = process.env.NODE_ENV === 'development';
const API_PORT = 3001;
const API_URL = `http://localhost:${API_PORT}`;
const WEB_DEV_URL = 'http://localhost:5173';

let mainWindow: BrowserWindow | null = null;
let apiProcess: ChildProcess | null = null;

// ── Locate project root ──────────────────────────────────────────
function getProjectRoot(): string {
  if (IS_DEV) {
    // In dev, we're at apps/desktop/dist/main.js → go up 3 levels
    return path.resolve(__dirname, '..', '..', '..');
  }
  // In production, resources are packaged
  return path.join(process.resourcesPath!);
}

// ── Check if port is available ───────────────────────────────────
function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

// ── Wait for API to be ready ─────────────────────────────────────
function waitForApi(maxRetries = 30, interval = 500): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      const req = net.createConnection({ port: API_PORT, host: '127.0.0.1' }, () => {
        req.destroy();
        resolve();
      });
      req.on('error', () => {
        attempts++;
        if (attempts >= maxRetries) {
          reject(new Error(`API server did not start after ${maxRetries} attempts`));
        } else {
          setTimeout(check, interval);
        }
      });
    };
    check();
  });
}

// ── Start API Server ─────────────────────────────────────────────
async function startApiServer(): Promise<void> {
  const portFree = await isPortFree(API_PORT);
  if (!portFree) {
    console.log(`Port ${API_PORT} already in use — assuming API is running externally`);
    return;
  }

  const projectRoot = getProjectRoot();

  if (IS_DEV) {
    // Dev mode: use tsx to run the API from source
    const apiEntry = path.join(projectRoot, 'apps', 'api', 'src', 'server.ts');
    const envFilePath = path.join(projectRoot, '.env');
    console.log(`Starting API server (dev): ${apiEntry}`);
    console.log(`Using .env: ${envFilePath}`);

    apiProcess = spawn('npx', ['tsx', apiEntry], {
      cwd: path.join(projectRoot, 'apps', 'api'),
      env: {
        ...process.env,
        NODE_ENV: 'development',
        PORT: String(API_PORT),
        ENV_FILE_PATH: envFilePath,
      },
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } else {
    // Production: run compiled API from resources
    const apiEntry = path.join(process.resourcesPath!, 'api', 'server.js');
    const apiCwd = path.join(process.resourcesPath!, 'api');

    // Ensure data directory exists in user data folder
    const userDataDir = app.getPath('userData');
    const dataDir = path.join(userDataDir, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    // Copy .env to userData if not present
    const envFile = path.join(userDataDir, '.env');
    if (!fs.existsSync(envFile)) {
      const exampleEnv = path.join(process.resourcesPath!, 'api', '.env.example');
      if (fs.existsSync(exampleEnv)) {
        fs.copyFileSync(exampleEnv, envFile);
      }
    }

    console.log(`Starting API server (prod): ${apiEntry}`);
    console.log(`Data dir: ${dataDir}`);
    console.log(`Using .env: ${envFile}`);

    apiProcess = spawn(process.execPath.replace('electron', 'node'), [apiEntry], {
      cwd: apiCwd,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(API_PORT),
        DATABASE_URL: path.join(dataDir, 'socialkeys.sqlite'),
        ENV_FILE_PATH: envFile,
        NODE_PATH: path.join(process.resourcesPath!, 'api-modules'),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  }

  if (apiProcess?.stdout) {
    apiProcess.stdout.on('data', (data: Buffer) => {
      console.log(`[API] ${data.toString().trim()}`);
    });
  }
  if (apiProcess?.stderr) {
    apiProcess.stderr.on('data', (data: Buffer) => {
      console.error(`[API ERR] ${data.toString().trim()}`);
    });
  }

  apiProcess?.on('exit', (code) => {
    console.log(`API server exited with code ${code}`);
    apiProcess = null;
  });

  // Wait for API to accept connections
  await waitForApi();
  console.log('API server is ready');
}

// ── Create Main Window ───────────────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'SocialKeys.ai',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    show: false,
    backgroundColor: '#f9fafb',
  });

  // Graceful show
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load the web UI
  if (IS_DEV) {
    mainWindow.loadURL(WEB_DEV_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'web-dist', 'index.html'));
  }

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://localhost')) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle OAuth callbacks — intercept navigation to /auth/callback/*
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Allow navigation within the app
    if (url.startsWith(WEB_DEV_URL) || url.startsWith(API_URL) || url.startsWith('file://')) {
      return;
    }
    // Allow OAuth provider pages
    if (url.includes('linkedin.com') || url.includes('facebook.com') ||
        url.includes('accounts.google.com') || url.includes('tiktok.com') ||
        url.includes('instagram.com') || url.includes('microsoft.com')) {
      return;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── App Lifecycle ────────────────────────────────────────────────
app.whenReady().then(async () => {
  try {
    await startApiServer();
    createMainWindow();
  } catch (err) {
    console.error('Failed to start:', err);
    dialog.showErrorBox(
      'Startup Error',
      `Failed to start SocialKeys:\n\n${(err as Error).message}\n\nPlease check the logs.`
    );
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Gracefully shut down the API server
  if (apiProcess && !apiProcess.killed) {
    console.log('Shutting down API server...');
    apiProcess.kill('SIGTERM');
    // Give it 3 seconds, then force kill
    setTimeout(() => {
      if (apiProcess && !apiProcess.killed) {
        apiProcess.kill('SIGKILL');
      }
    }, 3000);
  }
});
