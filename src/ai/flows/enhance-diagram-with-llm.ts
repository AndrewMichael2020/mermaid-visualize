'use server';
/**
 * @fileOverview A flow that enhances a Mermaid diagram based on LLM suggestions.
 *
 * - enhanceDiagramWithLLM - A function that enhances a Mermaid diagram.
 * - EnhanceDiagramWithLLMInput - The input type for the enhanceDiagramWithLLM function.
 * - EnhanceDiagramWithLLMOutput - The return type for the enhanceDiagramWithLLM function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EnhanceDiagramWithLLMInputSchema = z.object({
  diagramCode: z.string().describe('The Mermaid diagram code to enhance.'),
  enhancementPrompt: z.string().describe('A prompt describing the desired enhancements to the diagram.'),
});
export type EnhanceDiagramWithLLMInput = z.infer<typeof EnhanceDiagramWithLLMInputSchema>;

const EnhanceDiagramWithLLMOutputSchema = z.object({
  enhancedDiagramCode: z.string().describe('The enhanced Mermaid diagram code.'),
});
export type EnhanceDiagramWithLLMOutput = z.infer<typeof EnhanceDiagramWithLLMOutputSchema>;

export async function enhanceDiagramWithLLM(input: EnhanceDiagramWithLLMInput): Promise<EnhanceDiagramWithLLMOutput> {
  return enhanceDiagramWithLLMFlow(input);
}

const enhanceDiagramWithLLMPrompt = ai.definePrompt({
  name: 'enhanceDiagramWithLLMPrompt',
  input: {schema: EnhanceDiagramWithLLMInputSchema},
  output: {schema: EnhanceDiagramWithLLMOutputSchema},
  model: 'googleai/gemini-2.5-flash-lite',
  prompt: `You are an expert in Mermaid diagrams.

  The user will provide you with a Mermaid diagram code and a prompt describing desired enhancements.
  Your task is to enhance the diagram code based on the prompt.

  When the user asks to "add 'X' under 'Y'", you should interpret this as a hierarchical relationship. Create a new node for 'X' and draw a one-way arrow from 'Y' to 'X' (e.g., Y --> X). Do not create loops or bidirectional arrows unless specifically asked.

  IMPORTANT THEMING GUIDELINES:
  1. If the original diagram code contains a theme initialization block (%%{init: {...}}%%), PRESERVE it in your output.
  2. If the original diagram does NOT have a theme block and the diagram type is NOT erDiagram (ER diagrams), ADD a theme initialization block at the beginning.
     
     For flowchart/graph, classDiagram, stateDiagram use:
     %%{init: {
       "theme": "base",
       "themeVariables": {
         "primaryColor": "#E6F7FF",
         "primaryBorderColor": "#0A84C1",
         "primaryTextColor": "#003A57",
         "secondaryColor": "#EAF7EA",
         "secondaryBorderColor": "#4CAF50",
         "secondaryTextColor": "#1B5E20",
         "tertiaryColor": "#FFF8D6",
         "tertiaryBorderColor": "#D69E00",
         "tertiaryTextColor": "#705400",
         "lineColor": "#0A84C1",
         "fontFamily": "Inter, sans-serif"
       }
     }}%%
     
     For sequenceDiagram use:
     %%{init: {
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
     
     For other diagram types (timeline, gantt, gitGraph, journey, mindmap, pie), use the flowchart themeVariables format as a base.
     
  3. For erDiagram (ER diagrams), do NOT add or modify any theme blocks. Keep the code clean without styling.
  4. If the user specifically requests color or theme changes, update the themeVariables accordingly.
  5. You MAY also use classDef and class styling for flowcharts when appropriate.

  Original Diagram Code:
  '''mermaid
  {{{diagramCode}}}
  '''

  Enhancement Request: {{{enhancementPrompt}}}

  Please provide the full, enhanced Mermaid diagram code below.
  `,
});

const enhanceDiagramWithLLMFlow = ai.defineFlow(
  {
    name: 'enhanceDiagramWithLLMFlow',
    inputSchema: EnhanceDiagramWithLLMInputSchema,
    outputSchema: EnhanceDiagramWithLLMOutputSchema,
  },
  async input => {
    let output;
    try {
      const result = await enhanceDiagramWithLLMPrompt(input);
      output = result.output;
    } catch (err) {
      // Log full error server-side for diagnosis and return a safe message to callers
      // so production builds don't leak sensitive details in the client error.
      console.error('LLM request failed in enhanceDiagramWithLLMFlow:', err);
      throw new Error('Diagram enhancement failed: upstream language model error.');
    }

    let enhancedCode = output!.enhancedDiagramCode;
    // The model sometimes wraps the code in ```mermaid ... ```, so we should strip that.
    // Preserve theme/styling blocks and classDef commands.
    const codeBlockRegex = /'''(?:mermaid)?\s*([\s\S]*?)\s*'''/;
    const match = codeBlockRegex.exec(enhancedCode);
    if (match) {
      enhancedCode = match[1].trim();
    }

    // Also remove markdown code fences (backticks) if present
    // The regex above handles triple quotes ('''), but model may also use backticks
    enhancedCode = enhancedCode
      .replace(/```mermaid/g, '')
      .replace(/```/g, '')
      .trim();

    return {
      enhancedDiagramCode: enhancedCode,
    };
  }
);
