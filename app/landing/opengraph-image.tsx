import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Chidi — Run your entire business through chat"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

/**
 * /landing-specific OG image. Differs from the root OG: leans on the actual
 * landing headline ("Run your entire business through chat"), surfaces the
 * Telegram-first launch line, and uses the warm-paper carousel chrome to
 * signal product personality the moment the link previews in WhatsApp.
 */
export default async function LandingOG() {
  return new ImageResponse(
    (
      <div
        style={{
          background:
            "linear-gradient(135deg, #F7F5F3 0%, #F0EEEB 45%, #F5E6D8 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "72px 80px",
          fontFamily: "Georgia, serif",
          color: "#37322F",
          position: "relative",
        }}
      >
        {/* Decorative warm orb (top-right) */}
        <div
          style={{
            position: "absolute",
            top: -260,
            right: -240,
            width: 720,
            height: 720,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(232, 163, 61, 0.32) 0%, rgba(232, 163, 61, 0) 65%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -180,
            left: -180,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(91, 138, 114, 0.18) 0%, rgba(91, 138, 114, 0) 70%)",
            display: "flex",
          }}
        />

        {/* Brand mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: "auto",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "#37322F",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              color: "#F7F5F3",
              fontFamily: "Georgia, serif",
            }}
          >
            c
          </div>
          <span
            style={{
              fontSize: 30,
              color: "#37322F",
              letterSpacing: "-0.02em",
              fontFamily: "Georgia, serif",
            }}
          >
            chidi
          </span>
        </div>

        {/* Eyebrow */}
        <div
          style={{
            fontSize: 22,
            color: "#605A57",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            marginBottom: 28,
            display: "flex",
          }}
        >
          AI assistant for chat commerce · Lagos, Africa
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 96,
            lineHeight: 1.02,
            letterSpacing: "-0.025em",
            color: "#37322F",
            maxWidth: 980,
            display: "flex",
            flexDirection: "column",
            fontFamily: "Georgia, serif",
            marginBottom: 32,
          }}
        >
          Run your entire business
          <span style={{ display: "flex" }}>through chat.</span>
        </div>

        {/* Footer line — Telegram launch signal */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 24,
              color: "#605A57",
              fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 9999,
                background: "#0088CC",
                display: "flex",
              }}
            />
            Launching with Telegram · WhatsApp + Instagram next
          </div>
          <div
            style={{
              fontSize: 22,
              color: "#37322F",
              fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
              opacity: 0.6,
              display: "flex",
            }}
          >
            chidi.app
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
