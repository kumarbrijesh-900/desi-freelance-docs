import type { Metadata } from "next";
import { Syne, DM_Sans, JetBrains_Mono, Outfit, Inter } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${syne.variable} ${outfit.variable} ${inter.variable} ${dmSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="theme-color" content="#F8F8FA" />
      </head>
      <body className="min-h-full flex flex-col relative overflow-x-hidden">
        {/* Global Aesthetic Grid */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-0 opacity-[0.03]">
          <div 
            style={{ 
              backgroundImage: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
              backgroundSize: "48px 48px" 
            }} 
            className="absolute inset-0"
          />
        </div>
        <div className="relative z-10 flex min-h-screen flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
