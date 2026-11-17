import { useQuery } from '@tanstack/react-query';

import { getQueue } from '@/data/api';
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
