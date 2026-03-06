"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface NotificationItem {
  id: string;
  type: "data_quality" | "pipeline" | "alert" | "system";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  starred: boolean;
  priority: "low" | "medium" | "high" | "critical";
  source: string;
}

const STORAGE_KEY = "databotics_notifications";

const defaultNotifications: NotificationItem[] = [
  {
    id: "1",
    type: "data_quality",
    title: "Data Quality Alert",
    message: 'Column "email" has 15% null values exceeding 10% threshold',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    read: false,
    starred: false,
    priority: "high",
    source: "Quality Monitor",
  },
  {
    id: "2",
    type: "pipeline",
    title: "Pipeline Complete",
    message: "ETL pipeline completed. 45,231 rows processed.",
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    read: false,
    starred: true,
    priority: "low",
    source: "Pipeline Engine",
  },
  {
    id: "3",
    type: "alert",
    title: "Anomaly Detected",
    message: "3.2σ deviation in transaction_amount",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    read: true,
    starred: false,
    priority: "critical",
    source: "Anomaly Detection",
  },
  {
    id: "4",
    type: "system",
    title: "Storage Warning",
    message: "Dataset storage at 78% capacity",
    timestamp: new Date(Date.now() - 18000000).toISOString(),
    read: true,
    starred: false,
    priority: "medium",
    source: "System",
  },
];

interface NotificationStore {
  notifications: NotificationItem[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  toggleStar: (id: string) => void;
  remove: (id: string) => void;
  add: (notification: NotificationItem) => void;
}

const NotificationContext = createContext<NotificationStore | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(defaultNotifications);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as NotificationItem[];
        if (Array.isArray(parsed)) {
          setNotifications(parsed);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  const value = useMemo<NotificationStore>(
    () => ({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      markAllRead: () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))),
      markRead: (id) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n))),
      toggleStar: (id) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, starred: !n.starred } : n))),
      remove: (id) => setNotifications((prev) => prev.filter((n) => n.id !== id)),
      add: (notification) => setNotifications((prev) => [notification, ...prev]),
    }),
    [notifications],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}
