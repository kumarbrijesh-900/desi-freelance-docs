"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("APPLICATION_CRITICAL_ERROR:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[color:var(--bg-surface)] p-6">
      <div className="max-w-md w-full text-center space-y-8 bg-white border border-[color:var(--border-subtle)] p-12 rounded-2xl shadow-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 text-red-600 mb-2">
          <AlertCircle size={32} />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-2xl font-black tracking-tight text-[#111118] uppercase">
            System Turbulence
          </h1>
          <p className="text-[15px] text-[color:var(--text-muted)] leading-relaxed">
            Something went wrong while processing your request. Our engineering team has been notified.
          </p>
          {error.digest && (
            <p className="text-[10px] font-mono text-zinc-400 bg-zinc-50 py-1 px-2 rounded inline-block">
              Ref ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <Button 
            onClick={() => reset()}
            className="w-full bg-[#111118] text-[#d4ff00] hover:bg-zinc-800 h-12 text-sm font-bold uppercase tracking-widest gap-2"
          >
            <RefreshCcw size={16} />
            Attempt Recovery
          </Button>
          
          <Button 
            asChild
            variant="outline"
            className="w-full h-12 text-sm font-bold uppercase tracking-widest gap-2 border-[color:var(--border-subtle)]"
          >
            <Link href="/">
              <Home size={16} />
              Return Home
            </Link>
          </Button>
        </div>

        <p className="text-[11px] text-zinc-400 font-medium">
          If this persists, please contact support@lanceinvoice.xyz
        </p>
      </div>
    </div>
  );
}
