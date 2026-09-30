import db from "@/lib/db";
import { ContractInput, RenewContractInput } from "@/schemas";
import { roundMoney } from "@/lib/financial";
import { differenceInCalendarDays } from "date-fns";
import { StorageService } from "./storage.service";

export interface ContractExpirationInfo {
  isExpiringSoon: boolean;
  isExpired: boolean;
  daysRemaining: number | null;
  label: string;
}

export class ContractService {
  static getExpirationInfo(endDate: Date | null, status: string): ContractExpirationInfo {
    if (status === "Terminated") {
      return { isExpiringSoon: false, isExpired: false, daysRemaining: null, label: "Terminated" };
    }
    if (status === "Draft") {
      return { isExpiringSoon: false, isExpired: false, daysRemaining: null, label: "Draft" };
    }
    if (!endDate) {
      return { isExpiringSoon: false, isExpired: false, daysRemaining: null, label: "No expiration date" };
    }

    const today = new Date();
    const days = differenceInCalendarDays(new Date(endDate), today);

    if (days < 0) {
      return {
        isExpiringSoon: false,
        isExpired: true,
        daysRemaining: days,
        label: `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`,
      };
    }

    if (days === 0) {
      return {
        isExpiringSoon: true,
        isExpired: false,
        daysRemaining: 0,
        label: "Expires today",
      };
    }

    if (days <= 30) {
      return {
        isExpiringSoon: true,
        isExpired: false,
        daysRemaining: days,
        label: `Expires in ${days} day${days === 1 ? "" : "s"}`,
      };
    }

    return {
      isExpiringSoon: false,
      isExpired: false,
      daysRemaining: days,
      label: `Active (${days} days remaining)`,
    };
  }

  static async getContracts(clientId?: string, status?: string) {
    const where: { isArchived: boolean; clientId?: string; status?: string } = {
      isArchived: false,
    };
    if (clientId) where.clientId = clientId;
    if (status && status !== "ALL") where.status = status;

    const contracts = await db.contract.findMany({
      where,
      orderBy: { startDate: "desc" },
      include: {
        client: true,
        recurringBilling: true,
        invoices: {
          where: { isArchived: false },
          select: { id: true, total: true, status: true, payments: { select: { amount: true } } },
        },
      },
    });

    return contracts.map((c) => {
      let totalInvoiced = 0;
      let totalPaid = 0;

      for (const inv of c.invoices) {
        if (inv.status !== "Cancelled") {
          totalInvoiced += inv.total;
          totalPaid += inv.payments.reduce((s, p) => s + p.amount, 0);
        }
      }

      const expiration = this.getExpirationInfo(c.endDate, c.status);
      return {
        ...c,
        billingFrequency: c.billingFrequency as any,
        status: c.status as any,
        totalInvoiced: roundMoney(totalInvoiced),
        totalPaid: roundMoney(totalPaid),
        outstandingAmount: Math.max(0, roundMoney(totalInvoiced - totalPaid)),
        expiration,
      };
    });
  }

