import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#080d11",
        }}
      >
        <svg width="130" height="130" viewBox="0 0 40 40">
          <path
            d="M10 28 L18 20 L30 11"
            stroke="#00d3d6"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="10" cy="28" r="2.6" fill="#00d3d6" opacity="0.55" />
          <circle cx="18" cy="20" r="2.6" fill="#00d3d6" opacity="0.8" />
          <circle cx="30" cy="11" r="3.6" fill="#00d3d6" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
