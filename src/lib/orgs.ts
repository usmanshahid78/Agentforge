import type { ID, ISODate, Organization, OrgKind, OrgMember } from '@/types';

/**
 * Reads a plain-language description ("Thor is a CEO of a portfolio management
 * company, under him there is an investment manager, ...") into an
 * organization: who heads it, which AI agents work under them, what the
 * creator asked for and which rules apply. Pure and deterministic, so it runs
 * as a live preview while typing and as the fallback when the local model is off.
 */

/** Everything the description decides. Id, creator and dates are added by `createOrganization`. */
export interface OrgDraft {
  name: string;
  kind: OrgKind;
  industry: string;
  mission: string;
  head: { name: string; role: string };
  agents: Array<{ role: string; responsibility: string }>;
  requirements: string[];
  periods: string[];
  compliance: string[];
}

export const KIND_LABEL: Record<OrgKind, string> = {
  investment: 'Investment',
  banking: 'Banking',
  retail: 'Retail',
  healthcare: 'Healthcare',
  logistics: 'Logistics',
  general: 'General business',
};

export const ORG_KINDS = Object.keys(KIND_LABEL) as OrgKind[];

const KIND_WORDS: Record<Exclude<OrgKind, 'general'>, RegExp> = {
  investment: /portfolio|invest|fund|stock|equit|trad(e|er|ing)|asset management|hedge|wealth/gi,
  banking: /bank|loan|credit|mortgage|deposit|lending|kyc|aml/gi,
  retail: /shop|store|retail|e-?commerce|customer orders|merchandis|grocer/gi,
  healthcare: /clinic|hospital|patient|doctor|nurse|pharma|health/gi,
  logistics: /logistic|shipping|deliver|fleet|warehouse|freight|courier|dispatch/gi,
};

export function detectKind(text: string): OrgKind {
  let best: OrgKind = 'general';
  let bestCount = 0;
  for (const [kind, re] of Object.entries(KIND_WORDS) as Array<[OrgKind, RegExp]>) {
    const count = text.match(re)?.length ?? 0;
    if (count > bestCount) {
      best = kind;
      bestCount = count;
    }
  }
  return best;
}

/* -------------------------------- roles -------------------------------- */

interface RoleEntry {
  match: RegExp;
  role: string;
  responsibility: string;
}

/** Known roles and what they do. Unknown roles still become agents, with a generic duty. */
const ROLES: RoleEntry[] = [
  { match: /investment manager/i, role: 'Investment Manager', responsibility: 'Sets the strategy and asset allocation of each portfolio and proposes the trades that should lift its return.' },
  { match: /fund manager|portfolio manager/i, role: 'Fund Manager', responsibility: 'Runs each portfolio day to day: cash, rebalancing and sector exposure, inside the agreed limits.' },
  { match: /trader|dealer|execution/i, role: 'Trader', responsibility: 'Turns approved decisions into buy and sell orders and gets the best price when placing them.' },
  { match: /audit/i, role: 'Auditor', responsibility: 'Checks every trade and holding against the regulatory limits and reports breaches to the head of the organization.' },
  { match: /compliance/i, role: 'Compliance Officer', responsibility: 'Keeps the rule book up to date and blocks any action that would break a regulation.' },
  { match: /risk/i, role: 'Risk Manager', responsibility: 'Measures exposure and drawdown, and warns before risk goes over the limits.' },
  { match: /analyst|research/i, role: 'Research Analyst', responsibility: 'Studies companies and markets and writes the evidence behind each recommendation.' },
  { match: /account|bookkeep|finance/i, role: 'Accountant', responsibility: 'Keeps the books, reconciles accounts and prepares the monthly figures.' },
  { match: /credit|loan|underwrit/i, role: 'Credit Officer', responsibility: 'Assesses loan applications and recommends approve, decline or more information.' },
  { match: /fraud/i, role: 'Fraud Analyst', responsibility: 'Watches transactions for fraud patterns and freezes suspicious activity for review.' },
  { match: /sales/i, role: 'Sales Lead', responsibility: 'Finds and follows up leads and reports the pipeline every week.' },
  { match: /marketing|promo/i, role: 'Marketing Manager', responsibility: 'Plans campaigns and promotions and measures what each one earned.' },
  { match: /customer|support|service|care/i, role: 'Customer Care Agent', responsibility: 'Answers customer questions and complaints and hands hard cases to a person.' },
  { match: /inventory|stock (controller|keeper|planner)|buyer|procure/i, role: 'Inventory Planner', responsibility: 'Forecasts demand and keeps the right stock on the shelves without over-ordering.' },
  { match: /recept|schedul|appointment|booking/i, role: 'Scheduler', responsibility: 'Books and moves appointments and keeps the diary full without double-booking.' },
  { match: /triage|nurse|clinical/i, role: 'Triage Nurse', responsibility: 'Sorts incoming cases by urgency and routes them to the right clinician.' },
  { match: /dispatch|route|planner/i, role: 'Dispatcher', responsibility: 'Plans routes and assigns deliveries so every order arrives on time.' },
  { match: /fleet|driver|vehicle/i, role: 'Fleet Manager', responsibility: 'Tracks vehicles, maintenance and driver hours.' },
  { match: /hr|recruit|people/i, role: 'HR Partner', responsibility: 'Handles hiring, onboarding and staff questions.' },
  { match: /legal|lawyer|contract/i, role: 'Legal Counsel', responsibility: 'Reviews contracts and flags legal risk before anything is signed.' },
];

