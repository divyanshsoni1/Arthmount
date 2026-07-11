"use client";

import { User } from "lucide-react";

interface UserAvatarProps {
  name:      string | null | undefined;
  /** Diameter in px — defaults to 36 */
  size?:     number;
  className?: string;
}

/**
 * Circular avatar that shows:
 *   • First letter of the user's name (uppercase, white) on a primary-colour
 *     background when a name is available.
 *   • A neutral User icon when the name is empty / undefined.
 *
 * Pure presentational — no data fetching, no side effects.
 */
export function UserAvatar({ name, size = 36, className = "" }: UserAvatarProps) {
  const initial = name?.trim()?.[0]?.toUpperCase();

  return (
    <span
      className={[
        "inline-flex shrink-0 select-none items-center justify-center",
        "rounded-full bg-primary text-white font-semibold",
        "ring-2 ring-white ring-offset-1",
        className,
      ].join(" ")}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      aria-hidden="true"
    >
      {initial ? (
        initial
      ) : (
        <User
          style={{ width: Math.round(size * 0.5), height: Math.round(size * 0.5) }}
          strokeWidth={2.5}
        />
      )}
    </span>
  );
}
