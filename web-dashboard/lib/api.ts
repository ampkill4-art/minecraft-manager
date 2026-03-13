// ============================================================
// API client — typed fetch wrapper for the bridge REST API
// ============================================================

import { getToken } from './auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  };

  const res = await fetch(`${BASE_URL}/api${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'API error');
  }

  return res.json();
}

// Auth
export const login = (username: string, password: string) =>
  request<{ token: string; username: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

// Servers
export const getServers = () =>
  request<{ servers: Server[] }>('/servers');

export const getServer = (id: string) =>
  request<{ server: Server }>(`/servers/${id}`);

// Commands
export const sendCommand = (serverId: string, command: string) =>
  request<{ requestId: string }>(`/servers/${serverId}/command`, {
    method: 'POST',
    body: JSON.stringify({ command }),
  });

// Chat
export const sendChat = (serverId: string, message: string) =>
  request<{ status: string }>(`/servers/${serverId}/chat`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });

// Files
export const listFiles = (serverId: string, path = '/') =>
  request<{ requestId: string }>(`/servers/${serverId}/files?path=${encodeURIComponent(path)}`);

export const readFile = (serverId: string, path: string) =>
  request<{ requestId: string }>(`/servers/${serverId}/files/read?path=${encodeURIComponent(path)}`);

export const writeFile = (serverId: string, path: string, content: string) =>
  request<{ requestId: string }>(`/servers/${serverId}/files/write`, {
    method: 'POST',
    body: JSON.stringify({ path, content }),
  });

export const deleteFile = (serverId: string, path: string) =>
  request<{ requestId: string }>(`/servers/${serverId}/files/delete`, {
    method: 'POST',
    body: JSON.stringify({ path }),
  });

// Players
export const kickPlayer = (serverId: string, name: string, reason?: string) =>
  request<{ requestId: string }>(`/servers/${serverId}/players/${name}/kick`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

export const banPlayer = (serverId: string, name: string, reason?: string) =>
  request<{ requestId: string }>(`/servers/${serverId}/players/${name}/ban`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

// Backups
export const createBackup = (serverId: string) =>
  request<{ requestId: string }>(`/servers/${serverId}/backup`, {
    method: 'POST',
    body: JSON.stringify({ action: 'create' }),
  });

export const listBackups = (serverId: string) =>
  request<{ requestId: string }>(`/servers/${serverId}/backup`, {
    method: 'POST',
    body: JSON.stringify({ action: 'list' }),
  });

// ── Types used by the API ──────────────────────────────────

export interface Server {
  serverId: string;
  online: boolean;
  firstSeen: number;
  lastHeartbeat: number;
  status: ServerStatus | null;
}

export interface ServerStatus {
  online: boolean;
  tps: number;
  playerCount: number;
  maxPlayers: number;
  players: Player[];
  memoryUsed: number;
  memoryMax: number;
  cpuUsage: number;
  uptime: number;
  version: string;
  motd: string;
}

export interface Player {
  name: string;
  uuid: string;
  ping: number;
  health: number;
  position: { x: number; y: number; z: number };
}

export interface ChatMessage {
  sender: string;
  message: string;
  source: 'game' | 'web';
  timestamp?: number;
}

export interface LogEntry {
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  logger: string;
  timestamp?: number;
}

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  lastModified: number;
}

export interface BackupEntry {
  name: string;
  size: number;
  createdAt: number;
}

export const getPermissions = (serverId: string) =>
  request<{ players: string[] }>(`/servers/${serverId}/permissions`);

export const setPermissions = (serverId: string, players: string[]) =>
  request<{ status: string }>(`/servers/${serverId}/permissions`, {
    method: 'POST',
    body: JSON.stringify({ players }),
  });
