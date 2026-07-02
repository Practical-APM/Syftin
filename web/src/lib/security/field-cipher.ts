import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(`syftin-field:${secret}`).digest();
}

export function encryptField(plaintext: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptField(blob: string, secret: string): string {
  const [ivB64, tagB64, dataB64] = blob.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted field");
  }
  const key = deriveKey(secret);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function getFieldCipherSecret(): string | null {
  const secret = process.env.INTERNAL_DELIVERY_SECRET?.trim();
  return secret || null;
}
