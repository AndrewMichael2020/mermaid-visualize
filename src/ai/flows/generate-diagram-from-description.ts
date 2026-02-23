'use server';
/**
 * @fileOverview Generates Mermaid diagram code from a natural language description.
 *
 * - generateDiagram - A function that takes a natural language description and returns Mermaid diagram code.
 * - GenerateDiagramInput - The input type for the generateDiagram function.
 * - GenerateDiagramOutput - The return type for the generateDiagram function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDiagramInputSchema = z.object({
  description: z.string().describe('A natural language description of the diagram.'),
});
export type GenerateDiagramInput = z.infer<typeof GenerateDiagramInputSchema>;

const GenerateDiagramOutputSchema = z.object({
  mermaidCode: z.string().describe('The Mermaid code for the diagram.'),
});
export type GenerateDiagramOutput = z.infer<typeof GenerateDiagramOutputSchema>;

export async function generateDiagram(input: GenerateDiagramInput): Promise<GenerateDiagramOutput> {
  return generateDiagramFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDiagramPrompt',
  input: {schema: GenerateDiagramInputSchema},
  output: {schema: GenerateDiagramOutputSchema},
  model: 'googleai/gemini-2.5-flash-lite',
  prompt: `You are an expert in Mermaid syntax targeting the Mermaid v10.9.1 Langium-based parser.

  You will generate Mermaid code based on the user's description. Ensure the generated code is valid for Mermaid v10.9.1.

  MERMAID v10.9.1 SYNTAX RULES (CRITICAL — follow these exactly to avoid parse errors):

  1. MINIMALIST QUOTING (STRICT): To prevent parse errors in Mermaid v10.9.1, follow these rules exactly:
     - DO NOT wrap alt, else, loop, opt, par, critical, break, or subgraph block headers in quotes.
       Use plain text labels: e.g., alt Access via Phone ... else Access in Person ... end
     - DO NOT wrap message labels after a colon in quotes.
       e.g., A->>B: Request Care  (NOT: A->>B: "Request Care")
     - STRIP SPECIAL CHARACTERS: Remove parentheses (), slashes /, and backslashes \ from all labels.
       e.g., use Same day 12hrs instead of Same-day (12hrs)
     - NO SMART QUOTES: Do not use curly/smart quotes (\u2018\u2019\u201C\u201D). Use only standard
       straight apostrophes ' when strictly necessary, but prefer removing them entirely.
       e.g., use medical home instead of 'medical home'

  2. ID/LABEL SEPARATION FOR PARTICIPANTS/ACTORS: Use short, plain IDs (no spaces or special characters) and
     the "as" keyword to set human-readable display labels in double quotes.
     Example: participant AD as "Admin (Support)"  — NOT: actor Admin (Support)
     This prevents the parser from misinterpreting parentheses and slashes in participant names.

  3. NO URLS OR MARKDOWN FORMATTING INSIDE NODES: Do not embed URLs, HTML tags (<a>, <b>), or Markdown
     formatting (bold **, italics *) inside node labels or messages. If a reference is needed, add it as a
     plain-text comment outside the diagram using %% (e.g., %% Source: example.com).

  4. BLOCK CLOSURE VERIFICATION: Before outputting, count the number of alt, loop, opt, par, critical, break,
     and subgraph keywords in the diagram. Ensure an exactly equal number of "end" keywords are present.
     Missing or extra "end" keywords make the entire diagram unparseable.

  5. NODE LABEL SPECIAL CHARACTERS: If a node label contains parentheses, brackets, or other special characters,
     wrap the label in double quotes.
     Example: A["Node with (parentheses)"] --> B["Another Node"]

  6. THEMING AND COLORS: For all diagram types EXCEPT erDiagram (ER diagrams), include a theme initialization
     block at the very beginning of the code with colorful styling.
     
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
      
  7. For erDiagram (ER diagrams), do NOT include any theme initialization block. Keep the code clean without styling.

  Description: {{{description}}}`,
});

const generateDiagramFlow = ai.defineFlow(
  {
    name: 'generateDiagramFlow',
    inputSchema: GenerateDiagramInputSchema,
    outputSchema: GenerateDiagramOutputSchema,
  },
  async input => {
    let output;
    try {
      const result = await prompt(input);
      output = result.output;
    } catch (err) {
      // Log full error server-side for diagnosis and return a safe message to callers
      // so production builds don't leak sensitive details in the client error.
      // The original stack and message will appear in Cloud Run logs.
      console.error('LLM request failed in generateDiagramFlow:', err);
      throw new Error('Diagram generation failed: upstream language model error.');
    }

    // Clean up markdown code fences if present, but preserve theme/styling blocks
    if (output && output.mermaidCode) {
      output.mermaidCode = output.mermaidCode
        .replace(/```mermaid/g, '')
        .replace(/```/g, '')
        .trim();
    }

    return output!;
  }
);
