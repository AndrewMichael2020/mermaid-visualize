/**
 * @fileOverview Cost estimation utilities for AI API calls.
 *
 * Provides pre-call token estimation and post-call cost calculation
 * in Canadian dollars based on the active model's pricing.
 */

import { ACTIVE_MODEL_CONFIG, USD_TO_CAD } from '@/ai/model-config';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface CostBreakdown extends TokenUsage {
  /** Total cost in Canadian dollars. */
  costCad: number;
}

/**
 * Rough pre-call token estimate from a text string.
 * Uses the GPT rule-of-thumb: ~4 characters per token.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimate the cost of a call before it is made.
 * Pass the full prompt text as `inputText` and an expected output
 * length (in chars) as `expectedOutputChars` for a rough pre-call figure.
 */
export function estimateCallCost(inputText: string, expectedOutputChars = 2000): CostBreakdown {
  const inputTokens = estimateTokens(inputText);
  const outputTokens = estimateTokens(' '.repeat(expectedOutputChars));
  return calcCost({ inputTokens, outputTokens });
}

/**
 * Calculate cost from actual token usage returned by the API.
 * Converts USD to CAD using the configured exchange rate.
 */
export function calcCost(usage: TokenUsage): CostBreakdown {
  const { inputPerMillionTokens, outputPerMillionTokens } = ACTIVE_MODEL_CONFIG.pricing;
  const costUsd =
    (usage.inputTokens / 1_000_000) * inputPerMillionTokens +
    (usage.outputTokens / 1_000_000) * outputPerMillionTokens;
  return {
    ...usage,
    costCad: costUsd * USD_TO_CAD,
  };
}
