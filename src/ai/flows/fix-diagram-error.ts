'use server';
/**
 * @fileOverview AI flow that attempts to fix a broken Mermaid diagram.
 *
 * Called exactly once per error — no retry loops.
 * Returns the corrected code and a plain-English explanation of the fix.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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

export async function fixDiagramError(input: FixDiagramErrorInput): Promise<FixDiagramErrorOutput> {
  return fixDiagramErrorFlow(input);
}

const fixDiagramErrorPrompt = ai.definePrompt({
  name: 'fixDiagramErrorPrompt',
  input: {schema: FixDiagramErrorInputSchema},
  output: {schema: FixDiagramErrorOutputSchema},
  model: 'googleai/gemini-2.5-flash-lite',
  prompt: `You are an expert Mermaid diagram debugger. A diagram has failed to parse or render.

Your task:
1. Read the broken diagram code and the exact error message carefully.
2. Identify the root cause — do NOT guess broadly; use the error to pinpoint the exact line or token.
3. Produce a corrected version of the diagram that is valid Mermaid syntax.
4. Write one concise sentence (max 20 words) explaining what was wrong and what you changed.

Rules:
- Output ONLY raw Mermaid code in fixedCode — no markdown fences, no triple quotes, no backticks.
- Preserve the diagram type (flowchart, sequenceDiagram, etc.) and overall intent.
- Preserve any %%{init: ...}%% theme blocks.
- If the error is an unsupported diagram type or fundamentally unrecoverable, output the closest valid equivalent and note it in explanation.
- Do not add features or change the diagram beyond what is needed to fix the error.

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
