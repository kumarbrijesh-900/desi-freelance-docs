import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Space_Grotesk, Hanken_Grotesk, Space_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/AppToast";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"]
});

const sans = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"]
});

const mono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "700"]
});

export const metadata: Metadata = {
  title: "Lance — Smart Invoice Generator for Indian Freelancers",
  description:
    "Turn a client brief into a GST-compliant invoice in under 10 seconds. Smart extraction, CGST/SGST/IGST calculations, and one-click PDF export.",
  keywords: [
    "invoice generator",
    "freelance invoice",
    "GST invoice",
    "Indian freelancer",
    "smart invoice",
  ],
  openGraph: {
    title: "Lance — Invoices in 10 Seconds",
    description:
      "Describe your project. Get a perfect, tax-compliant invoice. Built for Indian freelancers.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f2ebd8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html
        lang="en"
        data-scroll-behavior="smooth"
        className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
      >
      <head>
        <meta name="theme-color" content="#0e0f0c" />
      </head>
      <body data-theme="cockpit" className="min-h-full flex flex-col relative bg-[color:var(--color-paper)] text-[color:var(--color-ink)]">
        <ToastProvider>
          {/* Global Aesthetic Background */}
          <div className="relative z-10 flex min-h-screen flex-col">
            {children}
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
