import { notFound } from "next/navigation";
import { ClientService } from "@/services/client.service";
import { ClientDetailClient } from "@/components/clients/client-detail-client";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await ClientService.getClientById(id);

  if (!client) {
    notFound();
  }

  return <ClientDetailClient client={client} />;
}
