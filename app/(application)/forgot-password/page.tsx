"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, Eye, EyeOff,
  Loader2, Lock, Mail, Phone, ShieldCheck,
} from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { AuthLayout } from "@/components/auth-layout";

import {
  fpPhoneSchema,    type FpPhoneValues,
  fpOtpSchema,      type FpOtpValues,
  fpPasswordSchema, type FpPasswordValues,
  useFpSendPhoneOtp,
  useFpVerifyPhoneOtp,
  useFpSendEmailOtp,
  useFpVerifyEmailOtp,
  useFpResetPassword,
} from "@/api-client/auth";
import { getDashboardRoute } from "@/lib/routing";

// ─── Steps ───────────────────────────────────────────────────────────────────

// Steps: 1=phone, 2=phone-otp, 3=email-otp (conditional), 4=new-password
type Step = 1 | 2 | 3 | 4;

const STEP_META: { id: Step; label: string; icon: React.ElementType }[] = [
  { id: 1, label: "Phone",    icon: Phone       },
  { id: 2, label: "Verify",   icon: ShieldCheck },
  { id: 3, label: "Email",    icon: Mail        },
  { id: 4, label: "Password", icon: Lock        },
];

function StepBar({ current, hasEmail }: { current: Step; hasEmail: boolean }) {
  const steps = hasEmail ? STEP_META : STEP_META.filter((s) => s.id !== 3);

  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, idx) => {
        const done   = current > s.id;
        const active = current === s.id;
        const Icon   = s.icon;
        return (
          <div key={s.id} className="flex items-center gap-2 flex-1 last:flex-none">
            <div className={[
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all",
              done   ? "bg-primary text-white"                         : "",
              active ? "bg-primary text-white ring-4 ring-primary/20" : "",
              !done && !active ? "bg-gray-100 text-gray-400"          : "",
            ].join(" ")}>
              {done ? <CheckCircle2 size={16} /> : <Icon size={15} />}
            </div>
            <span className={[
              "text-xs font-medium hidden sm:block",
              active ? "text-gray-900" : done ? "text-primary" : "text-gray-400",
            ].join(" ")}>
              {s.label}
            </span>
            {idx < steps.length - 1 && (
              <div className={["flex-1 h-px transition-colors", done ? "bg-primary" : "bg-gray-200"].join(" ")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── OTP boxes ────────────────────────────────────────────────────────────────

interface OtpBoxesProps { value: string; onChange: (v: string) => void; disabled: boolean; hasError: boolean }

function OtpBoxes({ value, onChange, disabled, hasError }: OtpBoxesProps) {
  const digits = value.padEnd(6, "").split("").slice(0, 6);
  const refs   = useRef<Array<HTMLInputElement | null>>([]);

  const handle = (i: number, raw: string) => {
    if (raw.length === 6 && /^\d{6}$/.test(raw)) { onChange(raw); refs.current[5]?.focus(); return; }
    if (!/^\d?$/.test(raw)) return;
    const next = [...digits]; next[i] = raw;
    onChange(next.join("").slice(0, 6));
    if (raw && i < 5) refs.current[i + 1]?.focus();
  };

  const keyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  return (
    <div className="flex gap-3 justify-between">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text" inputMode="numeric" maxLength={6}
          value={digits[i] ?? ""}
          onChange={(e) => handle(i, e.target.value)}
          onKeyDown={(e) => keyDown(i, e)}
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

function useCountdown(secs: number) {
  const [left, setLeft] = useState(secs);
  useEffect(() => {
    if (left <= 0) return;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [left]);
  const fmt = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
  return { left, fmt, expired: left <= 0, reset: () => setLeft(secs) };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ForgotPasswordPage() {
  const [step,        setStep]        = useState<Step>(1);
  const [forgotToken, setForgotToken] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [hasEmail,    setHasEmail]    = useState(false);
  const [emailErr,    setEmailErr]    = useState<string | null>(null);
  const [showPwd,     setShowPwd]     = useState(false);
  const [showConf,    setShowConf]    = useState(false);

  const phoneCountdown = useCountdown(30);
  const emailCountdown = useCountdown(30);

  // ── Step 1: phone ──────────────────────────────────────────────────────────
  const phoneForm = useForm<FpPhoneValues>({
    resolver: zodResolver(fpPhoneSchema),
    defaultValues: { phone: "" }, mode: "onTouched",
  });

  const sendPhoneOtp = useFpSendPhoneOtp(phoneForm.setError, (data) => {
    setForgotToken(data.forgotToken);
    setMaskedPhone(data.maskedPhone);
    phoneCountdown.reset();
    setStep(2);
  });

  // ── Step 2: phone OTP ──────────────────────────────────────────────────────
  const phoneOtpForm = useForm<FpOtpValues>({
    resolver: zodResolver(fpOtpSchema),
    defaultValues: { code: "" }, mode: "onSubmit",
  });

  const verifyPhoneOtp = useFpVerifyPhoneOtp(phoneOtpForm.setError, (data) => {
    setForgotToken(data.forgotToken);
    setHasEmail(data.hasEmail);
    setMaskedEmail(data.maskedEmail);
    if (data.hasEmail) {
      setStep(3);
    } else {
      setStep(4);
    }
  });

  const phoneCode = phoneOtpForm.watch("code");
  useEffect(() => {
    if (phoneCode.length === 6) {
      phoneOtpForm.handleSubmit((v) =>
        verifyPhoneOtp.mutateAsync({ forgotToken, code: v.code })
      )();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneCode]);

  // ── Step 3: email OTP (conditional) ───────────────────────────────────────
  const emailOtpForm = useForm<FpOtpValues>({
    resolver: zodResolver(fpOtpSchema),
    defaultValues: { code: "" }, mode: "onSubmit",
  });

  const sendEmailOtp = useFpSendEmailOtp(
    (data) => {
      setForgotToken(data.forgotToken);
      setMaskedEmail(data.maskedEmail);
      emailCountdown.reset();
      setEmailErr(null);
    },
    (msg) => setEmailErr(msg)
  );

  // Auto-send email OTP when step 3 becomes active
  useEffect(() => {
    if (step === 3 && forgotToken) {
      sendEmailOtp.mutate({ forgotToken });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const verifyEmailOtp = useFpVerifyEmailOtp(emailOtpForm.setError, (data) => {
    setForgotToken(data.forgotToken);
    setStep(4);
  });

  const emailCode = emailOtpForm.watch("code");
  useEffect(() => {
    if (emailCode.length === 6) {
      emailOtpForm.handleSubmit((v) =>
        verifyEmailOtp.mutateAsync({ forgotToken, code: v.code })
      )();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailCode]);

  // ── Step 4: new password ───────────────────────────────────────────────────
  const passwordForm = useForm<FpPasswordValues>({
    resolver: zodResolver(fpPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" }, mode: "onTouched",
  });

  const resetPassword = useFpResetPassword(passwordForm.setError, () => {
    // Hard-navigate so the session cookie issued by /api/auth/forgot/reset-password
    // is flushed before the proxy evaluates the next request.
    window.location.replace(getDashboardRoute("USER"));
  });

  // ─── back button ──────────────────────────────────────────────────────────
  const handleBack = () => {
    if (step === 1) return;
    // going back from email OTP or password always goes to step 2
    if (step === 3 || (step === 4 && !hasEmail)) setStep(2);
    else if (step === 4) setStep(3);
    else setStep((s) => (s - 1) as Step);
  };

  return (
    <AuthLayout>
      {/* Back */}
      <Link
        href={step === 1 ? "/login" : "#"}
        onClick={(e) => { if (step > 1) { e.preventDefault(); handleBack(); } }}
        className="absolute top-6 left-6 lg:top-12 lg:left-12 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
        aria-label="Back"
      >
        <ArrowLeft className="text-gray-600" size={20} />
      </Link>

      <div className="max-w-md w-full mx-auto relative z-10">
        <StepBar current={step} hasEmail={hasEmail} />

        {/* ── Step 1: Phone ── */}
        {step === 1 && (
          <>
            <div className="space-y-2 mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Forgot password?</h1>
              <p className="text-gray-500 font-medium">Enter your registered phone number to receive a verification code.</p>
            </div>
            <form onSubmit={phoneForm.handleSubmit((v) => sendPhoneOtp.mutate(v))} noValidate>
              <FieldGroup>
                <Controller name="phone" control={phoneForm.control} render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid ? "true" : undefined}>
                    <FieldLabel htmlFor="phone">Phone number</FieldLabel>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500 select-none">+91</span>
                      <Input
                        {...field} id="phone" type="tel" inputMode="numeric"
                        placeholder="98765 43210" autoComplete="tel" autoFocus
                        aria-invalid={fieldState.invalid}
                        disabled={sendPhoneOtp.isPending}
                        className="pl-12"
                      />
                    </div>
                    {fieldState.error?.message?.trim() && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )} />
                <Button type="submit" className="w-full mt-2" disabled={sendPhoneOtp.isPending}>
                  {sendPhoneOtp.isPending ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : "Send OTP"}
                </Button>
              </FieldGroup>
            </form>
            <p className="mt-6 text-center text-sm text-gray-500">
              Remember your password?{" "}
              <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
            </p>
          </>
        )}

        {/* ── Step 2: Phone OTP ── */}
        {step === 2 && (
          <>
            <div className="space-y-2 mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Check your WhatsApp</h1>
              <p className="text-gray-500 font-medium">
                We sent a 6-digit code to <span className="font-semibold text-gray-700">{maskedPhone}</span>.
              </p>
            </div>
            <form onSubmit={phoneOtpForm.handleSubmit((v) => verifyPhoneOtp.mutateAsync({ forgotToken, code: v.code }))} noValidate>
              <FieldGroup>
                <Field>
                  <Controller name="code" control={phoneOtpForm.control} render={({ field, fieldState }) => (
                    <>
                      <OtpBoxes value={field.value} onChange={field.onChange} disabled={verifyPhoneOtp.isPending} hasError={fieldState.invalid} />
                      {fieldState.error?.message?.trim() && <FieldError errors={[fieldState.error]} />}
                    </>
                  )} />
                </Field>
                <Button type="submit" className="w-full mt-2" disabled={verifyPhoneOtp.isPending || phoneCode.length < 6}>
                  {verifyPhoneOtp.isPending ? <><Loader2 size={16} className="animate-spin" /> Verifying…</> : "Verify"}
                </Button>
              </FieldGroup>
            </form>
            <div className="mt-6 text-center space-y-2">
              {!phoneCountdown.expired && (
                <p className="text-sm text-gray-500">Resend in <span className="font-semibold tabular-nums">{phoneCountdown.fmt}</span></p>
              )}
              <button
                type="button" disabled={!phoneCountdown.expired || sendPhoneOtp.isPending}
                onClick={() => {
                  const phone = phoneForm.getValues("phone");
                  if (phone) sendPhoneOtp.mutate({ phone }, { onSuccess: (d) => { setForgotToken(d.forgotToken); phoneCountdown.reset(); } });
                }}
                className="text-sm font-medium text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Resend code
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: Email OTP (conditional) ── */}
        {step === 3 && (
          <>
            <div className="space-y-2 mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Verify your email</h1>
              <p className="text-gray-500 font-medium">
                {sendEmailOtp.isPending
                  ? "Sending code to your email…"
                  : <>We sent a 6-digit code to <span className="font-semibold text-gray-700">{maskedEmail}</span>.</>
                }
              </p>
              {emailErr && <p className="text-sm text-destructive font-medium">{emailErr}</p>}
            </div>
            <form onSubmit={emailOtpForm.handleSubmit((v) => verifyEmailOtp.mutateAsync({ forgotToken, code: v.code }))} noValidate>
              <FieldGroup>
                <Field>
                  <Controller name="code" control={emailOtpForm.control} render={({ field, fieldState }) => (
                    <>
                      <OtpBoxes value={field.value} onChange={field.onChange} disabled={verifyEmailOtp.isPending || sendEmailOtp.isPending} hasError={fieldState.invalid} />
                      {fieldState.error?.message?.trim() && <FieldError errors={[fieldState.error]} />}
                    </>
                  )} />
                </Field>
                <Button type="submit" className="w-full mt-2" disabled={verifyEmailOtp.isPending || emailCode.length < 6 || sendEmailOtp.isPending}>
                  {verifyEmailOtp.isPending ? <><Loader2 size={16} className="animate-spin" /> Verifying…</> : "Verify"}
                </Button>
              </FieldGroup>
            </form>
            <div className="mt-6 text-center space-y-2">
              {!emailCountdown.expired && (
                <p className="text-sm text-gray-500">Resend in <span className="font-semibold tabular-nums">{emailCountdown.fmt}</span></p>
              )}
              <button
                type="button" disabled={!emailCountdown.expired || sendEmailOtp.isPending}
                onClick={() => sendEmailOtp.mutate({ forgotToken }, { onSuccess: (d) => { setForgotToken(d.forgotToken); emailCountdown.reset(); } })}
                className="text-sm font-medium text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Resend code
              </button>
            </div>
          </>
        )}

        {/* ── Step 4: New password ── */}
        {step === 4 && (
          <>
            <div className="space-y-2 mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Create new password</h1>
              <p className="text-gray-500 font-medium">Choose a strong password with at least 8 characters, one uppercase letter and one number.</p>
            </div>
            <form onSubmit={passwordForm.handleSubmit((v) => resetPassword.mutate({ forgotToken, password: v.password }))} noValidate>
              <FieldGroup>
                <Controller name="password" control={passwordForm.control} render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid ? "true" : undefined}>
                    <FieldLabel htmlFor="new-password">New password</FieldLabel>
                    <div className="relative">
                      <Input {...field} id="new-password" type={showPwd ? "text" : "password"} placeholder="••••••••" autoComplete="new-password" autoFocus aria-invalid={fieldState.invalid} disabled={resetPassword.isPending} className="pr-11" />
                      <button type="button" onClick={() => setShowPwd((v) => !v)} tabIndex={-1} aria-label="Toggle password" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {fieldState.error?.message?.trim() && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )} />
                <Controller name="confirmPassword" control={passwordForm.control} render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid ? "true" : undefined}>
                    <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
                    <div className="relative">
                      <Input {...field} id="confirm-password" type={showConf ? "text" : "password"} placeholder="••••••••" autoComplete="new-password" aria-invalid={fieldState.invalid} disabled={resetPassword.isPending} className="pr-11" />
                      <button type="button" onClick={() => setShowConf((v) => !v)} tabIndex={-1} aria-label="Toggle confirm password" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showConf ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {fieldState.error?.message?.trim() && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )} />
                <Button type="submit" className="w-full mt-2" disabled={resetPassword.isPending}>
                  {resetPassword.isPending ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : "Reset Password"}
                </Button>
              </FieldGroup>
            </form>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
