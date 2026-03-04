import type { NextApiRequest, NextApiResponse } from 'next';
import { generateDiagram } from '@/ai/flows/generate-diagram-from-description';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body as { prompt?: string };

  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  try {
    const result = await generateDiagram({ description: prompt });
    return res.status(200).json({ mermaidCode: result.mermaidCode });
  } catch (err) {
    console.error('[generate] AI generation failed:', err);
    return res.status(500).json({ error: 'Diagram generation failed' });
  }
}
