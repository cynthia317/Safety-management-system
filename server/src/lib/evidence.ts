/**
 * Shared evidence validation for Hazard and Corrective Action file uploads. Evidence
 * arrives as a JSON `data:<mime>;base64,<payload>` string (no multipart upload path in
 * this codebase) — every field on the wire (fileName, fileSize, mimeType) is fully
 * client-controlled and must be treated as untrusted. This module is the single source
 * of truth for turning that untrusted input into a server-verified record: the actual
 * decoded byte length, an enforced MIME allow-list, and a best-effort file-signature
 * check — never the client's own claims about its own file.
 */

// Keeps the base64-encoded evidence array comfortably under Express's 50MB JSON body
// limit (see app.ts) regardless of how a module's own per-item maxBytes × maxItems adds
// up (e.g. Incidents/Corrective Actions allow 10 x 15MB = 150MB raw, well past transport) —
// 20MB decoded re-encodes to ~26.7MB of base64, leaving generous headroom for the rest of
// the request body and for base64's overhead itself.
export const MAX_AGGREGATE_EVIDENCE_BYTES = 20 * 1024 * 1024;

export interface EvidenceValidationOptions {
  maxItems: number;
  maxBytes: number;
  allowedMimeTypes: string[];
  /** Sum of decoded bytes across every accepted item. Keeps a multi-file evidence
   * submission well under Express's JSON body limit (which bounds the base64-encoded
   * request, ~4/3 the decoded size) instead of relying on per-item × maxItems, which can
   * legally add up to far more than the transport layer will ever accept. */
  maxTotalBytes?: number;
}

export interface ValidatedEvidenceItem {
  fileName: string;
  /** Always the server-recomputed decoded byte length — never the client-declared value. */
  fileSize: number;
  mimeType: string;
  dataUrl: string;
}

export interface EvidenceRejection {
  fileName?: string;
  reason: string;
}

export interface EvidenceValidationResult {
  items: ValidatedEvidenceItem[];
  rejections: EvidenceRejection[];
}

// Captures the declared media type and base64 payload separately so both can be checked
// independently against the client-supplied `mimeType` field and against the byte length.
const DATA_URL_PATTERN = /^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/]*={0,2})$/;
const BASE64_CHARSET = /^[A-Za-z0-9+/]*={0,2}$/;

function decodeBase64Strict(payload: string): Buffer | null {
  // `Buffer.from(str, 'base64')` silently ignores invalid characters instead of throwing,
  // so invalid base64 has to be rejected explicitly before decoding, not detected by it.
  if (payload.length === 0 || payload.length % 4 !== 0 || !BASE64_CHARSET.test(payload)) return null;
  return Buffer.from(payload, 'base64');
}

type SignatureCheck = (bytes: Buffer) => boolean;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const OLE2_SIGNATURE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

/**
 * Magic-byte signature checks, keyed by the (already allow-listed) MIME type. A type
 * with no entry here skips signature verification rather than being rejected — every
 * type this codebase currently allows has an entry, so in practice nothing is skipped;
 * an entry-less type only matters if a future allow-list addition doesn't add one too.
 */
const SIGNATURE_CHECKS: Record<string, SignatureCheck> = {
  'image/jpeg': (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.length >= 8 && b.subarray(0, 8).equals(PNG_SIGNATURE),
  'image/gif': (b) =>
    b.length >= 6 && (b.subarray(0, 6).toString('ascii') === 'GIF87a' || b.subarray(0, 6).toString('ascii') === 'GIF89a'),
  'image/webp': (b) => b.length >= 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
  // HEIC/HEIF are ISO-BMFF containers — this checks for the "ftyp" box at the standard
  // offset (a real structural signature) without parsing the full box hierarchy, which
  // would need a dedicated ISO-BMFF parsing library this project doesn't otherwise need.
  'image/heic': (b) => b.length >= 12 && b.subarray(4, 8).toString('ascii') === 'ftyp',
  'image/heif': (b) => b.length >= 12 && b.subarray(4, 8).toString('ascii') === 'ftyp',
  'application/pdf': (b) => b.length >= 5 && b.subarray(0, 5).toString('ascii') === '%PDF-',
  // Legacy .doc — OLE2 compound-file signature.
  'application/msword': (b) => b.length >= 8 && b.subarray(0, 8).equals(OLE2_SIGNATURE),
  // .docx is a ZIP container (PK\x03\x04) — this confirms "valid ZIP", which is necessary
  // but not sufficient to prove "specifically a .docx" (.xlsx/.pptx/any ZIP share the same
  // signature). Distinguishing them would mean inspecting the ZIP's internal entries
  // (e.g. `word/document.xml`), which needs a ZIP-parsing dependency this project doesn't
  // otherwise have — accepted trade-off: this still blocks anything that isn't a ZIP at
  // all (e.g. a script renamed to .docx), which is the attack this check is meant to catch.
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': (b) =>
    b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07),
};

