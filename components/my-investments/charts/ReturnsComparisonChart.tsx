"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";
import { BarChart3 } from "lucide-react";
import type { PackagePerformance } from "@/api-client/invest";
import { formatINRCompact } from "@/api-client/invest";

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-lg text-xs min-w-[160px]">
      <p className="font-bold text-slate-900 mb-2 truncate max-w-[150px]">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-3 mb-0.5">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: p.fill }} />
            <span className="text-slate-500 capitalize">{p.name}</span>
          </span>
          <span className="font-bold text-slate-800">{formatINRCompact(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  data:     PackagePerformance[];
  loading?: boolean;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ReturnsComparisonChart({ data, loading }: Props) {
  const chartData = data.map((pkg) => ({
    name:         pkg.packageName.length > 14 ? pkg.packageName.slice(0, 12) + "…" : pkg.packageName,
    fullName:     pkg.packageName,
    Invested:     pkg.invested,
    "Current Value": pkg.currentValue,
    Profit:       pkg.profit,
  }));

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-0.5">
          <BarChart3 size={15} className="text-violet-500" />
          <h3 className="text-sm font-bold text-slate-900">Returns Comparison</h3>
        </div>
        <p className="text-xs text-slate-400">Invested vs Current Value vs Profit per package</p>
      </div>

      {loading ? (
        <div className="mx-5 mb-5 h-56 animate-pulse rounded-xl bg-slate-50" />
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-56 gap-2 mx-5 mb-5">
          <BarChart3 size={28} className="text-slate-300" />
          <p className="text-sm text-slate-400">No data to compare.</p>
        </div>
      ) : (
        <div className="px-1 pb-5">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 20, left: -10 }} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                angle={-20}
                textAnchor="end"
                height={40}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickFormatter={(v) => formatINRCompact(Number(v))}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(241,245,249,0.8)" }} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              <Bar dataKey="Invested"      fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Current Value" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Profit"        fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
