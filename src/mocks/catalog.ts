import type { Device, RoleTemplate, Trace } from '@/types';
import { minutesAgo } from './random';

export const traces: Trace[] = [
  {
    id: 'trc-1',
    agentId: 'agt-lyra',
    startedAt: minutesAgo(15),
    summary: 'Headphone price check against competitors',
    totalTokens: 4120,
    totalLatencyMs: 6840,
    costUsd: 0.021,
    steps: [
      { id: 's1', kind: 'data', label: 'Read 7-day sales for Aurora headphones', detail: '41 units vs 66 prior week (−38%).', latencyMs: 420, tool: 'pos.query', input: 'sku=AUR-HP-01 window=14d', output: 'rows=14' },
      { id: 's2', kind: 'tool', label: 'Fetched competitor prices', detail: 'TechHub £67, CityElec £68, MegaSave £79.', latencyMs: 1310, tool: 'competitor.prices', input: 'sku_match=AUR-HP-01', output: '3 matches' },
      { id: 's3', kind: 'think', label: 'Estimated price elasticity', detail: 'Historical elasticity −1.8 on this line; a £10 cut should recover ~30 units/week.', latencyMs: 2950, tokens: 2380 },
      { id: 's4', kind: 'decision', label: 'Proposed £69 (outside ±5% band)', detail: 'Change exceeds limit, so approval is required.', latencyMs: 860, tokens: 1120 },
      { id: 's5', kind: 'handoff', label: 'Notified Quill', detail: 'Suggested a "price drop" post if approved.', latencyMs: 1300, tokens: 620 },
    ],
  },
  {
    id: 'trc-2',
    agentId: 'agt-echo',
    startedAt: minutesAgo(53),
    summary: 'Jacket return refund decision',
    totalTokens: 2210,
    totalLatencyMs: 3920,
    costUsd: 0.011,
    steps: [
      { id: 's1', kind: 'data', label: 'Looked up order #10482', detail: 'Purchased 19 days ago, £64.99.', latencyMs: 380, tool: 'store.orders' },
      { id: 's2', kind: 'tool', label: 'Checked customer photo', detail: 'Tags attached, no visible wear.', latencyMs: 1650, tool: 'vision.inspect' },
      { id: 's3', kind: 'decision', label: 'Refund over £30 limit', detail: 'Routed to owner for approval.', latencyMs: 1890, tokens: 2210 },
    ],
  },
  {
    id: 'trc-3',
    agentId: 'agt-ledger',
    startedAt: minutesAgo(96),
    summary: 'Friday payment run preparation',
    totalTokens: 5630,
    totalLatencyMs: 11200,
    costUsd: 0.028,
    steps: [
      { id: 's1', kind: 'data', label: 'Read 8 supplier invoices from email', detail: 'Parsed PDFs, extracted totals.', latencyMs: 4200, tool: 'email.attachments' },
      { id: 's2', kind: 'tool', label: 'Matched to deliveries', detail: '7 of 8 matched within 1%.', latencyMs: 3100, tool: 'pos.receiving' },
      { id: 's3', kind: 'error', label: 'Greenleaf invoice mismatch', detail: 'Invoice £1,212 vs delivered £1,164 (+4.1%).', latencyMs: 600 },
      { id: 's4', kind: 'decision', label: 'Hold Greenleaf, propose the rest', detail: '£4,812 across 7 suppliers.', latencyMs: 3300, tokens: 5630 },
    ],
  },
  {
    id: 'trc-4',
    agentId: 'agt-quill',
    startedAt: minutesAgo(200),
    summary: 'Weekend offer draft',
    totalTokens: 3380,
    totalLatencyMs: 5400,
    costUsd: 0.017,
    steps: [
      { id: 's1', kind: 'data', label: 'Pulled warm-weekend drink sales', detail: '+41% on the last three weekends above 22°C.', latencyMs: 900, tool: 'pos.query' },
      { id: 's2', kind: 'think', label: 'Drafted three headlines', detail: 'Chose the shortest; matches brand voice.', latencyMs: 3600, tokens: 3380 },
      { id: 's3', kind: 'decision', label: 'Sent for approval', detail: 'Publishing requires owner sign-off.', latencyMs: 900 },
    ],
  },
];