  static async getContractById(id: string) {
    const contract = await db.contract.findUnique({
      where: { id },
      include: {
        client: true,
        previousContract: true,
        renewals: true,
        recurringBilling: true,
        invoices: {
          where: { isArchived: false },
          orderBy: { issueDate: "desc" },
          include: { payments: true },
        },
        documents: {
          where: { isArchived: false },
          orderBy: { uploadedAt: "desc" },
        },
      },
    });

    if (!contract) return null;

    let totalInvoiced = 0;
    let totalPaid = 0;

    const enrichedInvoices = contract.invoices.map((inv) => {
      const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
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
    const expiration = this.getExpirationInfo(contract.endDate, contract.status);

    return {
      ...contract,
      invoices: enrichedInvoices,
      totalInvoiced,
      totalPaid,
      outstandingAmount,
      expiration,
    };
  }

  static async createContract(
    data: ContractInput,
    file?: { buffer: Buffer; fileName: string; mimeType: string } | null
  ) {
    const startDate = new Date(data.startDate);
    const endDate = data.endDate ? new Date(data.endDate) : null;
    const renewalDate = data.renewalDate ? new Date(data.renewalDate) : null;
    const signedDate = data.signedDate ? new Date(data.signedDate) : null;

    let fileUrl = data.fileUrl || null;
    let storagePath: string | null = null;
    let fileSize = 0;
    let fileName = "";

    if (file && file.buffer && file.buffer.length > 0) {
      fileName = file.fileName || `Contract_${data.contractNumber}.pdf`;
      const uploaded = await StorageService.uploadFile(
        file.buffer,
        fileName,
        file.mimeType || "application/pdf",
        "contracts"
      );
      fileUrl = uploaded.fileUrl;
      storagePath = uploaded.storagePath;
      fileSize = uploaded.fileSize;
    }

    return db.$transaction(async (tx) => {
      const contract = await tx.contract.create({
        data: {
          clientId: data.clientId,
          title: data.title,
          contractNumber: data.contractNumber,
          description: data.description || null,
          startDate,
          endDate,
          renewalDate,
          amount: data.amount,
          currency: data.currency || "EUR",
          billingFrequency: data.billingFrequency,
          paymentTerms: data.paymentTerms || 30,
          status: data.status || "Active",
          signedDate,
          notes: data.notes || null,
          fileUrl,
        },
      });

      if (fileUrl && storagePath) {
        await tx.document.create({
          data: {
            name: fileName,
            type: "SignedContract",
            fileUrl,
            storagePath,
            fileSize,
            mimeType: file?.mimeType || "application/pdf",
            clientId: contract.clientId,
            contractId: contract.id,
          },
        });
      }

      if (data.autoSetupRecurring && data.billingFrequency !== "One-time") {
        await tx.recurringBilling.create({
          data: {
            contractId: contract.id,
            frequency: data.billingFrequency,
            amount: data.amount,
            currency: data.currency || "EUR",
            nextInvoiceDate: startDate,
            active: true,
          },
        });
      }

      return contract;
    });
  }

  static async attachContractDocument(
    contractId: string,
    file: { buffer: Buffer; fileName: string; mimeType: string }
  ) {
    const contract = await db.contract.findUnique({ where: { id: contractId } });
    if (!contract) throw new Error("Contract not found");

    const fileName = file.fileName || `Contract_${contract.contractNumber}.pdf`;
    const uploaded = await StorageService.uploadFile(
      file.buffer,
      fileName,
      file.mimeType || "application/pdf",
      "contracts"
    );

    await db.$transaction(async (tx) => {
      await tx.contract.update({
        where: { id: contractId },
        data: { fileUrl: uploaded.fileUrl },
      });

      await tx.document.create({
        data: {
          name: fileName,
          type: "SignedContract",
          fileUrl: uploaded.fileUrl,
          storagePath: uploaded.storagePath,
          fileSize: uploaded.fileSize,
          mimeType: uploaded.mimeType,
          clientId: contract.clientId,
          contractId: contract.id,
        },
      });
    });

    return uploaded.fileUrl;
  }

  static async updateContract(id: string, data: Partial<ContractInput>) {
    return db.contract.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.contractNumber && { contractNumber: data.contractNumber }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
        ...(data.renewalDate !== undefined && { renewalDate: data.renewalDate ? new Date(data.renewalDate) : null }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.currency && { currency: data.currency }),
        ...(data.billingFrequency && { billingFrequency: data.billingFrequency }),
        ...(data.paymentTerms !== undefined && { paymentTerms: data.paymentTerms }),
        ...(data.status && { status: data.status }),
        ...(data.signedDate !== undefined && { signedDate: data.signedDate ? new Date(data.signedDate) : null }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });
  }

  /**
   * Renews an existing contract:
   * 1. Preserves old contract without overwriting history
   * 2. Sets old contract status to "Expired" or keeps historical state
   * 3. Creates new contract version linked to previousContractId
   * 4. Copies/updates recurring billing if configured
   */
  static async renewContract(data: RenewContractInput) {
    return db.$transaction(async (tx) => {
      const oldContract = await tx.contract.findUnique({
        where: { id: data.contractId },
        include: { recurringBilling: true },
      });

      if (!oldContract) {
        throw new Error("Contract not found");
      }

      // Mark old contract as Expired if it was Active
      if (oldContract.status === "Active" || oldContract.status === "ExpiringSoon") {
        await tx.contract.update({
          where: { id: oldContract.id },
          data: { status: "Expired" },
        });
      }

      const startDate = new Date(data.startDate);
      const endDate = data.endDate ? new Date(data.endDate) : null;
      const renewalDate = data.renewalDate ? new Date(data.renewalDate) : null;

      // Create renewed contract version
      const newContract = await tx.contract.create({
        data: {
          clientId: oldContract.clientId,
          title: data.title,
          contractNumber: data.contractNumber,
          description: oldContract.description,
          startDate,
          endDate,
          renewalDate,
          amount: data.amount,
          currency: oldContract.currency,
          billingFrequency: data.billingFrequency,
          paymentTerms: data.paymentTerms,
          status: "Active",
          notes: data.notes || `Renewed from ${oldContract.contractNumber}`,
          previousContractId: oldContract.id,
        },
      });

      // Update recurring billing config if existed
      if (oldContract.recurringBilling && oldContract.recurringBilling.active) {
        await tx.recurringBilling.update({
          where: { id: oldContract.recurringBilling.id },
          data: { active: false },
        });

        if (data.billingFrequency !== "One-time") {
          await tx.recurringBilling.create({
            data: {
              contractId: newContract.id,
              frequency: data.billingFrequency,
              amount: data.amount,
              currency: oldContract.currency,
              nextInvoiceDate: startDate,
              active: true,
            },
          });
        }
      }

      return newContract;
    });
  }

  static async archiveContract(id: string) {
    return db.contract.update({
      where: { id },
      data: { isArchived: true },
    });
  }
}
