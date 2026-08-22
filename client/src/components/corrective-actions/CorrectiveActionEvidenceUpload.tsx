import { useRef, useState } from 'react';
import { File as FileIcon, FileText, ImagePlus, X } from 'lucide-react';
import { formatFileSize } from '../../lib/format';
import type { EvidenceInput } from '../../lib/correctiveActionTypes';

const MAX_FILES = 10;
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument'];

interface PendingEvidence extends EvidenceInput {
  id: string;
}

interface CorrectiveActionEvidenceUploadProps {
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

function isAcceptedType(mimeType: string): boolean {
  return ACCEPTED_TYPES.some((prefix) => mimeType.startsWith(prefix));
}

export function CorrectiveActionEvidenceUpload({ files, onChange }: CorrectiveActionEvidenceUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const incoming = Array.from(fileList);
    const availableSlots = MAX_FILES - files.length;

    if (availableSlots <= 0) {
      setError(`You can attach up to ${MAX_FILES} files.`);
      return;
    }

    const toProcess = incoming.slice(0, availableSlots);
    const rejected: string[] = [];
    const next: PendingEvidence[] = [];

    for (const file of toProcess) {
      if (!isAcceptedType(file.type)) {
        rejected.push(`${file.name} (unsupported type)`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        rejected.push(`${file.name} (larger than 15 MB)`);
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        next.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          dataUrl,
        });
      } catch {
        rejected.push(`${file.name} (could not be read)`);
      }
    }

    if (next.length > 0) onChange([...files, ...next]);
    if (rejected.length > 0) setError(`Skipped: ${rejected.join(', ')}`);
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
        <span className="text-xs text-muted">Photos, PDFs, or documents, up to 15 MB each, max {MAX_FILES} files</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf,.doc,.docx"
        multiple
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {error && <p className="text-xs text-red-400">{error}</p>}

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file) => (
            <li key={file.id} className="flex items-center gap-2 rounded-md border border-border bg-canvas-raised px-3 py-2">
              {file.mimeType.startsWith('image/') ? (
                <img src={file.dataUrl} alt={file.fileName} className="h-9 w-9 shrink-0 rounded object-cover" />
              ) : file.mimeType === 'application/pdf' ? (
                <FileText className="h-9 w-9 shrink-0 rounded bg-red-500/10 p-1.5 text-red-400" strokeWidth={1.75} />
              ) : (
                <FileIcon className="h-9 w-9 shrink-0 rounded bg-slate-500/10 p-1.5 text-slate-300" strokeWidth={1.75} />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-body">{file.fileName}</p>
                <p className="text-[11px] text-muted">{formatFileSize(file.fileSize)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(file.id)}
                title="Remove"
                aria-label={`Remove ${file.fileName}`}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted hover:bg-red-500/10 hover:text-red-400"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export type { PendingEvidence };
