"use client";

/**
 * Step 4 — Review & Confirm
 *
 * Shows every piece of collected data before the user clicks Submit KYC.
 * Features:
 *  - Full-screen image zoom modal for any document/selfie
 *  - Edit links back to previous steps
 *  - Upload progress bar during submission
 *  - Duplicate-submission guard
 */

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle, Camera, CheckCircle2, Edit3,
  FileText, Loader2, Maximize2, Shield, X,
  ZoomIn,
} from "lucide-react";

import type { DocState } from "./step2-documents";
import type { IdentityValues } from "./step1-identity";
import {
  SectionHeading, NavRow,
  BTN_PRIMARY, BTN_OUTLINE,
  ErrorBanner, InfoBanner,
} from "./kyc-shared";

// ─── Full-screen image modal ───────────────────────────────────────────────────

function FullscreenModal({
  src,
  label,
  onClose,
}: {
  src:     string;
  label:   string;
  onClose: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Full-screen preview: ${label}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-white/70 text-sm font-medium">{label}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <img
          src={src}
          alt={label}
          className="w-full max-h-[80vh] object-contain rounded-2xl"
        />
      </div>
    </div>
  );
}

// ─── Document thumbnail ───────────────────────────────────────────────────────

function DocThumb({
  label,
  file,
  onZoom,
}: {
  label:  string;
  file:   File | null;
  onZoom: (src: string, label: string) => void;
}) {
  const [url,      setUrl]      = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      setLoading(false);
      setImgError(false);
      return;
    }
    // Reset error state when a new file arrives
    setImgError(false);
    setLoading(true);
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => {
      URL.revokeObjectURL(u);
    };
  }, [file]);

  // ── No file ──────────────────────────────────────────────────────────────
  if (!file || !url) {
    return (
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <div
          // Fixed aspect ratio so the container never collapses to zero-height
          // on mobile (WebKit reports zero intrinsic size before paint).
          style={{ aspectRatio: "4/3" }}
          className="flex items-center justify-center rounded-xl bg-slate-100 border border-slate-200 w-full"
        >
          <FileText size={22} className="text-slate-400" />
        </div>
      </div>
    );
  }

  // ── Load error ────────────────────────────────────────────────────────────
  if (imgError) {
    return (
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <div
          style={{ aspectRatio: "4/3" }}
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-red-50 border border-red-100 w-full"
        >
          <AlertCircle size={18} className="text-red-400" />
          <p className="text-[11px] text-red-500 font-medium">Preview failed</p>
        </div>
      </div>
    );
  }

  // ── Image ready ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <button
        type="button"
        onClick={() => onZoom(url, label)}
        aria-label={`Preview ${label} fullscreen`}
        className="relative group overflow-hidden rounded-xl border-2 border-slate-100 hover:border-emerald-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 w-full"
        style={{ aspectRatio: "4/3" }}
      >
        {/* Skeleton shown while the blob URL is being decoded by the browser */}
        {loading && (
          <div className="absolute inset-0 animate-pulse bg-slate-200 rounded-xl" />
        )}
        {/*
          width/height are set explicitly so mobile WebKit (Safari iOS,
          Android WebView) never collapses the element to 0×0 before the
          image fires onLoad. The combination of w-full + aspect-ratio on
          the parent + width/height on the img itself is the cross-browser
          safe pattern.
        */}
        <img
          src={url}
          alt={label}
          width={400}
          height={300}
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setImgError(true); }}
          className={[
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-200",
            loading ? "opacity-0" : "opacity-100",
          ].join(" ")}
        />
        {/* Hover / tap overlay */}
        {!loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-800">
              <ZoomIn size={11} /> View
            </span>
          </div>
        )}
      </button>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title:    string;
  onEdit?:  () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{title}</p>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            <Edit3 size={11} /> Edit
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Upload progress bar ──────────────────────────────────────────────────────

function UploadProgress({ pct }: { pct: number }) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 mb-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Loader2 size={14} className="animate-spin text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-800">Uploading your documents…</span>
        </div>
        <span className="text-sm font-bold text-emerald-700">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-emerald-200 overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-emerald-600 mt-1.5">
        Please do not close this page.
      </p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Step4Props {
  identity:    IdentityValues;
  docs:        DocState;
  selfie:      File | null;
  onBack:      () => void;
  onGoToStep:  (step: 1 | 2 | 3) => void;
  onSubmit:    () => void;
  isPending:   boolean;
  uploadPct:   number;
  serverError: string | null;
}

