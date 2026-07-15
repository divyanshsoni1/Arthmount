"use client";

import { useCallback, useEffect, useState } from "react";
import Link        from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, Edit3, Loader2,
  Lock, Mail, Phone, Save, User, X,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver }         from "@hookform/resolvers/zod";
import { z }                   from "zod";

import { useUser }   from "@/api-client/user";
import {
  useProfile,
  useUpdateName,
  useSendEmailOtp,
  useVerifyEmailOtp,
  useSendPhoneOtp,
  useVerifyPhoneOtp,
  extractProfileError,
  extractProfileErrorCode,
} from "@/api-client/profile";

import { Button }       from "@/components/ui/button";
import { Input }        from "@/components/ui/input";
import {
  Field, FieldError, FieldGroup, FieldLabel,
} from "@/components/ui/field";
import OtpVerificationModal, {
  type OtpChannel,
} from "@/components/profile/OtpVerificationModal";
import { cn } from "@/lib/utils";

// ─── Phone normalisation ──────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
}

function displayPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  // Strip leading country code for display (91xxxxxxxxxx → xxxxxxxxxx)
  if (phone.startsWith("91") && phone.length === 12) return phone.slice(2);
  return phone;
}

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const nameSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long")
    .regex(
      /^[a-zA-Z\s'-]+$/,
      "Only letters, spaces, hyphens, and apostrophes allowed"
    ),
});
type NameValues = z.infer<typeof nameSchema>;

const emailSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .max(255, "Email is too long"),
});
type EmailValues = z.infer<typeof emailSchema>;

const phoneSchema = z.object({
  phone: z
    .string()
    .min(1, "Phone number is required")
    .transform((v) => normalizePhone(v))
    .refine((v) => /^\d{10}$/.test(v), "Enter a valid 10-digit Indian phone number"),
});
type PhoneValues = z.infer<typeof phoneSchema>;

// ─── Toast ────────────────────────────────────────────────────────────────────

interface Toast { id: number; message: string; kind: "success" | "error" }

function ToastBar({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-xs px-4 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg text-sm font-medium pointer-events-auto",
            "animate-in slide-in-from-bottom-4 fade-in duration-300",
            t.kind === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          )}
        >
          {t.kind === "success"
            ? <CheckCircle2 size={16} className="shrink-0" />
            : <X size={16} className="shrink-0" />
          }
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            className="shrink-0 opacity-70 hover:opacity-100"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Section card shell ───────────────────────────────────────────────────────

function EditCard({
  icon: Icon,
  title,
  sub,
  children,
}: {
  icon:     React.ElementType;
  title:    string;
  sub:      string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon size={18} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">{title}</p>
          <p className="text-xs text-slate-500">{sub}</p>
        </div>
      </div>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </div>
  );
}

// ─── Read-only field ──────────────────────────────────────────────────────────

function ReadOnlyField({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon:   React.ElementType;
  label:  string;
  value:  string;
  hint?:  string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm">
        <Icon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-slate-700 break-all">{value}</p>
        {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
      </div>
      <Lock size={13} className="mt-1 shrink-0 text-slate-300" />
    </div>
  );
}

// ─── Name section ─────────────────────────────────────────────────────────────

function NameSection({
  initialName,
  onSuccess,
  onError,
}: {
  initialName: string;
  onSuccess:   (msg: string) => void;
  onError:     (msg: string) => void;
}) {
  const mutation = useUpdateName();

  const form = useForm<NameValues>({
    resolver:      zodResolver(nameSchema),
    defaultValues: { name: initialName },
    mode:          "onChange",
  });

  const isDirty   = form.formState.isDirty;
  const isValid   = form.formState.isValid;
  const isPending = mutation.isPending;

  const onSubmit = async (values: NameValues) => {
    try {
      await mutation.mutateAsync(values.name);
      form.reset({ name: values.name });
      onSuccess("Name updated successfully.");
    } catch (err) {
      onError(extractProfileError(err));
    }
  };

  return (
    <EditCard
      icon={User}
      title="Full Name"
      sub="Your display name across the platform."
    >
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid ? "true" : undefined}>
                <FieldLabel htmlFor="edit-name">Full Name</FieldLabel>
                <Input
                  {...field}
                  id="edit-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Enter your full name"
                  disabled={isPending}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.error?.message && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Button
            type="submit"
            disabled={!isDirty || !isValid || isPending}
            className="w-full sm:w-auto"
          >
            {isPending
              ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
              : <><Save size={14} /> Save Name</>
            }
          </Button>
        </FieldGroup>
      </form>
    </EditCard>
  );
}

