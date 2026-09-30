import { InvoiceService } from "@/services/invoice.service";
import { ClientService } from "@/services/client.service";
import { ContractService } from "@/services/contract.service";
import { InvoicesClient } from "@/components/invoices/invoices-client";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const [invoices, clients, contracts] = await Promise.all([
    InvoiceService.getInvoices(),
    ClientService.getClients(),
    ContractService.getContracts(),
  ]);

  return <InvoicesClient initialInvoices={invoices} clients={clients} contracts={contracts} />;
}
