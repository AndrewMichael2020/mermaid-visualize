import {
  detectDiagramType,
  detectUnsupportedStyling,
  getThemingLimitationMessage,
  hasThemeBlock,
  extractThemeBlock,
  MERMAID_VERSION,
  DIAGRAM_THEMING_SUPPORT,
} from '@/lib/theming-utils';

describe('theming-utils', () => {
  describe('detectDiagramType', () => {
    it('detects flowchart from graph TD', () => {
      expect(detectDiagramType('graph TD\n    A-->B')).toBe('flowchart');
    });

    it('detects flowchart from flowchart keyword', () => {
      expect(detectDiagramType('flowchart LR\n    A-->B')).toBe('flowchart');
    });

    it('detects classDiagram', () => {
      expect(detectDiagramType('classDiagram\n    class Person')).toBe('classDiagram');
    });

    it('detects sequenceDiagram', () => {
      expect(detectDiagramType('sequenceDiagram\n    Alice->>Bob: Hello')).toBe('sequenceDiagram');
    });

    it('detects stateDiagram', () => {
      expect(detectDiagramType('stateDiagram-v2\n    [*] --> Idle')).toBe('stateDiagram');
    });

    it('detects stateDiagram without v2 suffix', () => {
      expect(detectDiagramType('stateDiagram\n    [*] --> Idle')).toBe('stateDiagram');
    });

    it('detects erDiagram', () => {
      expect(detectDiagramType('erDiagram\n    CUSTOMER ||--o{ ORDER')).toBe('erDiagram');
    });

    it('detects diagram type even with init block present', () => {
      const code = `%%{init: {"theme": "base"}}%%
classDiagram
    class Person`;
      expect(detectDiagramType(code)).toBe('classDiagram');
    });

    it('returns unknown for unrecognized code', () => {
      expect(detectDiagramType('random text')).toBe('unknown');
    });
  });

  describe('detectUnsupportedStyling', () => {
    it('detects classDef usage in classDiagram', () => {
      const code = `classDiagram
    class Person
    classDef highlight fill:#f9f`;
      const result = detectUnsupportedStyling(code);
      expect(result.hasUnsupportedAttempt).toBe(true);
      expect(result.diagramType).toBe('classDiagram');
      expect(result.message).toContain('Per-class coloring');
    });

    it('detects style directive in classDiagram', () => {
      const code = `classDiagram
    class Person
    style Person fill:#f9f`;
      const result = detectUnsupportedStyling(code);
      expect(result.hasUnsupportedAttempt).toBe(true);
      expect(result.diagramType).toBe('classDiagram');
    });

    it('does not flag classDef in flowchart (supported)', () => {
      const code = `graph TD
    A-->B
    classDef highlight fill:#f9f
    class A highlight`;
      const result = detectUnsupportedStyling(code);
      expect(result.hasUnsupportedAttempt).toBe(false);
    });

    it('returns no issue for unknown diagram type', () => {
      const result = detectUnsupportedStyling('random text');
      expect(result.hasUnsupportedAttempt).toBe(false);
      expect(result.diagramType).toBe('unknown');
    });
  });

  describe('getThemingLimitationMessage', () => {
    it('returns message for classDiagram', () => {
      const message = getThemingLimitationMessage('classDiagram');
      expect(message).toContain('global-only');
      expect(message).toContain(MERMAID_VERSION);
    });

    it('returns message for sequenceDiagram', () => {
      const message = getThemingLimitationMessage('sequenceDiagram');
      expect(message).toContain('palette-level');
      expect(message).toContain(MERMAID_VERSION);
    });

    it('returns message for erDiagram', () => {
      const message = getThemingLimitationMessage('erDiagram');
      expect(message).toContain('not support theming');
    });

    it('returns null for unknown type', () => {
      expect(getThemingLimitationMessage('unknown')).toBeNull();
    });

    it('returns null for fully supported diagram types', () => {
      expect(getThemingLimitationMessage('flowchart')).toBeNull();
    });
  });

  describe('hasThemeBlock', () => {
    it('detects init block with theme', () => {
      const code = `%%{init: {"theme": "base"}}%%
graph TD
    A-->B`;
      expect(hasThemeBlock(code)).toBe(true);
    });

    it('detects init block with themeVariables', () => {
      const code = `%%{init: {"themeVariables": {"primaryColor": "#fff"}}}%%
graph TD
    A-->B`;
      expect(hasThemeBlock(code)).toBe(true);
    });

    it('returns false for code without theme block', () => {
      expect(hasThemeBlock('graph TD\n    A-->B')).toBe(false);
    });
  });

  describe('extractThemeBlock', () => {
    it('extracts theme block from code', () => {
      const themeBlock = '%%{init: {"theme": "base"}}%%';
      const code = `${themeBlock}
graph TD
    A-->B`;
      expect(extractThemeBlock(code)).toBe(themeBlock);
    });

    it('returns null when no theme block present', () => {
      expect(extractThemeBlock('graph TD\n    A-->B')).toBeNull();
    });
  });

  describe('DIAGRAM_THEMING_SUPPORT', () => {
    it('has correct support flags for flowchart', () => {
      expect(DIAGRAM_THEMING_SUPPORT.flowchart.themeVariables).toBe(true);
      expect(DIAGRAM_THEMING_SUPPORT.flowchart.classDef).toBe(true);
      expect(DIAGRAM_THEMING_SUPPORT.flowchart.perNodeColoring).toBe(true);
    });

    it('has correct support flags for classDiagram', () => {
      expect(DIAGRAM_THEMING_SUPPORT.classDiagram.themeVariables).toBe(true);
      expect(DIAGRAM_THEMING_SUPPORT.classDiagram.classDef).toBe(false);
      expect(DIAGRAM_THEMING_SUPPORT.classDiagram.perNodeColoring).toBe(false);
    });

    it('has correct support flags for sequenceDiagram', () => {
      expect(DIAGRAM_THEMING_SUPPORT.sequenceDiagram.themeVariables).toBe(true);
      expect(DIAGRAM_THEMING_SUPPORT.sequenceDiagram.classDef).toBe(false);
      expect(DIAGRAM_THEMING_SUPPORT.sequenceDiagram.perNodeColoring).toBe(false);
    });

    it('has correct support flags for erDiagram', () => {
      expect(DIAGRAM_THEMING_SUPPORT.erDiagram.themeVariables).toBe(false);
      expect(DIAGRAM_THEMING_SUPPORT.erDiagram.classDef).toBe(false);
      expect(DIAGRAM_THEMING_SUPPORT.erDiagram.perNodeColoring).toBe(false);
    });
  });
});
