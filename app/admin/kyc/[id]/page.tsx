"use client";

import { use, useState, useCallback }   from "react";
import Link                              from "next/link";
import { useRouter }                     from "next/navigation";
import {
  useAdminKycDetail, useApproveKyc, useRejectKyc, extractError,
} from "@/api-client/admin";
import {
  ArrowLeft, BadgeCheck, Loader2, ShieldX, ZoomIn, ZoomOut,
  Download, RotateCcw, X, CheckCircle2, XCircle,
  User, FileCheck, Calendar, Phone, Mail, ShieldAlert,
  AlertTriangle, Clock,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Animated counter (simple) ────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: React.ElementType; bg: string }> = {
  PENDING:       { label: "Pending",     badge: "bg-amber-100 text-amber-700 border-amber-200",   icon: Clock,        bg: "bg-amber-50" },
  IN_REVIEW:     { label: "In Review",   badge: "bg-blue-100 text-blue-700 border-blue-200",      icon: AlertTriangle, bg: "bg-blue-50" },
  APPROVED:      { label: "Approved",    badge: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2, bg: "bg-emerald-50" },
  AUTO_APPROVED: { label: "Auto Approved", badge: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2, bg: "bg-emerald-50" },
  REJECTED:      { label: "Rejected",    badge: "bg-red-100 text-red-700 border-red-200",         icon: XCircle,      bg: "bg-red-50" },
};

// ─── Document image viewer ────────────────────────────────────────────────────

interface DocCardProps {
  label:    string;
  url:      string | null;
  docType?: string;
}

