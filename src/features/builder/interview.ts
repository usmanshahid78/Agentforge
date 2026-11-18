/**
 * Scripted interview engine. A small state machine (pure functions, no React)
 * that walks the owner through a script of questions and incrementally
 * writes a job description draft. Extend by adding a Script: each step says
 * what to ask, which quick replies to offer, how to clarify when the owner is
 * unsure, and how an answer changes the draft.
 */
import type { DepartmentKey, JobDescription, RoleTemplate } from '@/types';

export interface Choice {
  id: string;
  label: string;
  /** Extra words that match this choice from free text. */
  keywords?: string[];
  recommended?: boolean;
}

export interface JdDraft extends Partial<JobDescription> {
  name?: string;
  connectorKeys?: string[];
}

export interface Step {
  id: string;
  question: string;
  choices: Choice[];
  multi: boolean;
  /** Clarifying follow-up shown after "I'm not sure". Should recommend something. */
  unsure: string;
  /** Short acknowledgement before the next question. */
  ack: (labels: string[], freeText?: string) => string;
  apply: (draft: JdDraft, choiceIds: string[], freeText?: string) => JdDraft;
}

export interface Script {
  id: string;
  intro: string;
  steps: Step[];
  outro: (draft: JdDraft) => string;
  initialDraft: JdDraft;
}

export interface Message {
  id: number;
  from: 'ai' | 'user';
  text: string;
  stepId?: string;
}

export type InterviewStatus = 'asking' | 'clarifying' | 'complete';

export interface InterviewState {
  stepIndex: number;
  status: InterviewStatus;
  answers: Record<string, string[]>;
  draft: JdDraft;
  messages: Message[];
}

export type InterviewEvent =
  | { type: 'ANSWER'; choiceIds: string[]; freeText?: string }
  | { type: 'TEXT'; text: string }
  | { type: 'UNSURE' };

const msg = (state: InterviewState, from: Message['from'], text: string, stepId?: string): Message => ({
  id: state.messages.length,
  from,
  text,
  stepId,
});

export function startInterview(script: Script): InterviewState {
  const base: InterviewState = {
    stepIndex: 0,
    status: 'asking',
    answers: {},
    draft: { ...script.initialDraft },
    messages: [],
  };
  const first = script.steps[0];
  const text = first ? `${script.intro}\n\n${first.question}` : script.intro;
  return { ...base, messages: [msg(base, 'ai', text, first?.id)] };
}

export function currentStep(script: Script, state: InterviewState): Step | undefined {
  return state.status === 'complete' ? undefined : script.steps[state.stepIndex];
}

/** Matches free text to a step's choices by label or keyword. */
export function matchChoices(step: Step, text: string): string[] {
  const t = text.toLowerCase();
  const hits = step.choices.filter((c) =>
    [c.label, ...(c.keywords ?? [])].some((k) => t.includes(k.toLowerCase())),
  );
  return step.multi ? hits.map((c) => c.id) : hits.slice(0, 1).map((c) => c.id);
}

export function interviewReducer(script: Script, state: InterviewState, event: InterviewEvent): InterviewState {
  const step = currentStep(script, state);
  if (!step) return state;

  if (event.type === 'UNSURE') {
    const withUser = { ...state, messages: [...state.messages, msg(state, 'user', "I'm not sure", step.id)] };
    return {
      ...withUser,
      status: 'clarifying',
      messages: [...withUser.messages, msg(withUser, 'ai', step.unsure, step.id)],
    };
  }

  let choiceIds: string[];
  let freeText: string | undefined;
  let userText: string;
  if (event.type === 'TEXT') {
    const text = event.text.trim();
    if (!text) return state;
    choiceIds = matchChoices(step, text);
    freeText = choiceIds.length ? undefined : text;
    userText = text;
  } else {
    choiceIds = event.choiceIds;
    freeText = event.freeText?.trim() || undefined;
    if (!choiceIds.length && !freeText) return state;
    const labels = step.choices.filter((c) => choiceIds.includes(c.id)).map((c) => c.label);
    userText = [...labels, ...(freeText ? [freeText] : [])].join(', ');
  }

  const labels = step.choices.filter((c) => choiceIds.includes(c.id)).map((c) => c.label);
  const draft = step.apply(state.draft, choiceIds, freeText);
  const withUser: InterviewState = {
    ...state,
    draft,
    answers: { ...state.answers, [step.id]: freeText ? [...choiceIds, `text:${freeText}`] : choiceIds },
    messages: [...state.messages, msg(state, 'user', userText, step.id)],
  };

  const nextIndex = state.stepIndex + 1;
  const next = script.steps[nextIndex];
  const ack = step.ack(labels, freeText);
  if (!next) {
    return {
      ...withUser,
      stepIndex: nextIndex,
      status: 'complete',
      messages: [...withUser.messages, msg(withUser, 'ai', `${ack}\n\n${script.outro(draft)}`)],
    };
  }
  return {
    ...withUser,
    stepIndex: nextIndex,
    status: 'asking',
    messages: [...withUser.messages, msg(withUser, 'ai', `${ack}\n\n${next.question}`, next.id)],
  };
}

