import db from "@/lib/db";
import { ClientInput } from "@/schemas";
import { roundMoney } from "@/lib/financial";

export class ClientService {
  static async getClients(search?: string, showArchived: boolean = false) {
    const where: { isArchived?: boolean; OR?: Array<{ companyName?: { contains: string }; contactName?: { contains: string }; email?: { contains: string } }> } = {
      isArchived: showArchived ? undefined : false,
    };

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { companyName: { contains: q } },
        { contactName: { contains: q } },
        { email: { contains: q } },
      ];
    }

    const clients = await db.client.findMany({
      where,
      orderBy: { companyName: "asc" },
      include: {
        contracts: {
          where: { isArchived: false },
          select: { id: true, status: true, amount: true },
        },
        invoices: {
          where: { isArchived: false },
          select: { id: true, total: true, status: true, payments: { select: { amount: true } } },
        },
      },
    });

    return clients.map((client) => {
      let totalInvoiced = 0;
      let totalPaid = 0;

      for (const inv of client.invoices) {
        if (inv.status !== "Cancelled") {
          totalInvoiced += inv.total;
          const paidForInv = inv.payments.reduce((sum, p) => sum + p.amount, 0);
          totalPaid += paidForInv;
        }
      }

      totalInvoiced = roundMoney(totalInvoiced);
      totalPaid = roundMoney(totalPaid);
      const outstanding = Math.max(0, roundMoney(totalInvoiced - totalPaid));
      const activeContracts = client.contracts.filter((c) => c.status === "Active").length;

      return {
        ...client,
        totalInvoiced,
        totalPaid,
        outstanding,
        activeContracts,
      };
    });
  }

  static async getClientById(id: string) {
    const client = await db.client.findUnique({
      where: { id },
      include: {
        contracts: {
          where: { isArchived: false },
          orderBy: { startDate: "desc" },
          include: { recurringBilling: true },
        },
        invoices: {
          where: { isArchived: false },
          orderBy: { issueDate: "desc" },
          include: {
            items: true,
            payments: { orderBy: { paymentDate: "desc" } },
          },
        },
        documents: {
          where: { isArchived: false },
          orderBy: { uploadedAt: "desc" },
        },
      },
    });

    if (!client) return null;

    let totalInvoiced = 0;
    let totalPaid = 0;
    const paymentsList: Array<unknown> = [];

    const enrichedInvoices = client.invoices.map((inv) => {
      const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
      paymentsList.push(...inv.payments);
      if (inv.status !== "Cancelled") {
        totalInvoiced += inv.total;
        totalPaid += paid;
      }
      return {
        ...inv,
        amountPaid: roundMoney(paid),
        remainingBalance: Math.max(0, roundMoney(inv.total - paid)),
      };
    });

    totalInvoiced = roundMoney(totalInvoiced);
    totalPaid = roundMoney(totalPaid);
    const outstandingAmount = Math.max(0, roundMoney(totalInvoiced - totalPaid));

    const activeContracts = client.contracts.filter((c) => c.status === "Active");
    const pastContracts = client.contracts.filter((c) => c.status !== "Active");

    return {
      ...client,
      invoices: enrichedInvoices,
      allPayments: paymentsList,
      activeContracts,
      pastContracts,
      totalInvoiced,
      totalPaid,
      outstandingAmount,
    };
  }

  static async createClient(data: ClientInput) {
    return db.client.create({
      data: {
        companyName: data.companyName,
        contactName: data.contactName || null,
        email: data.email,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        postalCode: data.postalCode || null,
        country: data.country || "France",
        vatNumber: data.vatNumber || null,
        siret: data.siret || null,
        notes: data.notes || null,
      },
    });
  }

  static async updateClient(id: string, data: Partial<ClientInput>) {
    return db.client.update({
      where: { id },
      data: {
        ...(data.companyName && { companyName: data.companyName }),
        ...(data.contactName !== undefined && { contactName: data.contactName }),
        ...(data.email && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.postalCode !== undefined && { postalCode: data.postalCode }),
        ...(data.country !== undefined && { country: data.country }),
        ...(data.vatNumber !== undefined && { vatNumber: data.vatNumber }),
        ...(data.siret !== undefined && { siret: data.siret }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });
  }

  static async archiveClient(id: string) {
    return db.client.update({
      where: { id },
      data: { isArchived: true },
    });
  }
}
