// ============================================================
// Shared TypeScript types for all NATS message schemas
// ============================================================

/** All supported message types in the system */
export type MessageType =
  | 'status'
  | 'command_req'
  | 'command_res'
  | 'chat'
  | 'log'
  | 'heartbeat'
  | 'file_req'
  | 'file_res'
  | 'player_event'
  | 'backup_req'
  | 'backup_res';

/** Base NATS message envelope — every message follows this shape */
export interface NatsMessage {
  serverId: string;
  type: MessageType;
  timestamp: number;
  authToken?: string;
  payload: Record<string, unknown>;
}

/** Server status payload */
export interface ServerStatus {
  online: boolean;
  tps: number;
  playerCount: number;
  maxPlayers: number;
  players: PlayerInfo[];
  memoryUsed: number;   // MB
  memoryMax: number;     // MB
  cpuUsage: number;      // percentage 0-100
  uptime: number;        // seconds
  version: string;
  motd: string;
}

/** Player information */
export interface PlayerInfo {
  name: string;
  uuid: string;
  ping: number;
  health: number;
  position: { x: number; y: number; z: number };
}

/** Command request payload */
export interface CommandRequest {
  command: string;
  requestId: string;
}

/** Command response payload */
export interface CommandResponse {
  requestId: string;
  success: boolean;
  output: string;
  error?: string;
}

/** Chat message payload */
export interface ChatMessage {
  sender: string;
  message: string;
  source: 'game' | 'web';
}

/** Log entry payload */
export interface LogEntry {
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  logger: string;
}

/** File request payload */
export interface FileRequest {
  requestId: string;
  action: 'list' | 'read';
  path: string;
}

/** File response payload */
export interface FileResponse {
  requestId: string;
  success: boolean;
  files?: FileEntry[];
  content?: string;
  error?: string;
}

/** File entry */
export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  lastModified: number;
}

/** Heartbeat payload */
export interface HeartbeatPayload {
  uptimeSeconds: number;
}

/** Player event payload */
export interface PlayerEvent {
  action: 'join' | 'leave' | 'kick' | 'ban';
  player: PlayerInfo;
  reason?: string;
}

/** Backup request payload */
export interface BackupRequest {
  requestId: string;
  action: 'create' | 'list' | 'restore' | 'delete';
  backupName?: string;
}

/** Backup response payload */
export interface BackupResponse {
  requestId: string;
  success: boolean;
  backups?: BackupEntry[];
  message?: string;
  error?: string;
}

/** Backup entry */
export interface BackupEntry {
  name: string;
  size: number;        // bytes
  createdAt: number;   // timestamp
}

/** Tracked server state in the bridge registry */
export interface TrackedServer {
  serverId: string;
  status: ServerStatus | null;
  lastHeartbeat: number;
  firstSeen: number;
  online: boolean;
}

/** JWT auth payload */
export interface AuthPayload {
  username: string;
  iat: number;
  exp: number;
}
