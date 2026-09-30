export type ContractStatus = 'Draft' | 'Active' | 'ExpiringSoon' | 'Expired' | 'Terminated';
export type BillingFrequency = 'One-time' | 'Monthly' | 'Quarterly' | 'Yearly';
export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'PartiallyPaid' | 'Overdue' | 'Cancelled';
export type PaymentMethod = 'BankTransfer' | 'Cash' | 'Card' | 'PayPal' | 'Other';
export type DocumentType = 'Contract' | 'SignedContract' | 'Invoice' | 'Receipt' | 'Quote' | 'TaxDocument' | 'Identification' | 'Other';

export interface UserSession {
  id: string;
  name: string;
  email: string;
}

export interface ClientDTO {
  id: string;
  companyName: string;
  contactName: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  vatNumber: string | null;
  siret: string | null;
  notes: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContractDTO {
  id: string;
  clientId: string;
  title: string;
  contractNumber: string;
  description: string | null;
  startDate: Date;
  endDate: Date | null;
  renewalDate: Date | null;
  amount: number;
  currency: string;
  billingFrequency: BillingFrequency;
  paymentTerms: number;
  status: ContractStatus;
  signedDate: Date | null;
  notes: string | null;
  previousContractId: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  client?: ClientDTO;
  previousContract?: ContractDTO | null;
}

export interface InvoiceItemDTO {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  total: number;
  createdAt: Date;
}

export interface PaymentDTO {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  reference: string | null;
  notes: string | null;
  createdAt: Date;
}

export interface InvoiceDTO {
  id: string;
  clientId: string;
  contractId: string | null;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  currency: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: InvoiceStatus;
  paymentDate: Date | null;
  billingPeriodStart: Date | null;
  billingPeriodEnd: Date | null;
  notes: string | null;
  pdfUrl: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  client?: ClientDTO;
  contract?: ContractDTO | null;
  items?: InvoiceItemDTO[];
  payments?: PaymentDTO[];
  amountPaid?: number;
  remainingBalance?: number;
}

export interface DocumentDTO {
  id: string;
  name: string;
  type: DocumentType;
  fileUrl: string;
  storagePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  clientId: string | null;
  contractId: string | null;
  invoiceId: string | null;
  paymentId: string | null;
  isArchived: boolean;
  client?: ClientDTO | null;
  contract?: ContractDTO | null;
  invoice?: InvoiceDTO | null;
}

export interface RecurringBillingDTO {
  id: string;
  contractId: string;
  frequency: BillingFrequency;
  amount: number;
  currency: string;
  nextInvoiceDate: Date;
  lastInvoiceDate: Date | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  contract?: ContractDTO;
}

export interface CompanySettingsDTO {
  id: number;
  companyName: string;
  logo: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  siret: string | null;
  vatNumber: string | null;
  iban: string | null;
  bic: string | null;
  defaultCurrency: string;
  defaultTaxRate: number;
  defaultPaymentTerms: number;
  invoicePrefix: string;
  invoiceNotes: string | null;
}

export interface DashboardMetrics {
  revenueThisMonth: number;
  revenueThisYear: number;
  outstandingRevenue: number;
  overdueRevenue: number;
  activeContractsCount: number;
  monthlyContractedRevenue: number;
}

export interface UpcomingEvent {
  id: string;
  title: string;
  description: string;
  date: Date;
  type: 'invoice_due' | 'invoice_overdue' | 'contract_expiring' | 'contract_renewal' | 'recurring_due';
  badge: string;
  href: string;
}

export interface SearchResult {
  type: 'client' | 'contract' | 'invoice' | 'document';
  id: string;
  title: string;
  subtitle: string;
  date?: string;
  status?: string;
  url: string;
}
