"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Receipt, Eye, EyeOff, ArrowRight, CircleCheck, ShieldAlert } from "lucide-react";
import { loginAction } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(null); setIsLoading(true);
    try { const result = await loginAction({ email, password }); if (result.success) { router.push("/dashboard"); router.refresh(); } else setError(result.error || "Check your email and password."); }
    catch { setError("Could not sign in. Please try again."); }
    finally { setIsLoading(false); }
  }
  return <main id="main-content" className="grid min-h-dvh grid-cols-1 bg-white lg:grid-cols-2 dark:bg-slate-950">
    <section className="hidden min-h-dvh flex-col justify-between bg-[#f3f5f7] p-12 xl:p-16 lg:flex dark:bg-slate-900">
      <div className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-slate-900 text-white dark:bg-white dark:text-slate-900"><Receipt className="h-5 w-5" strokeWidth={1.5} /></span><span className="text-[26px] font-semibold tracking-[-0.06em] text-slate-900 dark:text-white">billflow.</span></div>
      <div className="max-w-md py-16"><p className="bf-eyebrow mb-5">A little clarity goes a long way</p><h1 className="text-[clamp(38px,4.2vw,60px)] font-medium leading-[1.12] tracking-[-0.055em] text-slate-900 dark:text-white">Less admin.<br />More room<br />for your business.</h1><p className="mt-7 max-w-[330px] text-[15px] leading-7 text-slate-500">A quiet place to manage your clients, keep invoices organized and see what’s coming next.</p><div className="mt-9 space-y-3 text-[13px] text-slate-600 dark:text-slate-400">{["All your billing, in one place", "A clear picture of your income", "Built around your daily workflow"].map((item) => <p key={item} className="flex items-center gap-2.5"><CircleCheck className="h-4 w-4 text-slate-400" strokeWidth={1.5} />{item}</p>)}</div></div>
      <p className="text-[11px] text-slate-400">Your business. A little more organized.</p>
    </section>
    <section className="flex min-h-dvh items-center justify-center px-6 py-12 sm:px-12"><div className="w-full max-w-[360px]"><div className="mb-12 flex items-center gap-2 lg:hidden"><Receipt className="h-6 w-6 text-slate-900 dark:text-white" /><span className="text-2xl font-semibold tracking-tight">billflow.</span></div><p className="bf-eyebrow">Your workspace awaits</p><h2 className="text-[32px] font-semibold tracking-[-0.04em] text-slate-900 dark:text-white">Welcome back.</h2><p className="mb-9 mt-3 text-sm text-slate-500">Sign in to pick up where you left off.</p>
      {error && <div role="alert" className="mb-5 flex items-start gap-2 rounded-lg border border-rose-100 bg-rose-50 p-3 text-xs leading-relaxed text-rose-700"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      <form onSubmit={submit} className="space-y-5"><div className="bf-field"><label htmlFor="login-email" className="bf-label">Email address</label><Input id="login-email" type="email" autoComplete="username" required placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} /></div><div className="bf-field"><label htmlFor="login-password" className="bf-label">Password</label><div className="relative"><Input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" required placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} className="pr-11" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="bf-icon-button absolute right-1 top-1" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div><Button type="submit" isLoading={isLoading} className="!mt-7 h-11 w-full justify-between px-4">Sign in <ArrowRight className="h-4 w-4" /></Button></form><p className="mt-8 text-center text-[11px] leading-relaxed text-slate-400">Your personal business workspace.</p>
    </div></section>
  </main>;
}
