import { File as FileIcon, FileText, Image } from 'lucide-react';
import { EmptyState } from '../EmptyState';
import { formatDateTime, formatFileSize } from '../../lib/format';
import type { CorrectiveActionEvidenceItem } from '../../lib/correctiveActionTypes';

interface CorrectiveActionEvidenceGalleryProps {
  evidence: CorrectiveActionEvidenceItem[];
}

export function CorrectiveActionEvidenceGallery({ evidence }: CorrectiveActionEvidenceGalleryProps) {
  if (evidence.length === 0) {
    return (
      <EmptyState
        icon={Image}
        title="No evidence uploaded"
        description="Photos, PDFs, and documents attached to this corrective action will appear here."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {evidence.map((item) => (
        <a
          key={item.id}
          href={item.dataUrl}
          target="_blank"
          rel="noreferrer"
          className="group overflow-hidden rounded-md border border-border transition-colors hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          {item.mimeType.startsWith('image/') ? (
            <img src={item.dataUrl} alt={item.fileName} className="h-28 w-full object-cover" />
          ) : (
            <div className="flex h-28 w-full items-center justify-center bg-canvas-raised">
              {item.mimeType === 'application/pdf' ? (
                <FileText className="h-8 w-8 text-red-400" strokeWidth={1.5} />
              ) : (
                <FileIcon className="h-8 w-8 text-slate-300" strokeWidth={1.5} />
              )}
            </div>
          )}
          <div className="bg-canvas-raised px-2 py-1.5">
            <p className="truncate text-xs text-body">{item.fileName}</p>
            <p className="text-[11px] text-muted">
              {formatFileSize(item.fileSize)} &middot; {item.uploadedBy} &middot; {formatDateTime(item.uploadedAt)}
            </p>
          </div>
        </a>
      ))}
    </div>
  );
}
