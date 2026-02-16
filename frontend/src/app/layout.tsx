import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppStoreProvider } from "../lib/store";
import { AppShell } from "../components/layout/app-shell";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AppStoreProvider>
          <AppShell>{children}</AppShell>
          <Toaster richColors position="top-right" />
        </AppStoreProvider>
      </body>
    </html>
  );
}
