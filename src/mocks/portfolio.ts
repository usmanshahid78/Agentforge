import type { AgentRecommendation, AgentStatus, Industry, Project, ProjectAgent, ProjectFinding, ProjectRun, ProjectStatus } from '@/types';
import { buildRunScript, outcomeSentence } from '@/lib/portfolio';
import { createRng, minutesAgo } from './random';

export const industries: Industry[] = [
  { id: 'ind-retail', name: 'Retail', description: 'Stores, stock and shoppers', accent: 'cyan' },
  { id: 'ind-trading', name: 'Stock Trading', description: 'Orders, risk and settlement', accent: 'violet' },
  { id: 'ind-auto', name: 'Auto Industry', description: 'Plants, parts and dealers', accent: 'warning', comingSoon: true },
  { id: 'ind-banking', name: 'Banking', description: 'Accounts, payments and compliance', accent: 'magenta' },
];

type Specialist = [name: string, role: string, responsibility: string, integrations: string[]];
type Rec = [name: string, role: string, reason: string, responsibility: string, integrations: string[]];
type Finding = [title: string, detail: string, severity: ProjectFinding['severity'], fix: string];

interface Spec {
  id: string;
  industryId: string;
  name: string;
  short?: string;
  summary: string;
  status: ProjectStatus;
  metric: [string, string];
  subject: string;
  lead: string;
  mission: string;
  responsibilities: string[];
  specialists: [Specialist, Specialist];
  integrations: Array<string | [string, 'pending']>;
  params: Array<[string, string, string?]>;
  recommendations?: Rec[];
  findings?: Finding[];
  outcome?: string;
}

const DEPT_FOR: Record<ProjectAgent['kind'], string> = { lead: 'dep-ops', assistant: 'dep-care', specialist: 'dep-sales' };

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function build(spec: Spec, index: number): Project {
  const rng = createRng(index * 7919 + 17);
  const leadId = `${spec.id}-lead`;
  const working = spec.status === 'live' || spec.status === 'issue';
  const agentStatus: AgentStatus = working ? 'working' : spec.status === 'configuring' ? 'idle' : 'draft';
  const integrations = spec.integrations.map((i) => (Array.isArray(i) ? { name: i[0], status: i[1] } : { name: i, status: 'connected' as const }));
  const team: ProjectAgent[] = [
    {
      id: leadId,
      name: spec.lead,
      role: `${spec.short ?? spec.name} Lead`,
      kind: 'lead',
      status: agentStatus,
      responsibility: spec.mission,
      integrations: integrations.map((i) => i.name),
      departmentId: DEPT_FOR.lead,
    },
    {
      id: `${spec.id}-assistant`,
      name: `Assistant ${spec.lead}`,
      role: 'Coordinator',
      kind: 'assistant',
      parentId: leadId,
      status: agentStatus,
      responsibility: 'Schedules runs, chases missing data and keeps the team log.',
      integrations: ['Scheduler', 'Slack'],
      departmentId: DEPT_FOR.assistant,
    },
    ...spec.specialists.map(([name, role, responsibility, ints], i) => ({
      id: `${spec.id}-${slug(name)}`,
      name,
      role,
      kind: 'specialist' as const,
      parentId: leadId,
      status: agentStatus,
      responsibility,
      integrations: ints,
      departmentId: i === 0 ? 'dep-sales' : 'dep-fin',
    })),
  ];
  const recommendations: AgentRecommendation[] = (spec.recommendations ?? []).map(([name, role, reason, responsibility, ints]) => ({
    id: `${spec.id}-rec-${slug(name)}`,
    name,
    role,
    reason,
    responsibility,
    integrations: ints,
  }));
  const findings: ProjectFinding[] = (spec.findings ?? []).map(([title, detail, severity, proposedFix], i) => ({
    id: `${spec.id}-f${i}`,
    title,
    detail,
    severity,
    proposedFix,
    status: 'open',
  }));
  const project: Project = {
    id: spec.id,
    industryId: spec.industryId,
    name: spec.name,
    short: spec.short ?? spec.name,
    summary: spec.summary,
    status: spec.status,
    metric: { label: spec.metric[0], value: spec.metric[1] },
    subject: spec.subject,
    outcome: spec.outcome ?? '',
    jd: { mission: spec.mission, responsibilities: spec.responsibilities },
    params: spec.params.map(([label, value, hint]) => ({ key: slug(label), label, value, hint })),
    integrations,
    team,
    recommendations,
    findings,
    trend: Array.from({ length: 14 }, (_, d) => (working ? Math.max(0, Math.round(rng.range(-1, spec.status === 'issue' ? 6 : 3) - d * 0.12)) : 0)),
    runs: [],
  };
  if (working) project.runs = [seedRun(project, rng.int(20, 300))];
  return project;
}

