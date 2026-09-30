import { ClientService } from "@/services/client.service";
import { ContractService } from "@/services/contract.service";
import { InvoiceService } from "@/services/invoice.service";
import { InvoiceForm } from "@/components/invoices/invoice-form";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{
    clientId?: string;
    contractId?: string;
    amount?: string;
    periodStart?: string;
    periodEnd?: string;
  }>;
}) {
  const { clientId, contractId, amount, periodStart, periodEnd } = await searchParams;
  const [clients, contracts, suggestedInvoiceNumber] = await Promise.all([
    ClientService.getClients(),
    ContractService.getContracts(),
    InvoiceService.generateInvoiceNumber(),
  ]);

  return (
    <InvoiceForm
      clients={clients}
      contracts={contracts as any}
      initialClientId={clientId}
      initialContractId={contractId}
      initialAmount={amount ? Number(amount) : undefined}
      initialPeriodStart={periodStart}
      initialPeriodEnd={periodEnd}
      suggestedInvoiceNumber={suggestedInvoiceNumber}
    />
  );
}
