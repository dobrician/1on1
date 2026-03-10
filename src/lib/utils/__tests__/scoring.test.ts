import { describe, it, expect } from 'vitest';
import { computeSessionScore } from '../scoring';

describe('computeSessionScore', () => {
  it('returns null for an empty answers array', () => {
    expect(computeSessionScore([])).toBeNull();
  });

  it('returns null when all answers are skipped', () => {
    const answers = [
      { answerType: 'rating_1_5', answerNumeric: 3, skipped: true, scoreWeight: 1 },
      { answerType: 'rating_1_5', answerNumeric: 4, skipped: true, scoreWeight: 1 },
    ];
    expect(computeSessionScore(answers)).toBeNull();
  });

  it('returns null when all answers have non-numeric values (answerNumeric null)', () => {
    const answers = [
      { answerType: 'rating_1_5', answerNumeric: null, skipped: false, scoreWeight: 1 },
    ];
    expect(computeSessionScore(answers)).toBeNull();
  });

  it('returns 3 for a single rating_1_5 answer of value 3 with weight 1', () => {
    const answers = [
      { answerType: 'rating_1_5', answerNumeric: 3, skipped: false, scoreWeight: 1 },
    ];
    expect(computeSessionScore(answers)).toBe(3);
  });

  it('returns weighted average for two rating_1_5 answers with different weights', () => {
    // (2 * 1 + 4 * 3) / (1 + 3) = (2 + 12) / 4 = 3.5
    const answers = [
      { answerType: 'rating_1_5', answerNumeric: 2, skipped: false, scoreWeight: 1 },
      { answerType: 'rating_1_5', answerNumeric: 4, skipped: false, scoreWeight: 3 },
    ];
    expect(computeSessionScore(answers)).toBe(3.5);
  });

  it('normalizes rating_1_10 answer of value 10 to 5 on the 1-5 scale', () => {
    // rating_1_10: ((10 - 1) / 9) * 4 + 1 = 4 + 1 = 5
    const answers = [
      { answerType: 'rating_1_10', answerNumeric: 10, skipped: false, scoreWeight: 1 },
    ];
    expect(computeSessionScore(answers)).toBe(5);
  });

  it('normalizes rating_1_10 answer of value 1 to 1 on the 1-5 scale', () => {
    // rating_1_10: ((1 - 1) / 9) * 4 + 1 = 0 + 1 = 1
    const answers = [
      { answerType: 'rating_1_10', answerNumeric: 1, skipped: false, scoreWeight: 1 },
    ];
    expect(computeSessionScore(answers)).toBe(1);
  });

  it('normalizes yes_no answer of value 1 to 5 on the 1-5 scale', () => {
    // yes_no: 1 * 4 + 1 = 5
    const answers = [
      { answerType: 'yes_no', answerNumeric: 1, skipped: false, scoreWeight: 1 },
    ];
    expect(computeSessionScore(answers)).toBe(5);
  });

  it('normalizes yes_no answer of value 0 to 1 on the 1-5 scale', () => {
    // yes_no: 0 * 4 + 1 = 1
    const answers = [
      { answerType: 'yes_no', answerNumeric: 0, skipped: false, scoreWeight: 1 },
    ];
    expect(computeSessionScore(answers)).toBe(1);
  });

  it('excludes text-type answers from scoring', () => {
    const answers = [
      { answerType: 'text', answerNumeric: null, skipped: false, scoreWeight: 1 },
      { answerType: 'rating_1_5', answerNumeric: 4, skipped: false, scoreWeight: 1 },
    ];
    expect(computeSessionScore(answers)).toBe(4);
  });
});
