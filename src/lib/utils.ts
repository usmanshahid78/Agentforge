import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const currency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const currencyPrecise = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 });

export const fmt = {
  money: (n: number) => currency.format(n),
  moneyPrecise: (n: number) => currencyPrecise.format(n),
  compact: (n: number) => compact.format(n),
  pct: (n: number, digits = 0) => `${n.toFixed(digits)}%`,
  /** "4 min ago", "3 h ago", "2 d ago" */
  ago: (iso: string) => {
    const diff = Math.max(0, Date.now() - new Date(iso).getTime());
    const m = Math.round(diff / 60_000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} h ago`;
    return `${Math.round(h / 24)} d ago`;
  },
  tenure: (iso: string) => {
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
    if (days < 1) return 'Hired today';
    if (days < 60) return `${days} days`;
    return `${Math.round(days / 30)} months`;
  },
};
