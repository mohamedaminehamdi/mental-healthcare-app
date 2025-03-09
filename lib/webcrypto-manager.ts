/**
 * WebCrypto API Integration for Client-Side Encryption
 * Provides secure encryption/decryption using native browser crypto APIs
 * IMPORTANT: Only use for sensitive client-side operations
 */

interface EncryptedData {
  ciphertext: string; // base64
  iv: string; // base64
  salt: string; // base64
  algorithm: string;
}

interface KeyDerivationResult {
  key: CryptoKey;
  salt: Uint8Array;
}

class WebCryptoManager {
  private static instance: WebCryptoManager;
  private readonly ALGORITHM = 'AES-GCM';
  private readonly KEY_SIZE = 256; // bits
  private readonly KEY_DERIVATION = 'PBKDF2';
  private readonly HASH = 'SHA-256';
  private readonly ITERATION_COUNT = 100000;

  private constructor() {
    if (typeof window === 'undefined') {
      throw new Error('WebCrypto is only available in the browser');
    }
  }

  static getInstance(): WebCryptoManager {
    if (!WebCryptoManager.instance) {
      WebCryptoManager.instance = new WebCryptoManager();
    }
    return WebCryptoManager.instance;
  }

  /**
   * Get the Web Crypto API interface
   */
  private getCrypto(): SubtleCrypto {
    if (!window.crypto?.subtle) {
      throw new Error('Web Crypto API is not available in this browser');
    }
    return window.crypto.subtle;
  }

  /**
   * Generate a random salt
   */
  private generateSalt(length: number = 16): Uint8Array {
    return window.crypto.getRandomValues(new Uint8Array(length));
  }

  /**
   * Generate a random IV (Initialization Vector)
   */
  private generateIV(): Uint8Array {
    return window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit for GCM
  }

  /**
   * Derive encryption key from password
   */
  async deriveKey(
    password: string,
    salt?: Uint8Array
  ): Promise<KeyDerivationResult> {
    const crypto = this.getCrypto();
    const encoder = new TextEncoder();
    const derivedSalt = salt || this.generateSalt();

    // Import password as key
    const passwordKey = await crypto.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Derive key using PBKDF2
    const key = await crypto.deriveKey(
      {
        name: this.KEY_DERIVATION,
        salt: derivedSalt,
        iterations: this.ITERATION_COUNT,
        hash: this.HASH,
      },
      passwordKey,
      {
        name: this.ALGORITHM,
        length: this.KEY_SIZE,
      },
      false,
      ['encrypt', 'decrypt']
    );

    return { key, salt: derivedSalt };
  }

  /**
   * Encrypt data with a password
   */
  async encryptWithPassword(
    plaintext: string,
    password: string
  ): Promise<EncryptedData> {
    const crypto = this.getCrypto();
    const encoder = new TextEncoder();

    // Derive encryption key
    const { key, salt } = await this.deriveKey(password);

    // Generate IV
    const iv = this.generateIV();

    // Encrypt data
    const ciphertext = await crypto.encrypt(
      {
        name: this.ALGORITHM,
        iv,
      },
      key,
      encoder.encode(plaintext)
    );

    return {
      ciphertext: this.arrayBufferToBase64(ciphertext),
      iv: this.arrayBufferToBase64(iv),
      salt: this.arrayBufferToBase64(salt),
      algorithm: this.ALGORITHM,
    };
  }

  /**
   * Decrypt data with a password
   */
  async decryptWithPassword(
    encrypted: EncryptedData,
    password: string
  ): Promise<string> {
    const crypto = this.getCrypto();
    const decoder = new TextDecoder();

    // Convert from base64
    const salt = this.base64ToArrayBuffer(encrypted.salt);
    const iv = this.base64ToArrayBuffer(encrypted.iv);
    const ciphertext = this.base64ToArrayBuffer(encrypted.ciphertext);

    // Derive key with same salt
    const { key } = await this.deriveKey(password, new Uint8Array(salt));

    // Decrypt data
    const plaintext = await crypto.decrypt(
      {
        name: this.ALGORITHM,
        iv: new Uint8Array(iv),
      },
      key,
      ciphertext
    );

    return decoder.decode(plaintext);
  }

