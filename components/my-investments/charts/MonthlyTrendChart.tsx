"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Activity } from "lucide-react";
import type { MonthlyTrendPoint } from "@/api-client/invest";
import { formatINRCompact } from "@/api-client/invest";

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-lg text-xs min-w-[140px]">
      <p className="font-bold text-slate-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-3 mb-0.5">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </span>
          <span className="font-bold text-slate-800">{formatINRCompact(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  data:     MonthlyTrendPoint[];
  loading?: boolean;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function MonthlyTrendChart({ data, loading }: Props) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-0.5">
          <Activity size={15} className="text-pink-500" />
          <h3 className="text-sm font-bold text-slate-900">Monthly Trend</h3>
        </div>
        <p className="text-xs text-slate-400">Monthly investments vs returns over the last 12 months</p>
      </div>

      {loading ? (
        <div className="mx-5 mb-5 h-56 animate-pulse rounded-xl bg-slate-50" />
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-56 gap-2 mx-5 mb-5">
          <Activity size={28} className="text-slate-300" />
          <p className="text-sm text-slate-400">No monthly data yet.</p>
        </div>
      ) : (
        <div className="px-1 pb-5">
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="investedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="returnsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickFormatter={(v) => formatINRCompact(Number(v))}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              <Area
                type="monotone"
                dataKey="invested"
                name="Invested"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#investedGrad)"
                dot={false}
                activeDot={{ r: 4, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="returns"
                name="Returns"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#returnsGrad)"
                dot={false}
                activeDot={{ r: 4, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
