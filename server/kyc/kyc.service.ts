/**
 * KYC Service — all business logic for the KYC document workflow.
 *
 * Responsibilities:
 *  1. getKycStatus      – return current KYC record (or null if not started)
 *  2. saveIdentity      – validate & persist Aadhaar + PAN numbers
 *  3. uploadDocument    – validate file, upload to MinIO, save URL in DB
 *  4. submitKyc         – final validation, move status to IN_REVIEW
 */

import { AuthError }           from "@/server/auth/auth.service";
import { uploadFile, validateFile, generateObjectKey } from "@/lib/storage/minio";
import {
  findKycByUserId,
  upsertKycIdentity,
  updateAadhaarUrl,
  updatePanUrl,
  submitKycForReview,
  type KycRecord,
} from "./kyc.repository";

// ─── Aadhaar validation ───────────────────────────────────────────────────────

function validateAadhaar(value: string): boolean {
  return /^\d{12}$/.test(value);
}

// ─── PAN validation ───────────────────────────────────────────────────────────

function validatePan(value: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value);
}

// ─── 1. Get KYC status ────────────────────────────────────────────────────────

export async function getKycStatus(userId: string): Promise<KycRecord | null> {
  return findKycByUserId(userId);
}

// ─── 2. Save identity details ─────────────────────────────────────────────────

export async function saveIdentity(
  userId:        string,
  aadhaarNumber: string,
  panNumber:     string
): Promise<KycRecord> {
  const aadhaar = aadhaarNumber.replace(/\s/g, "");
  const pan     = panNumber.toUpperCase().trim();

  if (!validateAadhaar(aadhaar)) {
    throw new AuthError("Aadhaar must be exactly 12 digits.", "INVALID_AADHAAR", 422);
  }
  if (!validatePan(pan)) {
    throw new AuthError("PAN must match the format ABCDE1234F.", "INVALID_PAN", 422);
  }

  // Prevent re-submission if already approved or under review
  const existing = await findKycByUserId(userId);
  if (existing?.status === "APPROVED") {
    throw new AuthError("KYC is already approved.", "KYC_ALREADY_APPROVED", 409);
  }
  if (existing?.status === "IN_REVIEW") {
    throw new AuthError(
      "KYC is currently under review. You cannot edit it now.",
      "KYC_UNDER_REVIEW",
      409
    );
  }

  return upsertKycIdentity(userId, aadhaar, pan);
}

// ─── 3. Upload a document ─────────────────────────────────────────────────────

export type DocType = "aadhaar" | "pan";

export interface UploadDocumentResult {
  url: string;
  key: string;
}

export async function uploadDocument(
  userId:   string,
  docType:  DocType,
  buffer:   Buffer,
  mimeType: string,
  filename: string,
  fileSize: number
): Promise<UploadDocumentResult> {
  // Guard: identity must be saved first
  const kyc = await findKycByUserId(userId);
  if (!kyc) {
    throw new AuthError(
      "Please complete Step 1 (identity details) before uploading documents.",
      "KYC_IDENTITY_MISSING",
      400
    );
  }
  if (kyc.status === "APPROVED") {
    throw new AuthError("KYC is already approved.", "KYC_ALREADY_APPROVED", 409);
  }

  // Validate file
  const validation = validateFile(mimeType, filename, fileSize);
  if (!validation.valid) {
    throw new AuthError(validation.error!, "INVALID_FILE", 422);
  }

  // Upload to MinIO
  const key    = generateObjectKey(userId, docType, filename);
  const result = await uploadFile(key, buffer, mimeType);

  // Persist URL in DB
  if (docType === "aadhaar") {
    await updateAadhaarUrl(userId, result.url);
  } else {
    await updatePanUrl(userId, result.url);
  }

  return result;
}

// ─── 4. Submit KYC for review ─────────────────────────────────────────────────

