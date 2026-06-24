export type Agent = "claude" | "codex";

export type View = "daily" | "monthly" | "session";

export type Target = LocalTarget | SshTarget | DevRemoteTarget;

export interface LocalTarget {
  name: string;
  type: "local";
  enabled: boolean;
}

export interface SshTarget {
  name: string;
  type: "ssh";
  host: string;
  enabled: boolean;
}

export interface DevRemoteTarget {
  name: string;
  type: "dev-remote";
  profile: string;
  enabled: boolean;
}

export interface Config {
  ccusagePackage: string;
  timezone: string;
  targets: Target[];
}

export interface CommandDescriptor {
  command: string;
  args: string[];
  display: string;
}

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export type ExecFn = (command: string, args: string[]) => Promise<ExecResult>;

export interface CollectionResult {
  target: string;
  agent: Agent;
  ok: boolean;
  data?: unknown;
  error?: string;
}

export interface TokenTotals {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
  costUSD?: number;
}

export interface PeriodTotals extends TokenTotals {
  period: string;
}

export interface Failure {
  target: string;
  agent: Agent;
  error: string;
}

export interface AggregateReport {
  totals: TokenTotals;
  periods: PeriodTotals[];
  byAgent: Record<Agent, TokenTotals>;
  byTarget: Record<string, TokenTotals>;
  breakdowns: PeriodBreakdown[];
  failures: Failure[];
}

export interface PeriodBreakdown {
  period: string;
  totals: TokenTotals;
  agents: AgentBreakdown[];
}

export interface AgentBreakdown {
  agent: Agent;
  models: string[];
  totals: TokenTotals;
}
