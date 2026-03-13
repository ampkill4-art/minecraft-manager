// ============================================================
// NATS Subscription Handlers
// Sets up listeners for all NATS subjects and updates state
// ============================================================

import { subscribe } from './connection';
import { subjects } from './subjects';
import { updateServerStatus, recordHeartbeat } from '../registry';
import { broadcastToClients } from '../ws/server';
import {
  NatsMessage,
  ServerStatus,
  ChatMessage,
  LogEntry,
  CommandResponse,
  FileResponse,
  PlayerEvent,
  BackupResponse,
} from '../types';

/** Initialize all NATS subscriptions */
export function setupHandlers(): void {
  console.log('[NATS] Setting up subscription handlers...');

  // ── Server Status ──
  subscribe(subjects.all('status'), (data, subject) => {
    const msg = data as NatsMessage;
    const status = msg.payload as unknown as ServerStatus;
    updateServerStatus(msg.serverId, status);
    broadcastToClients(msg.serverId, 'status', status);
  });

  // ── Heartbeat ──
  subscribe(subjects.all('heartbeat'), (data, _subject) => {
    const msg = data as NatsMessage;
    recordHeartbeat(msg.serverId);
    broadcastToClients(msg.serverId, 'heartbeat', { serverId: msg.serverId });
  });

  // ── Command Responses ──
  subscribe(subjects.all('command.res'), (data, _subject) => {
    const msg = data as NatsMessage;
    const response = msg.payload as unknown as CommandResponse;
    broadcastToClients(msg.serverId, 'command_res', response);
  });

  // ── Chat Messages ──
  subscribe(subjects.all('chat'), (data, _subject) => {
    const msg = data as NatsMessage;
    const chat = msg.payload as unknown as ChatMessage;
    broadcastToClients(msg.serverId, 'chat', chat);
  });

  // ── Log Streaming ──
  subscribe(subjects.all('logs'), (data, _subject) => {
    const msg = data as NatsMessage;
    const log = msg.payload as unknown as LogEntry;
    broadcastToClients(msg.serverId, 'log', log);
  });

  // ── File Responses ──
  subscribe(subjects.all('files.res'), (data, _subject) => {
    const msg = data as NatsMessage;
    const fileRes = msg.payload as unknown as FileResponse;
    broadcastToClients(msg.serverId, 'file_res', fileRes);
  });

  // ── Player Events ──
  subscribe(subjects.all('players'), (data, _subject) => {
    const msg = data as NatsMessage;
    const event = msg.payload as unknown as PlayerEvent;
    broadcastToClients(msg.serverId, 'player_event', event);
  });

  // ── Backup Responses ──
  subscribe(subjects.all('backup.res'), (data, _subject) => {
    const msg = data as NatsMessage;
    const backup = msg.payload as unknown as BackupResponse;
    broadcastToClients(msg.serverId, 'backup_res', backup);
  });

  console.log('[NATS] All handlers registered');
}