const DEFAULT_ROLES: Record<OrgKind, string[]> = {
  investment: ['Investment Manager', 'Fund Manager', 'Trader', 'Auditor'],
  banking: ['Credit Officer', 'Fraud Analyst', 'Compliance Officer', 'Customer Care Agent'],
  retail: ['Inventory Planner', 'Marketing Manager', 'Customer Care Agent', 'Accountant'],
  healthcare: ['Scheduler', 'Triage Nurse', 'Compliance Officer'],
  logistics: ['Dispatcher', 'Fleet Manager', 'Customer Care Agent'],
  general: ['Research Analyst', 'Accountant', 'Customer Care Agent'],
};

const titleCase = (s: string) => s.replace(/\b\p{L}/gu, (c) => c.toUpperCase()).replace(/\b(And|Of|The|For)\b/g, (w) => w.toLowerCase());
const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const sentence = (s: string) => {
  const t = clean(s).replace(/[.;,:\s]+$/, '');
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
};

export function roleFor(raw: string): { role: string; responsibility: string } {
  const entry = ROLES.find((r) => r.match.test(raw));
  if (entry) return { role: entry.role, responsibility: entry.responsibility };
  const role = titleCase(clean(raw));
  return { role, responsibility: `Handles the ${role.toLowerCase()} work and reports progress to the head of the organization.` };
}

/** "under him there is an investment manager, fund manager, trader, audit; these are the agents" */
const MEMBERS = /(?:under (?:him|her|them|it|whom)|reporting to (?:him|her|them)|(?:his|her|their) team)[\s,:]*(?:there (?:is|are|will be)|(?:we|he|she|they) (?:have|has|need)|(?:is|are|has|have|includes?))?[\s,:]*([^;.\n]+)/i;

function readRoles(text: string): string[] {
  const segment = text.match(MEMBERS)?.[1];
  if (segment) {
    const roles = segment
      .replace(/\b(these|they) are\b.*$/i, '')
      .split(/,|\/|&|\band\b|\bplus\b/i)
      .map((p) => clean(p.replace(/^(an?|the|one|some)\s+/i, '').replace(/\b(agents?|bots?)\b/gi, '')))
      .filter((p) => p.length >= 2 && p.length <= 40 && !/^(who|which|that|will)\b/i.test(p));
    if (roles.length) return roles;
  }
  // No team sentence: pick up role nouns mentioned anywhere.
  const nouns = /\b(?:[a-z]+\s)?(?:manager|officer|analyst|trader|auditor|nurse|dispatcher|planner|accountant|counsel|scheduler)s?\b/gi;
  return [...new Set((text.match(nouns) ?? []).map((n) => roleFor(n).role))];
}

/* ------------------------------ the head ------------------------------- */

const HEAD = /\b(\p{Lu}[\p{L}'-]+(?:\s\p{Lu}[\p{L}'-]+)?)\s+is\s+(?:the\s+|an?\s+)?(ceo|chief executive(?: officer)?|founder|co-founder|owner|managing director|director|president|head|manager|chair(?:man|woman|person)?)\s+(?:of|at)\s+(?:the\s+|an?\s+)?([^.,;\n]+)/u;
const HEAD_ROLE: Record<string, string> = { ceo: 'CEO', 'chief executive': 'CEO', 'chief executive officer': 'CEO', 'managing director': 'Managing Director' };

