import db from "@/lib/db";
import { SearchResult } from "@/types";

export class SearchService {
  static async searchAll(query: string): Promise<SearchResult[]> {
    if (!query || query.trim().length < 2) return [];

    const q = query.trim();

    const [clients, contracts, invoices, documents] = await Promise.all([
      db.client.findMany({
        where: {
          isArchived: false,
          OR: [
            { companyName: { contains: q } },
            { contactName: { contains: q } },
            { email: { contains: q } },
          ],
        },
        take: 5,
      }),
      db.contract.findMany({
        where: {
          isArchived: false,
          OR: [
            { title: { contains: q } },
            { contractNumber: { contains: q } },
            { description: { contains: q } },
          ],
        },
        include: { client: true },
        take: 5,
      }),
      db.invoice.findMany({
        where: {
          isArchived: false,
          OR: [
            { invoiceNumber: { contains: q } },
            { notes: { contains: q } },
          ],
        },
        include: { client: true },
        take: 5,
      }),
      db.document.findMany({
        where: {
          isArchived: false,
          name: { contains: q },
        },
        take: 5,
      }),
    ]);

    const results: SearchResult[] = [];

    for (const c of clients) {
      results.push({
        type: "client",
        id: c.id,
        title: c.companyName,
        subtitle: c.contactName ? `${c.contactName} (${c.email})` : c.email,
        url: `/clients/${c.id}`,
      });
    }

    for (const con of contracts) {
      results.push({
        type: "contract",
        id: con.id,
        title: con.title,
        subtitle: `${con.contractNumber} · ${con.client.companyName}`,
        status: con.status,
        url: `/contracts/${con.id}`,
      });
    }

    for (const inv of invoices) {
      results.push({
        type: "invoice",
        id: inv.id,
        title: inv.invoiceNumber,
        subtitle: `${inv.client.companyName} · €${inv.total}`,
        status: inv.status,
        url: `/invoices/${inv.id}`,
      });
    }

    for (const doc of documents) {
      results.push({
        type: "document",
        id: doc.id,
        title: doc.name,
        subtitle: `${doc.type} (${(doc.fileSize / 1024).toFixed(0)} KB)`,
        url: doc.fileUrl,
      });
    }

    return results;
  }
}
