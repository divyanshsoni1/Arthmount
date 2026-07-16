"use client";

/**
 * ProfitDistributionChart — Stacked bar chart showing Invested / Profit
 * bucketed by quarter. Communicates capital deployment and returns over time.
 */

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Layers } from "lucide-react";
import type { ProfitDistributionPoint } from "@/api-client/profit-analytics";
import { formatINRCompact }             from "@/api-client/profit-analytics";

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  // payload[0] = Invested, payload[1] = Profit
  const invested = payload.find((p: any) => p.dataKey === "invested")?.value ?? 0;
  const profit   = payload.find((p: any) => p.dataKey === "profit")?.value   ?? 0;
  const total    = invested + profit;
  const roi      = invested > 0 ? ((profit / invested) * 100).toFixed(1) : "0.0";

  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-lg text-xs min-w-[155px]">
      <p className="font-bold text-slate-800 mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
            Invested
          </span>
          <span className="font-bold text-slate-700 tabular-nums">
            {formatINRCompact(invested)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
            Profit
          </span>
          <span className="font-bold text-emerald-600 tabular-nums">
            +{formatINRCompact(profit)}
          </span>
        </div>
        <div className="border-t border-slate-100 mt-1.5 pt-1.5 flex justify-between gap-4">
          <span className="text-slate-400">Total</span>
          <span className="font-bold text-slate-800 tabular-nums">
            {formatINRCompact(total)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">ROI</span>
          <span className="font-bold text-violet-600">{roi}%</span>
        </div>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  data:     ProfitDistributionPoint[];
  loading?: boolean;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ProfitDistributionChart({ data, loading }: Props) {
  // Limit to last 12 quarters for readability
  const chartData = data.slice(-12);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-0.5">
          <Layers size={15} className="text-pink-500" />
          <h3 className="text-sm font-bold text-slate-900">Profit Distribution</h3>
        </div>
        <p className="text-xs text-slate-400">
          Quarterly breakdown of capital deployed vs returns earned
        </p>
      </div>

      {loading ? (
        <div className="mx-5 mb-5 h-52 animate-pulse rounded-xl bg-slate-50" />
      ) : chartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 mx-5 mb-5">
          <Layers size={28} className="text-slate-300" />
          <p className="text-sm text-slate-400">No distribution data yet.</p>
        </div>
      ) : (
        <div className="pb-5 pr-2">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
              barSize={24}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickFormatter={(v) => formatINRCompact(Number(v))}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                iconType="circle"
                iconSize={8}
              />
              <Bar
                dataKey="invested"
                name="Invested"
                stackId="a"
                fill="#93c5fd"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="profit"
                name="Profit"
                stackId="a"
                fill="#34d399"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
