"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderOpen, Plus, Search, FileText, Download, Trash2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DocumentUploadDialog } from "@/components/documents/document-upload-dialog";
import { deleteDocumentAction } from "@/actions/document.actions";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";
import { ClientDTO } from "@/types";

export function DocumentsClient({
  documents,
  clients,
}: {
  documents: any[];
  clients: ClientDTO[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("ALL");
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);

  const filtered = documents.filter((doc) => {
    const q = search.toLowerCase();
    const matchesSearch =
      doc.name.toLowerCase().includes(q) ||
      (doc.client && doc.client.companyName.toLowerCase().includes(q)) ||
      (doc.contract && doc.contract.title.toLowerCase().includes(q)) ||
      (doc.invoice && doc.invoice.invoiceNumber.toLowerCase().includes(q));

    const matchesType = typeFilter === "ALL" || doc.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    const res = await deleteDocumentAction(id);
    if (res.success) {
      toast({ title: "Document Deleted", description: "File was removed from storage.", type: "info" });
      router.refresh();
    } else {
      toast({ title: "Error", description: res.error, type: "error" });
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "SignedContract":
      case "Contract":
        return <Badge variant="indigo">{type}</Badge>;
      case "Invoice":
        return <Badge variant="success">Invoice</Badge>;
      case "Receipt":
        return <Badge variant="warning">Receipt</Badge>;
      case "TaxDocument":
        return <Badge variant="destructive">Tax Document</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Documents Vault ({documents.length})
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Central repository for contracts, signed agreements, invoices, receipts, and compliance files.
          </p>
        </div>

        <Button onClick={() => setUploadDialogOpen(true)} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          <span>Upload Document</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents by name, client, or ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400 shadow-xs"
          />
        </div>

        {/* Type Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { label: "All", value: "ALL" },
            { label: "Contracts", value: "Contract" },
            { label: "Signed", value: "SignedContract" },
            { label: "Invoices", value: "Invoice" },
            { label: "Receipts", value: "Receipt" },
            { label: "Tax", value: "TaxDocument" },
          ].map((pill) => (
            <button
              key={pill.value}
              onClick={() => setTypeFilter(pill.value)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                typeFilter === pill.value
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid / List */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <FolderOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">No documents found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {search ? "No files match your query." : "Upload signed agreements, contracts, and receipts to secure storage."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc) => (
            <Card key={doc.id} className="hover:border-indigo-300 transition-all flex flex-col justify-between group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={doc.name}>
                        {doc.name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {format(new Date(doc.uploadedAt), "dd MMM yyyy")}
                        {doc.fileSize > 0 && ` &bull; ${(doc.fileSize / 1024).toFixed(0)} KB`}
                      </p>
                    </div>
                  </div>
                  {getTypeBadge(doc.type)}
                </div>

                {/* Association info */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 space-y-1">
                  {doc.client && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{doc.client.companyName}</span>
                    </div>
                  )}
                  {doc.contract && (
                    <div className="truncate text-slate-400">
                      Contract: {doc.contract.contractNumber}
                    </div>
                  )}
                  {doc.invoice && (
                    <div className="truncate text-slate-400">
                      Invoice: {doc.invoice.invoiceNumber}
                    </div>
                  )}
                </div>
              </CardContent>

              <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 rounded-b-xl">
                <button
                  onClick={() => handleDelete(doc.id, doc.name)}
                  className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                  title="Delete file"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  <Download className="h-3.5 w-3.5" /> Download / View
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <DocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        clients={clients}
      />
    </div>
  );
}
