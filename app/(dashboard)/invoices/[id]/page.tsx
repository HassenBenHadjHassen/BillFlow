import { notFound } from "next/navigation";
import { InvoiceService } from "@/services/invoice.service";
import { ContractService } from "@/services/contract.service";
import { InvoiceDetailClient } from "@/components/invoices/invoice-detail-client";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await InvoiceService.getInvoiceById(id);

  if (!invoice) {
    notFound();
  }

  // Fetch client contracts to allow linking/attaching to a contract
  const availableContracts = await ContractService.getContracts(invoice.clientId);

  return <InvoiceDetailClient invoice={invoice} availableContracts={availableContracts} />;
}
