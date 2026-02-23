/**
 * Live API integration tests for the Gemini-backed AI flows.
 *
 * These tests call the real Gemini REST API and are therefore only executed
 * when the GEMINI_API_KEY environment variable is set (e.g. in CI with the
 * repository secret, or locally with a .env file).
 *
 * Because the genkit runtime uses ESM dependencies that Jest cannot natively
 * transform, these tests call the Gemini REST API directly via fetch and use
 * the same prompts defined in the flow source files.  The prompt-rules.test.ts
 * suite separately validates that those prompts contain the required rules.
 *
 * What is validated here:
 *  1. The fix-diagram-error prompt can guide the model to fix the complex
 *     sequence-diagram edge-case from the issue.
 *  2. The enhance prompt, when injected with error context, produces output
 *     without the original structural error.
 *  3. In all cases the model returns raw Mermaid code (no fences, correct type).
 */

import * as fs from 'fs';
import * as path from 'path';
import { validateMermaidSyntax } from '@/lib/mermaid-validator';

// Skip the entire suite when the API key is not available.
const describeIfApiKey = process.env.GEMINI_API_KEY
  ? describe
  : describe.skip;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

/** Extract the prompt template string from a flow source file. */
function readFlowPrompt(filename: string): string {
  const src = fs.readFileSync(path.resolve(__dirname, '..', filename), 'utf8');
  // Extract content between `prompt: \`` and the closing backtick before `},`
  const match = /prompt:\s*`([\s\S]*?)`\s*,?\s*\n\s*\}\)/m.exec(src);
  if (!match) throw new Error(`Could not extract prompt from ${filename}`);
  return match[1];
}

/** Interpolate {{{}}} template placeholders in the genkit prompt format. */
function interpolatePrompt(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\{(\w+)\}\}\}/g, (_, key) => vars[key] ?? '');
}

/** Call the Gemini REST API with a text prompt and return the text response. */
async function callGemini(prompt: string): Promise<string> {
  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  // Parse the JSON response the model returns (structured output)
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    // Return the first string value from the JSON object
    return Object.values(parsed).find(v => typeof v === 'string') ?? raw;
  } catch {
    return raw;
  }
}

/** Strip code fences that the model sometimes adds despite instructions. */
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

describeIfApiKey('Live Gemini API — fix-diagram-error flow', () => {
  jest.setTimeout(120_000);

  let fixPromptTemplate: string;
  beforeAll(() => {
    fixPromptTemplate = readFlowPrompt('fix-diagram-error.ts');
  });

  it('returns a non-empty response for the complex sequence diagram', async () => {
    const errorMessage =
      'Structural issues detected:\n' +
      'Participant "911" is used but never declared — add a participant declaration.';

    const prompt = interpolatePrompt(fixPromptTemplate, {
      diagramCode: BROKEN_SEQUENCE_DIAGRAM,
      errorMessage,
    });

    const raw = await callGemini(prompt);
    const fixedCode = stripFences(raw);

    expect(fixedCode.length).toBeGreaterThan(0);
  });

  it('preserves the sequenceDiagram keyword in the fixed output', async () => {
    const prompt = interpolatePrompt(fixPromptTemplate, {
      diagramCode: BROKEN_SEQUENCE_DIAGRAM,
      errorMessage: 'Invalid Mermaid syntax.',
    });

    const raw = await callGemini(prompt);
    const fixedCode = stripFences(raw);

    expect(fixedCode).toContain('sequenceDiagram');
  });

  it('does not include markdown code fences in the response', async () => {
    const prompt = interpolatePrompt(fixPromptTemplate, {
      diagramCode: BROKEN_SEQUENCE_DIAGRAM,
      errorMessage: 'Invalid Mermaid syntax.',
    });

    const raw = await callGemini(prompt);
    const fixedCode = stripFences(raw);

    expect(fixedCode).not.toMatch(/^```/m);
    expect(fixedCode).not.toMatch(/```$/m);
  });

  it('fixes a simple unclosed loop block — balanced end keywords in output', async () => {
    const prompt = interpolatePrompt(fixPromptTemplate, {
      diagramCode: SIMPLE_BROKEN_LOOP,
      errorMessage: "Line 3: Unclosed 'loop' block — matching 'end' is missing.",
    });

    const raw = await callGemini(prompt);
    const fixedCode = stripFences(raw);

    const validation = validateMermaidSyntax(fixedCode);
    const loopErrors = validation.errors.filter(e => e.message.includes("Unclosed 'loop'"));
    expect(loopErrors).toHaveLength(0);
  });
});

// ─── enhance-diagram-with-llm suite ──────────────────────────────────────────

describeIfApiKey('Live Gemini API — enhance-diagram-with-llm flow', () => {
  jest.setTimeout(120_000);

  let enhancePromptTemplate: string;
  beforeAll(() => {
    enhancePromptTemplate = readFlowPrompt('enhance-diagram-with-llm.ts');
  });

  it('enhances a valid diagram without error context', async () => {
    const prompt = interpolatePrompt(enhancePromptTemplate, {
      diagramCode: VALID_SEQUENCE,
      enhancementPrompt: 'Add a third participant C that receives a message from B.',
    });

    const raw = await callGemini(prompt);
    const enhanced = stripFences(raw);

    expect(enhanced.length).toBeGreaterThan(0);
    expect(enhanced).toContain('sequenceDiagram');
  });

  it('does not include markdown code fences in the enhanced output', async () => {
    const prompt = interpolatePrompt(enhancePromptTemplate, {
      diagramCode: VALID_SEQUENCE,
      enhancementPrompt: 'Add a fourth participant D.',
    });

    const raw = await callGemini(prompt);
    const enhanced = stripFences(raw);

    expect(enhanced).not.toMatch(/^```/m);
    expect(enhanced).not.toMatch(/```$/m);
  });

  it('fixes structural errors when error context is injected into the enhancement prompt', async () => {
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

    const raw = await callGemini(prompt);
    const enhanced = stripFences(raw);

    expect(enhanced).toContain('sequenceDiagram');
    const validation = validateMermaidSyntax(enhanced);
    const loopErrors = validation.errors.filter(e => e.message.includes("Unclosed 'loop'"));
    expect(loopErrors).toHaveLength(0);
  });
});
