import { ReportService } from "@/services/report.service";
import { ReportsClient } from "@/components/reports/reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const reports = await ReportService.getFinancialReports();
  return <ReportsClient initialData={reports} />;
}
