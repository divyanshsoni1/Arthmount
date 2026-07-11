"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, MessageCircle, Mail, RefreshCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { AuthLayout } from "@/components/auth-layout";
import { VerifyOtpFormValues, verifyOtpSchema, useVerifyOtp } from "@/api-client/auth";

// ─── Countdown timer ──────────────────────────────────────────────────────────

function useCountdown(initialSeconds: number) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [seconds]);

  const reset = () => setSeconds(initialSeconds);
  const formatted = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return { seconds, formatted, reset, expired: seconds <= 0 };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OtpPage() {
  const router = useRouter();

  const [otpToken,      setOtpToken]      = useState("");
  const [channel,       setChannel]       = useState<"email" | "phone">("email");
  const [maskedDest,    setMaskedDest]    = useState("");
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const countdown   = useCountdown(30);
  const inputRefs   = useRef<Array<HTMLInputElement | null>>([]);
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);

  // ── Load context from sessionStorage ──

  useEffect(() => {
    const token = sessionStorage.getItem("otp_token")       ?? "";
    const ch    = sessionStorage.getItem("otp_channel")     ?? "email";
    const dest  = sessionStorage.getItem("otp_destination") ?? "";

    if (!token) { router.replace("/login"); return; }

    setOtpToken(token);
    setChannel(ch as "email" | "phone");
    setMaskedDest(dest);
  }, [router]);

  // ── Form ──

  const form = useForm<VerifyOtpFormValues>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { otpToken: "", code: "" },
    mode: "onSubmit",
  });

  useEffect(() => {
    form.setValue("otpToken", otpToken);
  }, [otpToken, form]);

  const { mutateAsync, isPending } = useVerifyOtp(form.setError);

  const onSubmit = (values: VerifyOtpFormValues) => mutateAsync(values);

  // ── Digit input helpers ──

  const handleDigitChange = (index: number, value: string) => {
    // Full paste into any box
    if (value.length === 6 && /^\d{6}$/.test(value)) {
      const next = value.split("");
      setDigits(next);
      form.setValue("code", value);
      inputRefs.current[5]?.focus();
      form.handleSubmit(onSubmit)();
      return;
    }
    if (!/^\d?$/.test(value)) return;

    const next = [...digits];
    next[index] = value;
    setDigits(next);
    form.setValue("code", next.join(""));

    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (value && next.every((d) => d !== "")) form.handleSubmit(onSubmit)();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // ── Resend: go back to login ──

  const handleResend = () => {
    sessionStorage.removeItem("otp_token");
    sessionStorage.removeItem("otp_channel");
    sessionStorage.removeItem("otp_destination");
    router.push("/login");
  };

  const ChannelIcon = channel === "phone" ? MessageCircle : Mail;

  return (
    <AuthLayout>
      {/* Back link */}
      <Link
        href="/login"
        className="absolute top-6 left-6 lg:top-12 lg:left-12 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors z-10"
        onClick={() => {
          sessionStorage.removeItem("otp_token");
          sessionStorage.removeItem("otp_channel");
          sessionStorage.removeItem("otp_destination");
        }}
      >
        <ArrowLeft size={16} />
        Back to login
      </Link>

      <div className="max-w-md w-full mx-auto relative z-10">

        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <ChannelIcon size={26} className="text-primary" />
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
          Check your {channel === "phone" ? "WhatsApp" : "email"}
        </h1>
        <p className="text-gray-500 font-medium mb-8">
          We sent a 6-digit code to{" "}
          <span className="font-semibold text-gray-700">{maskedDest}</span>.
          Enter it below to complete sign-in.
        </p>

        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>

            <input type="hidden" {...form.register("otpToken")} />

            {/* 6 digit boxes */}
            <Field>
              <div className="flex gap-3 justify-between">
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    disabled={isPending}
                    aria-label={`Digit ${i + 1}`}
                    className={[
                      "w-12 h-14 text-center text-xl font-bold rounded-xl border transition-all outline-none",
                      "focus:border-primary focus:ring-2 focus:ring-primary/20",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      form.formState.errors.code
                        ? "border-destructive ring-2 ring-destructive/20"
                        : "border-gray-200",
                    ].join(" ")}
                  />
                ))}
              </div>
              <input type="hidden" {...form.register("code")} />
              {form.formState.errors.code && (
                <FieldError errors={[form.formState.errors.code]} />
              )}
            </Field>

            <Button
              type="submit"
              className="w-full mt-2"
              disabled={isPending || digits.join("").length < 6}
            >
              {isPending
                ? <><Loader2 size={16} className="animate-spin" /> Verifying…</>
                : "Verify OTP"
              }
            </Button>

          </FieldGroup>
        </form>

        {/* Timer + resend */}
        <div className="mt-6 text-center space-y-2">
          {!countdown.expired ? (
            <p className="text-sm text-gray-500">
              Resend available in{" "}
              <span className="font-semibold tabular-nums text-gray-700">
                {countdown.formatted}
              </span>
            </p>
          ) : (
            <p className="text-sm text-red-500 font-medium">
              Code expired.
            </p>
          )}

          <button
            type="button"
            onClick={handleResend}
            disabled={!countdown.expired}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            <RefreshCw size={14} />
            Resend code
          </button>

          {resendMessage && (
            <p className="text-xs text-emerald-600 font-medium">{resendMessage}</p>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">
          Having trouble?{" "}
          <a href="mailto:support@arthmount.com" className="text-primary hover:underline">
            Contact support
          </a>
        </p>

      </div>
    </AuthLayout>
  );
}
