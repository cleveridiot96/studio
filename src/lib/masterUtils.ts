
import type { MasterItem, MasterItemType } from '@/lib/types';

export const doesNameExist = (
  name: string,
  type: MasterItemType,
  currentItemId: string | undefined,
  allItems: MasterItem[]
): boolean => {
  return allItems.some(
    (item) =>
      item.name.toLowerCase() === name.toLowerCase() &&
      item.type === type &&
      item.id !== currentItemId
  );
};
