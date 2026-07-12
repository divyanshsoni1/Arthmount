"use client";

/**
 * Shared primitives used across all KYC step components.
 * Keeping these in one file ensures design consistency.
 */

import { AlertCircle, CheckCircle2 } from "lucide-react";

// ─── Step definitions ─────────────────────────────────────────────────────────

export const KYC_STEPS = [
  { id: 1, label: "Identity",  shortLabel: "ID"       },
  { id: 2, label: "Documents", shortLabel: "Docs"     },
  { id: 3, label: "Selfie",    shortLabel: "Selfie"   },
  { id: 4, label: "Review",    shortLabel: "Review"   },
  { id: 5, label: "Status",    shortLabel: "Status"   },
] as const;

export type StepId = 1 | 2 | 3 | 4 | 5;

// ─── Constants ────────────────────────────────────────────────────────────────

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const MAX_FILE_BYTES      = 5 * 1024 * 1024; // 5 MB

// ─── Button class helpers ─────────────────────────────────────────────────────

export const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap select-none";

export const BTN_PRIMARY =
  `${BTN_BASE} bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 active:scale-[0.98]`;

export const BTN_OUTLINE =
  `${BTN_BASE} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-[0.98]`;

export const BTN_DANGER =
  `${BTN_BASE} bg-red-600 text-white shadow-sm shadow-red-600/20 hover:bg-red-700 active:scale-[0.98]`;

// ─── StepBar ──────────────────────────────────────────────────────────────────

export function StepBar({ current }: { current: StepId }) {
  return (
    <div className="flex w-full items-center mb-8" role="list" aria-label="KYC progress steps">
      {KYC_STEPS.map((s, i) => {
        const done   = s.id < current;
        const active = s.id === current;

        return (
          <div
            key={s.id}
            role="listitem"
            aria-current={active ? "step" : undefined}
            className="flex items-center flex-1 last:flex-none"
          >
            {/* Circle + label */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all duration-300",
                  done   ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"   : "",
                  active ? "bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-sm" : "",
                  !done && !active ? "bg-slate-100 text-slate-400" : "",
                ].join(" ")}
              >
                {done ? <CheckCircle2 size={16} /> : s.id}
              </div>
              <span
                className={[
                  "hidden sm:block text-[11px] font-medium whitespace-nowrap",
                  active ? "text-slate-900"    : "",
                  done   ? "text-emerald-600"  : "",
                  !done && !active ? "text-slate-400" : "",
                ].join(" ")}
              >
                {s.label}
              </span>
            </div>

            {/* Connector line */}
            {i < KYC_STEPS.length - 1 && (
              <div
                className={[
                  "flex-1 h-0.5 mx-2 rounded-full transition-colors duration-500",
                  done ? "bg-emerald-500" : "bg-slate-200",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── SectionHeading ───────────────────────────────────────────────────────────

export function SectionHeading({
  title,
  sub,
  icon: Icon,
}: {
  title: string;
  sub:   string;
  icon?: React.ElementType;
}) {
  return (
    <div className="mb-6">
      {Icon && (
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 mb-3">
          <Icon size={22} className="text-emerald-600" />
        </div>
      )}
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-500 mt-1 leading-relaxed">{sub}</p>
    </div>
  );
}

// ─── ErrorBanner ─────────────────────────────────────────────────────────────

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 mb-4"
    >
      <AlertCircle size={15} className="shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

// ─── InfoBanner ──────────────────────────────────────────────────────────────

export function InfoBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700 mb-4">
      <AlertCircle size={13} className="shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

// ─── NavRow ───────────────────────────────────────────────────────────────────

export function NavRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 pt-2">
      {children}
    </div>
  );
}
