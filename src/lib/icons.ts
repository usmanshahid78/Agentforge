import {
  CalendarDays,
  Cctv,
  CloudSun,
  FileUp,
  LineChart,
  Mail,
  MessageCircle,
  Plug,
  ScanBarcode,
  Sheet,
  ShoppingBag,
  Swords,
  Truck,
  type LucideIcon,
} from 'lucide-react';

/** Connector icon names (stored as strings in data) resolved to components. */
const ICONS: Record<string, LucideIcon> = {
  ScanBarcode,
  ShoppingBag,
  LineChart,
  CloudSun,
  CalendarDays,
  Swords,
  Sheet,
  FileUp,
  Cctv,
  Mail,
  MessageCircle,
  Truck,
};

export const iconFor = (name: string): LucideIcon => ICONS[name] ?? Plug;
