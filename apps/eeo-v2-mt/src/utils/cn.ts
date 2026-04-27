/**
 * Utility funkce pro CSS třídy
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Spojit CSS třídy s Tailwind merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Získat barvu pro stav objednávky
 */
export const getStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    NOVA: 'bg-blue-500',
    KE_SCHVALENI: 'bg-yellow-500',
    ODESLANA_KE_SCHVALENI: 'bg-yellow-500',
    SCHVALENA: 'bg-green-500',
    ZAMITNUTA: 'bg-red-500',
    ROZPRACOVANA: 'bg-orange-500',
    ODESLANA: 'bg-indigo-500',
    POTVRZENA: 'bg-teal-500',
    DOKONCENA: 'bg-emerald-600',
    ZRUSENA: 'bg-gray-500',
  };

  return statusColors[status] || 'bg-gray-400';
};

/**
 * Získat text color pro stav
 */
export const getStatusTextColor = (): string => {
  return 'text-white';
};
