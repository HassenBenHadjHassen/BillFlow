import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const UpdateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Confirm password is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

export const ClientSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  contactName: z.string().optional().nullable(),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().default("France"),
  vatNumber: z.string().optional().nullable(),
  siret: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type ClientInput = z.infer<typeof ClientSchema>;

export const ContractSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  title: z.string().min(2, "Contract title is required"),
  contractNumber: z.string().min(2, "Contract number is required"),
  description: z.string().optional().nullable(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional().nullable(),
  renewalDate: z.string().optional().nullable(),
  amount: z.coerce.number().min(0, "Amount must be greater than or equal to 0"),
  currency: z.string().default("EUR"),
  billingFrequency: z.enum(["One-time", "Monthly", "Quarterly", "Yearly"]).default("Monthly"),
  paymentTerms: z.coerce.number().int().default(30),
  status: z.enum(["Draft", "Active", "ExpiringSoon", "Expired", "Terminated"]).default("Active"),
  signedDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  fileUrl: z.string().optional().nullable(),
  autoSetupRecurring: z.boolean().default(false),
});
export type ContractInput = z.infer<typeof ContractSchema>;

export const RenewContractSchema = z.object({
  contractId: z.string().min(1, "Existing contract ID is required"),
  title: z.string().min(2, "Contract title is required"),
  contractNumber: z.string().min(2, "Contract number is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional().nullable(),
  renewalDate: z.string().optional().nullable(),
  amount: z.coerce.number().min(0, "Amount must be at least 0"),
  billingFrequency: z.enum(["One-time", "Monthly", "Quarterly", "Yearly"]).default("Monthly"),
  paymentTerms: z.coerce.number().int().default(30),
  notes: z.string().optional().nullable(),
  fileUrl: z.string().optional().nullable(),
});
export type RenewContractInput = z.infer<typeof RenewContractSchema>;

export const InvoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Unit price must be at least 0"),
  taxRate: z.coerce.number().min(0, "Tax rate must be at least 0").default(20),
});
export type InvoiceItemInput = z.infer<typeof InvoiceItemSchema>;

export const SaveInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  clientId: z.string().min(1, "Client is required"),
  contractId: z.string().optional().nullable(),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  currency: z.string().default("EUR"),
  subtotal: z.coerce.number().min(0, "Subtotal must be at least 0"),
  taxRate: z.coerce.number().min(0, "Tax rate must be at least 0").default(20),
  taxAmount: z.coerce.number().min(0).default(0),
  total: z.coerce.number().min(0, "Total amount must be at least 0"),
  status: z.enum(["Draft", "Sent", "Paid", "PartiallyPaid", "Overdue", "Cancelled"]).default("Sent"),
  paymentDate: z.string().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  billingPeriodStart: z.string().optional().nullable(),
  billingPeriodEnd: z.string().optional().nullable(),
});
export type SaveInvoiceInput = z.infer<typeof SaveInvoiceSchema>;

export const InvoiceSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  contractId: z.string().optional().nullable(),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  currency: z.string().default("EUR"),
  notes: z.string().optional().nullable(),
  billingPeriodStart: z.string().optional().nullable(),
  billingPeriodEnd: z.string().optional().nullable(),
  items: z.array(InvoiceItemSchema).min(1, "At least one item is required"),
});
export type InvoiceInput = z.infer<typeof InvoiceSchema>;

export const PaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  amount: z.coerce.number().min(0.01, "Payment amount must be greater than 0"),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: z.enum(["BankTransfer", "Cash", "Card", "PayPal", "Other"]).default("BankTransfer"),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type PaymentInput = z.infer<typeof PaymentSchema>;

export const UpdateInvoicePaymentDateSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  paymentDate: z.string().min(1, "Payment date is required"),
});
export type UpdateInvoicePaymentDateInput = z.infer<typeof UpdateInvoicePaymentDateSchema>;

export const UpdatePaymentDateSchema = z.object({
  paymentId: z.string().min(1, "Payment ID is required"),
  paymentDate: z.string().min(1, "Payment date is required"),
});
export type UpdatePaymentDateInput = z.infer<typeof UpdatePaymentDateSchema>;

export const CompanySettingsSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  logo: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().default("France"),
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  phone: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  siret: z.string().optional().nullable(),
  vatNumber: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  bic: z.string().optional().nullable(),
  defaultCurrency: z.string().default("EUR"),
  defaultTaxRate: z.coerce.number().min(0).default(20),
  defaultPaymentTerms: z.coerce.number().int().min(0).default(30),
  invoicePrefix: z.string().min(1).default("INV"),
  invoiceNotes: z.string().optional().nullable(),
});
export type CompanySettingsInput = z.infer<typeof CompanySettingsSchema>;
