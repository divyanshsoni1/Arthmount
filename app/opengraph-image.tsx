/**
 * app/opengraph-image.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Default Open Graph / Twitter Card image rendered by Next.js ImageResponse.
 * Served at /opengraph-image (and /twitter-image by convention).
 *
 * Dimensions: 1200 × 630 px — optimal for all major platforms.
 */

import { ImageResponse } from "next/og";
import { SITE } from "@/lib/seo";

export const runtime = "edge";
export const alt     = `${SITE.name} — ${SITE.tagline}`;
export const size    = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width:      "100%",
          height:     "100%",
          display:    "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f2027 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position:   "relative",
          overflow:   "hidden",
        }}
      >
        {/* Background decorative circles */}
        <div
          style={{
            position:     "absolute",
            top:          "-120px",
            right:        "-120px",
            width:        "500px",
            height:       "500px",
            borderRadius: "50%",
            background:   "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position:     "absolute",
            bottom:       "-80px",
            left:         "-80px",
            width:        "400px",
            height:       "400px",
            borderRadius: "50%",
            background:   "radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 70%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display:       "flex",
            flexDirection: "column",
            alignItems:    "center",
            gap:           "28px",
            padding:       "60px",
            textAlign:     "center",
          }}
        >
          {/* Logo badge */}
          <div
            style={{
              background:   "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              borderRadius: "20px",
              padding:      "16px 36px",
              display:      "flex",
              alignItems:   "center",
              gap:          "12px",
              boxShadow:    "0 8px 32px rgba(16,185,129,0.35)",
            }}
          >
            <span style={{ fontSize: "36px", fontWeight: 900, color: "#ffffff", letterSpacing: "-1px" }}>
              Arth
            </span>
            <span style={{ fontSize: "36px", fontWeight: 900, color: "rgba(255,255,255,0.7)", letterSpacing: "-1px" }}>
              mount
            </span>
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize:   "52px",
              fontWeight: 800,
              color:      "#f1f5f9",
              lineHeight: 1.15,
              letterSpacing: "-1.5px",
              maxWidth:   "820px",
            }}
          >
            Grow Your Wealth,{" "}
            <span style={{ color: "#10b981" }}>Every Single Day</span>
          </div>

          {/* Description */}
          <div
            style={{
              fontSize:   "22px",
              color:      "rgba(148,163,184,0.9)",
              maxWidth:   "680px",
              lineHeight: 1.5,
              fontWeight: 400,
            }}
          >
            India's trusted investment platform with daily returns, bank-grade security,
            and KYC-verified accounts.
          </div>

          {/* Stats strip */}
          <div
            style={{
              display:      "flex",
              gap:          "40px",
              marginTop:    "8px",
              background:   "rgba(255,255,255,0.05)",
              border:       "1px solid rgba(16,185,129,0.2)",
              borderRadius: "16px",
              padding:      "20px 48px",
            }}
          >
            {[
              { val: "₹12Cr+",  label: "Invested"    },
              { val: "8,400+",  label: "Investors"   },
              { val: "Daily",   label: "Returns"     },
              { val: "100%",    label: "Secure"      },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}
              >
                <span style={{ fontSize: "26px", fontWeight: 800, color: "#10b981" }}>{stat.val}</span>
                <span style={{ fontSize: "13px", color: "rgba(148,163,184,0.8)", fontWeight: 500 }}>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom URL bar */}
        <div
          style={{
            position:  "absolute",
            bottom:    "32px",
            fontSize:  "16px",
            color:     "rgba(100,116,139,0.8)",
            fontWeight: 500,
            letterSpacing: "0.5px",
          }}
        >
          {SITE.url.replace("https://", "")}
        </div>
      </div>
    ),
    { ...size },
  );
}
