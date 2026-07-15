"use client";

import { useState, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { TrendingUp, BarChart3 } from "lucide-react";
import type { GrowthPoint } from "@/api-client/invest";
import { formatINR, formatINRCompact } from "@/api-client/invest";

// ─── Types ────────────────────────────────────────────────────────────────────

type Range = "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL";

interface Props {
  data:     GrowthPoint[];
  loading?: boolean;
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-lg text-xs">
      <p className="text-slate-400 mb-1">
        {new Date(label).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
      </p>
      <p className="font-bold text-slate-900">{formatINR(payload[0]?.value ?? 0)}</p>
    </div>
  );
}

// ─── Range filter ─────────────────────────────────────────────────────────────

function filterByRange(data: GrowthPoint[], range: Range): GrowthPoint[] {
  if (range === "ALL" || data.length === 0) return data;
  const now   = Date.now();
  const msMap: Record<Range, number> = {
    "1W":  7   * 86_400_000,
    "1M":  30  * 86_400_000,
    "3M":  90  * 86_400_000,
    "6M":  180 * 86_400_000,
    "1Y":  365 * 86_400_000,
    "ALL": 0,
  };
  const cutoff = now - msMap[range];
  return data.filter((p) => new Date(p.date).getTime() >= cutoff);
}

const RANGES: Range[] = ["1W", "1M", "3M", "6M", "1Y", "ALL"];

// ─── Main ─────────────────────────────────────────────────────────────────────

export function PortfolioGrowthChart({ data, loading }: Props) {
  const [range, setRange] = useState<Range>("ALL");

  const filtered = useMemo(() => filterByRange(data, range), [data, range]);

  const maxVal = useMemo(
    () => filtered.reduce((m, p) => Math.max(m, p.value), 0),
    [filtered]
  );

  const growth = useMemo(() => {
    if (filtered.length < 2) return null;
    const first = filtered[0].value;
    const last  = filtered[filtered.length - 1].value;
    const pct   = first > 0 ? (((last - first) / first) * 100).toFixed(2) : "0.00";
    return { pct, positive: last >= first };
  }, [filtered]);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <TrendingUp size={15} className="text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900">Portfolio Growth</h3>
          </div>
          <p className="text-xs text-slate-400">Cumulative portfolio value over time</p>
          {growth && (
            <p className={`text-xs font-bold mt-1 ${growth.positive ? "text-emerald-600" : "text-red-500"}`}>
              {growth.positive ? "+" : ""}{growth.pct}% in selected period
            </p>
          )}
        </div>
        {/* Range selector */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                range === r
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart body */}
      {loading ? (
        <div className="mx-5 mb-5 h-56 animate-pulse rounded-xl bg-slate-50" />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-56 gap-2 mx-5 mb-5">
          <BarChart3 size={28} className="text-slate-300" />
          <p className="text-sm text-slate-400">No data for this period.</p>
        </div>
      ) : (
        <div className="px-1 pb-5">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={filtered} margin={{ top: 8, right: 12, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickFormatter={(v) =>
                  new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
                }
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
              {maxVal > 0 && (
                <ReferenceLine
                  y={maxVal}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  strokeOpacity={0.4}
                />
              )}
              <Area
                type="monotone"
                dataKey="value"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#portfolioGrad)"
                dot={false}
                activeDot={{ r: 5, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
