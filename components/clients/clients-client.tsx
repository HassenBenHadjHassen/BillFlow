"use client";

import * as React from "react";
import Link from "next/link";
import { Users, Plus, Search, Building2, Mail, Phone, MapPin, ChevronRight, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { formatCurrency } from "@/lib/financial";
import { ClientDTO } from "@/types";

interface EnrichedClient extends ClientDTO {
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  activeContracts: number;
}

export function ClientsClient({ initialClients }: { initialClients: EnrichedClient[] }) {
  const [clients, setClients] = React.useState<EnrichedClient[]>(initialClients);
  const [search, setSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedClient, setSelectedClient] = React.useState<ClientDTO | null>(null);

  React.useEffect(() => {
    setClients(initialClients);
  }, [initialClients]);

  const filteredClients = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.companyName.toLowerCase().includes(q) ||
      (c.contactName && c.contactName.toLowerCase().includes(q)) ||
      c.email.toLowerCase().includes(q) ||
      (c.city && c.city.toLowerCase().includes(q))
    );
  });

  const handleOpenCreate = () => {
    setSelectedClient(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Clients ({clients.length})
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your client roster, billing profiles, contracts, and revenue history.
          </p>
        </div>

        <Button onClick={handleOpenCreate} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          <span>Add Client</span>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by company, contact, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400 shadow-xs"
          />
        </div>
      </div>

      {/* Client List */}
      {filteredClients.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">No clients found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search ? `No clients match your filter "${search}"` : "You haven't added any clients yet. Add your first client to start creating contracts and invoices."}
          </p>
          {!search && (
            <Button onClick={handleOpenCreate} size="sm" className="mt-4 gap-1.5">
              <Plus className="h-4 w-4" /> Add First Client
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <Card key={client.id} className="hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {client.companyName}
                    </h3>
                    {client.contactName && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{client.contactName}</p>
                    )}
                  </div>
                  <Badge variant={client.activeContracts > 0 ? "success" : "secondary"} className="shrink-0 text-[10px]">
                    <FileCheck className="h-3 w-3 mr-1" />
                    {client.activeContracts} Active {client.activeContracts === 1 ? "Contract" : "Contracts"}
                  </Badge>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {(client.city || client.country) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{[client.city, client.country].filter(Boolean).join(", ")}</span>
                    </div>
                  )}
                </div>

                {/* Financial Summary */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Invoiced</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(client.totalInvoiced)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Outstanding</span>
                    <span className={`font-bold ${client.outstanding > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {formatCurrency(client.outstanding)}
                    </span>
                  </div>
                </div>
              </CardContent>

              <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end bg-slate-50/50 dark:bg-slate-900/50 rounded-b-xl">
                <Link
                  href={`/clients/${client.id}`}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                >
                  View Client Profile <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <ClientFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        client={selectedClient}
      />
    </div>
  );
}
