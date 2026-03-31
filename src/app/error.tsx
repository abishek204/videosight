"use client";

import { useEffect, useState } from "react";
import { AlertCircle, RefreshCcw, Home, Loader2 } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [autoRetrying, setAutoRetrying] = useState(true);

  useEffect(() => {
    console.error("[GlobalError] Caught error:", error?.message);
    
    // Auto-retry once after 1.5 seconds
    const timer = setTimeout(() => {
      setAutoRetrying(false);
      reset();
    }, 1500);

    return () => clearTimeout(timer);
  }, [error, reset]);

  if (autoRetrying) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-black/40" />
          <p className="text-sm text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tight">Something went wrong</h2>
          <p className="text-gray-500 text-sm font-medium">
            An unexpected error occurred. Please try again.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-bold rounded-lg hover:bg-black/90 transition-colors"
          >
            <RefreshCcw className="h-4 w-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
