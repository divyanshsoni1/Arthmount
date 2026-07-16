/**
 * Client-side KYC hooks built on TanStack Query.
 *
 * useKycStatus      – fetches GET /api/kyc
 * useSaveIdentity   – POST /api/kyc  (Step 1)
 * useUploadDocument – POST /api/kyc/upload  (Step 2, multipart)
 * useSubmitKyc      – POST /api/kyc/submit  (Step 3)
 * useSubmitFull     – POST /api/kyc/submit-full (single-shot: all files + identity)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosProgressEvent } from "axios";
import { apiClient } from "@/lib/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type KycStatus =
  | "PENDING"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "AUTO_APPROVED";

export interface KycRecord {
  id:               string;
  userId:           string;
  panNumber:        string | null;
  aadhaarNumber:    string | null;
  panFrontUrl:      string | null;
  panBackUrl:       string | null;
  aadhaarFrontUrl:  string | null;
  aadhaarBackUrl:   string | null;
  selfieUrl:        string | null;
  status:           KycStatus;
  rejectionReason:  string | null;
  verifiedAt:       string | null;
  rejectedAt:       string | null;
  createdAt:        string;
  updatedAt:        string;
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

// ─── useSubmitFull ────────────────────────────────────────────────────────────
// Sends all identity + document + selfie data in a single multipart request.
// Supports upload progress tracking via onProgress callback.

export interface SubmitFullPayload {
  aadhaarNumber: string;
  panNumber:     string;
  aadhaarFront:  File;
  aadhaarBack:   File;
  panFront:      File;
  panBack:       File;
  selfie:        File;
  /** Optional callback receiving 0–100 upload progress */
  onProgress?:   (pct: number) => void;
}

export function useSubmitFull() {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: ["kyc", "submitFull"],
    mutationFn:  async ({
      aadhaarNumber,
      panNumber,
      aadhaarFront,
      aadhaarBack,
      panFront,
      panBack,
      selfie,
      onProgress,
    }: SubmitFullPayload): Promise<KycRecord> => {
      const form = new FormData();
      form.append("aadhaarNumber", aadhaarNumber);
      form.append("panNumber",     panNumber);
      form.append("aadhaarFront",  aadhaarFront);
      form.append("aadhaarBack",   aadhaarBack);
      form.append("panFront",      panFront);
      form.append("panBack",       panBack);
      form.append("selfie",        selfie);

      const res = await apiClient.post<ApiSuccess<{ kyc: KycRecord }>>(
        "/kyc/submit-full",
        form,
        {
          onUploadProgress: (evt: AxiosProgressEvent) => {
            if (onProgress && evt.total && evt.total > 0) {
              onProgress(Math.round((evt.loaded / evt.total) * 100));
            }
          },
        }
      );
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

// ─── useKycSignedImages ───────────────────────────────────────────────────────
// Fetches temporary pre-signed URLs for the current user's KYC documents.
// Used by step5-status to display document thumbnails without exposing the
// raw internal storage URL, which may not be publicly reachable.

export interface KycSignedImages {
  aadhaarFrontUrl: string | null;
  aadhaarBackUrl:  string | null;
  panFrontUrl:     string | null;
  panBackUrl:      string | null;
  selfieUrl:       string | null;
}

export const KYC_SIGNED_IMAGES_KEY = ["kyc", "signed-images"] as const;

export function useKycSignedImages(enabled = true) {
  return useQuery<KycSignedImages | null>({
    queryKey: KYC_SIGNED_IMAGES_KEY,
    queryFn:  async () => {
      const res = await apiClient.get<ApiSuccess<{ images: KycSignedImages | null }>>(
        "/kyc/signed-images"
      );
      return res.data.data.images;
    },
    enabled,
    // Signed URLs expire in 60 min; refetch at 55 min to stay fresh
    staleTime: 55 * 60 * 1000,
    retry:     false,
  });
}
