import type { Business, Department, Owner } from '@/types';

export const owner: Owner = {
  id: 'owner-1',
  name: 'Sana Malik',
  email: 'sana@novamart.example',
  initials: 'SM',
  role: 'Owner',
};

export const businesses: Business[] = [
  {
    id: 'biz-nova',
    name: 'Nova Mart',
    industry: 'Retail — groceries, clothing, electronics',
    location: 'Manchester, UK',
    stores: 6,
    currency: 'GBP',
  },
  {
    id: 'biz-kiln',
    name: 'Kiln & Co. Coffee',
    industry: 'Hospitality — cafe',
    location: 'Leeds, UK',
    stores: 2,
    currency: 'GBP',
  },
];

export const departments: Department[] = [
  {
    id: 'dep-ops',
    key: 'operations',
    name: 'Operations',
    description: 'Forecasting, stock, staffing and store conditions.',
    accent: 'cyan',
  },
  {
    id: 'dep-sales',
    key: 'sales',
    name: 'Sales',
    description: 'Pricing, promotions and marketing.',
    accent: 'violet',
  },
  {
    id: 'dep-care',
    key: 'customer-care',
    name: 'Customer Care',
    description: 'Customer messages, reviews and returns.',
    accent: 'magenta',
  },
  {
    id: 'dep-fin',
    key: 'finance',
    name: 'Finance',
    description: 'Invoices, reconciliation and budgets.',
    accent: 'warning',
  },
];
