import { notFound } from "next/navigation";
import { InvoiceService } from "@/services/invoice.service";
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

  return <InvoiceDetailClient invoice={invoice} />;
}
