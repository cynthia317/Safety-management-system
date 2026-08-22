import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { formatFileSize } from '../../lib/format';
import type { EvidenceUploadInput } from '../../lib/hazardTypes';

const MAX_FILES = 5;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

interface PendingEvidence extends EvidenceUploadInput {
  id: string;
}

interface EvidenceUploadProps {
  files: PendingEvidence[];
  onChange: (files: PendingEvidence[]) => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

export function EvidenceUpload({ files, onChange }: EvidenceUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const incoming = Array.from(fileList);
    const availableSlots = MAX_FILES - files.length;

    if (availableSlots <= 0) {
      setError(`You can attach up to ${MAX_FILES} photos.`);
      return;
    }

    const toProcess = incoming.slice(0, availableSlots);
    const rejected: string[] = [];
    const next: PendingEvidence[] = [];

    for (const file of toProcess) {
      if (!file.type.startsWith('image/')) {
        rejected.push(`${file.name} (not an image)`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        rejected.push(`${file.name} (larger than 5 MB)`);
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        next.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          dataUrl,
        });
      } catch {
        rejected.push(`${file.name} (could not be read)`);
      }
    }

    if (next.length > 0) onChange([...files, ...next]);
    if (rejected.length > 0) setError(`Skipped: ${rejected.join(', ')}`);
    if (incoming.length > availableSlots) {
      setError((prev) =>
        prev
          ? `${prev} Only ${MAX_FILES} photos can be attached.`
          : `Only ${MAX_FILES} photos can be attached.`,
      );
    }
  }

  function removeFile(id: string) {
    onChange(files.filter((f) => f.id !== id));
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={files.length >= MAX_FILES}
        className="flex w-full flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border px-4 py-6 text-center transition-colors hover:border-accent/50 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ImagePlus className="h-5 w-5 text-muted" strokeWidth={1.75} />
        <span className="text-sm text-body">Click to upload or drag and drop</span>
        <span className="text-xs text-muted">PNG or JPG, up to 5 MB each, max {MAX_FILES} photos</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {error && <p className="text-xs text-red-400">{error}</p>}

      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {files.map((file) => (
            <div key={file.id} className="group relative overflow-hidden rounded-md border border-border">
              <img src={file.dataUrl} alt={file.fileName} className="h-24 w-full object-cover" />
              <button
                type="button"
                onClick={() => removeFile(file.id)}
                title="Remove"
                aria-label={`Remove ${file.fileName}`}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-canvas/80 text-heading opacity-0 transition-opacity hover:bg-red-500/80 focus-visible:opacity-100 group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <p className="truncate bg-canvas-raised px-1.5 py-1 text-[11px] text-muted">
                {file.fileName} &middot; {formatFileSize(file.fileSize)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export type { PendingEvidence };
