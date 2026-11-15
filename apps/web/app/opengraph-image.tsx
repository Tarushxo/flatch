import { APP_NAME, APP_TAGLINE } from "@repo/shared";
import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brand-mark";

// The preview image shown when a link to the site is shared.
export const alt = `${APP_NAME}: ${APP_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 90px",
        color: "#f4f4f8",
        background:
          "radial-gradient(circle at 15% 10%, rgba(139,92,255,0.45), transparent 55%), radial-gradient(circle at 90% 95%, rgba(255,61,166,0.35), transparent 55%), #07070c",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
        <div
          style={{
            fontSize: 54,
            fontWeight: 700,
            color: "#ffd9ee",
            textShadow: "0 0 12px #ff3da6, 0 0 40px #ff3da6",
          }}
        >
          {APP_NAME}
        </div>
        <div style={{ marginTop: 28, fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>
          {APP_TAGLINE}
        </div>
        <div style={{ marginTop: 28, fontSize: 30, color: "#a3a3ba" }}>
          Swipe through flats. Match with flatmates.
        </div>
      </div>
      <BrandMark size={300} />
    </div>,
    size,
  );
}
