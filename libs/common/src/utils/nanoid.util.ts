// ID generator
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateId(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }
  return result;
}

// Temporary password generator
const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const SPECIAL_CHARS = '@#$%&*';

export function generateTempPassword(): string {
  let password = 'Temp@';
  for (let i = 0; i < 8; i++) {
    password += PASSWORD_CHARS.charAt(Math.floor(Math.random() * PASSWORD_CHARS.length));
  }
  // Add a random special char and number for complexity
  password += SPECIAL_CHARS.charAt(Math.floor(Math.random() * SPECIAL_CHARS.length));
  password += Math.floor(Math.random() * 10);
  return password;
}