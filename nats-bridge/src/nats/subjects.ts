// ============================================================
// Centralized NATS subject definitions
// All subjects follow the pattern: mc.<serverId>.<channel>
// ============================================================

/** Build a subject string with a server-specific prefix */
const sub = (serverId: string, channel: string) => `mc.${serverId}.${channel}`;

export const subjects = {
  /** Server status broadcasts (published by mod) */
  status:       (id: string) => sub(id, 'status'),

  /** Command request (bridge → mod) */
  commandReq:   (id: string) => sub(id, 'command.req'),

  /** Command response (mod → bridge) */
  commandRes:   (id: string) => sub(id, 'command.res'),

  /** Chat messages (bidirectional) */
  chat:         (id: string) => sub(id, 'chat'),

  /** Log streaming (mod → bridge) */
  logs:         (id: string) => sub(id, 'logs'),

  /** File operation request (bridge → mod) */
  fileReq:      (id: string) => sub(id, 'files.req'),

  /** File operation response (mod → bridge) */
  fileRes:      (id: string) => sub(id, 'files.res'),

  /** Player events (mod → bridge) */
  players:      (id: string) => sub(id, 'players'),

  /** Heartbeat pings (mod → bridge) */
  heartbeat:    (id: string) => sub(id, 'heartbeat'),

  /** Backup request (bridge → mod) */
  backupReq:    (id: string) => sub(id, 'backup.req'),

  /** Backup response (mod → bridge) */
  backupRes:    (id: string) => sub(id, 'backup.res'),

  /** Wildcard — subscribe to ALL servers for a given channel */
  all:          (channel: string) => `mc.*.${channel}`,
};
