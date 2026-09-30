"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadDocumentAction } from "@/actions/document.actions";
import { useToast } from "@/components/ui/toast";
import { ClientDTO } from "@/types";
import { UploadCloud } from "lucide-react";

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients?: ClientDTO[];
}

export function DocumentUploadDialog({ open, onOpenChange, clients = [] }: DocumentUploadDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [file, setFile] = React.useState<File | null>(null);
  const [type, setType] = React.useState("Contract");
  const [clientId, setClientId] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setFile(null);
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please choose a file to upload");
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    if (clientId) formData.append("clientId", clientId);

    try {
      const res = await uploadDocumentAction(formData);
      if (res.success) {
        toast({ title: "Document Uploaded", description: `${file.name} saved to secure storage.`, type: "success" });
        onOpenChange(false);
        router.refresh();
      } else {
        setError(res.error || "Upload failed");
      }
    } catch {
      setError("Failed to upload file. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Upload Business Document</DialogTitle>
        <DialogDescription>
          Attach signed agreements, contracts, receipts, or tax records to your business vault.
        </DialogDescription>
      </DialogHeader>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* File Dropzone */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">File *</label>
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors bg-slate-50/50 dark:bg-slate-900/50">
            <UploadCloud className="h-8 w-8 text-indigo-500 mx-auto mb-2" />
            <input
              type="file"
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-950 dark:file:text-indigo-300"
            />
            {file && (
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-2">
                Selected: {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </p>
            )}
            <p className="text-[11px] text-slate-400 mt-2">
              PDF, Word, PNG, JPEG, CSV, TXT (Max 25MB)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Document Type *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
            >
              <option value="Contract">Contract</option>
              <option value="SignedContract">Signed Contract</option>
              <option value="Invoice">Invoice</option>
              <option value="Receipt">Receipt / Bank Remittance</option>
              <option value="Quote">Quote / Proposal</option>
              <option value="TaxDocument">Tax Document</option>
              <option value="Identification">Identification / Corporate</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Associated Client</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
            >
              <option value="">None (General Record)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            Upload File
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
