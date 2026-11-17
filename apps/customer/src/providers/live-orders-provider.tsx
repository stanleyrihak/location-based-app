import { useLiveOrders } from '@shoot/ui';
import { createContext, type PropsWithChildren, use } from 'react';

import { API_URL } from '@/data/http';
import { endSession, getToken } from '@/data/session';
import { useOnboarding } from '@/providers/onboarding-provider';

const LiveContext = createContext(false);

/** True while the live connection to the server is open (then the Orders list needn't poll). */
export function useLiveConnected() {
  return use(LiveContext);
}

/**
 * While signed in, keeps the customer's orders live: when the café accepts, declines or walks
 * the order over, every screen showing it updates within a second, without pulling to refresh.
 */
export function LiveOrdersProvider({ children }: PropsWithChildren) {
  const { hasOnboarded } = useOnboarding();
  const token = hasOnboarded ? getToken() : null;
  // "http://…:4000" becomes "ws://…:4000/ws?token=…": the same server, its WebSocket address.
  const url = token
    ? `${API_URL.replace(/^http/, 'ws')}/ws?token=${encodeURIComponent(token)}`
    : null;
  const { connected } = useLiveOrders({ url, queryKey: ['orders'], onUnauthorized: endSession });

  return <LiveContext.Provider value={connected}>{children}</LiveContext.Provider>;
}
