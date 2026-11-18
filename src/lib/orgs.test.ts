import { describe, expect, it } from 'vitest';
import { seedOrganizations } from '@/mocks/organizations';
import { createOrganization, readDescription } from './orgs';
import { complianceChecks, marketFor, monthlyReturns, periodRange, portfolioStats, recommendationsFor } from './investing';

const thor = () => seedOrganizations().find((o) => o.id === 'org-thor')!;

describe('reading a description', () => {
  it('finds the head, the agents and what was asked for', () => {
    const org = thor();
    expect(org.kind).toBe('investment');
    expect(org.name).toBe('Thor Portfolio Management');
    expect(org.members[0]).toMatchObject({ name: 'Thor', role: 'CEO', kind: 'head' });
    expect(org.members.slice(1).map((m) => m.role)).toEqual(['Investment Manager', 'Fund Manager', 'Trader', 'Auditor']);
    expect(org.periods).toEqual(['ITD', 'YTD', 'MTD', 'MoM']);
    expect(org.requirements).toContain('Contribution of every stock to the portfolio return');
    expect(org.requirements).toContain('Every suggestion checked against regulation and compliance rules');
    expect(org.mission).toMatch(/^Actively invest in different portfolios/);
  });

  it('reads every seed into its own industry with a team', () => {
    const kinds = Object.fromEntries(seedOrganizations().map((o) => [o.id, o.kind]));
    expect(kinds).toEqual({ 'org-thor': 'investment', 'org-freya': 'investment', 'org-lena': 'retail', 'org-patel': 'healthcare', 'org-marco': 'logistics' });
    for (const o of seedOrganizations()) expect(o.members.length).toBeGreaterThan(2);
  });

  it('falls back to default roles when no team is described', () => {
    const draft = readDescription('I run a small bakery and want help with orders.');
    expect(draft.agents.length).toBeGreaterThan(0);
    expect(draft.head.name).toBe('Owner');
  });

  it('lets auditors oversee every other agent', () => {
    const org = createOrganization(readDescription('Ana is the CEO of a fund. Under her there is a trader and an auditor.'), { description: 'x', createdBy: 'me', readBy: 'rules' });
    const auditor = org.members.find((m) => m.role === 'Auditor')!;
    expect(auditor.talksTo).toEqual([org.members.find((m) => m.role === 'Trader')!.id]);
  });
});

describe('portfolio maths', () => {
  const org = thor();
  const book = marketFor(org, new Date('2026-10-30T12:00:00'));

  it('stock contributions add up to the portfolio return in every period', () => {
    for (const p of book.portfolios) {
      for (const period of ['ITD', 'YTD', 'MTD', 'MoM'] as const) {
        const s = portfolioStats(book, p, period);
        const sum = s.stocks.reduce((a, x) => a + x.contribution, 0);
        expect(sum).toBeCloseTo(s.returns[period].portfolio, 10);
      }
    }
  });

  it('measures MTD from the last close of the previous month', () => {
    const [a] = periodRange(book, 'MTD');
    expect(book.days[a]!.slice(0, 7)).toBe('2026-09');
    expect(book.days[a + 1]!.slice(0, 7)).toBe('2026-10');
  });

  it('chains monthly returns into the inception-to-date return', () => {
    const p = book.portfolios[0]!;
    const chained = monthlyReturns(book, p).reduce((acc, m) => acc * (1 + m.portfolio), 1) - 1;
    expect(chained).toBeCloseTo(portfolioStats(book, p).returns.ITD.portfolio, 10);
  });

  it('flags a stock above 10% as a breach', () => {
    const checks = complianceChecks([{ ticker: 'A', sector: 'X', weight: 0.12 }, { ticker: 'B', sector: 'Y', weight: 0.05 }], 0.05);
    expect(checks.find((c) => c.id === 'stock')!.status).toBe('breach');
  });

  it('proposed trades never leave a stock above 10% or cash below 2%', () => {
    for (const p of book.portfolios) {
      const { orders, postChecks } = recommendationsFor(org, book, portfolioStats(book, p));
      for (const o of orders) expect(o.weightAfter).toBeLessThanOrEqual(0.1);
      expect(postChecks.find((c) => c.id === 'stock')!.status).not.toBe('breach');
      expect(postChecks.find((c) => c.id === 'cash')!.status).not.toBe('breach');
    }
  });

  it('every agent gives at least one recommendation', () => {
    const { recs } = recommendationsFor(org, book, portfolioStats(book, book.portfolios[0]!));
    expect(new Set(recs.map((r) => r.role))).toEqual(new Set(['Investment Manager', 'Fund Manager', 'Trader', 'Auditor']));
  });
});
