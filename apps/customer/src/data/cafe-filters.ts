import type { Cafe, CafeCategory, MenuItem } from '@/data/types';

export type CafeFilterId = 'all' | CafeCategory | 'open';

/** The chips on the home screen, in display order. Add a filter here, not in the JSX. */
export const CAFE_FILTERS: { id: CafeFilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'coffee', label: 'Coffee' },
  { id: 'pastry', label: 'Pastry' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'open', label: 'Open now' },
];

/**
 * The cafés that match a filter. Generic so a list of NearbyCafe stays NearbyCafe.
 * `now` is a parameter so the result doesn't depend on hidden state, and is easy to test.
 */
export function filterCafes<T extends Cafe>(cafes: T[], filter: CafeFilterId, now: Date): T[] {
  switch (filter) {
    case 'all':
      return cafes;
    case 'open':
      return cafes.filter((cafe) => isOpen(cafe, now));
    default:
      return cafes.filter((cafe) => cafe.categories.includes(filter));
  }
}

/**
 * The mock data only has a closing time, so "open" means "not closed yet today".
 * A café closing after midnight ("01:00") would count as closed; real opening hours
 * from a backend would fix that.
 */
function isOpen(cafe: Cafe, now: Date): boolean {
  const [hours, minutes] = cafe.openUntil.split(':').map(Number);
  const closesAt = hours * 60 + minutes;
  const current = now.getHours() * 60 + now.getMinutes();
  return current < closesAt;
}

/**
 * The cafés whose name, or one of whose products, contains `query`.
 * Ignores case and accents, so "cafe" finds "Café". An empty query keeps every café.
 */
export function searchCafes<T extends Cafe>(cafes: T[], query: string, items: MenuItem[]): T[] {
  const needle = normalize(query.trim());
  if (needle === '') {
    return cafes;
  }
  const cafeIdsWithMatch = new Set(
    items.filter((item) => normalize(item.name).includes(needle)).map((item) => item.cafeId),
  );
  return cafes.filter(
    (cafe) => normalize(cafe.name).includes(needle) || cafeIdsWithMatch.has(cafe.id),
  );
}

/** "Café" → "cafe": lower case, accents removed (NFD splits é into e and a combining mark). */
function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
