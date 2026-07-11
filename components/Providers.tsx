"use client";

/**
 * Root client providers.
 * Placed here so app/layout.tsx (which is a Server Component) can import it
 * without losing server-component benefits for everything else.
 */

import { QueryClientProvider }    from "@tanstack/react-query";
import { ReactQueryDevtools }     from "@tanstack/react-query-devtools";
import { queryClient }            from "@/lib/client";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
