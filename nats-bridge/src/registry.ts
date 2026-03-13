// ============================================================
// Server Registry
// In-memory store tracking all connected Minecraft servers
// ============================================================

import { TrackedServer, ServerStatus } from './types';

/** Map of serverId → server state */
const servers = new Map<string, TrackedServer>();

/** Timeout (ms) before a server is considered offline */
const HEARTBEAT_TIMEOUT = 30_000; // 30 seconds

/** Register or update a server's status */
export function updateServerStatus(serverId: string, status: ServerStatus): void {
  const existing = servers.get(serverId);
  servers.set(serverId, {
    serverId,
    status,
    lastHeartbeat: Date.now(),
    firstSeen: existing?.firstSeen ?? Date.now(),
    online: true,
  });
}

/** Record a heartbeat from a server */
export function recordHeartbeat(serverId: string): void {
  const server = servers.get(serverId);
  if (server) {
    server.lastHeartbeat = Date.now();
    server.online = true;
  } else {
    // First time seeing this server via heartbeat
    servers.set(serverId, {
      serverId,
      status: null,
      lastHeartbeat: Date.now(),
      firstSeen: Date.now(),
      online: true,
    });
  }
}

/** Get all tracked servers */
export function getAllServers(): TrackedServer[] {
  return Array.from(servers.values());
}

/** Get a specific server */
export function getServer(serverId: string): TrackedServer | undefined {
  return servers.get(serverId);
}

/** Mark timed-out servers as offline (run on interval) */
export function pruneStaleServers(): void {
  const now = Date.now();
  for (const [, server] of servers) {
    if (now - server.lastHeartbeat > HEARTBEAT_TIMEOUT) {
      server.online = false;
    }
  }
}

/** Start periodic pruning every 10 seconds */
export function startPruning(): void {
  setInterval(pruneStaleServers, 10_000);
}