/* ------------------------------------------------------------------ */
/* JD completeness                                                     */
/* ------------------------------------------------------------------ */

export const JD_FIELDS = [
  'title',
  'mission',
  'responsibilities',
  'inputs',
  'outputs',
  'schedule',
  'kpis',
  'limits',
  'spendingCapPerDay',
  'escalation',
  'name',
] as const;
export type JdField = (typeof JD_FIELDS)[number];

export function filledFields(d: JdDraft): Set<JdField> {
  const out = new Set<JdField>();
  const has = (v: unknown) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== '');
  if (has(d.title)) out.add('title');
  if (has(d.mission)) out.add('mission');
  if (has(d.responsibilities)) out.add('responsibilities');
  if (has(d.inputs)) out.add('inputs');
  if (has(d.outputs)) out.add('outputs');
  if (has(d.schedule)) out.add('schedule');
  if (has(d.kpis)) out.add('kpis');
  if (has(d.canDecideAlone) || has(d.needsApproval)) out.add('limits');
  if (d.spendingCapPerDay !== undefined) out.add('spendingCapPerDay');
  if (has(d.escalation)) out.add('escalation');
  if (has(d.name)) out.add('name');
  return out;
}

export function completeness(d: JdDraft): number {
  return Math.round((filledFields(d).size / JD_FIELDS.length) * 100);
}

/* ------------------------------------------------------------------ */
/* Scripts                                                             */
/* ------------------------------------------------------------------ */

const uniq = <T,>(xs: T[]) => [...new Set(xs)];
const listJoin = (xs: string[]) =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

const CONNECTOR_LABEL: Record<string, string> = {
  pos: 'Point of Sale',
  weather: 'Weather feed',
  events: 'Local events',
  footfall: 'Footfall camera',
  'inventory-sheet': 'Inventory sheet',
  'supplier-portal': 'Supplier portal',
  'competitor-pricing': 'Competitor pricing',
  whatsapp: 'WhatsApp Business',
  email: 'Email',
  shopify: 'Online store',
  analytics: 'Web analytics',
  csv: 'CSV upload',
};

export const connectorLabel = (key: string) => CONNECTOR_LABEL[key] ?? key;
export const CONNECTOR_KEYS = Object.keys(CONNECTOR_LABEL);

/** The model's reading of a free-form problem (see ./ai.ts). Plain data so it can be persisted. */
export interface AiFraming {
  intro: string;
  title: string;
  department: DepartmentKey;
  mission: string;
  responsibilities: string[];
  connectorKeys: string[];
  kpis: string[];
  names: string[];
}

const frequencyStep = (subject: string): Step => ({
  id: 'frequency',
  question: `How often should it report to you?`,
  multi: false,
  choices: [
    { id: 'daily', label: 'Daily', keywords: ['every day', 'each morning', 'morning'], recommended: true },
    { id: 'weekly', label: 'Weekly', keywords: ['week', 'monday'] },
  ],
  unsure: `Most owners start with a short daily briefing at 08:00. It takes a minute to read and catches surprises early. You can always switch to weekly later. Shall we go with daily?`,
  ack: (l) => (l[0] === 'Weekly' ? 'Weekly it is, every Monday morning.' : `Daily it is. I'll have the ${subject} ready by 08:00.`),
  apply: (d, ids) => {
    const weekly = ids.includes('weekly');
    return {
      ...d,
      schedule: weekly ? 'Weekly on Monday at 08:00, plus alerts when needed' : 'Daily at 08:00, plus alerts when needed',
      outputs: uniq([
        ...(d.outputs ?? []).filter((o) => !/briefing|weekly report/i.test(o)),
        weekly ? 'Weekly report on Monday at 08:00' : 'Daily briefing at 08:00',
        ...(weekly ? [] : ['Weekly summary report']),
      ]),
    };
  },
});

