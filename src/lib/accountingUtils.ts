import type { Payment, Purchase, Sale, Receipt } from './types';

const getYearSpecificStorageKey = (financialYear: string, key: string): string => {
  return `[FY-${financialYear}]_${key}`;
};

export const getTransactionsForFinancialYear = (financialYear: string) => {
  const purchasesKey = getYearSpecificStorageKey(financialYear, 'purchasesData');
  const salesKey = getYearSpecificStorageKey(financialYear, 'salesData');
  const paymentsKey = getYearSpecificStorageKey(financialYear, 'paymentsData');
  const receiptsKey = getYearSpecificStorageKey(financialYear, 'receiptsData');

  const purchasesData = localStorage.getItem(purchasesKey);
  const salesData = localStorage.getItem(salesKey);
  const paymentsData = localStorage.getItem(paymentsKey);
  const receiptsData = localStorage.getItem(receiptsKey);

  const purchases: Purchase[] = purchasesData ? JSON.parse(purchasesData) : [];
  const sales: Sale[] = salesData ? JSON.parse(salesData) : [];
  const payments: Payment[] = paymentsData ? JSON.parse(paymentsData) : [];
  const receipts: Receipt[] = receiptsData ? JSON.parse(receiptsData) : [];

  return {
    purchases,
    sales,
    payments,
    receipts,
  };
};