/**
 * Data access layer. Every screen reads through these functions, never from
 * fixtures directly. Each returns a Promise so swapping to real HTTP calls
 * later does not change any component.
 */
import type {
  ActivityEvent,
  Agent,
  ApprovalRequest,
  Business,
  Connector,
  CostPoint,
  DailyMetric,
  Department,
  Device,
  ID,
  Owner,
  ReviewReport,
  RoleTemplate,
  Trace,
} from '@/types';
import {
  businesses,
  costSeries,
  dailyMetrics,
  departments,
  owner,
  reviews,
  roleTemplates,
  traces,
} from '@/mocks';
import { useDb } from '@/store/db';
import { ApiError, simulate, type SimulateOptions } from './client';

const db = () => useDb.getState();

const found = <T>(value: T | undefined, what: string): T => {
  if (value === undefined) throw new ApiError(`${what} not found`, 'not-found');
  return value;
};

export const api = {
  // Company
  getOwner: (o?: SimulateOptions) => simulate<Owner>(() => owner, o),
  getBusinesses: (o?: SimulateOptions) => simulate<Business[]>(() => businesses, o),
  getDepartments: (o?: SimulateOptions) => simulate<Department[]>(() => departments, o),

  // Agents
  listAgents: (o?: SimulateOptions) => simulate<Agent[]>(() => db().agents, o),
  getAgent: (id: ID, o?: SimulateOptions) =>
    simulate<Agent>(() => found(db().agents.find((a) => a.id === id), 'Agent'), o),
  getReviews: (agentId: ID, o?: SimulateOptions) =>
    simulate<ReviewReport[]>(() => reviews.filter((r) => r.agentId === agentId), o),

  // Data sources
  listConnectors: (o?: SimulateOptions) => simulate<Connector[]>(() => db().connectors, o),
  getDailyMetrics: (o?: SimulateOptions) => simulate<DailyMetric[]>(() => dailyMetrics, o),

  // Observability
  listEvents: (o?: SimulateOptions) => simulate<ActivityEvent[]>(() => db().events, o),
  listApprovals: (o?: SimulateOptions) => simulate<ApprovalRequest[]>(() => db().approvals, o),
  getTrace: (id: ID, o?: SimulateOptions) =>
    simulate<Trace>(() => found(traces.find((t) => t.id === id), 'Trace'), o),
  listTraces: (o?: SimulateOptions) => simulate<Trace[]>(() => traces, o),
  getCostSeries: (o?: SimulateOptions) => simulate<CostPoint[]>(() => costSeries, o),

  // Marketplace and deployment
  listTemplates: (o?: SimulateOptions) => simulate<RoleTemplate[]>(() => roleTemplates, o),
  listDevices: (o?: SimulateOptions) => simulate<Device[]>(() => db().devices, o),

  // Writes (reliable: the demo script must not randomly fail mid-story)
  resolveApproval: (id: ID, status: 'approved' | 'rejected') =>
    simulate(() => {
      db().resolveApproval(id, status);
      return true;
    }, { reliable: true }),
  connect: (connectorId: ID) =>
    simulate(() => {
      db().setConnectorStatus(connectorId, 'connected');
      return found(db().connectors.find((c) => c.id === connectorId), 'Connector');
    }, { reliable: true }),
  disconnect: (connectorId: ID) =>
    simulate(() => {
      db().setConnectorStatus(connectorId, 'not-connected');
      return true;
    }, { reliable: true }),
};

export { ApiError } from './client';
