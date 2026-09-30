import db from "@/lib/db";
import { format, startOfYear, endOfYear } from "date-fns";
import { roundMoney, calculateInvoicePaymentStatus } from "@/lib/financial";

export class ReportService {
  static async getFinancialReports(startDate?: Date, endDate?: Date) {
    const wherePayments: { paymentDate?: { gte?: Date; lte?: Date } } = {};
    if (startDate || endDate) {
      wherePayments.paymentDate = {};
      if (startDate) wherePayments.paymentDate.gte = startDate;
      if (endDate) wherePayments.paymentDate.lte = endDate;
    }

    const [allPayments, allInvoices, activeContracts] = await Promise.all([
      db.payment.findMany({
        where: wherePayments,
        include: {
          invoice: {
            include: { client: true },
          },
        },
        orderBy: { paymentDate: "asc" },
      }),
      db.invoice.findMany({
        where: {
          isArchived: false,
          status: { not: "Cancelled" },
        },
        include: {
          client: true,
          payments: true,
        },
        orderBy: { issueDate: "desc" },
      }),
      db.contract.findMany({
        where: { isArchived: false, status: "Active" },
        include: { client: true },
      }),
    ]);

    // 1. Revenue by Month
    const revenueByMonthMap: Record<string, number> = {};
    for (const p of allPayments) {
      const monthKey = format(new Date(p.paymentDate), "yyyy-MM");
      revenueByMonthMap[monthKey] = (revenueByMonthMap[monthKey] || 0) + p.amount;
    }
    const revenueByMonth = Object.entries(revenueByMonthMap).map(([month, amount]) => ({
      month,
      amount: roundMoney(amount),
    }));

    // 2. Revenue by Year
    const revenueByYearMap: Record<string, number> = {};
    for (const p of allPayments) {
      const yearKey = format(new Date(p.paymentDate), "yyyy");
      revenueByYearMap[yearKey] = (revenueByYearMap[yearKey] || 0) + p.amount;
    }
    const revenueByYear = Object.entries(revenueByYearMap).map(([year, amount]) => ({
      year,
      amount: roundMoney(amount),
    }));

    // 3. Revenue by Client
    const revenueByClientMap: Record<string, { clientName: string; totalPaid: number; totalInvoiced: number }> = {};
    for (const inv of allInvoices) {
      const cName = inv.client.companyName;
      if (!revenueByClientMap[cName]) {
        revenueByClientMap[cName] = { clientName: cName, totalPaid: 0, totalInvoiced: 0 };
      }
      revenueByClientMap[cName].totalInvoiced += inv.total;
    }
    for (const p of allPayments) {
      const cName = p.invoice.client.companyName;
      if (!revenueByClientMap[cName]) {
        revenueByClientMap[cName] = { clientName: cName, totalPaid: 0, totalInvoiced: 0 };
      }
      revenueByClientMap[cName].totalPaid += p.amount;
    }

    const revenueByClient = Object.values(revenueByClientMap).map((item) => ({
      clientName: item.clientName,
      totalInvoiced: roundMoney(item.totalInvoiced),
      totalPaid: roundMoney(item.totalPaid),
      outstanding: Math.max(0, roundMoney(item.totalInvoiced - item.totalPaid)),
    }));

    // 4. Balances summary
    let totalInvoicedAll = 0;
    let totalPaidAll = 0;
    let outstandingAll = 0;
    let overdueAll = 0;

    for (const inv of allInvoices) {
      const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
      const calc = calculateInvoicePaymentStatus(inv.total, paid, inv.dueDate, inv.status);

      totalInvoicedAll += inv.total;
      totalPaidAll += paid;
      outstandingAll += calc.remainingBalance;
      if (calc.status === "Overdue") {
        overdueAll += calc.remainingBalance;
      }
    }

    // 5. Contracted MRR & ARR
    let contractedMonthly = 0;
    for (const c of activeContracts) {
      if (c.billingFrequency === "Monthly") contractedMonthly += c.amount;
      else if (c.billingFrequency === "Quarterly") contractedMonthly += c.amount / 3;
      else if (c.billingFrequency === "Yearly") contractedMonthly += c.amount / 12;
    }
    const contractedYearly = contractedMonthly * 12;

    return {
      revenueByMonth,
      revenueByYear,
      revenueByClient,
      balances: {
        totalInvoiced: roundMoney(totalInvoicedAll),
        totalPaid: roundMoney(totalPaidAll),
        outstanding: roundMoney(outstandingAll),
        overdue: roundMoney(overdueAll),
      },
      contracted: {
        monthly: roundMoney(contractedMonthly),
        yearly: roundMoney(contractedYearly),
      },
    };
  }

  /**
   * Generates a CSV export of all financial records
   */
  static async exportInvoicesToCsv(): Promise<string> {
    const invoices = await db.invoice.findMany({
      where: { isArchived: false },
      include: {
        client: true,
        contract: true,
        payments: true,
      },
      orderBy: { issueDate: "desc" },
    });

    const header = [
      "Invoice Number",
      "Client",
      "Contract",
      "Issue Date",
      "Due Date",
      "Currency",
      "Subtotal",
      "Tax Amount",
      "Total",
      "Amount Paid",
      "Balance Due",
      "Status",
    ].join(",");

    const rows = invoices.map((inv) => {
      const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
      const balance = Math.max(0, inv.total - paid);

      return [
        `"${inv.invoiceNumber}"`,
        `"${inv.client.companyName.replace(/"/g, '""')}"`,
        `"${inv.contract ? inv.contract.title.replace(/"/g, '""') : ""}"`,
        `"${format(new Date(inv.issueDate), "yyyy-MM-dd")}"`,
        `"${format(new Date(inv.dueDate), "yyyy-MM-dd")}"`,
        `"${inv.currency}"`,
        inv.subtotal.toFixed(2),
        inv.taxAmount.toFixed(2),
        inv.total.toFixed(2),
        paid.toFixed(2),
        balance.toFixed(2),
        `"${inv.status}"`,
      ].join(",");
    });

    return [header, ...rows].join("\n");
  }
}
