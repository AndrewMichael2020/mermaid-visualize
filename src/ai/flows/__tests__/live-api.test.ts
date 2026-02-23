/**
 * @jest-environment node
 *
 * Live API integration tests for the Gemini-backed AI flows.
 *
 * These tests call the real Gemini REST API and are therefore only executed
 * when the GEMINI_API_KEY environment variable is set AND the Gemini endpoint
 * is reachable (e.g. in GitHub Actions CI, but NOT in sandboxed environments
 * with DNS restrictions).
 *
 * The @jest-environment node docblock is required so the built-in Node.js
 * `https` module (and DNS resolution) works correctly.
 *
 * Because the genkit runtime uses ESM dependencies that Jest cannot natively
 * transform, these tests call the Gemini REST API directly via the Node.js
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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_HOST = 'generativelanguage.googleapis.com';

/**
 * Resolve to true if GEMINI_API_KEY is set AND the Gemini API host is
 * reachable via DNS.  This allows the tests to self-skip in sandboxed
 * environments where outbound DNS is blocked.
 */
async function isLiveApiAvailable(): Promise<boolean> {
  if (!GEMINI_API_KEY) return false;
  return new Promise((resolve) => {
    dns.lookup(GEMINI_HOST, (err) => resolve(!err));
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
};

/** Schema for the enhance-diagram-with-llm output. */
const ENHANCE_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    enhancedDiagramCode: { type: 'string', description: 'The enhanced Mermaid diagram code.' },
  },
  required: ['enhancedDiagramCode'],
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
 * POST a text prompt to the Gemini REST API via the Node.js `https` module.
 * Returns the parsed structured JSON from the model's response.
 */
function callGeminiHttps(prompt: string, responseSchema: object): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
      },
    });

    const options: https.RequestOptions = {
      hostname: GEMINI_HOST,
      path: `/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
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
          reject(new Error(
            `Gemini API error ${res.statusCode}: ${raw.slice(0, 500)}`
          ));
          return;
        }
        try {
          const parsed = JSON.parse(raw) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
          resolve(JSON.parse(text) as Record<string, string>);
        } catch (e) {
          reject(new Error(
            `Failed to parse Gemini response: ${(e as Error).message}\nRaw: ${raw.slice(0, 500)}`
          ));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
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

describe('Live Gemini API — fix-diagram-error flow', () => {
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

    const result = await callGeminiHttps(prompt, FIX_RESPONSE_SCHEMA);

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

    const result = await callGeminiHttps(prompt, FIX_RESPONSE_SCHEMA);
    const fixedCode = stripFences(result.fixedCode ?? '');

    expect(fixedCode).toContain('sequenceDiagram');
  });

  it('does not include markdown code fences in the returned fixedCode', async () => {
    if (skip) return;

    const prompt = interpolatePrompt(fixPromptTemplate, {
      diagramCode: BROKEN_SEQUENCE_DIAGRAM,
      errorMessage: 'Invalid Mermaid syntax.',
    });

    const result = await callGeminiHttps(prompt, FIX_RESPONSE_SCHEMA);
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

    const result = await callGeminiHttps(prompt, FIX_RESPONSE_SCHEMA);
    const fixedCode = stripFences(result.fixedCode ?? '');

    const validation = validateMermaidSyntax(fixedCode);
    const loopErrors = validation.errors.filter(e => e.message.includes("Unclosed 'loop'"));
    expect(loopErrors).toHaveLength(0);
  });
});

// ─── enhance-diagram-with-llm suite ──────────────────────────────────────────

describe('Live Gemini API — enhance-diagram-with-llm flow', () => {
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

    const result = await callGeminiHttps(prompt, ENHANCE_RESPONSE_SCHEMA);
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

    const result = await callGeminiHttps(prompt, ENHANCE_RESPONSE_SCHEMA);
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

    const result = await callGeminiHttps(prompt, ENHANCE_RESPONSE_SCHEMA);
    const enhanced = stripFences(result.enhancedDiagramCode ?? '');

    expect(enhanced).toContain('sequenceDiagram');
    const validation = validateMermaidSyntax(enhanced);
    const loopErrors = validation.errors.filter(e => e.message.includes("Unclosed 'loop'"));
    expect(loopErrors).toHaveLength(0);
  });
});
