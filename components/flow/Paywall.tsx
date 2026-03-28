"use client";

interface PaywallProps {
  onUpgrade: () => void;
}

export default function Paywall({ onUpgrade }: PaywallProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-black">Upgrade to Continue</h3>
      <p className="mt-2 text-sm text-gray-600">
        Free users can generate a limited number of documents. Upgrade to unlock more usage.
      </p>

      <button
        type="button"
        onClick={onUpgrade}
        className="mt-4 rounded-xl bg-black px-4 py-3 text-sm font-medium text-white"
      >
        Upgrade
      </button>
    </div>
  );
}