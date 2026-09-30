import db from "@/lib/db";
import { StorageService } from "./storage.service";

export class DocumentService {
  static async getDocuments(filters?: {
    type?: string;
    clientId?: string;
    contractId?: string;
    invoiceId?: string;
    search?: string;
  }) {
    const where: {
      isArchived: boolean;
      type?: string;
      clientId?: string;
      contractId?: string;
      invoiceId?: string;
      name?: { contains: string };
    } = {
      isArchived: false,
    };

    if (filters?.type && filters.type !== "ALL") where.type = filters.type;
    if (filters?.clientId) where.clientId = filters.clientId;
    if (filters?.contractId) where.contractId = filters.contractId;
    if (filters?.invoiceId) where.invoiceId = filters.invoiceId;
    if (filters?.search && filters.search.trim()) {
      where.name = { contains: filters.search.trim() };
    }

    return db.document.findMany({
      where,
      orderBy: { uploadedAt: "desc" },
      include: {
        client: { select: { id: true, companyName: true } },
        contract: { select: { id: true, title: true, contractNumber: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
      },
    });
  }

  static async getDocumentById(id: string) {
    return db.document.findUnique({
      where: { id },
      include: {
        client: true,
        contract: true,
        invoice: true,
        payment: true,
      },
    });
  }

  static async uploadDocument(
    fileBuffer: Buffer | Uint8Array,
    fileName: string,
    mimeType: string,
    type: string,
    associations: {
      clientId?: string | null;
      contractId?: string | null;
      invoiceId?: string | null;
      paymentId?: string | null;
    }
  ) {
    let folder = "general";
    if (associations.contractId) folder = `contracts/${associations.contractId}`;
    else if (associations.invoiceId) folder = `invoices/${associations.invoiceId}`;
    else if (associations.clientId) folder = `clients/${associations.clientId}`;

    const storedFile = await StorageService.uploadFile(
      fileBuffer,
      fileName,
      mimeType,
      folder
    );

    return db.document.create({
      data: {
        name: fileName,
        type: type || "Other",
        fileUrl: storedFile.fileUrl,
        storagePath: storedFile.storagePath,
        fileSize: storedFile.fileSize,
        mimeType: storedFile.mimeType,
        clientId: associations.clientId || null,
        contractId: associations.contractId || null,
        invoiceId: associations.invoiceId || null,
        paymentId: associations.paymentId || null,
      },
    });
  }

  static async deleteDocument(id: string) {
    const doc = await db.document.findUnique({ where: { id } });
    if (!doc) throw new Error("Document not found");

    if (doc.storagePath) {
      await StorageService.deleteFile(doc.storagePath);
    }

    return db.document.delete({
      where: { id },
    });
  }
}
