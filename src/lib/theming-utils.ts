/**
 * Theming utilities for Mermaid diagrams.
 * 
 * This module provides functions to detect diagram types, check theming support,
 * and generate appropriate user messages about theming limitations.
 */

export const MERMAID_VERSION = '10.9.1';

/**
 * Diagram types supported by the application with their theming capabilities.
 */
export const DIAGRAM_THEMING_SUPPORT = {
  flowchart: {
    themeVariables: true,
    classDef: true,
    perNodeColoring: true,
    description: 'Full theming support including per-node classDef styling',
  },
  graph: {
    themeVariables: true,
    classDef: true,
    perNodeColoring: true,
    description: 'Full theming support including per-node classDef styling',
  },
  classDiagram: {
    themeVariables: true,
    classDef: false,
    perNodeColoring: false,
    description: 'Global themeVariables only; per-class coloring not supported',
  },
  sequenceDiagram: {
    themeVariables: true,
    classDef: false,
    perNodeColoring: false,
    description: 'Palette-level theming; per-actor/per-message coloring not supported',
  },
  stateDiagram: {
    themeVariables: true,
    classDef: true,
    perNodeColoring: true,
    description: 'Full theming support with state-level classDef',
  },
  erDiagram: {
    themeVariables: false,
    classDef: false,
    perNodeColoring: false,
    description: 'Theming not supported; keep code clean without styling',
  },
  gantt: {
    themeVariables: true,
    classDef: false,
    perNodeColoring: false,
    description: 'Limited themeVariables support',
  },
  pie: {
    themeVariables: true,
    classDef: false,
    perNodeColoring: false,
    description: 'Limited themeVariables support',
  },
  mindmap: {
    themeVariables: true,
    classDef: false,
    perNodeColoring: false,
    description: 'Limited themeVariables support',
  },
  timeline: {
    themeVariables: true,
    classDef: false,
    perNodeColoring: false,
    description: 'Limited themeVariables support',
  },
  gitGraph: {
    themeVariables: true,
    classDef: false,
    perNodeColoring: false,
    description: 'Branch colors via themeVariables',
  },
  journey: {
    themeVariables: true,
    classDef: false,
    perNodeColoring: false,
    description: 'Actor colors via themeVariables',
  },
} as const;

export type DiagramType = keyof typeof DIAGRAM_THEMING_SUPPORT;

/**
 * Detects the diagram type from Mermaid code.
 * @param code - The Mermaid code to analyze
 * @returns The detected diagram type or 'unknown'
 */
export function detectDiagramType(code: string): DiagramType | 'unknown' {
  const trimmedCode = code.trim().toLowerCase();
  
  // Remove init block if present for cleaner detection
  // Use [\s\S] instead of . with s flag for ES5/older JS engine compatibility
  const codeWithoutInit = trimmedCode.replace(/%%\{[\s\S]*?\}%%/g, '').trim();
  const firstLine = codeWithoutInit.split('\n')[0].trim();
  
  if (firstLine.startsWith('graph ') || firstLine.startsWith('flowchart')) {
    return 'flowchart';
  }
  if (firstLine.startsWith('classdiagram')) {
    return 'classDiagram';
  }
  if (firstLine.startsWith('sequencediagram')) {
    return 'sequenceDiagram';
  }
  // Match both 'statediagram' and 'statediagram-v2' (v2 is the preferred syntax)
  if (firstLine.startsWith('statediagram')) {
    return 'stateDiagram';
  }
  if (firstLine.startsWith('erdiagram')) {
    return 'erDiagram';
  }
  if (firstLine.startsWith('gantt')) {
    return 'gantt';
  }
  if (firstLine.startsWith('pie')) {
    return 'pie';
  }
  if (firstLine.startsWith('mindmap')) {
    return 'mindmap';
  }
  if (firstLine.startsWith('timeline')) {
    return 'timeline';
  }
  if (firstLine.startsWith('gitgraph')) {
    return 'gitGraph';
  }
  if (firstLine.startsWith('journey')) {
    return 'journey';
  }
  
  return 'unknown';
}

