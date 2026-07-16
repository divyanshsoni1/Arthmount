"use client";

/**
 * ProfitTrendChart — Dual area chart showing monthly invested capital vs
 * monthly profit credited. Uses MonthlyProfitPoint[] from the analytics API.
 */

import { useState, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp } from "lucide-react";
import type { MonthlyProfitPoint } from "@/api-client/profit-analytics";
import { formatINRCompact }        from "@/api-client/profit-analytics";

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-lg text-xs min-w-[155px]">
      <p className="font-bold text-slate-700 mb-2">{label}</p>
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

// ─── View mode: amount vs ROI ─────────────────────────────────────────────────

type ViewMode = "amount" | "roi";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  data:     MonthlyProfitPoint[];
  loading?: boolean;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ProfitTrendChart({ data, loading }: Props) {
  const [mode, setMode] = useState<ViewMode>("amount");

  // Slice to the last 18 months for readability
  const chartData = useMemo(() => data.slice(-18), [data]);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <TrendingUp size={15} className="text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900">Profit Trend</h3>
          </div>
          <p className="text-xs text-slate-400">Monthly invested capital vs profit credited</p>
        </div>
        {/* View toggle */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 shrink-0">
          {(["amount", "roi"] as ViewMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-lg px-3 py-1 text-[11px] font-bold transition-all ${
                mode === m
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {m === "amount" ? "Amount" : "ROI %"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mx-5 mb-5 h-56 animate-pulse rounded-xl bg-slate-50" />
      ) : chartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-56 gap-2 mx-5 mb-5">
          <TrendingUp size={28} className="text-slate-300" />
          <p className="text-sm text-slate-400">No monthly trend data yet.</p>
        </div>
      ) : mode === "amount" ? (
        <div className="px-1 pb-5">
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -6 }}>
              <defs>
                <linearGradient id="paInvestedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="paProfitGrad" x1="0" y1="0" x2="0" y2="1">
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
                width={52}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                iconType="circle"
                iconSize={8}
              />
              <Area
                type="monotone"
                dataKey="invested"
                name="Invested"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#paInvestedGrad)"
                dot={false}
                activeDot={{ r: 4, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="profit"
                name="Profit"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#paProfitGrad)"
                dot={false}
                activeDot={{ r: 4, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        /* ROI % view */
        <div className="px-1 pb-5">
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -6 }}>
              <defs>
                <linearGradient id="paRoiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}    />
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
                tickFormatter={(v) => `${v}%`}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-lg text-xs">
                      <p className="font-bold text-slate-700 mb-1">{label}</p>
                      <p className="text-violet-600 font-bold">{payload[0]?.value}% ROI</p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="roi"
                name="Monthly ROI %"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                fill="url(#paRoiGrad)"
                dot={false}
                activeDot={{ r: 4, fill: "#8b5cf6", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
