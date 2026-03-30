"use client";

interface UploadToastProps {
  message: string;
  visible: boolean;
}

export default function UploadToast({
  message,
  visible,
}: UploadToastProps) {
  return (
    <div
      className={`pointer-events-none fixed left-1/2 top-6 z-[500] -translate-x-1/2 transition-all duration-300 ${
        visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-2 opacity-0"
      }`}
    >
      <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 shadow-lg">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
          ✓
        </span>
        <span className="text-sm font-medium text-black">{message}</span>
      </div>
    </div>
  );
}