const limitsStep: Step = {
  id: 'limits',
  question: 'What should it be allowed to do on its own, and what needs your approval?',
  multi: false,
  choices: [
    { id: 'recommend', label: 'Recommend only, I decide everything', keywords: ['recommend', 'nothing', 'ask me'], recommended: true },
    { id: 'alerts', label: 'Send briefings and alerts alone, ask before any change', keywords: ['alert', 'brief'] },
    { id: 'small', label: 'Make small changes up to £200 a day alone', keywords: ['small', '£', 'budget', 'spend'] },
  ],
  unsure:
    "A safe start is Shadow mode: it only recommends, and you make every decision. Once its track record is good, you can give it more freedom from the trust ladder. I'd suggest \"Recommend only\" for now.",
  ack: (l) => (l[0]?.startsWith('Make small') ? 'Okay, small changes within a £200 daily cap, everything else comes to you.' : 'Understood. Anything that changes the business will come to you first.'),
  apply: (d, ids) => {
    const small = ids.includes('small');
    const alerts = ids.includes('alerts') || small;
    return {
      ...d,
      canDecideAlone: small
        ? ['Write and send briefings', 'Raise alerts', 'Small adjustments up to £200 a day']
        : alerts
          ? ['Write and send briefings', 'Raise alerts']
          : ['Write and send briefings'],
      needsApproval: small
        ? ['Anything above £200', 'Any change to staff rotas', 'Any promotion']
        : ['Any change to stock orders', 'Any change to staff rotas', 'Any promotion'],
      spendingCapPerDay: small ? 200 : 0,
      escalation: [
        'Forecast error above 25% for 3 days in a row',
        'Missing data from a connected source for 24 hours',
        ...(small ? ['A change would exceed the daily cap'] : []),
      ],
    };
  },
};

const nameStep = (suggestions: string[]): Step => ({
  id: 'name',
  question: `Last one. What should we call your new team member? Pick a name or type your own.`,
  multi: false,
  choices: suggestions.map((n, i) => ({ id: n.toLowerCase(), label: n, recommended: i === 0 })),
  unsure: `Short names work best when the agent speaks in briefings. "${suggestions[0]}" suits an analyst who sees the bigger picture.`,
  ack: (l, t) => `${l[0] ?? t} it is. Nice to meet them.`,
  apply: (d, ids, text) => {
    const pick = suggestions.find((s) => s.toLowerCase() === ids[0]);
    const name = (pick ?? text ?? suggestions[0] ?? 'Atlas').split(/\s+/)[0] ?? 'Atlas';
    return { ...d, name: name.charAt(0).toUpperCase() + name.slice(1) };
  },
});