/** A finished run in the past, so live projects open with a full canvas. */
function seedRun(p: Project, minutes: number): ProjectRun {
  const steps = buildRunScript(p);
  const lead = p.team[0]!;
  const start = Date.now() - minutes * 60_000;
  const log = [...steps, { agentId: lead.id, kind: 'result' as const, text: outcomeSentence({ ...p, runs: [{} as ProjectRun] }) }].map((s, i) => ({
    ...s,
    id: `${p.id}-seed-${i}`,
    at: new Date(start + i * 2_400).toISOString(),
  }));
  return {
    id: `${p.id}-run-0`,
    startedAt: minutesAgo(minutes),
    durationMs: log.length * 2_400,
    log,
    outcome: log[log.length - 1]!.text,
    findingsCount: p.findings.length,
    costUsd: Number((0.18 + log.length * 0.031).toFixed(2)),
  };
}

const RETAIL = 'ind-retail';
const TRADING = 'ind-trading';
const BANKING = 'ind-banking';

const specs: Spec[] = [
  /* ---------------------------------- Retail ---------------------------------- */
  {
    id: 'retail-inv-recon',
    industryId: RETAIL,
    name: 'Inventory Reconciliation',
    short: 'Inv. Recon.',
    summary: 'Match warehouse stock against POS and ERP records every day and flag mismatches.',
    status: 'issue',
    metric: ['Match rate', '98.2%'],
    subject: 'inventory problems',
    lead: 'James',
    mission: 'Make sure what the systems say we have is what we actually have, in every store and warehouse, every day.',
    responsibilities: [
      'Reconcile stock counts across ERP, POS and WMS daily',
      'Flag mismatches above tolerance and explain the likely cause',
      'Propose stock adjustments and send them for approval',
      'Report a plain-language summary to the Retail ops lead',
    ],
    specialists: [
      ['Data Collector', 'Data Collector', 'Pulls stock counts from SAP, POS and the warehouse system before every run.', ['SAP ERP', 'POS', 'Manhattan WMS']],
      ['Discrepancy Analyst', 'Discrepancy Analyst', 'Finds mismatches and explains the likely cause: mis-scans, theft or delayed shipments.', ['Analysis engine']],
    ],
    integrations: ['SAP ERP', 'POS', 'Manhattan WMS', 'Slack'],
    params: [
      ['Scope', '42 stores, 3 warehouses'],
      ['Tolerance threshold', '±2%', 'Mismatches below this are ignored'],
      ['Run frequency', 'Daily at 06:00'],
      ['Alert channel', '#retail-ops on Slack'],
    ],
    recommendations: [
      ['Vendor Liaison', 'Vendor Liaison', 'Two of the last five mismatches came from late supplier deliveries. Nobody on the team follows up with suppliers.', 'Chases suppliers about late or short deliveries and updates expected arrival dates.', ['Supplier portal', 'Email']],
      ['Shrinkage Watcher', 'Loss Prevention Analyst', 'Store #42 shows a repeating loss pattern. A specialist can separate theft from scanning errors.', 'Looks for theft and shrinkage patterns across stores and shifts.', ['POS', 'CCTV events']],
    ],
    findings: [
      ['Store #42: 3 SKUs short', 'Detergent 2L, Rice 5kg and Olive oil 1L are 4–7% below the ERP count.', 'warning', 'Adjust ERP stock for 3 SKUs and open a recount at Store #42.'],
      ['Warehouse B: shipment not received', 'PO-88213 (240 units) is marked delivered in SAP but missing from the WMS.', 'critical', 'Hold the PO in SAP and ask the supplier for proof of delivery.'],
    ],
    outcome: 'James found 2 inventory problems: Store #42 is short on 3 SKUs and Warehouse B never received PO-88213. Fixes are ready for your approval.',
  },
  {
    id: 'retail-demand',
    industryId: RETAIL,
    name: 'Demand Forecasting',
    short: 'Demand',
    summary: 'Forecast next week’s sales per store using history, weather and local events.',
    status: 'live',
    metric: ['Forecast accuracy', '91%'],
    subject: 'forecast risks',
    lead: 'Atlas',
    mission: 'Tell each store what it will sell next week so it can staff and stock correctly.',
    responsibilities: ['Forecast sales per store and category', 'Explain the drivers behind big swings', 'Share forecasts with stock planning'],
    specialists: [
      ['Signal Gatherer', 'Data Collector', 'Collects sales history, weather and events.', ['POS', 'Weather feed', 'Local events']],
      ['Forecaster', 'Forecast Modeller', 'Builds and backtests the weekly forecast.', ['Forecast engine']],
    ],
    integrations: ['POS', 'Weather feed', 'Local events'],
    params: [['Scope', 'All 42 stores'], ['Accuracy target', '≥ 90%'], ['Run frequency', 'Weekly, Sunday 20:00']],
  },
  {
    id: 'retail-pricing',
    industryId: RETAIL,
    name: 'Price Optimisation',
    short: 'Pricing',
    summary: 'Suggest price changes against competitors without hurting margin.',
    status: 'live',
    metric: ['Margin lift', '+1.4 pts'],
    subject: 'pricing problems',
    lead: 'Lyra',
    mission: 'Keep prices competitive while protecting margin.',
    responsibilities: ['Track competitor prices', 'Propose price changes within guardrails'],
    specialists: [
      ['Price Scout', 'Competitor Tracker', 'Scrapes competitor prices daily.', ['Competitor feed']],
      ['Margin Guard', 'Margin Analyst', 'Checks every change against margin floors.', ['SAP ERP']],
    ],
    integrations: ['Competitor feed', 'SAP ERP', 'POS'],
    params: [['Scope', '1,200 SKUs'], ['Margin floor', '18%'], ['Run frequency', 'Daily at 05:00']],
  },
  {
    id: 'retail-promo',
    industryId: RETAIL,
    name: 'Promotion Planning',
    short: 'Promos',
    summary: 'Plan promotions around events and measure the uplift.',
    status: 'configuring',
    metric: ['Planned promos', '6'],
    subject: 'promotion risks',
    lead: 'Pulse',
    mission: 'Run promotions that pay for themselves.',
    responsibilities: ['Propose promotions per event', 'Measure uplift after each promo'],
    specialists: [
      ['Event Watcher', 'Event Analyst', 'Finds events that move footfall.', ['Local events']],
      ['Uplift Analyst', 'Uplift Analyst', 'Measures promo uplift against a baseline.', ['POS']],
    ],
    integrations: ['POS', 'Local events', ['Marketing CRM', 'pending']],
    params: [['Scope', 'Top 20 stores'], ['Min. ROI', '1.5×'], ['Run frequency', 'Weekly']],
  },
  {
    id: 'retail-replenish',
    industryId: RETAIL,
    name: 'Stock Replenishment',
    short: 'Replenish',
    summary: 'Raise purchase orders before shelves run empty.',
    status: 'live',
    metric: ['Stock-outs avoided', '37'],
    subject: 'stock-out risks',
    lead: 'Vega',
    mission: 'Never run out of the products customers come for.',
    responsibilities: ['Calculate reorder points', 'Draft purchase orders for approval'],
    specialists: [
      ['Shelf Monitor', 'Stock Monitor', 'Watches stock levels in real time.', ['Manhattan WMS']],
      ['PO Drafter', 'Purchasing Analyst', 'Drafts purchase orders.', ['SAP ERP']],
    ],
    integrations: ['Manhattan WMS', 'SAP ERP'],
    params: [['Scope', '42 stores'], ['Safety stock', '5 days'], ['Run frequency', 'Every 4 hours']],
  },
  {
    id: 'retail-returns',
    industryId: RETAIL,
    name: 'Returns Fraud',
    short: 'Returns',
    summary: 'Spot suspicious return patterns across stores.',
    status: 'not-started',
    metric: ['Est. savings', '£48k/yr'],
    subject: 'returns fraud signals',
    lead: 'Echo',
    mission: 'Catch returns abuse without upsetting honest customers.',
    responsibilities: ['Score every return for risk', 'Escalate repeat offenders'],
    specialists: [
      ['Returns Reader', 'Data Collector', 'Collects returns and receipts.', ['POS']],
      ['Risk Scorer', 'Fraud Analyst', 'Scores returns for fraud risk.', ['Fraud engine']],
    ],
    integrations: [['POS', 'pending'], ['Loyalty CRM', 'pending']],
    params: [['Scope', 'All stores'], ['Risk threshold', 'Score ≥ 80'], ['Run frequency', 'Hourly']],
  },
  {
    id: 'retail-staffing',
    industryId: RETAIL,
    name: 'Staff Scheduling',
    short: 'Staffing',
    summary: 'Match shift rotas to forecast footfall.',
    status: 'not-started',
    metric: ['Est. savings', '6% labour'],
    subject: 'staffing gaps',
    lead: 'Quinn',
    mission: 'Have the right number of people on the floor every hour.',
    responsibilities: ['Draft weekly rotas', 'Flag understaffed shifts'],
    specialists: [
      ['Footfall Reader', 'Data Collector', 'Reads footfall counters.', ['Footfall sensors']],
      ['Rota Planner', 'Scheduler', 'Builds rotas within labour rules.', ['HR system']],
    ],
    integrations: [['HR system', 'pending'], ['Footfall sensors', 'pending']],
    params: [['Scope', '42 stores'], ['Max weekly hours', '48'], ['Run frequency', 'Weekly']],
  },
  {
    id: 'retail-care',
    industryId: RETAIL,
    name: 'Customer Care',
    short: 'Care',
    summary: 'Answer customer messages and route complaints.',
    status: 'live',
    metric: ['Resolved by AI', '72%'],
    subject: 'unanswered complaints',
    lead: 'Iris',
    mission: 'Answer every customer quickly and kindly.',
    responsibilities: ['Answer common questions', 'Route complaints to the right team'],
    specialists: [
      ['Inbox Reader', 'Triage Agent', 'Reads and tags incoming messages.', ['Zendesk']],
      ['Reply Writer', 'Support Agent', 'Drafts replies in the brand voice.', ['Knowledge base']],
    ],
    integrations: ['Zendesk', 'Knowledge base', 'WhatsApp'],
    params: [['Scope', 'Email + WhatsApp'], ['Response target', '< 5 min'], ['Run frequency', 'Continuous']],
  },
  {
    id: 'retail-supplier',
    industryId: RETAIL,
    name: 'Supplier Scorecards',
    short: 'Suppliers',
    summary: 'Rate suppliers on fill rate, lead time and quality.',
    status: 'configuring',
    metric: ['Suppliers tracked', '58'],
    subject: 'supplier issues',
    lead: 'Rowan',
    mission: 'Know which suppliers we can rely on.',
    responsibilities: ['Score suppliers monthly', 'Flag declining suppliers'],
    specialists: [
      ['Delivery Tracker', 'Data Collector', 'Tracks deliveries against POs.', ['SAP ERP']],
      ['Quality Checker', 'Quality Analyst', 'Tracks defects and returns to vendor.', ['QA system']],
    ],
    integrations: ['SAP ERP', ['Supplier portal', 'pending']],
    params: [['Scope', '58 suppliers'], ['Min. fill rate', '95%'], ['Run frequency', 'Monthly']],
  },

  /* ------------------------------- Stock Trading ------------------------------ */
  {
    id: 'trading-settlement',
    industryId: TRADING,
    name: 'Trade Settlement',
    short: 'Settlement',
    summary: 'Reconcile executed trades with the custodian before T+1 cut-off.',
    status: 'live',
    metric: ['Settled on time', '99.7%'],
    subject: 'settlement breaks',
    lead: 'Marcus',
    mission: 'Every trade settles on time, with no surprises at cut-off.',
    responsibilities: ['Match trades to custodian confirmations', 'Chase breaks before cut-off'],
    specialists: [
      ['Confirm Matcher', 'Trade Matcher', 'Matches trades to confirmations.', ['OMS', 'Custodian SWIFT']],
      ['Break Chaser', 'Breaks Analyst', 'Investigates and chases breaks.', ['Email']],
    ],
    integrations: ['OMS', 'Custodian SWIFT', 'Email'],
    params: [['Scope', 'Equities + ETFs'], ['Cut-off', '16:30 ET'], ['Run frequency', 'Every 30 min']],
    recommendations: [['FX Matcher', 'FX Reconciler', 'Cross-currency trades are matched by hand today.', 'Reconciles FX legs of cross-currency trades.', ['FX platform']]],
  },
  {
    id: 'trading-risk',
    industryId: TRADING,
    name: 'Risk Limits',
    short: 'Risk',
    summary: 'Watch positions against desk and counterparty limits in real time.',
    status: 'issue',
    metric: ['Limit breaches', '1'],
    subject: 'limit breaches',
    lead: 'Sofia',
    mission: 'No desk goes over its limits without someone knowing.',
    responsibilities: ['Monitor exposures intraday', 'Alert desk heads on breaches'],
    specialists: [
      ['Exposure Calculator', 'Risk Calculator', 'Calculates exposures per desk.', ['Risk engine']],
      ['Limit Watcher', 'Limits Analyst', 'Compares exposure with limits.', ['Limits DB']],
    ],
    integrations: ['OMS', 'Risk engine', 'Limits DB'],
    params: [['Scope', '6 desks'], ['Warning level', '90% of limit'], ['Run frequency', 'Every 5 min']],
    findings: [['Tech desk at 104% of limit', 'Single-name exposure to NVDA exceeds the desk limit by $2.1M.', 'critical', 'Notify the desk head and propose a hedge of $2.5M.']],
    outcome: 'Sofia found 1 limit breach: the Tech desk is 4% over its NVDA limit. A hedge is ready for your approval.',
  },
  {
    id: 'trading-surveillance',
    industryId: TRADING,
    name: 'Trade Surveillance',
    short: 'Surveillance',
    summary: 'Flag spoofing, wash trades and insider patterns.',
    status: 'live',
    metric: ['Alerts reviewed', '214'],
    subject: 'suspicious trading patterns',
    lead: 'Theo',
    mission: 'Catch market abuse early and document every review.',
    responsibilities: ['Scan orders for abuse patterns', 'Prepare cases for compliance'],
    specialists: [
      ['Order Scanner', 'Pattern Detector', 'Scans order flow for patterns.', ['OMS']],
      ['Case Writer', 'Compliance Analyst', 'Writes up cases for review.', ['Case manager']],
    ],
    integrations: ['OMS', 'Market data', 'Case manager'],
    params: [['Scope', 'All venues'], ['Alert threshold', 'Score ≥ 70'], ['Run frequency', 'Continuous']],
  },
  {
    id: 'trading-best-ex',
    industryId: TRADING,
    name: 'Best Execution',
    short: 'Best ex.',
    summary: 'Prove every order got the best available price.',
    status: 'configuring',
    metric: ['Orders analysed', '0'],
    subject: 'execution issues',
    lead: 'Nadia',
    mission: 'Show regulators every client got the best price.',
    responsibilities: ['Compare fills to market', 'Produce quarterly reports'],
    specialists: [
      ['Fill Collector', 'Data Collector', 'Collects fills and quotes.', ['OMS', 'Market data']],
      ['TCA Analyst', 'Execution Analyst', 'Runs transaction cost analysis.', ['TCA engine']],
    ],
    integrations: ['OMS', ['Market data', 'pending']],
    params: [['Scope', 'Client orders'], ['Slippage limit', '5 bps'], ['Run frequency', 'Daily']],
  },
  {
    id: 'trading-portfolio',
    industryId: TRADING,
    name: 'Portfolio Rebalancing',
    short: 'Rebalance',
    summary: 'Keep model portfolios within drift bands.',
    status: 'live',
    metric: ['Avg. drift', '0.8%'],
    subject: 'drift problems',
    lead: 'Owen',
    mission: 'Keep every portfolio close to its model.',
    responsibilities: ['Measure drift', 'Propose rebalancing trades'],
    specialists: [
      ['Drift Meter', 'Portfolio Analyst', 'Measures drift per account.', ['PMS']],
      ['Trade Builder', 'Order Builder', 'Builds rebalancing orders.', ['OMS']],
    ],
    integrations: ['PMS', 'OMS'],
    params: [['Scope', '3,400 accounts'], ['Drift band', '±3%'], ['Run frequency', 'Daily at 15:00']],
  },
  {
    id: 'trading-news',
    industryId: TRADING,
    name: 'News Sentiment',
    short: 'Sentiment',
    summary: 'Turn breaking news into signals for the desks.',
    status: 'not-started',
    metric: ['Sources', '40'],
    subject: 'market-moving headlines',
    lead: 'Kai',
    mission: 'Desks hear about market-moving news first.',
    responsibilities: ['Read news feeds', 'Score sentiment per ticker'],
    specialists: [
      ['Feed Reader', 'News Reader', 'Reads newswires.', ['News API']],
      ['Sentiment Scorer', 'NLP Analyst', 'Scores sentiment per ticker.', ['NLP engine']],
    ],
    integrations: [['News API', 'pending']],
    params: [['Scope', 'S&P 500'], ['Alert level', '|score| ≥ 0.7'], ['Run frequency', 'Continuous']],
  },
  {
    id: 'trading-margin',
    industryId: TRADING,
    name: 'Margin Calls',
    short: 'Margin',
    summary: 'Calculate margin calls and notify clients.',
    status: 'live',
    metric: ['Calls issued', '12'],
    subject: 'margin shortfalls',
    lead: 'Elena',
    mission: 'Issue accurate margin calls on time.',
    responsibilities: ['Calculate margin requirements', 'Notify clients'],
    specialists: [
      ['Collateral Checker', 'Collateral Analyst', 'Values collateral.', ['Collateral system']],
      ['Notifier', 'Client Notifier', 'Sends margin notices.', ['Email']],
    ],
    integrations: ['Collateral system', 'Email'],
    params: [['Scope', 'Prime clients'], ['Call threshold', '$250k'], ['Run frequency', 'Daily at 17:00']],
  },
  {
    id: 'trading-corp-actions',
    industryId: TRADING,
    name: 'Corporate Actions',
    short: 'Corp. actions',
    summary: 'Process dividends, splits and mergers correctly.',
    status: 'not-started',
    metric: ['Events / month', '~300'],
    subject: 'missed corporate actions',
    lead: 'Hugo',
    mission: 'Never miss a dividend, split or election deadline.',
    responsibilities: ['Capture announcements', 'Apply events to positions'],
    specialists: [
      ['Announcement Reader', 'Data Collector', 'Reads corporate action feeds.', ['CA feed']],
      ['Position Updater', 'Operations Analyst', 'Applies events to positions.', ['PMS']],
    ],
    integrations: [['CA feed', 'pending'], ['PMS', 'pending']],
    params: [['Scope', 'All holdings'], ['Election buffer', '2 days'], ['Run frequency', 'Daily']],
  },
  {
    id: 'trading-kyc',
    industryId: TRADING,
    name: 'Client Onboarding',
    short: 'Onboarding',
    summary: 'Collect documents and run checks for new trading clients.',
    status: 'configuring',
    metric: ['In queue', '18'],
    subject: 'onboarding blockers',
    lead: 'Leah',
    mission: 'Onboard clients in days, not weeks.',
    responsibilities: ['Collect documents', 'Run KYC checks'],
    specialists: [
      ['Doc Collector', 'Document Agent', 'Collects and checks documents.', ['Client portal']],
      ['KYC Checker', 'KYC Analyst', 'Runs sanctions and PEP checks.', ['KYC provider']],
    ],
    integrations: ['Client portal', ['KYC provider', 'pending']],
    params: [['Scope', 'Institutional'], ['Target time', '5 days'], ['Run frequency', 'Hourly']],
  },

  /* ---------------------------------- Banking --------------------------------- */
  {
    id: 'banking-aml',
    industryId: BANKING,
    name: 'AML Monitoring',
    short: 'AML',
    summary: 'Screen transactions for money-laundering patterns.',
    status: 'live',
    metric: ['False positives', '−38%'],
    subject: 'suspicious transactions',
    lead: 'Grace',
    mission: 'Catch money laundering while cutting false alarms.',
    responsibilities: ['Score transactions', 'Prepare SAR drafts'],
    specialists: [
      ['Txn Screener', 'Transaction Screener', 'Screens transactions against rules.', ['Core banking']],
      ['SAR Writer', 'Investigations Analyst', 'Drafts suspicious activity reports.', ['Case manager']],
    ],
    integrations: ['Core banking', 'Case manager'],
    params: [['Scope', 'Retail + SME'], ['Risk threshold', 'Score ≥ 75'], ['Run frequency', 'Hourly']],
  },
  {
    id: 'banking-recon',
    industryId: BANKING,
    name: 'Ledger Reconciliation',
    short: 'Ledger recon.',
    summary: 'Reconcile nostro accounts against the general ledger.',
    status: 'issue',
    metric: ['Open breaks', '3'],
    subject: 'ledger breaks',
    lead: 'Daniel',
    mission: 'The ledger always agrees with the bank statements.',
    responsibilities: ['Match statements to ledger', 'Explain and clear breaks'],
    specialists: [
      ['Statement Reader', 'Data Collector', 'Reads MT940 statements.', ['SWIFT']],
      ['Break Investigator', 'Reconciliation Analyst', 'Explains breaks.', ['General ledger']],
    ],
    integrations: ['SWIFT', 'General ledger'],
    params: [['Scope', '24 nostro accounts'], ['Tolerance', '$50'], ['Run frequency', 'Daily at 07:00']],
    findings: [
      ['EUR nostro: €12,400 unmatched', 'Incoming payment has no matching ledger entry.', 'warning', 'Post a suspense entry and request remittance details.'],
      ['USD nostro: duplicate fee', 'Correspondent bank charged a $35 wire fee twice.', 'info', 'Raise a fee claim with the correspondent.'],
    ],
    outcome: 'Daniel found 2 ledger breaks: €12,400 unmatched on the EUR nostro and a duplicate fee on USD. Both have proposed fixes.',
  },
  {
    id: 'banking-loans',
    industryId: BANKING,
    name: 'Loan Underwriting',
    short: 'Underwriting',
    summary: 'Pre-assess SME loan applications.',
    status: 'configuring',
    metric: ['Applications', '64'],
    subject: 'underwriting risks',
    lead: 'Priya',
    mission: 'Give every SME a fast, fair first decision.',
    responsibilities: ['Read financial statements', 'Score credit risk'],
    specialists: [
      ['Statement Parser', 'Document Agent', 'Reads financial statements.', ['Doc store']],
      ['Credit Scorer', 'Credit Analyst', 'Scores credit risk.', ['Credit bureau']],
    ],
    integrations: ['Doc store', ['Credit bureau', 'pending']],
    params: [['Scope', 'SME loans < £500k'], ['Min. score', '640'], ['Run frequency', 'On application']],
  },
  {
    id: 'banking-fraud',
    industryId: BANKING,
    name: 'Card Fraud',
    short: 'Card fraud',
    summary: 'Block fraudulent card payments in real time.',
    status: 'live',
    metric: ['Fraud caught', '96%'],
    subject: 'fraud spikes',
    lead: 'Victor',
    mission: 'Stop card fraud without blocking real customers.',
    responsibilities: ['Score card payments', 'Contact customers about suspicious payments'],
    specialists: [
      ['Payment Scorer', 'Fraud Scorer', 'Scores each payment.', ['Card switch']],
      ['Customer Caller', 'Customer Contact', 'Confirms suspicious payments with customers.', ['SMS']],
    ],
    integrations: ['Card switch', 'SMS'],
    params: [['Scope', 'Debit + credit'], ['Block threshold', 'Score ≥ 90'], ['Run frequency', 'Real time']],
  },
  {
    id: 'banking-complaints',
    industryId: BANKING,
    name: 'Complaints Handling',
    short: 'Complaints',
    summary: 'Classify complaints and meet regulatory deadlines.',
    status: 'live',
    metric: ['On time', '98%'],
    subject: 'overdue complaints',
    lead: 'Hannah',
    mission: 'Resolve complaints fairly and within deadlines.',
    responsibilities: ['Classify complaints', 'Track deadlines'],
    specialists: [
      ['Classifier', 'Triage Agent', 'Classifies complaints.', ['CRM']],
      ['Deadline Tracker', 'Compliance Analyst', 'Tracks regulatory deadlines.', ['Case manager']],
    ],
    integrations: ['CRM', 'Case manager'],
    params: [['Scope', 'All channels'], ['Deadline', '8 weeks'], ['Run frequency', 'Daily']],
  },
  {
    id: 'banking-kyc',
    industryId: BANKING,
    name: 'KYC Refresh',
    short: 'KYC',
    summary: 'Keep customer due diligence up to date.',
    status: 'not-started',
    metric: ['Due this quarter', '1,240'],
    subject: 'expired KYC files',
    lead: 'Felix',
    mission: 'No customer file goes out of date.',
    responsibilities: ['Find files due for refresh', 'Request missing documents'],
    specialists: [
      ['File Checker', 'KYC Analyst', 'Finds expiring files.', ['CRM']],
      ['Doc Requester', 'Document Agent', 'Requests documents from customers.', ['Email']],
    ],
    integrations: [['CRM', 'pending']],
    params: [['Scope', 'High-risk customers'], ['Refresh cycle', '12 months'], ['Run frequency', 'Weekly']],
  },
  {
    id: 'banking-liquidity',
    industryId: BANKING,
    name: 'Liquidity Forecast',
    short: 'Liquidity',
    summary: 'Forecast daily cash positions across accounts.',
    status: 'live',
    metric: ['Forecast error', '1.9%'],
    subject: 'liquidity shortfalls',
    lead: 'Isla',
    mission: 'Treasury always knows tomorrow’s cash position.',
    responsibilities: ['Forecast cash flows', 'Flag shortfalls early'],
    specialists: [
      ['Flow Collector', 'Data Collector', 'Collects scheduled flows.', ['Treasury system']],
      ['Cash Forecaster', 'Forecast Modeller', 'Forecasts daily balances.', ['Forecast engine']],
    ],
    integrations: ['Treasury system', 'Core banking'],
    params: [['Scope', 'All currencies'], ['Buffer', '$50M'], ['Run frequency', 'Daily at 06:00']],
  },
  {
    id: 'banking-collections',
    industryId: BANKING,
    name: 'Collections',
    short: 'Collections',
    summary: 'Prioritise overdue accounts and offer payment plans.',
    status: 'configuring',
    metric: ['Accounts', '3,100'],
    subject: 'unmanaged arrears',
    lead: 'Mila',
    mission: 'Help customers in arrears get back on track.',
    responsibilities: ['Prioritise accounts', 'Offer payment plans'],
    specialists: [
      ['Arrears Ranker', 'Collections Analyst', 'Ranks accounts by risk.', ['Core banking']],
      ['Plan Offerer', 'Customer Contact', 'Offers payment plans.', ['SMS', 'Email']],
    ],
    integrations: ['Core banking', ['Dialler', 'pending']],
    params: [['Scope', '30+ days overdue'], ['Max contacts', '3 / week'], ['Run frequency', 'Daily']],
  },
  {
    id: 'banking-reporting',
    industryId: BANKING,
    name: 'Regulatory Reporting',
    short: 'Reg. reporting',
    summary: 'Prepare and validate regulatory returns.',
    status: 'not-started',
    metric: ['Returns / quarter', '14'],
    subject: 'reporting errors',
    lead: 'Oscar',
    mission: 'File every return on time and correct.',
    responsibilities: ['Assemble returns', 'Validate against rules'],
    specialists: [
      ['Data Assembler', 'Data Collector', 'Assembles return data.', ['Data warehouse']],
      ['Validator', 'Validation Analyst', 'Validates returns.', ['Rules engine']],
    ],
    integrations: [['Data warehouse', 'pending']],
    params: [['Scope', 'COREP + FINREP'], ['Validation', '100% rules'], ['Run frequency', 'Quarterly']],
  },
];

export const seedProjects = (): Project[] => specs.map(build);
