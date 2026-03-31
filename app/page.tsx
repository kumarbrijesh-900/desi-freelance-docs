"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import LogoutButton from "@/components/LogoutButton";
import { ArrowRightIcon } from "@/components/ui/app-icons";
import { MotionReveal } from "@/components/ui/motion-primitives";
import { getAppButtonClass } from "@/lib/ui-foundation";
import { supabase } from "@/lib/supabase/client";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <main className="min-h-screen bg-gray-50">
      <AppHeader rightSlot={isLoggedIn ? <LogoutButton /> : null} />

      <section className="mx-auto flex max-w-6xl flex-col items-center px-6 py-20 text-center">
        <MotionReveal preset="fade-up" className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-gray-500">
            Freelance document workflow
          </p>

          <h1 className="mt-4 text-5xl font-bold tracking-tight text-black">
            Create invoices and scope documents faster
          </h1>

          <p className="mt-6 text-lg text-gray-600">
            Turn a raw client brief into structured freelance documents with
            guided inputs, licensing controls, and quick generation flows.
          </p>

          <div className="mt-10 flex justify-center">
            <Link
              href={isLoggedIn ? "/invoice/new" : "/login"}
              className={getAppButtonClass({ variant: "primary", size: "lg" })}
            >
              <span className="inline-flex items-center gap-2">
                Create Invoice
                <ArrowRightIcon className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </MotionReveal>
      </section>
    </main>
  );
}
