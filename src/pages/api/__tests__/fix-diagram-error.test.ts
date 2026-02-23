import { createMocks } from 'node-mocks-http';
import handler from '../fix-diagram-error';

// Mock the AI flow — no real network calls in tests
jest.mock('@/ai/flows/fix-diagram-error', () => ({
  fixDiagramError: jest.fn(),
}));

import { fixDiagramError } from '@/ai/flows/fix-diagram-error';
const mockFixDiagramError = fixDiagramError as jest.MockedFunction<typeof fixDiagramError>;

describe('POST /api/fix-diagram-error', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 405 for non-POST methods', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(405);
    expect(res._getJSONData()).toEqual({ error: 'Method not allowed' });
  });

  it('returns 400 when diagramCode is missing', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { errorMessage: 'Parse error on line 1' },
    });
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData()).toEqual({ error: 'diagramCode and errorMessage are required' });
  });

  it('returns 400 when errorMessage is missing', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { diagramCode: 'graph TD\n  A --> B' },
    });
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData()).toEqual({ error: 'diagramCode and errorMessage are required' });
  });

  it('returns 200 with fixedCode and explanation on success', async () => {
    mockFixDiagramError.mockResolvedValueOnce({
      fixedCode: 'graph TD\n  A --> B',
      explanation: 'Removed unclosed bracket on line 2.',
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        diagramCode: 'graph TD\n  A --> B[Unclosed',
        errorMessage: 'Parse error on line 2: expected ]',
      },
    });
    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({
      fixedCode: 'graph TD\n  A --> B',
      explanation: 'Removed unclosed bracket on line 2.',
    });
    expect(mockFixDiagramError).toHaveBeenCalledWith({
      diagramCode: 'graph TD\n  A --> B[Unclosed',
      errorMessage: 'Parse error on line 2: expected ]',
    });
  });

  it('returns 500 when the AI flow throws', async () => {
    mockFixDiagramError.mockRejectedValueOnce(new Error('LLM unavailable'));

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        diagramCode: 'graph TD\n  A --> B',
        errorMessage: 'Some error',
      },
    });
    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(500);
    expect(res._getJSONData()).toEqual({ error: 'AI fix attempt failed' });
  });
});
