import React from 'react';
import { render, screen } from '@testing-library/react';
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

describe('DiagramViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParse.mockResolvedValue(true);
    mockRender.mockResolvedValue({ svg: '<svg>test</svg>' });
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

    // Wait for the async rendering effect to complete
    await screen.findByText('Visualization');

    // Verify that mermaid.parse was called with the original code containing classDef
    expect(mockParse).toHaveBeenCalledWith(codeWithClassDef, { suppressErrors: true });
    
    // Verify that mermaid.render was called with the original code containing classDef
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
});
