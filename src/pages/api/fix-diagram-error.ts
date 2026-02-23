import type { NextApiRequest, NextApiResponse } from 'next';
import { fixDiagramError } from '@/ai/flows/fix-diagram-error';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { diagramCode, errorMessage } = req.body as {
    diagramCode?: string;
    errorMessage?: string;
  };

  if (!diagramCode || !errorMessage) {
    return res.status(400).json({ error: 'diagramCode and errorMessage are required' });
  }

  try {
    const result = await fixDiagramError({ diagramCode, errorMessage });
    return res.status(200).json(result);
  } catch (err) {
    console.error('fix-diagram-error API error:', err);
    return res.status(500).json({ error: 'AI fix attempt failed' });
  }
}
