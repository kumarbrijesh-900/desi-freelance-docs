"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import LogoutButton from "@/components/LogoutButton";
import { ArrowRightIcon } from "@/components/ui/app-icons";
import { MotionReveal } from "@/components/ui/motion-primitives";
import {
  appGridClass,
  appPageContainerClass,
  appPageSectionClass,
  appPageShellClass,
  appReadableContentClass,
} from "@/lib/layout-foundation";
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
    <main className={appPageShellClass}>
      <AppHeader rightSlot={isLoggedIn ? <LogoutButton /> : null} />

      <section className={`${appPageContainerClass} ${appPageSectionClass} pt-14 sm:pt-16 lg:pt-20`}>
        <div className={appGridClass}>
          <MotionReveal
            preset="fade-up"
            className={`${appReadableContentClass} text-center`}
          >
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-gray-500">
            Freelance document workflow
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight text-black sm:text-5xl">
            Create invoices and scope documents faster
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-gray-600 sm:text-lg">
            Turn a raw client brief into structured freelance documents with
            guided inputs, licensing controls, and quick generation flows.
          </p>

          <div className="mt-6 flex justify-center sm:mt-8">
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
        </div>
      </section>
    </main>
  );
}