export async function submitKyc(userId: string): Promise<KycRecord> {
  const kyc = await findKycByUserId(userId);

  if (!kyc) {
    throw new AuthError("No KYC record found. Please complete all steps first.", "KYC_NOT_FOUND", 400);
  }
  if (!kyc.aadhaarNumber || !kyc.panNumber) {
    throw new AuthError("Identity details are incomplete.", "KYC_IDENTITY_MISSING", 400);
  }
  if (!kyc.aadhaarFrontUrl) {
    throw new AuthError("Aadhaar document upload is required.", "KYC_AADHAAR_MISSING", 400);
  }
  if (!kyc.panFrontUrl) {
    throw new AuthError("PAN document upload is required.", "KYC_PAN_MISSING", 400);
  }
  if (kyc.status === "APPROVED") {
    throw new AuthError("KYC is already approved.", "KYC_ALREADY_APPROVED", 409);
  }
  if (kyc.status === "IN_REVIEW") {
    throw new AuthError("KYC is already submitted and under review.", "KYC_UNDER_REVIEW", 409);
  }

  return submitKycForReview(userId);
}

// ─── submitKycFull ────────────────────────────────────────────────────────────
// Called by the new submit-full endpoint.
// Receives 6 file buffers + identity fields, uploads all to MinIO
// in parallel, then atomically writes the DB record.

import { upsertFullKyc } from "./kyc.repository";

export interface SubmitKycFullInput {
  aadhaarNumber:    string;
  panNumber:        string;
  aadhaarFront:     { buffer: Buffer; mimeType: string; filename: string; size: number };
  aadhaarBack:      { buffer: Buffer; mimeType: string; filename: string; size: number };
  panFront:         { buffer: Buffer; mimeType: string; filename: string; size: number };
  panBack:          { buffer: Buffer; mimeType: string; filename: string; size: number };
  selfie:           { buffer: Buffer; mimeType: string; filename: string; size: number };
}

export async function submitKycFull(
  userId: string,
  input:  SubmitKycFullInput
): Promise<KycRecord> {
  const aadhaar = input.aadhaarNumber.replace(/\s/g, "");
  const pan     = input.panNumber.toUpperCase().trim();

  if (!validateAadhaar(aadhaar)) {
    throw new AuthError("Aadhaar must be exactly 12 digits.", "INVALID_AADHAAR", 422);
  }
  if (!validatePan(pan)) {
    throw new AuthError("PAN must match the format ABCDE1234F.", "INVALID_PAN", 422);
  }

  const existing = await findKycByUserId(userId);
  if (existing?.status === "APPROVED") {
    throw new AuthError("KYC is already approved.", "KYC_ALREADY_APPROVED", 409);
  }
  if (existing?.status === "IN_REVIEW") {
    throw new AuthError("KYC is already submitted and under review.", "KYC_UNDER_REVIEW", 409);
  }

  // Validate all files
  const files = [
    { slot: "aadhaarFront", ...input.aadhaarFront },
    { slot: "aadhaarBack",  ...input.aadhaarBack  },
    { slot: "panFront",     ...input.panFront      },
    { slot: "panBack",      ...input.panBack       },
    { slot: "selfie",       ...input.selfie        },
  ] as const;

  for (const f of files) {
    const v = validateFile(f.mimeType, f.filename, f.size);
    if (!v.valid) throw new AuthError(`${f.slot}: ${v.error}`, "INVALID_FILE", 422);
  }

  // Upload all 5 files to MinIO in parallel
  const [aadhaarFrontRes, aadhaarBackRes, panFrontRes, panBackRes, selfieRes] =
    await Promise.all([
      uploadFile(generateObjectKey(userId, "aadhaar",       input.aadhaarFront.filename), input.aadhaarFront.buffer, input.aadhaarFront.mimeType),
      uploadFile(generateObjectKey(userId, "aadhaar_back",  input.aadhaarBack.filename),  input.aadhaarBack.buffer,  input.aadhaarBack.mimeType),
      uploadFile(generateObjectKey(userId, "pan",           input.panFront.filename),     input.panFront.buffer,     input.panFront.mimeType),
      uploadFile(generateObjectKey(userId, "pan_back",      input.panBack.filename),      input.panBack.buffer,      input.panBack.mimeType),
      uploadFile(generateObjectKey(userId, "selfie",        input.selfie.filename),       input.selfie.buffer,       input.selfie.mimeType),
    ]);

  return upsertFullKyc(userId, {
    aadhaarNumber:   aadhaar,
    panNumber:       pan,
    aadhaarFrontUrl: aadhaarFrontRes.url,
    aadhaarBackUrl:  aadhaarBackRes.url,
    panFrontUrl:     panFrontRes.url,
    panBackUrl:      panBackRes.url,
    selfieUrl:       selfieRes.url,
  });
}
