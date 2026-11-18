import { AgentNode, DepartmentNode, OwnerNode } from './nodes';

/** Stable object so React Flow does not re-register node types each render. */
export const nodeTypes = { owner: OwnerNode, department: DepartmentNode, agent: AgentNode };
