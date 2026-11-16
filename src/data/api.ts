import { MOCK_CAFES } from '@/data/mock/cafes';
import type { Cafe, Coordinates } from '@/data/types';
import { moveBy } from '@/utils/geo';

/** Pretend network time, so screens show their loading state like they will with a real backend. */
const FAKE_DELAY_MS = 400;

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// The mock cafés are placed around the first location the app asks with,
// and then stay there. So if you walk away, the distance really changes.
let mockAnchor: Coordinates | null = null;

/** Cafés near `near`. The backend will decide what "near" means. The mock returns all of them. */
export async function getCafes(near: Coordinates): Promise<Cafe[]> {
  await wait(FAKE_DELAY_MS);

  mockAnchor ??= near;
  const anchor = mockAnchor;

  return MOCK_CAFES.map(({ offset, ...cafe }) => ({
    ...cafe,
    coordinates: moveBy(anchor, offset.northM, offset.eastM),
  }));
}
