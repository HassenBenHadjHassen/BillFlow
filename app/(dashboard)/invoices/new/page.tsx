import { ClientService } from "@/services/client.service";
import { ContractService } from "@/services/contract.service";
import { InvoiceForm } from "@/components/invoices/invoice-form";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; contractId?: string }>;
}) {
  const { clientId, contractId } = await searchParams;
  const [clients, contracts] = await Promise.all([
    ClientService.getClients(),
    ContractService.getContracts(),
  ]);

  return (
    <InvoiceForm
      clients={clients}
      contracts={contracts as any}
      initialClientId={clientId}
      initialContractId={contractId}
    />
  );
}
