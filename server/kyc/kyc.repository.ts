import { prisma } from "@/lib/prisma";
import type { KycDocument, KycStatus } from "@/lib/generated/prisma/client";

// ─── Projection used everywhere in the KYC layer ─────────────────────────────

const KYC_SELECT = {
  id:               true,
  userId:           true,
  panNumber:        true,
  aadhaarNumber:    true,
  panFrontUrl:      true,
  panBackUrl:       true,
  aadhaarFrontUrl:  true,
  aadhaarBackUrl:   true,
  selfieUrl:        true,
  status:           true,
  rejectionReason:  true,
  verifiedAt:       true,
  rejectedAt:       true,
  createdAt:        true,
  updatedAt:        true,
} as const;

export type KycRecord = Pick<
  KycDocument,
  | "id"
  | "userId"
  | "panNumber"
  | "aadhaarNumber"
  | "panFrontUrl"
  | "panBackUrl"
  | "aadhaarFrontUrl"
  | "aadhaarBackUrl"
  | "selfieUrl"
  | "status"
  | "rejectionReason"
  | "verifiedAt"
  | "rejectedAt"
  | "createdAt"
  | "updatedAt"
>;

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function findKycByUserId(userId: string): Promise<KycRecord | null> {
  return prisma.kycDocument.findUnique({
    where:  { userId },
    select: KYC_SELECT,
  }) as Promise<KycRecord | null>;
}

// ─── Upsert identity fields (Step 1) ─────────────────────────────────────────

export async function upsertKycIdentity(
  userId:        string,
  aadhaarNumber: string,
  panNumber:     string
): Promise<KycRecord> {
  return prisma.kycDocument.upsert({
    where:  { userId },
    create: {
      userId,
      aadhaarNumber,
      panNumber,
      status:   "PENDING",
      provider: "MANUAL",
    },
    update: {
      aadhaarNumber,
      panNumber,
    },
    select: KYC_SELECT,
  }) as Promise<KycRecord>;
}

// ─── Update individual document URL fields (Step 2) ──────────────────────────

export async function updateAadhaarUrl(
  userId:         string,
  aadhaarFrontUrl: string
): Promise<void> {
  await prisma.kycDocument.update({
    where: { userId },
    data:  { aadhaarFrontUrl },
  });
}

export async function updatePanUrl(
  userId:      string,
  panFrontUrl: string
): Promise<void> {
  await prisma.kycDocument.update({
    where: { userId },
    data:  { panFrontUrl },
  });
}

// ─── Submit for review (Step 3) ───────────────────────────────────────────────

export async function submitKycForReview(userId: string): Promise<KycRecord> {
  return prisma.kycDocument.update({
    where: { userId },
    data:  { status: "IN_REVIEW" },
    select: KYC_SELECT,
  }) as Promise<KycRecord>;
}

// ─── Update status (admin use) ────────────────────────────────────────────────

export async function updateKycStatus(
  userId:          string,
  status:          KycStatus,
  rejectionReason?: string
): Promise<void> {
  await prisma.kycDocument.update({
    where: { userId },
    data: {
      status,
      rejectionReason: rejectionReason ?? null,
      verifiedAt:      status === "APPROVED" ? new Date() : undefined,
      rejectedAt:      status === "REJECTED" ? new Date() : undefined,
    },
  });
}

// ─── Upsert full KYC in one shot (new submit-full flow) ──────────────────────

export interface FullKycInput {
  aadhaarNumber:   string;
  panNumber:       string;
  aadhaarFrontUrl: string;
  aadhaarBackUrl:  string;
  panFrontUrl:     string;
  panBackUrl:      string;
  selfieUrl:       string;
}

export async function upsertFullKyc(
  userId: string,
  input:  FullKycInput
): Promise<KycRecord> {
  return prisma.kycDocument.upsert({
    where:  { userId },
    create: {
      userId,
      provider:        "MANUAL",
      aadhaarNumber:   input.aadhaarNumber,
      panNumber:       input.panNumber,
      aadhaarFrontUrl: input.aadhaarFrontUrl,
      aadhaarBackUrl:  input.aadhaarBackUrl,
      panFrontUrl:     input.panFrontUrl,
      selfieUrl:       input.selfieUrl,
      status:          "IN_REVIEW",
    },
    update: {
      aadhaarNumber:   input.aadhaarNumber,
      panNumber:       input.panNumber,
      aadhaarFrontUrl: input.aadhaarFrontUrl,
      aadhaarBackUrl:  input.aadhaarBackUrl,
      panFrontUrl:     input.panFrontUrl,
      selfieUrl:       input.selfieUrl,
      status:          "IN_REVIEW",
      rejectionReason: null,
    },
    select: KYC_SELECT,
  }) as Promise<KycRecord>;
}
