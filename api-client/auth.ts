import { apiClient } from "@/lib/client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { UseFormSetError } from "react-hook-form";
import { z } from "zod";
import { getDashboardRoute } from "@/lib/routing";

// ─── Phone normalisation ──────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
}

// ─── API response types ───────────────────────────────────────────────────────

interface ApiError {
  success: false;
  error: { message: string; code: string };
}

interface LoginResponseData {
  otpToken: string;
  channel: "email" | "phone";
  maskedDestination: string;
}

interface VerifyOtpResponseData {
  user: { id: string; role: string; name: string };
}

// ─── Zod schemas ──────────────────────────────────────────────────────────────

export const loginSchema = z
  .object({
    identifier: z
      .string()
      .min(1, "Email or phone is required")
      .refine(
        (value) => {
          const isEmail = value.includes("@");
          if (isEmail) return z.string().email().safeParse(value).success;
          return /^91\d{10}$/.test(normalizePhone(value));
        },
        { message: "Enter a valid email or 10-digit phone number" }
      )
      .transform((value) =>
        value.includes("@") ? value : normalizePhone(value)
      ),
    password: z.string().min(6, "Password must be at least 6 characters"),
  })
  .refine((data) => data.identifier.length > 0, {
    message: "Invalid credentials",
    path: ["identifier"],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;

export const verifyOtpSchema = z.object({
  otpToken: z.string().min(1),
  code: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d{6}$/, "OTP must be numeric"),
});

export type VerifyOtpFormValues = z.infer<typeof verifyOtpSchema>;

// ─── useLogin ─────────────────────────────────────────────────────────────────

export const useLogin = (
  setError: UseFormSetError<{ identifier: string; password: string }>,
  onSuccess: (data: LoginResponseData) => void
) => {
  return useMutation({
    mutationKey: ["user_login"],
    mutationFn: async (values: LoginFormValues) => {
      const response = await apiClient.post<{ success: true; data: LoginResponseData }>(
        "/auth/login",
        values
      );
      return response.data.data;
    },
    onSuccess,
    onError: (error: unknown) => {
      const msg = extractApiError(error);
      switch (msg.code) {
        case "USER_NOT_FOUND":
          setError("identifier", { message: msg.message });
          break;
        case "WRONG_PASSWORD":
          setError("password", { message: msg.message });
          break;
        case "ACCOUNT_FROZEN":
        case "ACCOUNT_DELETED":
          setError("identifier", { message: msg.message });
          break;
        case "OTP_RATE_LIMITED":
          setError("identifier", { message: msg.message });
          break;
        default:
          setError("identifier", { message: msg.message });
      }
    },
  });
};

// ─── useVerifyOtp ─────────────────────────────────────────────────────────────

export const useVerifyOtp = (
  setError: UseFormSetError<{ code: string }>,
  onSuccess?: (data: VerifyOtpResponseData) => void
) => {
  const router = useRouter();

  return useMutation({
    mutationKey: ["verify_otp"],
    mutationFn: async (values: VerifyOtpFormValues) => {
      const response = await apiClient.post<{ success: true; data: VerifyOtpResponseData }>(
        "/auth/verify-otp",
        values
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      onSuccess?.(data);
      // Route to the correct dashboard based on the authenticated user's role
      router.replace(getDashboardRoute(data.user.role));
    },
    onError: (error: unknown) => {
      const msg = extractApiError(error);
      switch (msg.code) {
        case "OTP_INVALID":
          setError("code", { message: "Incorrect OTP. Please try again." });
          break;
        case "OTP_EXPIRED":
          setError("code", { message: "OTP has expired. Please log in again." });
          break;
        case "OTP_LOCKED":
          setError("code", {
            message: "Too many incorrect attempts. Please log in again.",
          });
          break;
        case "OTP_TOKEN_EXPIRED":
          setError("code", { message: "Session expired. Please log in again." });
          break;
        default:
          setError("code", { message: msg.message });
      }
    },
  });
};

// ─── Error extraction helper ──────────────────────────────────────────────────

function extractApiError(error: unknown): { message: string; code: string } {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response
  ) {
    const data = (error.response as { data: ApiError }).data;
    if (data?.error) return data.error;
  }
  return { message: "Something went wrong. Please try again.", code: "UNKNOWN" };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNUP
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Response types ───────────────────────────────────────────────────────────

export interface SignupInitData       { signupToken: string }
export interface SignupSendOtpData    { signupToken: string; maskedPhone: string }
export interface SignupVerifyOtpData  { signupToken: string }
export interface SignupCompleteData   { user: { id: string; name: string; phone: string; role: string } }

// ─── Zod schemas ──────────────────────────────────────────────────────────────

export const signupNameSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long")
    .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens and apostrophes"),
});
export type SignupNameValues = z.infer<typeof signupNameSchema>;

