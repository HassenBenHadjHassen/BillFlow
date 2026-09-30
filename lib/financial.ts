/**
 * Financial calculation utilities to prevent floating-point inaccuracies
 */

/**
 * Rounds a number to 2 decimal places using standard banker's/commercial rounding
 */
export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates item total based on quantity, unit price, and tax rate
 */
export function calculateItemTotal(quantity: number, unitPrice: number): number {
  return roundMoney(quantity * unitPrice);
}

/**
 * Calculates invoice totals from an array of items
 */
export function calculateInvoiceTotals(
  items: Array<{ quantity: number; unitPrice: number; taxRate: number }>
): {
  subtotal: number;
  taxAmount: number;
  total: number;
} {
  let subtotal = 0;
  let taxAmount = 0;

  for (const item of items) {
    const itemTotal = calculateItemTotal(item.quantity, item.unitPrice);
    subtotal += itemTotal;
    const itemTax = roundMoney((itemTotal * item.taxRate) / 100);
    taxAmount += itemTax;
  }

  subtotal = roundMoney(subtotal);
  taxAmount = roundMoney(taxAmount);
  const total = roundMoney(subtotal + taxAmount);

  return { subtotal, taxAmount, total };
}

/**
 * Calculates payment balances and determines invoice status
 */
export function calculateInvoicePaymentStatus(
  total: number,
  paidAmount: number,
  dueDate: Date,
  currentStatus: string
): {
  amountPaid: number;
  remainingBalance: number;
  status: 'Draft' | 'Sent' | 'PartiallyPaid' | 'Paid' | 'Overdue' | 'Cancelled';
} {
  const roundedTotal = roundMoney(total);
  const roundedPaid = roundMoney(paidAmount);
  const remainingBalance = Math.max(0, roundMoney(roundedTotal - roundedPaid));

  if (currentStatus === 'Cancelled') {
    return {
      amountPaid: roundedPaid,
      remainingBalance,
      status: 'Cancelled',
    };
  }

  if (currentStatus === 'Draft' && roundedPaid === 0) {
    return {
      amountPaid: 0,
      remainingBalance: roundedTotal,
      status: 'Draft',
    };
  }

  if (roundedPaid >= roundedTotal && roundedTotal > 0) {
    return {
      amountPaid: roundedPaid,
      remainingBalance: 0,
      status: 'Paid',
    };
  }

  const now = new Date();
  // If due date has passed and there is an outstanding balance, mark Overdue
  if (new Date(dueDate) < now && remainingBalance > 0) {
    return {
      amountPaid: roundedPaid,
      remainingBalance,
      status: 'Overdue',
    };
  }

  if (roundedPaid > 0 && roundedPaid < roundedTotal) {
    return {
      amountPaid: roundedPaid,
      remainingBalance,
      status: 'PartiallyPaid',
    };
  }

  return {
    amountPaid: roundedPaid,
    remainingBalance,
    status: 'Sent',
  };
}

/**
 * Format currency with locale and symbol
 */
export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  try {
    const formatted = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency || 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    // Replace narrow non-breaking spaces with standard space for broad compatibility
    return formatted.replace(/[\u202F\u00A0]/g, ' ');
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/**
 * Clean ASCII-safe currency format specifically for PDF Standard WinAnsi fonts
 */
export function formatPdfCurrency(amount: number, currency: string = 'EUR'): string {
  const parts = amount.toFixed(2).split('.');
  const intWithCommas = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const symbol = currency === 'EUR' ? 'EUR' : currency;
  return `${intWithCommas}.${parts[1]} ${symbol}`;
}
