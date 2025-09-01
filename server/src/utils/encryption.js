import crypto from 'crypto';

// Magic key untuk encryption
const MAGIC_KEY = "K0per@si#1312";

// Encryption utility functions
export const encryptionUtils = {
  // Encrypt data menggunakan AES-256-CBC
  encrypt: (text) => {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(MAGIC_KEY, 'salt', 32);
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipher(algorithm, key);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Gabungkan IV dan encrypted data
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      throw new Error('Encryption failed');
    }
  },

  // Decrypt data
  decrypt: (encryptedText) => {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(MAGIC_KEY, 'salt', 32);
      
      const textParts = encryptedText.split(':');
      const iv = Buffer.from(textParts.shift(), 'hex');
      const encrypted = textParts.join(':');
      
      const decipher = crypto.createDecipher(algorithm, key);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed');
    }
  },

  // Generate encrypted payload dengan timestamp untuk security
  generateEncryptedPayload: (uuid) => {
    const timestamp = Date.now();
    const payload = JSON.stringify({
      uuid: uuid,
      timestamp: timestamp,
      magic: MAGIC_KEY
    });
    
    return encryptionUtils.encrypt(payload);
  },

  // Validate encrypted payload
  validateEncryptedPayload: (encryptedPayload) => {
    try {
      const decrypted = encryptionUtils.decrypt(encryptedPayload);
      const payload = JSON.parse(decrypted);
      
      // Validasi magic key
      if (payload.magic !== MAGIC_KEY) {
        return { valid: false, error: 'Invalid magic key' };
      }
      
      // Validasi timestamp (max 5 menit)
      const now = Date.now();
      const maxAge = 5 * 60 * 1000; // 5 menit
      
      if (now - payload.timestamp > maxAge) {
        return { valid: false, error: 'Payload expired' };
      }
      
      return { 
        valid: true, 
        uuid: payload.uuid,
        timestamp: payload.timestamp 
      };
      
    } catch (error) {
      return { valid: false, error: 'Invalid payload format' };
    }
  }
};

export default encryptionUtils;