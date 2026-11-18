import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, type PropsWithChildren, use, useEffect, useState } from 'react';

import * as api from '@/data/api';
import { endSession, getToken, onSessionEnd, setToken } from '@/data/session';
import { askNotificationPermission } from '@/notifications/new-order-alert';

type SessionValue = {
  /** True while a token is saved: decides between sign-in and the tabs. */
  signedIn: boolean;
  /** The seller and their café, once loaded. */
  seller: api.Seller | undefined;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function useSession() {
  const value = use(SessionContext);
  if (!value) {
    throw new Error('useSession must be wrapped in a <SessionProvider />');
  }
  return value;
}

/**
 * Who is signed in. The token decides it (read once at start, then kept in state); the seller's
 * details come from GET /seller/me. Any 401 from the server ends the session (data/session.ts),
 * which lands here and shows sign-in again with an empty cache.
 */
export function SessionProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [signedIn, setSignedIn] = useState(() => getToken() !== null);

  const me = useQuery({ queryKey: ['seller-me'], queryFn: api.getMe, enabled: signedIn });

  // A signed-in seller needs to hear new orders: ask once, right after sign-in (or app start).
  // There are no push notifications: the app rings only while it's open, through the live
  // connection (notifications/new-order-alert.ts).
  useEffect(() => {
    if (!signedIn) return;
    void askNotificationPermission();
  }, [signedIn]);

  useEffect(
    () =>
      onSessionEnd(() => {
        setSignedIn(false);
        // The next person on this phone must not see this café's orders.
        queryClient.clear();
      }),
    [queryClient],
  );

  async function signIn(email: string, password: string) {
    const { token, seller } = await api.signIn(email, password);
    setToken(token);
    queryClient.setQueryData(['seller-me'], seller);
    setSignedIn(true);
  }

  async function signOut() {
    // Tell the server first (it ends the session there); sign out locally even if that fails,
    // for example without a connection.
    await api.signOut().catch(() => {});
    endSession();
  }

  return (
    <SessionContext.Provider value={{ signedIn, seller: me.data, signIn, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}
