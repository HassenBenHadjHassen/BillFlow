"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClientAction, updateClientAction } from "@/actions/client.actions";
import { useToast } from "@/components/ui/toast";
import { ClientDTO } from "@/types";

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: ClientDTO | null;
}

export function ClientFormDialog({ open, onOpenChange, client }: ClientFormDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [companyName, setCompanyName] = React.useState("");
  const [contactName, setContactName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [city, setCity] = React.useState("");
  const [postalCode, setPostalCode] = React.useState("");
  const [country, setCountry] = React.useState("France");
  const [vatNumber, setVatNumber] = React.useState("");
  const [siret, setSiret] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (client) {
      setCompanyName(client.companyName);
      setContactName(client.contactName || "");
      setEmail(client.email);
      setPhone(client.phone || "");
      setAddress(client.address || "");
      setCity(client.city || "");
      setPostalCode(client.postalCode || "");
      setCountry(client.country || "France");
      setVatNumber(client.vatNumber || "");
      setSiret(client.siret || "");
      setNotes(client.notes || "");
    } else {
      setCompanyName("");
      setContactName("");
      setEmail("");
      setPhone("");
      setAddress("");
      setCity("");
      setPostalCode("");
      setCountry("France");
      setVatNumber("");
      setSiret("");
      setNotes("");
    }
    setError(null);
  }, [client, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const payload = {
      companyName,
      contactName: contactName || null,
      email,
      phone: phone || null,
      address: address || null,
      city: city || null,
      postalCode: postalCode || null,
      country: country || "France",
      vatNumber: vatNumber || null,
      siret: siret || null,
      notes: notes || null,
    };

    try {
      if (client) {
        const res = await updateClientAction(client.id, payload);
        if (res.success) {
          toast({ title: "Client Updated", description: "Changes have been saved successfully.", type: "success" });
          onOpenChange(false);
          router.refresh();
        } else {
          setError(res.error || "Failed to update client");
        }
      } else {
        const res = await createClientAction(payload);
        if (res.success) {
          toast({ title: "Client Created", description: `${payload.companyName} added to clients.`, type: "success" });
          onOpenChange(false);
          router.refresh();
        } else {
          setError(res.error || "Failed to create client");
        }
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{client ? "Edit Client" : "New Client"}</DialogTitle>
        <DialogDescription>
          {client ? "Update company information and billing details" : "Add a new company or client to Billflow"}
        </DialogDescription>
      </DialogHeader>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Company Name *</label>
            <Input
              required
              placeholder="e.g. Acme Corp SARL"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Contact Person</label>
            <Input
              placeholder="e.g. Alice Dubois"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Billing Email *</label>
            <Input
              type="email"
              required
              placeholder="billing@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Phone</label>
            <Input
              placeholder="+33 6 12 34 56 78"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Country</label>
            <Input
              placeholder="France"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Street Address</label>
            <Input
              placeholder="15 Avenue des Champs-Élysées"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">City</label>
            <Input
              placeholder="Paris"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Postal Code</label>
            <Input
              placeholder="75008"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">VAT Number</label>
            <Input
              placeholder="FR 89 123456789"
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">SIRET</label>
            <Input
              placeholder="123 456 789 00012"
              value={siret}
              onChange={(e) => setSiret(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {client ? "Save Changes" : "Create Client"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
