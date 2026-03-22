export function generateId(prefix?: string): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const id = Array.from(crypto.getRandomValues(new Uint8Array(20)))
    .map((b) => chars[b % chars.length])
    .join('');
  return prefix ? `${prefix}_${id}` : id;
}
