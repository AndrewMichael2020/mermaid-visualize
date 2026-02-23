import { createMocks } from 'node-mocks-http';
import handler from '../enhance';

// Mock the AI flow — no real network calls in tests
jest.mock('@/ai/flows/enhance-diagram-with-llm', () => ({
  enhanceDiagramWithLLM: jest.fn(),
}));

import { enhanceDiagramWithLLM } from '@/ai/flows/enhance-diagram-with-llm';
const mockEnhance = enhanceDiagramWithLLM as jest.MockedFunction<typeof enhanceDiagramWithLLM>;

describe('POST /api/enhance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 405 for non-POST methods', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(405);
  });

  it('returns 400 when mermaidCode is missing', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { prompt: 'Add a step' },
    });
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData()).toEqual({ error: 'mermaidCode and prompt are required' });
  });

  it('returns 400 when prompt is missing', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { mermaidCode: 'graph TD\n  A --> B' },
    });
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData()).toEqual({ error: 'mermaidCode and prompt are required' });
  });

  it('returns 200 with enhanced mermaid code', async () => {
    mockEnhance.mockResolvedValueOnce({
      enhancedDiagramCode: 'graph TD\n  A --> B\n  B --> C',
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        mermaidCode: 'graph TD\n  A --> B',
        prompt: 'Add a new step C after B',
      },
    });

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(data).toHaveProperty('mermaidCode', 'graph TD\n  A --> B\n  B --> C');
    expect(mockEnhance).toHaveBeenCalledWith({
      diagramCode: 'graph TD\n  A --> B',
      enhancementPrompt: 'Add a new step C after B',
    });
  });

  it('appends validation errors to the prompt when the input diagram has structural issues', async () => {
    mockEnhance.mockResolvedValueOnce({
      enhancedDiagramCode: 'sequenceDiagram\n  A->>B: Hello',
    });

    // Broken diagram: unclosed alt block
    const brokenCode = 'sequenceDiagram\n  alt Broken\n  A->>B: msg';

    const { req, res } = createMocks({
      method: 'POST',
      body: { mermaidCode: brokenCode, prompt: 'Add a note' },
    });

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(200);
    // The enhancementPrompt should include the structural error details
    const calledWith = mockEnhance.mock.calls[0][0];
    expect(calledWith.enhancementPrompt).toContain('IMPORTANT');
    expect(calledWith.enhancementPrompt).toContain("Unclosed 'alt'");
  });

  it('returns 500 when the AI flow throws', async () => {
    mockEnhance.mockRejectedValueOnce(new Error('LLM unavailable'));

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        mermaidCode: 'graph TD\n  A --> B',
        prompt: 'Add something',
      },
    });

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(500);
    expect(res._getJSONData()).toEqual({ error: 'Diagram enhancement failed' });
  });

  it('returns 200 even with sequence diagram input', async () => {
    mockEnhance.mockResolvedValueOnce({
      enhancedDiagramCode: 'sequenceDiagram\n  A->>B: Request Care\n  B-->>A: Response',
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        mermaidCode: 'sequenceDiagram\n  A->>B: Request Care',
        prompt: 'Add a response from B to A',
      },
    });

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(data).toHaveProperty('mermaidCode');
    expect(data.mermaidCode).toContain('sequenceDiagram');
  });
});
