import { PaymentService } from "@/services/payment.service";
import { PaymentsClient } from "@/components/payments/payments-client";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const payments = await PaymentService.getPayments();
  return <PaymentsClient payments={payments} />;
}