  /**
   * Generate RSA key pair for asymmetric encryption
   */
  async generateRSAKeyPair(): Promise<CryptoKeyPair> {
    const crypto = this.getCrypto();

    return crypto.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true, // exportable
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Export public key
   */
  async exportPublicKey(publicKey: CryptoKey): Promise<JsonWebKey> {
    const crypto = this.getCrypto();
    return crypto.exportKey('jwk', publicKey);
  }

  /**
   * Export private key (use with caution)
   */
  async exportPrivateKey(privateKey: CryptoKey): Promise<JsonWebKey> {
    const crypto = this.getCrypto();
    return crypto.exportKey('jwk', privateKey);
  }

  /**
   * Import public key from JWK
   */
  async importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
    const crypto = this.getCrypto();

    return crypto.importKey(
      'jwk',
      jwk,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      false,
      ['encrypt']
    );
  }

  /**
   * Encrypt with public key (asymmetric)
   */
  async encryptWithPublicKey(
    plaintext: string,
    publicKey: CryptoKey
  ): Promise<string> {
    const crypto = this.getCrypto();
    const encoder = new TextEncoder();

    const ciphertext = await crypto.encrypt(
      { name: 'RSA-OAEP' },
      publicKey,
      encoder.encode(plaintext)
    );

    return this.arrayBufferToBase64(ciphertext);
  }

  /**
   * Decrypt with private key (asymmetric)
   */
  async decryptWithPrivateKey(
    ciphertext: string,
    privateKey: CryptoKey
  ): Promise<string> {
    const crypto = this.getCrypto();
    const decoder = new TextDecoder();

    const plaintext = await crypto.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      this.base64ToArrayBuffer(ciphertext)
    );

    return decoder.decode(plaintext);
  }

  /**
   * Generate HMAC signature
   */
  async generateHMAC(
    data: string,
    key: CryptoKey
  ): Promise<string> {
    const crypto = this.getCrypto();
    const encoder = new TextEncoder();

    const signature = await crypto.sign(
      { name: 'HMAC' },
      key,
      encoder.encode(data)
    );

    return this.arrayBufferToBase64(signature);
  }

  /**
   * Verify HMAC signature
   */
  async verifyHMAC(
    data: string,
    signature: string,
    key: CryptoKey
  ): Promise<boolean> {
    const crypto = this.getCrypto();
    const encoder = new TextEncoder();

    return crypto.verify(
      { name: 'HMAC' },
      key,
      this.base64ToArrayBuffer(signature),
      encoder.encode(data)
    );
  }

  /**
   * Generate SHA-256 digest
   */
  async generateDigest(data: string): Promise<string> {
    const crypto = this.getCrypto();
    const encoder = new TextEncoder();

    const digest = await crypto.digest(
      'SHA-256',
      encoder.encode(data)
    );

    return this.arrayBufferToBase64(digest);
  }

  /**
   * Generate secure random bytes
   */
  generateRandomBytes(length: number): Uint8Array {
    return window.crypto.getRandomValues(new Uint8Array(length));
  }

  /**
   * Generate random token (hex string)
   */
  generateRandomToken(length: number = 32): string {
    const bytes = this.generateRandomBytes(length);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';

    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary);
  }

  /**
   * Convert Base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes.buffer;
  }

  /**
   * Secure string clearing (overwrite with random data)
   */
  SecureStringClear(str: string | Uint8Array): void {
    if (typeof str === 'string') {
      // Strings are immutable in JavaScript, can't actually clear them
      // But we can encourage garbage collection by dereferencing
      console.warn('String clearing not possible in JavaScript');
    } else if (str instanceof Uint8Array) {
      // Fill with random data
      window.crypto.getRandomValues(str);
    }
  }

  /**
   * Check if WebCrypto is available
   */
  static isAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window.crypto?.subtle);
  }
}

export const webCrypto = WebCryptoManager.getInstance();
export type { EncryptedData, KeyDerivationResult };
