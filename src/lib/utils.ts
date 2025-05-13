import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Checks if a given date string falls within a specified financial year.
 * A financial year "YYYY1-YYYY2" runs from April 1st of YYYY1 to March 31st of YYYY2.
 * @param dateString The date to check, in "yyyy-MM-dd" format.
 * @param financialYearString The financial year, in "YYYY1-YYYY2" format (e.g., "2023-2024").
 * @returns True if the date is within the financial year, false otherwise.
 */
export function isDateInFinancialYear(dateString: string, financialYearString: string): boolean {
  if (!dateString || !financialYearString) {
    return false;
  }

  try {
    const itemDate = new Date(dateString);
    // Adjust for timezone offset to ensure date comparison is based on local date parts
    itemDate.setMinutes(itemDate.getMinutes() + itemDate.getTimezoneOffset());


    const [fyStartYearStr] = financialYearString.split('-');
    const fyStartYear = parseInt(fyStartYearStr, 10);

    if (isNaN(fyStartYear)) {
      console.error("Invalid financial year string format:", financialYearString);
      return false;
    }

    const fyStartDate = new Date(fyStartYear, 3, 1); // April is month 3 (0-indexed)
    const fyEndDate = new Date(fyStartYear + 1, 2, 31); // March is month 2 (0-indexed)
    
    // Ensure itemDate is not an invalid date
    if (isNaN(itemDate.getTime())) {
        console.error("Invalid date string:", dateString);
        return false;
    }

    return itemDate >= fyStartDate && itemDate <= fyEndDate;
  } catch (error) {
    console.error("Error in isDateInFinancialYear:", error);
    return false;
  }
}
