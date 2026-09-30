import { ContractService } from "@/services/contract.service";
import { ClientService } from "@/services/client.service";
import { ContractsClient } from "@/components/contracts/contracts-client";

export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  const [contracts, clients] = await Promise.all([
    ContractService.getContracts(),
    ClientService.getClients(),
  ]);

  return <ContractsClient initialContracts={contracts} clients={clients} />;
}
