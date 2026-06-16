import type { AggregateReport, AgentBreakdown, PeriodBreakdown, TokenTotals, View } from "./types.js";

type Align = "left" | "right";

interface FormatOptions {
  view?: View;
}

interface Column {
  header: string;
  align: Align;
}

export function formatTextReport(report: AggregateReport, options: FormatOptions = {}): string {
  const view = options.view ?? "daily";
  const hasCost = reportHasCost(report);
  const lines = [
    "",
    titleBox(`Multi-Machine Token Usage Report - ${titleCase(view)}`),
    "",
    renderUsageTable(report, view, hasCost)
  ];

  if (report.failures.length > 0) {
    lines.push("", "Failures");
    lines.push(
      renderTable(
        [
          { header: "Target", align: "left" },
          { header: "Agent", align: "left" },
          { header: "Error", align: "left" }
        ],
        report.failures.map((failure) => [failure.target, failure.agent, failure.error])
      )
    );
  }

  return lines.join("\n");
}

function renderUsageTable(report: AggregateReport, view: View, hasCost: boolean): string {
  const rows: string[][] = [];
  const breakdowns = report.breakdowns.length > 0 ? report.breakdowns : fallbackBreakdowns(report);

  for (const breakdown of breakdowns) {
    rows.push(usageRow(periodLabel(breakdown.period), "All", "", breakdown.totals, hasCost));
    for (const agent of breakdown.agents) {
      rows.push(usageRow("", `- ${agentLabel(agent.agent)}`, formatModels(agent), agent.totals, hasCost));
    }
  }
  rows.push(usageRow("Total", "", "", report.totals, hasCost));

  return renderTable(usageColumns(view, hasCost), rows);
}

function usageColumns(view: View, hasCost: boolean): Column[] {
  const columns: Column[] = [
    { header: firstColumn(view), align: "left" },
    { header: "Agent", align: "left" },
    { header: "Models", align: "left" },
    { header: "Input", align: "right" },
    { header: "Output", align: "right" },
    { header: "Cache Create", align: "right" },
    { header: "Cache Read", align: "right" },
    { header: "Total Tokens", align: "right" }
  ];
  if (hasCost) {
    columns.push({ header: "Cost (USD)", align: "right" });
  }
  return columns;
}

function usageRow(period: string, agent: string, models: string, total: TokenTotals, hasCost: boolean): string[] {
  const row = [
    period,
    agent,
    models,
    formatNumber(total.inputTokens),
    formatNumber(total.outputTokens),
    formatNumber(total.cacheCreationTokens),
    formatNumber(total.cacheReadTokens),
    formatNumber(total.totalTokens)
  ];
  if (hasCost) {
    row.push(formatCurrency(total.costUSD ?? 0));
  }
  return row;
}

function fallbackBreakdowns(report: AggregateReport): PeriodBreakdown[] {
  return report.periods.map((period) => ({
    period: period.period,
    totals: period,
    agents: []
  }));
}

function formatModels(agent: AgentBreakdown): string {
  return agent.models.map((model) => `- ${shortModelName(model)}`).join("\n");
}

function shortModelName(model: string): string {
  return model
    .replace(/^claude-/, "")
    .replace(/-202\d{5,}$/, "")
    .replace(/-20\d{6}$/, "");
}

function titleBox(title: string): string {
  const contentWidth = Math.max(40, title.length) + 2;
  return [
    `╭${"─".repeat(contentWidth + 2)}╮`,
    `│${" ".repeat(contentWidth + 2)}│`,
    `│ ${center(title, contentWidth)} │`,
    `│${" ".repeat(contentWidth + 2)}│`,
    `╰${"─".repeat(contentWidth + 2)}╯`
  ].join("\n");
}

function renderTable(columns: Column[], rows: string[][]): string {
  const widths = columnWidths(columns, rows);
  const separator = border("├", "┼", "┤", widths);
  const lines = [
    border("┌", "┬", "┐", widths),
    renderPhysicalRow(columns.map((column) => column.header), columns, widths),
    separator
  ];

  rows.forEach((row, index) => {
    for (const physicalRow of expandMultilineRow(row, columns.length)) {
      lines.push(renderPhysicalRow(physicalRow, columns, widths));
    }
    if (index + 1 < rows.length) {
      lines.push(separator);
    }
  });

  lines.push(border("└", "┴", "┘", widths));
  return lines.join("\n");
}

function columnWidths(columns: Column[], rows: string[][]): number[] {
  return columns.map((column, index) => {
    const contentWidth = Math.max(column.header.length, ...rows.map((row) => maxLineLength(row[index] ?? "")));
    if (column.align === "right") {
      return Math.max(contentWidth + 3, 11);
    }
    if (index === 1) {
      return Math.max(contentWidth + 2, 15);
    }
    return Math.max(contentWidth + 2, 10);
  });
}

function expandMultilineRow(row: string[], columnCount: number): string[][] {
  const cells = Array.from({ length: columnCount }, (_, index) => (row[index] ?? "").split("\n"));
  const height = Math.max(...cells.map((cell) => cell.length));
  return Array.from({ length: height }, (_, rowIndex) =>
    cells.map((cell) => cell[rowIndex] ?? "")
  );
}

function renderPhysicalRow(values: string[], columns: Column[], widths: number[]): string {
  const cells = values.map((value, index) => {
    const width = widths[index];
    const align = columns[index].align;
    const contentWidth = Math.max(width - 2, 0);
    return ` ${align === "right" ? value.padStart(contentWidth) : value.padEnd(contentWidth)} `;
  });
  return `│${cells.join("│")}│`;
}

function border(left: string, join: string, right: string, widths: number[]): string {
  return `${left}${widths.map((width) => "─".repeat(width)).join(join)}${right}`;
}

function maxLineLength(value: string): number {
  return Math.max(...value.split("\n").map((line) => line.length));
}

function center(value: string, width: number): string {
  const left = Math.floor((width - value.length) / 2);
  const right = width - value.length - left;
  return `${" ".repeat(left)}${value}${" ".repeat(right)}`;
}

function firstColumn(view: View): string {
  return view === "daily" ? "Date" : view === "monthly" ? "Month" : "Session";
}

function periodLabel(period: string): string {
  return period;
}

function agentLabel(agent: string): string {
  return agent === "claude" ? "Claude" : agent === "codex" ? "Codex" : titleCase(agent);
}

function titleCase(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function reportHasCost(report: AggregateReport): boolean {
  return report.totals.costUSD != null || report.breakdowns.some((period) => period.totals.costUSD != null);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}
