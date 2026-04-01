"use client";

import { getAppButtonClass, getAppPanelClass } from "@/lib/ui-foundation";

interface PaywallProps {
  onUpgrade: () => void;
}

export default function Paywall({ onUpgrade }: PaywallProps) {
  return (
    <div className={getAppPanelClass()}>
      <h3 className="text-xl font-semibold text-black">Upgrade to Continue</h3>
      <p className="mt-2 text-sm text-gray-600">
        Free users can generate a limited number of documents. Upgrade to unlock more usage.
      </p>

      <button
        type="button"
        onClick={onUpgrade}
        className={`mt-4 ${getAppButtonClass({
          variant: "primary",
          size: "lg",
        })}`}
      >
        Upgrade
      </button>
    </div>
  );
}