/**
 * Checks if the code contains attempts at per-node/per-class styling that won't work.
 * This detects patterns like classDef usage in classDiagram or per-actor colors in sequenceDiagram.
 * 
 * @param code - The Mermaid code to analyze
 * @returns Object with unsupported styling attempt information
 */
export function detectUnsupportedStyling(code: string): {
  hasUnsupportedAttempt: boolean;
  diagramType: DiagramType | 'unknown';
  message: string | null;
} {
  const diagramType = detectDiagramType(code);
  
  if (diagramType === 'unknown') {
    return { hasUnsupportedAttempt: false, diagramType, message: null };
  }
  
  const support = DIAGRAM_THEMING_SUPPORT[diagramType];
  
  // Check for classDef usage in diagrams that don't support it
  if (!support.classDef && /classDef\s+\w+/i.test(code)) {
    if (diagramType === 'classDiagram') {
      return {
        hasUnsupportedAttempt: true,
        diagramType,
        message: `Per-class coloring (classDef) is not supported in class diagrams in Mermaid v${MERMAID_VERSION}. Only global themeVariables apply. See docs for details.`,
      };
    }
    if (diagramType === 'sequenceDiagram') {
      return {
        hasUnsupportedAttempt: true,
        diagramType,
        message: `classDef styling is not supported in sequence diagrams in Mermaid v${MERMAID_VERSION}. Use themeVariables for global palette colors.`,
      };
    }
  }
  
  // Check for style directives in unsupported diagrams
  if (!support.perNodeColoring && /style\s+\w+\s+/i.test(code)) {
    if (diagramType === 'classDiagram' || diagramType === 'sequenceDiagram') {
      return {
        hasUnsupportedAttempt: true,
        diagramType,
        message: `Per-element style directives are not supported in ${diagramType} in Mermaid v${MERMAID_VERSION}. Use themeVariables for global colors.`,
      };
    }
  }
  
  return { hasUnsupportedAttempt: false, diagramType, message: null };
}

/**
 * Returns theming limitation info for a diagram type.
 * @param diagramType - The diagram type to check
 * @returns Limitation message or null if no limitations
 */
export function getThemingLimitationMessage(diagramType: DiagramType | 'unknown'): string | null {
  if (diagramType === 'unknown') return null;
  
  const support = DIAGRAM_THEMING_SUPPORT[diagramType];
  
  if (diagramType === 'classDiagram') {
    return `Class diagram coloring is global-only in Mermaid v${MERMAID_VERSION}. Per-class styling is not supported.`;
  }
  
  if (diagramType === 'sequenceDiagram') {
    return `Sequence diagram uses palette-level colors in Mermaid v${MERMAID_VERSION}. Per-actor/per-message styling is not supported.`;
  }
  
  if (diagramType === 'erDiagram') {
    return 'ER diagrams do not support theming. Theme blocks are intentionally excluded.';
  }
  
  if (!support.perNodeColoring && support.themeVariables) {
    return `${diagramType} supports global themeVariables only. Per-element styling is not available.`;
  }
  
  return null;
}

/**
 * Checks if a diagram code contains a theme initialization block.
 * @param code - The Mermaid code to check
 * @returns True if an init block with theme/themeVariables is present
 */
export function hasThemeBlock(code: string): boolean {
  // Match %%{...}%% blocks that contain theme or themeVariables
  return /%%\{[\s\S]*?(?:theme|themeVariables)[\s\S]*?\}%%/i.test(code);
}

/**
 * Extracts the theme initialization block from Mermaid code if present.
 * @param code - The Mermaid code to analyze
 * @returns The init block string or null if not present
 */
export function extractThemeBlock(code: string): string | null {
  const match = code.match(/%%\{[\s\S]*?(?:theme|themeVariables)[\s\S]*?\}%%/i);
  return match ? match[0] : null;
}
