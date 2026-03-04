import { createMocks } from 'node-mocks-http';
import handler from '../generate';

// Mock the AI flow — no real network calls in tests
jest.mock('@/ai/flows/generate-diagram-from-description', () => ({
  generateDiagram: jest.fn(),
}));

import { generateDiagram } from '@/ai/flows/generate-diagram-from-description';
const mockGenerate = generateDiagram as jest.MockedFunction<typeof generateDiagram>;

describe('POST /api/generate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 405 for non-POST methods', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(405);
  });

  it('returns 400 when prompt is missing', async () => {
    const { req, res } = createMocks({ method: 'POST', body: {} });
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(400);
  });

  it('returns 200 with mermaid code', async () => {
    mockGenerate.mockResolvedValueOnce({
      mermaidCode: 'graph TD\n  A --> B',
      usage: { inputTokens: 10, outputTokens: 20 },
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: { prompt: 'A simple flowchart with start and end' },
    });

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(data).toHaveProperty('mermaidCode');
    expect(typeof data.mermaidCode).toBe('string');
    expect(data.mermaidCode.length).toBeGreaterThan(0);
  });

  it('returns 200 with a non-empty diagram for any prompt', async () => {
    mockGenerate.mockResolvedValueOnce({
      mermaidCode: 'graph TD\n  A --> B --> C',
      usage: { inputTokens: 10, outputTokens: 20 },
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: { prompt: 'Patient accesses care via phone or in person' },
    });

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(data).toHaveProperty('mermaidCode');
    expect(data.mermaidCode).toMatch(/graph|sequenceDiagram|flowchart/i);
  });
});
