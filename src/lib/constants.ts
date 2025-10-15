
import type { MasterItem } from '@/lib/types';

export const FIXED_WAREHOUSES: Readonly<MasterItem[]> = [
  { id: 'fixed-wh-mumbai', name: 'MUMBAI', type: 'Warehouse' },
  { id: 'fixed-wh-chiplun', name: 'CHIPLUN', type: 'Warehouse' },
  { id: 'fixed-wh-sawantwadi', name: 'SAWANTWADI', type: 'Warehouse' },
];

export const FIXED_EXPENSES: Readonly<MasterItem[]> = [
    { id: 'exp-packing-charges', name: 'Packing Charges', type: 'Expense' },
    { id: 'exp-labour-charges', name: 'Labour Charges', type: 'Expense' },
    { id: 'exp-misc-expenses', name: 'Misc Expenses', type: 'Expense' },
    { id: 'exp-transport-charges', name: 'Transport Charges', type: 'Expense' },
];

  