function readHead(text: string) {
  const m = text.match(new RegExp(HEAD.source, 'iu'));
  if (!m) return undefined;
  const [, name = '', rawRole = '', business = ''] = m;
  const role = HEAD_ROLE[rawRole.toLowerCase()] ?? titleCase(rawRole);
  const industry = clean(business.replace(/\b(company|firm|business|organi[sz]ation|group|house|agency|startup)\b.*$/i, '')) || clean(business);
  return { name: titleCase(name), role, industry: sentence(industry) };
}

/* ---------------------------- requirements ----------------------------- */

const PERIODS: Array<[string, RegExp]> = [
  ['ITD', /inception[\s-]to[\s-]date|\bitd\b|since inception/i],
  ['YTD', /year[\s-]to[\s-]date|\bytd\b/i],
  ['QTD', /quarter[\s-]to[\s-]date|\bqtd\b/i],
  ['MTD', /month[\s-]to[\s-]date|\bmtd\b/i],
  ['MoM', /month[\s-]on[\s-]month|\bmom\b|monthly return/i],
];

const ASKS: Array<[RegExp, string | ((k: OrgKind) => string)]> = [
  [/dashboard/i, (k) => (k === 'investment' ? 'A dashboard for each portfolio' : 'A live dashboard')],
  [/return/i, 'Return of the whole portfolio and of each stock'],
  [/contribut/i, 'Contribution of every stock to the portfolio return'],
  [/(suggest|recommend)\w*[^.]*\bagent|agent[^.]*(suggest|recommend)|right trade|buy and sell/i, 'Buy and sell recommendations from each agent'],
  [/graph|chart|visual|plot/i, 'Charts for every return period'],
  [/\bai\b[^.]*(suggest|recommend)|(suggest|recommend)\w*[^.]*\bai\b/i, 'AI suggestions based on the statistics'],
  [/regulat|complian|within (the )?limits/i, 'Every suggestion checked against regulation and compliance rules'],
  [/report/i, 'Regular reports'],
  [/alert|notif/i, 'Alerts when something needs attention'],
  [/forecast|predict/i, 'Forecasts'],
];

function readRequirements(text: string, kind: OrgKind): string[] {
  const asks = ASKS.filter(([re]) => re.test(text)).map(([, label]) => (typeof label === 'function' ? label(kind) : label));
  if (asks.length) return [...new Set(asks)];
  // Nothing we recognise: keep the creator's own "I need ..." phrases.
  const own = [...text.matchAll(/\b(?:i|we)\s+(?:would\s+)?(?:need|want|require)\s+(?:an?\s+|the\s+)?([^.;\n]{4,100})/gi)].map((m) => sentence(m[1] ?? ''));
  return [...new Set(own.filter(Boolean))].slice(0, 6);
}

const COMPLIANCE: Record<OrgKind, string[]> = {
  investment: [
    'No single stock above 10% of a portfolio',
    'Holdings above 5% may not add up to more than 40% of a portfolio (5/10/40 rule)',
    'No sector above 35% of a portfolio',
    'Keep at least 2% of each portfolio in cash',
    'No short selling and no borrowing to buy',
  ],
  banking: ['Know-your-customer checks before opening an account', 'Report suspicious transactions (anti-money laundering)', 'Affordability check before every loan'],
  retail: ['Prices shown include VAT', 'Refunds within 14 days for online orders', 'Customer data handled under GDPR'],
  healthcare: ['Patient data handled under GDPR and kept confidential', 'A clinician signs off every clinical decision'],
  logistics: ['Drivers stay within legal driving hours', 'Dangerous goods are declared and labelled'],
  general: ['Spending above the daily cap needs the owner’s approval', 'Personal data handled under GDPR'],
};

function readMission(text: string, kind: OrgKind, name: string, head: string): string {
  const m = text.match(/\bto\s+((?:actively\s+)?(?:maximi[sz]e|grow|increase|improve|reduce|cut|deliver|create|run|manage|invest)\b[^.;\n]{6,140})/i);
  if (m?.[1]) {
    const core = sentence(m[1]).replace(/\s+(and )?(create|through)\b.*$/i, '');
    const limits = /within (the )?regulat\w* limits/i.test(text) && !/within/i.test(core) ? ', within the regulatory limits' : '';
    return `${core}${limits}.`;
  }
  return kind === 'investment'
    ? 'Maximise the return of every portfolio through the right trades, within the regulatory limits.'
    : `Run the day-to-day work of ${name} with AI agents that report to ${head}.`;
}

