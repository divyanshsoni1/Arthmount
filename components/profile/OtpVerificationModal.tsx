"use client";

/**
 * OtpVerificationModal
 *
 * Reusable 6-digit OTP input dialog used for both email and phone
 * verification flows on the Edit Profile page.
 *
 * Features
 * ─────────
 * • Auto-focus on first input
 * • Auto-advance on digit entry
 * • Backspace moves to previous cell
 * • Full paste-OTP support (pastes across all 6 cells)
 * • Countdown timer with resend button
 * • Loading, error, and success states
 * • Max 3 resend attempts enforced client-side (server also rate-limits)
 * • Accessible: role="dialog", aria-modal, focus trap, keyboard dismiss
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Mail, Phone, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OtpChannel = "email" | "phone";

interface OtpVerificationModalProps {
  channel:           OtpChannel;
  maskedDestination: string;
  /** Called with the 6-digit code; should return a promise that rejects on error */
  onVerify:          (code: string) => Promise<void>;
  /** Called to re-send the OTP; should return a promise that rejects on error */
  onResend:          () => Promise<void>;
  onClose:           () => void;
  isOpen:            boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const OTP_LENGTH       = 6;
const COUNTDOWN_START  = 60;   // seconds
const MAX_RESENDS      = 3;

// ─── Digit cell ───────────────────────────────────────────────────────────────

