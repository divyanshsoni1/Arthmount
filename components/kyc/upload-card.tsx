"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, UploadCloud, X, ZoomIn } from "lucide-react";
import { ALLOWED_IMAGE_TYPES, MAX_FILE_BYTES } from "./kyc-shared";

// ─── Image preview modal ──────────────────────────────────────────────────────

function ImageModal({
  src,
  label,
  onClose,
}: {
  src:     string;
  label:   string;
  onClose: () => void;
}) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview: ${label}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X size={16} />
        </button>
        <img
          src={src}
          alt={label}
          className="w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
        />
        <p className="text-center text-white/70 text-xs mt-3">{label}</p>
      </div>
    </div>
  );
}

// ─── Upload card ─────────────────────────────────────────────────────────────

export interface UploadCardProps {
  label:    string;
  hint:     string;
  file:     File | null;
  onChange: (f: File | null) => void;
}

export function UploadCard({ label, hint, file, onChange }: UploadCardProps) {
  const [preview,  setPreview]  = useState<string | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [showZoom, setShowZoom] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Rebuild preview when file prop changes
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const validate = useCallback((f: File): string | null => {
    if (!ALLOWED_IMAGE_TYPES.includes(f.type))
      return "Only JPEG, PNG, or WEBP allowed";
    if (f.size > MAX_FILE_BYTES)
      return "File must be under 5 MB";
    return null;
  }, []);

  const handleFile = useCallback((f: File) => {
    const err = validate(f);
    if (err) { setError(err); return; }
    setError(null);
    onChange(f);
  }, [validate, onChange]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const remove = () => { onChange(null); setError(null); };
  const isDone = !!file;

  return (
    <>
      {showZoom && preview && (
        <ImageModal src={preview} label={label} onClose={() => setShowZoom(false)} />
      )}

      <div
        role={isDone ? "img" : "button"}
        aria-label={isDone ? `${label} — uploaded` : `Upload ${label}`}
        tabIndex={isDone ? -1 : 0}
        className={[
          "relative rounded-2xl border-2 border-dashed p-4 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          isDone   ? "border-emerald-300 bg-emerald-50/40 cursor-default"  : "",
          error    ? "border-red-300 bg-red-50/30 cursor-pointer"          : "",
          dragging ? "border-emerald-400 bg-emerald-50/60 scale-[1.01]"   : "",
          !isDone && !error && !dragging
            ? "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/20 cursor-pointer"
            : "",
        ].join(" ")}
        onClick={() => !isDone && inputRef.current?.click()}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !isDone) inputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">{label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{hint}</p>
          </div>
          {isDone && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowZoom(true); }}
                aria-label={`Zoom ${label}`}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-100 transition-colors"
              >
                <ZoomIn size={14} />
              </button>
              <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
            </div>
          )}
        </div>

        {/* Preview or placeholder */}
        {preview ? (
          <div className="relative group">
            <img
              src={preview}
              alt={label}
              className="w-full h-36 object-cover rounded-xl border border-slate-100"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-xl bg-black/0 group-hover:bg-black/20 transition-colors">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowZoom(true); }}
                aria-label="Zoom preview"
                className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow"
              >
                <ZoomIn size={12} /> Preview
              </button>
            </div>
            {/* Remove button */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(); }}
              aria-label={`Remove ${label}`}
              className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600 transition-colors"
            >
              <X size={11} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-5 pointer-events-none select-none">
            <div className={[
              "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
              dragging ? "bg-emerald-100" : "bg-slate-100",
            ].join(" ")}>
              <UploadCloud size={20} className={dragging ? "text-emerald-600" : "text-slate-400"} />
            </div>
            <p className="text-xs text-slate-500 text-center">
              Drag & drop or <span className="font-semibold text-emerald-600">browse</span>
            </p>
            <p className="text-[11px] text-slate-400">JPEG · PNG · WEBP · Max 5 MB</p>
          </div>
        )}

        {error && (
          <p className="mt-2 text-xs text-red-600 flex items-center gap-1.5">
            <AlertCircle size={11} className="shrink-0" /> {error}
          </p>
        )}

        {/* Replace button */}
        {isDone && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            className="mt-3 w-full rounded-xl border border-emerald-200 bg-white py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors"
          >
            Replace Image
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          className="sr-only"
          aria-hidden="true"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
    </>
  );
}
