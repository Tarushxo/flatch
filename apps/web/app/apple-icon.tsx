import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brand-mark";

// The icon used when the site is added to an iPhone or iPad home screen.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#07070c",
      }}
    >
      <BrandMark size={148} />
    </div>,
    size,
  );
}
