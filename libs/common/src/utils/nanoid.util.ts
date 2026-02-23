// ID generator
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateId(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }
  return result;
}