export function Step4Review({
  identity,
  docs,
  selfie,
  onBack,
  onGoToStep,
  onSubmit,
  isPending,
  uploadPct,
  serverError,
}: Step4Props) {
  const [modalSrc,   setModalSrc]   = useState<string | null>(null);
  const [modalLabel, setModalLabel] = useState<string>("");
  const [selfieUrl,  setSelfieUrl]  = useState<string | null>(null);
  const submitted = useRef(false);

  // Selfie object URL — kept in sync with the File prop
  useEffect(() => {
    if (!selfie) { setSelfieUrl(null); return; }
    const u = URL.createObjectURL(selfie);
    setSelfieUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [selfie]);

  const openZoom = (src: string, label: string) => {
    setModalSrc(src);
    setModalLabel(label);
  };

  // Guard against double-tap
  const handleSubmit = () => {
    if (submitted.current || isPending) return;
    submitted.current = true;
    onSubmit();
  };

  return (
    <div>
      {modalSrc && (
        <FullscreenModal
          src={modalSrc}
          label={modalLabel}
          onClose={() => { setModalSrc(null); setModalLabel(""); }}
        />
      )}

      <SectionHeading
        title="Review Your Submission"
        sub="Check all details carefully. Once submitted, you cannot make changes until the review is complete."
        icon={Shield}
      />

      {/* ── Identity ── */}
      <ReviewSection title="Identity Details" onEdit={() => onGoToStep(1)}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] text-slate-400 mb-1 uppercase tracking-wide">Aadhaar Number</p>
            <p className="text-sm font-bold text-slate-900 font-mono tracking-widest">
              {identity.aadhaarNumber.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3")}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 mb-1 uppercase tracking-wide">PAN Number</p>
            <p className="text-sm font-bold text-slate-900 font-mono tracking-widest">
              {identity.panNumber}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600">
          <CheckCircle2 size={12} /> Identity details verified
        </div>
      </ReviewSection>

      {/* ── Documents ── */}
      <ReviewSection title="Uploaded Documents" onEdit={() => onGoToStep(2)}>
        <div className="grid grid-cols-2 gap-4">
          <DocThumb label="Aadhaar Front" file={docs.aadhaarFront} onZoom={openZoom} />
          <DocThumb label="Aadhaar Back"  file={docs.aadhaarBack}  onZoom={openZoom} />
          <DocThumb label="PAN Front"     file={docs.panFront}     onZoom={openZoom} />
          <DocThumb label="PAN Back"      file={docs.panBack}      onZoom={openZoom} />
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600">
          <CheckCircle2 size={12} /> All 4 documents ready
        </div>
        <p className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
          <Maximize2 size={10} /> Click any image to view full-screen
        </p>
      </ReviewSection>

      {/* ── Selfie ── */}
      <ReviewSection title="Live Selfie" onEdit={() => onGoToStep(3)}>
        {selfieUrl ? (
          <button
            type="button"
            onClick={() => openZoom(selfieUrl, "Live Selfie")}
            aria-label="Preview selfie fullscreen"
            className="relative group mx-auto block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-2xl"
          >
            <img
              src={selfieUrl}
              alt="Your selfie"
              width={176}
              height={176}
              className="w-36 h-36 sm:w-44 sm:h-44 object-cover rounded-2xl border-4 border-emerald-200 mx-auto block"
            />
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/0 group-hover:bg-black/25 transition-colors">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-800">
                <ZoomIn size={12} /> View
              </span>
            </div>
          </button>
        ) : (
          <div className="flex h-36 w-36 items-center justify-center rounded-2xl bg-slate-100 mx-auto">
            <Camera size={28} className="text-slate-400" />
          </div>
        )}
        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-emerald-600">
          <CheckCircle2 size={12} /> Selfie captured
        </div>
      </ReviewSection>

      {/* ── Upload progress ── */}
      {isPending && <UploadProgress pct={uploadPct} />}

      {/* ── Server error ── */}
      {serverError && !isPending && <ErrorBanner message={serverError} />}

      {/* ── Security note ── */}
      {!isPending && (
        <InfoBanner message="All documents will be encrypted and securely transmitted. We never share your data with third parties." />
      )}

      <NavRow>
        <button
          type="button"
          onClick={onBack}
          disabled={isPending}
          className={`${BTN_OUTLINE} flex-1`}
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className={`${BTN_PRIMARY} flex-1`}
        >
          {isPending ? (
            <><Loader2 size={15} className="animate-spin" /> Submitting…</>
          ) : (
            <><Shield size={15} /> Submit KYC</>
          )}
        </button>
      </NavRow>
    </div>
  );
}
