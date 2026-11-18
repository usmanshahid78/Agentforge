import type { Agent, JobDescription, RoleTemplate } from '@/types';
import type { JdDraft } from '@/features/builder/interview';
import { demoAgents } from '@/mocks';
import { useDb, uid } from '@/store/db';
import type { AdvancedSettings } from '@/store/builder';
import { departmentByKey } from './departments';
import { sfx } from './sound';

/** Templates that map onto the scripted demo agents, so handoffs line up. */
const DEMO_BY_TEMPLATE: Record<string, keyof typeof demoAgents> = {
  'tpl-env': 'atlas',
  'tpl-stock': 'vega',
  'tpl-promo': 'pulse',
};

const COST_BY_DEPT: Record<string, number> = { operations: 4.2, sales: 4.6, 'customer-care': 7.2, finance: 3.8 };

function jdFromDraft(d: JdDraft, fallback?: JobDescription): JobDescription {
  return {
    title: d.title ?? fallback?.title ?? 'Assistant',
    department: d.department ?? fallback?.department ?? 'operations',
    mission: d.mission ?? fallback?.mission ?? '',
    responsibilities: d.responsibilities ?? fallback?.responsibilities ?? [],
    inputs: d.inputs ?? fallback?.inputs ?? [],
    outputs: d.outputs ?? fallback?.outputs ?? [],
    schedule: d.schedule ?? fallback?.schedule ?? 'Daily at 08:00',
    kpis: d.kpis ?? fallback?.kpis ?? [],
    canDecideAlone: d.canDecideAlone ?? fallback?.canDecideAlone ?? [],
    needsApproval: d.needsApproval ?? fallback?.needsApproval ?? [],
    spendingCapPerDay: d.spendingCapPerDay ?? fallback?.spendingCapPerDay ?? 0,
    escalation: d.escalation ?? fallback?.escalation ?? [],
  };
}

function connectorIdsFor(keys: string[]): string[] {
  const all = useDb.getState().connectors;
  return keys.map((k) => all.find((c) => c.key === k)?.id).filter((x): x is string => !!x);
}

/** Turns a finished interview draft into an Agent record. */
export function agentFromDraft(
  draft: JdDraft,
  opts: { templateId?: string; mode: Agent['mode']; advanced?: AdvancedSettings },
): Agent {
  const demoKey = opts.templateId ? DEMO_BY_TEMPLATE[opts.templateId] : draft.title === 'Environment Analyst' ? 'atlas' : undefined;
  const base = demoKey ? demoAgents[demoKey] : undefined;
  const jd = jdFromDraft(draft, base?.jd);
  const dept = departmentByKey(jd.department);
  const tools = opts.advanced ? Object.entries(opts.advanced.tools).filter(([, on]) => on).map(([t]) => t) : [];
  return {
    ...(base ?? {
      id: uid('agt'),
      status: 'working',
      trust: 'shadow',
      costPerDay: COST_BY_DEPT[jd.department] ?? 4,
      valuePerDay: 0,
      avatar: { kind: 'orb' },
      voice: { pitch: 1, rate: 1 },
      personality: { warmth: 55, verbosity: 40, boldness: 35 },
      kpis: [],
      handoffsTo: [],
      model: 'claude-sonnet-5-5',
      temperature: 0.3,
    }),
    name: draft.name ?? base?.name ?? 'Nova',
    role: jd.title,
    departmentId: dept?.id ?? 'dep-ops',
    mode: opts.mode,
    trust: 'shadow',
    hiredAt: new Date().toISOString(),
    jd,
    permissions: {
      spendingCapPerDay: jd.spendingCapPerDay,
      allowedActions: jd.canDecideAlone,
      blockedActions: jd.needsApproval,
    },
    connectorIds: connectorIdsFor(draft.connectorKeys ?? []),
    model: opts.advanced?.model ?? base?.model ?? 'claude-sonnet-5-5',
    temperature: opts.advanced?.temperature ?? base?.temperature ?? 0.3,
    systemPrompt: opts.advanced?.systemPrompt || undefined,
    ...(tools.length ? { tools } : {}),
  };
}

/** Writes a new hire to the mock DB, with an activity event and notification. */
export function commitHire(agent: Agent) {
  const db = useDb.getState();
  db.upsertAgent(agent);
  sfx('success');
  const dept = db.departments.find((d) => d.id === agent.departmentId);
  db.addEvent({
    agentId: agent.id,
    title: `${agent.name} joined ${dept?.name ?? 'the team'}`,
    detail: `Hired as ${agent.role}, starting in ${agent.trust === 'shadow' ? 'Shadow mode (recommends only)' : agent.trust} mode.`,
    severity: 'success',
  });
  db.notify({
    title: `${agent.name} is on the team`,
    body: `${agent.role} in ${dept?.name ?? 'your company'}.`,
    severity: 'success',
    href: `/agents/${agent.id}`,
  });
}

/** One-click hire from a marketplace template (no interview). */
export function hireTemplate(template: RoleTemplate): Agent {
  const demoKey = DEMO_BY_TEMPLATE[template.id];
  const draft: JdDraft = demoKey
    ? { ...demoAgents[demoKey].jd, name: demoAgents[demoKey].name, connectorKeys: template.requiredConnectors }
    : {
        title: template.title,
        department: template.department,
        mission: template.summary,
        responsibilities: [template.summary.replace(/\.$/, '')],
        inputs: [],
        outputs: ['Daily summary'],
        schedule: 'Daily at 08:00',
        kpis: template.kpis,
        canDecideAlone: ['Draft work for review'],
        needsApproval: ['Any action that changes the business'],
        spendingCapPerDay: 0,
        escalation: ['Anything unusual'],
        connectorKeys: template.requiredConnectors,
      };
  const agent = agentFromDraft(draft, { templateId: template.id, mode: 'company' });
  // Demo agents keep their scripted trust level; others start in Shadow.
  const hired = demoKey ? { ...agent, trust: demoAgents[demoKey].trust } : agent;
  commitHire(hired);
  return hired;
}

export function isHired(agentId: string) {
  return useDb.getState().agents.some((a) => a.id === agentId);
}

/** The agent already hired for a template's role, if any. */
export function useHiredFor(template: RoleTemplate) {
  return useDb((s) => s.agents.find((a) => a.role === template.title || a.jd.title === template.title));
}
