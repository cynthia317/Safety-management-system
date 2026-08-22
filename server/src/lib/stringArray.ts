/** SQLite has no native scalar list type, so `string[]` columns are stored as JSON text. */

export function encodeStringArray(values: string[]): string {
  return JSON.stringify(values);
}

export function decodeStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
