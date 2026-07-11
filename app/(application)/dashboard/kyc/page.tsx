"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle, ArrowLeft, BadgeCheck, CheckCircle2,
  FileText, Loader2, UploadCloud, X,
} from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field, FieldError, FieldGroup, FieldLabel,
} from "@/components/ui/field";
import {
  useKycStatus, useSaveIdentity, useUploadDocument,
  useSubmitKyc, extractKycError, type KycRecord,
} from "@/api-client/kyc";
import { useUser } from "@/api-client/user";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS = [
  { id: 1, label: "Identity" },
  { id: 2, label: "Documents" },
  { id: 3, label: "Done" },
] as const;

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
const MAX_BYTES = 5 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// StepBar
// ---------------------------------------------------------------------------

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8 w-full">
      {STEPS.map((s, i) => {
        const done   = s.id < current;
        const active = s.id === current;
        return (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className={[
                "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all",
                done   ? "bg-emerald-600 text-white shadow-sm"            : "",
                active ? "bg-emerald-600 text-white ring-4 ring-emerald-100" : "",
                !done && !active ? "bg-slate-100 text-slate-400"           : "",
              ].join(" ")}>
                {done ? <CheckCircle2 size={18} /> : s.id}
              </div>
              <span className={[
                "text-xs font-medium hidden sm:block",
                active ? "text-slate-900" : done ? "text-emerald-600" : "text-slate-400",
              ].join(" ")}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={[
                "flex-1 h-0.5 mx-2 rounded transition-colors",
                done ? "bg-emerald-500" : "bg-slate-200",
              ].join(" ")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// UploadCard
// ---------------------------------------------------------------------------

interface UploadCardProps {
  label:       string;
  hint:        string;
  docType:     "aadhaar" | "pan";
  existingUrl: string | null;
  onUploaded:  (url: string) => void;
}

function UploadCard({ label, hint, docType, existingUrl, onUploaded }: UploadCardProps) {
  const [file,     setFile]     = useState<File | null>(null);
  const [preview,  setPreview]  = useState<string | null>(existingUrl);
  const [error,    setError]    = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useUploadDocument();
  const isPdf  = file?.type === "application/pdf";

  const handleFile = useCallback(async (incoming: File) => {
    setError(null);

    if (!ALLOWED_TYPES.includes(incoming.type)) {
      setError("Allowed formats: JPEG, PNG, WEBP, PDF");
      return;
    }
    if (incoming.size > MAX_BYTES) {
      setError("File size must be under 5 MB");
      return;
    }

    setFile(incoming);
    if (!incoming.type.startsWith("image/")) {
      setPreview(null);
    } else {
      setPreview(URL.createObjectURL(incoming));
    }

    setProgress(10);
    try {
      const result = await upload.mutateAsync({ docType, file: incoming });
      setProgress(100);
      onUploaded(result.url);
    } catch (err) {
      setError(extractKycError(err));
      setFile(null);
      setPreview(existingUrl);
      setProgress(0);
    }
  }, [docType, existingUrl, onUploaded, upload]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleRemove = () => {
    setFile(null);
    setPreview(existingUrl);
    setError(null);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  const isUploading = upload.isPending;
  const isDone      = progress === 100 || (!!existingUrl && !isUploading);

  return (
    <div className={[
      "relative rounded-2xl border-2 border-dashed p-6 transition-all",
      isDone    ? "border-emerald-300 bg-emerald-50/40"  : "",
      error     ? "border-red-300 bg-red-50/30"          : "",
      !isDone && !error ? "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/20" : "",
    ].join(" ")}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-semibold text-slate-800 text-sm">{label}</p>
          <p className="text-xs text-slate-500 mt-0.5">{hint}</p>
        </div>
        {isDone && !isUploading && (
          <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
        )}
      </div>

      {/* Preview */}
      {preview && !isUploading ? (
        <div className="relative mb-4">
          {isPdf ? (
            <div className="flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-3">
              <FileText size={28} className="text-slate-500 shrink-0" />
              <span className="text-sm text-slate-700 truncate">{file?.name ?? "Uploaded PDF"}</span>
            </div>
          ) : (
            <img
              src={preview}
              alt={label}
              className="w-full h-40 object-cover rounded-xl border border-slate-100"
            />
          )}
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600 transition-colors"
            aria-label="Remove file"
          >
            <X size={12} />
          </button>
        </div>
      ) : !isUploading ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <UploadCloud size={36} className="text-slate-300" />
          <p className="text-sm text-slate-500 text-center">
            Drag & drop or{" "}
            <button
              type="button"
              className="font-semibold text-emerald-600 hover:underline"
              onClick={() => inputRef.current?.click()}
            >
              browse files
            </button>
          </p>
          <p className="text-xs text-slate-400">JPEG, PNG, WEBP, PDF · Max 5 MB</p>
        </div>
      ) : null}

      {/* Upload progress */}
      {isUploading && (
        <div className="flex flex-col items-center gap-3 py-4">
          <Loader2 size={28} className="animate-spin text-emerald-500" />
          <p className="text-sm text-slate-600">Uploading...</p>
          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
          <AlertCircle size={13} className="shrink-0" />
          {error}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {!isUploading && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={[
            "mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors border",
            isDone
              ? "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
              : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
          ].join(" ")}
        >
          {isDone ? "Replace File" : "Browse Files"}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Identity details
// ---------------------------------------------------------------------------

interface Step1Props {
  defaultValues?: { aadhaarNumber: string; panNumber: string };
  onNext: (values: IdentityValues) => void;
  isPending: boolean;
  serverError: string | null;
}

function Step1Identity({ defaultValues, onNext, isPending, serverError }: Step1Props) {
  const form = useForm<IdentityValues>({
    resolver: zodResolver(identitySchema),
    defaultValues: defaultValues ?? { aadhaarNumber: "", panNumber: "" },
    mode: "onChange",
  });

  const { isValid } = form.formState;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Identity Information</h2>
        <p className="text-sm text-slate-500 mt-1">
          Enter your Aadhaar and PAN details exactly as they appear on your documents.
        </p>
      </div>

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
                  disabled={isPending}
                  onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 12))}
                />
                <p className="text-xs text-slate-400 mt-1">12-digit number on your Aadhaar card</p>
                {fieldState.error?.message?.trim() && (
                  <FieldError errors={[fieldState.error]} />
                )}
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
                  disabled={isPending}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase().slice(0, 10))}
                  className="font-mono tracking-wider uppercase"
                />
                <p className="text-xs text-slate-400 mt-1">Format: ABCDE1234F</p>
                {fieldState.error?.message?.trim() && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {serverError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={15} className="shrink-0" />
              {serverError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Link
              href="/dashboard"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>
            <Button
              type="submit"
              disabled={!isValid || isPending}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 font-semibold"
            >
              {isPending ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : "Next"}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Document upload
// ---------------------------------------------------------------------------

interface Step2Props {
  kyc: KycRecord;
  onNext:  () => void;
  onBack:  () => void;
  isPending: boolean;
  serverError: string | null;
  onAadhaarUploaded: (url: string) => void;
  onPanUploaded:     (url: string) => void;
  aadhaarUrl: string | null;
  panUrl:     string | null;
}

function Step2Documents({
  kyc, onNext, onBack, isPending, serverError,
  onAadhaarUploaded, onPanUploaded, aadhaarUrl, panUrl,
}: Step2Props) {
  const canSubmit = !!aadhaarUrl && !!panUrl;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Upload Documents</h2>
        <p className="text-sm text-slate-500 mt-1">
          Upload clear photos or scans of your Aadhaar and PAN cards.
          Each file must be under 5 MB.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 mb-6">
        <UploadCard
          label="Aadhaar Card"
          hint="Front side — must be clearly visible"
          docType="aadhaar"
          existingUrl={aadhaarUrl}
          onUploaded={onAadhaarUploaded}
        />
        <UploadCard
          label="PAN Card"
          hint="Front side — name & PAN must match"
          docType="pan"
          existingUrl={panUrl}
          onUploaded={onPanUploaded}
        />
      </div>

      {serverError && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 mb-4">
          <AlertCircle size={15} className="shrink-0" />
          {serverError}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Back
        </button>
        <Button
          type="button"
          disabled={!canSubmit || isPending}
          onClick={onNext}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 font-semibold disabled:opacity-50"
        >
          {isPending
            ? <><Loader2 size={16} className="animate-spin" /> Submitting...</>
            : "Submit KYC"
          }
        </Button>
      </div>

      {!canSubmit && (
        <p className="text-xs text-center text-slate-400 mt-3">
          Upload both documents to continue
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Success screen
// ---------------------------------------------------------------------------

function Step3Success() {
  return (
    <div className="flex flex-col items-center text-center py-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 mb-5">
        <BadgeCheck size={44} className="text-emerald-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">
        KYC Submitted Successfully
      </h2>
      <p className="text-sm text-slate-500 mb-2 max-w-sm">
        Your documents have been received.
      </p>
      <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-100 px-4 py-1.5 text-sm font-semibold text-blue-700 mb-5">
        <Loader2 size={13} className="animate-spin" />
        Pending Verification
      </div>
      <p className="text-sm text-slate-500 max-w-sm mb-8">
        Our verification team will review your documents. This usually takes
        <span className="font-semibold text-slate-700"> 24–48 hours</span>.
        You will be notified once the review is complete.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 text-sm font-semibold transition-colors"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Already-reviewed screen (approved / under review)
// ---------------------------------------------------------------------------

function AlreadyReviewed({ status }: { status: string }) {
  const isApproved = status === "APPROVED" || status === "AUTO_APPROVED";
  return (
    <div className="flex flex-col items-center text-center py-6">
      <div className={[
        "flex h-20 w-20 items-center justify-center rounded-full mb-5",
        isApproved ? "bg-emerald-100" : "bg-blue-100",
      ].join(" ")}>
        <BadgeCheck size={44} className={isApproved ? "text-emerald-600" : "text-blue-600"} />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">
        {isApproved ? "KYC Verified" : "KYC Under Review"}
      </h2>
      <p className="text-sm text-slate-500 max-w-sm mb-6">
        {isApproved
          ? "Your KYC is fully verified. You have access to all investment features."
          : "Your documents are currently being reviewed. Please check back in 24–48 hours."}
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 text-sm font-semibold transition-colors"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function KYCPage() {
  const router   = useRouter();
  const { user, isLoading: userLoading } = useUser();

  // Redirect unauthenticated users
  useEffect(() => {
    if (!userLoading && !user) router.replace("/login?next=/dashboard/kyc");
  }, [user, userLoading, router]);

  const { data: kyc, isLoading: kycLoading } = useKycStatus();

  const saveIdentity    = useSaveIdentity();
  const submitKyc       = useSubmitKyc();

  // Track step locally — start at 1 unless we already have uploaded docs
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [serverError, setServerError] = useState<string | null>(null);

  // Track upload URLs locally so UploadCard changes reflect immediately
  const [aadhaarUrl, setAadhaarUrl] = useState<string | null>(null);
  const [panUrl,     setPanUrl]     = useState<string | null>(null);

  // Sync URLs from DB when KYC record loads
  useEffect(() => {
    if (kyc) {
      setAadhaarUrl(kyc.aadhaarFrontUrl ?? null);
      setPanUrl(kyc.panFrontUrl ?? null);
    }
  }, [kyc]);

  // ── Step 1 submit ──────────────────────────────────────────────────────────
  const handleIdentitySubmit = async (values: IdentityValues) => {
    setServerError(null);
    try {
      await saveIdentity.mutateAsync({
        aadhaarNumber: values.aadhaarNumber,
        panNumber:     values.panNumber,
      });
      setStep(2);
    } catch (err) {
      setServerError(extractKycError(err));
    }
  };

  // ── Step 2 submit ──────────────────────────────────────────────────────────
  const handleFinalSubmit = async () => {
    setServerError(null);
    try {
      await submitKyc.mutateAsync();
      setStep(3);
    } catch (err) {
      setServerError(extractKycError(err));
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (userLoading || kycLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 size={32} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!user) return null;

  // Already approved or under review — show status screen
  const blockingStatus = kyc?.status;
  if (
    blockingStatus === "APPROVED" ||
    blockingStatus === "AUTO_APPROVED" ||
    blockingStatus === "IN_REVIEW"
  ) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <AlreadyReviewed status={blockingStatus} />
        </div>
      </div>
    );
  }

  // Step 3 — just submitted
  if (step === 3) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <Step3Success />
        </div>
      </div>
    );
  }

  // Determine initial defaults from existing KYC record
  const identityDefaults = kyc
    ? { aadhaarNumber: kyc.aadhaarNumber ?? "", panNumber: kyc.panNumber ?? "" }
    : undefined;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50 transition-colors"
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={18} className="text-slate-600" />
        </Link>
        <div>
          <h1 className="text-base font-bold text-slate-900 leading-none">KYC Verification</h1>
          <p className="text-xs text-slate-500 mt-0.5">Upload your identity documents</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8">
          <StepBar current={step} />

          {step === 1 && (
            <Step1Identity
              defaultValues={identityDefaults}
              onNext={handleIdentitySubmit}
              isPending={saveIdentity.isPending}
              serverError={serverError}
            />
          )}

          {step === 2 && kyc && (
            <Step2Documents
              kyc={kyc}
              onNext={handleFinalSubmit}
              onBack={() => { setStep(1); setServerError(null); }}
              isPending={submitKyc.isPending}
              serverError={serverError}
              onAadhaarUploaded={setAadhaarUrl}
              onPanUploaded={setPanUrl}
              aadhaarUrl={aadhaarUrl}
              panUrl={panUrl}
            />
          )}

          {/* If identity was saved previously but step is still 1, skip to 2 */}
          {step === 1 && kyc?.aadhaarNumber && kyc?.panNumber && (
            <p className="mt-4 text-xs text-center text-slate-400">
              Already saved?{" "}
              <button
                type="button"
                className="text-emerald-600 font-semibold hover:underline"
                onClick={() => setStep(2)}
              >
                Skip to document upload
              </button>
            </p>
          )}
        </div>

        {/* Tip */}
        {step === 2 && (
          <p className="mt-4 text-xs text-center text-slate-400 leading-relaxed">
            Ensure documents are clear and not blurry. Blurry images may cause rejection.
          </p>
        )}
      </div>
    </div>
  );
}
