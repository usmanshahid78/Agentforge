import type { Edge, Node } from '@xyflow/react';
import type { Agent, Department, ID } from '@/types';

export const AGENT_W = 216;
export const AGENT_H = 72;
const GAP = 14;
const PAD = 18;
const HEADER = 58;
const DEPT_GAP = 48;
const DEPT_Y = 190;

export type OwnerNodeData = { name: string; initials: string; business: string };
export type DeptNodeData = { department: Department; count: number };
export type AgentNodeData = { agent: Agent };

export type OrgNode = Node<OwnerNodeData, 'owner'> | Node<DeptNodeData, 'department'> | Node<AgentNodeData, 'agent'>;

const HANDOFF_LABEL: Record<string, string> = {
  'agt-atlas>agt-vega': 'demand forecast',
  'agt-atlas>agt-pulse': 'event calendar',
  'agt-lyra>agt-quill': 'price drops',
  'agt-echo>agt-ledger': 'refunds',
  'agt-pulse>agt-quill': 'promo briefs',
};

/**
 * Builds React Flow nodes and edges: owner on top, departments as containers,
 * agents in a two-column grid inside each. Saved positions override the
 * automatic layout so drags persist.
 */
export function buildGraph(
  owner: OwnerNodeData,
  departments: Department[],
  agents: Agent[],
  saved: Record<ID, { x: number; y: number }>,
): { nodes: OrgNode[]; edges: Edge[] } {
  const nodes: OrgNode[] = [];
  const edges: Edge[] = [];

  const sizes = departments.map((d) => {
    const n = agents.filter((a) => a.departmentId === d.id).length;
    const cols = n > 1 ? 2 : 1;
    const rows = Math.max(1, Math.ceil(n / cols));
    return {
      width: PAD * 2 + cols * AGENT_W + (cols - 1) * GAP,
      height: HEADER + rows * (AGENT_H + GAP) - GAP + PAD + (n === 0 ? 10 : 0),
    };
  });
  const totalW = sizes.reduce((s, z) => s + z.width, 0) + DEPT_GAP * (departments.length - 1);

  nodes.push({
    id: 'owner',
    type: 'owner',
    position: saved.owner ?? { x: totalW / 2 - 130, y: 0 },
    data: owner,
  });

  let x = 0;
  departments.forEach((d, i) => {
    const size = sizes[i] ?? { width: 300, height: 140 };
    // Agents that hand work to colleagues go first, so in-department handoff edges run left to right.
    const deptAgents = agents
      .filter((a) => a.departmentId === d.id)
      .sort((a, b) => b.handoffsTo.length - a.handoffsTo.length || a.hiredAt.localeCompare(b.hiredAt));
    nodes.push({
      id: d.id,
      type: 'department',
      position: saved[d.id] ?? { x, y: DEPT_Y },
      data: { department: d, count: deptAgents.length },
      style: { width: size.width, height: size.height },
    });
    edges.push({ id: `owner-${d.id}`, source: 'owner', target: d.id, type: 'smoothstep', className: 'org-edge-owner' });
    const cols = deptAgents.length > 1 ? 2 : 1;
    deptAgents.forEach((a, j) => {
      nodes.push({
        id: a.id,
        type: 'agent',
        parentId: d.id,
        extent: 'parent',
        position: saved[a.id] ?? { x: PAD + (j % cols) * (AGENT_W + GAP), y: HEADER + Math.floor(j / cols) * (AGENT_H + GAP) },
        data: { agent: a },
        style: { width: AGENT_W, height: AGENT_H },
      });
    });
    x += size.width + DEPT_GAP;
  });

  const ids = new Set(agents.map((a) => a.id));
  for (const a of agents) {
    for (const t of a.handoffsTo) {
      if (!ids.has(t)) continue;
      const target = agents.find((x) => x.id === t);
      const active = a.status === 'working' && target?.status === 'working';
      edges.push({
        id: `h-${a.id}-${t}`,
        source: a.id,
        target: t,
        sourceHandle: 'out',
        targetHandle: 'in',
        type: 'default',
        animated: active,
        label: HANDOFF_LABEL[`${a.id}>${t}`] ?? 'handoff',
        className: active ? 'org-edge-handoff active' : 'org-edge-handoff',
        zIndex: 10,
      });
    }
  }
  return { nodes, edges };
}
