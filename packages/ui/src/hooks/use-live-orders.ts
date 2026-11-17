import { applyOrderUpdate, type Order, reconnectDelayMs } from '@shoot/shared';
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
};

/**
 * Keeps an order list live: the server sends each change over a WebSocket, and this writes it
 * straight into the React Query cache, so every screen that shows the orders updates at once.
 *
 * - When the connection drops, it reconnects after 1 s, 2 s, 4 s … (at most 30 s).
 * - After every (re)connect it refetches the list, to catch what happened while disconnected.
 * - In the background it disconnects (phones pause background apps anyway), and reconnects on
 *   return.
 *
 * `connected` lets screens poll only while the live connection is down.
 */
export function useLiveOrders({ url, queryKey, onUpdate }: Options): { connected: boolean } {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  // The newest options for the socket's event handlers, without reconnecting when they change.
  const latest = useRef({ queryKey, onUpdate });
  useEffect(() => {
    latest.current = { queryKey, onUpdate };
  });
  const keyText = JSON.stringify(queryKey);

  useEffect(() => {
    if (!url) return;
    const address = url;

    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let stopped = false;

    function connect() {
      if (stopped || socket) return;
      const current = new WebSocket(address);
      socket = current;

      current.onopen = () => {
        attempt = 0;
        setConnected(true);
        // Whatever changed while we were away comes in with a fresh fetch.
        void queryClient.invalidateQueries({ queryKey: latest.current.queryKey });
      };

      current.onmessage = (event) => {
        let message: { type?: string; order?: Order };
        try {
          message = JSON.parse(String(event.data));
        } catch {
          return;
        }
        const order = message.order;
        if (message.type !== 'order.updated' || !order) return;

        const key = latest.current.queryKey;
        const previous = queryClient
          .getQueryData<Order[]>(key)
          ?.find((cached) => cached.id === order.id);
        queryClient.setQueryData<Order[]>(key, (orders) => applyOrderUpdate(orders, order));
        queryClient.setQueryData<Order>(['order', order.id], (old) => (old ? order : old));
        latest.current.onUpdate?.(order, previous);
      };

      current.onclose = (event) => {
        if (socket === current) socket = null;
        setConnected(false);
        // 4401: the token isn't valid. Retrying won't help; the next request's 401 signs out.
        if (stopped || event.code === 4401) return;
        retryTimer = setTimeout(connect, reconnectDelayMs(attempt));
        attempt += 1;
      };
    }

    function disconnect() {
      clearTimeout(retryTimer);
      const current = socket;
      socket = null;
      current?.close();
    }

    connect();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        attempt = 0;
        connect();
      } else if (state === 'background') {
        disconnect();
      }
    });

    return () => {
      stopped = true;
      subscription.remove();
      disconnect();
      setConnected(false);
    };
    // keyText stands for queryKey: a new array with the same contents must not reconnect.
  }, [url, keyText, queryClient]);

  return { connected };
}
