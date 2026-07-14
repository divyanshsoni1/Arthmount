"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

// ─── Switch ───────────────────────────────────────────────────────────────────
// Built on @base-ui/react/switch, styled to match the project's emerald/slate
// design system. Uses data-checked / data-unchecked attributes for state.

function Switch({
  className,
  ...props
}: SwitchPrimitive.Root.Props & { className?: string }) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // Track
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent",
        "outline-none transition-colors duration-200 ease-in-out",
        // Focus ring
        "focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        // Unchecked state: slate-200
        "data-unchecked:bg-slate-200",
        // Checked state: emerald-500
        "data-checked:bg-emerald-500",
        // Disabled
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          // Thumb circle
          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0",
          "transition-transform duration-200 ease-in-out",
          // Position: off = translate-x-0, on = translate-x-4
          "data-unchecked:translate-x-0",
          "data-checked:translate-x-4"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
