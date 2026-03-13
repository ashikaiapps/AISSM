import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { resolve } from 'path';

export const mediaRoutes = Router();

const UPLOAD_DIR = resolve(process.cwd(), 'data', 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB (videos can be large)

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: ${[...ALLOWED_TYPES].join(', ')}`));
    }
  },
});

export interface UploadedMedia {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
}

// Upload up to 10 files at once
mediaRoutes.post('/upload', upload.array('files', 10), (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const media: UploadedMedia[] = files.map((f) => ({
      id: path.basename(f.filename, path.extname(f.filename)),
      filename: f.filename,
      originalName: f.originalname,
      mimeType: f.mimetype,
      sizeBytes: f.size,
      url: `/api/v1/media/file/${f.filename}`,
    }));

    res.json({ media });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Serve uploaded files (for preview)
mediaRoutes.get('/file/:filename', (req, res) => {
  const { filename } = req.params;
  const safeName = path.basename(filename); // prevent path traversal
  const filePath = path.join(UPLOAD_DIR, safeName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.sendFile(filePath);
});

// Delete an uploaded file
mediaRoutes.delete('/:id', (req, res) => {
  const { id } = req.params;
  // Find the file by ID prefix
  const files = fs.readdirSync(UPLOAD_DIR);
  const match = files.find((f) => f.startsWith(id));

  if (!match) {
    return res.status(404).json({ error: 'File not found' });
  }

  fs.unlinkSync(path.join(UPLOAD_DIR, match));
  res.json({ deleted: true });
});

// Multer error handler
mediaRoutes.use((err: Error, _req: any, res: any, _next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large. Maximum size is 500MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err.message?.startsWith('Unsupported file type')) {
    return res.status(415).json({ error: err.message });
  }
  res.status(500).json({ error: 'Upload failed' });
});
