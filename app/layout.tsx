import type { Metadata, Viewport } from "next";
import { Geist, Bricolage_Grotesque } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Path OS — Navigate Your Career",
  description:
    "See realistic career paths, understand trade-offs, and connect with opportunities across Asia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${bricolage.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <svg aria-hidden="true" className="hidden" focusable="false">
          <title>Liquid glass filter</title>
          <defs>
            <filter
              colorInterpolationFilters="sRGB"
              height="200%"
              id="liquid-glass"
              width="200%"
              x="-50%"
              y="-50%"
            >
              <feTurbulence
                baseFrequency="0.05 0.05"
                numOctaves="1"
                result="turbulence"
                seed="1"
                type="fractalNoise"
              />
              <feGaussianBlur in="turbulence" result="blurredNoise" stdDeviation="2" />
              <feDisplacementMap
                in="SourceGraphic"
                in2="blurredNoise"
                result="displaced"
                scale="30"
                xChannelSelector="R"
                yChannelSelector="B"
              />
              <feGaussianBlur in="displaced" result="finalBlur" stdDeviation="4" />
              <feComposite in="finalBlur" in2="finalBlur" operator="over" />
            </filter>
          </defs>
        </svg>
        {/* Raw, unprocessed CSS: Tailwind's Lightning CSS build strips `backdrop-filter: url(...)`
            when it goes through globals.css, so this rule bypasses that pipeline entirely. */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .glass {
                position: relative;
                background-color: color-mix(in oklch, var(--card) 30%, transparent);
                backdrop-filter: url("#liquid-glass");
                -webkit-backdrop-filter: url("#liquid-glass");
                box-shadow:
                  inset 1px 1px 0 -0.5px oklch(0 0 0 / 0.35),
                  inset -1px -1px 0 -0.5px oklch(0 0 0 / 0.3),
                  inset 0 0 4px 4px oklch(0 0 0 / 0.05),
                  0 2px 6px oklch(0.16 0.004 258 / 0.08);
              }
              .dark .glass {
                box-shadow:
                  inset 1px 1px 0 -0.5px oklch(1 0 0 / 0.35),
                  inset -1px -1px 0 -0.5px oklch(1 0 0 / 0.3),
                  inset 0 0 4px 4px oklch(1 0 0 / 0.06),
                  0 2px 6px oklch(0 0 0 / 0.3);
              }
            `,
          }}
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
