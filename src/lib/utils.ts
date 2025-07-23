
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { endOfDay } from 'date-fns';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFinancialYearDateRange(financialYearString: string): { start: Date, end: Date } | null {
  if (!financialYearString || typeof financialYearString !== 'string') return null;
  const [startYearStr] = financialYearString.split('-');
  const startYear = parseInt(startYearStr, 10);
  if (isNaN(startYear)) return null;

  const startDate = new Date(startYear, 3, 1); // April 1st
  const endDate = endOfDay(new Date(startYear + 1, 2, 31)); // March 31st, end of day
  return { start: startDate, end: endDate };
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
    // Adjust for timezone offset to prevent off-by-one day errors
    const userTimezoneOffset = itemDate.getTimezoneOffset() * 60000;
    const dateInUTC = new Date(itemDate.getTime() + userTimezoneOffset);


    const fyRange = getFinancialYearDateRange(financialYearString);
    if (!fyRange) return false;

    if (isNaN(dateInUTC.getTime())) {
        console.error("Invalid date string:", dateString);
        return false;
    }

    return dateInUTC >= fyRange.start && dateInUTC <= fyRange.end;
  } catch (error) {
    console.error("Error in isDateInFinancialYear:", error);
    return false;
  }
}

/**
 * Checks if a given date string is before the start of a specified financial year.
 * @param dateString The date to check, in "yyyy-MM-dd" format.
 * @param financialYearString The financial year, in "YYYY1-YYYY2" format (e.g., "2023-2024").
 * @returns True if the date is before the financial year starts, false otherwise.
 */
export function isDateBeforeFinancialYear(dateString: string, financialYearString: string): boolean {
  if (!dateString || !financialYearString) return false;

  try {
    const itemDate = new Date(dateString);
    const userTimezoneOffset = itemDate.getTimezoneOffset() * 60000;
    const dateInUTC = new Date(itemDate.getTime() + userTimezoneOffset);

    const fyRange = getFinancialYearDateRange(financialYearString);
    if (!fyRange) return false;

    if (isNaN(dateInUTC.getTime())) return false;

    return dateInUTC < fyRange.start;
  } catch (error) {
    console.error("Error in isDateBeforeFinancialYear:", error);
    return false;
  }
}
