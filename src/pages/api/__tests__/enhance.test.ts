import { createMocks } from 'node-mocks-http';
import handler from '../enhance';

describe('POST /api/enhance', () => {
  it('returns 200 with enhanced mermaid code', async () => {
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
    expect(data).toHaveProperty('mermaidCode');
    expect(typeof data.mermaidCode).toBe('string');
    expect(data.mermaidCode).toContain('graph TD');
  });

  it('returns 200 even with sequence diagram input', async () => {
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
  });
});
