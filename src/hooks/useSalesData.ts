import { useState, useEffect } from 'react';

interface SaleData {
  lotNumber: string;
  date: string;
  rate: number;
  netWeight: number;
}

export const useSalesData = (): SaleData[] => {
  const [sales, setSales] = useState<SaleData[]>([]);

  useEffect(() => {
    // Dummy data based on the provided schema
    const dummySalesData: SaleData[] = [
      {
        lotNumber: "VK/5",
        date: "2025-05-10",
        rate: 200,
        netWeight: 50
      },
      {
        lotNumber: "VK/5",
        date: "2025-05-12",
        rate: 150,
        netWeight: 100
      },
      {
        lotNumber: "AB/1",
        date: "2025-05-15",
        rate: 300,
        netWeight: 75
      }
    ];
    setSales(dummySalesData);

    // TODO: Replace with actual Firebase data fetching logic
    // Example:
    // const unsubscribe = firebase.firestore().collection('sales').onSnapshot(snapshot => {
    //   const salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as SaleData }));
    //   setSales(salesData);
    // });
    // return () => unsubscribe();
  }, []);

  return sales;
};