"use client";

/**
 * PackageProfitChart — Grouped bar chart comparing Invested / Current Value / Profit
 * per package. Bars are clickable → navigates to /dashboard/my-investments (package view).
 */

import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";
import { BarChart3 } from "lucide-react";
import type { PackageAnalyticsRow } from "@/api-client/profit-analytics";
import { formatINRCompact }         from "@/api-client/profit-analytics";

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-lg text-xs min-w-[170px]">
      <p className="font-bold text-slate-800 mb-2 truncate max-w-[160px]">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4 mb-1">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-bold text-slate-800 tabular-nums">
            {formatINRCompact(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  data:     PackageAnalyticsRow[];
  loading?: boolean;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function PackageProfitChart({ data, loading }: Props) {
  const router = useRouter();

  const chartData = data.map((p) => ({
    name:         p.packageName.length > 14 ? p.packageName.slice(0, 12) + "…" : p.packageName,
    fullName:     p.packageName,
    packageId:    p.packageId,
    "Invested":   parseFloat(p.invested.toFixed(2)),
    "Value":      parseFloat(p.currentValue.toFixed(2)),
    "Profit":     parseFloat(p.profit.toFixed(2)),
  }));

  const chartH = Math.max(240, chartData.length * 56 + 60);

  const handleBarClick = (pkgData: any) => {
    if (pkgData?.activePayload?.[0]?.payload?.packageId) {
      router.push(`/dashboard/my-investments`);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-0.5">
          <BarChart3 size={15} className="text-violet-500" />
          <h3 className="text-sm font-bold text-slate-900">Package-wise Performance</h3>
        </div>
        <p className="text-xs text-slate-400">
          Invested · Current Value · Profit per package — click any bar to view investments
        </p>
      </div>

      {loading ? (
        <div className="mx-5 mb-5 h-56 animate-pulse rounded-xl bg-slate-50" />
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 mx-5 mb-5">
          <BarChart3 size={28} className="text-slate-300" />
          <p className="text-sm text-slate-400">No package data yet.</p>
        </div>
      ) : (
        <div className="pb-5 pr-2">
          <ResponsiveContainer width="100%" height={chartH}>
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
              barGap={3}
              barCategoryGap="28%"
              onClick={handleBarClick}
              style={{ cursor: "pointer" }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="name"
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
                wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                iconType="circle"
                iconSize={8}
              />
              <Bar dataKey="Invested"   fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="Value"      fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="Profit"     fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
