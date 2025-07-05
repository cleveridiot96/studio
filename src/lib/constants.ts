
import type { MasterItem } from '@/lib/types';

export const FIXED_WAREHOUSES: Readonly<MasterItem[]> = [
  { id: 'fixed-wh-mumbai', name: 'MUMBAI', type: 'Warehouse' },
  { id: 'fixed-wh-chiplun', name: 'CHIPLUN', type: 'Warehouse' },
  { id: 'fixed-wh-sawantwadi', name: 'SAWANTWADI', type: 'Warehouse' },
];

export const FIXED_EXPENSES: Readonly<MasterItem[]> = [
    { id: 'fixed-exp-packing', name: 'Packing Charges', type: 'Expense' },
    { id: 'fixed-exp-labour', name: 'Labour Charges', type: 'Expense' },
    { id: 'fixed-exp-misc', name: 'Misc Expenses', type: 'Expense' },
];
