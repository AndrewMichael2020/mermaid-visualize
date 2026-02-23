import type { NextApiRequest, NextApiResponse } from 'next';
import { enhanceDiagramWithLLM } from '@/ai/flows/enhance-diagram-with-llm';
import { validateMermaidSyntax } from '@/lib/mermaid-validator';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mermaidCode: existingCode, prompt } = req.body as {
    mermaidCode?: string;
    prompt?: string;
  };

  if (!existingCode || !prompt) {
    return res.status(400).json({ error: 'mermaidCode and prompt are required' });
  }

  // Run a structural pre-check so the AI is aware of any existing issues
  const validation = validateMermaidSyntax(existingCode);
  let enhancementPrompt = prompt;
  if (!validation.valid) {
    console.error(
      '[enhance] Input diagram has structural issues before enhancement:\n',
      validation.errorMessage
    );
    enhancementPrompt =
      `${prompt}\n\n` +
      `IMPORTANT — the current diagram has the following syntax errors that ` +
      `MUST be fixed in your output:\n${validation.errorMessage}`;
  }

  try {
    const result = await enhanceDiagramWithLLM({
      diagramCode: existingCode,
      enhancementPrompt,
    });
    return res.status(200).json({ mermaidCode: result.enhancedDiagramCode });
  } catch (err) {
    console.error('[enhance] AI enhancement failed:', err);
    return res.status(500).json({ error: 'Diagram enhancement failed' });
  }
}
