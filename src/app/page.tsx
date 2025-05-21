import { redirect } from 'next/navigation';
import { ProfitSummary } from '@/components/dashboard/ProfitSummary';
// Assume these hooks exist and fetch data from Firebase
// import { useSalesData } from '@/hooks/useSalesData';
// import { usePurchaseData } from '@/hooks/usePurchaseData';

export default function HomePage() {
  redirect('/dashboard');

  // In a real scenario, you would fetch and pass data here
  // const sales = useSalesData();
  // const purchases = usePurchaseData();
  return null; // Redirect is usually fast, no need to render anything here
}
