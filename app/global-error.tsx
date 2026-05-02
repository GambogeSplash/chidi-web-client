"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

/**
 * Global error boundary — catches errors that escape every other layer,
 * including the layout itself. This file MUST render its own <html> + <body>.
 *
 * Reports to Sentry, then renders a Chidi-voice fallback. No fancy fonts here
 * because layout.tsx didn't get to run.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          background: "#F7F5F3",
          color: "#37322F",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 440 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 9999,
              background: "#37322F",
              color: "#F7F5F3",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                d="M19 6.5C17 4.5 14.5 3.5 12 3.5C7.3 3.5 3.5 7.3 3.5 12C3.5 16.7 7.3 20.5 12 20.5C14.5 20.5 17 19.5 19 17.5"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#8A8380",
              margin: "0 0 8px",
              fontWeight: 500,
            }}
          >
            Big hiccup
          </p>
          <h1
            style={{
              fontFamily: "'Instrument Serif', ui-serif, Georgia, serif",
              fontSize: 28,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              margin: "0 0 12px",
            }}
          >
            That's on me — let me try again.
          </h1>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.55,
              color: "#605A57",
              margin: "0 0 28px",
              fontWeight: 500,
            }}
          >
            Something tripped me up at the foundation. Reload should sort it. If it doesn't, refreshing the page will.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#37322F",
              color: "#F7F5F3",
              border: "none",
              padding: "12px 24px",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 2px rgba(0,0,0,0.12)",
            }}
          >
            Reload
          </button>
          {error.digest && (
            <p
              style={{
                fontSize: 10,
                color: "#8A8380",
                marginTop: 28,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            >
              ref · {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
