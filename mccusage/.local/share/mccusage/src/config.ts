import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import type { Config, Target } from "./types.js";

export function defaultConfigPath(): string {
  return join(homedir(), ".config", "mccusage", "config.json");
}

export async function loadConfig(path = defaultConfigPath()): Promise<Config> {
  const raw = JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
  if (!Array.isArray(raw.targets)) {
    throw new Error(`Config ${path} must contain a targets array`);
  }

  const targets = raw.targets.filter((target) => target.enabled !== false).map(validateTarget);
  if (targets.length === 0) {
    throw new Error(`Config ${path} has no enabled targets`);
  }

  return {
    ccusagePackage: typeof raw.ccusagePackage === "string" ? raw.ccusagePackage : "ccusage",
    timezone: typeof raw.timezone === "string" ? raw.timezone : "Asia/Shanghai",
    targets
  };
}

function validateTarget(target: unknown): Target {
  if (!isRecord(target) || typeof target.name !== "string" || target.name.length === 0) {
    throw new Error("Every target must have a non-empty name");
  }

  switch (target.type) {
    case "local":
      return { name: target.name, type: "local", enabled: true };
    case "ssh":
      if (typeof target.host !== "string" || target.host.length === 0) {
        throw new Error(`SSH target ${target.name} must set host`);
      }
      return { name: target.name, type: "ssh", host: target.host, enabled: true };
    case "dev-remote":
      if (typeof target.profile !== "string" || target.profile.length === 0) {
        throw new Error(`dev-remote target ${target.name} must set profile`);
      }
      return { name: target.name, type: "dev-remote", profile: target.profile, enabled: true };
    default:
      throw new Error(`Target ${target.name} has unsupported type`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
