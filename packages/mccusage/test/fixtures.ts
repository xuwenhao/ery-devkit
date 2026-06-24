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
