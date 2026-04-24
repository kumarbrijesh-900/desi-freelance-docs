"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { FeedbackType } from "@/types/supabase-extra";
import { cn, getAppFieldClass, getAppPanelClass, appSectionTitleClass } from "@/lib/ui-foundation";

export default function SubmitFeedback() {
  const [type, setType] = useState<FeedbackType>("general");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
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
      setMessage("");
    } catch (err: any) {
      setError(err.message || "Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className={cn(getAppPanelClass(), "p-8 text-center max-w-lg mx-auto")}>
        <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Feedback Received!</h3>
        <p className="text-gray-600 mb-6">
          Thank you for helping us improve Lance. Our team will review your feedback shortly.
        </p>
        <button
          onClick={() => setIsSuccess(false)}
          className="text-sm font-medium text-[color:var(--interactive-primary)] hover:underline"
        >
          Submit another feedback
        </button>
      </div>
    );
  }

  return (
    <div className={cn(getAppPanelClass(), "p-6 max-w-lg mx-auto shadow-sm border border-gray-100")}>
      <h2 className={cn(appSectionTitleClass, "mb-1")}>Submit Feedback</h2>
      <p className="text-sm text-gray-500 mb-6">Found a bug or have a suggestion? Let us know.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
            Feedback Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as FeedbackType)}
            className={cn(getAppFieldClass({ hasValue: true }), "bg-white")}
            disabled={isSubmitting}
          >
            <option value="general">General Feedback</option>
            <option value="bug">Bug Report</option>
            <option value="feature">Feature Request</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
            Message
          </label>
          <textarea
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us what's on your mind..."
            className={cn(getAppFieldClass({ hasValue: message.length > 0 }), "min-h-[120px] py-3 bg-white")}
            disabled={isSubmitting}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !message.trim()}
          className={cn(
            "w-full h-12 rounded-xl font-bold tracking-tight transition-all duration-200 shadow-sm",
            "bg-gray-900 text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isSubmitting ? "Submitting..." : "Submit Feedback"}
        </button>
      </form>
    </div>
  );
}
