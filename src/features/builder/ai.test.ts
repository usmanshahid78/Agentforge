import { describe, expect, it } from 'vitest';
import { sanitizeFraming, sanitizeRefinement } from './ai';

describe('sanitizeFraming', () => {
  it('keeps valid fields and drops unknown connectors', () => {
    const f = sanitizeFraming({
      intro: 'You want a team that spots public demand.',
      title: 'Demand Researcher',
      department: 'sales',
      mission: 'Find what the public needs and turn it into IT projects.',
      responsibilities: ['Track demand signals', 'Track demand signals', 'Draft project briefs'],
      connectorKeys: ['analytics', 'twitter', 'email'],
      kpis: ['Projects launched'],
      names: ['scout the explorer', '!', 'Echo'],
    });
    expect(f?.connectorKeys).toEqual(['analytics', 'email']);
    expect(f?.responsibilities).toEqual(['Track demand signals', 'Draft project briefs']);
    expect(f?.names).toEqual(['Scout', 'Echo']);
    expect(f?.department).toBe('sales');
  });

  it('rejects framing without a title or mission', () => {
    expect(sanitizeFraming({ title: '', mission: 'x' })).toBeUndefined();
    expect(sanitizeFraming(null)).toBeUndefined();
  });

  it('falls back when lists are empty or the department is unknown', () => {
    const f = sanitizeFraming({ title: 'Helper', mission: 'Help.', department: 'space', connectorKeys: [], kpis: [], names: [] });
    expect(f?.department).toBe('operations');
    expect(f?.connectorKeys.length).toBeGreaterThan(0);
    expect(f?.names.length).toBe(3);
  });
});

describe('sanitizeRefinement', () => {
  const draft = { mission: 'Old mission.', responsibilities: ['A'], outputs: ['Daily briefing'] };
  const step = { multi: false, choices: [{ id: 'daily', label: 'Daily' }, { id: 'weekly', label: 'Weekly' }] };
  const empty = { mission: '', responsibilities: [], outputs: [], choiceIds: [] };

  it('strips a trailing question from the acknowledgement', () => {
    expect(sanitizeRefinement({ ...empty, ack: 'Got it, weekly reports. Anything else?' }, draft, step)?.ack).toBe('Got it, weekly reports.');
  });

  it('keeps only known choices, and one for single-choice steps', () => {
    const r = sanitizeRefinement({ ...empty, ack: 'Weekly.', choiceIds: ['monthly', 'weekly', 'daily'] }, draft, step);
    expect(r?.choiceIds).toEqual(['weekly']);
  });

  it('keeps the previous draft when the model returns empty fields', () => {
    const r = sanitizeRefinement({ ...empty, ack: 'Noted.' }, draft, step);
    expect(r?.patch).toEqual({ mission: 'Old mission.', responsibilities: ['A'], extraOutputs: [] });
  });

  it('returns undefined without an acknowledgement', () => {
    expect(sanitizeRefinement({ ack: '' }, draft, step)).toBeUndefined();
  });
});
