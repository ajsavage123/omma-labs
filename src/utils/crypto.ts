/**
 * Generates a cryptographically secure random code in the format XXXX-XXXX
 */
export function generateSecureInviteCode(): string {
  const array = new Uint8Array(8);
  window.crypto.getRandomValues(array);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += chars[array[i] % chars.length];
    part2 += chars[array[i + 4] % chars.length];
  }
  return `${part1}-${part2}`;
}

/**
 * Generates a secure random token of a given length
 */
export function generateSecureToken(length: number = 8): string {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}
