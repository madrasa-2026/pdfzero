/**
 * Candidate password generators and smart recovery permutation engine.
 * 100% client-side execution in-browser.
 */

export interface ClueOptions {
  keywords?: string[];
  numbers?: string[];
  symbols?: string[];
}

/**
 * Top 150 most common passwords, defaults, and common file keywords globally.
 */
export const COMMON_PDF_PASSWORDS: string[] = [
  '', // Empty password (test for owner-only restrictions)
  '123456',
  'password',
  '12345678',
  '1234',
  '12345',
  '123456789',
  'admin',
  'welcome',
  'guest',
  '111111',
  '000000',
  '123123',
  'qwerty',
  'iloveyou',
  'pass',
  'pass123',
  'password123',
  'pdf',
  'pdf123',
  'book',
  'book123',
  'read',
  'secret',
  'private',
  'document',
  'statement',
  'salary',
  'payroll',
  'invoice',
  'bank',
  'master',
  'root',
  'user',
  'test',
  'demo',
  '1234567',
  '888888',
  '999999',
  '666666',
  '777777',
  '121212',
  '131313',
  '232323',
  'login',
  'access',
  'change',
  'changeme',
  'trustno1',
  'dragon',
  'baseball',
  'football',
  'superman',
  'monkey',
  'shadow',
  'sunshine',
  'starwars',
  'computer',
  'internet',
  'freedom',
  'forever',
  'coffee',
  'family',
  'safety',
  'secure',
  'security',
];

/**
 * Top repetitive and sequential 6-digit numeric PINs.
 */
export const TOP_6DIGIT_PINS: string[] = [
  '123456',
  '000000',
  '111111',
  '222222',
  '333333',
  '444444',
  '555555',
  '666666',
  '777777',
  '888888',
  '999999',
  '654321',
  '112233',
  '121212',
  '123123',
  '123321',
  '258025',
  '147258',
  '369258',
  '159357',
  '987654',
  '102030',
  '010203',
  '110011',
  '001100',
  '131313',
  '212121',
  '313131',
  '414141',
  '515151',
  '696969',
  '789456',
  '456789',
  '159753',
  '753951',
  '147852',
  '258741',
  '369852',
  '852963',
  '963852',
];

/**
 * Generates all 10,000 4-digit numeric PINs padded with zeros ('0000' to '9999').
 */
export function generate4DigitPins(): string[] {
  const pins = new Array<string>(10000);
  for (let i = 0; i < 10000; i++) {
    pins[i] = i < 10 ? `000${i}` : i < 100 ? `00${i}` : i < 1000 ? `0${i}` : `${i}`;
  }
  return pins;
}

/**
 * Generates chronological 4-digit years from startYear to endYear.
 */
export function generateYears(startYear = 1940, endYear = 2030): string[] {
  const years: string[] = [];
  for (let y = startYear; y <= endYear; y++) {
    years.push(String(y));
  }
  return years;
}

/**
 * Generates smart permutations from user clues (keywords, numbers, symbols).
 * Generates lowercase, uppercase, TitleCase, and combinations with suffixes.
 */
export function generateCluePermutations(options: ClueOptions): string[] {
  const results = new Set<string>();

  const rawKeywords = (options.keywords || [])
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  const rawNumbers = (options.numbers || [])
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  const rawSymbols = (options.symbols || [])
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const baseWords: string[] = [];
  for (const word of rawKeywords) {
    const lower = word.toLowerCase();
    const upper = word.toUpperCase();
    const title = lower.charAt(0).toUpperCase() + lower.slice(1);

    baseWords.push(lower, upper, title);
    results.add(lower);
    results.add(upper);
    results.add(title);
  }

  // Add numbers as standalone
  for (const num of rawNumbers) {
    results.add(num);
  }

  // Combine words with numbers
  for (const word of baseWords) {
    for (const num of rawNumbers) {
      results.add(`${word}${num}`);
      results.add(`${num}${word}`);
      results.add(`${word}_${num}`);
      results.add(`${word}-${num}`);
    }
  }

  // Combine words with symbols
  for (const word of baseWords) {
    for (const sym of rawSymbols) {
      results.add(`${word}${sym}`);
      results.add(`${sym}${word}`);
    }
  }

  // Combine word + number + symbol
  for (const word of baseWords) {
    for (const num of rawNumbers) {
      for (const sym of rawSymbols) {
        results.add(`${word}${num}${sym}`);
        results.add(`${word}${sym}${num}`);
      }
    }
  }

  return Array.from(results);
}

/**
 * Prepares the multi-stage candidate batches for the automated Smart Recovery pipeline.
 */
export function generateSmartRecoveryBatches(userClues?: ClueOptions): {
  stageId: string;
  label: string;
  candidates: string[];
}[] {
  const batches: { stageId: string; label: string; candidates: string[] }[] = [];

  // Stage 1: Instant Quick Check (Empty, Common Defaults, Years 1990-2026)
  const quickSet = new Set<string>([
    ...COMMON_PDF_PASSWORDS,
    ...generateYears(1990, 2026),
  ]);
  batches.push({
    stageId: 'stage1-instant',
    label: 'Instant Quick Check (Top defaults & recent years)',
    candidates: Array.from(quickSet),
  });

  // Stage 2: Full 4-Digit Numeric PIN Sweep (0000 - 9999)
  batches.push({
    stageId: 'stage2-pin4',
    label: '4-Digit Numeric PIN Sweep (0000–9999)',
    candidates: generate4DigitPins(),
  });

  // Stage 3: Top 6-Digit PINs and Historical Years (1940 - 1989)
  const common6Set = new Set<string>([
    ...TOP_6DIGIT_PINS,
    ...generateYears(1940, 1989),
  ]);
  batches.push({
    stageId: 'stage3-common6',
    label: 'Common 6-Digit PINs & Historical Years (1940–1989)',
    candidates: Array.from(common6Set),
  });

  // Stage 4: User Clues (if provided)
  if (userClues && (userClues.keywords?.length || userClues.numbers?.length)) {
    const clueCandidates = generateCluePermutations(userClues);
    if (clueCandidates.length > 0) {
      batches.push({
        stageId: 'stage4-clues',
        label: 'User Clue Permutations',
        candidates: clueCandidates,
      });
    }
  }

  return batches;
}