function megabytes(bytes: number): string {
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}

/**
 * Validates a raw `evidence` array from a request body against the given module's limits
 * and allow-list. Every returned item's `fileSize` is the server-recomputed decoded byte
 * length — callers must persist that value, not any client-declared one. Individually
 * malformed entries are collected as `rejections` (with a client-safe reason) rather than
 * silently dropped, so callers can surface a real validation error instead of quietly
 * accepting fewer files than the client intended.
 */
export function validateEvidence(input: unknown, options: EvidenceValidationOptions): EvidenceValidationResult {
  const items: ValidatedEvidenceItem[] = [];
  const rejections: EvidenceRejection[] = [];
  let totalBytes = 0;

  if (input === undefined || input === null) return { items, rejections };
  if (!Array.isArray(input)) {
    rejections.push({ reason: 'Evidence must be a list of files.' });
    return { items, rejections };
  }

  for (const raw of input) {
    if (items.length >= options.maxItems) {
      rejections.push({ reason: `No more than ${options.maxItems} files may be attached.` });
      break;
    }

    if (typeof raw !== 'object' || raw === null) {
      rejections.push({ reason: 'Invalid evidence entry.' });
      continue;
    }
    const item = raw as Record<string, unknown>;
    const fileName = typeof item.fileName === 'string' ? item.fileName.trim() : '';
    if (!fileName) {
      rejections.push({ reason: 'Evidence file name is required.' });
      continue;
    }

    if (typeof item.dataUrl !== 'string' || item.dataUrl.length === 0) {
      rejections.push({ fileName, reason: 'Evidence payload is missing.' });
      continue;
    }
    const match = DATA_URL_PATTERN.exec(item.dataUrl);
    if (!match) {
      rejections.push({ fileName, reason: 'Evidence payload is not a valid data URL.' });
      continue;
    }
    // Both groups are mandatory (non-`?`) in DATA_URL_PATTERN, so a successful match guarantees them.
    const declaredMediaType = match[1]!;
    const base64Payload = match[2]!;

    const claimedMimeType = typeof item.mimeType === 'string' ? item.mimeType.trim().toLowerCase() : '';
    if (!claimedMimeType || claimedMimeType !== declaredMediaType.trim().toLowerCase()) {
      rejections.push({ fileName, reason: 'Declared file type does not match the evidence payload.' });
      continue;
    }
    if (!options.allowedMimeTypes.includes(claimedMimeType)) {
      rejections.push({ fileName, reason: `File type "${claimedMimeType}" is not allowed.` });
      continue;
    }

    const bytes = decodeBase64Strict(base64Payload);
    if (!bytes) {
      rejections.push({ fileName, reason: 'Evidence payload is not valid base64.' });
      continue;
    }
    if (bytes.length === 0) {
      rejections.push({ fileName, reason: 'Evidence file is empty.' });
      continue;
    }
    if (bytes.length > options.maxBytes) {
      rejections.push({ fileName, reason: `File exceeds the ${megabytes(options.maxBytes)} limit.` });
      continue;
    }
    if (options.maxTotalBytes !== undefined && totalBytes + bytes.length > options.maxTotalBytes) {
      rejections.push({ fileName, reason: `Adding this file would exceed the ${megabytes(options.maxTotalBytes)} total evidence limit.` });
      continue;
    }

    if (typeof item.fileSize !== 'number' || !Number.isFinite(item.fileSize)) {
      rejections.push({ fileName, reason: 'Declared file size is missing or invalid.' });
      continue;
    }
    if (item.fileSize !== bytes.length) {
      // Catches both a spoofed-small declaration hiding an oversized payload and a
      // spoofed-large declaration — the actual bytes are what's authoritative either way.
      rejections.push({ fileName, reason: 'Declared file size does not match the actual file.' });
      continue;
    }

    const signatureCheck = SIGNATURE_CHECKS[claimedMimeType];
    if (signatureCheck && !signatureCheck(bytes)) {
      rejections.push({ fileName, reason: 'File content does not match its declared type.' });
      continue;
    }

    totalBytes += bytes.length;
    items.push({ fileName, fileSize: bytes.length, mimeType: claimedMimeType, dataUrl: item.dataUrl });
  }

  return { items, rejections };
}
