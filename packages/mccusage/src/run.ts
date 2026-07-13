import { spawn } from "node:child_process";

import { aggregateResults } from "./aggregate.js";
import { buildCcusageArgs, buildTargetCommand } from "./commands.js";
import type { Agent, AggregateReport, Config, ExecFn, ExecResult, View } from "./types.js";

export interface CollectUsageOptions {
  config: Config;
  agents?: Agent[];
  view: View;
  since?: string;
  until?: string;
  includeCost: boolean;
  concurrency?: number;
  exec?: ExecFn;
}

export async function collectUsage(options: CollectUsageOptions): Promise<AggregateReport> {
  const exec = options.exec ?? spawnExec;
  const jobs = [];

  for (const target of options.config.targets) {
    const npxArgs = buildCcusageArgs({
      view: options.view,
      since: options.since,
      until: options.until,
      timezone: options.config.timezone,
      includeCost: options.includeCost,
      ccusagePackage: options.config.ccusagePackage
    });
    const descriptor = buildTargetCommand(target, npxArgs);
    jobs.push(async () => {
      const result = await exec(descriptor.command, descriptor.args);
      if (result.exitCode !== 0) {
        return {
          target: target.name,
          ok: false,
          error: result.stderr.trim() || `Command failed: ${descriptor.display}`
        } as const;
      }
      try {
        return {
          target: target.name,
          ok: true,
          data: JSON.parse(result.stdout)
        } as const;
      } catch (error) {
        return {
          target: target.name,
          ok: false,
          error: `Invalid JSON from ${descriptor.display}: ${String(error)}`
        } as const;
      }
    });
  }

  const results = await runWithConcurrency(jobs, options.concurrency ?? 4);
  return aggregateResults({ view: options.view, results, agents: options.agents });
}

export function spawnExec(command: string, args: string[]): Promise<ExecResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      resolve({ exitCode: 1, stdout, stderr: error.message });
    });
    child.on("close", (code) => {
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });
  });
}

async function runWithConcurrency<T>(jobs: Array<() => Promise<T>>, concurrency: number): Promise<T[]> {
  const results: T[] = [];
  let next = 0;

  async function worker(): Promise<void> {
    while (next < jobs.length) {
      const index = next;
      next += 1;
      results[index] = await jobs[index]();
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, jobs.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
