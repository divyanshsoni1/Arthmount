"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  User,
  Phone,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { AuthLayout } from "@/components/auth-layout";

import {
  signupNameSchema,     type SignupNameValues,
  signupPhoneSchema,    type SignupPhoneValues,
  signupOtpSchema,      type SignupOtpValues,
  signupPasswordSchema, type SignupPasswordValues,
  useSignupInit,
  useSignupSendOtp,
  useSignupVerifyOtp,
  useSignupComplete,
} from "@/api-client/auth";
import { getDashboardRoute } from "@/lib/routing";

// ─── Step metadata ────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Name",     icon: User        },
  { id: 2, label: "Phone",    icon: Phone       },
  { id: 3, label: "Verify",   icon: ShieldCheck },
  { id: 4, label: "Password", icon: Lock        },
] as const;

// ─── OTP digit input ──────────────────────────────────────────────────────────

interface OtpInputProps {
  value:    string;
  onChange: (val: string) => void;
  disabled: boolean;
  hasError: boolean;
}

function OtpBoxes({ value, onChange, disabled, hasError }: OtpInputProps) {
  const digits = value.padEnd(6, "").split("").slice(0, 6);
  const refs   = useRef<Array<HTMLInputElement | null>>([]);

  const handleChange = (i: number, raw: string) => {
    if (raw.length === 6 && /^\d{6}$/.test(raw)) {
      onChange(raw);
      refs.current[5]?.focus();
      return;
    }
    if (!/^\d?$/.test(raw)) return;
    const next = [...digits];
    next[i] = raw;
    onChange(next.join("").slice(0, 6));
    if (raw && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  return (
    <div className="flex gap-3 justify-between">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={digits[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          className={[
            "w-12 h-14 text-center text-xl font-bold rounded-xl border transition-all outline-none",
            "focus:border-primary focus:ring-2 focus:ring-primary/20",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            hasError ? "border-destructive ring-2 ring-destructive/20" : "border-gray-200",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

// ─── Countdown ────────────────────────────────────────────────────────────────

function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [left]);
  const reset = () => setLeft(seconds);
  const fmt   = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
  return { left, fmt, expired: left <= 0, reset };
}

// ─── Step progress bar ────────────────────────────────────────────────────────

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((s, idx) => {
        const done    = s.id < current;
        const active  = s.id === current;
        const Icon    = s.icon;
        return (
          <div key={s.id} className="flex items-center gap-2 flex-1 last:flex-none">
            <div className={[
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all",
              done   ? "bg-primary text-white"             : "",
              active ? "bg-primary text-white ring-4 ring-primary/20" : "",
              !done && !active ? "bg-gray-100 text-gray-400" : "",
            ].join(" ")}>
              {done ? <CheckCircle2 size={16} /> : <Icon size={15} />}
            </div>
            <span className={[
              "text-xs font-medium hidden sm:block",
              active ? "text-gray-900" : done ? "text-primary" : "text-gray-400",
            ].join(" ")}>
              {s.label}
            </span>
            {idx < STEPS.length - 1 && (
              <div className={[
                "flex-1 h-px transition-colors",
                done ? "bg-primary" : "bg-gray-200",
              ].join(" ")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const [step,        setStep]        = useState<1 | 2 | 3 | 4>(1);
  const [signupToken, setSignupToken] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [showPwd,     setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const countdown = useCountdown(5 * 60); // 300 seconds — matches OTP validity period

  // ── Step 1: name ──────────────────────────────────────────────────────────

  const nameForm = useForm<SignupNameValues>({
    resolver: zodResolver(signupNameSchema),
    defaultValues: { name: "" },
    mode: "onTouched",
  });

  const initMutation = useSignupInit(nameForm.setError, (data) => {
    setSignupToken(data.signupToken);
    setStep(2);
  });

  // ── Step 2: phone ─────────────────────────────────────────────────────────

  const phoneForm = useForm<SignupPhoneValues>({
    resolver: zodResolver(signupPhoneSchema),
    defaultValues: { phone: "" },
    mode: "onTouched",
  });

  const sendOtpMutation = useSignupSendOtp(phoneForm.setError, (data) => {
    setSignupToken(data.signupToken);
    setMaskedPhone(data.maskedPhone);
    countdown.reset();
    setStep(3);
  });

  // ── Step 3: OTP ───────────────────────────────────────────────────────────

  const otpForm = useForm<SignupOtpValues>({
    resolver: zodResolver(signupOtpSchema),
    defaultValues: { code: "" },
    mode: "onSubmit",
  });

  const verifyOtpMutation = useSignupVerifyOtp(otpForm.setError, (data) => {
    setSignupToken(data.signupToken);
    setStep(4);
  });

  // Auto-submit when 6 digits filled
  const otpCode = otpForm.watch("code");
  useEffect(() => {
    if (otpCode.length === 6) {
      otpForm.handleSubmit((v) =>
        verifyOtpMutation.mutateAsync({ signupToken, code: v.code })
      )();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpCode]);

  const resendOtp = () => {
    const phone = phoneForm.getValues("phone");
    if (phone) {
      sendOtpMutation.mutate({ signupToken, phone });
    }
  };

  // ── Step 4: password ──────────────────────────────────────────────────────

  const passwordForm = useForm<SignupPasswordValues>({
    resolver: zodResolver(signupPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onTouched",
  });

  const completeMutation = useSignupComplete(passwordForm.setError, (data) => {
    // Hard-navigate so the session cookie issued by /api/auth/signup/complete
    // is flushed before the proxy evaluates the next request.
    window.location.replace(getDashboardRoute(data.user.role));
  });

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AuthLayout>
      {/* Back button */}
      <Link
        href={step === 1 ? "/" : "#"}
        onClick={(e) => {
          if (step > 1) { e.preventDefault(); setStep((s) => (s - 1) as typeof step); }
        }}
        className="absolute top-6 left-6 lg:top-12 lg:left-12 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
        aria-label="Back"
      >
        <ArrowLeft className="text-gray-600" size={20} />
      </Link>

      <div className="max-w-md w-full mx-auto relative z-10">

        <StepBar current={step} />

        {/* ── Step 1: Name ── */}
        {step === 1 && (
          <>
            <div className="space-y-2 mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                What&apos;s your name?
              </h1>
              <p className="text-gray-500 font-medium">
                This will appear on your Arthmount account.
              </p>
            </div>

            <form onSubmit={nameForm.handleSubmit((v) => initMutation.mutate(v))} noValidate>
              <FieldGroup>
                <Controller
                  name="name"
                  control={nameForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid ? "true" : undefined}>
                      <FieldLabel htmlFor="name">Full name</FieldLabel>
                      <Input
                        {...field}
                        id="name"
                        placeholder="Rahul Verma"
                        autoComplete="name"
                        autoFocus
                        aria-invalid={fieldState.invalid}
                        disabled={initMutation.isPending}
                      />
                      {fieldState.error?.message?.trim() && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Button type="submit" className="w-full mt-2" disabled={initMutation.isPending}>
                  {initMutation.isPending
                    ? <><Loader2 size={16} className="animate-spin" /> Please wait…</>
                    : "Continue"
                  }
                </Button>
              </FieldGroup>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}

        {/* ── Step 2: Phone ── */}
        {step === 2 && (
          <>
            <div className="space-y-2 mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Your phone number
              </h1>
              <p className="text-gray-500 font-medium">
                We&apos;ll send a verification code to this number via WhatsApp.
              </p>
            </div>

            <form
              onSubmit={phoneForm.handleSubmit((v) =>
                sendOtpMutation.mutate({ signupToken, phone: v.phone })
              )}
              noValidate
            >
              <FieldGroup>
                <Controller
                  name="phone"
                  control={phoneForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid ? "true" : undefined}>
                      <FieldLabel htmlFor="phone">Phone number</FieldLabel>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500 select-none">
                          +91
                        </span>
                        <Input
                          {...field}
                          id="phone"
                          type="tel"
                          inputMode="numeric"
                          placeholder="98765 43210"
                          autoComplete="tel"
                          autoFocus
                          aria-invalid={fieldState.invalid}
                          disabled={sendOtpMutation.isPending}
                          className="pl-12"
                        />
                      </div>
                      {fieldState.error?.message?.trim() && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Button type="submit" className="w-full mt-2" disabled={sendOtpMutation.isPending}>
                  {sendOtpMutation.isPending
                    ? <><Loader2 size={16} className="animate-spin" /> Sending OTP…</>
                    : "Send OTP"
                  }
                </Button>
              </FieldGroup>
            </form>
          </>
        )}

        {/* ── Step 3: OTP ── */}
        {step === 3 && (
          <>
            <div className="space-y-2 mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Enter verification code
              </h1>
              <p className="text-gray-500 font-medium">
                We sent a 6-digit code to{" "}
                <span className="font-semibold text-gray-700">{maskedPhone}</span>{" "}
                via WhatsApp.
              </p>
            </div>

            <form
              onSubmit={otpForm.handleSubmit((v) =>
                verifyOtpMutation.mutateAsync({ signupToken, code: v.code })
              )}
              noValidate
            >
              <FieldGroup>
                <Field>
                  <Controller
                    name="code"
                    control={otpForm.control}
                    render={({ field, fieldState }) => (
                      <>
                        <OtpBoxes
                          value={field.value}
                          onChange={field.onChange}
                          disabled={verifyOtpMutation.isPending}
                          hasError={fieldState.invalid}
                        />
                        {fieldState.error?.message?.trim() && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </>
                    )}
                  />
                </Field>

                <Button
                  type="submit"
                  className="w-full mt-2"
                  disabled={verifyOtpMutation.isPending || otpCode.length < 6}
                >
                  {verifyOtpMutation.isPending
                    ? <><Loader2 size={16} className="animate-spin" /> Verifying…</>
                    : "Verify"
                  }
                </Button>
              </FieldGroup>
            </form>

            {/* Resend */}
            <div className="mt-6 text-center space-y-2">
              {!countdown.expired ? (
                <p className="text-sm text-gray-500">
                  Resend in{" "}
                  <span className="font-semibold tabular-nums text-gray-700">
                    {countdown.fmt}
                  </span>
                </p>
              ) : null}
              <button
                type="button"
                onClick={resendOtp}
                disabled={!countdown.expired || sendOtpMutation.isPending}
                className="text-sm font-medium text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sendOtpMutation.isPending ? "Resending…" : "Resend code"}
              </button>
            </div>
          </>
        )}

        {/* ── Step 4: Password ── */}
        {step === 4 && (
          <>
            <div className="space-y-2 mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Create a password
              </h1>
              <p className="text-gray-500 font-medium">
                Use at least 8 characters with one uppercase letter and one number.
              </p>
            </div>

            <form
              onSubmit={passwordForm.handleSubmit((v) =>
                completeMutation.mutate({ signupToken, password: v.password })
              )}
              noValidate
            >
              <FieldGroup>
                {/* Password */}
                <Controller
                  name="password"
                  control={passwordForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid ? "true" : undefined}>
                      <FieldLabel htmlFor="password">Password</FieldLabel>
                      <div className="relative">
                        <Input
                          {...field}
                          id="password"
                          type={showPwd ? "text" : "password"}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          autoFocus
                          aria-invalid={fieldState.invalid}
                          disabled={completeMutation.isPending}
                          className="pr-11"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPwd((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          aria-label={showPwd ? "Hide password" : "Show password"}
                          tabIndex={-1}
                        >
                          {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {fieldState.error?.message?.trim() && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                {/* Confirm password */}
                <Controller
                  name="confirmPassword"
                  control={passwordForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid ? "true" : undefined}>
                      <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
                      <div className="relative">
                        <Input
                          {...field}
                          id="confirmPassword"
                          type={showConfirm ? "text" : "password"}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          aria-invalid={fieldState.invalid}
                          disabled={completeMutation.isPending}
                          className="pr-11"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          aria-label={showConfirm ? "Hide password" : "Show password"}
                          tabIndex={-1}
                        >
                          {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {fieldState.error?.message?.trim() && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <Button type="submit" className="w-full mt-2" disabled={completeMutation.isPending}>
                  {completeMutation.isPending
                    ? <><Loader2 size={16} className="animate-spin" /> Creating account…</>
                    : "Create Account"
                  }
                </Button>
              </FieldGroup>
            </form>
          </>
        )}

      </div>
    </AuthLayout>
  );
}
