import { describe, expect, it } from 'vitest';
import type { Project } from '@/types';
import { seedProjects } from '@/mocks/portfolio';
import { buildRunScript, openFindings, outcomeSentence, statusAfterRun } from './portfolio';

const get = (id: string) => seedProjects().find((p) => p.id === id)!;

describe('portfolio story', () => {
  it('reports open problems in the lead agent’s words', () => {
    const p = get('retail-inv-recon');
    expect(p.status).toBe('issue');
    expect(outcomeSentence(p)).toMatch(/^James found 2 inventory problems/);
  });

  it('says "no problems" once every finding is handled', () => {
    const p = get('retail-inv-recon');
    const done: Project = { ...p, findings: p.findings.map((f) => ({ ...f, status: 'approved' })) };
    expect(statusAfterRun(done)).toBe('live');
    expect(outcomeSentence(done)).toBe("James's team resolved 2 issues. There are no open inventory problems.");
  });

  it('a clean live project confirms there are no problems', () => {
    expect(outcomeSentence(get('retail-demand'))).toBe('Atlas discussed with the team and confirmed there are no forecast risks.');
  });

  it('info-only findings do not mark a project as an issue', () => {
    const p = get('banking-recon');
    const onlyInfo: Project = { ...p, findings: p.findings.map((f) => (f.severity === 'info' ? f : { ...f, status: 'approved' })) };
    expect(openFindings(onlyInfo)).toHaveLength(1);
    expect(statusAfterRun(onlyInfo)).toBe('live');
  });

  it('the run script raises every open finding and includes hired agents', () => {
    const p = get('retail-inv-recon');
    const hired: Project = {
      ...p,
      team: [...p.team, { id: 'x', name: 'Vendor Liaison', role: 'Vendor Liaison', kind: 'specialist', parentId: p.team[0]!.id, status: 'working', responsibility: 'Chases suppliers.', integrations: [], departmentId: 'dep-ops' }],
    };
    const steps = buildRunScript(hired);
    expect(steps.filter((s) => s.kind === 'alert')).toHaveLength(2);
    expect(steps.some((s) => s.agentId === 'x')).toBe(true);
    expect(steps[0]?.agentId).toBe(p.team[0]!.id);
  });

  it('seeds a finished run only for projects that are working', () => {
    for (const p of seedProjects()) {
      expect(p.runs.length > 0).toBe(p.status === 'live' || p.status === 'issue');
    }
  });
});
