import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Chidi — your assistant for selling on WhatsApp"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

/**
 * Open Graph image rendered server-side at edge. Shows up when a Chidi link
 * is shared in iMessage, WhatsApp, Slack, Twitter, etc.
 *
 * Designed to read in 800ms in a feed: warm paper background, big serif
 * headline, the win-color sparkle, simple footer line.
 */
export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #F7F5F3 0%, #F0EEEB 50%, #EDE8E1 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "80px",
          fontFamily: "Georgia, serif",
          color: "#37322F",
          position: "relative",
        }}
      >
        {/* Warm orb in upper right */}
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -200,
            width: 600,
            height: 600,
            borderRadius: 9999,
            background: "radial-gradient(circle, rgba(232, 163, 61, 0.18) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Brand mark */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "auto" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#37322F",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              color: "#F7F5F3",
              fontFamily: "Georgia, serif",
            }}
          >
            c
          </div>
          <span style={{ fontSize: 32, color: "#37322F", letterSpacing: "-0.02em" }}>chidi</span>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 900 }}>
          <div
            style={{
              fontSize: 28,
              color: "#605A57",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9999,
                background: "rgba(232, 163, 61, 0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#E8A33D",
                fontSize: 22,
              }}
            >
              ✦
            </div>
            Built for the people who sell on WhatsApp
          </div>

          <div
            style={{
              fontSize: 96,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: "#37322F",
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            Your assistant for selling on WhatsApp.
          </div>
        </div>

        {/* Footer line */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            color: "#605A57",
            fontSize: 22,
            fontFamily: "system-ui",
          }}
        >
          <span style={{ fontStyle: "italic" }}>
            Replies to your customers · Tracks every order · Learns your business
          </span>
          <span style={{ fontSize: 18, color: "#8A8380" }}>Lagos · Accra · Nairobi</span>
        </div>
      </div>
    ),
    { ...size },
  )
}
