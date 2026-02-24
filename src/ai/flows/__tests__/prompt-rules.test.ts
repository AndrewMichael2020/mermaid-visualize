/**
 * Tests to verify that the AI flow prompts use correct quoting rules
 * and include the required sanitization and smart-quote prohibition rules.
 *
 * NOTE: Quoted alt/else/loop/opt block headers (e.g. alt "label") are VALID
 * Mermaid v10.9.1 syntax and the prompts must NOT prohibit them.
 */

// Read the source files directly to verify prompt content
import * as fs from 'fs';
import * as path from 'path';

const flowsDir = path.resolve(__dirname, '..');

const enhanceSource = fs.readFileSync(path.join(flowsDir, 'enhance-diagram-with-llm.ts'), 'utf8');
const generateSource = fs.readFileSync(path.join(flowsDir, 'generate-diagram-from-description.ts'), 'utf8');
const fixSource = fs.readFileSync(path.join(flowsDir, 'fix-diagram-error.ts'), 'utf8');

describe('enhance-diagram-with-llm prompt rules', () => {
  it('contains QUOTING RULES section', () => {
    expect(enhanceSource).toContain('QUOTING RULES');
  });

  it('allows quoted block headers (both plain and quoted forms are valid)', () => {
    // Must NOT assert that quoted alt/else/loop/opt headers are forbidden —
    // the Mermaid v10.9.1 Langium parser accepts both forms.
    expect(enhanceSource).not.toMatch(/DO NOT wrap alt.*block headers in quotes/i);
  });

  it('instructs not to wrap message labels after colons in quotes', () => {
    expect(enhanceSource).toMatch(/DO NOT wrap message labels after a colon in quotes/i);
  });

  it('requires stripping parentheses, slashes, and backslashes from labels', () => {
    expect(enhanceSource).toMatch(/STRIP SPECIAL CHARACTERS/i);
    expect(enhanceSource).toContain('()');
    expect(enhanceSource).toContain('/');
    expect(enhanceSource).toContain('\\');
  });

  it('prohibits smart/curly quotes', () => {
    expect(enhanceSource).toMatch(/NO SMART QUOTES/i);
  });

  it('retains ID/LABEL SEPARATION rule for participants', () => {
    expect(enhanceSource).toContain('ID/LABEL SEPARATION FOR PARTICIPANTS');
  });

  it('retains BLOCK CLOSURE VERIFICATION rule', () => {
    expect(enhanceSource).toContain('BLOCK CLOSURE VERIFICATION');
  });

  it('enforces OPT vs ALT distinction rule', () => {
    expect(enhanceSource).toMatch(/OPT vs ALT/i);
    expect(enhanceSource).toMatch(/'opt'.*single optional path/i);
    expect(enhanceSource).toMatch(/Never place an 'else' inside an 'opt'/i);
  });

  it('requires activate/deactivate balance on every alt/else branch', () => {
    expect(enhanceSource).toContain('SEQUENCE DIAGRAM ACTIVATION BALANCE');
    expect(enhanceSource).toMatch(/balance activate.*deactivate.*EVERY branch/i);
  });

  it('prohibits mixing shorthand arrow activation with explicit activate/deactivate', () => {
    expect(enhanceSource).toMatch(/Do NOT mix shorthand arrow activation/i);
  });
});

describe('generate-diagram-from-description prompt rules', () => {
  it('contains QUOTING RULES section', () => {
    expect(generateSource).toContain('QUOTING RULES');
  });

  it('allows quoted block headers (both plain and quoted forms are valid)', () => {
    expect(generateSource).not.toMatch(/DO NOT wrap alt.*block headers in quotes/i);
  });

  it('instructs not to wrap message labels after colons in quotes', () => {
    expect(generateSource).toMatch(/DO NOT wrap message labels after a colon in quotes/i);
  });

  it('requires stripping parentheses, slashes, and backslashes from labels', () => {
    expect(generateSource).toMatch(/STRIP SPECIAL CHARACTERS/i);
  });

  it('prohibits smart/curly quotes', () => {
    expect(generateSource).toMatch(/NO SMART QUOTES/i);
  });

  it('retains ID/LABEL SEPARATION rule for participants', () => {
    expect(generateSource).toContain('ID/LABEL SEPARATION FOR PARTICIPANTS');
  });

  it('enforces OPT vs ALT distinction rule', () => {
    expect(generateSource).toMatch(/OPT vs ALT/i);
    expect(generateSource).toMatch(/'opt'.*single optional path/i);
    expect(generateSource).toMatch(/Never place an 'else' inside an 'opt'/i);
  });
});

describe('fix-diagram-error prompt rules', () => {
  it('does not instruct removing quotes from logic-block headers', () => {
    // Both "alt label" and alt "label" are valid Mermaid v10.9.1 syntax;
    // the fix prompt must not tell the model to strip valid quoted headers.
    expect(fixSource).not.toMatch(/do NOT wrap.*logic-block headers in quotes/i);
  });

  it('does not instruct wrapping message labels in double quotes', () => {
    expect(fixSource).not.toMatch(/Wrap all message labels after colons in double quotes/i);
  });

  it('instructs using plain or quoted text for logic-block headers', () => {
    expect(fixSource).toMatch(/plain text or quoted text for logic-block headers/i);
  });

  it('instructs stripping parentheses, slashes, and backslashes from labels', () => {
    expect(fixSource).toMatch(/Strip parentheses.*slashes.*backslashes/i);
  });

  it('prohibits smart/curly quotes', () => {
    expect(fixSource).toMatch(/smart quotes/i);
  });

  it('instructs about activate/deactivate balance per branch in alt/else blocks', () => {
    expect(fixSource).toMatch(/balance activate.*deactivate.*branch/i);
  });

  it('prohibits mixing shorthand arrow activation with explicit activate/deactivate', () => {
    expect(fixSource).toMatch(/Do not mix shorthand.*activate/i);
  });

  it('enforces OPT vs ALT distinction rule', () => {
    expect(fixSource).toMatch(/OPT vs ALT/i);
    expect(fixSource).toMatch(/'opt'.*single optional path/i);
    expect(fixSource).toMatch(/else.*inside.*opt.*syntax error/i);
  });

  it('retains participant aliasing with "as" keyword rule', () => {
    expect(fixSource).toContain('participant P as');
  });
});
