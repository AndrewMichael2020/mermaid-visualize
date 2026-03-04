/**
 * @fileOverview Centralized AI model configuration.
 *
 * All AI model references across the application must be imported from here.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  SWITCH ACTIVE MODEL HERE — one line changes every flow + live tests    │
 * │  'openai'   → GPT-5 Nano                                                  │
 * │  'googleai' → Gemini 2.5 Flash                                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

/** USD → CAD conversion rate (approximate). */
export const USD_TO_CAD = 1.43;

type Provider = 'openai' | 'googleai';

export interface ModelConfig {
  /** Genkit model reference string (plugin-prefixed). */
  model: string;
  /** Extra config forwarded to the model (provider-specific). */
  config: Record<string, unknown>;
  /** Raw model name for direct REST calls (live-api tests). */
  apiModelName: string;
  /** API hostname for direct REST calls. */
  apiHost: string;
  /** Environment variable that holds the API key. */
  apiKeyEnvVar: string;
  /** Pricing in USD per 1 million tokens (used for cost estimation). */
  pricing: {
    inputPerMillionTokens: number;
    outputPerMillionTokens: number;
  };
}

const MODEL_REGISTRY: Record<Provider, ModelConfig> = {
  openai: {
    model: 'openai/gpt-5-nano',
    config: { reasoning_effort: 'medium' },
    apiModelName: 'gpt-5-nano',
    apiHost: 'api.openai.com',
    apiKeyEnvVar: 'OPENAI_API_KEY',
    pricing: { inputPerMillionTokens: 0.10, outputPerMillionTokens: 0.40 },
  },
  googleai: {
    model: 'googleai/gemini-2.5-flash',
    config: {},
    apiModelName: 'gemini-2.5-flash',
    apiHost: 'generativelanguage.googleapis.com',
    apiKeyEnvVar: 'GEMINI_API_KEY',
    pricing: { inputPerMillionTokens: 0.075, outputPerMillionTokens: 0.30 },
  },
};

// ─── CHANGE THIS ONE LINE TO SWITCH MODELS EVERYWHERE ────────────────────────
export const ACTIVE_PROVIDER: Provider = 'openai';
// ─────────────────────────────────────────────────────────────────────────────

export const ACTIVE_MODEL_CONFIG: ModelConfig = MODEL_REGISTRY[ACTIVE_PROVIDER];

/**
 * AI model assignments by use-case.
 * Each task can be tuned independently by swapping its entry.
 */
export const AI_MODELS = {
  /** Natural language description → Mermaid diagram code. */
  DIAGRAM_GENERATION: ACTIVE_MODEL_CONFIG,

  /** Apply user-requested changes to an existing diagram. */
  DIAGRAM_ENHANCEMENT: ACTIVE_MODEL_CONFIG,

  /** Repair invalid / unparseable Mermaid syntax. */
  DIAGRAM_FIX: ACTIVE_MODEL_CONFIG,
} as const;

// Convenience re-exports for direct REST calls (live-api tests).
export const AI_MODEL_NAME = ACTIVE_MODEL_CONFIG.apiModelName;
export const AI_API_HOST = ACTIVE_MODEL_CONFIG.apiHost;
export const AI_API_KEY_ENV_VAR = ACTIVE_MODEL_CONFIG.apiKeyEnvVar;
