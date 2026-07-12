/**
 * MinIO / S3-compatible object storage client.
 *
 * Credentials are read from environment variables — never exposed to the client.
 *
 * Env vars (add to .env):
 *   S3_ENDPOINT           e.g. https://storage.allyonogamebet.com
 *   AWS_ACCESS_KEY_ID     e.g. admin
 *   AWS_SECRET_ACCESS_KEY e.g. key
 *   AWS_REGION            e.g. ap-south-1
 *   AWS_S3_BUCKET         e.g. love
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { randomBytes } from "crypto";
import { extname } from "path";

// ─── Allowed MIME types ───────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// ─── S3 client singleton ──────────────────────────────────────────────────────

function createS3Client(): S3Client {
  const endpoint = process.env.S3_ENDPOINT;
  if (!endpoint) throw new Error("[Storage] Missing S3_ENDPOINT env variable");

  return new S3Client({
    endpoint,
    region: process.env.AWS_REGION ?? "ap-south-1",
    credentials: {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    // MinIO requires path-style addressing
    forcePathStyle: true,
  });
}

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (!_client) _client = createS3Client();
  return _client;
}

function getBucket(): string {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) throw new Error("[Storage] Missing AWS_S3_BUCKET env variable");
  return bucket;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(
  mimeType: string,
  filename: string,
  sizeBytes: number
): FileValidationResult {
  // Size check
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: "File size exceeds the 5 MB limit." };
  }

  // MIME type check
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return { valid: false, error: "File type not allowed. Use JPEG, PNG, WEBP or PDF." };
  }

  // Extension check (prevent double-extension attacks like "evil.php.jpg")
  const ext = extname(filename).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: "File extension not allowed." };
  }

  // Prevent executable-looking filenames
  const suspicious = /\.(php|exe|sh|bat|cmd|js|ts|py|rb|pl)$/i;
  if (suspicious.test(filename)) {
    return { valid: false, error: "Suspicious filename detected." };
  }

  return { valid: true };
}

// ─── Object key generation ────────────────────────────────────────────────────

/**
 * Generates a secure, unique object key.
 * Structure: kyc/{userId}/{docType}/{timestamp}-{random}.{ext}
 */
export function generateObjectKey(
  userId: string,
  docType: "aadhaar" | "pan" | "aadhaar_back" | "pan_back" | "selfie",
  originalFilename: string
): string {
  const ext       = extname(originalFilename).toLowerCase();
  const timestamp = Date.now();
  const random    = randomBytes(8).toString("hex");
  return `kyc/${userId}/${docType}/${timestamp}-${random}${ext}`;
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface UploadResult {
  key: string;
  url: string;
}

/**
 * Uploads a file buffer to MinIO.
 * Returns the object key (stored in DB) and the public URL.
 */
export async function uploadFile(
  key:      string,
  body:     Buffer,
  mimeType: string
): Promise<UploadResult> {
  const bucket = getBucket();

  const input: PutObjectCommandInput = {
    Bucket:      bucket,
    Key:         key,
    Body:        body,
    ContentType: mimeType,
    // Prevent caching of sensitive KYC documents
    CacheControl: "no-store, no-cache",
  };

  await getClient().send(new PutObjectCommand(input));

  const endpoint = process.env.S3_ENDPOINT!.replace(/\/$/, "");
  const url = `${endpoint}/${bucket}/${key}`;

  return { key, url };
}

/**
 * Deletes an object from MinIO by its key.
 * Fire-and-forget safe — errors are logged but not thrown.
 */
export async function deleteFile(key: string): Promise<void> {
  try {
    await getClient().send(
      new DeleteObjectCommand({ Bucket: getBucket(), Key: key })
    );
  } catch (err) {
    console.error("[Storage] Failed to delete object:", key, err);
  }
}