// ─── Email section ────────────────────────────────────────────────────────────

function EmailSection({
  currentEmail,
  onSuccess,
  onError,
}: {
  currentEmail: string | null;
  onSuccess:    (msg: string) => void;
  onError:      (msg: string) => void;
}) {
  const [otpOpen, setOtpOpen]     = useState(false);
  const [masked,  setMasked]      = useState("");
  const [pending, setPending]     = useState<string | null>(null);

  const sendMutation   = useSendEmailOtp();
  const verifyMutation = useVerifyEmailOtp();

  const form = useForm<EmailValues>({
    resolver:      zodResolver(emailSchema),
    defaultValues: { email: currentEmail ?? "" },
    mode:          "onChange",
  });

  const watchedEmail = form.watch("email");
  const isDirty      = watchedEmail.trim().toLowerCase() !== (currentEmail ?? "").toLowerCase();
  const isValid      = form.formState.isValid;
  const isSending    = sendMutation.isPending;

  const handleSendOtp = async (values: EmailValues) => {
    const email = values.email.trim().toLowerCase();
    if (email === currentEmail?.toLowerCase()) {
      form.setError("email", { message: "This is already your current email." });
      return;
    }
    try {
      const result = await sendMutation.mutateAsync(email);
      setPending(email);
      setMasked(result.maskedDestination);
      setOtpOpen(true);
    } catch (err) {
      const code = extractProfileErrorCode(err);
      const msg  = extractProfileError(err);
      if (code === "EMAIL_TAKEN") {
        form.setError("email", { message: msg });
      } else {
        onError(msg);
      }
    }
  };

  const handleVerify = async (code: string) => {
    try {
      await verifyMutation.mutateAsync(code);
    } catch (err) {
      // Bubble to OTP modal
      throw new Error(extractProfileError(err));
    }
  };

  const handleVerifySuccess = () => {
    setOtpOpen(false);
    form.reset({ email: pending ?? "" });
    onSuccess("Email address updated successfully.");
  };

  const handleResend = async () => {
    if (!pending) return;
    try {
      const result = await sendMutation.mutateAsync(pending);
      setMasked(result.maskedDestination);
    } catch (err) {
      throw new Error(extractProfileError(err));
    }
  };

  return (
    <>
      <EditCard
        icon={Mail}
        title="Email Address"
        sub="Changing your email requires OTP verification."
      >
        <form onSubmit={form.handleSubmit(handleSendOtp)} noValidate>
          <FieldGroup>
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid ? "true" : undefined}>
                  <FieldLabel htmlFor="edit-email">Email Address</FieldLabel>
                  <Input
                    {...field}
                    id="edit-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="Enter new email address"
                    disabled={isSending}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.error?.message && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-3.5 py-2.5">
              <Mail size={13} className="shrink-0 text-blue-500" />
              <p className="text-xs text-blue-700">
                A 6-digit OTP will be sent to the new email address to confirm the change.
              </p>
            </div>
            <Button
              type="submit"
              disabled={!isDirty || !isValid || isSending}
              className="w-full sm:w-auto"
            >
              {isSending
                ? <><Loader2 size={14} className="animate-spin" /> Sending OTP…</>
                : <><Mail size={14} /> Send Verification OTP</>
              }
            </Button>
          </FieldGroup>
        </form>
      </EditCard>

      <OtpVerificationModal
        isOpen={otpOpen}
        channel="email"
        maskedDestination={masked}
        onVerify={handleVerify}
        onResend={handleResend}
        onClose={() => {
          setOtpOpen(false);
          // if success already fired, form was reset; otherwise leave pending
          if (verifyMutation.isSuccess) handleVerifySuccess();
        }}
      />
    </>
  );
}

