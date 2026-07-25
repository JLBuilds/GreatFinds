import type { Metadata, Viewport } from "next";
import { Fraunces, Ubuntu } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const ubuntu = Ubuntu({
  variable: "--font-ubuntu",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "GreatFind",
    template: "%s · GreatFind",
  },
  description:
    "Every restaurant anyone's ever recommended to you — saved, mapped, and ready for 'where should we eat?'",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon-167.png", sizes: "167x167", type: "image/png" },
      { url: "/apple-touch-icon-152.png", sizes: "152x152", type: "image/png" },
      { url: "/apple-touch-icon-120.png", sizes: "120x120", type: "image/png" },
    ],
  },
  appleWebApp: {
    // Tells iOS this is a PWA — launched from home screen, Safari chrome
    // is hidden and the app runs in standalone mode.
    capable: true,
    statusBarStyle: "default",
    title: "GreatFind",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#23503A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${ubuntu.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body bg-cream text-basil">
        {children}
      </body>
    </html>
  );
}
