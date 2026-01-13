export class CryptoService {
  static async deriveKey(
    password: string,
    salt: Uint8Array,
  ): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey'],
    );
    // TODO: Migrate to Argon2id for better resistance against GPU/ASIC attacks.
    // Currently using PBKDF2-HMAC-SHA256 with OWASP recommended iterations (600,000) for 2024.
    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: 600000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  static async encrypt(
    text: string,
    password: string,
  ): Promise<{ ciphertext: string; salt: string; iv: string }> {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(password, salt);
    const enc = new TextEncoder();
    const encryptedContent = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      enc.encode(text) as BufferSource,
    );

    return {
      ciphertext: this.bufferToHex(new Uint8Array(encryptedContent)),
      salt: this.bufferToHex(salt),
      iv: this.bufferToHex(iv),
    };
  }

  static async decrypt(
    ciphertext: string,
    password: string,
    saltHex: string,
    ivHex: string,
  ): Promise<string> {
    const salt = this.hexToBuffer(saltHex);
    const iv = this.hexToBuffer(ivHex);
    const key = await this.deriveKey(password, salt);
    const encryptedData = this.hexToBuffer(ciphertext);
    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      encryptedData as BufferSource,
    );
    const dec = new TextDecoder();
    return dec.decode(decryptedContent);
  }

  private static bufferToHex(buffer: Uint8Array): string {
    return Array.from(buffer)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private static hexToBuffer(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  }
}
