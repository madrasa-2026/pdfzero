import { describe, it, expect } from 'vitest';
import {
  generate4DigitPins,
  generateYears,
  COMMON_PDF_PASSWORDS,
  TOP_6DIGIT_PINS,
  generateCluePermutations,
  generateSmartRecoveryBatches,
} from '../../src/lib/pdf/recover';

describe('PDF Password Recovery Candidate Generators', () => {
  it('generate4DigitPins produces exactly 10,000 padded numeric PINs (0000 to 9999)', () => {
    const pins = generate4DigitPins();
    expect(pins.length).toBe(10000);
    expect(pins[0]).toBe('0000');
    expect(pins[9999]).toBe('9999');
    expect(pins[1234]).toBe('1234');
    expect(pins[42]).toBe('0042');
  });

  it('generateYears produces valid chronological year strings within range', () => {
    const years = generateYears(1950, 2030);
    expect(years.length).toBe(81);
    expect(years[0]).toBe('1950');
    expect(years[years.length - 1]).toBe('2030');
    expect(years.includes('1990')).toBe(true);
    expect(years.includes('2024')).toBe(true);
  });

  it('COMMON_PDF_PASSWORDS contains critical default and common passwords', () => {
    expect(COMMON_PDF_PASSWORDS).toContain('');
    expect(COMMON_PDF_PASSWORDS).toContain('123456');
    expect(COMMON_PDF_PASSWORDS).toContain('password');
    expect(COMMON_PDF_PASSWORDS).toContain('admin');
    expect(COMMON_PDF_PASSWORDS).toContain('1234');
    expect(COMMON_PDF_PASSWORDS.length).toBeGreaterThan(50);
  });

  it('TOP_6DIGIT_PINS contains common repetitive and sequential 6-digit PINs', () => {
    expect(TOP_6DIGIT_PINS).toContain('123456');
    expect(TOP_6DIGIT_PINS).toContain('000000');
    expect(TOP_6DIGIT_PINS).toContain('111111');
    expect(TOP_6DIGIT_PINS).toContain('112233');
    expect(TOP_6DIGIT_PINS).toContain('258025');
  });

  it('generateCluePermutations produces case variations and common suffixes without duplicates', () => {
    const clues = {
      keywords: ['book', 'secret'],
      numbers: ['123', '2024'],
      symbols: ['!'],
    };
    const permutations = generateCluePermutations(clues);

    expect(permutations).toContain('book');
    expect(permutations).toContain('Book');
    expect(permutations).toContain('BOOK');
    expect(permutations).toContain('book123');
    expect(permutations).toContain('Book2024');
    expect(permutations).toContain('secret!');
    expect(permutations).toContain('Secret123!');

    // Check deduplication
    const unique = new Set(permutations);
    expect(unique.size).toBe(permutations.length);
  });

  it('generateSmartRecoveryBatches structures multi-stage candidate lists', () => {
    const batches = generateSmartRecoveryBatches({ keywords: ['test'] });
    expect(batches.length).toBeGreaterThanOrEqual(3);
    expect(batches[0].stageId).toBe('stage1-instant');
    expect(batches[1].stageId).toBe('stage2-pin4');
    expect(batches[2].stageId).toBe('stage3-common6');
  });
});