/** The Nova Mart scenario (section 8 of the brief). */
export function retailWeatherScript(problem?: string): Script {
  return {
    id: 'retail-weather',
    intro: `${problem ? `"${problem}". ` : ''}Got it. You want to understand how weather and local events move your sales, so you can act before it happens. That's a job for an Environment Analyst. I'll ask six quick questions and write the job description as we go.`,
    initialDraft: {
      title: 'Environment Analyst',
      department: 'operations',
      mission:
        'Explain how weather and local events move sales, and turn that into clear advice before it happens.',
    },
    steps: [
      {
        id: 'products',
        question: 'Which products matter most to you?',
        multi: true,
        choices: [
          { id: 'groceries', label: 'Groceries', keywords: ['food', 'drinks', 'fresh'], recommended: true },
          { id: 'clothing', label: 'Clothing', keywords: ['clothes', 'fashion', 'jackets'] },
          { id: 'electronics', label: 'Electronics', keywords: ['tech', 'phones', 'headphones'] },
          { id: 'other', label: 'Other', keywords: ['garden', 'home', 'toys'] },
        ],
        unsure:
          "No problem. Weather hits groceries and seasonal clothing hardest: drinks, ice cream, umbrellas, coats. Looking at your till data, groceries are 58% of sales. I'd start with groceries and clothing.",
        ack: (l, t) => `Great, I'll focus on ${l.length ? listJoin(l.map((x) => x.toLowerCase())) : t}.`,
        apply: (d, ids, text) => {
          const cats = ids.length ? ids.filter((i) => i !== 'other') : [];
          const named = [...cats, ...(ids.includes('other') ? ['other lines'] : []), ...(text ? [text] : [])];
          return {
            ...d,
            mission: `Explain how weather and local events move Nova Mart sales of ${listJoin(named)}, and turn that into clear daily advice.`,
            responsibilities: uniq([
              `Forecast next-7-day demand for ${listJoin(named)} using weather and events`,
              'Flag unusual days (heatwaves, storms, big local events) 48 hours ahead',
              ...(d.responsibilities ?? []).slice(2),
              'Explain every recommendation in plain language',
            ]),
          };
        },
      },
      {
        id: 'decisions',
        question: 'Which decisions should this help you with?',
        multi: true,
        choices: [
          { id: 'staffing', label: 'Staffing', keywords: ['staff', 'rota', 'shifts', 'people'], recommended: true },
          { id: 'ordering', label: 'Ordering stock', keywords: ['order', 'stock', 'inventory', 'reorder'], recommended: true },
          { id: 'promotions', label: 'Promotions', keywords: ['promo', 'offer', 'discount', 'marketing'] },
        ],
        unsure:
          'The quickest wins usually come from ordering (fewer empty shelves on hot days) and staffing (more hands when an event brings crowds). Promotions can come later. Want to start with staffing and ordering?',
        ack: (l, t) => `Got it: ${l.length ? listJoin(l.map((x) => x.toLowerCase())) : t}.`,
        apply: (d, ids, text) => {
          const resp: string[] = [];
          const outs: string[] = [];
          if (ids.includes('staffing')) {
            resp.push('Recommend staffing levels for each store');
            outs.push('Staffing suggestions');
          }
          if (ids.includes('ordering')) {
            resp.push('Recommend stock adjustments for weather-driven lines');
            outs.push('Order adjustment suggestions');
          }
          if (ids.includes('promotions')) {
            resp.push('Suggest promotions that ride the weather and local events');
            outs.push('Promotion ideas');
          }
          if (text) resp.push(`Help with: ${text}`);
          const base = (d.responsibilities ?? []).filter((r) => !/^Recommend|^Suggest|^Help with/.test(r));
          return {
            ...d,
            responsibilities: uniq([...base.slice(0, 2), ...resp, ...base.slice(2)]),
            outputs: uniq([...(d.outputs ?? []), 'Alerts for unusual days', ...outs]),
          };
        },
      },
      frequencyStep('briefing'),
      {
        id: 'data',
        question:
          'Which data do you have? I suggest your till (POS), a weather feed and local events. A footfall camera helps with staffing.',
        multi: true,
        choices: [
          { id: 'pos', label: 'Point of Sale', keywords: ['pos', 'till', 'sales'], recommended: true },
          { id: 'weather', label: 'Weather feed', keywords: ['weather', 'forecast'], recommended: true },
          { id: 'events', label: 'Local events', keywords: ['event', 'concert', 'match'], recommended: true },
          { id: 'footfall', label: 'Footfall camera', keywords: ['footfall', 'camera', 'door', 'counter'] },
        ],
        unsure:
          "Your till is already connected, so that's covered. Weather and local events are public feeds I can connect for you in a minute, no technical setup. Footfall needs a door sensor, so we can skip it for now.",
        ack: (l) =>
          l.length
            ? `Perfect. ${listJoin(l)} it is. I'll check what's already connected.`
            : "Thanks. I'll work with what's available and flag any gaps.",
        apply: (d, ids) => {
          const keys = ids.length ? ids : ['pos', 'weather', 'events'];
          return { ...d, connectorKeys: keys, inputs: keys.map(connectorLabel) };
        },
      },
      limitsStep,
      {
        id: 'success',
        question: 'What does success look like after a month?',
        multi: true,
        choices: [
          { id: 'accuracy', label: 'Forecast accuracy', keywords: ['accura', 'forecast', 'right'], recommended: true },
          { id: 'stockouts', label: 'Fewer stockouts', keywords: ['stockout', 'empty', 'shelves', 'run out'], recommended: true },
          { id: 'waste', label: 'Less waste', keywords: ['waste', 'spoil', 'throw'] },
          { id: 'time', label: 'Time saved', keywords: ['time', 'hours'] },
        ],
        unsure:
          'Two numbers tell you if it is working: forecast accuracy (is it right?) and stockouts (did it help?). I would aim for 85% accuracy and 20% fewer stockouts on weather-driven lines.',
        ack: () => 'Those are clear targets. I will track them in its monthly review.',
        apply: (d, ids, text) => {
          const map: Record<string, string> = {
            accuracy: 'Forecast accuracy above 85%',
            stockouts: '20% fewer stockouts on weather-driven lines',
            waste: '10% less fresh-food waste',
            time: '2 hours a week saved on planning',
          };
          return { ...d, kpis: uniq([...ids.map((i) => map[i] ?? i), ...(text ? [text] : [])]) };
        },
      },
      nameStep(['Atlas', 'Orion', 'Sol']),
    ],
    outro: (d) =>
      `Your job description for ${d.name ?? 'your analyst'} is ready. Next: connect the remaining data, build the agent, and test it on the last 60 days of your sales before it starts. I recommend starting in Shadow mode, where it only recommends.`,
  };
}

