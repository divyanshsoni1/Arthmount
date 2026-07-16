/**
 * Client-side profile hooks built on TanStack Query v5.
 *
 * useProfile          — fetches GET /api/user/profile (profile + stats)
 * useUpdateName       — PATCH /api/user/profile  (name only, no OTP)
 * useSendEmailOtp     — POST  /api/user/profile/send-email-otp
 * useVerifyEmailOtp   — POST  /api/user/profile/verify-email-otp → invalidates profile
 * useSendPhoneOtp     — POST  /api/user/profile/send-phone-otp
 * useVerifyPhoneOtp   — POST  /api/user/profile/verify-phone-otp → invalidates profile
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProfileData {
  id:                string;
  name:              string;
  email:             string | null;
  phone:             string | null;
  role:              string;
  kycStatus:         string;
  kycVerified:       boolean;
  isFrozen:          boolean;
  twoFactorEnabled:  boolean;
  mainBalance:       string;
  investedBalance:   string;
  commissionBalance: string;
  createdAt:         string;
  lastLoginAt:       string | null;
  dob:               string | null;
  gender:            string | null;
  maritalStatus:     string | null;
}

export interface ProfileStats {
  totalInvestments:     number;
  activeInvestments:    number;
  completedInvestments: number;
  totalInvested:        number;
  totalProfit:          number;
  pendingReturns:       number;
  roi:                  string;
  totalDeposited:       number;
  totalWithdrawn:       number;
}

export interface FullProfileResponse {
  profile: ProfileData;
  stats:   ProfileStats;
}

interface ApiSuccess<T> { success: true; data: T }

// ─── Query key ────────────────────────────────────────────────────────────────

export const PROFILE_QUERY_KEY = ["user", "profile"] as const;

// ─── useProfile ───────────────────────────────────────────────────────────────

export function useProfile() {
  return useQuery<FullProfileResponse>({
    queryKey: PROFILE_QUERY_KEY,
    queryFn:  async () => {
      const res = await apiClient.get<ApiSuccess<FullProfileResponse>>(
        "/user/profile"
      );
      return res.data.data;
    },
    staleTime:            30_000,
    refetchOnWindowFocus: true,
    retry:                false,
  });
}

// ─── useUpdateName ────────────────────────────────────────────────────────────

export function useUpdateName() {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: ["profile", "updateName"],
    mutationFn:  async (name: string) => {
      const res = await apiClient.patch<ApiSuccess<{ message: string }>>(
        "/user/profile",
        { name }
      );
      return res.data.data;
    },
    onSuccess: () => {
      // Invalidate so the view page and navbar both re-fetch
      qc.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}

// ─── useUpdatePersonalInfo ────────────────────────────────────────────────────

export interface PersonalInfoPayload {
  dob?:           string | null;
  gender?:        string | null;
  maritalStatus?: string | null;
}

export function useUpdatePersonalInfo() {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: ["profile", "updatePersonalInfo"],
    mutationFn:  async (payload: PersonalInfoPayload) => {
      const res = await apiClient.patch<ApiSuccess<{ message: string }>>(
        "/user/profile/personal-info",
        payload
      );
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}

// ─── useSendEmailOtp ──────────────────────────────────────────────────────────

export interface SendOtpResult {
  maskedDestination: string;
}

export function useSendEmailOtp() {
  return useMutation({
    mutationKey: ["profile", "sendEmailOtp"],
    mutationFn:  async (email: string): Promise<SendOtpResult> => {
      const res = await apiClient.post<ApiSuccess<SendOtpResult>>(
        "/user/profile/send-email-otp",
        { email }
      );
      return res.data.data;
    },
  });
}

// ─── useVerifyEmailOtp ────────────────────────────────────────────────────────

export function useVerifyEmailOtp() {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: ["profile", "verifyEmailOtp"],
    mutationFn:  async (code: string): Promise<{ message: string }> => {
      const res = await apiClient.post<ApiSuccess<{ message: string }>>(
        "/user/profile/verify-email-otp",
        { code }
      );
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}

// ─── useSendPhoneOtp ──────────────────────────────────────────────────────────

export function useSendPhoneOtp() {
  return useMutation({
    mutationKey: ["profile", "sendPhoneOtp"],
    mutationFn:  async (phone: string): Promise<SendOtpResult> => {
      const res = await apiClient.post<ApiSuccess<SendOtpResult>>(
        "/user/profile/send-phone-otp",
        { phone }
      );
      return res.data.data;
    },
  });
}

// ─── useVerifyPhoneOtp ────────────────────────────────────────────────────────

export function useVerifyPhoneOtp() {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: ["profile", "verifyPhoneOtp"],
    mutationFn:  async (code: string): Promise<{ message: string }> => {
      const res = await apiClient.post<ApiSuccess<{ message: string }>>(
        "/user/profile/verify-phone-otp",
        { code }
      );
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}

// ─── Error extraction helper ──────────────────────────────────────────────────

export function extractProfileError(error: unknown): string {
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

export function extractProfileErrorCode(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response
  ) {
    const d = (error.response as { data: { error?: { code?: string } } }).data;
    if (d?.error?.code) return d.error.code;
  }
  return "UNKNOWN";
}

// ─── Format helpers ───────────────────────────────────────────────────────────

export function formatINR(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-IN", {
    style:                 "currency",
    currency:              "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(isNaN(num) ? 0 : num);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day:   "2-digit",
    month: "short",
    year:  "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day:    "2-digit",
    month:  "short",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
