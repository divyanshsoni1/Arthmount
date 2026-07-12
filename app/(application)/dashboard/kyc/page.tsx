"use client";

import {
  useCallback, useEffect, useRef, useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle, ArrowLeft, BadgeCheck, Camera,
  CheckCircle2, FileText, Loader2, RefreshCw,
  UploadCloud, X,
} from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Input }       from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  useKycStatus, useSubmitFull,
  extractKycError, type KycRecord,
} from "@/api-client/kyc";
import { useUser } from "@/api-client/user";

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Identity"  },
  { id: 2, label: "Documents" },
  { id: 3, label: "Selfie"    },
  { id: 4, label: "Review"    },
] as const;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

// ─── Shared button class ──────────────────────────────────────────────────────
// Both outline and primary nav buttons share identical sizing so they
// look like they belong to the same design system.

const BTN_BASE =
  "flex h-11 flex-1 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

const BTN_OUTLINE =
  `${BTN_BASE} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;

const BTN_PRIMARY =
  `${BTN_BASE} bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50`;

// ─── Zod schema — Step 1 ─────────────────────────────────────────────────────

const identitySchema = z.object({
  aadhaarNumber: z
    .string()
    .min(1, "Aadhaar number is required")
    .regex(/^\d{12}$/, "Aadhaar must be exactly 12 digits"),
  panNumber: z
    .string()
    .min(1, "PAN number is required")
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "PAN must match format ABCDE1234F")
    .transform((v) => v.toUpperCase()),
});

type IdentityValues = z.infer<typeof identitySchema>;

// ─── StepBar ──────────────────────────────────────────────────────────────────

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center mb-8 w-full">
      {STEPS.map((s, i) => {
        const done   = s.id < current;
        const active = s.id === current;
        return (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className={[
                "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all duration-200",
                done   ? "bg-emerald-600 text-white" : "",
                active ? "bg-emerald-600 text-white ring-4 ring-emerald-100" : "",
                !done && !active ? "bg-slate-100 text-slate-400" : "",
              ].join(" ")}>
                {done ? <CheckCircle2 size={17} /> : s.id}
              </div>
              <span className={[
                "text-[11px] font-medium hidden sm:block whitespace-nowrap",
                active ? "text-slate-900" : done ? "text-emerald-600" : "text-slate-400",
              ].join(" ")}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={[
                "flex-1 h-0.5 mx-2 rounded transition-colors duration-300",
                done ? "bg-emerald-500" : "bg-slate-200",
              ].join(" ")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-500 mt-1 leading-relaxed">{sub}</p>
    </div>
  );
}

// ─── Error banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 mb-4">
      <AlertCircle size={15} className="shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

// ─── UploadCard ───────────────────────────────────────────────────────────────
// Pure client-side — stores file in state, shows preview, does NOT upload yet.

interface UploadCardProps {
  label:    string;
  hint:     string;
  file:     File | null;
  onChange: (f: File | null) => void;
}

function UploadCard({ label, hint, file, onChange }: UploadCardProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Rebuild preview whenever file prop changes externally (e.g. reset)
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const validate = useCallback((f: File): string | null => {
    if (!ALLOWED_IMAGE_TYPES.includes(f.type)) return "Allowed: JPEG, PNG, WEBP";
    if (f.size > MAX_BYTES) return "File must be under 5 MB";
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
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const remove = () => { onChange(null); setError(null); };
  const isDone = !!file;

  return (
    <div
      className={[
        "relative rounded-2xl border-2 border-dashed p-4 transition-all duration-200",
        isDone  ? "border-emerald-300 bg-emerald-50/40"  : "",
        error   ? "border-red-300 bg-red-50/30"          : "",
        !isDone && !error
          ? "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/20 cursor-pointer"
          : "",
      ].join(" ")}
      onClick={() => !isDone && inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          <p className="text-xs text-slate-500 mt-0.5">{hint}</p>
        </div>
        {isDone && <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />}
      </div>

      {/* Preview */}
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt={label}
            className="w-full h-36 object-cover rounded-xl border border-slate-100"
          />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); remove(); }}
            aria-label="Remove"
            className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600 transition-colors"
          >
            <X size={11} />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-4 pointer-events-none">
          <UploadCloud size={32} className="text-slate-300" />
          <p className="text-xs text-slate-500 text-center">
            Drag & drop or <span className="font-semibold text-emerald-600">browse</span>
          </p>
          <p className="text-[11px] text-slate-400">JPEG, PNG, WEBP · Max 5 MB</p>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
          <AlertCircle size={11} className="shrink-0" /> {error}
        </p>
      )}

      {/* Replace button — only shown after selection */}
      {isDone && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
          className="mt-3 w-full rounded-lg border border-emerald-200 bg-white py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors"
        >
          Replace Image
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
}

// ─── Step 1 — Identity Information ───────────────────────────────────────────
// Nothing is sent to the backend here — data lives in component state.

interface Step1Props {
  defaultValues?: { aadhaarNumber: string; panNumber: string };
  onNext:         (v: IdentityValues) => void;
}

function Step1Identity({ defaultValues, onNext }: Step1Props) {
  const form = useForm<IdentityValues>({
    resolver:      zodResolver(identitySchema),
    defaultValues: defaultValues ?? { aadhaarNumber: "", panNumber: "" },
    mode:          "onChange",
  });
  const { isValid } = form.formState;

  return (
    <div>
      <SectionHeading
        title="Identity Information"
        sub="Enter your Aadhaar and PAN exactly as they appear on your documents. Nothing is saved until the final step."
      />
      <form onSubmit={form.handleSubmit(onNext)} noValidate>
        <FieldGroup>
          <Controller
            name="aadhaarNumber"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid ? "true" : undefined}>
                <FieldLabel htmlFor="aadhaar">Aadhaar Number</FieldLabel>
                <Input
                  {...field}
                  id="aadhaar"
                  inputMode="numeric"
                  maxLength={12}
                  placeholder="123456789012"
                  autoComplete="off"
                  aria-invalid={fieldState.invalid}
                  onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 12))}
                />
                <p className="text-xs text-slate-400 mt-1">12-digit number on your Aadhaar card</p>
                {fieldState.error?.message?.trim() && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="panNumber"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid ? "true" : undefined}>
                <FieldLabel htmlFor="pan">PAN Number</FieldLabel>
                <Input
                  {...field}
                  id="pan"
                  placeholder="ABCDE1234F"
                  autoComplete="off"
                  maxLength={10}
                  aria-invalid={fieldState.invalid}
                  className="font-mono tracking-widest uppercase"
                  onChange={(e) => field.onChange(e.target.value.toUpperCase().slice(0, 10))}
                />
                <p className="text-xs text-slate-400 mt-1">Format: ABCDE1234F</p>
                {fieldState.error?.message?.trim() && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <div className="flex gap-3 pt-1">
            <Link href="/dashboard" className={BTN_OUTLINE}>Cancel</Link>
            <button type="submit" disabled={!isValid} className={BTN_PRIMARY}>Next</button>
          </div>
        </FieldGroup>
      </form>
    </div>
  );
}

// ─── Step 2 — Upload Documents ────────────────────────────────────────────────

interface DocState {
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

function Step2Documents({ docs, setDocs, onNext, onBack }: Step2Props) {
  const allUploaded =
    !!docs.aadhaarFront && !!docs.aadhaarBack &&
    !!docs.panFront     && !!docs.panBack;

  const set = (key: keyof DocState) => (f: File | null) =>
    setDocs((prev) => ({ ...prev, [key]: f }));

  return (
    <div>
      <SectionHeading
        title="Upload Documents"
        sub="Upload clear photos of all four sides. Nothing is sent to the server yet — everything is submitted together in Step 4."
      />

      <div className="space-y-5 mb-6">
        {/* Aadhaar */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
            Aadhaar Card
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <UploadCard
              label="Aadhaar Front"
              hint="Front side — must be clearly visible"
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
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
            PAN Card
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <UploadCard
              label="PAN Front"
              hint="Front side — name & PAN must be clear"
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

      {/* Progress indicator */}
      {!allUploaded && (
        <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-2.5 text-xs text-amber-700 flex items-center gap-2">
          <AlertCircle size={13} className="shrink-0" />
          <span>
            {[
              !docs.aadhaarFront && "Aadhaar Front",
              !docs.aadhaarBack  && "Aadhaar Back",
              !docs.panFront     && "PAN Front",
              !docs.panBack      && "PAN Back",
            ].filter(Boolean).join(", ")} still required
          </span>
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className={BTN_OUTLINE}>Back</button>
        <button type="button" disabled={!allUploaded} onClick={onNext} className={BTN_PRIMARY}>
          Next
        </button>
      </div>
    </div>
  );
}

// ─── Step 3 — Live Selfie ─────────────────────────────────────────────────────

type CameraState = "idle" | "requesting" | "live" | "denied" | "captured" | "error";

interface Step3Props {
  selfie:    File | null;
  setSelfie: (f: File | null) => void;
  onNext:    () => void;
  onBack:    () => void;
}

function Step3Selfie({ selfie, setSelfie, onNext, onBack }: Step3Props) {
  const [camState, setCamState] = useState<CameraState>(selfie ? "captured" : "idle");
  const [errMsg,   setErrMsg]   = useState<string | null>(null);
  const [preview,  setPreview]  = useState<string | null>(null);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Restore preview from existing selfie file on mount
  useEffect(() => {
    if (selfie && camState === "captured") {
      const url = URL.createObjectURL(selfie);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Always stop stream on unmount
  useEffect(() => {
    return () => { stopCamera(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try { t.stop(); } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  const startCamera = async () => {
    setCamState("requesting");
    setErrMsg(null);

    // Check if getUserMedia is available
    if (!navigator?.mediaDevices?.getUserMedia) {
      setErrMsg("Camera is not supported on this device or browser. Please use Chrome, Safari, or Edge.");
      setCamState("error");
      return;
    }

    // Check HTTPS requirement (required by browsers except localhost)
    if (
      typeof window !== "undefined" &&
      window.location.protocol !== "https:" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      setErrMsg("Camera access requires a secure connection (HTTPS).");
      setCamState("error");
      return;
    }

    // Try front camera first, fall back to any camera
    const constraints: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      { video: { facingMode: "user" }, audio: false },
      { video: true, audio: false },
    ];

    let stream: MediaStream | null = null;
    let lastError: unknown = null;

    for (const constraint of constraints) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraint);
        break;
      } catch (e) {
        lastError = e;
      }
    }

    if (!stream) {
      const err = lastError as { name?: string } | null;
      const name = err?.name ?? "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setCamState("denied");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setErrMsg("No camera found on this device.");
        setCamState("error");
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        setErrMsg("Camera is already in use by another application. Please close other apps using the camera.");
        setCamState("error");
      } else if (name === "OverconstrainedError") {
        setErrMsg("Camera does not meet requirements. Please try a different device.");
        setCamState("error");
      } else {
        setErrMsg("Could not access the camera. Please check your device settings and try again.");
        setCamState("error");
      }
      return;
    }

    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      // Use onloadedmetadata + play() to handle iOS Safari which doesn't support autoplay with await
      videoRef.current.onloadedmetadata = () => {
        const playPromise = videoRef.current?.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setCamState("live"))
            .catch(() => {
              // Fallback: some browsers resolve but don't emit play — still set live
              setCamState("live");
            });
        } else {
          setCamState("live");
        }
      };
    }
  };

  const capture = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Use actual video dimensions, capped at 1280px for file size
    const maxDim   = 1280;
    const vw       = video.videoWidth  || 640;
    const vh       = video.videoHeight || 480;
    const scale    = Math.min(1, maxDim / Math.max(vw, vh));
    canvas.width   = Math.round(vw * scale);
    canvas.height  = Math.round(vh * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror horizontally (selfie-style) only if front camera
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    stopCamera();

    // Use toBlob for better async support than toDataURL (works on all browsers)
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setErrMsg("Failed to capture image. Please try again.");
          setCamState("idle");
          return;
        }
        const file = new File([blob], `selfie_${Date.now()}.jpg`, { type: "image/jpeg" });
        const url  = URL.createObjectURL(file);
        setSelfie(file);
        setPreview(url);
        setCamState("captured");
      },
      "image/jpeg",
      0.88
    );
  };

  const retake = () => {
    if (preview) URL.revokeObjectURL(preview);
    setSelfie(null);
    setPreview(null);
    setCamState("idle");
    setErrMsg(null);
  };

  return (
    <div>
      <SectionHeading
        title="Live Selfie"
        sub="Take a clear selfie using your device camera. Make sure your face is fully visible and well-lit."
      />

      {/* ── IDLE ── */}
      {camState === "idle" && (
        <div className="flex flex-col items-center gap-4 py-8 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <Camera size={30} className="text-emerald-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-800 mb-1">Camera Access Required</p>
            <p className="text-xs text-slate-500 max-w-xs">
              Click the button below to allow camera access and take your verification selfie.
            </p>
          </div>
          <button type="button" onClick={startCamera} className={`${BTN_PRIMARY} w-48`}>
            <Camera size={15} /> Open Camera
          </button>
        </div>
      )}

      {/* ── REQUESTING ── */}
      {camState === "requesting" && (
        <div className="flex flex-col items-center gap-3 py-10 rounded-2xl bg-slate-50 mb-6">
          <Loader2 size={32} className="animate-spin text-emerald-500" />
          <p className="text-sm text-slate-600">Requesting camera access...</p>
        </div>
      )}

      {/* ── DENIED ── */}
      {camState === "denied" && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center mb-6">
          <AlertCircle size={32} className="mx-auto text-red-400 mb-3" />
          <p className="text-sm font-semibold text-slate-800 mb-1">Camera Permission Denied</p>
          <p className="text-xs text-slate-500 mb-4 max-w-xs mx-auto">
            Please allow camera access in your browser settings and try again.
          </p>
          <button type="button" onClick={startCamera} className={`${BTN_PRIMARY} mx-auto w-40`}>
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      )}

      {/* ── ERROR ── */}
      {camState === "error" && errMsg && (
        <div className="mb-6">
          <ErrorBanner message={errMsg} />
          <button type="button" onClick={startCamera} className={`${BTN_PRIMARY} w-40`}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* ── LIVE FEED ── */}
      {camState === "live" && (
        <div className="mb-6">
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Face guide oval */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-44 h-52 rounded-full border-4 border-white/60 shadow-inner" />
            </div>
          </div>
          <p className="text-xs text-center text-slate-500 mt-2 mb-4">
            Centre your face inside the oval, then click Capture.
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={() => { stopCamera(); setCamState("idle"); }} className={BTN_OUTLINE}>
              Cancel
            </button>
            <button type="button" onClick={capture} className={BTN_PRIMARY}>
              <Camera size={15} /> Capture Selfie
            </button>
          </div>
        </div>
      )}

      {/* ── CAPTURED PREVIEW ── */}
      {camState === "captured" && preview && (
        <div className="mb-6">
          <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-300">
            <img
              src={preview}
              alt="Captured selfie"
              className="w-full aspect-video object-cover"
            />
            <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow">
              <CheckCircle2 size={12} /> Selfie captured
            </div>
          </div>
          <button type="button" onClick={retake} className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
            <RefreshCw size={14} /> Retake Selfie
          </button>
        </div>
      )}

      {/* Hidden canvas for capturing frame */}
      <canvas ref={canvasRef} className="sr-only" />

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className={BTN_OUTLINE}>Back</button>
        <button
          type="button"
          disabled={camState !== "captured"}
          onClick={onNext}
          className={BTN_PRIMARY}
        >
          Continue to Review
        </button>
      </div>
    </div>
  );
}

// ─── Step 4 — Review & Submit ─────────────────────────────────────────────────

interface ReviewDocProps { label: string; file: File | null }
function ReviewDoc({ label, file }: ReviewDocProps) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 mb-1.5">{label}</p>
      {url ? (
        <img src={url} alt={label} className="w-full h-28 object-cover rounded-xl border border-slate-100" />
      ) : (
        <div className="flex h-28 items-center justify-center rounded-xl bg-slate-100">
          <FileText size={22} className="text-slate-400" />
        </div>
      )}
    </div>
  );
}

interface Step4Props {
  identity:    { aadhaarNumber: string; panNumber: string };
  docs:        DocState;
  selfie:      File | null;
  onBack:      () => void;
  onSubmit:    () => void;
  isPending:   boolean;
  serverError: string | null;
}

function Step4Review({ identity, docs, selfie, onBack, onSubmit, isPending, serverError }: Step4Props) {
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!selfie) return;
    const u = URL.createObjectURL(selfie);
    setSelfieUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [selfie]);

  return (
    <div>
      <SectionHeading
        title="Review Your Submission"
        sub="Please verify all details before submitting. Once submitted, you cannot make changes until the review is complete."
      />

      {/* Identity */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 mb-5">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Identity Details</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Aadhaar Number</p>
            <p className="text-sm font-semibold text-slate-900 font-mono tracking-widest">
              {identity.aadhaarNumber.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3")}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">PAN Number</p>
            <p className="text-sm font-semibold text-slate-900 font-mono tracking-widest">
              {identity.panNumber}
            </p>
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 mb-5">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Uploaded Documents</p>
        <div className="grid grid-cols-2 gap-4">
          <ReviewDoc label="Aadhaar Front" file={docs.aadhaarFront} />
          <ReviewDoc label="Aadhaar Back"  file={docs.aadhaarBack}  />
          <ReviewDoc label="PAN Front"     file={docs.panFront}     />
          <ReviewDoc label="PAN Back"      file={docs.panBack}      />
        </div>
      </div>

      {/* Selfie */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 mb-5">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Live Selfie</p>
        {selfieUrl ? (
          <img
            src={selfieUrl}
            alt="Selfie"
            className="w-40 h-40 object-cover rounded-2xl border-2 border-emerald-200 mx-auto block"
          />
        ) : (
          <div className="flex h-40 w-40 items-center justify-center rounded-2xl bg-slate-100 mx-auto">
            <Camera size={28} className="text-slate-400" />
          </div>
        )}
      </div>

      {serverError && <ErrorBanner message={serverError} />}

      {/* Upload note */}
      <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700 mb-5">
        <AlertCircle size={13} className="shrink-0 mt-0.5" />
        All documents will be securely uploaded and submitted when you click Submit KYC.
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onBack} disabled={isPending} className={BTN_OUTLINE}>
          Back
        </button>
        <button type="button" onClick={onSubmit} disabled={isPending} className={BTN_PRIMARY}>
          {isPending
            ? <><Loader2 size={15} className="animate-spin" /> Submitting...</>
            : "Submit KYC"
          }
        </button>
      </div>
    </div>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen({
  identity,
  docs,
  selfie,
  kyc,
}: {
  identity: { aadhaarNumber: string; panNumber: string };
  docs:     DocState;
  selfie:   File | null;
  kyc:      KycRecord | null;
}) {
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!selfie) return;
    const u = URL.createObjectURL(selfie);
    setSelfieUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [selfie]);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col items-center text-center py-4 mb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-3">
          <BadgeCheck size={36} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">KYC Submitted Successfully</h2>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
          <Loader2 size={11} className="animate-spin" />
          {kyc?.status === "IN_REVIEW" ? "Under Review" : "Pending Verification"}
        </div>
      </div>

      {/* Identity */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 mb-5">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Identity Details</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Aadhaar Number</p>
            <p className="text-sm font-semibold text-slate-900 font-mono tracking-widest">
              {identity.aadhaarNumber.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3")}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">PAN Number</p>
            <p className="text-sm font-semibold text-slate-900 font-mono tracking-widest">
              {identity.panNumber}
            </p>
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 mb-5">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Uploaded Documents</p>
        <div className="grid grid-cols-2 gap-4">
          <ReviewDoc label="Aadhaar Front" file={docs.aadhaarFront} />
          <ReviewDoc label="Aadhaar Back"  file={docs.aadhaarBack}  />
          <ReviewDoc label="PAN Front"     file={docs.panFront}     />
          <ReviewDoc label="PAN Back"      file={docs.panBack}      />
        </div>
      </div>

      {/* Selfie */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Live Selfie</p>
        {selfieUrl ? (
          <img src={selfieUrl} alt="Selfie" className="w-36 h-36 object-cover rounded-2xl border-2 border-emerald-200 mx-auto block" />
        ) : null}
      </div>

      <p className="text-xs text-center text-slate-500 mb-5">
        Our verification team will review your documents within{" "}
        <span className="font-semibold text-slate-700">24–48 hours</span>.
      </p>

      <Link href="/dashboard" className={`${BTN_PRIMARY} no-underline w-full`}>
        Back to Dashboard
      </Link>
    </div>
  );
}

// ─── Already under review / approved screen ───────────────────────────────────

function AlreadyReviewed({ status }: { status: string }) {
  const approved = status === "APPROVED" || status === "AUTO_APPROVED";
  return (
    <div className="flex flex-col items-center text-center py-6">
      <div className={[
        "flex h-20 w-20 items-center justify-center rounded-full mb-4",
        approved ? "bg-emerald-100" : "bg-blue-100",
      ].join(" ")}>
        <BadgeCheck size={44} className={approved ? "text-emerald-600" : "text-blue-600"} />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">
        {approved ? "KYC Verified" : "KYC Under Review"}
      </h2>
      <p className="text-sm text-slate-500 max-w-sm mb-6">
        {approved
          ? "Your KYC is fully verified. You have access to all investment features."
          : "Your documents are currently under review. Check back in 24–48 hours."}
      </p>
      <Link href="/dashboard" className={`${BTN_PRIMARY} no-underline w-48`}>
        Back to Dashboard
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KYCPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  useEffect(() => {
    if (!userLoading && !user) router.replace("/login?next=/dashboard/kyc");
  }, [user, userLoading, router]);

  const { data: kyc, isLoading: kycLoading } = useKycStatus();
  const submitFull = useSubmitFull();

  type Step = 1 | 2 | 3 | 4 | 5; // 5 = success
  const [step,        setStep]        = useState<Step>(1);
  const [serverError, setServerError] = useState<string | null>(null);

  // All data held in client state until final submission
  const [identity, setIdentity] = useState<{ aadhaarNumber: string; panNumber: string } | null>(null);
  const [docs,     setDocs]     = useState<DocState>({
    aadhaarFront: null,
    aadhaarBack:  null,
    panFront:     null,
    panBack:      null,
  });
  const [selfie, setSelfie] = useState<File | null>(null);

  // Pre-fill identity from existing KYC record if present
  const identityDefaults = kyc?.aadhaarNumber && kyc?.panNumber
    ? { aadhaarNumber: kyc.aadhaarNumber, panNumber: kyc.panNumber }
    : undefined;

  const handleIdentityNext = (values: IdentityValues) => {
    setIdentity({ aadhaarNumber: values.aadhaarNumber, panNumber: values.panNumber });
    setStep(2);
  };

  const handleDocsNext  = () => setStep(3);
  const handleSelfieNext = () => setStep(4);

  const handleSubmit = async () => {
    if (!identity || !docs.aadhaarFront || !docs.aadhaarBack || !docs.panFront || !docs.panBack || !selfie) return;
    setServerError(null);
    try {
      await submitFull.mutateAsync({
        aadhaarNumber: identity.aadhaarNumber,
        panNumber:     identity.panNumber,
        aadhaarFront:  docs.aadhaarFront,
        aadhaarBack:   docs.aadhaarBack,
        panFront:      docs.panFront,
        panBack:       docs.panBack,
        selfie,
      });
      setStep(5);
    } catch (err) {
      setServerError(extractKycError(err));
    }
  };

  // Loading
  if (userLoading || kycLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 size={32} className="animate-spin text-emerald-500" />
      </div>
    );
  }
  if (!user) return null;

  // Already approved / under review
  const blocking = kyc?.status;
  if (blocking === "APPROVED" || blocking === "AUTO_APPROVED" || blocking === "IN_REVIEW") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <AlreadyReviewed status={blocking} />
        </div>
      </div>
    );
  }

  // Post-submit success
  if (step === 5 && identity) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200">
            <BadgeCheck size={17} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-none">KYC Verification</h1>
            <p className="text-xs text-slate-500 mt-0.5">Submitted successfully</p>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8">
            <StepBar current={5} />
            <SuccessScreen identity={identity} docs={docs} selfie={selfie} kyc={kyc ?? null} />
          </div>
        </div>
      </div>
    );
  }

  // Active steps 1–4
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          aria-label="Go back"
          onClick={() => {
            if (step === 1) router.push("/dashboard");
            else setStep((s) => (s - 1) as Step);
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-base font-bold text-slate-900 leading-none">KYC Verification</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Step {step} of 4 — {STEPS[step - 1]?.label}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8">
          <StepBar current={step} />

          {step === 1 && (
            <Step1Identity
              defaultValues={identityDefaults}
              onNext={handleIdentityNext}
            />
          )}

          {step === 2 && (
            <Step2Documents
              docs={docs}
              setDocs={setDocs}
              onNext={handleDocsNext}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <Step3Selfie
              selfie={selfie}
              setSelfie={setSelfie}
              onNext={handleSelfieNext}
              onBack={() => setStep(2)}
            />
          )}

          {step === 4 && identity && (
            <Step4Review
              identity={identity}
              docs={docs}
              selfie={selfie}
              onBack={() => { setStep(3); setServerError(null); }}
              onSubmit={handleSubmit}
              isPending={submitFull.isPending}
              serverError={serverError}
            />
          )}
        </div>
      </div>
    </div>
  );
}
