import { rm } from 'node:fs/promises';
import path from 'node:path';

import type { Deps } from '../deps.ts';

/**
 * Deletes an order's two photos once the order has ended. The design promises customers
 * their photo is deleted after delivery; it goes too when an order is declined or expires.
 * A photo that's already gone is fine: `force` ignores missing files.
 */
/** Deletes one uploaded photo, for example a spot photo the customer replaced. */
export async function deletePhoto(deps: Deps, photo: string | undefined) {
  if (!photo?.startsWith('/uploads/')) return;
  // basename: only ever a file directly in the uploads folder, never a path elsewhere.
  await rm(path.join(deps.uploadsDir, path.basename(photo)), { force: true });
}

export async function deletePhotos(deps: Deps, deliveryJson: string) {
  const delivery = JSON.parse(deliveryJson) as { kind: string; selfie?: string; spot?: string };
  if (delivery.kind !== 'photos') return;

  for (const photo of [delivery.selfie, delivery.spot]) {
    await deletePhoto(deps, photo);
  }
}
