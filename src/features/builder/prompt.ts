import type { JdDraft } from './interview';

/** Generates a starting system prompt from the JD so power users edit rather than start blank. */
export function systemPromptFromDraft(d: JdDraft): string {
  const lines = [
    `You are ${d.name ?? 'an AI agent'}, the ${d.title ?? 'assistant'} at Nova Mart.`,
    d.mission ? `Mission: ${d.mission}` : '',
    d.responsibilities?.length ? `Responsibilities:\n${d.responsibilities.map((r) => `- ${r}`).join('\n')}` : '',
    d.inputs?.length ? `Data you may read: ${d.inputs.join(', ')}.` : '',
    d.canDecideAlone?.length ? `You may do alone: ${d.canDecideAlone.join('; ')}.` : '',
    d.needsApproval?.length ? `Always ask the owner before: ${d.needsApproval.join('; ')}.` : '',
    `Spending cap: £${d.spendingCapPerDay ?? 0} per day.`,
    d.escalation?.length ? `Escalate immediately when: ${d.escalation.join('; ')}.` : '',
    'Explain every recommendation in plain language a shop owner understands. Say when data is missing instead of guessing.',
  ];
  return lines.filter(Boolean).join('\n\n');
}
