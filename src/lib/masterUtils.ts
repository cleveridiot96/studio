
import type { MasterItem, MasterItemType } from '@/lib/types';

/**
 * Checks if a master item name already exists for a given type, excluding the current item being edited.
 * Optimized for performance by converting names to lowercase once.
 * This comparison is case-insensitive.
 */
export const doesNameExist = (
  name: string,
  type: MasterItemType,
  currentItemId: string | undefined,
  allItems: MasterItem[]
): boolean => {
  const lowerCaseName = name.toLowerCase();
  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    if (
      item.name.toLowerCase() === lowerCaseName &&
      item.type === type &&
      item.id !== currentItemId
    ) {
      return true;
    }
  }
  return false;
};
