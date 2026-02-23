/**
 * @fileOverview Detailed Mermaid syntax validator.
 *
 * Performs structural checks on Mermaid diagram code before (or in addition to)
 * calling the Mermaid parser, producing actionable per-line error messages that
 * are useful both for the user and as context for the AI fix/enhance models.
 *
 * Checks performed:
 *  - Unclosed block keywords (alt, opt, loop, par, critical, break, subgraph)
 *  - Dangling `end` statements with no matching opener
 *  - Mismatched activate / deactivate calls in sequenceDiagrams
 *  - Participant / actor aliases with unquoted illegal characters (spaces, parens, slashes)
 */

export interface MermaidValidationError {
  line: number;
  message: string;
}

export interface MermaidValidationResult {
  valid: boolean;
  errors: MermaidValidationError[];
  /** Combined human-readable error string, ready to pass to the AI or log. */
  errorMessage: string;
}

const BLOCK_OPENERS = /^\s*(alt|opt|loop|par|critical|break|subgraph)\b/;
const BLOCK_ENDER = /^\s*end\s*$/i;
const ACTIVATE_RE = /^\s*activate\s+(\S+)/;
const DEACTIVATE_RE = /^\s*deactivate\s+(\S+)/;
// Detect participant/actor lines whose raw ID contains spaces or special characters
// but are NOT using the "as" keyword (which would make the token a display label).
// Capture group breakdown:
//   \S          — first non-whitespace character of the ID
//   [^\n"']*?  — any characters that are not newline or quote (non-greedy)
//   \s+         — at least one space (the "illegal" separator)
//   [^\s"']+    — one or more non-whitespace, non-quote characters after the space
// This matches multi-word raw IDs such as "participant Alice Smith".
const PARTICIPANT_ILLEGAL_ID_RE =
  /^\s*(?:participant|actor)\s+(\S[^\n"']*?\s+[^\s"']+)\s*$/;

export function validateMermaidSyntax(code: string): MermaidValidationResult {
  const lines = code.split('\n');
  const errors: MermaidValidationError[] = [];

  // Stack of open blocks: { keyword, line }
  const blockStack: Array<{ keyword: string; line: number }> = [];

  // Map participant → stack of line numbers where it was activated (unmatched)
  const activationStack = new Map<string, number[]>();

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const trimmed = lines[i].trim();

    // Skip blank lines and comments
    if (!trimmed || trimmed.startsWith('%%')) continue;

    // ── Block openers ─────────────────────────────────────────────────────────
    const openerMatch = BLOCK_OPENERS.exec(trimmed);
    if (openerMatch) {
      blockStack.push({ keyword: openerMatch[1], line: lineNum });
    }

    // ── Block ender ───────────────────────────────────────────────────────────
    if (BLOCK_ENDER.test(trimmed)) {
      if (blockStack.length === 0) {
        errors.push({
          line: lineNum,
          message:
            `Line ${lineNum}: Dangling 'end' — no matching alt/opt/loop/par/` +
            `critical/break/subgraph block is open.`,
        });
      } else {
        blockStack.pop();
      }
    }

    // ── activate / deactivate (sequenceDiagram) ───────────────────────────────
    const activateMatch = ACTIVATE_RE.exec(trimmed);
    if (activateMatch) {
      const p = activateMatch[1];
      if (!activationStack.has(p)) activationStack.set(p, []);
      activationStack.get(p)!.push(lineNum);
    }

    const deactivateMatch = DEACTIVATE_RE.exec(trimmed);
    if (deactivateMatch) {
      const p = deactivateMatch[1];
      const stack = activationStack.get(p) ?? [];
      if (stack.length === 0) {
        errors.push({
          line: lineNum,
          message:
            `Line ${lineNum}: 'deactivate ${p}' has no preceding ` +
            `'activate ${p}' — participant was not activated.`,
        });
      } else {
        stack.pop();
      }
    }

    // ── Participant / actor with unquoted illegal ID characters ───────────────
    // Only flag when the line does NOT include the "as" keyword (which means
    // the raw token is the actual ID, not a display label).
    if (/^\s*(?:participant|actor)\s/.test(trimmed) && !/\bas\b/.test(trimmed)) {
      const illegalMatch = PARTICIPANT_ILLEGAL_ID_RE.exec(trimmed);
      if (illegalMatch) {
        const alias = illegalMatch[1].trim();
        // Replace spaces, parentheses, slashes, and backslashes — the same
        // characters flagged as illegal — with underscores to form a safe ID.
        const safeId = alias.replace(/[\s()\/\\]+/g, '_');
        errors.push({
          line: lineNum,
          message:
            `Line ${lineNum}: Participant/actor ID "${alias}" contains spaces, ` +
            `parentheses, or slashes which are illegal in a raw Mermaid ID. ` +
            `Use a short plain ID with 'as', e.g.: ` +
            `participant ${safeId} as "${alias}".`,
        });
      }
    }
  }

  // ── Unclosed blocks ────────────────────────────────────────────────────────
  // Report in reverse nesting order (innermost first).
  for (let i = blockStack.length - 1; i >= 0; i--) {
    const { keyword, line } = blockStack[i];
    errors.push({
      line,
      message: `Line ${line}: Unclosed '${keyword}' block — matching 'end' is missing.`,
    });
  }

  // ── Unmatched activations ─────────────────────────────────────────────────
  for (const [participant, lineNums] of activationStack.entries()) {
    for (const activateLine of lineNums) {
      errors.push({
        line: activateLine,
        message:
          `Line ${activateLine}: 'activate ${participant}' has no matching ` +
          `'deactivate ${participant}'.`,
      });
    }
  }

  // Sort by line number for readability
  errors.sort((a, b) => a.line - b.line);

  const errorMessage =
    errors.length === 0 ? '' : errors.map(e => e.message).join('\n');

  return { valid: errors.length === 0, errors, errorMessage };
}

/**
 * Builds a detailed, actionable error string by combining the raw Mermaid
 * parser error with any additional structural issues found by
 * `validateMermaidSyntax`.  The result is suitable for logging and for
 * sending to the AI fix / enhance model as the `errorMessage` field.
 *
 * @param code        - The Mermaid diagram source
 * @param parseError  - The raw error from mermaid.parse() / getLastParseError()
 *                      (may be an empty string when suppressErrors is active)
 */
export function buildDetailedErrorMessage(code: string, parseError: string): string {
  const { errorMessage: structuralErrors } = validateMermaidSyntax(code);

  if (!parseError && !structuralErrors) {
    return 'Invalid Mermaid syntax.';
  }

  const parts: string[] = [];
  if (parseError) parts.push(`Parser error: ${parseError}`);
  if (structuralErrors) parts.push(`Structural issues detected:\n${structuralErrors}`);
  return parts.join('\n\n');
}
