/**
 * TransactionIcon — maps TxnType + entryType to a styled icon container.
 * Keeps all icon/color logic in one place.
 */

import {
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  Gift,
  RotateCcw,
  AlertTriangle,
  ArrowLeftRight,
  SlidersHorizontal,
  CircleDollarSign,
} from "lucide-react";
import type { TxnType, TxnEntryType } from "@/api-client/transactions";

interface IconConfig {
  icon:    React.ElementType;
  bgCls:   string;
  textCls: string;
}

const TYPE_CONFIG: Record<TxnType, IconConfig> = {
  DEPOSIT:    { icon: ArrowDownLeft,     bgCls: "bg-emerald-100", textCls: "text-emerald-600" },
  WITHDRAWAL: { icon: ArrowUpRight,      bgCls: "bg-orange-100",  textCls: "text-orange-600"  },
  INVESTMENT: { icon: TrendingUp,        bgCls: "bg-blue-100",    textCls: "text-blue-600"    },
  PROFIT:     { icon: CircleDollarSign,  bgCls: "bg-emerald-100", textCls: "text-emerald-600" },
  COMMISSION: { icon: Sparkles,          bgCls: "bg-violet-100",  textCls: "text-violet-600"  },
  BONUS:      { icon: Gift,              bgCls: "bg-pink-100",    textCls: "text-pink-600"    },
  REFUND:     { icon: RotateCcw,         bgCls: "bg-indigo-100",  textCls: "text-indigo-600"  },
  PENALTY:    { icon: AlertTriangle,     bgCls: "bg-red-100",     textCls: "text-red-600"     },
  ADJUSTMENT: { icon: SlidersHorizontal, bgCls: "bg-slate-100",   textCls: "text-slate-600"   },
  TRANSFER:   { icon: ArrowLeftRight,    bgCls: "bg-cyan-100",    textCls: "text-cyan-600"    },
};

// Debit overrides — make the same type look slightly different when money leaves
const DEBIT_OVERRIDES: Partial<Record<TxnType, Partial<IconConfig>>> = {
  INVESTMENT: { bgCls: "bg-blue-100",   textCls: "text-blue-600"   },
  ADJUSTMENT: { bgCls: "bg-amber-100",  textCls: "text-amber-600"  },
};

interface Props {
  type:      TxnType;
  entryType: TxnEntryType;
  size?:     "sm" | "md" | "lg";
}

export function TransactionIcon({ type, entryType, size = "md" }: Props) {
  const base     = TYPE_CONFIG[type] ?? TYPE_CONFIG.ADJUSTMENT;
  const override = entryType === "DEBIT" ? (DEBIT_OVERRIDES[type] ?? {}) : {};
  const cfg      = { ...base, ...override };
  const Icon     = cfg.icon;

  const containerSize =
    size === "sm" ? "h-8 w-8"  :
    size === "lg" ? "h-12 w-12" :
    "h-10 w-10";

  const iconSize =
    size === "sm" ? 14 :
    size === "lg" ? 22 :
    17;

  return (
    <div
      className={`
        flex shrink-0 items-center justify-center rounded-xl
        ${containerSize} ${cfg.bgCls}
      `}
    >
      <Icon size={iconSize} className={cfg.textCls} />
    </div>
  );
}
