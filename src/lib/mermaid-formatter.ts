/**
 * Normalizes Mermaid diagram code for consistent editor formatting:
 *  1. Pretty-prints compact JSON inside %%{init:...}%% blocks.
 *  2. Ensures a blank line between the %%{init:...}%% block and the diagram keyword.
 */
export function formatMermaidCode(code: string): string {
  code = prettyPrintInitBlock(code);
  code = ensureNewlineAfterInit(code);
  return code.trim();
}

/**
 * Finds the JSON object inside a %%{init: {...}}%% block using brace counting,
 * parses it, and replaces it with an indented version.
 */
function prettyPrintInitBlock(code: string): string {
  const marker = '%%{init:';
  const start = code.indexOf(marker);
  if (start === -1) return code;

  // Find the start of the JSON object (first '{' after the marker)
  const jsonStart = code.indexOf('{', start + marker.length);
  if (jsonStart === -1) return code;

  // Walk forward counting braces to find the matching closing '}'
  let depth = 0;
  let jsonEnd = -1;
  for (let i = jsonStart; i < code.length; i++) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}') {
      depth--;
      if (depth === 0) { jsonEnd = i; break; }
    }
  }
  if (jsonEnd === -1) return code;

  const jsonStr = code.slice(jsonStart, jsonEnd + 1);
  try {
    const parsed = JSON.parse(jsonStr);
    const pretty = JSON.stringify(parsed, null, 2);
    return code.slice(0, jsonStart) + pretty + code.slice(jsonEnd + 1);
  } catch {
    return code; // leave as-is if unparseable
  }
}

/** Ensures there is a newline between the closing }}%% and the diagram keyword. */
function ensureNewlineAfterInit(code: string): string {
  return code.replace(/(%%\s*\}\s*%%)([^\n])/g, '$1\n$2');
}