// ─── Phone section ────────────────────────────────────────────────────────────

function PhoneSection({
  currentPhone,
  onSuccess,
  onError,
}: {
  currentPhone: string | null;
  onSuccess:    (msg: string) => void;
  onError:      (msg: string) => void;
}) {
  const [otpOpen, setOtpOpen]     = useState(false);
  const [masked,  setMasked]      = useState("");
  const [pending, setPending]     = useState<string | null>(null);

  const sendMutation   = useSendPhoneOtp();
  const verifyMutation = useVerifyPhoneOtp();

  const form = useForm<PhoneValues>({
    resolver:      zodResolver(phoneSchema),
    defaultValues: { phone: displayPhone(currentPhone) },
    mode:          "onChange",
  });

  const watchedRaw  = form.watch("phone");
  const normalized  = normalizePhone(watchedRaw);
  const isDirty     = normalized !== (currentPhone ?? "");
  const isValid     = form.formState.isValid;
  const isSending   = sendMutation.isPending;

  const handleSendOtp = async (values: PhoneValues) => {
    const phone = values.phone; // already normalized by zod transform
    if (phone === currentPhone) {
      form.setError("phone", { message: "This is already your current phone number." });
      return;
    }
    try {
      const result = await sendMutation.mutateAsync(phone);
      setPending(phone);
      setMasked(result.maskedDestination);
      setOtpOpen(true);
    } catch (err) {
      const code = extractProfileErrorCode(err);
      const msg  = extractProfileError(err);
      if (code === "PHONE_TAKEN") {
        form.setError("phone", { message: msg });
      } else {
        onError(msg);
      }
    }
  };

  const handleVerify = async (code: string) => {
    try {
      await verifyMutation.mutateAsync(code);
    } catch (err) {
      throw new Error(extractProfileError(err));
    }
  };

  const handleVerifySuccess = () => {
    setOtpOpen(false);
    form.reset({ phone: pending ? displayPhone(pending) : "" });
    onSuccess("Phone number updated successfully.");
  };

  const handleResend = async () => {
    if (!pending) return;
    try {
      const result = await sendMutation.mutateAsync(pending);
      setMasked(result.maskedDestination);
    } catch (err) {
      throw new Error(extractProfileError(err));
    }
  };

  return (
    <>
      <EditCard
        icon={Phone}
        title="Phone Number"
        sub="Changing your phone requires WhatsApp OTP verification."
      >
        <form onSubmit={form.handleSubmit(handleSendOtp)} noValidate>
          <FieldGroup>
            <Controller
              name="phone"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid ? "true" : undefined}>
                  <FieldLabel htmlFor="edit-phone">Phone Number</FieldLabel>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500 select-none">
                      +91
                    </span>
                    <Input
                      {...field}
                      id="edit-phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      placeholder="Enter 10-digit phone number"
                      disabled={isSending}
                      aria-invalid={fieldState.invalid}
                      className="pl-11"
                    />
                  </div>
                  {fieldState.error?.message && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <div className="flex items-center gap-2 rounded-2xl border border-green-100 bg-green-50 px-3.5 py-2.5">
              <Phone size={13} className="shrink-0 text-green-600" />
              <p className="text-xs text-green-700">
                A 6-digit OTP will be sent via WhatsApp to verify this number.
              </p>
            </div>
            <Button
              type="submit"
              disabled={!isDirty || !isValid || isSending}
              className="w-full sm:w-auto"
            >
              {isSending
                ? <><Loader2 size={14} className="animate-spin" /> Sending OTP…</>
                : <><Phone size={14} /> Send WhatsApp OTP</>
              }
            </Button>
          </FieldGroup>
        </form>
      </EditCard>

      <OtpVerificationModal
        isOpen={otpOpen}
        channel="phone"
        maskedDestination={masked}
        onVerify={handleVerify}
        onResend={handleResend}
        onClose={() => {
          setOtpOpen(false);
          if (verifyMutation.isSuccess) handleVerifySuccess();
        }}
      />
    </>
  );
}

