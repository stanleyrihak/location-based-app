import { createLiveConnection, type LiveSocket, type Order, writeLiveOrder } from '@shoot/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

type Options = {
  /** The server's WebSocket address with the token ("ws://…/ws?token=…"), or null when signed out. */
  url: string | null;
  /** The React Query key of the order list to keep up to date, like ['orders']. */
  queryKey: readonly unknown[];
  /**
   * Called for every incoming order with the cached version from before it (undefined when the
   * order is new), after the cache is updated. The seller app uses it to ring for new orders.
   */
  onUpdate?: (order: Order, previous: Order | undefined) => void;
  /** The server refused the token: the session ended (for example, the account was removed). */
  onUnauthorized?: () => void;
};

/**
 * Keeps an order list live: the server sends each change over a WebSocket, and this writes it
 * straight into the React Query cache, so every screen that shows the orders updates at once.
 *
 * - When the connection drops, it reconnects after 1 s, 2 s, 4 s … (at most 30 s). Silence for
 *   45 s also counts as a drop: the server pings every 20 s.
 * - After every (re)connect it refetches the list, to catch what happened while disconnected.
 * - In the background it disconnects (phones pause background apps anyway), and reconnects on
 *   return.
 *
 * `connected` lets screens poll only while the live connection is down.
 */
export function useLiveOrders({
  url,
  queryKey,
  onUpdate,
  onUnauthorized,
}: Options): { connected: boolean } {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  // The newest options for the socket's event handlers, without reconnecting when they change.
  const latest = useRef({ queryKey, onUpdate, onUnauthorized });
  useEffect(() => {
    latest.current = { queryKey, onUpdate, onUnauthorized };
  });
  const keyText = JSON.stringify(queryKey);

  useEffect(() => {
    if (!url) return;
    const address = url;

    const live = createLiveConnection({
      // A real WebSocket has these handlers; its event types are wider than the test's fake.
      open: () => new WebSocket(address) as unknown as LiveSocket,
      // Whatever changed while we were away comes in with a fresh fetch.
      onOpen: () => void queryClient.invalidateQueries({ queryKey: latest.current.queryKey }),
      onOrder: (order) => {
        const previous = writeLiveOrder(queryClient, latest.current.queryKey, order);
        latest.current.onUpdate?.(order, previous);
      },
      onConnectedChange: setConnected,
      onUnauthorized: () => latest.current.onUnauthorized?.(),
    });

    live.start();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') live.start();
      else if (state === 'background') live.pause();
    });

    return () => {
      subscription.remove();
      live.stop();
    };
    // keyText stands for queryKey: a new array with the same contents must not reconnect.
  }, [url, keyText, queryClient]);

  return { connected };
}
