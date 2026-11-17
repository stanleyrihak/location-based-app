import { trackKey } from '@shoot/ui';
import { useQuery } from '@tanstack/react-query';

import { getQueue, getTrack } from '@/data/api';
import { QUEUE_KEY, useLiveConnected } from '@/providers/live-orders-provider';

/**
 * The café's orders. The live connection keeps them up to date; only while it's down does
 * this ask the server again every 30 s, so a new order is never missed for long.
 */
export function useQueue() {
  const live = useLiveConnected();
  return useQuery({
    queryKey: QUEUE_KEY,
    queryFn: getQueue,
    refetchInterval: live ? false : 30_000,
  });
}

/**
 * The customer's live dot while the order is on its way. Fetched once when the screen opens,
 * then kept fresh by the live connection (same cache entry); polled only while that's down.
 */
export function useTrack(orderId: string, onTheWay: boolean) {
  const live = useLiveConnected();
  return useQuery({
    queryKey: trackKey(orderId),
    queryFn: () => getTrack(orderId),
    enabled: onTheWay,
    refetchInterval: live ? false : 30_000,
  });
}
