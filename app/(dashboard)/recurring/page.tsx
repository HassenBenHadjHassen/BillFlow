import { RecurringBillingService } from "@/services/recurring.service";
import { RecurringClient } from "@/components/recurring/recurring-client";

export const dynamic = "force-dynamic";

export default async function RecurringBillingPage() {
  const configs = await RecurringBillingService.getRecurringConfigs();
  return <RecurringClient configs={configs} />;
}
