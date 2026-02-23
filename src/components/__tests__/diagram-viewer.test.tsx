import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DiagramViewer from '../diagram-viewer';

// Mock the mermaid module
const mockParse = jest.fn();
const mockRender = jest.fn();
const mockInitialize = jest.fn();

jest.mock('@/lib/mermaid-config', () => ({
  initializeMermaid: jest.fn().mockImplementation(async () => ({
    parse: mockParse,
    render: mockRender,
    initialize: mockInitialize,
  })),
  getLastParseError: jest.fn().mockReturnValue(''),
  clearLastParseError: jest.fn(),
}));

// Mock the useToast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: () => ({
    resolvedTheme: 'light',
  }),
}));

// Helper to mock fetch for the fix-diagram-error API
const mockFetch = (response: object, ok = true) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    json: async () => response,
  });
};

const defaultProps = { code: 'graph TD\n  A --> B', theme: 'light', setTheme: jest.fn() };

describe('DiagramViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParse.mockResolvedValue(true);
    mockRender.mockResolvedValue({ svg: '<svg>test</svg>' });
  });

  afterEach(() => {
    if (global.fetch && (global.fetch as jest.Mock).mockRestore) {
      (global.fetch as jest.Mock).mockRestore();
    }
  });

  it('preserves classDef styling in diagram code', async () => {
    const codeWithClassDef = `graph TD
    A[Start] --> B[End]
    classDef highlight fill:#f9f,stroke:#333,stroke-width:4px
    class A highlight`;

    render(
      <DiagramViewer 
        code={codeWithClassDef} 
        theme="light" 
        setTheme={jest.fn()} 
      />
    );

    await screen.findByText('Visualization');

    expect(mockParse).toHaveBeenCalledWith(codeWithClassDef, { suppressErrors: true });
    expect(mockRender).toHaveBeenCalledWith(
      expect.stringContaining('mermaid-svg-'),
      codeWithClassDef
    );
  });

  it('renders diagrams without classDef normally', async () => {
    const codeWithoutClassDef = `graph TD
    A[Start] --> B[End]`;

    render(
      <DiagramViewer 
        code={codeWithoutClassDef} 
        theme="light" 
        setTheme={jest.fn()} 
      />
    );

    await screen.findByText('Visualization');

    expect(mockParse).toHaveBeenCalledWith(codeWithoutClassDef, { suppressErrors: true });
    expect(mockRender).toHaveBeenCalledWith(
      expect.stringContaining('mermaid-svg-'),
      codeWithoutClassDef
    );
  });

  // ── AI Error Recovery ────────────────────────────────────────────────────

  describe('AI error recovery', () => {
    it('shows spinner while fix is in progress (parse failure)', async () => {
      // parse() returns false → triggers AI fix
      mockParse.mockResolvedValue(false);
      // fetch never resolves during this test — we just check the spinner appears
      global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));

      render(<DiagramViewer {...defaultProps} />);

      await screen.findByText('AI is attempting to fix the diagram…');
    });

    it('renders corrected diagram and shows auto-corrected banner after successful AI fix', async () => {
      // First parse (broken code) → false
      // Second parse (fixed code) → true
      mockParse
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      mockRender.mockResolvedValue({ svg: '<svg>fixed</svg>' });

      mockFetch({
        fixedCode: 'graph TD\n  A --> B',
        explanation: 'Closed the missing bracket.',
      });

      render(<DiagramViewer {...defaultProps} />);

      await screen.findByText('Auto-corrected:');
      expect(screen.getByText(/Closed the missing bracket\./)).toBeInTheDocument();
    });

    it('shows rich error panel when AI fix also fails to parse', async () => {
      // Both parse attempts fail
      mockParse.mockResolvedValue(false);

      mockFetch({
        fixedCode: 'graph TD\n  A --> B[StillBroken',
        explanation: 'Attempted to close the bracket.',
      });

      render(<DiagramViewer {...defaultProps} />);

      await screen.findByText('Diagram Error — AI fix unsuccessful');
      expect(screen.getByText(/Attempted to close the bracket\./)).toBeInTheDocument();
      expect(screen.getByText(/AI's attempted code/)).toBeInTheDocument();
    });

    it('shows error panel when fetch itself fails', async () => {
      mockParse.mockResolvedValue(false);
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      render(<DiagramViewer {...defaultProps} />);

      await screen.findByText('Diagram Error — AI fix unsuccessful');
    });

    it('shows error panel when render throws and AI fix also fails to render', async () => {
      // parse passes but render throws on both original and fix attempt
      mockParse.mockResolvedValue(true);
      mockRender
        .mockRejectedValueOnce(new Error('Render failed'))
        .mockRejectedValueOnce(new Error('Fix render also failed'));

      mockFetch({
        fixedCode: 'graph TD\n  A --> B',
        explanation: 'Corrected node label syntax.',
      });

      render(<DiagramViewer {...defaultProps} />);

      await screen.findByText('Diagram Error — AI fix unsuccessful');
      expect(screen.getByText(/Corrected node label syntax\./)).toBeInTheDocument();
    });
  });
});
