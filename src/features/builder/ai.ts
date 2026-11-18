/**
 * The local model's part in the builder interview. The scripted state machine
 * in ./interview.ts keeps control of the flow, the quick replies and the
 * safety-relevant fields (limits, spending cap, schedule, data sources); the
 * model only frames the role and words the job description.
 */
import { generateJson } from '@/ai';
import type { DepartmentKey } from '@/types';
import { CONNECTOR_KEYS, connectorLabel, type AiFraming, type JdDraft, type Step } from './interview';

const DEPARTMENTS: DepartmentKey[] = ['operations', 'sales', 'customer-care', 'finance'];

const SYSTEM =
  'You help a small business owner hire an AI agent by writing its job description. Write in plain, short British English for a non-technical owner. Fix spelling mistakes in what the owner wrote. Never invent numbers about their business. Reply only with JSON.';

/* ----------------------------- validation ----------------------------- */

const text = (v: unknown, max = 220) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const list = (v: unknown, maxItems: number, maxLen = 140) =>
  Array.isArray(v) ? [...new Set(v.map((x) => text(x, maxLen)).filter(Boolean))].slice(0, maxItems) : [];
const firstWord = (s: string) => s.split(/\s+/)[0]?.replace(/[^\p{L}-]/gu, '') ?? '';

const FRAMING_SCHEMA = {
  type: 'object',
  properties: {
    intro: { type: 'string' },
    title: { type: 'string' },
    department: { type: 'string', enum: DEPARTMENTS },
    mission: { type: 'string' },
    responsibilities: { type: 'array', items: { type: 'string' } },
    connectorKeys: { type: 'array', items: { type: 'string', enum: CONNECTOR_KEYS } },
    kpis: { type: 'array', items: { type: 'string' } },
    names: { type: 'array', items: { type: 'string' } },
  },
  required: ['intro', 'title', 'department', 'mission', 'responsibilities', 'connectorKeys', 'kpis', 'names'],
};

/** Cleans the model's framing. Returns undefined when it is unusable, so the scripted flow is kept. */
export function sanitizeFraming(raw: unknown): AiFraming | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  const title = text(r.title, 50);
  const mission = text(r.mission, 300);
  if (!title || !mission) return undefined;
  const department = DEPARTMENTS.includes(r.department as DepartmentKey) ? (r.department as DepartmentKey) : 'operations';
  const connectorKeys = list(r.connectorKeys, 4).filter((k) => CONNECTOR_KEYS.includes(k));
  const names = list(r.names, 3, 30).map(firstWord).filter((n) => n.length >= 2).map((n) => n.charAt(0).toUpperCase() + n.slice(1));
  const kpis = list(r.kpis, 4, 80);
  return {
    intro: text(r.intro, 300) || `That's a job for a ${title}.`,
    title,
    department,
    mission,
    responsibilities: list(r.responsibilities, 5),
    connectorKeys: connectorKeys.length ? connectorKeys : ['email', 'csv'],
    kpis: kpis.length ? kpis : ['Time saved', 'Fewer mistakes'],
    names: names.length ? names : ['Nova', 'Juno', 'Kai'],
  };
}

/** Turns the owner's problem into a role. `null` when the scripted provider is selected. */
export async function frameJob(problem: string, signal?: AbortSignal): Promise<AiFraming | undefined | null> {
  const sources = CONNECTOR_KEYS.map((k) => `${k} (${connectorLabel(k)})`).join(', ');
  const raw = await generateJson<unknown>({
    system: SYSTEM,
    signal,
    schema: FRAMING_SCHEMA,
    prompt: [
      `The owner wrote: "${problem}"`,
      '',
      'Describe the AI agent that should do this job:',
      '- intro: one or two sentences spoken to the owner, starting with "You want", restating their request in clear words and naming the role. No question.',
      '- title: a short job title, two to four words.',
      `- department: one of ${DEPARTMENTS.join(', ')}.`,
      '- mission: one sentence, what the agent achieves for the business.',
      '- responsibilities: three or four concrete duties, each starting with a verb.',
      `- connectorKeys: two to four data sources it needs, chosen only from: ${sources}.`,
      '- kpis: three measurable results the owner could pick as success, each under eight words.',
      '- names: three short, friendly one-word names for the agent.',
    ].join('\n'),
  });
  return raw === null ? null : sanitizeFraming(raw);
}

/* ------------------------------ answers ------------------------------- */

export interface Refinement {
  ack: string;
  /** Quick replies the typed answer means. Empty when none fit. */
  choiceIds: string[];
  patch: Pick<JdDraft, 'mission' | 'responsibilities'> & { extraOutputs: string[] };
}

const refineSchema = (choiceIds: string[]) => ({
  type: 'object',
  properties: {
    ack: { type: 'string' },
    choiceIds: { type: 'array', items: choiceIds.length ? { type: 'string', enum: choiceIds } : { type: 'string' } },
    mission: { type: 'string' },
    responsibilities: { type: 'array', items: { type: 'string' } },
    outputs: { type: 'array', items: { type: 'string' } },
  },
  required: ['ack', 'choiceIds', 'mission', 'responsibilities', 'outputs'],
});

export function sanitizeRefinement(raw: unknown, draft: JdDraft, step: Pick<Step, 'choices' | 'multi'>): Refinement | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  const ack = text(r.ack, 240);
  if (!ack) return undefined;
  const valid = new Set(step.choices.map((c) => c.id));
  const choiceIds = list(r.choiceIds, 6, 60).filter((id) => valid.has(id));
  const responsibilities = list(r.responsibilities, 6);
  return {
    // The scripted question follows the ack, so drop any question the model added.
    ack: ack.replace(/[^.!]*\?\s*$/, '').trim() || ack,
    choiceIds: step.multi ? choiceIds : choiceIds.slice(0, 1),
    patch: {
      mission: text(r.mission, 300) || draft.mission,
      responsibilities: responsibilities.length ? responsibilities : draft.responsibilities,
      extraOutputs: list(r.outputs, 3),
    },
  };
}

/**
 * Reads a typed answer that matched no quick reply: which replies it means, a
 * short acknowledgement, and a reworded mission and duties.
 */
export async function refineAnswer(
  opts: { problem?: string; step: Step; answer: string; draft: JdDraft },
  signal?: AbortSignal,
): Promise<Refinement | undefined | null> {
  const { problem, step, answer, draft } = opts;
  const options = step.choices.map((c) => `${c.id} = "${c.label}"`).join('; ');
  const raw = await generateJson<unknown>({
    system: SYSTEM,
    signal,
    schema: refineSchema(step.choices.map((c) => c.id)),
    prompt: [
      `Role: ${draft.title ?? 'AI agent'}.${problem ? ` The owner's original request: "${problem}".` : ''}`,
      `Current job description: ${JSON.stringify({ mission: draft.mission, responsibilities: draft.responsibilities, outputs: draft.outputs })}`,
      '',
      `You asked: "${step.question}"`,
      `The owner answered: "${answer}"`,
      '',
      'Return:',
      `- choiceIds: which of these options the answer means (${step.multi ? 'one or more' : 'at most one'}), or an empty list if none fit: ${options}.`,
      '- ack: one or two short sentences acknowledging the answer in your own words. Do not ask a question.',
      '- mission and responsibilities: the job description updated with anything the answer adds. Keep what is still right, rewrite pasted text into clear duties starting with a verb, at most five duties.',
      '- outputs: new things the agent should deliver because of this answer, or an empty list.',
    ].join('\n'),
  });
  return raw === null ? null : sanitizeRefinement(raw, draft, step);
}
