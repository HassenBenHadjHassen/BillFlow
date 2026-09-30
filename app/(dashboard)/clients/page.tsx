import { ClientService } from "@/services/client.service";
import { ClientsClient } from "@/components/clients/clients-client";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await ClientService.getClients();
  return <ClientsClient initialClients={clients} />;
}
