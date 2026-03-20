import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const keyLength = 32;
const ivLength = 16;
const tagLength = 16;

export function generateKey(): string {
  return crypto.randomBytes(keyLength).toString('hex');
}

export function encrypt(text: string, key: string): { encrypted: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipher(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

export function decrypt(encryptedData: { encrypted: string; iv: string; tag: string }, key: string): string {
  const { encrypted, iv, tag } = encryptedData;
  const decipher = crypto.createDecipher(algorithm, key, Buffer.from(iv, 'hex'));
  
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, keyLength, 'sha256');
  return salt + ':' + hash.toString('hex');
}

export function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':');
  const hashVerify = crypto.pbkdf2Sync(password, salt, 100000, keyLength, 'sha256');
  return hashVerify.toString('hex') === hash;
}
