import type { Metadata } from "next";
import { Syne, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
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
      className={`${syne.variable} ${dmSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="theme-color" content="#F8F8FA" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
