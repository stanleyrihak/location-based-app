import { useLiveOrders } from '@shoot/ui';
import { createContext, type PropsWithChildren, use } from 'react';

import { liveUrl } from '@/data/api';
import { getToken } from '@/data/session';
import { alertNewOrder } from '@/notifications/new-order-alert';
import { useSession } from '@/providers/session-provider';

/** The café's order list in the React Query cache. */
export const QUEUE_KEY = ['seller-orders'] as const;

const LiveContext = createContext(false);

/** True while the live connection is open (then the queue needn't poll). */
export function useLiveConnected() {
  return use(LiveContext);
}

/**
 * While signed in, keeps the café's orders live: a new paid order appears in the queue within
 * a second and rings the phone, and changes made elsewhere (the timer expiring an order) show up too.
 */
export function LiveOrdersProvider({ children }: PropsWithChildren) {
  const { signedIn } = useSession();
  const { connected } = useLiveOrders({
    url: liveUrl(signedIn ? getToken() : null),
    queryKey: QUEUE_KEY,
    // Ring when an order becomes "received" (paid, waiting for the café). Orders already in
    // the list when the app opened don't ring: only changes that arrive live do.
    onUpdate: (order, previous) => {
      if (order.status === 'received' && previous?.status !== 'received') {
        void alertNewOrder(order);
      }
    },
  });
  return <LiveContext.Provider value={connected}>{children}</LiveContext.Provider>;
}
