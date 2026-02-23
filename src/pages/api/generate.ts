import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { prompt } = req.body;

  // TODO: Add actual AI logic here to generate Mermaid code from the prompt
  console.log(`Received prompt for generation: ${prompt}`);

  // Mock response
  const mermaidCode = `graph TD;
    A[Start] --> B{Is it?};
    B -- Yes --> C[OK];
    C --> D[End];
    B -- No --> E[End];`;

  res.status(200).json({ mermaidCode });
}
