/**
 * The local model's part in the back office. The rules in src/lib/orgs.ts
 * always read the description first; the model only improves the wording
 * (name, mission, duties, requirements). The industry's compliance rules and
 * every number on the dashboards stay rule-based.
 */
import { generate, generateJson } from '@/ai';
import type { Organization } from '@/types';
import type { MarketBook } from '@/lib/investing';
import { adviceFacts } from '@/lib/investing';
import { ORG_KINDS, roleFor, type OrgDraft } from '@/lib/orgs';

const SYSTEM =
  'You set up organizations of AI agents from a plain-language description written by a business owner. Fix spelling mistakes. Use short, plain British English. Never invent figures. Reply only with JSON.';

const SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    kind: { type: 'string', enum: ORG_KINDS },
    industry: { type: 'string' },
    mission: { type: 'string' },
    headName: { type: 'string' },
    headRole: { type: 'string' },
    agents: { type: 'array', items: { type: 'object', properties: { role: { type: 'string' }, responsibility: { type: 'string' } }, required: ['role', 'responsibility'] } },
    requirements: { type: 'array', items: { type: 'string' } },
  },
  required: ['name', 'kind', 'industry', 'mission', 'headName', 'headRole', 'agents', 'requirements'],
};

const text = (v: unknown, max = 200) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** Merges the model's reading into the rule-based draft. Anything missing or odd keeps the rules' value. */
export function mergeReading(raw: unknown, rules: OrgDraft): OrgDraft {
  const r = (raw ?? {}) as Record<string, unknown>;
  const agents = Array.isArray(r.agents)
    ? (r.agents as Array<Record<string, unknown>>)
        .map((a) => ({ role: text(a.role, 40), responsibility: text(a.responsibility, 220) }))
        .filter((a) => a.role)
        .map((a) => ({ role: roleFor(a.role).role, responsibility: a.responsibility || roleFor(a.role).responsibility }))
        .slice(0, 8)
    : [];
  const requirements = Array.isArray(r.requirements) ? r.requirements.map((x) => text(x, 120)).filter(Boolean).slice(0, 8) : [];
  // The kind decides the compliance rules and the dashboard, so only accept it when the rules found nothing.
  const kind = rules.kind === 'general' && ORG_KINDS.includes(r.kind as OrgDraft['kind']) ? (r.kind as OrgDraft['kind']) : rules.kind;
  return {
    ...rules,
    kind,
    name: text(r.name, 60) || rules.name,
    industry: text(r.industry, 50) || rules.industry,
    mission: text(r.mission, 280) || rules.mission,
    head: { name: text(r.headName, 40) || rules.head.name, role: text(r.headRole, 40) || rules.head.role },
    agents: agents.length ? agents : rules.agents,
    requirements: requirements.length ? requirements : rules.requirements,
  };
}

/** `null` when the scripted provider is selected. Throws OllamaError when the model cannot be used. */
export async function readWithModel(description: string, rules: OrgDraft, signal?: AbortSignal): Promise<OrgDraft | null> {
  const raw = await generateJson<unknown>({
    system: SYSTEM,
    signal,
    schema: SCHEMA,
    prompt: [
      `The owner wrote:\n"""${description.slice(0, 2500)}"""`,
      '',
      `A first reading found: ${JSON.stringify({ name: rules.name, kind: rules.kind, head: rules.head, agents: rules.agents.map((a) => a.role) })}`,
      '',
      'Return:',
      '- name: the organization name (keep the person’s name in it if there is no company name).',
      `- kind: one of ${ORG_KINDS.join(', ')}.`,
      '- industry: two to four words.',
      '- mission: one sentence, what the organization achieves.',
      '- headName and headRole: the person who heads it.',
      '- agents: every role that works under the head, with one sentence each on what it does.',
      '- requirements: what the owner asked to see or get, one short item each, at most eight.',
    ].join('\n'),
  });
  return raw === null ? null : mergeReading(raw, rules);
}

/** The local model's advice for an investment organization. `null` when the scripted provider is selected. */
export function adviseWithModel(org: Organization, book: MarketBook, onText: (t: string) => void, signal?: AbortSignal) {
  return generate({
    system: [
      `You are the AI adviser to ${org.members[0]?.name ?? 'the CEO'}, head of ${org.name}.`,
      `Compliance rules: ${org.compliance.join('; ')}.`,
      'Give four to six numbered suggestions to raise returns, each one or two sentences, in plain text without markdown.',
      'Use only the figures given. Every suggestion must respect the compliance rules; say which rule it respects when it is close to a limit.',
    ].join('\n'),
    history: [{ role: 'user', content: `Statistics for today:\n${adviceFacts(org, book)}\n\nWhat should we do?` }],
    temperature: 0.3,
    onText,
    signal,
  });
}