export const signupPhoneSchema = z.object({
  phone: z
    .string()
    .min(1, "Phone number is required")
    .transform((v) => normalizePhone(v))
    .refine((v) => /^91\d{10}$/.test(v), "Enter a valid 10-digit Indian phone number"),
});
export type SignupPhoneValues = z.infer<typeof signupPhoneSchema>;

export const signupOtpSchema = z.object({
  code: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d{6}$/, "OTP must be numeric"),
});
export type SignupOtpValues = z.infer<typeof signupOtpSchema>;

export const signupPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type SignupPasswordValues = z.infer<typeof signupPasswordSchema>;

// ─── useSignupInit ────────────────────────────────────────────────────────────

export const useSignupInit = (
  setError: UseFormSetError<SignupNameValues>,
  onSuccess: (data: SignupInitData) => void
) =>
  useMutation({
    mutationKey: ["signup_init"],
    mutationFn: async (values: SignupNameValues) => {
      const res = await apiClient.post<{ success: true; data: SignupInitData }>(
        "/auth/signup/init",
        values
      );
      return res.data.data;
    },
    onSuccess,
    onError: (err: unknown) => {
      setError("name", { message: extractApiError(err).message });
    },
  });

// ─── useSignupSendOtp ─────────────────────────────────────────────────────────

export const useSignupSendOtp = (
  setError: UseFormSetError<SignupPhoneValues>,
  onSuccess: (data: SignupSendOtpData) => void
) =>
  useMutation({
    mutationKey: ["signup_send_otp"],
    mutationFn: async (payload: { signupToken: string } & SignupPhoneValues) => {
      const res = await apiClient.post<{ success: true; data: SignupSendOtpData }>(
        "/auth/signup/send-otp",
        payload
      );
      return res.data.data;
    },
    onSuccess,
    onError: (err: unknown) => {
      const msg = extractApiError(err);
      if (msg.code === "PHONE_TAKEN") {
        setError("phone", { message: "This phone number is already registered." });
      } else {
        setError("phone", { message: msg.message });
      }
    },
  });

// ─── useSignupVerifyOtp ───────────────────────────────────────────────────────

export const useSignupVerifyOtp = (
  setError: UseFormSetError<SignupOtpValues>,
  onSuccess: (data: SignupVerifyOtpData) => void
) =>
  useMutation({
    mutationKey: ["signup_verify_otp"],
    mutationFn: async (payload: { signupToken: string; code: string }) => {
      const res = await apiClient.post<{ success: true; data: SignupVerifyOtpData }>(
        "/auth/signup/verify-otp",
        payload
      );
      return res.data.data;
    },
    onSuccess,
    onError: (err: unknown) => {
      const msg = extractApiError(err);
      const fieldMsg: Record<string, string> = {
        OTP_INVALID:  "Incorrect OTP. Please try again.",
        OTP_EXPIRED:  "OTP has expired. Please request a new one.",
        OTP_LOCKED:   "Too many incorrect attempts. Please request a new OTP.",
        SESSION_EXPIRED: "Session expired. Please start again.",
      };
      setError("code", { message: fieldMsg[msg.code] ?? msg.message });
    },
  });

// ─── useSignupComplete ────────────────────────────────────────────────────────