export const devices: Device[] = [
  { id: 'dev-1', storeName: 'Nova Mart Deansgate', city: 'Manchester', health: 'healthy', modelVersion: 'v2.4.1', lastSync: minutesAgo(3), cpuPct: 34, ring: 'pilot' },
  { id: 'dev-2', storeName: 'Nova Mart Salford Quays', city: 'Salford', health: 'healthy', modelVersion: 'v2.4.1', lastSync: minutesAgo(6), cpuPct: 41, ring: 'pilot' },
  { id: 'dev-3', storeName: 'Nova Mart Didsbury', city: 'Manchester', health: 'degraded', modelVersion: 'v2.3.0', lastSync: minutesAgo(48), cpuPct: 88, ring: 'wave-1' },
  { id: 'dev-4', storeName: 'Nova Mart Stockport', city: 'Stockport', health: 'healthy', modelVersion: 'v2.3.0', lastSync: minutesAgo(9), cpuPct: 29, ring: 'wave-1' },
  { id: 'dev-5', storeName: 'Nova Mart Bolton', city: 'Bolton', health: 'offline', modelVersion: 'v2.3.0', lastSync: minutesAgo(60 * 7), cpuPct: 0, ring: 'wave-2' },
  { id: 'dev-6', storeName: 'Nova Mart Altrincham', city: 'Altrincham', health: 'healthy', modelVersion: 'v2.3.0', lastSync: minutesAgo(11), cpuPct: 37, ring: 'wave-2' },
];

export const roleTemplates: RoleTemplate[] = [
  { id: 'tpl-env', title: 'Environment Analyst', department: 'operations', summary: 'Explains how weather and local events move your sales, with daily advice.', requiredConnectors: ['pos', 'weather', 'events'], kpis: ['Forecast accuracy', 'Fewer stockouts'], pricePerMonth: 109, rating: 4.8, hires: 1240, featured: true },
  { id: 'tpl-stock', title: 'Inventory Planner', department: 'operations', summary: 'Watches stock and drafts reorders before you run out.', requiredConnectors: ['pos', 'inventory-sheet', 'supplier-portal'], kpis: ['Stockouts', 'Days of cover'], pricePerMonth: 149, rating: 4.7, hires: 2310, featured: true },
  { id: 'tpl-price', title: 'Pricing Analyst', department: 'sales', summary: 'Tracks competitors and adjusts prices inside your limits.', requiredConnectors: ['pos', 'competitor-pricing'], kpis: ['Gross margin', 'Price index'], pricePerMonth: 189, rating: 4.6, hires: 1870 },
  { id: 'tpl-promo', title: 'Promo Strategist', department: 'sales', summary: 'Plans promotions around weather, events and stock.', requiredConnectors: ['pos', 'events'], kpis: ['Promo uplift', 'Promo margin'], pricePerMonth: 129, rating: 4.5, hires: 980, featured: true },
  { id: 'tpl-env-2', title: 'Shift Scheduler', department: 'operations', summary: 'Drafts fair rotas matched to expected footfall.', requiredConnectors: ['pos', 'footfall'], kpis: ['Queue time', 'Overtime'], pricePerMonth: 89, rating: 4.3, hires: 760 },
  { id: 'tpl-care', title: 'Customer Support', department: 'customer-care', summary: 'Answers WhatsApp and email kindly, around the clock.', requiredConnectors: ['whatsapp', 'email'], kpis: ['First reply time', 'Satisfaction'], pricePerMonth: 219, rating: 4.9, hires: 5120, featured: true },
  { id: 'tpl-reviews', title: 'Review Responder', department: 'customer-care', summary: 'Replies to online reviews and spots recurring complaints.', requiredConnectors: ['email'], kpis: ['Reply rate', 'Rating trend'], pricePerMonth: 69, rating: 4.4, hires: 1430 },
  { id: 'tpl-writer', title: 'Marketing Writer', department: 'sales', summary: 'Writes offers, posts and broadcasts in your brand voice.', requiredConnectors: ['pos', 'whatsapp'], kpis: ['Click-through', 'Redemptions'], pricePerMonth: 99, rating: 4.5, hires: 2640 },
  { id: 'tpl-fin', title: 'Finance Clerk', department: 'finance', summary: 'Matches invoices, prepares payment runs and closes the month.', requiredConnectors: ['email', 'pos'], kpis: ['Matched in 48h', 'Late payments'], pricePerMonth: 159, rating: 4.6, hires: 1990 },
  { id: 'tpl-cash', title: 'Cashflow Forecaster', department: 'finance', summary: 'Predicts your bank balance 8 weeks ahead and warns early.', requiredConnectors: ['pos', 'csv'], kpis: ['Forecast error', 'Warning lead time'], pricePerMonth: 139, rating: 4.4, hires: 640 },
];

/** "Retail operations department" bundle hires four agents at once. */
export const FEATURED_PACK = {
  id: 'pack-retail-ops',
  title: 'Retail operations department',
  templateIds: ['tpl-env', 'tpl-stock', 'tpl-promo', 'tpl-care'],
  pricePerMonth: 499,
};
