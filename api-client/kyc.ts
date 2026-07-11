/**
 * Client-side KYC hooks built on TanStack Query.
 *
 * useKycStatus      – fetches GET /api/kyc
 * useSaveIdentity   – POST /api/kyc  (Step 1)
 * useUploadDocument – POST /api/kyc/upload  (Step 2, multipart)
 * useSubmitKyc      – POST /api/kyc/submit  (Step 3)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type KycStatus =
  | "PENDING"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "AUTO_APPROVED";

export interface KycRecord {
  id:              string;
  userId:          string;
  panNumber:       string | null;
  aadhaarNumber:   string | null;
  panFrontUrl:     string | null;
  aadhaarFrontUrl: string | null;
  status:          KycStatus;
  rejectionReason: string | null;
  createdAt:       string;
  updatedAt:       string;
}

interface ApiSuccess<T> { success: true; data: T }

// ─── Query key ────────────────────────────────────────────────────────────────

export const KYC_QUERY_KEY = ["kyc", "status"] as const;

// ─── useKycStatus ─────────────────────────────────────────────────────────────

export function useKycStatus() {
  return useQuery<KycRecord | null>({
    queryKey: KYC_QUERY_KEY,
    queryFn:  async () => {
      const res = await apiClient.get<ApiSuccess<{ kyc: KycRecord | null }>>("/kyc");
      return res.data.data.kyc;
    },
    staleTime: 60_000,
    retry:     false,
  });
}

// ─── useSaveIdentity ─────────────────────────────────────────────────────────

export interface IdentityPayload {
  aadhaarNumber: string;
  panNumber:     string;
}

export function useSaveIdentity() {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: ["kyc", "saveIdentity"],
    mutationFn:  async (payload: IdentityPayload) => {
      const res = await apiClient.post<ApiSuccess<{ kyc: KycRecord }>>("/kyc", payload);
      return res.data.data.kyc;
    },
    onSuccess: (kyc) => {
      qc.setQueryData(KYC_QUERY_KEY, kyc);
    },
  });
}

// ─── useUploadDocument ────────────────────────────────────────────────────────

export interface UploadPayload {
  docType: "aadhaar" | "pan";
  file:    File;
}

export interface UploadResult {
  url: string;
  key: string;
}

export function useUploadDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: ["kyc", "upload"],
    mutationFn:  async ({ docType, file }: UploadPayload): Promise<UploadResult> => {
      const form = new FormData();
      form.append("docType", docType);
      form.append("file", file);

      const res = await apiClient.post<ApiSuccess<UploadResult>>("/kyc/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data.data;
    },
    onSuccess: () => {
      // Invalidate so the status card reflects the new URL
      qc.invalidateQueries({ queryKey: KYC_QUERY_KEY });
    },
  });
}

// ─── useSubmitKyc ─────────────────────────────────────────────────────────────

export function useSubmitKyc() {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: ["kyc", "submit"],
    mutationFn:  async () => {
      const res = await apiClient.post<ApiSuccess<{ kyc: KycRecord }>>("/kyc/submit");
      return res.data.data.kyc;
    },
    onSuccess: (kyc) => {
      qc.setQueryData(KYC_QUERY_KEY, kyc);
    },
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function extractKycError(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response
  ) {
    const d = (error.response as { data: { error?: { message?: string } } }).data;
    if (d?.error?.message) return d.error.message;
  }
  return "Something went wrong. Please try again.";
}
