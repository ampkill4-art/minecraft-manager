// ============================================================
// NATS Connection Manager
// Handles connecting, reconnecting, and graceful shutdown
// ============================================================

import { connect, NatsConnection, StringCodec } from 'nats';

const sc = StringCodec();
let nc: NatsConnection | null = null;

/** Connect to the NATS broker */
export async function connectNats(url: string): Promise<NatsConnection> {
  console.log(`[NATS] Connecting to ${url}...`);

  nc = await connect({
    servers: url,
    reconnect: true,
    maxReconnectAttempts: -1, // infinite reconnects
    reconnectTimeWait: 2000,  // 2s between attempts
    pingInterval: 15_000,     // keepalive ping every 15s
    name: 'minecraft-nats-bridge',
  });

  console.log(`[NATS] Connected to ${nc.getServer()}`);

  // Monitor connection events
  (async () => {
    for await (const s of nc.status()) {
      switch (s.type) {
        case 'disconnect':
          console.warn('[NATS] Disconnected');
          break;
        case 'reconnect':
          console.log('[NATS] Reconnected');
          break;
        case 'error':
          console.error('[NATS] Error:', s.data);
          break;
      }
    }
  })();

  return nc;
}

/** Publish a JSON payload to a subject */
export function publish(subject: string, data: unknown): void {
  if (!nc) throw new Error('NATS not connected');
  nc.publish(subject, sc.encode(JSON.stringify(data)));
}

/** Subscribe to a subject and invoke the handler for each message */
export function subscribe(
  subject: string,
  handler: (data: unknown, subject: string) => void
) {
  if (!nc) throw new Error('NATS not connected');
  const sub = nc.subscribe(subject);

  (async () => {
    for await (const msg of sub) {
      try {
        const parsed = JSON.parse(sc.decode(msg.data));
        handler(parsed, msg.subject);
      } catch (err) {
        console.error(`[NATS] Failed to parse message on ${msg.subject}:`, err);
      }
    }
  })();

  return sub;
}

/** Get the raw NATS connection */
export function getConnection(): NatsConnection | null {
  return nc;
}

/** Gracefully close the connection */
export async function closeNats(): Promise<void> {
  if (nc) {
    await nc.drain();
    console.log('[NATS] Connection closed');
  }
}
