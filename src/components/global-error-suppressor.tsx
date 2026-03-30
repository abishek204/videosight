"use client";

import { useEffect } from "react";

/**
 * Global error suppressor that catches uncaught errors and unhandled promise rejections.
 * Prevents the generic "Application error: a client-side exception has occurred" message
 * from showing in production on Vercel.
 */
export function GlobalErrorSuppressor() {
  useEffect(() => {
    // Catch uncaught errors
    const handleError = (event: ErrorEvent) => {
      console.error("[GlobalErrorSuppressor] Uncaught error:", event.message);
      event.preventDefault(); // Suppress the error from crashing the page
    };

    // Catch unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("[GlobalErrorSuppressor] Unhandled rejection:", event.reason);
      event.preventDefault(); // Suppress the rejection from crashing the page
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
