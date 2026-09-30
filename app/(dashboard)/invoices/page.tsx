import { InvoiceService } from "@/services/invoice.service";
import { InvoicesClient } from "@/components/invoices/invoices-client";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const invoices = await InvoiceService.getInvoices();
  return <InvoicesClient initialInvoices={invoices} />;
}
