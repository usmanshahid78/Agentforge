import { describe, expect, it } from 'vitest';
import {
  completeness,
  currentStep,
  genericScript,
  interviewReducer,
  matchChoices,
  retailWeatherScript,
  startInterview,
  type InterviewEvent,
} from './interview';
import { roleTemplates } from '@/mocks/catalog';

const script = retailWeatherScript();
const run = (events: InterviewEvent[]) =>
  events.reduce((s, e) => interviewReducer(script, s, e), startInterview(script));

const HAPPY: InterviewEvent[] = [
  { type: 'ANSWER', choiceIds: ['groceries', 'clothing'] },
  { type: 'ANSWER', choiceIds: ['staffing', 'ordering'] },
  { type: 'ANSWER', choiceIds: ['daily'] },
  { type: 'ANSWER', choiceIds: ['pos', 'weather', 'events'] },
  { type: 'ANSWER', choiceIds: ['recommend'] },
  { type: 'ANSWER', choiceIds: ['accuracy', 'stockouts'] },
  { type: 'ANSWER', choiceIds: ['atlas'] },
];

describe('interview state machine', () => {
  it('starts with the intro and first question', () => {
    const s = startInterview(script);
    expect(s.messages).toHaveLength(1);
    expect(s.messages[0]?.text).toContain('Which products matter most');
    expect(currentStep(script, s)?.id).toBe('products');
  });

  it('walks the Nova Mart script to a complete Environment Analyst JD named Atlas', () => {
    const s = run(HAPPY);
    expect(s.status).toBe('complete');
    expect(s.draft.title).toBe('Environment Analyst');
    expect(s.draft.department).toBe('operations');
    expect(s.draft.name).toBe('Atlas');
    expect(s.draft.connectorKeys).toEqual(['pos', 'weather', 'events']);
    expect(s.draft.schedule).toMatch(/Daily at 08:00/);
    expect(s.draft.spendingCapPerDay).toBe(0);
    expect(completeness(s.draft)).toBe(100);
    expect(currentStep(script, s)).toBeUndefined();
  });

  it('"I\'m not sure" asks a clarifying follow-up without advancing', () => {
    const s = run([{ type: 'UNSURE' }]);
    expect(s.status).toBe('clarifying');
    expect(s.stepIndex).toBe(0);
    expect(s.messages.at(-1)?.from).toBe('ai');
    expect(s.messages.at(-1)?.text).toMatch(/groceries/i);
    const next = interviewReducer(script, s, { type: 'ANSWER', choiceIds: ['groceries'] });
    expect(next.status).toBe('asking');
    expect(next.stepIndex).toBe(1);
  });

  it('matches free text to choices by keyword', () => {
    const step = script.steps[1]!;
    expect(matchChoices(step, 'mostly the rota and reorders')).toEqual(['staffing', 'ordering']);
    const s = run([{ type: 'TEXT', text: 'Food and clothes' }]);
    expect(s.answers.products).toEqual(['groceries', 'clothing']);
  });

  it('accepts unmatched free text as a custom answer', () => {
    const s = run([...HAPPY.slice(0, 6), { type: 'TEXT', text: 'Zephyr' }]);
    expect(s.draft.name).toBe('Zephyr');
  });

  it('ignores empty answers and events after completion', () => {
    const s0 = startInterview(script);
    expect(interviewReducer(script, s0, { type: 'TEXT', text: '   ' })).toBe(s0);
    expect(interviewReducer(script, s0, { type: 'ANSWER', choiceIds: [] })).toBe(s0);
    const done = run(HAPPY);
    expect(interviewReducer(script, done, { type: 'UNSURE' })).toBe(done);
  });

  it('completeness grows monotonically through the happy path', () => {
    let s = startInterview(script);
    let prev = completeness(s.draft);
    for (const e of HAPPY) {
      s = interviewReducer(script, s, e);
      const c = completeness(s.draft);
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
  });

  it('builds a template script with the template KPIs', () => {
    const tpl = roleTemplates.find((t) => t.id === 'tpl-stock')!;
    const g = genericScript({ template: tpl });
    let s = startInterview(g);
    for (const st of g.steps) s = interviewReducer(g, s, { type: 'ANSWER', choiceIds: [st.choices[0]!.id] });
    expect(s.status).toBe('complete');
    expect(s.draft.title).toBe('Inventory Planner');
    expect(s.draft.name).toBe('Vega');
    expect(s.draft.kpis).toEqual(['Stockouts']);
  });
});
