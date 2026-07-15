/**
 * TransactionStatusBadge — pill badge with dot indicator for any unified status.
 * Consumes STATUS_CONFIG from api-client/transactions.ts.
 */

import { STATUS_CONFIG } from "@/api-client/transactions";

interface Props {
  status: string;
  size?: "sm" | "md";
}

export function TransactionStatusBadge({ status, size = "md" }: Props) {
  const cfg = STATUS_CONFIG[status] ?? {
    label:    status,
    textCls:  "text-slate-500",
    bgCls:    "bg-slate-50 border-slate-200",
    dotColor: "bg-slate-400",
  };

  const textSize  = size === "sm" ? "text-[10px]" : "text-[11px]";
  const dotSize   = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";
  const padding   = size === "sm" ? "px-2 py-0.5 gap-1"  : "px-2.5 py-1 gap-1.5";

  return (
    <span
      className={`
        inline-flex items-center rounded-full border font-semibold
        ${textSize} ${padding} ${cfg.bgCls} ${cfg.textCls}
      `}
    >
      <span className={`rounded-full shrink-0 ${dotSize} ${cfg.dotColor}`} />
      {cfg.label}
    </span>
  );
}