// ─── Page skeleton ────────────────────────────────────────────────────────────

function EditPageSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-slate-200 animate-pulse" />
        <div className="space-y-1.5">
          <div className="h-4 w-28 rounded bg-slate-200 animate-pulse" />
          <div className="h-3 w-36 rounded bg-slate-200 animate-pulse" />
        </div>
      </div>
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-36 rounded-3xl bg-slate-200 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditProfilePage() {
  const router                          = useRouter();
  const { user, isLoading: authLoading } = useUser();
  const { data, isLoading }             = useProfile();

  const [toasts, setToasts] = useState<Toast[]>([]);
  let toastId = 0;

  const addToast = useCallback((message: string, kind: "success" | "error") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, [toastId]);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?next=/dashboard/profile/edit");
    }
  }, [user, authLoading, router]);

  if (authLoading || (!data && isLoading)) return <EditPageSkeleton />;
  if (!user) return null;
  if (!data) return <EditPageSkeleton />;

  const { profile } = data;

  return (
    <>
      <div className="min-h-screen bg-slate-50 pb-24">

        {/* ── Top bar ── */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/profile"
              aria-label="Back to profile"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-none">Edit Profile</h1>
              <p className="text-xs text-slate-500 mt-0.5">Update your personal information</p>
            </div>
          </div>
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Edit3 size={13} />
            View Profile
          </Link>
        </div>

        {/* ── Content ── */}
        <div className="mx-auto max-w-2xl px-4 py-6 space-y-5">

          {/* Notice banner */}
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
            <Edit3 size={16} className="mt-0.5 shrink-0 text-primary" />
            <p className="text-sm text-slate-600 leading-relaxed">
              Name changes apply immediately.{" "}
              <span className="font-semibold text-slate-800">
                Email and phone changes require OTP verification
              </span>{" "}
              before they take effect.
            </p>
          </div>

          {/* Name */}
          <NameSection
            initialName={profile.name}
            onSuccess={(msg) => addToast(msg, "success")}
            onError={(msg) => addToast(msg, "error")}
          />

          {/* Email */}
          <EmailSection
            currentEmail={profile.email}
            onSuccess={(msg) => addToast(msg, "success")}
            onError={(msg) => addToast(msg, "error")}
          />

          {/* Phone */}
          <PhoneSection
            currentPhone={profile.phone}
            onSuccess={(msg) => addToast(msg, "success")}
            onError={(msg) => addToast(msg, "error")}
          />

          {/* Read-only fields */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                <Lock size={16} className="text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Read-Only Information</p>
                <p className="text-xs text-slate-500">These fields cannot be changed here.</p>
              </div>
            </div>
            <div className="px-5 py-5 sm:px-6 space-y-3">
              <ReadOnlyField
                icon={User}
                label="User ID"
                value={profile.id}
                hint="Unique account identifier"
              />
              <ReadOnlyField
                icon={Lock}
                label="Account Role"
                value={profile.role}
                hint="Managed by the platform"
              />
              <ReadOnlyField
                icon={Lock}
                label="KYC Status"
                value={profile.kycStatus.replace("_", " ")}
                hint="Managed through KYC verification flow"
              />
            </div>
          </div>

        </div>
      </div>

      <ToastBar toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
