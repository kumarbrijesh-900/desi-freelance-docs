"use client";

import { useEffect } from "react";

/**
 * Hook to manage the App Badging API.
 * Updates the app icon badge with the provided unread count.
 */
export function useAppBadge(unreadCount: number) {
  useEffect(() => {
    // Feature check for App Badging API
    if (!("setAppBadge" in navigator)) return;

    const nav = navigator as any;

    try {
      if (unreadCount > 0) {
        nav.setAppBadge(unreadCount).catch((err: any) => {
          console.error("Failed to set app badge:", err);
        });
      } else {
        nav.clearAppBadge().catch((err: any) => {
          console.error("Failed to clear app badge:", err);
        });
      }
    } catch (err) {
      console.error("App Badging API error:", err);
    }
  }, [unreadCount]);
}
