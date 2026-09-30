import { DocumentService } from "@/services/document.service";
import { ClientService } from "@/services/client.service";
import { DocumentsClient } from "@/components/documents/documents-client";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const [documents, clients] = await Promise.all([
    DocumentService.getDocuments(),
    ClientService.getClients(),
  ]);

  return <DocumentsClient documents={documents} clients={clients} />;
}
