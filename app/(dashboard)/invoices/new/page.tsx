import { ClientService } from "@/services/client.service";
import { ContractService } from "@/services/contract.service";
import { InvoiceBuilder } from "@/components/invoices/invoice-builder";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { SettingsService } from "@/services/settings.service";
import { format } from "date-fns";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

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
    mode?: string;
  }>;
}) {
  if (!await getSession()) redirect("/login");
  const { clientId, contractId, amount, periodStart, periodEnd, mode } = await searchParams;
  const [clients, contracts, company] = await Promise.all([
    ClientService.getClients(),
    ContractService.getContracts(),
    mode === "import" ? null : SettingsService.getCompanySettings(),
  ]);

  const initialAmount = amount?.trim() && Number.isFinite(Number(amount)) && Number(amount) >= 0 ? Number(amount) : undefined;
  const initial = {
    initialClientId: clientId,
    initialContractId: contractId,
    initialAmount,
    initialPeriodStart: periodStart,
    initialPeriodEnd: periodEnd,
  };
  if (!company) return <InvoiceForm clients={clients} contracts={contracts as any} {...initial} />;

  const importParams = new URLSearchParams({ mode: "import" });
  for (const [key, value] of Object.entries({ clientId, contractId, amount, periodStart, periodEnd })) {
    if (value) importParams.set(key, value);
  }
  return (
    <InvoiceBuilder
      clients={clients}
      contracts={contracts.map(({ id, clientId, title, contractNumber, currency, paymentTerms, amount }) => ({
        id, clientId, title, contractNumber, currency, paymentTerms, amount,
      }))}
      company={company}
      today={format(new Date(), "yyyy-MM-dd")}
      importHref={"/invoices/new?" + importParams}
      {...initial}
    />
  );
}
