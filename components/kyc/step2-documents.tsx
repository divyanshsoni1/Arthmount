"use client";

import { AlertCircle, FileText } from "lucide-react";
import { UploadCard } from "./upload-card";
import { SectionHeading, NavRow, BTN_PRIMARY, BTN_OUTLINE } from "./kyc-shared";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocState {
  aadhaarFront: File | null;
  aadhaarBack:  File | null;
  panFront:     File | null;
  panBack:      File | null;
}

interface Step2Props {
  docs:    DocState;
  setDocs: React.Dispatch<React.SetStateAction<DocState>>;
  onNext:  () => void;
  onBack:  () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Step2Documents({ docs, setDocs, onNext, onBack }: Step2Props) {
  const allUploaded =
    !!docs.aadhaarFront && !!docs.aadhaarBack &&
    !!docs.panFront     && !!docs.panBack;

  const set = (key: keyof DocState) => (f: File | null) =>
    setDocs((prev) => ({ ...prev, [key]: f }));

  const missing = [
    !docs.aadhaarFront && "Aadhaar Front",
    !docs.aadhaarBack  && "Aadhaar Back",
    !docs.panFront     && "PAN Front",
    !docs.panBack      && "PAN Back",
  ].filter(Boolean) as string[];

  const uploadedCount = [
    docs.aadhaarFront,
    docs.aadhaarBack,
    docs.panFront,
    docs.panBack,
  ].filter(Boolean).length;

  return (
    <div>
      <SectionHeading
        title="Upload Documents"
        sub="Upload clear, well-lit photos of all four document sides. Images are only sent to our servers when you click Submit KYC."
        icon={FileText}
      />

      {/* Upload progress pill */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs text-slate-500">{uploadedCount}/4 documents uploaded</p>
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={[
                "h-1.5 w-8 rounded-full transition-colors duration-300",
                i < uploadedCount ? "bg-emerald-500" : "bg-slate-200",
              ].join(" ")}
            />
          ))}
        </div>
      </div>

      <div className="space-y-6 mb-6">
        {/* Aadhaar */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Aadhaar Card
            </p>
            {docs.aadhaarFront && docs.aadhaarBack && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                ✓ Complete
              </span>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <UploadCard
              label="Aadhaar Front"
              hint="Front side — photo & Aadhaar number visible"
              file={docs.aadhaarFront}
              onChange={set("aadhaarFront")}
            />
            <UploadCard
              label="Aadhaar Back"
              hint="Back side — address must be readable"
              file={docs.aadhaarBack}
              onChange={set("aadhaarBack")}
            />
          </div>
        </div>

        {/* PAN */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              PAN Card
            </p>
            {docs.panFront && docs.panBack && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                ✓ Complete
              </span>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <UploadCard
              label="PAN Front"
              hint="Front side — name & PAN number must be clear"
              file={docs.panFront}
              onChange={set("panFront")}
            />
            <UploadCard
              label="PAN Back"
              hint="Back side of your PAN card"
              file={docs.panBack}
              onChange={set("panBack")}
            />
          </div>
        </div>
      </div>

      {/* Missing items warning */}
      {!allUploaded && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          <AlertCircle size={13} className="shrink-0 mt-0.5" />
          <span>
            Still required:{" "}
            <strong>{missing.join(", ")}</strong>
          </span>
        </div>
      )}

      {/* Tips */}
      <div className="mb-5 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
        <p className="text-xs font-semibold text-slate-600 mb-1.5">📸 Photo Tips</p>
        <ul className="text-xs text-slate-500 space-y-1 list-none">
          <li>• Ensure the full document is visible with no corners cut off</li>
          <li>• Good lighting — avoid glare, shadows, or blur</li>
          <li>• All text on the document must be clearly readable</li>
        </ul>
      </div>

      <NavRow>
        <button type="button" onClick={onBack} className={`${BTN_OUTLINE} flex-1`}>
          Back
        </button>
        <button
          type="button"
          disabled={!allUploaded}
          onClick={onNext}
          className={`${BTN_PRIMARY} flex-1`}
        >
          Next — Capture Selfie
        </button>
      </NavRow>
    </div>
  );
}
