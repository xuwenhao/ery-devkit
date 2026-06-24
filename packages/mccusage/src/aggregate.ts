import type {
  Agent,
  AgentBreakdown,
  AggregateReport,
  CollectionResult,
  PeriodBreakdown,
  PeriodTotals,
  TokenTotals,
  View
} from "./types.js";

const TOKEN_FIELDS = [
  "inputTokens",
  "outputTokens",
  "cacheCreationTokens",
  "cacheReadTokens",
  "reasoningOutputTokens",
  "totalTokens"
] as const;

const ZERO_TOTALS: TokenTotals = {
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,
  reasoningOutputTokens: 0,
  totalTokens: 0
};

export function aggregateResults(input: { view: View; results: CollectionResult[] }): AggregateReport {
  const totals = emptyTotals();
  const byAgent: Record<Agent, TokenTotals> = {
    claude: emptyTotals(),
    codex: emptyTotals()
  };
  const byTarget: Record<string, TokenTotals> = {};
  const periods = new Map<string, PeriodTotals>();
  const breakdowns = new Map<string, PeriodBreakdown>();
  const failures = [];

  for (const result of input.results) {
    if (!result.ok) {
      failures.push({
        target: result.target,
        agent: result.agent,
        error: result.error ?? "unknown error"
      });
      continue;
    }

    const rows = rowsForView(result.data, input.view);
    for (const row of rows) {
      const rowTotals = totalsFromObject(row);
      addTotals(totals, rowTotals);
      addTotals(byAgent[result.agent], rowTotals);
      byTarget[result.target] ??= emptyTotals();
      addTotals(byTarget[result.target], rowTotals);

      const period = periodKey(row, input.view);
      const existing = periods.get(period) ?? { period, ...emptyTotals() };
      addTotals(existing, rowTotals);
      periods.set(period, existing);

      const periodBreakdown = breakdowns.get(period) ?? {
        period,
        totals: emptyTotals(),
        agents: []
      };
      addTotals(periodBreakdown.totals, rowTotals);
      const agentBreakdown = ensureAgentBreakdown(periodBreakdown, result.agent);
      addTotals(agentBreakdown.totals, rowTotals);
      mergeModels(agentBreakdown.models, modelNamesFromRow(row, result.agent));
      breakdowns.set(period, periodBreakdown);
    }
  }

  const sortedBreakdowns = Array.from(breakdowns.values())
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((breakdown) => ({
      ...breakdown,
      agents: breakdown.agents.sort((a, b) => agentSort(a.agent) - agentSort(b.agent))
    }));

  return {
    totals,
    periods: Array.from(periods.values()).sort((a, b) => a.period.localeCompare(b.period)),
    byAgent,
    byTarget,
    breakdowns: sortedBreakdowns,
    failures
  };
}

export function emptyTotals(): TokenTotals {
  return { ...ZERO_TOTALS };
}

function addTotals(target: TokenTotals, source: TokenTotals): void {
  for (const field of TOKEN_FIELDS) {
    target[field] += source[field];
  }
  if (source.costUSD != null) {
    target.costUSD = (target.costUSD ?? 0) + source.costUSD;
  }
}

function totalsFromObject(value: unknown): TokenTotals {
  const source = isRecord(value) ? value : {};
  const totals = emptyTotals();
  for (const field of TOKEN_FIELDS) {
    const raw = source[field];
    totals[field] = typeof raw === "number" ? raw : 0;
  }
  const cost = source.totalCost ?? source.costUSD ?? source.cost;
  if (typeof cost === "number") {
    totals.costUSD = cost;
  }
  return totals;
}

function ensureAgentBreakdown(period: PeriodBreakdown, agent: Agent): AgentBreakdown {
  const existing = period.agents.find((candidate) => candidate.agent === agent);
  if (existing) {
    return existing;
  }
  const created: AgentBreakdown = { agent, models: [], totals: emptyTotals() };
  period.agents.push(created);
  return created;
}

function mergeModels(target: string[], models: string[]): void {
  const seen = new Set(target);
  for (const model of models) {
    if (!seen.has(model)) {
      target.push(model);
      seen.add(model);
    }
  }
  target.sort();
}

function modelNamesFromRow(row: unknown, agent: Agent): string[] {
  if (!isRecord(row)) {
    return [];
  }
  if (agent === "claude") {
    const modelBreakdowns = row.modelBreakdowns;
    if (Array.isArray(modelBreakdowns)) {
      return modelBreakdowns
        .map((entry) => (isRecord(entry) && typeof entry.modelName === "string" ? entry.modelName : undefined))
        .filter((value): value is string => value != null);
    }
    const modelsUsed = row.modelsUsed;
    return Array.isArray(modelsUsed) ? modelsUsed.filter((value): value is string => typeof value === "string") : [];
  }

  const models = row.models;
  return isRecord(models) ? Object.keys(models).sort() : [];
}

function agentSort(agent: Agent): number {
  return agent === "claude" ? 0 : 1;
}

function rowsForView(data: unknown, view: View): unknown[] {
  if (!isRecord(data)) {
    return [];
  }
  const rows = data[view];
  return Array.isArray(rows) ? rows : [];
}

function periodKey(row: unknown, view: View): string {
  if (!isRecord(row)) {
    return "unknown";
  }
  const key = view === "daily" ? row.date : view === "monthly" ? row.month : row.sessionId ?? row.id;
  return typeof key === "string" && key.length > 0 ? key : "unknown";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
