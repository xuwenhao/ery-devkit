export const codexDaily = {
  daily: [
    {
      date: "2026-06-16",
      costUSD: 1.25,
      inputTokens: 10,
      outputTokens: 20,
      cacheCreationTokens: 30,
      cacheReadTokens: 40,
      reasoningOutputTokens: 5,
      totalTokens: 100,
      models: {
        "gpt-5.5": {
          inputTokens: 10,
          outputTokens: 20,
          cacheCreationTokens: 30,
          cacheReadTokens: 40,
          reasoningOutputTokens: 5,
          totalTokens: 100
        }
      }
    }
  ],
  totals: {
    costUSD: 1.25,
    inputTokens: 10,
    outputTokens: 20,
    cacheCreationTokens: 30,
    cacheReadTokens: 40,
    reasoningOutputTokens: 5,
    totalTokens: 100
  }
};

export const claudeDaily = {
  daily: [
    {
      date: "2026-06-16",
      totalCost: 2.5,
      inputTokens: 3,
      outputTokens: 4,
      cacheCreationTokens: 5,
      cacheReadTokens: 6,
      totalTokens: 18,
      modelsUsed: ["claude-opus-4-8"],
      modelBreakdowns: [
        {
          modelName: "claude-opus-4-8",
          inputTokens: 3,
          outputTokens: 4,
          cacheCreationTokens: 5,
          cacheReadTokens: 6,
          cost: 2.5
        }
      ]
    }
  ],
  totals: {
    totalCost: 2.5,
    inputTokens: 3,
    outputTokens: 4,
    cacheCreationTokens: 5,
    cacheReadTokens: 6,
    totalTokens: 18
  }
};

export const codexMonthly = {
  monthly: [
    {
      month: "2026-06",
      inputTokens: 7,
      outputTokens: 8,
      cacheCreationTokens: 9,
      cacheReadTokens: 10,
      reasoningOutputTokens: 11,
      totalTokens: 34
    }
  ],
  totals: {
    inputTokens: 7,
    outputTokens: 8,
    cacheCreationTokens: 9,
    cacheReadTokens: 10,
    reasoningOutputTokens: 11,
    totalTokens: 34
  }
};

const unifiedAgents = [
  {
    agent: "claude",
    inputTokens: 3,
    outputTokens: 4,
    cacheCreationTokens: 5,
    cacheReadTokens: 6,
    totalTokens: 18,
    totalCost: 2.5,
    modelsUsed: ["claude-opus-4-8"]
  },
  {
    agent: "codex",
    inputTokens: 10,
    outputTokens: 20,
    cacheCreationTokens: 30,
    cacheReadTokens: 40,
    reasoningOutputTokens: 5,
    totalTokens: 100,
    totalCost: 1.25,
    modelsUsed: ["gpt-5.5"]
  },
  {
    agent: "openclaw",
    inputTokens: 5,
    outputTokens: 6,
    cacheCreationTokens: 7,
    cacheReadTokens: 8,
    totalTokens: 26,
    totalCost: 0.75,
    modelsUsed: ["[openclaw] zai-org/GLM-5.2"]
  }
];

function unifiedPeriodRow(period: string) {
  return {
    agent: "all",
    period,
    agents: unifiedAgents,
    inputTokens: 18,
    outputTokens: 30,
    cacheCreationTokens: 42,
    cacheReadTokens: 54,
    totalTokens: 144,
    totalCost: 4.5,
    modelsUsed: unifiedAgents.flatMap((agent) => agent.modelsUsed)
  };
}

export const unifiedDaily = { daily: [unifiedPeriodRow("2026-06-16")], totals: unifiedPeriodRow("total") };

export const unifiedWeekly = { weekly: [unifiedPeriodRow("2026-06-15")], totals: unifiedPeriodRow("total") };

export const unifiedMonthly = { monthly: [unifiedPeriodRow("2026-06")], totals: unifiedPeriodRow("total") };

export const unifiedSession = {
  session: unifiedAgents.map((agent) => ({ ...agent, period: "shared-session" })),
  totals: unifiedPeriodRow("total")
};
