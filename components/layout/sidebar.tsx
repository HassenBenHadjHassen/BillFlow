"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileCheck2, Receipt, CreditCard, FolderOpen, CalendarSync, BarChart3, Settings, X } from "lucide-react";
import { clsx } from "clsx";

const groups = [
  { label: "Workspace", items: [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Invoices", href: "/invoices", icon: Receipt },
    { name: "Payments", href: "/payments", icon: CreditCard },
  ] },
  { label: "Business", items: [
    { name: "Clients", href: "/clients", icon: Users },
    { name: "Contracts", href: "/contracts", icon: FileCheck2 },
    { name: "Recurring billing", href: "/recurring", icon: CalendarSync },
  ] },
  { label: "Insights", items: [
    { name: "Reports", href: "/reports", icon: BarChart3 },
    { name: "Documents", href: "/documents", icon: FolderOpen },
  ] },
];

export function Sidebar({ onCloseMobile }: { onCloseMobile?: () => void }) {
  const pathname = usePathname();
  return (
    <aside className="flex h-full w-[232px] shrink-0 flex-col border-r border-border bg-white dark:bg-slate-900">
      <div className="flex h-20 shrink-0 items-center justify-between px-7">
        <Link href="/dashboard" onClick={onCloseMobile} className="flex items-center gap-2.5" aria-label="Billflow home">
          <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-slate-900 text-white dark:bg-white dark:text-slate-900"><Receipt className="h-[18px] w-[18px]" strokeWidth={1.7} /></span>
          <span className="text-[22px] font-semibold tracking-[-0.06em] text-slate-900 dark:text-white">billflow<span className="text-slate-400">.</span></span>
        </Link>
        {onCloseMobile && <button type="button" onClick={onCloseMobile} className="bf-icon-button -mr-3" aria-label="Close navigation"><X className="h-4 w-4" /></button>}
      </div>
      <nav aria-label="Main navigation" className="flex-1 space-y-7 overflow-y-auto px-4 pb-6 pt-7">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-2.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{group.label}</p>
            <div className="space-y-1">
              {group.items.map(({ name, href, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return <Link key={href} href={href} onClick={onCloseMobile} aria-current={active ? "page" : undefined} className={clsx("group flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] transition-colors", active ? "bg-slate-100 font-semibold text-slate-950 dark:bg-slate-800 dark:text-white" : "font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white")}>
                  <Icon className={clsx("h-[17px] w-[17px] shrink-0", active ? "text-slate-800 dark:text-white" : "text-slate-400")} strokeWidth={1.7} />
                  <span>{name}</span>{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-slate-700 dark:bg-slate-300" />}
                </Link>;
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-border px-4 py-4">
        <Link href="/settings" onClick={onCloseMobile} aria-current={pathname.startsWith("/settings") ? "page" : undefined} className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"><Settings className="h-[17px] w-[17px]" strokeWidth={1.7} /> Settings</Link>
      </div>
    </aside>
  );
}
