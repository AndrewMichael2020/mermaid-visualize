import { createMocks } from 'node-mocks-http';
import handler from '../generate';

describe('POST /api/generate', () => {
  it('returns 200 with mermaid code', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        prompt: 'A simple flowchart with start and end',
      },
    });

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(data).toHaveProperty('mermaidCode');
    expect(typeof data.mermaidCode).toBe('string');
    expect(data.mermaidCode.length).toBeGreaterThan(0);
  });

  it('returns 200 with a non-empty diagram for any prompt', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        prompt: 'Patient accesses care via phone or in person',
      },
    });

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(data).toHaveProperty('mermaidCode');
    expect(data.mermaidCode).toMatch(/graph|sequenceDiagram|flowchart/i);
  });
});
