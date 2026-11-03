import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Billflow - Private Business & Invoice Management",
  description: "Private single-user management system for clients, contracts, monthly recurring billing, invoices, payments, and financial reports.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:shadow-lg">Skip to content</a>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
