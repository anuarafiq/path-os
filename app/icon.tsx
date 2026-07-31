import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
        <svg width="24" height="24" viewBox="0 0 40 40">
          <path
            d="M10 28 L18 20 L30 11"
            stroke="#00d3d6"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="10" cy="28" r="3" fill="#00d3d6" opacity="0.55" />
          <circle cx="18" cy="20" r="3" fill="#00d3d6" opacity="0.8" />
          <circle cx="30" cy="11" r="4" fill="#00d3d6" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
