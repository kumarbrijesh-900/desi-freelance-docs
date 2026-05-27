"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { FeedbackType } from "@/types/supabase-extra";
import {
  cn,
  getAppFieldClass,
  getAppPanelClass,
  appSectionTitleClass,
} from "@/lib/ui-foundation";
import { MotionReveal, MotionButton } from "@/components/ui/motion-primitives";
import AppSelectField from "@/components/ui/AppSelectField";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [type, setType] = useState<FeedbackType>("general");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in to submit feedback.");
      }

      const { error: insertError } = await supabase
        .from("user_feedback")
        .insert({
          user_id: user.id,
          type,
          message,
          status: "new",
        });

      if (insertError) throw insertError;

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setMessage("");
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to submit feedback.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <MotionReveal
        preset="fade-up"
        className="relative w-full max-w-md overflow-hidden bg-white shadow-[var(--brutal-shadow-lg)]"
      >
        {isSuccess ? (
          <div className="p-10 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[color:var(--color-ink)] mb-2">
              Feedback Received!
            </h3>
            <p className="text-[color:var(--color-ink-2)]">
              Thank you for helping us improve Lance.
            </p>
          </div>
        ) : (
          <>
            <div className="border-b border-[color:var(--color-soft)] px-6 py-4 flex items-center justify-between bg-[color:var(--color-paper)]/50">
              <h2 className="text-lg font-bold text-[color:var(--color-ink)]">
                Help us improve Lance
              </h2>
              <button
                onClick={onClose}
                className="text-[color:var(--color-ink-2)] hover:text-[color:var(--color-ink)] transition-colors"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-ink-2)] mb-2">
                  Category
                </label>
                <AppSelectField
                  value={type}
                  onChange={(e) => setType(e.target.value as FeedbackType)}
                  className="bg-white"
                  disabled={isSubmitting}
                  hasValue={true}
                >
                  <option value="general">General Feedback</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature">Feature Request</option>
                </AppSelectField>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-ink-2)] mb-2">
                  What's on your mind?
                </label>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us about your experience..."
                  className={cn(
                    getAppFieldClass({ hasValue: message.length > 0 }),
                    "min-h-[120px] py-3 bg-white",
                  )}
                  disabled={isSubmitting}
                />
              </div>

              {error && (
                <p className="text-xs text-[#FF5C00] bg-red-50 p-3 border border-red-100">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-11 font-bold text-[color:var(--color-ink)] hover:bg-[color:var(--color-paper-2)] transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !message.trim()}
                  className={cn(
                    "flex-[2] h-11 font-bold transition-all duration-200 shadow-sm",
                    "bg-[color:var(--color-lime-300)] text-[#111118] hover:shadow-lg disabled:opacity-50",
                  )}
                >
                  {isSubmitting ? "Submitting..." : "Submit Feedback"}
                </button>
              </div>
            </form>
          </>
        )}
      </MotionReveal>
    </div>
  );
}