interface DigitCellProps {
  value:    string;
  index:    number;
  focused:  boolean;
  hasError: boolean;
  inputRef: (el: HTMLInputElement | null) => void;
  onChange: (index: number, val: string) => void;
  onKeyDown:(index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste:  (e: React.ClipboardEvent<HTMLInputElement>) => void;
  onFocus:  (index: number) => void;
  disabled: boolean;
}

function DigitCell({
  value, index, focused, hasError,
  inputRef, onChange, onKeyDown, onPaste, onFocus, disabled,
}: DigitCellProps) {
  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      pattern="\d*"
      maxLength={1}
      value={value}
      disabled={disabled}
      aria-label={`OTP digit ${index + 1}`}
      className={cn(
        "h-12 w-10 rounded-xl border-2 text-center text-xl font-bold",
        "transition-all duration-150 outline-none select-none",
        "disabled:cursor-not-allowed disabled:opacity-40",
        // base
        "border-slate-200 bg-white text-slate-900",
        // focused
        focused && !hasError && "border-primary ring-3 ring-primary/20",
        // filled
        !focused && value && !hasError && "border-primary/40 bg-primary/5",
        // error
        hasError && "border-destructive bg-destructive/5 ring-3 ring-destructive/20",
        // sm screens
        "sm:h-14 sm:w-12 sm:text-2xl sm:rounded-2xl"
      )}
      onChange={(e) => {
        const v = e.target.value.replace(/\D/g, "").slice(-1);
        onChange(index, v);
      }}
      onKeyDown={(e) => onKeyDown(index, e)}
      onPaste={onPaste}
      onFocus={() => onFocus(index)}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OtpVerificationModal({
  channel,
  maskedDestination,
  onVerify,
  onResend,
  onClose,
  isOpen,
}: OtpVerificationModalProps) {
  const [digits, setDigits]         = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [verifying, setVerifying]   = useState(false);
  const [resending, setResending]   = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [countdown, setCountdown]   = useState(COUNTDOWN_START);

  const inputRefs  = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Reset state when modal opens ──────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setDigits(Array(OTP_LENGTH).fill(""));
      setFocusedIdx(0);
      setError(null);
      setSuccess(false);
      setVerifying(false);
      setResending(false);
      setCountdown(COUNTDOWN_START);
    }
  }, [isOpen]);

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || success) return;

    timerRef.current = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return n - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, success, resendCount]);

  // ── Auto-focus first cell on open ────────────────────────────────────────
  useEffect(() => {
    if (isOpen && !success) {
      // tiny delay so animation finishes before focus lands
      const t = setTimeout(() => inputRefs.current[0]?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [isOpen, success]);

  // ── Close on Escape ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !verifying) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, verifying, onClose]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const focusCell = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(OTP_LENGTH - 1, idx));
    inputRefs.current[clamped]?.focus();
    setFocusedIdx(clamped);
  }, []);

  const handleChange = useCallback((index: number, val: string) => {
    setError(null);
    const next = [...digits];
    next[index] = val;
    setDigits(next);
    if (val && index < OTP_LENGTH - 1) focusCell(index + 1);
  }, [digits, focusCell]);

  const handleKeyDown = useCallback((
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[index]) {
        const next = [...digits];
        next[index] = "";
        setDigits(next);
      } else if (index > 0) {
        const next = [...digits];
        next[index - 1] = "";
        setDigits(next);
        focusCell(index - 1);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      focusCell(index - 1);
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      focusCell(index + 1);
    } else if (e.key === "Enter") {
      handleSubmit();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits, focusCell]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    setError(null);
    // Focus last filled cell
    const lastIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    focusCell(lastIdx);
  }, [focusCell]);

  // ── Submit ────────────────────────────────────────────────────────────────

  const code = digits.join("");
  const isComplete = code.length === OTP_LENGTH;

  const handleSubmit = useCallback(async () => {
    if (!isComplete || verifying) return;
    setVerifying(true);
    setError(null);
    try {
      await onVerify(code);
      setSuccess(true);
      // Auto-close after brief success animation
      setTimeout(onClose, 1800);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(msg);
      // Shake digits on error then clear them
      setTimeout(() => {
        setDigits(Array(OTP_LENGTH).fill(""));
        focusCell(0);
      }, 500);
    } finally {
      setVerifying(false);
    }
  }, [isComplete, verifying, code, onVerify, onClose, focusCell]);

  // ── Resend ────────────────────────────────────────────────────────────────

  const handleResend = useCallback(async () => {
    if (resendCount >= MAX_RESENDS || countdown > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      await onResend();
      setResendCount((n) => n + 1);
      setCountdown(COUNTDOWN_START);
      setDigits(Array(OTP_LENGTH).fill(""));
      focusCell(0);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to resend OTP. Please try again.";
      setError(msg);
    } finally {
      setResending(false);
    }
  }, [resendCount, countdown, resending, onResend, focusCell]);

  if (!isOpen) return null;

  const hasError       = !!error;
  const canResend      = countdown === 0 && resendCount < MAX_RESENDS && !resending;
  const resendExhausted = resendCount >= MAX_RESENDS;

  return (
    // ── Backdrop ────────────────────────────────────────────────────────────
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      aria-modal="true"
      role="dialog"
      aria-labelledby="otp-dialog-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => { if (!verifying) onClose(); }}
      />

      {/* Panel */}
      <div className={cn(
        "relative z-10 w-full max-w-sm",
        "mx-4 mb-4 sm:mb-0",
        "rounded-3xl bg-white shadow-2xl",
        "animate-in fade-in slide-in-from-bottom-4 duration-300",
      )}>

        {/* Close button */}
        {!verifying && (
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        )}

        <div className="px-6 pb-8 pt-6 text-center">

          {/* ── Success state ── */}
          {success ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="text-emerald-600" size={36} />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">Verified!</p>
                <p className="mt-1 text-sm text-slate-500">
                  Your {channel === "email" ? "email address" : "phone number"} has been updated.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* ── Icon ── */}
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                {channel === "email"
                  ? <Mail className="text-primary" size={26} />
                  : <Phone className="text-primary" size={26} />
                }
              </div>

              {/* ── Title & description ── */}
              <h2
                id="otp-dialog-title"
                className="text-xl font-bold text-slate-900"
              >
                Verify your {channel === "email" ? "email" : "phone"}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                {channel === "email"
                  ? "We sent a 6-digit code to"
                  : "We sent a 6-digit code via WhatsApp to"
                }
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-700">
                {maskedDestination}
              </p>

              {/* ── OTP Cells ── */}
              <div
                className="mt-7 flex items-center justify-center gap-2 sm:gap-3"
                aria-label="Enter OTP"
              >
                {digits.map((d, i) => (
                  <DigitCell
                    key={i}
                    index={i}
                    value={d}
                    focused={focusedIdx === i}
                    hasError={hasError}
                    disabled={verifying || success}
                    inputRef={(el) => { inputRefs.current[i] = el; }}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onFocus={setFocusedIdx}
                  />
                ))}
              </div>

              {/* ── Error message ── */}
              <div className="mt-3 h-5">
                {error && (
                  <p
                    role="alert"
                    className="text-sm font-medium text-destructive"
                  >
                    {error}
                  </p>
                )}
              </div>

              {/* ── Verify button ── */}
              <button
                onClick={handleSubmit}
                disabled={!isComplete || verifying}
                className={cn(
                  "mt-5 w-full rounded-xl px-4 py-3 text-sm font-semibold",
                  "transition-all duration-150",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  isComplete && !verifying
                    ? "bg-primary text-white hover:bg-primary/90 shadow-sm"
                    : "bg-slate-100 text-slate-400"
                )}
              >
                {verifying ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Verifying…
                  </span>
                ) : (
                  "Verify"
                )}
              </button>

              {/* ── Resend section ── */}
              <div className="mt-5 flex flex-col items-center gap-1">
                {resendExhausted ? (
                  <p className="text-xs text-slate-400">
                    Maximum resend attempts reached. Please try again later.
                  </p>
                ) : countdown > 0 ? (
                  <p className="text-xs text-slate-500">
                    Resend code in{" "}
                    <span className="font-semibold tabular-nums text-slate-700">
                      {countdown}s
                    </span>
                  </p>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={!canResend}
                    className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resending
                      ? <Loader2 size={12} className="animate-spin" />
                      : <RefreshCw size={12} />
                    }
                    {resending ? "Sending…" : "Resend code"}
                  </button>
                )}
                {!resendExhausted && resendCount > 0 && (
                  <p className="text-[11px] text-slate-400">
                    {MAX_RESENDS - resendCount} resend{MAX_RESENDS - resendCount !== 1 ? "s" : ""} remaining
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
