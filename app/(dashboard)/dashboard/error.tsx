'use client'

import { useEffect } from 'react'

// ============================================================
// DASHBOARD ERROR BOUNDARY
// Catches errors within the dashboard layout without
// breaking the entire app shell.
// ============================================================

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[DashboardError]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
        <svg
          className="h-7 w-7 text-red-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900">Something went wrong</h2>
      <p className="mt-2 text-sm text-gray-600 text-center max-w-sm">
        We couldn&apos;t load this page. Try refreshing, or go back to the dashboard.
      </p>
      <button
        onClick={reset}
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700"
      >
        Try again
      </button>
    </div>
  )
}
