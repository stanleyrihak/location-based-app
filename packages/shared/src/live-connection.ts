import { reconnectDelayMs } from './live.ts';
import type { Order, PositionMessage } from './types.ts';

/** The parts of a WebSocket the connection uses (the browser/React Native WebSocket fits). */
export type LiveSocket = {
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: ((event: { code: number }) => void) | null;
  close(): void;
};

type Options = {
  /** Opens a new socket to the server. */
  open: () => LiveSocket;
  /** After every (re)connect: fetch the list again, to catch what happened while away. */
  onOpen: () => void;
  /** An order changed. */
  onOrder: (order: Order) => void;
  /** The other side of a delivery walk moved. */
  onPosition?: (message: PositionMessage) => void;
  onConnectedChange: (connected: boolean) => void;
  /** The server refused the token (close code 4401). */
  onUnauthorized?: () => void;
};

/**
 * The server sends a ping every 20 s. Nothing for this long means the connection is dead
 * without a close event (Wi-Fi switch, the server's computer asleep), so we reconnect.
 */
export const SILENCE_MS = 45_000;

/** Close code for a token the server doesn't know. */
const UNAUTHORIZED = 4401;

/**
 * One live connection to the server, without React, so it can be tested.
 *
 * - `start()` connects (when the app is active). `pause()` closes without reconnecting (when
 *   the app goes to the background). `stop()` closes for good (sign-out, unmount).
 * - A dropped connection reconnects after 1 s, 2 s, 4 s … (at most 30 s).
 * - Events of a socket we already closed or replaced are ignored, so a late close can't mark
 *   the new socket as down or start a second one.
 */
export function createLiveConnection(options: Options) {
  let socket: LiveSocket | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let silenceTimer: ReturnType<typeof setTimeout> | undefined;
  let attempt = 0;
  let stopped = false;

  function watchSilence(current: LiveSocket) {
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      if (socket !== current) return;
      dropped(current);
      current.close();
    }, SILENCE_MS);
  }

  /** The current socket is gone: report it and try again later. */
  function dropped(current: LiveSocket) {
    if (socket !== current) return;
    socket = null;
    clearTimeout(silenceTimer);
    options.onConnectedChange(false);
    if (stopped) return;
    clearTimeout(retryTimer);
    retryTimer = setTimeout(connect, reconnectDelayMs(attempt));
    attempt += 1;
  }

  function connect() {
    if (stopped || socket) return;
    const current = options.open();
    socket = current;

    current.onopen = () => {
      if (socket !== current) return;
      attempt = 0;
      options.onConnectedChange(true);
      watchSilence(current);
      options.onOpen();
    };

    current.onmessage = (event) => {
      if (socket !== current) return;
      watchSilence(current);
      let message: { type?: string; order?: Order; orderId?: string; position?: unknown };
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (message.type === 'order.updated' && message.order) options.onOrder(message.order);
      if (
        (message.type === 'seller.position' || message.type === 'customer.position') &&
        message.orderId &&
        message.position
      ) {
        options.onPosition?.(message as PositionMessage);
      }
    };

    current.onclose = (event) => {
      if (socket !== current) return;
      if (event.code === UNAUTHORIZED) {
        socket = null;
        clearTimeout(silenceTimer);
        options.onConnectedChange(false);
        options.onUnauthorized?.();
        return;
      }
      dropped(current);
    };
  }

  function close() {
    clearTimeout(retryTimer);
    clearTimeout(silenceTimer);
    const current = socket;
    socket = null;
    if (current) {
      current.close();
      options.onConnectedChange(false);
    }
  }

  return {
    start() {
      attempt = 0;
      connect();
    },
    pause: close,
    stop() {
      stopped = true;
      close();
    },
  };
}
