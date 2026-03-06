import type { Metadata } from "next";
import { AppStoreProvider } from "../lib/store";
import { NotificationProvider } from "../lib/notification-store";
import { ChatProvider } from "../lib/chat-store";
import { AppShell } from "../components/layout/app-shell";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Databotics | Data Quality Workbench",
  description: "Upload, profile, validate, clean, and query tabular datasets in one modern workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased">
        <AppStoreProvider>
          <NotificationProvider>
            <ChatProvider>
              <AppShell>{children}</AppShell>
              <Toaster
                richColors
                position="top-right"
                toastOptions={{
                  className: "glass",
                  style: {
                    borderRadius: "0.75rem",
                  },
                }}
              />
            </ChatProvider>
          </NotificationProvider>
        </AppStoreProvider>
      </body>
    </html>
  );
}
