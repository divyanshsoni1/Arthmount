"use client";

import { useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { PieChartIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { PackagePerformance } from "@/api-client/invest";
import { formatINRCompact } from "@/api-client/invest";

// ─── Palette ──────────────────────────────────────────────────────────────────

const COLORS = [
  "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b",
  "#ef4444", "#06b6d4", "#ec4899", "#84cc16",
  "#f97316", "#6366f1",
];

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as PackagePerformance & { fill: string; percent: number };
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-lg text-xs min-w-[140px]">
      <p className="font-bold text-slate-900 mb-1">{p.packageName}</p>
      <p className="text-slate-500">Invested: <span className="font-bold text-slate-800">{formatINRCompact(p.invested)}</span></p>
      <p className="text-emerald-600">Profit: <span className="font-bold">+{formatINRCompact(p.profit)}</span></p>
      <p className="text-slate-400 mt-1">{p.roi}% ROI · {(p.percent * 100).toFixed(1)}% of portfolio</p>
    </div>
  );
}

// ─── Custom label ─────────────────────────────────────────────────────────────

function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.06) return null; // hide tiny slices
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight="700">
      {(percent * 100).toFixed(0)}%
    </text>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  data:     PackagePerformance[];
  loading?: boolean;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function InvestmentDistributionChart({ data, loading }: Props) {
  const router = useRouter();
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const totalInvested = data.reduce((s, p) => s + p.invested, 0);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-100 mb-4" />
        <div className="h-52 animate-pulse rounded-xl bg-slate-50" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <PieChartIcon size={15} className="text-blue-500" />
            <h3 className="text-sm font-bold text-slate-900">Investment Distribution</h3>
          </div>
          <p className="text-xs text-slate-400">Click a slice to view package details</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-52 gap-2 mx-5 mb-5">
          <PieChartIcon size={28} className="text-slate-300" />
          <p className="text-sm text-slate-400">No investment data yet.</p>
        </div>
      ) : (
        <div className="pb-5">
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                dataKey="invested"
                nameKey="packageName"
                labelLine={false}
                label={<CustomLabel />}
                onMouseEnter={(_, idx) => setActiveIdx(idx)}
                onMouseLeave={() => setActiveIdx(null)}
                onClick={() => {
                  router.push(`/dashboard/invest`);
                }}
                style={{ cursor: "pointer" }}
              >
                {data.map((_, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={COLORS[idx % COLORS.length]}
                    stroke={activeIdx === idx ? "#fff" : "transparent"}
                    strokeWidth={activeIdx === idx ? 3 : 0}
                    opacity={activeIdx === null || activeIdx === idx ? 1 : 0.65}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend list */}
          <div className="px-5 space-y-2 mt-1">
            {data.map((pkg, idx) => {
              const pct = totalInvested > 0 ? ((pkg.invested / totalInvested) * 100).toFixed(1) : "0.0";
              return (
                <div key={pkg.packageId} className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: COLORS[idx % COLORS.length] }}
                  />
                  <span className="flex-1 text-xs text-slate-700 truncate font-medium">{pkg.packageName}</span>
                  <span className="text-[11px] text-slate-400 tabular-nums">{pct}%</span>
                  <span className="text-[11px] font-bold text-slate-700 tabular-nums">
                    {formatINRCompact(pkg.invested)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
