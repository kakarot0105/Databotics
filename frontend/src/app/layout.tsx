import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppStoreProvider } from "../lib/store";
import { AppShell } from "../components/layout/app-shell";
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
  title: "Databotics",
  description: "Modern UI for profiling, validation, cleaning, and querying datasets",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AppStoreProvider>
          <AppShell>{children}</AppShell>
        </AppStoreProvider>
      </body>
    </html>
  );
}
