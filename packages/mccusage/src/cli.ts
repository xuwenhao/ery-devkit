#!/usr/bin/env node
import { loadConfig, defaultConfigPath } from "./config.js";
import { formatTextReport } from "./format.js";
import { collectUsage } from "./run.js";
import type { Agent, View } from "./types.js";

const VALID_VIEWS = new Set<View>(["daily", "weekly", "monthly", "session"]);

interface CliOptions {
  view: View;
  configPath: string;
  agents?: Agent[];
  since?: string;
  until?: string;
  timezone?: string;
  includeCost: boolean;
  showModels: boolean;
  json: boolean;
  concurrency: number;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const config = await loadConfig(options.configPath);
  if (options.timezone) {
    config.timezone = options.timezone;
  }
  const report = await collectUsage({
    config,
    agents: options.agents,
    view: options.view,
    since: options.since,
    until: options.until,
    includeCost: options.includeCost,
    concurrency: options.concurrency
  });

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatTextReport(report, { view: options.view, showModels: options.showModels }));
  }

  if (report.failures.length > 0) {
    process.exitCode = 2;
  }
}

function parseArgs(args: string[]): CliOptions {
  const [viewArg = "daily", ...rest] = args;
  if (viewArg === "-h" || viewArg === "--help") {
    printHelp();
    process.exit(0);
  }
  if (!VALID_VIEWS.has(viewArg as View)) {
    throw new Error(`Invalid view "${viewArg}". Expected daily, weekly, monthly, or session.`);
  }

  const options: CliOptions = {
    view: viewArg as View,
    configPath: defaultConfigPath(),
    includeCost: true,
    showModels: false,
    json: false,
    concurrency: 4
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    switch (arg) {
      case "--config":
        options.configPath = readValue(rest, ++index, arg);
        break;
      case "--agents":
        options.agents = parseAgents(readValue(rest, ++index, arg));
        break;
      case "--since":
        options.since = readValue(rest, ++index, arg);
        break;
      case "--until":
        options.until = readValue(rest, ++index, arg);
        break;
      case "--timezone":
        options.timezone = readValue(rest, ++index, arg);
        break;
      case "--include-cost":
        options.includeCost = true;
        break;
      case "--no-cost":
        options.includeCost = false;
        break;
      case "--hide-models":
        options.showModels = false;
        break;
      case "--show-models":
        options.showModels = true;
        break;
      case "--json":
        options.json = true;
        break;
      case "--concurrency":
        options.concurrency = Number.parseInt(readValue(rest, ++index, arg), 10);
        if (!Number.isFinite(options.concurrency) || options.concurrency < 1) {
          throw new Error("--concurrency must be a positive integer");
        }
        break;
      case "-h":
      case "--help":
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function parseAgents(value: string): Agent[] {
  const agents = Array.from(
    new Set(
      value
        .split(",")
        .map((agent) => agent.trim().toLowerCase())
        .filter(Boolean)
    )
  );
  if (agents.length === 0) {
    throw new Error("--agents must include at least one agent");
  }
  return agents;
}

function readValue(args: string[], index: number, flag: string): string {
  const value = args[index];
  if (!value) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function printHelp(): void {
  console.log(`Usage: mccusage <daily|weekly|monthly|session> [options]

Options:
  --config <path>          Config file path (default: ~/.config/mccusage/config.json)
  --agents <list>          Comma-separated agent names (default: all detected)
  --since <YYYY-MM-DD>     Start date passed to ccusage
  --until <YYYY-MM-DD>     End date passed to ccusage
  --no-cost                Hide cost fields in ccusage JSON/output
  --include-cost           Show cost fields (default; kept for compatibility)
  --hide-models            Hide the per-agent Models column (default)
  --show-models            Show the per-agent Models column
  --json                   Print aggregate JSON
  --concurrency <n>        Concurrent target jobs (default: 4)
  -h, --help               Show this help
`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
