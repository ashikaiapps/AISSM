import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';

export interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  previewUrl?: string;
}

interface MediaDropZoneProps {
  files: MediaFile[];
  onChange: (files: MediaFile[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isVideo(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

export function MediaDropZone({ files, onChange, maxFiles = 10, disabled }: MediaDropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(async (fileList: FileList | File[]) => {
    const toUpload = Array.from(fileList);
    const remaining = maxFiles - files.length;

    if (remaining <= 0) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const batch = toUpload.slice(0, remaining);
    if (batch.length < toUpload.length) {
      setError(`Only ${remaining} more file(s) can be added (max ${maxFiles})`);
    } else {
      setError(null);
    }

    setUploading(true);
    try {
      const formData = new FormData();
      batch.forEach((f) => formData.append('files', f));

      const res = await fetch('/api/v1/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(data.error || `Upload failed (${res.status})`);
      }

      const data = await res.json();
      const uploaded: MediaFile[] = (data.media || []).map((m: MediaFile) => ({
        ...m,
        previewUrl: isVideo(m.mimeType) ? undefined : m.url,
      }));

      onChange([...files, ...uploaded]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }, [files, maxFiles, onChange]);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }, [disabled, uploading, uploadFiles]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled && !uploading) setDragOver(true);
  }, [disabled, uploading]);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
      e.target.value = ''; // reset so same file can be re-selected
    }
  }, [uploadFiles]);

  const removeFile = useCallback(async (id: string) => {
    try {
      await fetch(`/api/v1/media/${id}`, { method: 'DELETE' });
    } catch {
      // ignore cleanup errors
    }
    onChange(files.filter((f) => f.id !== id));
  }, [files, onChange]);

  const reorder = useCallback((fromIdx: number, toIdx: number) => {
    const updated = [...files];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    onChange(updated);
  }, [files, onChange]);

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        className={`
          relative bg-white rounded-xl border-2 border-dashed transition-all cursor-pointer
          ${dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}
          ${files.length > 0 ? 'p-4' : 'p-8'}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading}
        />

        {files.length === 0 ? (
          <div className="text-center">
            <div className="text-4xl mb-2">📎</div>
            <p className="text-sm font-medium text-gray-700">
              Drag & drop images or videos here
            </p>
            <p className="text-xs text-gray-400 mt-1">
              or click to browse • JPEG, PNG, GIF, WebP, MP4, MOV, WebM • up to 500MB
            </p>
          </div>
        ) : (
          <>
            {/* Thumbnail grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {files.map((file, idx) => (
                <div
                  key={file.id}
                  className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', String(idx))}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
                    if (!isNaN(fromIdx) && fromIdx !== idx) reorder(fromIdx, idx);
                  }}
                >
                  {isVideo(file.mimeType) ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white">
                      <span className="text-2xl">🎬</span>
                      <span className="text-[10px] mt-1 px-1 truncate max-w-full">{file.originalName}</span>
                    </div>
                  ) : (
                    <img
                      src={file.url}
                      alt={file.originalName}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Overlay with remove button */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-start justify-end p-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(file.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-red-600 transition"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>

                  {/* File size badge */}
                  <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {formatSize(file.sizeBytes)}
                  </div>

                  {/* Order badge */}
                  <div className="absolute top-1 left-1 bg-indigo-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
                    {idx + 1}
                  </div>
                </div>
              ))}

              {/* Add more button */}
              {files.length < maxFiles && (
                <div
                  className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    inputRef.current?.click();
                  }}
                >
                  <span className="text-2xl">+</span>
                  <span className="text-[10px]">Add more</span>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-400 mt-2 text-center">
              {files.length} of {maxFiles} files • Drag thumbnails to reorder
            </p>
          </>
        )}

        {/* Upload spinner overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-xl">
            <div className="flex items-center gap-2 text-indigo-600">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <span className="text-sm font-medium">Uploading...</span>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
    </div>
  );
}
