"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Menu, LogOut, Settings, ChevronDown, ChevronRight, X, FileText, Users, FileCheck, Receipt } from "lucide-react";
import { logoutAction } from "@/actions/auth.actions";
import { searchAction } from "@/actions/search.actions";
import { SearchResult, UserSession } from "@/types";

const pageNames: Record<string, string> = { dashboard: "Overview", invoices: "Invoices", clients: "Clients", contracts: "Contracts", payments: "Payments", recurring: "Recurring billing", reports: "Reports", documents: "Documents", settings: "Settings" };

export function Header({ user, onOpenMobile }: { user: UserSession; onOpenMobile: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const section = pageNames[pathname.split("/")[1]] || "Workspace";
  const initials = user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U";

  React.useEffect(() => {
    function outside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
      if (!searchRef.current?.contains(event.target as Node)) setSearchOpen(false);
    }
    function keyboard(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") { event.preventDefault(); inputRef.current?.focus(); setSearchOpen(true); }
      if (event.key === "Escape") { setMenuOpen(false); setSearchOpen(false); }
    }
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", keyboard);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", keyboard); };
  }, []);

  React.useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setSearching(false); return; }
    let current = true;
    setSearching(true);
    const timer = setTimeout(async () => {
      try { const next = await searchAction(query.trim()); if (current) setResults(next); }
      catch { if (current) setResults([]); }
      finally { if (current) setSearching(false); }
    }, 250);
    return () => { current = false; clearTimeout(timer); };
  }, [query]);

  const icons = { client: Users, contract: FileCheck, invoice: Receipt, document: FileText };
  return (
    <header className="flex h-20 shrink-0 items-center justify-between gap-4 border-b border-border bg-white px-5 sm:px-8 lg:px-10 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onOpenMobile} className="bf-icon-button -ml-2 md:hidden" aria-label="Open navigation menu"><Menu className="h-5 w-5" /></button>
        <div className="flex items-center gap-2 text-[13px]"><span className="hidden text-slate-400 lg:inline">Workspace</span><ChevronRight className="hidden h-3.5 w-3.5 text-slate-300 lg:block" /><span className="font-medium text-slate-700 dark:text-slate-200">{section}</span></div>
      </div>
      <div className="flex min-w-0 items-center gap-4 sm:gap-6">
        <div ref={searchRef} className="relative w-[130px] shrink-0 sm:w-[250px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input ref={inputRef} type="search" aria-label="Search workspace" placeholder="Search anything…" value={query} onFocus={() => setSearchOpen(true)} onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }} className="h-9 w-full rounded-lg border border-border bg-slate-50/50 pl-9 pr-8 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white dark:bg-slate-800 dark:text-slate-200" />
            {query ? <button type="button" aria-label="Clear search" onClick={() => { setQuery(""); inputRef.current?.focus(); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"><X className="h-3.5 w-3.5" /></button> : <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1 text-[9px] text-slate-400 sm:block">⌘ K</kbd>}
          </div>
          {searchOpen && query.trim().length >= 2 && <div className="absolute right-0 top-full z-40 mt-2 w-[min(360px,calc(100vw-32px))] rounded-xl border border-border bg-white p-2 shadow-lg dark:bg-slate-900" aria-live="polite">
            <p className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-slate-400">Workspace search</p>
            {searching ? <p className="px-3 py-6 text-center text-sm text-slate-400">Searching…</p> : results.length === 0 ? <p className="px-3 py-6 text-center text-sm text-slate-500">No matching records.</p> : <div className="max-h-80 overflow-auto">{results.map((result) => {
              const Icon = icons[result.type as keyof typeof icons] || FileText;
              return <Link key={result.id} href={result.url} onClick={() => { setSearchOpen(false); setQuery(""); }} className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800"><span className="bf-avatar h-9 w-9 rounded-lg"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium text-slate-800 dark:text-white">{result.title}</span><span className="mt-0.5 block truncate text-xs text-slate-400">{result.subtitle}</span></span><ChevronRight className="h-3.5 w-3.5 text-slate-300" /></Link>;
            })}</div>}
          </div>}
        </div>
        <div ref={menuRef} className="relative border-l border-border pl-4 sm:pl-6">
          <button type="button" aria-label="Account menu" aria-expanded={menuOpen} aria-controls="account-menu" onClick={() => setMenuOpen((value) => !value)} className="flex items-center gap-2.5 rounded-lg text-left">
            <span className="bf-avatar h-9 w-9 text-[11px]">{initials}</span><span className="hidden whitespace-nowrap lg:block"><span className="block text-xs font-medium text-slate-800 dark:text-white">{user.name}</span><span className="mt-0.5 block text-[10px] text-slate-400">Personal workspace</span></span><ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
          </button>
          {menuOpen && <div id="account-menu" className="absolute right-0 top-full z-40 mt-4 w-60 overflow-hidden rounded-xl border border-border bg-white py-1.5 shadow-lg dark:bg-slate-900"><div className="border-b border-border px-4 py-3"><p className="text-sm font-medium text-slate-900 dark:text-white">{user.name}</p><p className="mt-1 truncate text-xs text-slate-400">{user.email}</p></div><Link href="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-3 text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"><Settings className="h-4 w-4" /> Account settings</Link><button type="button" onClick={async () => { await logoutAction(); router.push("/login"); router.refresh(); }} className="flex w-full items-center gap-2.5 px-4 py-3 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800"><LogOut className="h-4 w-4" /> Log out</button></div>}
        </div>
      </div>
    </header>
  );
}
