"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  BellIcon,
  MailIcon,
  EyeIcon,
  CheckCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from "./ui/app-icons";
import { cn } from "@/lib/ui-foundation";
import {
  listLiveNotifications,
  markAsRead,
  markAllAsRead,
  type Notification,
} from "@/lib/supabase/notifications";
import { supabase } from "@/lib/supabase/client";
import { useAppBadge } from "@/hooks/use-app-badge";

function getTimeAgo(dateString: string) {
  const now = new Date();
  const past = new Date(dateString);
  const diffInMs = now.getTime() - past.getTime();
  const diffInMins = Math.floor(diffInMs / 60000);

  if (diffInMins < 1) return "just now";
  if (diffInMins < 60) return `${diffInMins}m ago`;
  const diffInHours = Math.floor(diffInMins / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasUnread = notifications.some((n) => !n.is_read);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Update app icon badge
  useAppBadge(unreadCount);

  const fetchNotifications = async () => {
    const { data } = await listLiveNotifications();
    setNotifications(data);
  };

  useEffect(() => {
    fetchNotifications();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel("realtime_notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          fetchNotifications();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async (id: string) => {
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "invoice_sent":
        return <MailIcon className="h-4 w-4 text-blue-500" />;
      case "invoice_viewed":
        return <EyeIcon className="h-4 w-4 text-purple-500" />;
      case "msa_accepted":
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case "msa_rejected":
        return <XMarkIcon className="h-4 w-4 text-red-500" />;
      case "msa_negotiating":
        return <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />;
      default:
        return <BellIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border-subtle)] bg-white transition-all hover:bg-gray-50 active:scale-95"
      >
        <BellIcon
          className={cn(
            "h-4.5 w-4.5",
            hasUnread
              ? "text-[color:var(--text-primary)]"
              : "text-[color:var(--text-muted)]",
          )}
        />
        {hasUnread && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl border border-[color:var(--border-subtle)] bg-white shadow-2xl ring-1 ring-black/5 z-50 overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-4 py-3">
            <h3 className="text-[13px] font-bold text-gray-900">Activity</h3>
            {hasUnread && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-[color:var(--interactive-primary)] hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto overflow-x-hidden scrollbar-hide">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="mb-3 rounded-full bg-gray-100 p-3">
                  <BellIcon className="h-6 w-6 text-gray-300" />
                </div>
                <p className="text-[13px] font-medium text-gray-900">
                  No active notifications
                </p>
                <p className="mt-1 text-[11px] text-gray-500">
                  Notifications for settled invoices are automatically archived.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "group relative flex items-start gap-3 p-4 transition-colors hover:bg-gray-50",
                      !n.is_read && "bg-blue-50/30",
                    )}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-gray-100 shadow-sm">
                        {getIcon(n.type)}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-bold text-gray-900 truncate">
                          {n.title}
                        </p>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                          {getTimeAgo(n.created_at)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-gray-600 line-clamp-2">
                        {n.message}
                      </p>

                      <div className="mt-2 flex items-center gap-3">
                        {n.invoice_id && (
                          <Link
                            href={`/invoices?search=${n.invoices?.invoice_number}`}
                            onClick={() => {
                              setIsOpen(false);
                              handleMarkRead(n.id);
                            }}
                            className="text-[11px] font-semibold text-[color:var(--interactive-primary)] hover:underline"
                          >
                            View Invoice
                          </Link>
                        )}
                        {!n.is_read && (
                          <button
                            onClick={() => handleMarkRead(n.id)}
                            className="text-[11px] font-medium text-gray-400 hover:text-gray-600"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 bg-gray-50/50 p-2 text-center">
            <Link
              href="/invoices"
              onClick={() => setIsOpen(false)}
              className="block rounded-lg py-2 text-[11px] font-bold text-gray-500 hover:text-gray-900 transition-colors"
            >
              View All History
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
