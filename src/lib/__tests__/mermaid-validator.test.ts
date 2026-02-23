import { validateMermaidSyntax, buildDetailedErrorMessage } from '../mermaid-validator';

describe('validateMermaidSyntax', () => {
  it('returns valid for a simple, correct flowchart', () => {
    const code = `graph TD\n  A --> B`;
    const result = validateMermaidSyntax(code);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.errorMessage).toBe('');
  });

  it('returns valid for a correct sequenceDiagram with matching activate/deactivate', () => {
    const code = [
      'sequenceDiagram',
      '  participant A',
      '  participant B',
      '  A->>B: Hello',
      '  activate B',
      '  B-->>A: Reply',
      '  deactivate B',
    ].join('\n');
    const result = validateMermaidSyntax(code);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns valid for a correct alt block', () => {
    const code = [
      'sequenceDiagram',
      '  A->>B: Request',
      '  alt Success',
      '    B-->>A: OK',
      '  else Failure',
      '    B-->>A: Error',
      '  end',
    ].join('\n');
    const result = validateMermaidSyntax(code);
    expect(result.valid).toBe(true);
  });

  // ── Unclosed blocks ────────────────────────────────────────────────────────

  it('detects an unclosed alt block', () => {
    const code = [
      'sequenceDiagram',
      '  A->>B: Request',
      '  alt Success',
      '    B-->>A: OK',
      // missing end
    ].join('\n');
    const result = validateMermaidSyntax(code);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toMatch(/Unclosed 'alt'/);
    expect(result.errors[0].message).toMatch(/Line 3/);
  });

  it('detects an unclosed loop block', () => {
    const code = [
      'sequenceDiagram',
      '  loop Every minute',
      '    A->>B: ping',
      // no end
    ].join('\n');
    const result = validateMermaidSyntax(code);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toMatch(/Unclosed 'loop'/);
  });

  it('detects a nested unclosed block', () => {
    // 'end' pops the innermost opener ('opt'); the outer 'alt' remains unclosed.
    const code = [
      'sequenceDiagram',
      '  alt Outer',
      '    opt Inner',
      '      A->>B: msg',
      '  end', // closes 'opt', leaving 'alt' unclosed
    ].join('\n');
    const result = validateMermaidSyntax(code);
    expect(result.valid).toBe(false);
    const messages = result.errors.map(e => e.message);
    expect(messages.some(m => m.includes("'alt'"))).toBe(true);
  });

  // ── Dangling end ───────────────────────────────────────────────────────────

  it('detects a dangling end statement', () => {
    const code = [
      'sequenceDiagram',
      '  A->>B: Hello',
      '  end', // no matching opener
    ].join('\n');
    const result = validateMermaidSyntax(code);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toMatch(/Dangling 'end'/);
    expect(result.errors[0].message).toMatch(/Line 3/);
  });

  // ── activate / deactivate mismatches ──────────────────────────────────────

  it('detects deactivate without matching activate', () => {
    const code = [
      'sequenceDiagram',
      '  participant Server',
      '  Client->>Server: Request',
      '  deactivate Server', // never activated
    ].join('\n');
    const result = validateMermaidSyntax(code);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toMatch(/deactivate Server.*no preceding.*activate Server/i);
    expect(result.errors[0].line).toBe(4);
  });

  it('detects activate without matching deactivate', () => {
    const code = [
      'sequenceDiagram',
      '  participant Server',
      '  activate Server',
      '  Client->>Server: Request',
      // no deactivate
    ].join('\n');
    const result = validateMermaidSyntax(code);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toMatch(/activate Server.*no matching.*deactivate Server/i);
    expect(result.errors[0].line).toBe(3);
  });

  it('allows multiple activate/deactivate pairs for same participant', () => {
    const code = [
      'sequenceDiagram',
      '  activate A',
      '  deactivate A',
      '  activate A',
      '  deactivate A',
    ].join('\n');
    const result = validateMermaidSyntax(code);
    expect(result.valid).toBe(true);
  });

  // ── Illegal participant aliases ────────────────────────────────────────────

  it('detects participant with spaces in raw ID (no "as" clause)', () => {
    const code = [
      'sequenceDiagram',
      '  participant Alice Smith',
      '  Alice Smith->>Bob: Hi',
    ].join('\n');
    const result = validateMermaidSyntax(code);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toMatch(/Alice Smith.*spaces.*parentheses.*slashes/i);
    expect(result.errors[0].line).toBe(2);
  });

  it('does NOT flag participant with "as" display label', () => {
    const code = [
      'sequenceDiagram',
      '  participant AS as "Alice Smith"',
      '  AS->>Bob: Hi',
    ].join('\n');
    const result = validateMermaidSyntax(code);
    expect(result.valid).toBe(true);
  });

  it('does NOT flag simple single-word participant', () => {
    const code = [
      'sequenceDiagram',
      '  participant Alice',
      '  Alice->>Bob: Hi',
    ].join('\n');
    const result = validateMermaidSyntax(code);
    expect(result.valid).toBe(true);
  });

  // ── alt/else branch-aware activation tracking (issue: state/scope desync) ─

  it('does NOT flag valid activate/deactivate across alt/else branches (minimal reproduction)', () => {
    // Each branch independently handles the participants that were active when
    // the alt block opened — the validator must restore that state at each else.
    const code = [
      '%%{init: {"theme": "base"}}%%',
      'sequenceDiagram',
      '    participant Patient',
      '    participant UPCC as UPCC Reception',
      '    participant Nurse',
      '    participant Provider',
      '',
      '    Patient->>UPCC: Arrives',
      '    activate UPCC',
      '    UPCC->>Nurse: Registration + handover',
      '    activate Nurse',
      '',
      '    alt Life-threatening symptoms',
      '        Nurse->>911: Divert to ED',
      '        deactivate Nurse',
      '        deactivate UPCC',
      '    else Non-life-threatening symptoms',
      '        Nurse-->>Provider: Refer for assessment',
      '        deactivate Nurse',
      '        activate Provider',
      '        Provider-->>Patient: Treat',
      '        deactivate Provider',
      '    end',
      '',
      '    loop After-Hours/Weekend',
      '        Patient->>UPCC: Arrives after-hours',
      '        activate UPCC',
      '        UPCC->>Nurse: Registration + handover',
      '        activate Nurse',
      '        deactivate Nurse',
      '        deactivate UPCC',
      '    end',
      '',
      '    deactivate UPCC',
    ].join('\n');
    const result = validateMermaidSyntax(code);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects a genuine deactivate-without-activate that is NOT inside an alt/else branch', () => {
    const code = [
      'sequenceDiagram',
      '  alt Success',
      '    A->>B: ok',
      '  end',
      '  deactivate B', // B was never activated anywhere
    ].join('\n');
    const result = validateMermaidSyntax(code);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toMatch(/deactivate B.*no preceding.*activate B/i);
  });

  it('detects an unmatched activate that is present in both alt branches', () => {
    // Both branches activate A but neither deactivates it
    const code = [
      'sequenceDiagram',
      '  alt Condition',
      '    activate A',
      '  else Other',
      '    activate A',
      '  end',
      // A is activated in both branches but never deactivated
    ].join('\n');
    const result = validateMermaidSyntax(code);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes("activate A"))).toBe(true);
  });

  // ── Comments ignored ──────────────────────────────────────────────────────

  it('ignores %% comments', () => {
    const code = [
      'graph TD',
      '%% This is a comment with end keyword in it',
      '  A --> B',
    ].join('\n');
    const result = validateMermaidSyntax(code);
    expect(result.valid).toBe(true);
  });

  // ── errorMessage format ───────────────────────────────────────────────────

  it('provides a combined errorMessage with all issues', () => {
    const code = [
      'sequenceDiagram',
      '  alt Unclosed',
      '    activate X',
      // no end, no deactivate
    ].join('\n');
    const result = validateMermaidSyntax(code);
    expect(result.valid).toBe(false);
    // Both unclosed block and unmatched activate should appear
    expect(result.errorMessage).toMatch(/Unclosed 'alt'/);
    expect(result.errorMessage).toMatch(/activate X.*no matching.*deactivate X/i);
  });
});

describe('buildDetailedErrorMessage', () => {
  it('returns "Invalid Mermaid syntax." when both parseError and structural errors are empty', () => {
    const msg = buildDetailedErrorMessage('graph TD\n  A --> B', '');
    expect(msg).toBe('Invalid Mermaid syntax.');
  });

  it('includes the parser error when provided', () => {
    const msg = buildDetailedErrorMessage('graph TD\n  A --> B', 'Unexpected token on line 2');
    expect(msg).toContain('Parser error: Unexpected token on line 2');
  });

  it('includes structural errors when the diagram has them', () => {
    const brokenCode = ['sequenceDiagram', '  alt Outer', '  A->>B: msg'].join('\n');
    const msg = buildDetailedErrorMessage(brokenCode, '');
    expect(msg).toContain('Structural issues detected:');
    expect(msg).toContain("Unclosed 'alt'");
  });

  it('combines parser error and structural errors', () => {
    const brokenCode = ['sequenceDiagram', '  alt Outer', '  A->>B: msg'].join('\n');
    const msg = buildDetailedErrorMessage(brokenCode, 'Parse failed at token "msg"');
    expect(msg).toContain('Parser error:');
    expect(msg).toContain('Structural issues detected:');
  });
});
