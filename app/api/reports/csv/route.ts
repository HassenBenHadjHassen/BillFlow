import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ReportService } from "@/services/report.service";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const csvData = await ReportService.exportInvoicesToCsv();

    return new NextResponse(csvData, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="billflow_invoices_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (err: unknown) {
    console.error("CSV export error:", err);
    return new NextResponse("Failed to export CSV", { status: 500 });
  }
}
