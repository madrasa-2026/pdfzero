export type DiffType = 'equal' | 'insert' | 'delete';

export interface DiffToken {
  type: DiffType;
  value: string;
}

export interface DiffStats {
  additions: number;
  deletions: number;
  unchanged: number;
  similarityPercentage: number;
}

export interface PageComparisonResult {
  pageNumber: number;
  tokensA: DiffToken[]; // tokens on Left (Doc A)
  tokensB: DiffToken[]; // tokens on Right (Doc B)
  stats: DiffStats;
}

export interface DocumentComparisonResult {
  totalPagesCompared: number;
  overallStats: DiffStats;
  pages: PageComparisonResult[];
}

/**
 * Tokenizes text into words and delimiters (spaces, punctuation, newlines)
 */
export function tokenizeText(text: string): string[] {
  if (!text) return [];
  // Matches whitespace blocks, word sequences, or individual punctuation marks
  const tokens = text.match(/\s+|[a-zA-Z0-9_\u00C0-\u024F\u0980-\u09FF]+|[^\s\w]/g);
  return tokens || [];
}

/**
 * Computes Myers / LCS diff between two arrays of string tokens
 */
export function diffTokenArrays(
  tokensA: string[],
  tokensB: string[],
  options: { ignoreCase?: boolean; ignoreWhitespace?: boolean } = {}
): DiffToken[] {
  const ignoreCase = options.ignoreCase ?? false;
  const ignoreWhitespace = options.ignoreWhitespace ?? false;

  const normalize = (t: string) => {
    let s = t;
    if (ignoreCase) s = s.toLowerCase();
    if (ignoreWhitespace && /^\s+$/.test(s)) s = ' ';
    return s;
  };

  const n = tokensA.length;
  const m = tokensB.length;

  if (n === 0 && m === 0) return [];
  if (n === 0) return tokensB.map((val) => ({ type: 'insert', value: val }));
  if (m === 0) return tokensA.map((val) => ({ type: 'delete', value: val }));

  // Build standard LCS matrix (with bounded matrix or dynamic programming for efficiency)
  // For long pages (e.g. 500-1000 tokens), DP table is ~1000x1000 which takes <5ms in JS
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1) as unknown as number[]);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (normalize(tokensA[i]) === normalize(tokensB[j])) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Backtrack to recover diff
  const result: DiffToken[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && normalize(tokensA[i - 1]) === normalize(tokensB[j - 1])) {
      result.unshift({ type: 'equal', value: tokensB[j - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'insert', value: tokensB[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      result.unshift({ type: 'delete', value: tokensA[i - 1] });
      i--;
    }
  }

  return result;
}

/**
 * Calculates statistics from a diff token sequence
 */
export function calculateDiffStats(diffs: DiffToken[]): DiffStats {
  let additions = 0;
  let deletions = 0;
  let unchanged = 0;

  for (const t of diffs) {
    const isWhitespace = /^\s+$/.test(t.value);
    if (!isWhitespace) {
      if (t.type === 'insert') additions++;
      else if (t.type === 'delete') deletions++;
      else unchanged++;
    }
  }

  const totalWords = additions + deletions + unchanged * 2;
  const similarity = totalWords > 0
    ? Math.round(((unchanged * 2) / totalWords) * 100)
    : 100;

  return {
    additions,
    deletions,
    unchanged,
    similarityPercentage: Math.max(0, Math.min(100, similarity)),
  };
}

/**
 * Formats diff tokens into left-side (Doc A) and right-side (Doc B) view tokens
 */
export function formatSideBySideTokens(diffs: DiffToken[]): {
  tokensA: DiffToken[];
  tokensB: DiffToken[];
} {
  const tokensA: DiffToken[] = [];
  const tokensB: DiffToken[] = [];

  for (const d of diffs) {
    if (d.type === 'equal') {
      tokensA.push({ type: 'equal', value: d.value });
      tokensB.push({ type: 'equal', value: d.value });
    } else if (d.type === 'delete') {
      tokensA.push({ type: 'delete', value: d.value });
    } else if (d.type === 'insert') {
      tokensB.push({ type: 'insert', value: d.value });
    }
  }

  return { tokensA, tokensB };
}

/**
 * Compares plain text strings of two pages and produces page diff result
 */
export function comparePageTexts(
  pageNumber: number,
  textA: string,
  textB: string,
  options: { ignoreCase?: boolean; ignoreWhitespace?: boolean } = {}
): PageComparisonResult {
  const tokensA = tokenizeText(textA);
  const tokensB = tokenizeText(textB);
  const diffs = diffTokenArrays(tokensA, tokensB, options);
  const stats = calculateDiffStats(diffs);
  const { tokensA: formattedA, tokensB: formattedB } = formatSideBySideTokens(diffs);

  return {
    pageNumber,
    tokensA: formattedA,
    tokensB: formattedB,
    stats,
  };
}
