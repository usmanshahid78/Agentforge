import type { Project, ProjectAgent, ProjectStatus, RunLogEntry } from '@/types';
import type { BadgeTone } from '@/components/ui/badge';
import { createRng } from '@/mocks/random';

/** One status vocabulary for tiles, org chart and canvas: green live, amber configuring, red issue. */
export const STATUS_META: Record<ProjectStatus, { label: string; tone: BadgeTone; dot: string; ring: string }> = {
  'not-started': { label: 'Not started', tone: 'neutral', dot: 'bg-fg-subtle', ring: 'border-line/10' },
  configuring: { label: 'Configuring', tone: 'warning', dot: 'bg-warning', ring: 'border-warning/40' },
  live: { label: 'Live', tone: 'success', dot: 'bg-success', ring: 'border-success/40' },
  issue: { label: 'Issue', tone: 'danger', dot: 'bg-danger', ring: 'border-danger/50' },
};

export const leadOf = (p: Project): ProjectAgent | undefined => p.team.find((a) => a.kind === 'lead');

export const openFindings = (p: Project) => p.findings.filter((f) => f.status === 'open');

/** Status implied by the findings once a project has run at least once. */
export function statusAfterRun(p: Project): ProjectStatus {
  return openFindings(p).some((f) => f.severity !== 'info') ? 'issue' : 'live';
}

/** The sentence the canvas leads with. Written as the lead agent reporting back. */
export function outcomeSentence(p: Project): string {
  const lead = leadOf(p)?.name ?? 'The team';
  if (p.status === 'not-started') return `Hire ${lead} to start working on ${p.name.toLowerCase()}.`;
  if (p.runs.length === 0) return `${lead} is set up. Run the team once to get the first result.`;
  const open = openFindings(p);
  if (open.length > 0) return p.outcome;
  const fixed = p.findings.filter((f) => f.status !== 'open').length;
  return fixed > 0
    ? `${lead}'s team resolved ${fixed} issue${fixed === 1 ? '' : 's'}. There are no open ${p.subject}.`
    : `${lead} discussed with the team and confirmed there are no ${p.subject}.`;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

export type RunStep = Omit<RunLogEntry, 'id' | 'at'>;

/**
 * The scripted conversation of one run: lead briefs the team, specialists
 * pull data and analyse, every open finding is raised, the lead reports back.
 * Built from the project, so hired agents and changed parameters show up.
 */
export function buildRunScript(p: Project): RunStep[] {
  const rng = createRng(hash(p.id) + p.runs.length);
  const lead = leadOf(p);
  if (!lead) return [];
  const assistant = p.team.find((a) => a.kind === 'assistant');
  const specialists = p.team.filter((a) => a.kind === 'specialist');
  const [collector, analyst] = [specialists[0] ?? lead, specialists[1] ?? specialists[0] ?? lead];
  const extras = specialists.slice(2);
  const [i0, i1] = [p.integrations[0]?.name ?? 'source system', p.integrations[1]?.name];
  const scope = p.params[0];
  const threshold = p.params[1];
  const records = rng.int(4_000, 48_000);
  const open = openFindings(p);

  const steps: RunStep[] = [];
  if (assistant) {
    steps.push({ agentId: lead.id, toAgentId: assistant.id, kind: 'message', text: `Starting the ${p.short} run.${scope ? ` Scope: ${scope.value}.` : ''}` });
    steps.push({ agentId: assistant.id, kind: 'tool', tool: 'scheduler', text: `Run window locked. ${specialists.length} specialist${specialists.length === 1 ? '' : 's'} notified.` });
  }
  steps.push({ agentId: lead.id, toAgentId: collector.id, kind: 'message', text: `Pull fresh data from ${i0}${i1 ? ` and ${i1}` : ''}, please.` });
  steps.push({ agentId: collector.id, kind: 'tool', tool: i0, text: `Pulled ${records.toLocaleString()} records from ${i0}.` });
  if (i1) steps.push({ agentId: collector.id, kind: 'tool', tool: i1, text: `Pulled ${Math.round(records * rng.range(0.92, 1.04)).toLocaleString()} records from ${i1}.` });
  steps.push({ agentId: collector.id, toAgentId: analyst.id, kind: 'message', text: 'Data is normalised and matched on IDs. Over to you.' });
  steps.push({
    agentId: analyst.id,
    kind: 'tool',
    tool: 'analysis',
    text: threshold ? `Checking everything against ${threshold.label.toLowerCase()} (${threshold.value}).` : 'Running checks.',
  });
  for (const f of open) steps.push({ agentId: analyst.id, kind: 'alert', text: `${f.title}. ${f.detail}` });
  steps.push({
    agentId: analyst.id,
    toAgentId: lead.id,
    kind: 'message',
    text: open.length ? `${open.length} exception${open.length === 1 ? '' : 's'} found. I've drafted a fix for each.` : 'Everything matches. No exceptions.',
  });
  for (const x of extras) {
    steps.push({ agentId: lead.id, toAgentId: x.id, kind: 'message', text: `Can you cover your part? ${x.responsibility}` });
    steps.push({ agentId: x.id, kind: 'result', text: `Done. ${x.role} checks complete, nothing blocking.` });
  }
  return steps;
}
