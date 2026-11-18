import type { Agent } from '@/types';
import { ALL_NAV } from '@/app/nav';

const tone = (agent: Agent) => {
  const p = agent.personality;
  return [
    p.warmth >= 60 ? 'warm and friendly' : p.warmth < 35 ? 'formal and polite' : 'professional but approachable',
    p.verbosity >= 60 ? 'give a little supporting detail' : 'keep replies to two or three sentences',
    p.boldness >= 60 ? 'make clear recommendations' : p.boldness < 35 ? 'be cautious and leave decisions to the owner' : 'suggest, but do not push',
  ].join('; ');
};

/** System prompt for chatting with an agent. Uses the agent's own prompt when the owner wrote one. */
export function agentSystemPrompt(agent: Agent): string {
  const { jd } = agent;
  const kpis = agent.kpis.map((k) => `${k.label}: ${k.current} (target ${k.target})`).join('; ');
  return [
    agent.systemPrompt?.trim() || `You are ${agent.name}, the ${agent.role} at Nova Mart, a small UK convenience shop. ${jd.mission}`,
    jd.responsibilities.length ? `Responsibilities: ${jd.responsibilities.join('; ')}.` : '',
    jd.inputs.length ? `Data you can read: ${jd.inputs.join(', ')}.` : '',
    jd.canDecideAlone.length ? `You may do alone: ${jd.canDecideAlone.join('; ')}.` : '',
    jd.needsApproval.length ? `Always ask the owner before: ${jd.needsApproval.join('; ')}.` : '',
    `Spending cap: £${agent.permissions.spendingCapPerDay} per day. You report ${jd.schedule.toLowerCase()}.`,
    kpis ? `Your current numbers: ${kpis}.` : '',
    `Style: ${tone(agent)}.`,
    'You are talking to the shop owner in a chat window that may read your reply aloud. Use plain sentences: no markdown, lists or headings. Use only the numbers given here; if you do not have a figure, say so instead of inventing one.',
  ]
    .filter(Boolean)
    .join('\n');
}

/** System prompt for Core, the in-app guide. */
export function coreSystemPrompt(): string {
  const screens = ALL_NAV.map((n) => `- ${n.label} (${n.to}): ${n.description}`).join('\n');
  return [
    'You are Core, the built-in guide to AgentForge, an app where a small business owner builds and manages a team of AI agents.',
    'Help the owner find where things are and explain features briefly. Answer in at most three short sentences, in plain text without markdown.',
    'The screens are:',
    screens,
    'Other useful facts: Ctrl+K (Cmd+K on Mac) opens search. Approvals can be approved with A and rejected with R. Settings > Demo controls resets the demo. Settings > AI model chooses the local model.',
    'If you do not know, say so and suggest the closest screen. Never invent screens or features.',
  ].join('\n');
}
