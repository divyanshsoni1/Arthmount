"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";

import { useUser } from "@/api-client/user";
import { type VerifyPaymentResult } from "@/api-client/wallet";
import { WalletBalanceCard }   from "@/components/wallet/WalletBalanceCard";
import { AddMoneyCard }        from "@/components/wallet/AddMoneyCard";
import { PaymentHistoryTable } from "@/components/wallet/PaymentHistoryTable";
import {
  PaymentSuccessDialog,
  PaymentFailureDialog,
} from "@/components/wallet/PaymentResultDialog";

type DialogState =
  | { kind: "none" }
  | { kind: "success"; result: VerifyPaymentResult }
  | { kind: "failure"; message: string };

export default function WalletPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });
  const [retryTrigger, setRetryTrigger] = useState(0);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!userLoading && !user) {
      router.replace("/login?next=/dashboard/wallet");
    }
  }, [user, userLoading, router]);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const handleSuccess = (result: VerifyPaymentResult) => {
    setDialog({ kind: "success", result });
  };

  const handleFailure = (message: string) => {
    setDialog({ kind: "failure", message });
  };

  const handleClose = () => setDialog({ kind: "none" });

  const handleRetry = () => {
    setDialog({ kind: "none" });
    setRetryTrigger((n) => n + 1);
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50">
        {/* Top bar */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 flex items-center gap-3">
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-none">My Wallet</h1>
            <p className="text-xs text-slate-500 mt-0.5">Manage your wallet balance</p>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">

          {/* Top grid — balance + add money */}
          <div className="grid gap-5 lg:grid-cols-2">
            <WalletBalanceCard />

            {/* key forces AddMoneyCard to remount on retry, resetting its state */}
            <AddMoneyCard
              key={retryTrigger}
              userName={user.name}
              userEmail={user.email ?? undefined}
              onSuccess={handleSuccess}
              onFailure={handleFailure}
            />
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
            <Info size={16} className="mt-0.5 shrink-0 text-blue-500" />
            <p className="text-sm text-blue-700 leading-relaxed">
              Money added to your wallet is available immediately and can be used for investments.
              Minimum recharge is <strong>₹10</strong> and maximum is <strong>₹1,00,000</strong> per transaction.
            </p>
          </div>

          {/* Payment history */}
          <PaymentHistoryTable />
        </div>
      </div>

      {/* Dialogs */}
      {dialog.kind === "success" && (
        <PaymentSuccessDialog result={dialog.result} onClose={handleClose} />
      )}
      {dialog.kind === "failure" && (
        <PaymentFailureDialog
          message={dialog.message}
          onRetry={handleRetry}
          onClose={handleClose}
        />
      )}
    </>
  );
}