/** A shorter script used for marketplace templates and free-form problems. */
export function genericScript(opts: { template?: RoleTemplate; problem?: string; ai?: AiFraming }): Script {
  const { template, problem, ai } = opts;
  if (ai && !template) return framedScript(problem ?? '', ai);
  const title = template?.title ?? 'Business Assistant';
  const dept: DepartmentKey = template?.department ?? 'operations';
  const keys = template?.requiredConnectors ?? ['pos', 'email'];
  const names = template ? NAME_IDEAS[template.id] ?? ['Nova', 'Juno', 'Kai'] : ['Nova', 'Juno', 'Kai'];
  return withSteps({
    id: template ? `template:${template.id}` : 'generic',
    intro: template
      ? `Let's hire a ${title}. ${template.summary} I've pre-filled the job description from the template. A few questions to tailor it to your shop.`
      : `"${problem ?? 'Help my business'}". Got it. I'll ask a few questions and draft a job description as we go.`,
    initialDraft: {
      title,
      department: dept,
      mission: template?.summary ?? `Help the owner with: ${problem ?? 'day-to-day operations'}.`,
      responsibilities: template
        ? [template.summary.replace(/\.$/, ''), 'Explain every recommendation in plain language']
        : [`Work on: ${problem ?? 'the problem described'}`, 'Explain every recommendation in plain language'],
    },
    keys,
    kpis: template?.kpis ?? ['Time saved', 'Fewer mistakes'],
    names,
    dept,
  });
}

/** A free-form problem after the local model has framed it as a role. */
function framedScript(problem: string, ai: AiFraming): Script {
  return withSteps({
    id: 'ai',
    intro: `"${problem}". ${ai.intro} I'll ask a few quick questions and write the job description as we go.`,
    initialDraft: {
      title: ai.title,
      department: ai.department,
      mission: ai.mission,
      responsibilities: uniq([...ai.responsibilities, 'Explain every recommendation in plain language']),
    },
    keys: ai.connectorKeys,
    kpis: ai.kpis,
    names: ai.names,
    dept: ai.department,
  });
}

function withSteps(opts: {
  id: string;
  intro: string;
  initialDraft: JdDraft;
  keys: string[];
  kpis: string[];
  names: string[];
  dept: DepartmentKey;
}): Script {
  const { keys, kpis, names, dept } = opts;
  return {
    id: opts.id,
    intro: opts.intro,
    initialDraft: opts.initialDraft,
    steps: [
      {
        id: 'data',
        question: `This role works best with ${listJoin(keys.map(connectorLabel))}. Which of these do you have?`,
        multi: true,
        choices: keys.map((k) => ({ id: k, label: connectorLabel(k), recommended: true })),
        unsure: `Pick what you have now; I will flag missing sources and tell you how much accuracy you lose without them.`,
        ack: (l) => (l.length ? `Great, ${listJoin(l)}.` : "Okay, we'll start with what's available."),
        apply: (d, ids) => {
          const k = ids.length ? ids : keys;
          return { ...d, connectorKeys: k, inputs: k.map(connectorLabel) };
        },
      },
      frequencyStep('report'),
      limitsStep,
      {
        id: 'success',
        question: 'Which result matters most to you?',
        multi: true,
        choices: kpis.map((k, i) => ({
          id: `kpi${i}`,
          label: k,
          recommended: i === 0,
        })),
        unsure: 'Most owners pick the first one. You can change targets any time from the agent profile.',
        ack: () => 'Noted. These become its KPIs.',
        apply: (d, ids, text) => {
          const picked = ids.map((i) => kpis[Number(i.replace('kpi', ''))] ?? i);
          return { ...d, kpis: [...picked, ...(text ? [text] : [])] };
        },
      },
      nameStep(names),
    ],
    outro: (d) =>
      `The job description for ${d.name} is ready. Connect any missing data, build, test, and hire them into ${dept.replace('-', ' ')}.`,
  };
}

const NAME_IDEAS: Record<string, string[]> = {
  'tpl-env': ['Atlas', 'Orion', 'Sol'],
  'tpl-stock': ['Vega', 'Pike', 'Mira'],
  'tpl-promo': ['Pulse', 'Spark', 'Nova'],
  'tpl-price': ['Lyra', 'Cass', 'Remy'],
  'tpl-care': ['Echo', 'Iris', 'Sunny'],
  'tpl-writer': ['Quill', 'Ink', 'Poe'],
  'tpl-fin': ['Ledger', 'Penny', 'Sterling'],
};

export function isWeatherProblem(text: string | undefined): boolean {
  return !!text && /weather|rain|temperature|event|season|forecast|environment/i.test(text);
}
