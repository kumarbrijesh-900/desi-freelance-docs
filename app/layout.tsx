import type { Metadata } from "next";
import "./globals.css";
import { Fraunces, JetBrains_Mono, Caveat } from "next/font/google";
import { ToastProvider } from "@/components/ui/AppToast";

const fraunces = Fraunces({ 
  subsets: ["latin"], 
  variable: "--font-display", 
  weight: ["500", "600", "700"] 
});

const mono = JetBrains_Mono({ 
  subsets: ["latin"], 
  variable: "--font-mono", 
  weight: ["400", "500", "600", "700"] 
});

const caveat = Caveat({ 
  subsets: ["latin"], 
  variable: "--font-hand", 
  weight: ["500", "600"] 
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
      className={`${fraunces.variable} ${mono.variable} ${caveat.variable} h-full antialiased`}
    >
      <head>
        <meta name="theme-color" content="#F8F8FA" />
      </head>
      <body className="min-h-full flex flex-col relative">
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
