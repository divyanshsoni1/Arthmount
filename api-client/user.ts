/**
 * Client-side user session hooks.
 *
 * useUser     — fetches /api/auth/me with TanStack Query. Returns the
 *               authenticated user (or null) and a loading flag. Cached
 *               for the session; invalidated on logout.
 *
 * useLogout   — POSTs /api/auth/logout, clears the query cache, and
 *               redirects to "/".
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter }                              from "next/navigation";
import { apiClient }                              from "@/lib/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id:    string;
  name:  string;
  email: string | null;
  role:  string;
}

interface MeResponse {
  user: AuthUser | null;
}

// ─── Query key ────────────────────────────────────────────────────────────────

export const USER_QUERY_KEY = ["auth", "me"] as const;

// ─── useUser ─────────────────────────────────────────────────────────────────

/**
 * Returns the current authenticated user.
 *
 * { user, isLoading, isAuthenticated }
 *
 * - isLoading      true while the first fetch is in-flight (shows skeleton)
 * - isAuthenticated shorthand for user !== null
 *
 * The query never throws — a missing / expired cookie returns { user: null }.
 */
export function useUser() {
  const { data, isLoading } = useQuery<MeResponse>({
    queryKey:    USER_QUERY_KEY,
    queryFn:     async () => {
      const res = await apiClient.get<MeResponse>("/auth/me");
      return res.data;
    },
    // Keep the result fresh for the entire browser session.
    // Re-fetches automatically on window focus so a logout in another tab
    // is reflected immediately.
    staleTime:        0,
    refetchOnWindowFocus: true,
    retry:            false,
  });

  return {
    user:            data?.user ?? null,
    isLoading,
    isAuthenticated: !!data?.user,
  };
}

// ─── useLogout ────────────────────────────────────────────────────────────────

/**
 * Logs the current user out.
 *
 * 1. POSTs /api/auth/logout  →  server clears the httpOnly cookie
 * 2. Removes all TanStack Query cache   →  navbar re-renders as guest
 * 3. Redirects to "/"
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const router      = useRouter();

  return useMutation({
    mutationKey: ["auth", "logout"],
    mutationFn:  async () => {
      await apiClient.post("/auth/logout");
    },
    onSuccess: () => {
      // Clear every cached query so nothing stale leaks through
      queryClient.clear();
      router.replace("/");
    },
    onError: () => {
      // Even on network failure, wipe the local cache and redirect.
      // The cookie will expire naturally; the user is effectively logged out
      // from the client's perspective.
      queryClient.clear();
      router.replace("/");
    },
  });
}
