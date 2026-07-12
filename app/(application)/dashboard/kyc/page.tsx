"use client";

/**
 * /dashboard/kyc — Complete KYC Verification Wizard
 *
 * Flow:
 *   Step 1 → Identity (Aadhaar + PAN)
 *   Step 2 → Document Upload (Aadhaar Front/Back + PAN Front/Back)
 *   Step 3 → Live Selfie Capture
 *   Step 4 → Review & Confirm
 *   Step 5 → KYC Status (Pending / Approved / Rejected)
 *
 * Nothing is persisted until the user clicks "Submit KYC" on Step 4.
 * All state lives in this component until that single multipart POST fires.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, ArrowLeft, Loader2 } from "lucide-react";

import {
  useKycStatus,
  useSubmitFull,
  extractKycError,
} from "@/api-client/kyc";
import { useUser } from "@/api-client/user";

import { StepBar, type StepId } from "@/components/kyc/kyc-shared";
import { Step1Identity, type IdentityValues } from "@/components/kyc/step1-identity";
import { Step2Documents, type DocState }       from "@/components/kyc/step2-documents";
import { Step3Selfie }                          from "@/components/kyc/step3-selfie";
import { Step4Review }                          from "@/components/kyc/step4-review";
import { Step5Status, AlreadyReviewed }         from "@/components/kyc/step5-status";

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-emerald-500" />
    </div>
  );
}

// ─── Page shell ───────────────────────────────────────────────────────────────

function PageShell({
  step,
  maxStep,
  onBack,
  children,
}: {
  step:     StepId;
  maxStep:  StepId;
  onBack:   () => void;
  children: React.ReactNode;
}) {
  const stepLabels: Record<StepId, string> = {
    1: "Identity Information",
    2: "Upload Documents",
    3: "Capture Selfie",
    4: "Review & Confirm",
    5: "Verification Status",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Top navigation bar */}
      <div className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            aria-label="Go back"
            onClick={onBack}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <ArrowLeft size={17} />
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
              <BadgeCheck size={16} className="text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 leading-none truncate">
                KYC Verification
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Step {step} of {maxStep} — {stepLabels[step]}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm shadow-slate-900/5 p-6 sm:p-8">
          <StepBar current={step} />
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KYCPage() {
  const router = useRouter();

  // ── Auth guard ─────────────────────────────────────────────────────────────
  const { user, isLoading: userLoading } = useUser();

  useEffect(() => {
    if (!userLoading && !user) {
      router.replace("/login?next=/dashboard/kyc");
    }
  }, [user, userLoading, router]);

  // ── Existing KYC record ────────────────────────────────────────────────────
  const { data: kyc, isLoading: kycLoading } = useKycStatus();

  // ── Wizard state ───────────────────────────────────────────────────────────
  const [step,        setStep]        = useState<StepId>(1);
  const [serverError, setServerError] = useState<string | null>(null);
  const [uploadPct,   setUploadPct]   = useState(0);

  // Wizard data — held client-side until final submission
  const [identity, setIdentity] = useState<IdentityValues | null>(null);
  const [docs,     setDocs]     = useState<DocState>({
    aadhaarFront: null,
    aadhaarBack:  null,
    panFront:     null,
    panBack:      null,
  });
  const [selfie, setSelfie] = useState<File | null>(null);

  // ── Submission mutation ────────────────────────────────────────────────────
  const submitFull = useSubmitFull();

  // ── Pre-fill identity from existing rejected/draft record ─────────────────
  const identityDefaults =
    kyc?.aadhaarNumber && kyc?.panNumber
      ? { aadhaarNumber: kyc.aadhaarNumber, panNumber: kyc.panNumber }
      : undefined;

  // ── Step handlers ──────────────────────────────────────────────────────────

  const handleIdentityNext = useCallback((values: IdentityValues) => {
    setIdentity(values);
    setStep(2);
  }, []);

  const handleDocsNext   = useCallback(() => setStep(3), []);
  const handleSelfieNext = useCallback(() => setStep(4), []);

  const handleGoToStep = useCallback((s: 1 | 2 | 3) => {
    setServerError(null);
    setStep(s);
  }, []);

  const handleBack = useCallback(() => {
    if (step === 1 || step === 5) {
      router.push("/dashboard");
    } else {
      setStep((s) => (s - 1) as StepId);
    }
  }, [step, router]);

  const handleSubmit = useCallback(async () => {
    if (
      !identity ||
      !docs.aadhaarFront || !docs.aadhaarBack ||
      !docs.panFront     || !docs.panBack     ||
      !selfie
    ) return;

    setServerError(null);
    setUploadPct(0);

    try {
      await submitFull.mutateAsync({
        aadhaarNumber: identity.aadhaarNumber,
        panNumber:     identity.panNumber,
        aadhaarFront:  docs.aadhaarFront,
        aadhaarBack:   docs.aadhaarBack,
        panFront:      docs.panFront,
        panBack:       docs.panBack,
        selfie,
        onProgress:    setUploadPct,
      });
      setStep(5);
    } catch (err) {
      setServerError(extractKycError(err));
      setUploadPct(0);
    }
  }, [identity, docs, selfie, submitFull]);

  // Re-KYC: reset all state and restart from step 1
  const handleReapply = useCallback(() => {
    setIdentity(null);
    setDocs({ aadhaarFront: null, aadhaarBack: null, panFront: null, panBack: null });
    setSelfie(null);
    setServerError(null);
    setUploadPct(0);
    setStep(1);
  }, []);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (userLoading || kycLoading) return <PageSkeleton />;
  if (!user) return null;

  // ── Blocking statuses — show read-only status screen ──────────────────────
  const blockingStatus = kyc?.status;
  if (
    blockingStatus === "APPROVED" ||
    blockingStatus === "AUTO_APPROVED" ||
    blockingStatus === "IN_REVIEW"
  ) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <AlreadyReviewed status={blockingStatus} />
        </div>
      </div>
    );
  }

  // ── Step 5 post-submit: show status card for the newly created record ──────
  // After successful submit, the kyc query cache is updated with the new record.
  if (step === 5 && kyc) {
    return (
      <PageShell step={5} maxStep={5} onBack={() => router.push("/dashboard")}>
        <Step5Status kyc={kyc} onReapply={handleReapply} />
      </PageShell>
    );
  }

  // ── Active wizard steps 1–4 ───────────────────────────────────────────────
  return (
    <PageShell step={step} maxStep={4} onBack={handleBack}>
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
          onGoToStep={handleGoToStep}
          onSubmit={handleSubmit}
          isPending={submitFull.isPending}
          uploadPct={uploadPct}
          serverError={serverError}
        />
      )}
    </PageShell>
  );
}
