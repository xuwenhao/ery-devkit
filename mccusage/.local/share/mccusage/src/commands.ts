import type { Agent, CommandDescriptor, Target, View } from "./types.js";
import { shellJoin, shellQuote } from "./shell.js";

export interface CcusageArgsOptions {
  agent: Agent;
  view: View;
  since?: string;
  until?: string;
  timezone?: string;
  includeCost?: boolean;
  ccusagePackage?: string;
}

export function buildCcusageArgs(options: CcusageArgsOptions): string[] {
  const args = [
    "-y",
    options.ccusagePackage ?? "ccusage",
    options.agent,
    options.view,
    "--json"
  ];
  if (options.since) {
    args.push("--since", options.since);
  }
  if (options.until) {
    args.push("--until", options.until);
  }
  if (options.timezone) {
    args.push("--timezone", options.timezone);
  }
  if (options.includeCost === false) {
    args.push("--no-cost");
  }
  return args;
}

export function buildTargetCommand(target: Target, npxArgs: string[]): CommandDescriptor {
  const npxCommand = shellJoin(["npx", ...npxArgs]);
  switch (target.type) {
    case "local":
      return {
        command: "npx",
        args: npxArgs,
        display: npxCommand
      };
    case "ssh":
      return {
        command: "ssh",
        args: [target.host, npxCommand],
        display: `ssh ${target.host} ${shellQuote(npxCommand)}`
      };
    case "dev-remote":
      return {
        command: "bash",
        args: ["-lc", buildDevRemoteScript(target.profile, npxArgs)],
        display: `dev-remote ${target.profile} :: ${npxCommand}`
      };
  }
}

function buildDevRemoteScript(profile: string, npxArgs: string[]): string {
  const npxCommand = shellJoin(["npx", ...npxArgs]);
  const profileName = shellQuote(profile);
  const escapedNpxCommand = shellQuote(npxCommand);

  return [
    "set -euo pipefail",
    `profile=${profileName}`,
    'conf="${XDG_CONFIG_HOME:-$HOME/.config}/dev-remote/${profile}.conf"',
    'if [ ! -f "$conf" ]; then echo "dev-remote profile not found: $conf" >&2; exit 1; fi',
    "source \"$conf\"",
    ': "${DEV_SSH_HOST:?DEV_SSH_HOST not set}"',
    ': "${DEV_CONTAINER_PATTERN:?DEV_CONTAINER_PATTERN not set}"',
    ': "${DEV_CONTAINER_USER:?DEV_CONTAINER_USER not set}"',
    ': "${DEV_WORKSPACE:?DEV_WORKSPACE not set}"',
    'container_id=$(ssh "$DEV_SSH_HOST" "docker ps --filter name=$DEV_CONTAINER_PATTERN --format \'{{.ID}}\' | head -1")',
    'if [ -z "$container_id" ]; then echo "No running container matching $DEV_CONTAINER_PATTERN on $DEV_SSH_HOST" >&2; exit 1; fi',
    `inner=${escapedNpxCommand}`,
    'remote_cmd=$(printf "docker exec -u %q -w %q %q bash -lc %q" "$DEV_CONTAINER_USER" "$DEV_WORKSPACE" "$container_id" "$inner")',
    'ssh "$DEV_SSH_HOST" "$remote_cmd"'
  ].join("\n");
}
