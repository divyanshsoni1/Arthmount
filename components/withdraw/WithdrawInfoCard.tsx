"use client";

import {
  ShieldCheck,
  Clock,
  Building2,
  Smartphone,
  AlertCircle,
  BadgeCheck,
  Zap,
  Lock,
  IndianRupee,
} from "lucide-react";

// ─── Individual info row ──────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
}: {
  icon:        React.ElementType;
  iconBg:      string;
  iconColor:   string;
  title:       string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon size={14} className={iconColor} />
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="text-xs font-bold text-slate-800">{title}</p>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ─── Processing time chip ─────────────────────────────────────────────────────

function TimeChip({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon:   React.ElementType;
  label:  string;
  value:  string;
  accent: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-center min-w-0">
      <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${accent}`}>
        <Icon size={12} className="text-white" />
      </div>
      <p className="text-[10px] text-slate-400 leading-none">{label}</p>
      <p className="text-[11px] font-extrabold text-slate-800 leading-snug">{value}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WithdrawInfoCard() {
  return (
    <div className="rounded-2xl sm:rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">

      {/* Header strip */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
            <ShieldCheck size={15} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-white leading-none">Withdrawal Info</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Processing details &amp; limits</p>
          </div>
        </div>
      </div>

      {/* Processing time grid */}
      <div className="px-5 pt-4 pb-3">
        <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Processing Times
        </p>
        <div className="grid grid-cols-2 gap-2">
          <TimeChip
            icon={Building2}
            label="Bank Transfer"
            value="1–2 business days"
            accent="bg-blue-500"
          />
          <TimeChip
            icon={Zap}
            label="UPI Transfer"
            value="Instant"
            accent="bg-violet-500"
          />
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 border-t border-slate-100" />

      {/* Info rows */}
      <div className="px-5 py-4 space-y-4">
        <InfoRow
          icon={IndianRupee}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          title="Withdrawal Limits"
          description="Minimum ₹10 per request. Maximum ₹5,00,000 per request."
        />
        <InfoRow
          icon={BadgeCheck}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          title="Bank Account Verification"
          description="Ensure your bank account details are accurate. Incorrect details may delay or fail the transfer."
        />
        <InfoRow
          icon={Smartphone}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          title="UPI ID Verification"
          description="Verify your UPI ID before submitting. Transfers to an incorrect UPI ID are non-reversible."
        />
        <InfoRow
          icon={Lock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          title="Investment Lock Period"
          description="Only fully matured investments are eligible for withdrawal. Locked plans will be available after maturity."
        />
        <InfoRow
          icon={AlertCircle}
          iconBg="bg-red-50"
          iconColor="text-red-500"
          title="Non-reversible Requests"
          description="Once submitted, withdrawal requests are processed immediately. You can cancel only while the status is Pending."
        />
      </div>

      {/* Footer badge */}
      <div className="mx-5 mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5">
        <ShieldCheck size={13} className="shrink-0 text-emerald-600" />
        <p className="text-[11px] text-emerald-700 font-medium leading-snug">
          All transactions are encrypted and processed through secure banking channels.
        </p>
      </div>
    </div>
  );
}
