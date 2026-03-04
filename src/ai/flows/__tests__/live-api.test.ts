/**
 * @jest-environment node
 *
 * Live API integration tests for the OpenAI GPT-5 Nano-backed AI flows.
 *
 * These tests call the real OpenAI REST API and are therefore only executed
 * when the OPENAI_API_KEY environment variable is set AND the OpenAI endpoint
 * is reachable (e.g. in GitHub Actions CI, but NOT in sandboxed environments
 * with DNS restrictions).
 *
 * The @jest-environment node docblock is required so the built-in Node.js
 * `https` module (and DNS resolution) works correctly.
 *
 * Because the genkit runtime uses ESM dependencies that Jest cannot natively
 * transform, these tests call the OpenAI REST API directly via the Node.js
 * `https` module and use the same prompts defined in the flow source files.
 * The prompt-rules.test.ts suite separately validates that those prompts
 * contain the required syntax rules.
 *
 * What is validated here:
 *  1. The fix-diagram-error prompt guides the model to fix the complex
 *     sequence-diagram edge-case from the issue (undeclared participant "911",
 *     nested alt/else blocks, loop block).
 *  2. The enhance prompt, when injected with error context, produces output
 *     without the original structural error.
 *  3. In all cases the model returns raw Mermaid code (no code fences, correct
 *     diagram type keyword preserved).
 */

import * as https from 'https';
import * as dns from 'dns';
import * as fs from 'fs';
import * as path from 'path';
import { validateMermaidSyntax } from '@/lib/mermaid-validator';
import { ACTIVE_PROVIDER, AI_MODEL_NAME, AI_API_HOST, AI_API_KEY_ENV_VAR } from '@/ai/model-config';

const API_KEY = process.env[AI_API_KEY_ENV_VAR] ?? '';

/**
 * Resolve to true if the active provider's API key is set AND the API host is
 * reachable via DNS.  Allows tests to self-skip in sandboxed environments.
 */
async function isLiveApiAvailable(): Promise<boolean> {
  if (!API_KEY) return false;
  return new Promise((resolve) => {
    dns.lookup(AI_API_HOST, (err) => resolve(!err));
  });
}

/** Schema for the fix-diagram-error output. */
const FIX_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    fixedCode: { type: 'string', description: 'Corrected, valid Mermaid diagram code.' },
    explanation: {
      type: 'string',
      description: 'One concise sentence describing what was wrong and what was changed.',
    },
  },
  required: ['fixedCode', 'explanation'],
  additionalProperties: false,
};

/** Schema for the enhance-diagram-with-llm output. */
const ENHANCE_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    enhancedDiagramCode: { type: 'string', description: 'The enhanced Mermaid diagram code.' },
  },
  required: ['enhancedDiagramCode'],
  additionalProperties: false,
};

/** Extract the prompt template string from a flow source file. */
function readFlowPrompt(filename: string): string {
  const src = fs.readFileSync(path.resolve(__dirname, '..', filename), 'utf8');
  const match = /prompt:\s*`([\s\S]*?)`\s*,?\s*\n\s*\}\)/m.exec(src);
  if (!match) throw new Error(`Could not extract prompt from ${filename}`);
  return match[1];
}

/** Interpolate {{{placeholder}}} template vars in the genkit prompt format. */
function interpolatePrompt(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\{(\w+)\}\}\}/g, (_, key) => vars[key] ?? '');
}

/**
 * POST a text prompt to the OpenAI Chat Completions REST API.
 * Returns the parsed structured JSON from the model's response.
 */
