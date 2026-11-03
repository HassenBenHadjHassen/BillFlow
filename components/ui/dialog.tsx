"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { X } from "lucide-react";

export interface DialogProps { open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode; className?: string; }
const DialogContext = React.createContext<{ titleId: string; descriptionId: string } | null>(null);

export function Dialog({ open, onOpenChange, children, className }: DialogProps) {
  const titleId = React.useId();
  const descriptionId = React.useId();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef(onOpenChange);
  React.useEffect(() => { closeRef.current = onOpenChange; }, [onOpenChange]);
  React.useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>('input:not([readonly]):not([type="file"]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
      (first || panelRef.current)?.focus();
    });
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(false); }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')).filter((element) => element.getClientRects().length > 0);
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (!first) { event.preventDefault(); panelRef.current.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", keydown);
    return () => { cancelAnimationFrame(frame); document.body.style.overflow = overflow; document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [open]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <DialogContext.Provider value={{ titleId, descriptionId }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[3px]" onClick={() => onOpenChange(false)} aria-hidden="true" />
        <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} tabIndex={-1} className={twMerge(clsx("relative max-h-[calc(100dvh-32px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-white p-6 shadow-2xl shadow-slate-950/10 outline-none dark:bg-slate-900 sm:p-7", className))}>
          <button type="button" onClick={() => onOpenChange(false)} className="bf-icon-button absolute right-4 top-4" aria-label="Close dialog"><X className="h-4 w-4" /></button>
          {children}
        </div>
      </div>
    </DialogContext.Provider>, document.body
  );
}
export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={twMerge(clsx("mb-6 flex flex-col space-y-2 pr-8 text-left", className))} {...props} />; }
export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) { const context = React.useContext(DialogContext); return <h2 id={context?.titleId} className={twMerge(clsx("text-[23px] font-semibold tracking-[-0.035em] text-slate-900 dark:text-white", className))} {...props} />; }
export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) { const context = React.useContext(DialogContext); return <p id={context?.descriptionId} className={twMerge(clsx("text-[13px] leading-relaxed text-slate-500 dark:text-slate-400", className))} {...props} />; }
export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={twMerge(clsx("mt-6 flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end", className))} {...props} />; }
