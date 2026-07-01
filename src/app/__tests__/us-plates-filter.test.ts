import { US_PLATES } from '@/data/us-plates';

const VALID_COLORS = new Set(['white', 'blue', 'green', 'yellow', 'red']);
const VALID_DIFFICULTIES = new Set(['easy', 'somewhat', 'harder']);

describe('US_PLATES data shape', () => {
  it('contains 88 entries', () => {
    expect(US_PLATES.length).toBe(88);
  });

  it('every entry has a non-empty state name', () => {
    for (const plate of US_PLATES) {
      expect(typeof plate.state).toBe('string');
      expect(plate.state.length).toBeGreaterThan(0);
    }
  });

  it('every entry has a valid difficulty', () => {
    for (const plate of US_PLATES) {
      expect(VALID_DIFFICULTIES.has(plate.difficulty)).toBe(true);
    }
  });

  it('every entry has at least one valid color', () => {
    for (const plate of US_PLATES) {
      expect(Array.isArray(plate.colors)).toBe(true);
      expect(plate.colors.length).toBeGreaterThan(0);
      for (const color of plate.colors) {
        expect(VALID_COLORS.has(color)).toBe(true);
      }
    }
  });

  it('every entry has a non-empty file name', () => {
    for (const plate of US_PLATES) {
      expect(plate.file).toMatch(/^plate_(?:r\d+|last)_c\d+\.png$/);
    }
  });
});