export const useSignupComplete = (
  setError: UseFormSetError<SignupPasswordValues>,
  onSuccess: (data: SignupCompleteData) => void
) => {
  const router = useRouter();

  return useMutation({
    mutationKey: ["signup_complete"],
    mutationFn: async (payload: { signupToken: string; password: string }) => {
      const res = await apiClient.post<{ success: true; data: SignupCompleteData }>(
        "/auth/signup/complete",
        payload
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      onSuccess(data);
      // New signups are always USER role
      router.replace(getDashboardRoute(data.user.role));
    },
    onError: (err: unknown) => {
      const msg = extractApiError(err);
      if (msg.code === "PHONE_TAKEN") {
        setError("password", { message: "This number is already registered. Please log in." });
      } else {
        setError("password", { message: msg.message });
      }
    },
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Response types ───────────────────────────────────────────────────────────

export interface FpSendPhoneOtpData   { forgotToken: string; maskedPhone: string }
export interface FpVerifyPhoneOtpData { forgotToken: string; hasEmail: boolean; maskedEmail: string | null }
export interface FpSendEmailOtpData   { forgotToken: string; maskedEmail: string }
export interface FpVerifyEmailOtpData { forgotToken: string }
export interface FpResetPasswordData  { success: boolean }

// ─── Zod schemas ──────────────────────────────────────────────────────────────

export const fpPhoneSchema = z.object({
  phone: z
    .string()
    .min(1, "Phone number is required")
    .transform((v) => normalizePhone(v))
    .refine((v) => /^91\d{10}$/.test(v), "Enter a valid 10-digit Indian phone number"),
});
export type FpPhoneValues = z.infer<typeof fpPhoneSchema>;

export const fpOtpSchema = z.object({
  code: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d{6}$/, "OTP must be numeric"),
});
export type FpOtpValues = z.infer<typeof fpOtpSchema>;

export const fpPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type FpPasswordValues = z.infer<typeof fpPasswordSchema>;

// ─── useFpSendPhoneOtp ────────────────────────────────────────────────────────

export const useFpSendPhoneOtp = (
  setError: UseFormSetError<FpPhoneValues>,
  onSuccess: (data: FpSendPhoneOtpData) => void
) =>
  useMutation({
    mutationKey: ["fp_send_phone_otp"],
    mutationFn: async (values: FpPhoneValues) => {
      const res = await apiClient.post<{ success: true; data: FpSendPhoneOtpData }>(
        "/auth/forgot/send-phone-otp",
        values
      );
      return res.data.data;
    },
    onSuccess,
    onError: (err: unknown) => {
      const msg = extractApiError(err);
      setError("phone", { message: msg.message });
    },
  });

// ─── useFpVerifyPhoneOtp ──────────────────────────────────────────────────────

export const useFpVerifyPhoneOtp = (
  setError: UseFormSetError<FpOtpValues>,
  onSuccess: (data: FpVerifyPhoneOtpData) => void
) =>
  useMutation({
    mutationKey: ["fp_verify_phone_otp"],
    mutationFn: async (payload: { forgotToken: string; code: string }) => {
      const res = await apiClient.post<{ success: true; data: FpVerifyPhoneOtpData }>(
        "/auth/forgot/verify-phone-otp",
        payload
      );
      return res.data.data;
    },
    onSuccess,
    onError: (err: unknown) => {
      const msg = extractApiError(err);
      const map: Record<string, string> = {
        OTP_INVALID:     "Incorrect OTP. Please try again.",
        OTP_EXPIRED:     "OTP has expired. Please request a new one.",
        OTP_LOCKED:      "Too many attempts. Please request a new OTP.",
        SESSION_EXPIRED: "Session expired. Please start again.",
      };
      setError("code", { message: map[msg.code] ?? msg.message });
    },
  });

// ─── useFpSendEmailOtp ────────────────────────────────────────────────────────

export const useFpSendEmailOtp = (
  onSuccess: (data: FpSendEmailOtpData) => void,
  onError?: (msg: string) => void
) =>
  useMutation({
    mutationKey: ["fp_send_email_otp"],
    mutationFn: async (payload: { forgotToken: string }) => {
      const res = await apiClient.post<{ success: true; data: FpSendEmailOtpData }>(
        "/auth/forgot/send-email-otp",
        payload
      );
      return res.data.data;
    },
    onSuccess,
    onError: (err: unknown) => {
      onError?.(extractApiError(err).message);
    },
  });

// ─── useFpVerifyEmailOtp ──────────────────────────────────────────────────────

export const useFpVerifyEmailOtp = (
  setError: UseFormSetError<FpOtpValues>,
  onSuccess: (data: FpVerifyEmailOtpData) => void
) =>
  useMutation({
    mutationKey: ["fp_verify_email_otp"],
    mutationFn: async (payload: { forgotToken: string; code: string }) => {
      const res = await apiClient.post<{ success: true; data: FpVerifyEmailOtpData }>(
        "/auth/forgot/verify-email-otp",
        payload
      );
      return res.data.data;
    },
    onSuccess,
    onError: (err: unknown) => {
      const msg = extractApiError(err);
      const map: Record<string, string> = {
        OTP_INVALID:     "Incorrect OTP. Please try again.",
        OTP_EXPIRED:     "OTP has expired. Please request a new one.",
        OTP_LOCKED:      "Too many attempts. Please request a new OTP.",
        SESSION_EXPIRED: "Session expired. Please start again.",
      };
      setError("code", { message: map[msg.code] ?? msg.message });
    },
  });

// ─── useFpResetPassword ───────────────────────────────────────────────────────

export const useFpResetPassword = (
  setError: UseFormSetError<FpPasswordValues>,
  onSuccess: () => void
) => {
  const router = useRouter();
  return useMutation({
    mutationKey: ["fp_reset_password"],
    mutationFn: async (payload: { forgotToken: string; password: string }) => {
      const res = await apiClient.post<{ success: true; data: FpResetPasswordData }>(
        "/auth/forgot/reset-password",
        payload
      );
      return res.data.data;
    },
    onSuccess: () => {
      onSuccess();
      // After password reset, user is re-authenticated as USER role
      router.replace(getDashboardRoute("USER"));
    },
    onError: (err: unknown) => {
      setError("password", { message: extractApiError(err).message });
    },
  });
};
