import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { gunzip, gzip } from "zlib";
import { promisify } from "util";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

const UPLOAD_URL_TTL_SEC = 300;

function bucket(): string {
  return process.env.PAYLOAD_S3_BUCKET?.trim() ?? "";
}

function payloadPrefix(): string {
  const raw = process.env.PAYLOAD_S3_PREFIX?.trim() || "fetch-payloads/";
  return raw.endsWith("/") ? raw : `${raw}/`;
}

export function isPayloadStorageConfigured(): boolean {
  return Boolean(
    bucket() &&
      process.env.PAYLOAD_S3_ACCESS_KEY_ID?.trim() &&
      process.env.PAYLOAD_S3_SECRET_ACCESS_KEY?.trim(),
  );
}

function s3Client(): S3Client {
  const endpoint = process.env.PAYLOAD_S3_ENDPOINT?.trim();
  return new S3Client({
    region: process.env.PAYLOAD_S3_REGION?.trim() || "ap-south-1",
    endpoint: endpoint || undefined,
    forcePathStyle: Boolean(endpoint),
    credentials: {
      accessKeyId: process.env.PAYLOAD_S3_ACCESS_KEY_ID!.trim(),
      secretAccessKey: process.env.PAYLOAD_S3_SECRET_ACCESS_KEY!.trim(),
    },
  });
}

export function buildPayloadObjectKey(taskId: string): string {
  return `${payloadPrefix()}${taskId}.html.gz`;
}

export async function createPayloadUploadUrl(
  taskId: string,
): Promise<{ url: string; key: string; expiresIn: number }> {
  if (!isPayloadStorageConfigured()) {
    throw new Error("Payload object storage is not configured.");
  }

  const key = buildPayloadObjectKey(taskId);
  const command = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: "application/gzip",
    Metadata: { task_id: taskId },
  });

  const url = await getSignedUrl(s3Client(), command, {
    expiresIn: UPLOAD_URL_TTL_SEC,
  });

  return { url, key, expiresIn: UPLOAD_URL_TTL_SEC };
}

export async function payloadObjectExists(key: string): Promise<boolean> {
  if (!isPayloadStorageConfigured()) return false;

  try {
    await s3Client().send(
      new HeadObjectCommand({ Bucket: bucket(), Key: key }),
    );
    return true;
  } catch {
    return false;
  }
}

export async function fetchPayloadHtml(key: string): Promise<string> {
  if (!isPayloadStorageConfigured()) {
    throw new Error("Payload object storage is not configured.");
  }

  const res = await s3Client().send(
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
  );
  const bytes = await res.Body?.transformToByteArray();
  if (!bytes?.length) {
    throw new Error("Empty payload object.");
  }

  const buf = Buffer.from(bytes);
  if (key.endsWith(".gz") || res.ContentType === "application/gzip") {
    const plain = await gunzipAsync(buf);
    return plain.toString("utf8");
  }
  return buf.toString("utf8");
}

export async function compressHtml(html: string): Promise<Buffer> {
  return gzipAsync(Buffer.from(html, "utf8"));
}

export async function deletePayloadObject(key: string): Promise<void> {
  if (!isPayloadStorageConfigured() || !key) return;

  await s3Client().send(
    new DeleteObjectCommand({ Bucket: bucket(), Key: key }),
  );
}
