"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Menu, LogOut, Settings, User as UserIcon, X, FileText, Users, FileCheck, Receipt } from "lucide-react";
import { logoutAction } from "@/actions/auth.actions";
import { searchAction } from "@/actions/search.actions";
import { SearchResult, UserSession } from "@/types";
import { Badge } from "@/components/ui/badge";

export function Header({
  user,
  onOpenMobile,
}: {
  user: UserSession;
  onOpenMobile: () => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [showSearchModal, setShowSearchModal] = React.useState(false);

  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  React.useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchAction(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLogout = async () => {
    await logoutAction();
    router.push("/login");
    router.refresh();
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case "client":
        return <Users className="h-4 w-4 text-sky-500" />;
      case "contract":
        return <FileCheck className="h-4 w-4 text-emerald-500" />;
      case "invoice":
        return <Receipt className="h-4 w-4 text-indigo-500" />;
      default:
        return <FileText className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <header className="h-16 border-b border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-30 sticky top-0">
      {/* Left: Mobile trigger & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          onClick={onOpenMobile}
          className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Global Search Bar */}
        <div className="relative w-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search clients, contracts, invoices, docs..."
              value={searchQuery}
              onFocus={() => setShowSearchModal(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchModal(true);
              }}
              className="w-full pl-9 pr-8 py-1.5 text-xs sm:text-sm bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 border border-transparent focus:border-indigo-500 rounded-lg outline-none transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setShowSearchModal(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Search Dropdown Modal */}
          {showSearchModal && searchQuery.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-2 z-50 max-h-96 overflow-y-auto">
              {isSearching ? (
                <div className="py-6 text-center text-xs text-slate-400 animate-pulse">
                  Searching business records...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No records found matching &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((res) => (
                    <Link
                      key={`${res.type}-${res.id}`}
                      href={res.url}
                      onClick={() => setShowSearchModal(false)}
                      className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors">
                          {getResultIcon(res.type)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            {res.title}
                            {res.status && (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                                {res.status}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {res.subtitle}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {res.type}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Account Menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-left"
          aria-expanded={menuOpen}
        >
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
            {user.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
              {user.name}
            </span>
            <span className="text-xs text-slate-400 leading-tight">
              {user.email}
            </span>
          </div>
        </button>

        {/* Dropdown Menu */}
        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95">
            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Account</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>

            <div className="py-1">
              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Settings className="h-4 w-4 text-slate-400" />
                <span>Settings</span>
              </Link>
            </div>

            <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
