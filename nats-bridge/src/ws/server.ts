// ============================================================
// WebSocket Server
// Manages real-time connections to dashboard clients
// ============================================================

import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { AuthPayload } from '../types';

interface AuthenticatedClient {
  ws: WebSocket;
  username: string;
  subscribedServers: Set<string>;
}

const clients: AuthenticatedClient[] = [];

/** Initialize WebSocket server on the existing HTTP server */
export function initWebSocketServer(server: HttpServer): void {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    // Extract JWT from query string: ?token=xxx
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Authentication required');
      return;
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'fallback-secret'
      ) as AuthPayload;

      const client: AuthenticatedClient = {
        ws,
        username: decoded.username,
        subscribedServers: new Set(),
      };

      clients.push(client);
      console.log(`[WS] Client connected: ${decoded.username}`);

      // Handle incoming messages from dashboard
      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          handleClientMessage(client, msg);
        } catch {
          // Ignore malformed messages
        }
      });

      ws.on('close', () => {
        const idx = clients.indexOf(client);
        if (idx !== -1) clients.splice(idx, 1);
        console.log(`[WS] Client disconnected: ${decoded.username}`);
      });

      // Send a welcome message
      ws.send(JSON.stringify({ type: 'connected', username: decoded.username }));

    } catch {
      ws.close(4003, 'Invalid token');
    }
  });

  console.log('[WS] WebSocket server initialized on /ws');
}

/** Handle messages from dashboard clients */
function handleClientMessage(client: AuthenticatedClient, msg: { type: string; serverId?: string }) {
  switch (msg.type) {
    case 'subscribe':
      if (msg.serverId) {
        client.subscribedServers.add(msg.serverId);
        console.log(`[WS] ${client.username} subscribed to ${msg.serverId}`);
      }
      break;
    case 'unsubscribe':
      if (msg.serverId) {
        client.subscribedServers.delete(msg.serverId);
      }
      break;
  }
}

/** Broadcast data to all connected clients subscribed to a server */
export function broadcastToClients(serverId: string, type: string, data: unknown): void {
  const message = JSON.stringify({ type, serverId, data, timestamp: Date.now() });

  for (const client of clients) {
    // Send to clients subscribed to this server, or to all if subscribed to none (global view)
    if (client.ws.readyState === WebSocket.OPEN) {
      if (client.subscribedServers.size === 0 || client.subscribedServers.has(serverId)) {
        client.ws.send(message);
      }
    }
  }
}
