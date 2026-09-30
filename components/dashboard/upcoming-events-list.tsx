import Link from "next/link";
import { format } from "date-fns";
import { UpcomingEvent } from "@/types";
import { AlertCircle, Clock, Calendar, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function UpcomingEventsList({ events }: { events: UpcomingEvent[] }) {
  if (!events || events.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        No upcoming deadlines or overdue items. Everything is up to date!
      </div>
    );
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case "invoice_overdue":
        return <AlertCircle className="h-4 w-4 text-rose-500" />;
      case "invoice_due":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "contract_expiring":
        return <Calendar className="h-4 w-4 text-indigo-500" />;
      default:
        return <Calendar className="h-4 w-4 text-sky-500" />;
    }
  };

  const getBadgeVariant = (type: string): "destructive" | "warning" | "indigo" | "secondary" => {
    switch (type) {
      case "invoice_overdue":
        return "destructive";
      case "invoice_due":
        return "warning";
      case "contract_expiring":
        return "indigo";
      default:
        return "secondary";
    }
  };

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {events.map((ev) => (
        <div key={ev.id} className="py-3 flex items-center justify-between gap-3 group">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
              {getEventIcon(ev.type)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {ev.title}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {ev.description} &bull; {format(new Date(ev.date), "dd MMM yyyy")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={getBadgeVariant(ev.type)} className="text-[11px]">
              {ev.badge}
            </Badge>
            <Link
              href={ev.href}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
