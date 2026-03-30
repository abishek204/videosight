"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

export default function VideoError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[VideoError] Suppressed error:", error?.message);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto h-16 w-16 bg-orange-50 rounded-2xl flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-orange-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tight">Video Analysis Error</h2>
          <p className="text-gray-500 text-sm font-medium">
            We had trouble analyzing this video. This can happen with certain videos.
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
            New Video
          </Link>
        </div>
      </div>
    </div>
  );
}
