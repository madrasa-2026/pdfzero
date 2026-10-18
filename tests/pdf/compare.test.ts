import { describe, it, expect } from 'vitest';
import {
  tokenizeText,
  diffTokenArrays,
  calculateDiffStats,
  comparePageTexts,
} from '../../src/lib/pdf/compare';

describe('PDF Diff Comparator Engine', () => {
  it('tokenizes text into words, punctuation, and whitespace', () => {
    const text = 'Contract agreement: Clause 1.0 (Signed).';
    const tokens = tokenizeText(text);
    expect(tokens).toContain('Contract');
    expect(tokens).toContain('agreement');
    expect(tokens).toContain(':');
    expect(tokens).toContain('Clause');
    expect(tokens).toContain('(');
  });

  it('detects insertions, deletions, and exact words', () => {
    const strA = 'The quick brown fox jumps over the lazy dog';
    const strB = 'The fast brown fox leaps over the lazy dog';

    const tokensA = tokenizeText(strA);
    const tokensB = tokenizeText(strB);

    const diffs = diffTokenArrays(tokensA, tokensB);

    // Should detect deletion of "quick" and insertion of "fast"
    const deleted = diffs.filter((d) => d.type === 'delete').map((d) => d.value);
    const inserted = diffs.filter((d) => d.type === 'insert').map((d) => d.value);

    expect(deleted).toContain('quick');
    expect(deleted).toContain('jumps');
    expect(inserted).toContain('fast');
    expect(inserted).toContain('leaps');

    const stats = calculateDiffStats(diffs);
    expect(stats.additions).toBe(2); // 'fast', 'leaps'
    expect(stats.deletions).toBe(2); // 'quick', 'jumps'
    expect(stats.similarityPercentage).toBeGreaterThan(60);
  });

  it('handles completely identical texts (100% similarity)', () => {
    const text = 'AirPDF is 100% private and in-browser.';
    const tokensA = tokenizeText(text);
    const tokensB = tokenizeText(text);

    const diffs = diffTokenArrays(tokensA, tokensB);
    const stats = calculateDiffStats(diffs);

    expect(stats.additions).toBe(0);
    expect(stats.deletions).toBe(0);
    expect(stats.similarityPercentage).toBe(100);
  });

  it('formats side-by-side page comparison results cleanly', () => {
    const pageA = 'Monthly subscription fee is $30 per user.';
    const pageB = 'Monthly subscription fee is $0 100% free for all.';

    const result = comparePageTexts(1, pageA, pageB);
    expect(result.pageNumber).toBe(1);
    expect(result.tokensA.some((t) => t.type === 'delete' && t.value === '30')).toBe(true);
    expect(result.tokensB.some((t) => t.type === 'insert' && t.value === '0')).toBe(true);
    expect(result.stats.deletions).toBeGreaterThan(0);
    expect(result.stats.additions).toBeGreaterThan(0);
  });
});
