import type { USPlate } from '@/data/us-plates';

export function filterPlates(
  plates: USPlate[],
  colorFilter: string,
  selectedState: string | null
): USPlate[] {
  let result = plates;
  if (colorFilter !== 'all') {
    result = result.filter((p) => p.colors.includes(colorFilter));
  }
  if (selectedState !== null) {
    result = result.filter((p) => p.state === selectedState);
  }
  return result;
}

export function getHighlightedStates(plates: USPlate[], colorFilter: string): Set<string> {
  if (colorFilter === 'all') return new Set<string>();
  return new Set(plates.filter((p) => p.colors.includes(colorFilter)).map((p) => p.state));
}
