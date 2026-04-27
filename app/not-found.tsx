import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Search, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[color:var(--bg-surface)] p-6">
      <div className="max-w-md w-full text-center space-y-8 bg-white border border-[color:var(--border-subtle)] p-12 rounded-2xl shadow-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-50 text-zinc-400 mb-2">
          <Search size={32} />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-2xl font-black tracking-tight text-[#111118] uppercase">
            Void Detected
          </h1>
          <p className="text-[15px] text-[color:var(--text-muted)] leading-relaxed">
            The page you are looking for has been moved, archived, or never existed in the first place.
          </p>
        </div>

        <div className="pt-4">
          <Button 
            asChild
            className="w-full bg-[#111118] text-[#d4ff00] hover:bg-zinc-800 h-12 text-sm font-bold uppercase tracking-widest gap-2"
          >
            <Link href="/">
              <ArrowLeft size={16} />
              Return to Safety
            </Link>
          </Button>
        </div>

        <div className="pt-8 border-t border-zinc-100">
          <p className="text-[11px] text-zinc-400 font-medium uppercase tracking-[0.2em]">
            Error Code: 404
          </p>
        </div>
      </div>
    </div>
  );
}