function DocCard({ label, url }: DocCardProps) {
  const [zoom,    setZoom]    = useState(false);
  const [zoomLvl, setZoomLvl] = useState(1);
  const [imgError, setImgError] = useState(false);
  const [loading, setLoading]  = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(url);

  const handleRetry = useCallback(async () => {
    if (!url) return;
    setRefreshing(true);
    setImgError(false);
    try {
      // The URL from the API is already a fresh signed URL (60-min).
      // Force image reload by appending a cache-buster.
      setCurrentUrl(url + (url.includes("?") ? "&" : "?") + "_r=" + Date.now());
    } finally {
      setRefreshing(false);
    }
  }, [url]);

  const isPdf = currentUrl?.toLowerCase().includes(".pdf");

  return (
    <>
      <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <FileCheck size={13} className={currentUrl ? "text-emerald-500" : "text-slate-300"} />
            <p className="text-xs font-semibold text-slate-700">{label}</p>
          </div>
          {currentUrl && !imgError && (
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setZoom(true)}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                <ZoomIn size={11} /> View
              </button>
              {!isPdf && currentUrl && (
                <a
                  href={currentUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <Download size={11} />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="relative bg-slate-50/40 h-44">
          {!currentUrl ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
              <FileCheck size={24} className="opacity-30" />
              <p className="text-xs">Not uploaded</p>
            </div>
          ) : imgError ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-500">
              <RotateCcw size={20} className="opacity-40" />
              <p className="text-xs text-slate-500">Failed to load</p>
              <button
                type="button"
                onClick={handleRetry}
                disabled={refreshing}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
              >
                <RotateCcw size={11} className={refreshing ? "animate-spin" : ""} />
                {refreshing ? "Retrying…" : "Retry"}
              </button>
            </div>
          ) : isPdf ? (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <FileCheck size={28} className="text-red-500" />
              <p className="text-xs text-slate-500">PDF Document</p>
              <a href={currentUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs font-semibold text-emerald-600 hover:underline">
                Open PDF →
              </a>
            </div>
          ) : (
            <>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                  <Loader2 size={20} className="animate-spin text-slate-300" />
                </div>
              )}
              <img
                src={currentUrl}
                alt={label}
                onLoad={() => setLoading(false)}
                onError={() => { setLoading(false); setImgError(true); }}
                onClick={() => { if (!loading) setZoom(true); }}
                className={`h-full w-full object-contain p-2 cursor-zoom-in transition-opacity duration-200 ${loading ? "opacity-0" : "opacity-100"}`}
              />
            </>
          )}
        </div>
      </div>

      {/* Fullscreen lightbox */}
      {zoom && currentUrl && !isPdf && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => { setZoom(false); setZoomLvl(1); }}
        >
          <div className="relative flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            {/* Toolbar */}
            <div className="mb-3 flex items-center gap-2 rounded-2xl bg-white/10 backdrop-blur-md px-4 py-2">
              <p className="text-sm font-semibold text-white mr-3">{label}</p>
              <button type="button" onClick={() => setZoomLvl((z) => Math.max(0.5, z - 0.25))}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
                <ZoomOut size={13} />
              </button>
              <span className="text-xs text-white/70 w-10 text-center">{Math.round(zoomLvl * 100)}%</span>
              <button type="button" onClick={() => setZoomLvl((z) => Math.min(3, z + 0.25))}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
                <ZoomIn size={13} />
              </button>
              <a href={currentUrl} download target="_blank" rel="noopener noreferrer"
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
                <Download size={13} />
              </a>
              <button type="button" onClick={() => { setZoom(false); setZoomLvl(1); }}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors ml-1">
                <X size={13} />
              </button>
            </div>
            {/* Image */}
            <div className="max-h-[80vh] max-w-[90vw] overflow-auto rounded-2xl">
              <img
                src={currentUrl}
                alt={label}
                style={{ transform: `scale(${zoomLvl})`, transformOrigin: "top left", transition: "transform 0.2s" }}
                className="block max-w-none rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Rejection modal ──────────────────────────────────────────────────────────

const PRESET_REASONS = [
  "Image is blurry or unclear",
  "PAN number does not match the document",
  "Aadhaar is not readable",
  "Face does not match the selfie",
  "Document appears expired",
  "Wrong document uploaded",
  "Photo is incomplete or cropped",
  "Document shows tampering signs",
];

function RejectModal({ onConfirm, onClose, loading }: {
  onConfirm: (reason: string) => void;
  onClose:   () => void;
  loading:   boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
            <ShieldX size={18} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Reject KYC</h3>
            <p className="text-xs text-slate-500">This reason will be shown to the user.</p>
          </div>
        </div>

        {/* Preset reasons */}
        <div className="flex flex-wrap gap-2">
          {PRESET_REASONS.map((r) => (
            <button key={r} type="button"
              onClick={() => setReason(r)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${reason === r ? "bg-red-600 text-white border-red-600" : "border-slate-200 text-slate-600 hover:border-red-200 hover:text-red-700"}`}>
              {r}
            </button>
          ))}
        </div>

        {/* Custom reason */}
        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Type a custom reason or select one above…"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm placeholder:text-slate-400 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 resize-none transition-all"
        />

        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button type="button"
            disabled={!reason.trim() || loading}
            onClick={() => onConfirm(reason.trim())}
            className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Rejecting…</> : <><ShieldX size={14} /> Confirm Reject</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KycDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }   = use(params);
  const router   = useRouter();
  const { data: kyc, isLoading } = useAdminKycDetail(id);
  const approve  = useApproveKyc(id);
  const reject   = useRejectKyc(id);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionError,     setActionError]     = useState<string | null>(null);

  const canAct = kyc?.status === "IN_REVIEW" || kyc?.status === "PENDING";
  const statusCfg = kyc ? (STATUS_CONFIG[kyc.status] ?? STATUS_CONFIG.PENDING) : null;

  const handleApprove = async () => {
    setActionError(null);
    try { await approve.mutateAsync(); router.push("/admin/kyc"); }
    catch (err) { setActionError(extractError(err)); }
  };

  const handleReject = async (reason: string) => {
    setActionError(null);
    try { await reject.mutateAsync(reason); setShowRejectModal(false); router.push("/admin/kyc"); }
    catch (err) { setActionError(extractError(err)); }
  };

  return (
    <>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">

        {/* Back + title */}
        <div className="flex items-center gap-3">
          <Link href="/admin/kyc"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">KYC Review</h1>
            <p className="text-xs text-slate-400">Verify identity documents and take action</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : !kyc ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-slate-100 bg-white">
            <ShieldAlert size={32} className="text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-700">KYC record not found</p>
          </div>
        ) : (
          <>
            {/* Status banner */}
            {statusCfg && (
              <div className={`flex items-center gap-3 rounded-2xl border px-5 py-3.5 ${statusCfg.badge}`}>
                <statusCfg.icon size={16} className="shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold">Status: {statusCfg.label}</p>
                  {kyc.rejectionReason && (
                    <p className="text-xs mt-0.5 opacity-80">Rejection reason: {kyc.rejectionReason}</p>
                  )}
                  {kyc.reviewer && (
                    <p className="text-xs mt-0.5 opacity-70">Reviewed by {kyc.reviewer.name}</p>
                  )}
                </div>
              </div>
            )}

            {/* User profile card */}
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">User Details</p>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white text-xl font-extrabold shadow-md shadow-emerald-200">
                    {kyc.user.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900">{kyc.user.name}</h2>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      {kyc.user.email && (
                        <span className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Mail size={11} /> {kyc.user.email}
                        </span>
                      )}
                      {kyc.user.phone && (
                        <span className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Phone size={11} /> {kyc.user.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Calendar size={11} /> Registered {fmtShort(kyc.user.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="ml-auto">
                    <Link href={`/admin/users/${kyc.user.id}`}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                      <User size={12} /> View Profile
                    </Link>
                  </div>
                </div>

                {/* Identity fields */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Aadhaar Number</p>
                    <p className="text-sm font-bold text-slate-800 font-mono">
                      {kyc.aadhaarNumber
                        ? kyc.aadhaarNumber.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3")
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">PAN Number</p>
                    <p className="text-sm font-bold text-slate-800 font-mono tracking-widest">
                      {kyc.panNumber ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Submission Date</p>
                    <p className="text-xs font-semibold text-slate-700">{fmtDate(kyc.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Documents section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-slate-800">Uploaded Documents</p>
                <span className="text-xs text-slate-400">URLs are pre-signed • 60 min expiry</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DocCard label="Aadhaar Front" url={kyc.aadhaarFrontUrl} docType="aadhaar" />
                <DocCard label="Aadhaar Back"  url={kyc.aadhaarBackUrl}  docType="aadhaar_back" />
                <DocCard label="PAN Front"     url={kyc.panFrontUrl}     docType="pan" />
                <DocCard label="Live Selfie"   url={kyc.selfieUrl}       docType="selfie" />
              </div>
            </div>

            {/* Action panel */}
            {canAct ? (
              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
                <p className="text-sm font-bold text-slate-800 mb-1">Verification Decision</p>
                <p className="text-xs text-slate-400 mb-5">Review all documents carefully before taking action. This action is logged.</p>

                {actionError && (
                  <div className="mb-4 flex items-center gap-3 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                    <XCircle size={15} className="shrink-0" />
                    {actionError}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <button type="button"
                    disabled={approve.isPending || reject.isPending}
                    onClick={handleApprove}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm shadow-emerald-200">
                    {approve.isPending
                      ? <><Loader2 size={16} className="animate-spin" /> Approving…</>
                      : <><BadgeCheck size={16} /> Approve KYC</>}
                  </button>
                  <button type="button"
                    disabled={approve.isPending || reject.isPending}
                    onClick={() => setShowRejectModal(true)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-red-200 bg-white py-3.5 text-sm font-bold text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50">
                    <ShieldX size={16} /> Reject KYC
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 flex items-center gap-3 text-sm text-slate-500">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                This KYC is already <strong className="text-slate-700">{kyc.status.replace("_", " ")}</strong>.
                {kyc.reviewer && ` Reviewed by ${kyc.reviewer.name}.`}
              </div>
            )}
          </>
        )}
      </div>

      {showRejectModal && (
        <RejectModal
          loading={reject.isPending}
          onConfirm={handleReject}
          onClose={() => setShowRejectModal(false)}
        />
      )}
    </>
  );
}