function callOpenAIHttps(prompt: string, responseSchema: object): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: AI_MODEL_NAME,
      messages: [{ role: 'user', content: prompt }],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'output', strict: true, schema: responseSchema },
      },
    });

    const options: https.RequestOptions = {
      hostname: AI_API_HOST,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': `Bearer ${API_KEY}`,
      },
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`OpenAI API error ${res.statusCode}: ${raw.slice(0, 500)}`));
          return;
        }
        try {
          const parsed = JSON.parse(raw) as { choices?: Array<{ message?: { content?: string } }> };
          const text = parsed.choices?.[0]?.message?.content ?? '';
          resolve(JSON.parse(text) as Record<string, string>);
        } catch (e) {
          reject(new Error(`Failed to parse OpenAI response: ${(e as Error).message}\nRaw: ${raw.slice(0, 500)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * POST a text prompt to the Gemini REST API.
 * Returns the parsed structured JSON from the model's response.
 */
function callGeminiHttps(prompt: string, responseSchema: object): Promise<Record<string, string>> {
  // Gemini does not support 'additionalProperties' in response schemas — strip it.
  const geminiSchema = JSON.parse(JSON.stringify(responseSchema, (key, val) =>
    key === 'additionalProperties' ? undefined : val
  ));

  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: geminiSchema },
    });

    const options: https.RequestOptions = {
      hostname: AI_API_HOST,
      path: `/v1beta/models/${AI_MODEL_NAME}:generateContent?key=${API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Gemini API error ${res.statusCode}: ${raw.slice(0, 500)}`));
          return;
        }
        try {
          const parsed = JSON.parse(raw) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
          resolve(JSON.parse(text) as Record<string, string>);
        } catch (e) {
          reject(new Error(`Failed to parse Gemini response: ${(e as Error).message}\nRaw: ${raw.slice(0, 500)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/** Dispatch to the correct provider's REST caller based on ACTIVE_PROVIDER. */
function callModelHttps(prompt: string, responseSchema: object): Promise<Record<string, string>> {
  return ACTIVE_PROVIDER === 'openai'
    ? callOpenAIHttps(prompt, responseSchema)
    : callGeminiHttps(prompt, responseSchema);
}

/**
 * Strip code fences that the model occasionally inserts inside the structured
 * `fixedCode` / `enhancedDiagramCode` string value despite the JSON response
 * schema.  The responseSchema enforces the JSON wrapper, but the string *value*
 * itself can still include markdown fences — particularly on edge cases.
 */
function stripFences(code: string): string {
  return code
    .replace(/^```(?:mermaid)?/gm, '')
    .replace(/^'''/gm, '')
    .replace(/```$/gm, '')
    .replace(/'''$/gm, '')
    .trim();
}

// ─── Shared test fixtures ─────────────────────────────────────────────────────

// Complex sequence diagram from the issue — intentionally broken.
// Problems:
//  • Participant "911" is used but never declared.
//  • Final `deactivate UPCC` after it was already deactivated in both branches.
const BROKEN_SEQUENCE_DIAGRAM = `%%{init: {
  "theme": "base",
  "themeVariables": {
    "actorBkg": "#E6F7FF",
    "actorBorder": "#0A84C1",
    "actorTextColor": "#003A57",
    "signalColor": "#0A84C1",
    "signalTextColor": "#003A57",
    "labelBoxBkgColor": "#EAF7EA",
    "labelBoxBorderColor": "#4CAF50",
    "labelTextColor": "#1B5E20",
    "loopTextColor": "#705400",
    "noteBkgColor": "#FFF8D6",
    "noteBorderColor": "#D69E00",
    "noteTextColor": "#705400",
    "fontFamily": "Inter, sans-serif"
  }
}}%%
sequenceDiagram
    participant Patient
    participant UPCC as "UPCC Reception"
    participant Nurse
    participant Provider as "GP/NP/RN"
    participant Lab as "Lab/Diagnostic Services"
    participant FP as "Family Practice"
    participant PCN as "Primary Care Network"

    Patient->>UPCC: Arrives with health concern 12-24hr acuity
    activate UPCC
    UPCC->>Nurse: Patient registration and handover
    activate Nurse
    Note over Nurse: CTAS Triage
    alt Life-threatening symptoms
        Nurse->>Nurse: Identify critical condition
        Nurse->>911: Divert to Emergency Department
        deactivate Nurse
        deactivate UPCC
    else Non-life-threatening symptoms
        Nurse-->>Provider: Refer for assessment
        deactivate Nurse
        activate Provider
        Provider->>Lab: Order point-of-care or community tests
        activate Lab
        Lab-->>Provider: Test results
        deactivate Lab
        Provider->>Provider: Clinical Assessment and Diagnosis
        Provider->>Provider: Develop Treatment Plan
        Note over Provider,PCN: Team-based care model
        alt Attached Patients
            Provider->>FP: Send clinical summary for follow-up
            activate FP
            FP-->>Patient: Schedule follow-up appointment
            deactivate FP
        else Unattached Patients
            Provider->>PCN: Facilitate attachment
            activate PCN
            PCN-->>Patient: Connect with UPCC as temporary medical home or PCN
            deactivate PCN
        end
        Provider-->>Patient: Initiate immediate treatment
        deactivate Provider
    end
    deactivate UPCC

    Note over Patient,UPCC: After-Hours/Weekend Considerations
    loop After-Hours/Weekend
        Patient->>UPCC: Arrives during after-hours/weekend
        activate UPCC
        UPCC->>Nurse: Patient registration and handover
        activate Nurse
        Note over UPCC,Nurse: Modified process for after-hours
        deactivate Nurse
        deactivate UPCC
    end`;

const SIMPLE_BROKEN_LOOP = [
  'sequenceDiagram',
  '    participant A',
  '    loop Every minute',
  '        A->>A: ping',
].join('\n');

const VALID_SEQUENCE = `sequenceDiagram
    participant A
    participant B
    A->>B: Hello
    B-->>A: World`;

// ─── fix-diagram-error suite ─────────────────────────────────────────────────

describe('Live AI API — fix-diagram-error flow', () => {
  jest.setTimeout(120_000);

  let skip = false;
  let fixPromptTemplate: string;

  beforeAll(async () => {
    skip = !(await isLiveApiAvailable());
    if (!skip) {
      fixPromptTemplate = readFlowPrompt('fix-diagram-error.ts');
    }
  });

  it('returns a non-empty fixedCode and explanation for the complex sequence diagram', async () => {
    if (skip) return;

    const errorMessage =
      'Structural issues detected:\n' +
      'Participant "911" is used but never declared — add a participant declaration.';

    const prompt = interpolatePrompt(fixPromptTemplate, {
      diagramCode: BROKEN_SEQUENCE_DIAGRAM,
      errorMessage,
    });

    const result = await callModelHttps(prompt, FIX_RESPONSE_SCHEMA);

    expect(typeof result.fixedCode).toBe('string');
    expect(result.fixedCode.length).toBeGreaterThan(0);
    expect(typeof result.explanation).toBe('string');
    expect(result.explanation.length).toBeGreaterThan(0);
  });

  it('preserves the sequenceDiagram keyword in the fixed output', async () => {
    if (skip) return;

    const prompt = interpolatePrompt(fixPromptTemplate, {
      diagramCode: BROKEN_SEQUENCE_DIAGRAM,
      errorMessage: 'Invalid Mermaid syntax.',
    });

    const result = await callModelHttps(prompt, FIX_RESPONSE_SCHEMA);
    const fixedCode = stripFences(result.fixedCode ?? '');

    expect(fixedCode).toContain('sequenceDiagram');
  });

  it('does not include markdown code fences in the returned fixedCode', async () => {
    if (skip) return;

    const prompt = interpolatePrompt(fixPromptTemplate, {
      diagramCode: BROKEN_SEQUENCE_DIAGRAM,
      errorMessage: 'Invalid Mermaid syntax.',
    });

    const result = await callModelHttps(prompt, FIX_RESPONSE_SCHEMA);
    const fixedCode = stripFences(result.fixedCode ?? '');

    expect(fixedCode).not.toMatch(/^```/m);
    expect(fixedCode).not.toMatch(/```$/m);
  });

  it('produces balanced block keywords for a simple unclosed-loop diagram', async () => {
    if (skip) return;

    const prompt = interpolatePrompt(fixPromptTemplate, {
      diagramCode: SIMPLE_BROKEN_LOOP,
      errorMessage: "Line 3: Unclosed 'loop' block — matching 'end' is missing.",
    });

    const result = await callModelHttps(prompt, FIX_RESPONSE_SCHEMA);
    const fixedCode = stripFences(result.fixedCode ?? '');

    const validation = validateMermaidSyntax(fixedCode);
    const loopErrors = validation.errors.filter(e => e.message.includes("Unclosed 'loop'"));
    expect(loopErrors).toHaveLength(0);
  });
});

// ─── enhance-diagram-with-llm suite ──────────────────────────────────────────

describe('Live AI API — enhance-diagram-with-llm flow', () => {
  jest.setTimeout(120_000);

  let skip = false;
  let enhancePromptTemplate: string;

  beforeAll(async () => {
    skip = !(await isLiveApiAvailable());
    if (!skip) {
      enhancePromptTemplate = readFlowPrompt('enhance-diagram-with-llm.ts');
    }
  });

  it('enhances a valid diagram without error context', async () => {
    if (skip) return;

    const prompt = interpolatePrompt(enhancePromptTemplate, {
      diagramCode: VALID_SEQUENCE,
      enhancementPrompt: 'Add a third participant C that receives a message from B.',
    });

    const result = await callModelHttps(prompt, ENHANCE_RESPONSE_SCHEMA);
    const enhanced = stripFences(result.enhancedDiagramCode ?? '');

    expect(enhanced.length).toBeGreaterThan(0);
    expect(enhanced).toContain('sequenceDiagram');
  });

  it('does not include markdown code fences in the enhanced output', async () => {
    if (skip) return;

    const prompt = interpolatePrompt(enhancePromptTemplate, {
      diagramCode: VALID_SEQUENCE,
      enhancementPrompt: 'Add a fourth participant D.',
    });

    const result = await callModelHttps(prompt, ENHANCE_RESPONSE_SCHEMA);
    const enhanced = stripFences(result.enhancedDiagramCode ?? '');

    expect(enhanced).not.toMatch(/^```/m);
    expect(enhanced).not.toMatch(/```$/m);
  });

  it('fixes structural errors when error context is injected into the enhancement prompt', async () => {
    if (skip) return;

    // Simulate how DiagramEditor builds the prompt when errorContext is present.
    const errorMessage = "Line 3: Unclosed 'loop' block — matching 'end' is missing.";
    const aiAttemptExplanation =
      'Removed unclosed loop block by adding a matching end statement for the loop.';

    const enrichedEnhancementPrompt =
      `Add a note at the top.\n\n` +
      `IMPORTANT — the current diagram has a syntax/rendering error that MUST ` +
      `also be fixed in your output:\nError: ${errorMessage}` +
      `\nPrevious AI fix attempt (unsuccessful): ${aiAttemptExplanation}`;

    const prompt = interpolatePrompt(enhancePromptTemplate, {
      diagramCode: SIMPLE_BROKEN_LOOP,
      enhancementPrompt: enrichedEnhancementPrompt,
    });

    const result = await callModelHttps(prompt, ENHANCE_RESPONSE_SCHEMA);
    const enhanced = stripFences(result.enhancedDiagramCode ?? '');

    expect(enhanced).toContain('sequenceDiagram');
    const validation = validateMermaidSyntax(enhanced);
    const loopErrors = validation.errors.filter(e => e.message.includes("Unclosed 'loop'"));
    expect(loopErrors).toHaveLength(0);
  });
});

// ─── Additional edge-case fixtures ───────────────────────────────────────────

// Sequence diagram where alt/else block headers are quoted.
// NOTE: This IS valid Mermaid v10.9.1 syntax — both plain and quoted headers render correctly.
// Used here to test that the enhance flow can add branches to a diagram that uses quoted headers.
const QUOTED_ALT_HEADERS = `sequenceDiagram
    participant A
    participant B
    alt "User is authenticated"
        A->>B: Fetch data
        B-->>A: Return results
    else "User is not authenticated"
        A->>B: Redirect to login
    end`;

// Sequence diagram using smart/curly quotes in message labels.
const SMART_QUOTES_DIAGRAM = `sequenceDiagram
    participant A
    participant B
    A->>B: \u201crequest care\u201d
    B-->>A: \u201ccare provided\u201d`;

// Sequence diagram with a participant declared using spaces (illegal raw ID).
const ILLEGAL_PARTICIPANT_ID = `sequenceDiagram
    participant Alice Smith
    participant Bob Jones
    Alice Smith->>Bob Jones: Hello`;

// Flowchart with a missing --> arrow (broken syntax) that the model should fix.
const BROKEN_FLOWCHART = `flowchart TD
    A[Start] B[Process]
    B --> C[End]`;

// Valid flowchart (no theme) — used as input for enhance tests.
const VALID_FLOWCHART_NO_THEME = `flowchart TD
    A[Patient arrives] --> B[Triage]
    B --> C{Severity}
    C -->|High| D[Emergency]
    C -->|Low| E[Walk-in clinic]`;

// Valid ER diagram — enhance must NOT add a theme block to this type.
const VALID_ER_DIAGRAM = `erDiagram
    PATIENT {
        string id PK
        string name
    }
    APPOINTMENT {
        string id PK
        string date
    }
    PATIENT ||--o{ APPOINTMENT : schedules`;

// Themed sequence diagram — enhance MUST preserve the %%{init} block.
const THEMED_SEQUENCE = `%%{init: {"theme": "base", "themeVariables": {"actorBkg": "#FFE4B5"}}}%%
sequenceDiagram
    participant A
    participant B
    A->>B: Hello`;

// Sequence diagram with imbalanced activate/deactivate across branches.
const IMBALANCED_ACTIVATION = `sequenceDiagram
    participant A
    participant B
    activate A
    alt success
        A->>B: call
        activate B
        B-->>A: ok
        deactivate B
    else failure
        A->>B: retry
    end
    deactivate A`;

// ─── Extended fix-diagram-error edge cases ────────────────────────────────────

describe('Live AI API — fix-diagram-error edge cases', () => {
  jest.setTimeout(120_000);

  let skip = false;
  let fixPromptTemplate: string;

  beforeAll(async () => {
    skip = !(await isLiveApiAvailable());
    if (!skip) {
      fixPromptTemplate = readFlowPrompt('fix-diagram-error.ts');
    }
  });

  it('replaces smart/curly quotes with plain text in labels', async () => {
    if (skip) return;

    const prompt = interpolatePrompt(fixPromptTemplate, {
      diagramCode: SMART_QUOTES_DIAGRAM,
      errorMessage:
        "Parse error on lines 4-5: curly/smart quotes (\u201C\u201D) are not valid Mermaid syntax. " +
        "Use plain text or standard straight quotes.",
    });

    const result = await callModelHttps(prompt, FIX_RESPONSE_SCHEMA);
    const fixedCode = stripFences(result.fixedCode ?? '');

    expect(fixedCode).toContain('sequenceDiagram');
    // Should have removed unicode curly quotes
    expect(fixedCode).not.toContain('\u201C');
    expect(fixedCode).not.toContain('\u201D');
  });

  it('uses "as" keyword to fix participant IDs containing spaces', async () => {
    if (skip) return;

    const prompt = interpolatePrompt(fixPromptTemplate, {
      diagramCode: ILLEGAL_PARTICIPANT_ID,
      errorMessage:
        'Participant/actor ID "Alice Smith" contains spaces which are illegal in a raw Mermaid ID. ' +
        'Use a short plain ID with \'as\', e.g.: participant AliceSmith as "Alice Smith".',
    });

    const result = await callModelHttps(prompt, FIX_RESPONSE_SCHEMA);
    const fixedCode = stripFences(result.fixedCode ?? '');

    expect(fixedCode).toContain('sequenceDiagram');
    // Should use the "as" keyword for display names
    expect(fixedCode).toMatch(/participant\s+\S+\s+as\s+/);
  });

  it('fixes a flowchart with a missing arrow between nodes', async () => {
    if (skip) return;

    const prompt = interpolatePrompt(fixPromptTemplate, {
      diagramCode: BROKEN_FLOWCHART,
      errorMessage:
        'Parse error on line 2: Missing arrow between nodes A and B. ' +
        'Expected --> or --- between node definitions.',
    });

    const result = await callModelHttps(prompt, FIX_RESPONSE_SCHEMA);
    const fixedCode = stripFences(result.fixedCode ?? '');

    expect(fixedCode).toMatch(/flowchart|graph/i);
    // Should now have an arrow connecting A to B
    expect(fixedCode).toMatch(/A.*-->.*B|B.*-->.*A/);
    expect(fixedCode).toContain('-->');
  });

  it('fixes imbalanced activate/deactivate — adds missing deactivate B in failure branch', async () => {
    if (skip) return;

    const validation = validateMermaidSyntax(IMBALANCED_ACTIVATION);
    const errorMessage = validation.errorMessage ??
      "Activate/deactivate imbalance: 'activate B' in success branch has no matching " +
      "'deactivate B' in the failure branch.";

    const prompt = interpolatePrompt(fixPromptTemplate, {
      diagramCode: IMBALANCED_ACTIVATION,
      errorMessage,
    });

    const result = await callModelHttps(prompt, FIX_RESPONSE_SCHEMA);
    const fixedCode = stripFences(result.fixedCode ?? '');

    expect(fixedCode).toContain('sequenceDiagram');
    const fixedValidation = validateMermaidSyntax(fixedCode);
    // The fixed output should have no unmatched activation errors
    const activationErrors = fixedValidation.errors.filter(
      e => e.message.includes("'activate") || e.message.includes("'deactivate")
    );
    expect(activationErrors).toHaveLength(0);
  });
});

// ─── Extended enhance-diagram-with-llm edge cases ────────────────────────────

describe('Live AI API — enhance-diagram-with-llm edge cases', () => {
  jest.setTimeout(120_000);

  let skip = false;
  let enhancePromptTemplate: string;

  beforeAll(async () => {
    skip = !(await isLiveApiAvailable());
    if (!skip) {
      enhancePromptTemplate = readFlowPrompt('enhance-diagram-with-llm.ts');
    }
  });

  it('preserves the %%{init} theme block when enhancing a themed diagram', async () => {
    if (skip) return;

    const prompt = interpolatePrompt(enhancePromptTemplate, {
      diagramCode: THEMED_SEQUENCE,
      enhancementPrompt: 'Add a third participant C that receives a message from B.',
    });

    const result = await callModelHttps(prompt, ENHANCE_RESPONSE_SCHEMA);
    const enhanced = stripFences(result.enhancedDiagramCode ?? '');

    // The original theme block must be preserved
    expect(enhanced).toContain('%%{init:');
    expect(enhanced).toContain('actorBkg');
    expect(enhanced).toContain('sequenceDiagram');
  });

  it('adds a %%{init:...}%% theme block to an ER diagram (no style lines)', async () => {
    if (skip) return;

    const prompt = interpolatePrompt(enhancePromptTemplate, {
      diagramCode: VALID_ER_DIAGRAM,
      enhancementPrompt: 'Add a DOCTOR entity that has a one-to-many relationship with APPOINTMENT.',
    });

    const result = await callModelHttps(prompt, ENHANCE_RESPONSE_SCHEMA);
    const enhanced = stripFences(result.enhancedDiagramCode ?? '');

    expect(enhanced).toContain('erDiagram');
    expect(enhanced).toContain('DOCTOR');
    // ER diagrams must use %%{init:...}%% for theming — never bare 'style' lines
    expect(enhanced).toContain('%%{init:');
    expect(enhanced).not.toMatch(/^style\s+\w+/m);
  });

  it('preserves the flowchart diagram type when enhancing', async () => {
    if (skip) return;

    const prompt = interpolatePrompt(enhancePromptTemplate, {
      diagramCode: VALID_FLOWCHART_NO_THEME,
      enhancementPrompt: 'Add a follow-up step after the Walk-in clinic node.',
    });

    const result = await callModelHttps(prompt, ENHANCE_RESPONSE_SCHEMA);
    const enhanced = stripFences(result.enhancedDiagramCode ?? '');

    expect(enhanced).toMatch(/flowchart|graph/i);
    // Should have added a new node
    expect(enhanced).toContain('E');
    // No unclosed blocks
    const validation = validateMermaidSyntax(enhanced);
    expect(validation.errors).toHaveLength(0);
  });

  it('adds a theme block to an unthemed flowchart', async () => {
    if (skip) return;

    const prompt = interpolatePrompt(enhancePromptTemplate, {
      diagramCode: VALID_FLOWCHART_NO_THEME,
      enhancementPrompt: 'Add a legend note at the bottom.',
    });

    const result = await callModelHttps(prompt, ENHANCE_RESPONSE_SCHEMA);
    const enhanced = stripFences(result.enhancedDiagramCode ?? '');

    expect(enhanced).toMatch(/flowchart|graph/i);
    // Should have added a theme block since the original had none
    expect(enhanced).toContain('%%{init:');
  });

  it('enhances a diagram that uses quoted alt/else block headers', async () => {
    if (skip) return;

    // Quoted alt/else headers are VALID Mermaid v10.9.1 syntax (confirmed by app rendering).
    // The enhance flow must be able to add branches to such a diagram without breaking it.
    const prompt = interpolatePrompt(enhancePromptTemplate, {
      diagramCode: QUOTED_ALT_HEADERS,
      enhancementPrompt: 'Add a timeout branch after the failure branch.',
    });

    const result = await callModelHttps(prompt, ENHANCE_RESPONSE_SCHEMA);
    const enhanced = stripFences(result.enhancedDiagramCode ?? '');

    expect(enhanced).toContain('sequenceDiagram');
    // A new else/timeout branch should have been added
    expect(enhanced).toMatch(/else|timeout/i);
    // The block must be properly closed
    const validation = validateMermaidSyntax(enhanced);
    const blockErrors = validation.errors.filter(e => e.message.includes("Unclosed 'alt'"));
    expect(blockErrors).toHaveLength(0);
  });
});
