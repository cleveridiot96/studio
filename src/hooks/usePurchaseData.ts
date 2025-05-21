import { useEffect, useState } from 'react';

interface PurchaseData {
  lotNumber: string;
  date: string;
  rate: number;
  netWeight: number;
}

export const usePurchaseData = (): PurchaseData[] => {
  const [purchases, setPurchases] = useState<PurchaseData[]>([]);

  // TODO: Replace with actual Firebase data fetching logic
  useEffect(() => {
    const dummyPurchaseData: PurchaseData[] = [
      {
        lotNumber: "VK/5",
        date: "2025-05-01",
        rate: 100,
        netWeight: 250
      }
      // Add more dummy data as needed
    ];
    setPurchases(dummyPurchaseData);
  }, []);

  return purchases;
};