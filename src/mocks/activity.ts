import type { ActivityEvent, ApprovalRequest, AppNotification, ReviewReport, Severity } from '@/types';
import { createRng, minutesAgo } from './random';

type EventSeed = [agentId: string, title: string, detail: string, severity: Severity];

const EVENT_SEEDS: EventSeed[] = [
  ['agt-lyra', 'Changed 12 prices', 'Matched competitor on 9 dairy lines, raised 3 slow movers by 2%.', 'info'],
  ['agt-echo', 'Resolved 18 customer chats', 'Average first reply 41 seconds. Two escalated.', 'success'],
  ['agt-echo', 'Refunded £18.40 to a customer', 'Damaged item on delivery; photo verified.', 'info'],
  ['agt-ledger', 'Matched 23 supplier invoices', 'One invoice from Greenleaf differs by 4.1% and needs a look.', 'warning'],
  ['agt-quill', 'Drafted weekend offer post', 'Two-for-one on summer drinks; waiting for approval.', 'info'],
  ['agt-sentinel', 'Paused by owner', 'Waiting for footfall camera before resuming.', 'warning'],
  ['agt-lyra', 'Margin risk on electronics', 'Competitor cut headphone prices 14%. Holding price, needs decision.', 'critical'],
  ['agt-echo', 'Escalated a complaint', 'Customer mentioned an allergic reaction; routed to owner.', 'critical'],
  ['agt-ledger', 'Proposed Friday payment run', '£4,812 across 7 suppliers.', 'info'],
  ['agt-quill', 'WhatsApp broadcast performed well', '3.9% click-through, above target.', 'success'],
];

/** 40 activity events spread over the last ~3 days, newest first. */
export const activityEvents: ActivityEvent[] = (() => {
  const rng = createRng(40);
  let minutes = 2;
  return Array.from({ length: 40 }, (_, i) => {
    const seed = EVENT_SEEDS[i % EVENT_SEEDS.length] as EventSeed;
    minutes += rng.int(8, 160);
    return {
      id: `evt-${i + 1}`,
      agentId: seed[0],
      at: minutesAgo(minutes),
      title: seed[1],
      detail: seed[2],
      severity: seed[3],
      traceId: i % 3 === 0 ? `trc-${(i % 4) + 1}` : undefined,
    };
  });
})();

export const approvals: ApprovalRequest[] = [
  {
    id: 'apr-1',
    agentId: 'agt-lyra',
    createdAt: minutesAgo(14),
    action: 'Drop price of Aurora headphones from £79 to £69',
    reasoning: 'Two competitors now sell at £67–£68. Our sell-through fell 38% this week.',
    expectedImpact: '+£310 gross profit over 14 days (more units, lower margin)',
    impactValue: 310,
    risk: 'medium',
    status: 'pending',
    traceId: 'trc-1',
  },
  {
    id: 'apr-2',
    agentId: 'agt-quill',
    createdAt: minutesAgo(38),
    action: 'Publish weekend offer: two-for-one on summer drinks',
    reasoning: 'Forecast 24°C on Saturday. Drinks sold 41% more on the last three warm weekends.',
    expectedImpact: '+£520 revenue, +£140 gross profit',
    impactValue: 140,
    risk: 'low',
    status: 'pending',
  },
  {
    id: 'apr-3',
    agentId: 'agt-echo',
    createdAt: minutesAgo(52),
    action: 'Refund £64.99 for a returned jacket',
    reasoning: 'Within 30-day window, receipt verified, item unworn per photo.',
    expectedImpact: 'Keeps a repeat customer (12 orders this year)',
    impactValue: -65,
    risk: 'low',
    status: 'pending',
    traceId: 'trc-2',
  },
  {
    id: 'apr-4',
    agentId: 'agt-ledger',
    createdAt: minutesAgo(95),
    action: 'Pay Friday supplier run: £4,812 across 7 suppliers',
    reasoning: 'All invoices matched to deliveries except Greenleaf, which is held back.',
    expectedImpact: 'Avoids £96 in late fees',
    impactValue: 96,
    risk: 'medium',
    status: 'pending',
    traceId: 'trc-3',
  },
  {
    id: 'apr-5',
    agentId: 'agt-lyra',
    createdAt: minutesAgo(180),
    action: 'Raise price of free-range eggs (12) from £3.10 to £3.25',
    reasoning: 'Supplier cost up 6%. All three competitors already at £3.20 or above.',
    expectedImpact: '+£45 gross profit per week',
    impactValue: 45,
    risk: 'low',
    status: 'pending',
  },
  {
    id: 'apr-6',
    agentId: 'agt-echo',
    createdAt: minutesAgo(240),
    action: 'Send a £10 voucher to a customer after a late delivery',
    reasoning: 'Order arrived 3 days late; customer polite but disappointed. Lifetime value £1.2k.',
    expectedImpact: 'Retention; cost £10',
    impactValue: -10,
    risk: 'low',
    status: 'pending',
  },
];

export const reviews: ReviewReport[] = [
  {
    id: 'rev-1',
    agentId: 'agt-lyra',
    month: '2026-09',
    score: 88,
    strengths: ['Kept margin above target all month', 'Fast response to competitor moves'],
    issues: ['Two price changes on electronics reversed by owner'],
    suggestedJdChanges: ['Require approval for electronics price changes over 3%'],
    recommendation: 'keep',
  },
  {
    id: 'rev-2',
    agentId: 'agt-echo',
    month: '2026-09',
    score: 94,
    strengths: ['Satisfaction 4.7/5', '86% of chats resolved without help'],
    issues: ['Tone slightly formal on WhatsApp'],
    suggestedJdChanges: ['Raise refund limit to £40', 'Use a warmer tone on WhatsApp'],
    recommendation: 'promote',
  },
  {
    id: 'rev-3',
    agentId: 'agt-quill',
    month: '2026-09',
    score: 76,
    strengths: ['Broadcasts beat click-through target'],
    issues: ['Three drafts rejected for off-brand wording', 'Missed one Thursday post'],
    suggestedJdChanges: ['Add the brand voice guide as an input', 'Send drafts by 10:00 on post days'],
    recommendation: 'retrain',
  },
];

export const notifications: AppNotification[] = [
  {
    id: 'ntf-1',
    at: minutesAgo(14),
    title: '6 approvals waiting',
    body: 'Lyra, Quill, Echo and Ledger need your decision.',
    severity: 'warning',
    read: false,
    href: '/observe',
  },
  {
    id: 'ntf-2',
    at: minutesAgo(70),
    title: 'Inventory sheet needs attention',
    body: 'Sharing permission expired. Reconnect to resume syncing.',
    severity: 'critical',
    read: false,
    href: '/connect',
  },
  {
    id: 'ntf-3',
    at: minutesAgo(60 * 20),
    title: 'September reviews are ready',
    body: 'Echo is recommended for promotion.',
    severity: 'success',
    read: true,
    href: '/agents/agt-echo',
  },
];
