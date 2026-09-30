"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Edit,
  Trash2,
  Plus,
  FileCheck,
  Receipt,
  CreditCard,
  FolderOpen,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { ContractFormDialog } from "@/components/contracts/contract-form-dialog";
import { archiveClientAction } from "@/actions/client.actions";
import { formatCurrency } from "@/lib/financial";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";

export function ClientDetailClient({ client }: { client: any }) {
  const router = useRouter();
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [contractDialogOpen, setContractDialogOpen] = React.useState(false);

  const handleArchive = async () => {
    if (!confirm(`Are you sure you want to archive "${client.companyName}"? Financial records will remain preserved.`)) {
      return;
    }
    const res = await archiveClientAction(client.id);
    if (res.success) {
      toast({ title: "Client Archived", description: "The client was moved to archives.", type: "info" });
      router.push("/clients");
    } else {
      toast({ title: "Error", description: res.error, type: "error" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return <Badge variant="success">Paid</Badge>;
      case "Sent":
        return <Badge variant="indigo">Sent</Badge>;
      case "PartiallyPaid":
        return <Badge variant="warning">Partially Paid</Badge>;
      case "Overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/clients">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              {client.companyName}
            </h1>
            <p className="text-xs text-slate-500">
              Client profile &bull; Created {format(new Date(client.createdAt), "dd MMM yyyy")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)} className="gap-1.5">
            <Edit className="h-3.5 w-3.5" /> Edit Profile
          </Button>
          <Button size="sm" onClick={() => setContractDialogOpen(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New Contract
          </Button>
          <Link href={`/invoices/new?clientId=${client.id}`}>
            <Button size="sm" variant="secondary" className="gap-1.5">
              <Receipt className="h-3.5 w-3.5" /> New Invoice
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={handleArchive} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 3 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invoiced</span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(client.totalInvoiced)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{client.invoices.length} invoices generated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Collected</span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(client.totalPaid)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Paid in full</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding Amount</span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className={`text-xl font-bold ${client.outstandingAmount > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
              {formatCurrency(client.outstandingAmount)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Pending receipt</p>
          </CardContent>
        </Card>
      </div>

      {/* Client Overview Card & Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Client Info Details */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Contact & Company</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Billing Email</span>
              <a href={`mailto:${client.email}`} className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1.5 mt-0.5">
                <Mail className="h-3.5 w-3.5" /> {client.email}
              </a>
            </div>

            {client.contactName && (
              <div>
                <span className="text-slate-400 block font-medium">Primary Contact</span>
                <span className="text-slate-900 dark:text-white font-semibold">{client.contactName}</span>
              </div>
            )}

            {client.phone && (
              <div>
                <span className="text-slate-400 block font-medium">Phone</span>
                <span className="text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" /> {client.phone}
                </span>
              </div>
            )}

            {(client.address || client.city) && (
              <div>
                <span className="text-slate-400 block font-medium">Address</span>
                <div className="text-slate-900 dark:text-white flex items-start gap-1.5 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    {client.address && <div>{client.address}</div>}
                    <div>{[client.postalCode, client.city, client.country].filter(Boolean).join(" ")}</div>
                  </div>
                </div>
              </div>
            )}

            {client.vatNumber && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block font-medium">VAT Number</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{client.vatNumber}</span>
              </div>
            )}

            {client.siret && (
              <div>
                <span className="text-slate-400 block font-medium">SIRET</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{client.siret}</span>
              </div>
            )}

            {client.notes && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block font-medium">Internal Notes</span>
                <p className="text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Columns: Tabs for Contracts, Invoices, Payments, Documents */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="contracts">
            <TabsList>
              <TabsTrigger value="contracts" className="gap-1.5">
                <FileCheck className="h-3.5 w-3.5" /> Contracts ({client.contracts.length})
              </TabsTrigger>
              <TabsTrigger value="invoices" className="gap-1.5">
                <Receipt className="h-3.5 w-3.5" /> Invoices ({client.invoices.length})
              </TabsTrigger>
              <TabsTrigger value="payments" className="gap-1.5">
                <CreditCard className="h-3.5 w-3.5" /> Payments ({client.allPayments?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-1.5">
                <FolderOpen className="h-3.5 w-3.5" /> Documents ({client.documents.length})
              </TabsTrigger>
            </TabsList>

            {/* Contracts Tab */}
            <TabsContent value="contracts" className="space-y-3">
              {client.contracts.length === 0 ? (
                <Card className="p-8 text-center text-xs text-slate-400">
                  No contracts yet for this client.
                </Card>
              ) : (
                client.contracts.map((con: any) => (
                  <Card key={con.id} className="p-4 hover:border-indigo-300 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Link href={`/contracts/${con.id}`} className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 text-sm">
                            {con.title}
                          </Link>
                          <Badge variant={con.status === "Active" ? "success" : "secondary"} className="text-[10px]">
                            {con.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                          <span>Ref: {con.contractNumber}</span>
                          <span>&bull;</span>
                          <span>{con.billingFrequency}</span>
                          <span>&bull;</span>
                          <span>
                            {format(new Date(con.startDate), "dd/MM/yyyy")}
                            {con.endDate ? ` → ${format(new Date(con.endDate), "dd/MM/yyyy")}` : " (Ongoing)"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="font-bold text-slate-900 dark:text-white text-base">
                            {formatCurrency(con.amount, con.currency)}
                          </span>
                          <span className="text-[10px] text-slate-400 block uppercase">
                            /{con.billingFrequency.toLowerCase()}
                          </span>
                        </div>
                        <Link href={`/contracts/${con.id}`}>
                          <Button size="sm" variant="outline">View</Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Invoices Tab */}
            <TabsContent value="invoices" className="space-y-3">
              {client.invoices.length === 0 ? (
                <Card className="p-8 text-center text-xs text-slate-400">
                  No invoices created yet.
                </Card>
              ) : (
                client.invoices.map((inv: any) => (
                  <Card key={inv.id} className="p-4 hover:border-indigo-300 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Link href={`/invoices/${inv.id}`} className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 text-sm">
                            {inv.invoiceNumber}
                          </Link>
                          {getStatusBadge(inv.status)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                          <span>Issued: {format(new Date(inv.issueDate), "dd/MM/yyyy")}</span>
                          <span>&bull;</span>
                          <span>Due: {format(new Date(inv.dueDate), "dd/MM/yyyy")}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="font-bold text-slate-900 dark:text-white text-base">
                            {formatCurrency(inv.total, inv.currency)}
                          </span>
                          {inv.remainingBalance > 0 && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 block">
                              Balance: {formatCurrency(inv.remainingBalance, inv.currency)}
                            </span>
                          )}
                        </div>
                        <Link href={`/invoices/${inv.id}`}>
                          <Button size="sm" variant="outline">View</Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="space-y-3">
              {(!client.allPayments || client.allPayments.length === 0) ? (
                <Card className="p-8 text-center text-xs text-slate-400">
                  No payments recorded yet.
                </Card>
              ) : (
                client.allPayments.map((p: any) => (
                  <Card key={p.id} className="p-3.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        +{formatCurrency(p.amount)}
                      </span>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {p.paymentMethod} &bull; {format(new Date(p.paymentDate), "dd MMM yyyy")}
                        {p.reference && ` &bull; Ref: ${p.reference}`}
                      </div>
                    </div>
                    {p.notes && <span className="text-xs text-slate-400 italic">{p.notes}</span>}
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-3">
              {client.documents.length === 0 ? (
                <Card className="p-8 text-center text-xs text-slate-400">
                  No documents attached to this client.
                </Card>
              ) : (
                client.documents.map((doc: any) => (
                  <Card key={doc.id} className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FolderOpen className="h-4 w-4 text-indigo-500" />
                      <div>
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-900 dark:text-white hover:underline text-xs">
                          {doc.name}
                        </a>
                        <div className="text-[11px] text-slate-400">
                          {doc.type} &bull; {format(new Date(doc.uploadedAt), "dd/MM/yyyy")}
                        </div>
                      </div>
                    </div>
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline">Download</Button>
                    </a>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Client Dialog */}
      <ClientFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        client={client}
      />

      {/* Contract Dialog */}
      <ContractFormDialog
        open={contractDialogOpen}
        onOpenChange={setContractDialogOpen}
        preselectedClientId={client.id}
      />
    </div>
  );
}
