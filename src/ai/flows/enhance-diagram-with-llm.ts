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
import {AI_MODELS} from '@/ai/model-config';
import type {TokenUsage} from '@/lib/cost-estimator';
import {formatMermaidCode} from '@/lib/mermaid-formatter';

const EnhanceDiagramWithLLMInputSchema = z.object({
  diagramCode: z.string().describe('The Mermaid diagram code to enhance.'),
  enhancementPrompt: z.string().describe('A prompt describing the desired enhancements to the diagram.'),
});
export type EnhanceDiagramWithLLMInput = z.infer<typeof EnhanceDiagramWithLLMInputSchema>;

const EnhanceDiagramWithLLMOutputSchema = z.object({
  enhancedDiagramCode: z.string().describe('The enhanced Mermaid diagram code.'),
});
export type EnhanceDiagramWithLLMOutput = z.infer<typeof EnhanceDiagramWithLLMOutputSchema>;

/** Extended return type that includes actual token usage from the API. */
export interface EnhanceDiagramWithLLMResult extends EnhanceDiagramWithLLMOutput {
  usage: TokenUsage;
}

export async function enhanceDiagramWithLLM(input: EnhanceDiagramWithLLMInput): Promise<EnhanceDiagramWithLLMResult> {
  const result = await enhanceDiagramWithLLMPrompt(input);
  return {
    ...result.output!,
    usage: {
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
    },
  };
}

const enhanceDiagramWithLLMPrompt = ai.definePrompt({
  name: 'enhanceDiagramWithLLMPrompt',
  input: {schema: EnhanceDiagramWithLLMInputSchema},
  output: {schema: EnhanceDiagramWithLLMOutputSchema},
  model: AI_MODELS.DIAGRAM_ENHANCEMENT.model,
  config: AI_MODELS.DIAGRAM_ENHANCEMENT.config,
  prompt: `You are an expert in Mermaid diagrams targeting the Mermaid v10.9.1 Langium-based parser.

  The user will provide you with a Mermaid diagram code and a prompt describing desired enhancements.
  Your task is to enhance the diagram code based on the prompt.

  When the user asks to "add 'X' under 'Y'", you should interpret this as a hierarchical relationship. Create a new node for 'X' and draw a one-way arrow from 'Y' to 'X' (e.g., Y --> X). Do not create loops or bidirectional arrows unless specifically asked.

  MERMAID v10.9.1 SYNTAX RULES (CRITICAL — apply to all new and existing content):

  1. QUOTING RULES: To prevent parse errors in Mermaid v10.9.1, follow these rules exactly:
     - alt, else, loop, opt, par, critical, break, and subgraph block headers MAY be plain text or
       quoted. Either form is valid: alt User is authenticated  OR  alt "User is authenticated"
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

  4.1. OPT vs ALT — CRITICAL DISTINCTION: In sequence diagrams, 'opt' represents a single optional path
      with NO else branch. Never place an 'else' inside an 'opt' block — this is a syntax error.
      Use 'alt' (alternative) when you need if/else logic with two or more branches.
      Correct: alt Condition / ... / else Other / ... / end
      Wrong:   opt Condition / ... / else Other / ... / end

  5. SEQUENCE DIAGRAM ACTIVATION BALANCE: In sequence diagrams, balance activate/deactivate on EVERY branch path.
     A deactivate in one alt/else branch does NOT automatically deactivate in sibling branches — each branch is
     evaluated independently from the activation state that existed when the alt/opt block opened, so EVERY branch
     must handle its own activate/deactivate lifecycle. Participants left active in any branch remain active after
     the block closes. Do NOT mix shorthand arrow activation (->+ / ->-) with explicit activate/deactivate
     statements in the same diagram; prefer the explicit form for complex scopes.
     OUTER SCOPE RULE: If a participant is activated BEFORE an alt/loop/opt block and deactivated AFTER the
     closing 'end', keep that outer pair in place — do NOT move it inside branches. Only add missing
     activate/deactivate for other participants inside branches that need them.

  5.1. NODE LABEL SPECIAL CHARACTERS: If a node label contains parentheses, brackets, or other special characters,
       wrap the label in double quotes.
       Example: A["Node with (parentheses)"] --> B["Another Node"]
       - NEVER include a bare '>' or '<' inside a node label — even inside double quotes it breaks the parser.
         Rewrite comparisons in plain English: use "more than 5 min" instead of ">5 min".

  5.2. CLASSDEF INTEGRITY — CRITICAL: Every node referenced in a 'class' statement MUST have a matching
       'classDef' definition. Before emitting any 'class NodeID styleName' line, verify that
       'classDef styleName ...' appears earlier in the diagram. Never assign a node to an undefined
       classDef name (e.g., do NOT write 'class EN intermediateState' if 'intermediateState' has no
       matching 'classDef intermediateState ...' line — either add the classDef or remove the class assignment).
       When enhancing an existing diagram, audit ALL existing 'class' assignments to ensure their classDefs exist.

  THEMING GUIDELINES:
  6. STYLE KEYWORD SCOPE — CRITICAL: The 'style' keyword (e.g., "style NodeA fill:#F00") is ONLY valid inside
     flowchart/graph diagrams. It is NOT supported in sequenceDiagram, erDiagram, classDiagram, stateDiagram,
     gantt, timeline, mindmap, pie, gitGraph, journey, or any other type. If the input diagram uses 'style'
     lines outside of a flowchart/graph, REMOVE them and use a %%{init: ...}%% directive instead.
  7. If the original diagram code contains a theme initialization block (%%{init: {...}}%%), PRESERVE it in your output.
  8. If the original diagram does NOT have a theme block, ADD a %%{init: ...}%% block at the very beginning.

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

     For erDiagram use (colors apply globally to all entities — individual entity colors are not supported):
     %%{init: {
       "theme": "base",
       "themeVariables": {
         "primaryColor": "#E6F7FF",
         "primaryBorderColor": "#0A84C1",
         "lineColor": "#0A84C1",
         "fontFamily": "Inter, sans-serif"
       }
     }}%%

     For other diagram types (timeline, gantt, gitGraph, journey, mindmap, pie), use the flowchart themeVariables format as a base.

  9. If the user specifically requests color or theme changes, update the themeVariables accordingly.
     For erDiagram, set "primaryColor" to the requested hex value — individual entity colors are not possible.
  10. You MAY also use classDef and class styling for flowcharts when appropriate.

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
      enhancedDiagramCode: formatMermaidCode(enhancedCode),
    };
  }
);