/** Reads a description into a draft. Never throws; unknown parts fall back to sensible defaults. */
export function readDescription(text: string): OrgDraft {
  const kind = detectKind(text);
  const head = readHead(text);
  const industry = head?.industry || (kind === 'general' ? 'General business' : KIND_LABEL[kind]);
  const raw = readRoles(text);
  const agents = (raw.length ? raw : DEFAULT_ROLES[kind]).map(roleFor);
  const unique = agents.filter((a, i) => agents.findIndex((b) => b.role === a.role) === i).slice(0, 8);
  const headName = head?.name ?? 'Owner';
  const name = head ? `${head.name} ${titleCase(industry)}` : `${KIND_LABEL[kind]} organization`;
  return {
    name,
    kind,
    industry,
    mission: readMission(text, kind, name, head ? headName : 'the owner'),
    head: { name: headName, role: head?.role ?? 'Owner' },
    agents: unique,
    requirements: readRequirements(text, kind),
    periods: PERIODS.filter(([, re]) => re.test(text)).map(([p]) => p),
    compliance: COMPLIANCE[kind],
  };
}

/* ---------------------------- organization ----------------------------- */

const AGENT_NAMES = ['Mira', 'Orion', 'Vera', 'Kai', 'Juno', 'Silas', 'Rhea', 'Felix', 'Iris', 'Lumen', 'Cato', 'Nyla'];

/** Small stable hash, used as the seed of an organization's simulated data. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Who exchanges work with whom: each agent hands on to the next, oversight roles see everyone. */
function wire(members: OrgMember[]): OrgMember[] {
  const agents = members.filter((m) => m.kind === 'agent');
  const oversight = /audit|compliance|risk/i;
  return members.map((m) => {
    if (m.kind !== 'agent') return m;
    const i = agents.indexOf(m);
    const talks = new Set<ID>();
    if (oversight.test(m.role)) agents.forEach((a) => a.id !== m.id && talks.add(a.id));
    else {
      const next = agents.slice(i + 1).find((a) => !oversight.test(a.role));
      if (next) talks.add(next.id);
    }
    return { ...m, talksTo: [...talks] };
  });
}

export function createOrganization(
  draft: OrgDraft,
  meta: { description: string; createdBy: string; createdAt?: ISODate; readBy: Organization['readBy']; id?: ID },
): Organization {
  const createdAt = meta.createdAt ?? new Date().toISOString();
  const seed = hashString(`${meta.description}|${createdAt}`);
  const id = meta.id ?? `org-${seed.toString(36)}`;
  const headId = `${id}-head`;
  const names = [...AGENT_NAMES].sort((a, b) => hashString(a + seed) - hashString(b + seed)).filter((n) => n !== draft.head.name);
  const members: OrgMember[] = [
    { id: headId, name: draft.head.name, role: draft.head.role, kind: 'head', responsibility: `Heads ${draft.name}, sets the goals and approves what the agents recommend.`, talksTo: [] },
    ...draft.agents.map((a, i) => ({
      id: `${id}-a${i}`,
      name: names[i % names.length] ?? `Agent ${i + 1}`,
      role: a.role,
      kind: 'agent' as const,
      reportsTo: headId,
      responsibility: a.responsibility,
      talksTo: [],
    })),
  ];
  return {
    id,
    name: draft.name,
    kind: draft.kind,
    industry: draft.industry,
    createdBy: clean(meta.createdBy) || 'Unknown',
    createdAt,
    description: meta.description.trim(),
    mission: draft.mission,
    members: wire(members),
    requirements: draft.requirements,
    periods: draft.kind === 'investment' && !draft.periods.length ? ['ITD', 'YTD', 'MTD', 'MoM'] : draft.periods,
    compliance: draft.compliance,
    readBy: meta.readBy,
    seed,
  };
}

export const headOf = (org: Organization) => org.members.find((m) => m.kind === 'head');
export const agentsOf = (org: Organization) => org.members.filter((m) => m.kind === 'agent');
