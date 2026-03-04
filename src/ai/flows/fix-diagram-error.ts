'use server';
/**
 * @fileOverview AI flow that attempts to fix a broken Mermaid diagram.
 *
 * Called exactly once per error — no retry loops.
 * Returns the corrected code and a plain-English explanation of the fix.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {AI_MODELS} from '@/ai/model-config';
import type {TokenUsage} from '@/lib/cost-estimator';

const FixDiagramErrorInputSchema = z.object({
  diagramCode: z.string().describe('The Mermaid diagram code that failed to render.'),
  errorMessage: z.string().describe('The exact error thrown by the Mermaid parser or renderer.'),
});
export type FixDiagramErrorInput = z.infer<typeof FixDiagramErrorInputSchema>;

const FixDiagramErrorOutputSchema = z.object({
  fixedCode: z.string().describe('Corrected, valid Mermaid diagram code.'),
  explanation: z.string().describe('One concise sentence describing what was wrong and what was changed.'),
});
export type FixDiagramErrorOutput = z.infer<typeof FixDiagramErrorOutputSchema>;

/** Extended return type that includes actual token usage from the API. */
export interface FixDiagramErrorResult extends FixDiagramErrorOutput {
  usage: TokenUsage;
}

export async function fixDiagramError(input: FixDiagramErrorInput): Promise<FixDiagramErrorResult> {
  let result;
  try {
    result = await fixDiagramErrorPrompt(input);
  } catch (err) {
    console.error('LLM request failed in fixDiagramError:', err);
    throw new Error('Diagram fix failed: upstream language model error.');
  }

  const output = result.output!;
  // Strip any code fences the model may have added despite instructions.
  const fixedCode = output.fixedCode
    .replace(/^```(?:mermaid)?/gm, '')
    .replace(/^'''/gm, '')
    .replace(/```$/gm, '')
    .replace(/'''$/gm, '')
    .trim();

  return {
    fixedCode,
    explanation: output.explanation.trim(),
    usage: {
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
    },
  };
}

const fixDiagramErrorPrompt = ai.definePrompt({
  name: 'fixDiagramErrorPrompt',
  input: {schema: FixDiagramErrorInputSchema},
  output: {schema: FixDiagramErrorOutputSchema},
  model: AI_MODELS.DIAGRAM_FIX.model,
  config: AI_MODELS.DIAGRAM_FIX.config,
  prompt: `You are an expert Mermaid diagram debugger targeting the Mermaid v10.9.1 Langium-based parser. A diagram has failed to parse or render.

Your task:
1. Read the broken diagram code and the exact error message carefully.
2. Identify the root cause — do NOT guess broadly; use the error to pinpoint the exact line or token.
3. Produce a corrected version of the diagram that is valid Mermaid v10.9.1 syntax.
4. Write one concise sentence (max 20 words) explaining what was wrong and what you changed.

Rules:
- Output ONLY raw Mermaid code in fixedCode — no markdown fences, no triple quotes, no backticks.
- Preserve the diagram type (flowchart, sequenceDiagram, etc.) and overall intent.
- Preserve any %%{init: ...}%% theme blocks.
- If the error is an unsupported diagram type or fundamentally unrecoverable, output the closest valid equivalent and note it in explanation.
- Do not add features or change the diagram beyond what is needed to fix the error.

MERMAID v10.9.1 COMMON FIXES to apply while correcting:
- Use plain text or quoted text for logic-block headers — both are valid: alt label  OR  alt "label"
- Use plain text for message labels after colons — do NOT wrap in quotes: A->>B: label
- Strip parentheses (), slashes /, and backslashes \ from all labels to prevent parse errors
- Use short plain IDs with "as" for participant display labels: participant P as "Patient (User)"
- Remove any embedded URLs, HTML tags, or Markdown formatting from labels; use %% comments for references
- Verify that the count of alt/loop/opt/par/critical/break/subgraph keywords exactly equals the count of "end" keywords
- OPT vs ALT — CRITICAL DISTINCTION: 'opt' represents a single optional path with NO else branch; placing 'else' inside 'opt' is a syntax error. If the broken diagram uses 'else' inside 'opt', change 'opt' to 'alt' to fix it. Use 'opt' only for a single optional block with no branching.
- In sequence diagrams, balance activate/deactivate on EVERY branch path: a deactivate in one alt/else branch does NOT automatically deactivate in sibling branches — each branch is evaluated independently from the state that existed when the alt/opt block opened, so every branch must handle its own activate/deactivate lifecycle; participants left active in any branch remain active after the block closes
- Do not mix shorthand arrow activation (->+ / ->-) with explicit activate/deactivate statements in the same diagram; prefer explicit forms for complex scopes
- Do not use curly/smart quotes in any label; use only standard straight apostrophes ' if needed
- STYLE KEYWORD SCOPE: The 'style' keyword (e.g., "style NodeA fill:#F00") is ONLY valid in flowchart/graph diagrams.
  If the broken diagram uses 'style' lines in a sequenceDiagram, erDiagram, classDiagram, stateDiagram, gantt,
  timeline, mindmap, pie, gitGraph, or journey — REMOVE those style lines. Replace them with a %%{init: ...}%%
  directive using theme: base and themeVariables (e.g., "primaryColor" for entity/node fill color).

Broken diagram code:
{{{diagramCode}}}

Exact error from Mermaid:
{{{errorMessage}}}

Respond with the corrected Mermaid code and a brief explanation.
`,
});

const fixDiagramErrorFlow = ai.defineFlow(
  {
    name: 'fixDiagramErrorFlow',
    inputSchema: FixDiagramErrorInputSchema,
    outputSchema: FixDiagramErrorOutputSchema,
  },
  async (input) => {
    let output;
    try {
      const result = await fixDiagramErrorPrompt(input);
      output = result.output;
    } catch (err) {
      console.error('LLM request failed in fixDiagramErrorFlow:', err);
      throw new Error('Diagram fix failed: upstream language model error.');
    }

    // Strip any code fences the model may have added despite instructions
    let fixedCode = output!.fixedCode
      .replace(/^```(?:mermaid)?/gm, '')
      .replace(/^'''/gm, '')
      .replace(/```$/gm, '')
      .replace(/'''$/gm, '')
      .trim();

    return {
      fixedCode,
      explanation: output!.explanation.trim(),
    };
  }
);
