"use client";

import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { useWalletBalance, formatINR } from "@/api-client/wallet";

function Skeleton({ cls = "" }: { cls?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/20 ${cls}`} />;
}

export function WalletBalanceCard() {
  const { data, isLoading } = useWalletBalance();

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-7 text-white shadow-xl shadow-emerald-600/20">
      {/* Background decoration */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5" />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-6">
        <div>
          <p className="text-sm font-medium text-emerald-200">Available Balance</p>
          {isLoading ? (
            <Skeleton cls="mt-2 h-10 w-44" />
          ) : (
            <p className="mt-1 text-4xl font-black tracking-tight">
              {formatINR(data?.mainBalance ?? "0")}
            </p>
          )}
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
          <Wallet size={26} />
        </div>
      </div>

      {/* Stats row */}
      <div className="relative grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowDownLeft size={14} className="text-emerald-300" />
            <p className="text-xs font-medium text-emerald-200">Invested</p>
          </div>
          {isLoading ? (
            <Skeleton cls="h-5 w-24" />
          ) : (
            <p className="text-base font-bold">{formatINR(data?.investedBalance ?? "0")}</p>
          )}
        </div>

        <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowUpRight size={14} className="text-emerald-300" />
            <p className="text-xs font-medium text-emerald-200">Commission</p>
          </div>
          {isLoading ? (
            <Skeleton cls="h-5 w-24" />
          ) : (
            <p className="text-base font-bold">{formatINR(data?.commissionBalance ?? "0")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
