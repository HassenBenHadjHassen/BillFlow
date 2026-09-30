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
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans antialiased text-slate-900 dark:text-slate-100">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
