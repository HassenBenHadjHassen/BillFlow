import { InvoiceService } from "@/services/invoice.service";
import { ClientService } from "@/services/client.service";
import { InvoicesClient } from "@/components/invoices/invoices-client";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const [invoices, clients] = await Promise.all([
    InvoiceService.getInvoices(),
    ClientService.getClients(),
  ]);

  return <InvoicesClient initialInvoices={invoices} clients={clients} />;
}
