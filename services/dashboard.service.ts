import db from "@/lib/db";
import {
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  format,
  differenceInCalendarDays,
} from "date-fns";
import { roundMoney, calculateInvoicePaymentStatus } from "@/lib/financial";
import { UpcomingEvent } from "@/types";

export class DashboardService {
  static async getDashboardData() {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const yearStart = startOfYear(now);
    const yearEnd = endOfYear(now);

    // 1. Fetch payments for Revenue This Month and This Year
    const paymentsThisMonth = await db.payment.findMany({
      where: {
        paymentDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      select: { amount: true },
    });

    const paymentsThisYear = await db.payment.findMany({
      where: {
        paymentDate: {
          gte: yearStart,
          lte: yearEnd,
        },
      },
      select: { amount: true },
    });

    const revenueThisMonth = roundMoney(paymentsThisMonth.reduce((sum, p) => sum + p.amount, 0));
    const revenueThisYear = roundMoney(paymentsThisYear.reduce((sum, p) => sum + p.amount, 0));

    // 2. Fetch all active invoices to compute Outstanding and Overdue
    const allInvoices = await db.invoice.findMany({
      where: {
        isArchived: false,
        status: { not: "Cancelled" },
      },
      include: {
        payments: { select: { amount: true } },
        client: { select: { companyName: true } },
      },
    });

    let outstandingRevenue = 0;
    let overdueRevenue = 0;
    let overdueCount = 0;

    const statusCounts: Record<string, number> = {
      Draft: 0,
      Sent: 0,
      Paid: 0,
      PartiallyPaid: 0,
      Overdue: 0,
    };

    const clientRevenueMap: Record<string, number> = {};

    for (const inv of allInvoices) {
      const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
      const calc = calculateInvoicePaymentStatus(inv.total, paid, inv.dueDate, inv.status);

      outstandingRevenue += calc.remainingBalance;

      if (calc.status === "Overdue") {
        overdueRevenue += calc.remainingBalance;
        overdueCount++;
      }

      statusCounts[calc.status] = (statusCounts[calc.status] || 0) + 1;

      // Group revenue by client
      if (paid > 0) {
        const clientName = inv.client.companyName;
        clientRevenueMap[clientName] = (clientRevenueMap[clientName] || 0) + paid;
      }
    }

    outstandingRevenue = roundMoney(outstandingRevenue);
    overdueRevenue = roundMoney(overdueRevenue);

    // 3. Contracts and MRR (Monthly Recurring Revenue)
    const activeContracts = await db.contract.findMany({
      where: {
        isArchived: false,
        status: "Active",
      },
      select: { amount: true, billingFrequency: true },
    });

    let monthlyContractedRevenue = 0;
    for (const c of activeContracts) {
      if (c.billingFrequency === "Monthly") {
        monthlyContractedRevenue += c.amount;
      } else if (c.billingFrequency === "Quarterly") {
        monthlyContractedRevenue += c.amount / 3;
      } else if (c.billingFrequency === "Yearly") {
        monthlyContractedRevenue += c.amount / 12;
      }
    }
    monthlyContractedRevenue = roundMoney(monthlyContractedRevenue);

    // 4. Last 12 Months Revenue Trend
    const monthlyTrend: Array<{ month: string; revenue: number; invoiced: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const mDate = subMonths(now, i);
      const mStart = startOfMonth(mDate);
      const mEnd = endOfMonth(mDate);
      const label = format(mDate, "MMM yyyy");

      const [monthPayments, monthInvoices] = await Promise.all([
        db.payment.aggregate({
          where: { paymentDate: { gte: mStart, lte: mEnd } },
          _sum: { amount: true },
        }),
        db.invoice.aggregate({
          where: { issueDate: { gte: mStart, lte: mEnd }, status: { not: "Cancelled" }, isArchived: false },
          _sum: { total: true },
        }),
      ]);

      monthlyTrend.push({
        month: label,
        revenue: roundMoney(monthPayments._sum.amount || 0),
        invoiced: roundMoney(monthInvoices._sum.total || 0),
      });
    }

    // 5. Invoice Status Breakdown for Donut Chart
    const statusBreakdown = [
      { name: "Paid", count: statusCounts.Paid || 0, color: "#10b981" },
      { name: "Sent", count: statusCounts.Sent || 0, color: "#3b82f6" },
      { name: "Partially Paid", count: statusCounts.PartiallyPaid || 0, color: "#f59e0b" },
      { name: "Overdue", count: statusCounts.Overdue || 0, color: "#ef4444" },
      { name: "Draft", count: statusCounts.Draft || 0, color: "#94a3b8" },
    ].filter((item) => item.count > 0);

    // 6. Top Clients by Revenue
    const revenueByClient = Object.entries(clientRevenueMap)
      .map(([name, amount]) => ({ name, revenue: roundMoney(amount) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    // 7. Upcoming Events
    const upcomingEvents: UpcomingEvent[] = [];

    // Due recurring invoices
    const dueRecurring = await db.recurringBilling.findMany({
      where: {
        active: true,
        contract: { status: "Active", isArchived: false },
      },
      include: { contract: { include: { client: true } } },
      orderBy: { nextInvoiceDate: "asc" },
      take: 4,
    });

    for (const rec of dueRecurring) {
      const days = differenceInCalendarDays(new Date(rec.nextInvoiceDate), now);
      const isPast = days < 0;
      upcomingEvents.push({
        id: `rec-${rec.id}`,
        title: `Recurring Invoice: ${rec.contract.client.companyName}`,
        description: `${rec.contract.title} - ${rec.frequency} (€${rec.amount})`,
        date: rec.nextInvoiceDate,
        type: "recurring_due",
        badge: isPast ? `Due ${Math.abs(days)}d ago` : days === 0 ? "Due today" : `Due in ${days}d`,
        href: "/recurring",
      });
    }

    // Overdue or upcoming invoice due dates
    const pendingInvoices = await db.invoice.findMany({
      where: {
        isArchived: false,
        status: { in: ["Sent", "PartiallyPaid", "Overdue"] },
      },
      include: { client: true },
      orderBy: { dueDate: "asc" },
      take: 5,
    });

    for (const inv of pendingInvoices) {
      const days = differenceInCalendarDays(new Date(inv.dueDate), now);
      if (days < 0) {
        upcomingEvents.push({
          id: `inv-${inv.id}`,
          title: `Overdue: ${inv.invoiceNumber}`,
          description: `${inv.client.companyName} - €${inv.total}`,
          date: inv.dueDate,
          type: "invoice_overdue",
          badge: `${Math.abs(days)}d overdue`,
          href: `/invoices/${inv.id}`,
        });
      } else if (days <= 14) {
        upcomingEvents.push({
          id: `inv-${inv.id}`,
          title: `Due Soon: ${inv.invoiceNumber}`,
          description: `${inv.client.companyName} - €${inv.total}`,
          date: inv.dueDate,
          type: "invoice_due",
          badge: days === 0 ? "Due today" : `Due in ${days}d`,
          href: `/invoices/${inv.id}`,
        });
      }
    }

    // Expiring contracts
    const expiringContracts = await db.contract.findMany({
      where: {
        isArchived: false,
        status: "Active",
        endDate: { not: null },
      },
      include: { client: true },
      orderBy: { endDate: "asc" },
      take: 4,
    });

    for (const con of expiringContracts) {
      if (con.endDate) {
        const days = differenceInCalendarDays(new Date(con.endDate), now);
        if (days <= 45 && days >= 0) {
          upcomingEvents.push({
            id: `con-${con.id}`,
            title: `Expiring: ${con.title}`,
            description: `${con.client.companyName} - €${con.amount}/${con.billingFrequency.toLowerCase()}`,
            date: con.endDate,
            type: "contract_expiring",
            badge: days === 0 ? "Expires today" : `Expires in ${days}d`,
            href: `/contracts/${con.id}`,
          });
        }
      }
    }

    // Sort events by date
    upcomingEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      metrics: {
        revenueThisMonth,
        revenueThisYear,
        outstandingRevenue,
        overdueRevenue,
        overdueCount,
        activeContractsCount: activeContracts.length,
        monthlyContractedRevenue,
      },
      monthlyTrend,
      statusBreakdown,
      revenueByClient,
      upcomingEvents: upcomingEvents.slice(0, 8),
    };
  }
}
