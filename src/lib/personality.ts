import type { Agent, Personality } from '@/types';

/**
 * Writes replies in an agent's voice from three sliders. Deterministic and
 * template-based: it shows how personality shapes tone, not real generation.
 */
export function styleReply(p: Personality, parts: { greeting?: boolean; core: string; detail: string; action: string }) {
  const friendly = p.warmth >= 60;
  const formal = p.warmth < 35;
  const detailed = p.verbosity >= 60;
  const brief = p.verbosity < 35;
  const bold = p.boldness >= 60;
  const cautious = p.boldness < 35;

  const open = parts.greeting ? (friendly ? 'Morning! ' : formal ? 'Good morning. ' : 'Hi. ') : '';
  const action = bold
    ? `I recommend we ${parts.action}.`
    : cautious
      ? `If you agree, we could ${parts.action}, but it is your call.`
      : `I suggest we ${parts.action}.`;
  const close = friendly && !brief ? ' Shout if you want the numbers behind it.' : '';
  const body = brief ? parts.core : detailed ? `${parts.core} ${parts.detail}` : parts.core;
  return `${open}${body} ${action}${close}`.replace(/\s+/g, ' ').trim();
}

export function sampleReply(p: Personality, name: string): string {
  return styleReply(p, {
    greeting: true,
    core: `${name} here. Saturday looks warm at 24°C, so drinks should sell about 40% above normal.`,
    detail: 'The last three warm weekends all beat forecast, and there is a farmers market on the square from 9am, which usually adds 15% footfall.',
    action: 'order 30% more cold drinks and add one person on the till from 11 to 4',
  });
}

/** Scripted answers for the "Talk to this agent" panel. */
export function agentAnswer(agent: Agent, question: string): string {
  const q = question.toLowerCase();
  const p = agent.personality;
  const k = agent.kpis[0];
  if (/hello|hi\b|hey|who are you|introduce/.test(q)) {
    return styleReply(p, {
      greeting: true,
      core: `I'm ${agent.name}, your ${agent.role}. ${agent.jd.mission}`,
      detail: `I work from ${agent.jd.inputs.join(', ') || 'your connected data'} and report ${agent.jd.schedule.toLowerCase()}.`,
      action: 'go through today together',
    });
  }
  if (/how.*(doing|going|perform)|kpi|result|track/.test(q)) {
    return styleReply(p, {
      core: k ? `${k.label} is at ${k.current} against a target of ${k.target}.` : 'I am new, so there is no track record yet.',
      detail: k ? `The trend over the last two weeks is ${(k.trend.at(-1) ?? 0) >= (k.trend[0] ?? 0) === (k.direction === 'up-good') ? 'improving' : 'slipping'}.` : 'You will see my first numbers after a week in Shadow mode.',
      action: 'review my monthly report together at the end of the month',
    });
  }
  if (/today|plan|doing now|working on/.test(q)) {
    return styleReply(p, {
      core: `Today I'm focused on: ${agent.jd.responsibilities[0]?.toLowerCase() ?? 'my core job'}.`,
      detail: agent.jd.responsibilities[1] ? `After that: ${agent.jd.responsibilities[1].toLowerCase()}.` : '',
      action: 'flag anything unusual straight to you',
    });
  }
  if (/allowed|permission|can you|limit|approve/.test(q)) {
    return styleReply(p, {
      core: `On my own I can: ${agent.jd.canDecideAlone.join(', ').toLowerCase() || 'only make recommendations'}.`,
      detail: `I always ask before: ${agent.jd.needsApproval.join(', ').toLowerCase()}. My spending cap is £${agent.permissions.spendingCapPerDay} a day.`,
      action: 'keep it that way until my track record earns more',
    });
  }
  if (/weather|rain|sun|hot|cold|weekend/.test(q)) {
    return styleReply(p, {
      core: 'Saturday looks warm and dry, around 24°C. Sunday turns wet from mid-afternoon.',
      detail: 'Warm Saturdays have lifted drinks and ice cream by 41% on average this summer; wet Sundays drop footfall by about 12%.',
      action: 'stock up on cold drinks for Saturday and run lean on Sunday afternoon',
    });
  }
  return styleReply(p, {
    core: `Good question. As your ${agent.role.toLowerCase()} I'd look at ${agent.jd.inputs[0] ?? 'your sales data'} first.`,
    detail: 'I can give you a fuller answer in tomorrow\'s briefing once I have checked the latest numbers.',
    action: 'add it to tomorrow\'s briefing',
  });
}
