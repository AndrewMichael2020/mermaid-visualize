/**
 * Tests to verify that the AI flow prompts use minimalist quoting rules
 * (no double-quoting of alt/else/loop/opt block headers or message labels)
 * and include the required sanitization and smart-quote prohibition rules.
 */

// Read the source files directly to verify prompt content
import * as fs from 'fs';
import * as path from 'path';

const flowsDir = path.resolve(__dirname, '..');

const enhanceSource = fs.readFileSync(path.join(flowsDir, 'enhance-diagram-with-llm.ts'), 'utf8');
const generateSource = fs.readFileSync(path.join(flowsDir, 'generate-diagram-from-description.ts'), 'utf8');
const fixSource = fs.readFileSync(path.join(flowsDir, 'fix-diagram-error.ts'), 'utf8');

describe('enhance-diagram-with-llm prompt rules', () => {
  it('uses MINIMALIST QUOTING instead of UNIVERSAL QUOTING', () => {
    expect(enhanceSource).toContain('MINIMALIST QUOTING');
    expect(enhanceSource).not.toContain('UNIVERSAL QUOTING');
  });

  it('instructs not to wrap alt/else/loop/opt block headers in quotes', () => {
    expect(enhanceSource).toMatch(/DO NOT wrap alt.*block headers in quotes/i);
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
});

describe('generate-diagram-from-description prompt rules', () => {
  it('uses MINIMALIST QUOTING instead of UNIVERSAL QUOTING', () => {
    expect(generateSource).toContain('MINIMALIST QUOTING');
    expect(generateSource).not.toContain('UNIVERSAL QUOTING');
  });

  it('instructs not to wrap alt/else/loop/opt block headers in quotes', () => {
    expect(generateSource).toMatch(/DO NOT wrap alt.*block headers in quotes/i);
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
});

describe('fix-diagram-error prompt rules', () => {
  it('does not instruct wrapping logic-block headers in double quotes', () => {
    expect(fixSource).not.toMatch(/Wrap all logic-block headers in double quotes/i);
  });

  it('does not instruct wrapping message labels in double quotes', () => {
    expect(fixSource).not.toMatch(/Wrap all message labels after colons in double quotes/i);
  });

  it('instructs using plain text for logic-block headers', () => {
    expect(fixSource).toMatch(/plain text for logic-block headers/i);
  });

  it('instructs stripping parentheses, slashes, and backslashes from labels', () => {
    expect(fixSource).toMatch(/Strip parentheses.*slashes.*backslashes/i);
  });

  it('prohibits smart/curly quotes', () => {
    expect(fixSource).toMatch(/smart quotes/i);
  });

  it('retains participant aliasing with "as" keyword rule', () => {
    expect(fixSource).toContain('participant P as');
  });
});
