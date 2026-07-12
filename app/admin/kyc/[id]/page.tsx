"use client";

import { use, useState }          from "react";
import Link                        from "next/link";
import { useRouter }               from "next/navigation";
import {
  useAdminKycDetail, useApproveKyc, useRejectKyc, extractError,
} from "@/api-client/admin";
import {
  ArrowLeft, BadgeCheck, Loader2, ShieldX, ZoomIn,
} from "lucide-react";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Document image card ──────────────────────────────────────────────────────

function DocCard({ label, url }: { label: string; url: string | null }) {
  const [zoom, setZoom] = useState(false);
  return (
    <>
      <div className="rounded-2xl border border-slate-100 bg-slate-50 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-white">
          <p className="text-xs font-semibold text-slate-700">{label}</p>
          {url && (
            <button type="button" onClick={() => setZoom(true)}
              className="flex items-center gap-1 text-xs text-primary hover:underline">
              <ZoomIn size={12} /> View
            </button>
          )}
        </div>
        {url ? (
          <img src={url} alt={label} className="w-full h-48 object-contain p-2 cursor-pointer"
            onClick={() => setZoom(true)} />
        ) : (
          <div className="flex h-48 items-center justify-center text-xs text-slate-400">Not uploaded</div>
        )}
      </div>

      {/* Fullscreen modal */}
      {zoom && url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoom(false)}>
          <img src={url} alt={label} className="max-h-[90vh] max-w-[90vw] rounded-2xl shadow-2xl object-contain" />
          <button type="button" onClick={() => setZoom(false)}
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 text-xl">
            ✕
          </button>
        </div>
      )}
    </>
  );
}

// ─── Rejection modal ──────────────────────────────────────────────────────────

const PRESET_REASONS = [
  "Image is blurry",
  "PAN number does not match",
  "Aadhaar not readable",
  "Face does not match selfie",
  "Expired document",
  "Wrong document uploaded",
];

function RejectModal({ onConfirm, onClose, loading }: {
  onConfirm: (reason: string) => void;
  onClose:   () => void;
  loading:   boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Reject KYC</h3>
        <p className="text-sm text-slate-500">You must provide a rejection reason. This will be shown to the user.</p>

        {/* Presets */}
        <div className="flex flex-wrap gap-2">
          {PRESET_REASONS.map((r) => (
            <button key={r} type="button"
              onClick={() => setReason(r)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${reason === r ? "bg-red-500 text-white border-red-500" : "border-slate-200 text-slate-600 hover:border-red-300"}`}>
              {r}
            </button>
          ))}
        </div>

        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Type a reason or select one above..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 resize-none"
        />

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button type="button"
            disabled={!reason.trim() || loading}
            onClick={() => onConfirm(reason.trim())}
            className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Rejecting...</> : "Confirm Reject"}
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

  const handleApprove = async () => {
    setActionError(null);
    try {
      await approve.mutateAsync();
      router.push("/admin/kyc");
    } catch (err) { setActionError(extractError(err)); }
  };

  const handleReject = async (reason: string) => {
    setActionError(null);
    try {
      await reject.mutateAsync(reason);
      setShowRejectModal(false);
      router.push("/admin/kyc");
    } catch (err) { setActionError(extractError(err)); }
  };

  const canAct = kyc?.status === "IN_REVIEW" || kyc?.status === "PENDING";

  return (
    <>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        {/* Back */}
        <Link href="/admin/kyc"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft size={15} /> Back to KYC Requests
        </Link>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : !kyc ? (
          <p className="text-slate-500">KYC record not found.</p>
        ) : (
          <>
            {/* User info */}
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">User Details</p>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-white text-xl font-extrabold">
                  {kyc.user.name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">{kyc.user.name}</p>
                  <p className="text-sm text-slate-500">{kyc.user.email ?? "—"} · {kyc.user.phone ?? "—"}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Registered {fmtDate(kyc.user.createdAt)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-500">KYC Status</p>
                  <p className="text-sm font-semibold text-slate-800 capitalize">{kyc.status.replace("_", " ")}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Aadhaar Number</p>
                  <p className="text-sm font-semibold text-slate-800 font-mono">
                    {kyc.aadhaarNumber
                      ? kyc.aadhaarNumber.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3")
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">PAN Number</p>
                  <p className="text-sm font-semibold text-slate-800 font-mono tracking-widest">{kyc.panNumber ?? "—"}</p>
                </div>
              </div>

              {kyc.rejectionReason && (
                <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                  <span className="font-semibold">Rejection reason: </span>{kyc.rejectionReason}
                </div>
              )}
            </div>

            {/* Documents */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Uploaded Documents</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DocCard label="Aadhaar Front" url={kyc.aadhaarFrontUrl} />
                <DocCard label="Aadhaar Back"  url={kyc.aadhaarBackUrl} />
                <DocCard label="PAN Front"     url={kyc.panFrontUrl} />
                <DocCard label="Live Selfie"   url={kyc.selfieUrl} />
              </div>
            </div>

            {/* Actions */}
            {canAct && (
              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
                <p className="text-sm font-bold text-slate-800 mb-4">Verification Decision</p>

                {actionError && (
                  <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-700">
                    {actionError}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <button type="button"
                    disabled={approve.isPending || reject.isPending}
                    onClick={handleApprove}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50">
                    {approve.isPending
                      ? <><Loader2 size={16} className="animate-spin" /> Approving...</>
                      : <><BadgeCheck size={16} /> Approve KYC</>}
                  </button>
                  <button type="button"
                    disabled={approve.isPending || reject.isPending}
                    onClick={() => setShowRejectModal(true)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 py-3 text-sm font-bold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50">
                    <ShieldX size={16} /> Reject KYC
                  </button>
                </div>
              </div>
            )}

            {!canAct && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm text-slate-500">
                This KYC is already <strong>{kyc.status.replace("_", " ")}</strong>.
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
