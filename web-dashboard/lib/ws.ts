'use client';
// ============================================================
// WebSocket client hook — real-time messages from the bridge
// ============================================================

import { useEffect, useRef, useCallback, useState } from 'react';
import { getToken } from './auth';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

export type WsMessage = {
  type: string;
  serverId: string;
  data: unknown;
  timestamp: number;
};

type MessageHandler = (msg: WsMessage) => void;

/**
 * useWebSocket — hook for subscribing to real-time bridge events.
 * @param serverId  Subscribe to events for a specific server (optional)
 * @param handler   Callback invoked for every matching message
 */
export function useWebSocket(
  serverId: string | null,
  handler: MessageHandler
) {
  const wsRef      = useRef<WebSocket | null>(null);
  const handlerRef = useRef(handler);
  const [connected, setConnected] = useState(false);

  // Always use the latest handler without re-connecting
  useEffect(() => { handlerRef.current = handler; }, [handler]);

  const connect = useCallback(() => {
    const token = getToken();
    if (!token) return;

    const url = `${WS_URL}/ws?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      // Subscribe to specific server if given
      if (serverId) {
        ws.send(JSON.stringify({ type: 'subscribe', serverId }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        handlerRef.current(msg);
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Auto-reconnect after 3s
      setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [serverId]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected };
}
