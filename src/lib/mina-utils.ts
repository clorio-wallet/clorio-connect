import { mnemonicToSeed } from '@scure/bip39';
import { HDKey } from '@scure/bip32';

const MINA_PRIV_KEY_VERSION = 0x5a;

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE = BigInt(58);

function toBase58(bytes: Uint8Array): string {
  let x = BigInt(0);
  for (const byte of bytes) {
    x = x * BigInt(256) + BigInt(byte);
  }

  let result = '';
  while (x > 0n) {
    const remainder = Number(x % BASE);
    x = x / BASE;
    result = ALPHABET[remainder] + result;
  }

  // Leading zeros
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] !== 0) break;
    result = '1' + result;
  }

  return result;
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    data as unknown as BufferSource,
  );
  return new Uint8Array(hash);
}

async function toBase58Check(
  input: Uint8Array,
  versionByte: number,
): Promise<string> {
  const withVersion = new Uint8Array(input.length + 1);
  withVersion[0] = versionByte;
  withVersion.set(input, 1);

  const hash1 = await sha256(withVersion);
  const hash2 = await sha256(hash1);
  const checksum = hash2.slice(0, 4);

  const finalBytes = new Uint8Array(withVersion.length + 4);
  finalBytes.set(withVersion);
  finalBytes.set(checksum, withVersion.length);

  return toBase58(finalBytes);
}

export async function deriveMinaPrivateKey(mnemonic: string): Promise<string> {
  const seed = await mnemonicToSeed(mnemonic);

  const master = HDKey.fromMasterSeed(seed);
  const derived = master.derive("m/44'/12586'/0'/0/0");

  if (!derived.privateKey) {
    throw new Error('Could not derive private key');
  }

  const privKeyBytes = new Uint8Array(derived.privateKey);

  privKeyBytes[0] &= 0x3f;

  const privKeyLE = privKeyBytes.reverse();

  const withVersion = new Uint8Array(privKeyLE.length + 1);
  withVersion[0] = 1;
  withVersion.set(privKeyLE, 1);

  return toBase58Check(withVersion, MINA_PRIV_KEY_VERSION);
}
