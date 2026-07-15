"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, LabelList,
} from "recharts";
import { Target } from "lucide-react";
import type { PackagePerformance } from "@/api-client/invest";

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as PackagePerformance;
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-lg text-xs min-w-[150px]">
      <p className="font-bold text-slate-900 mb-1">{d.packageName}</p>
      <p className="text-slate-500">ROI: <span className={`font-bold ${d.roi >= 0 ? "text-emerald-600" : "text-red-500"}`}>{d.roi >= 0 ? "+" : ""}{d.roi}%</span></p>
      <p className="text-slate-400">{d.dailyReturnRate}%/day · {d.tenureDays}d tenure</p>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBarColor(roi: number): string {
  if (roi >= 50)  return "#10b981";
  if (roi >= 20)  return "#3b82f6";
  if (roi >= 0)   return "#8b5cf6";
  return "#ef4444";
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  data:     PackagePerformance[];
  loading?: boolean;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function RoiComparisonChart({ data, loading }: Props) {
  const chartData = [...data]
    .sort((a, b) => b.roi - a.roi)
    .map((pkg) => ({
      ...pkg,
      name: pkg.packageName.length > 16 ? pkg.packageName.slice(0, 14) + "…" : pkg.packageName,
    }));

  const chartHeight = Math.max(200, chartData.length * 44 + 60);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-0.5">
          <Target size={15} className="text-amber-500" />
          <h3 className="text-sm font-bold text-slate-900">ROI Comparison</h3>
        </div>
        <p className="text-xs text-slate-400">Return on investment per package (highest first)</p>
      </div>

      {loading ? (
        <div className="mx-5 mb-5 h-48 animate-pulse rounded-xl bg-slate-50" />
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 mx-5 mb-5">
          <Target size={28} className="text-slate-300" />
          <p className="text-sm text-slate-400">No ROI data yet.</p>
        </div>
      ) : (
        <div className="px-1 pb-5">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 4, right: 48, bottom: 4, left: 8 }}
              barSize={20}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickFormatter={(v) => `${v}%`}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "#475569" }}
                axisLine={false}
                tickLine={false}
                width={100}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(241,245,249,0.8)" }} />
              <Bar dataKey="roi" radius={[0, 4, 4, 0]}>
                <LabelList
                  dataKey="roi"
                  position="right"
                  formatter={(v: any) => `${Number(v) >= 0 ? "+" : ""}${Number(v)}%`}
                  style={{ fontSize: 10, fontWeight: 700, fill: "#64748b" }}
                />
                {chartData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={getBarColor(entry.roi)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
