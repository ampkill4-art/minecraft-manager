// ============================================================
// REST API Routes
// Express router for all dashboard API endpoints
// ============================================================

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { publish } from '../nats/connection';
import { subjects } from '../nats/subjects';
import { getAllServers, getServer } from '../registry';
import {
  authMiddleware,
  commandRateLimiter,
  sanitizeCommand,
} from './middleware';
import { NatsMessage, CommandRequest, ChatMessage, FileRequest, BackupRequest, PermissionRequest } from '../types';

const router = Router();
const BRIDGE_TOKEN = process.env.BRIDGE_TOKEN;

// ── Pre-hashed admin password (computed on startup) ──
let adminPasswordHash = '';

export async function initAdminPassword(): Promise<void> {
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  adminPasswordHash = await bcrypt.hash(password, 10);
}

// ════════════════════════════════════════════
// Auth Endpoints
// ════════════════════════════════════════════

/** POST /api/auth/login — Authenticate and receive JWT */
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';

    if (username !== adminUsername) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, adminPasswordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { username },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    res.json({ token, username, expiresIn: '24h' });
  } catch (err) {
    console.error('[API] Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ════════════════════════════════════════════
// Server Endpoints (all require auth)
// ════════════════════════════════════════════

/** GET /api/servers — List all tracked servers */
router.get('/servers', authMiddleware, (_req: Request, res: Response) => {
  const servers = getAllServers();
  res.json({ servers });
});

/** GET /api/servers/:id — Get a specific server's details */
router.get('/servers/:id', authMiddleware, (req: Request, res: Response) => {
  const server = getServer(req.params.id);
  if (!server) {
    res.status(404).json({ error: 'Server not found' });
    return;
  }
  res.json({ server });
});

/** POST /api/servers/:id/command — Execute a command on a server */
router.post(
  '/servers/:id/command',
  authMiddleware,
  commandRateLimiter,
  (req: Request, res: Response) => {
    const { id } = req.params;
    const { command } = req.body;

    if (!command || typeof command !== 'string') {
      res.status(400).json({ error: 'Command is required' });
      return;
    }

    const sanitized = sanitizeCommand(command);
    const requestId = uuidv4();

    const msg: NatsMessage = {
      serverId: id,
      type: 'command_req',
      timestamp: Date.now(),
      authToken: BRIDGE_TOKEN,
      payload: { command: sanitized, requestId } as unknown as Record<string, unknown>,
    };

    publish(subjects.commandReq(id), msg);
    res.json({ requestId, command: sanitized, status: 'sent' });
  }
);

/** POST /api/servers/:id/chat — Send a chat message to a server */
router.post('/servers/:id/chat', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  const chatPayload: ChatMessage = {
    sender: req.user?.username || 'Web Admin',
    message: message.slice(0, 256),
    source: 'web',
  };

  const msg: NatsMessage = {
    serverId: id,
    type: 'chat',
    timestamp: Date.now(),
    authToken: BRIDGE_TOKEN,
    payload: chatPayload as unknown as Record<string, unknown>,
  };

  publish(subjects.chat(id), msg);
  res.json({ status: 'sent' });
});

/** GET /api/servers/:id/files — Request file listing from a server */
router.get('/servers/:id/files', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const path = (req.query.path as string) || '/';
  const requestId = uuidv4();

  const fileReq: FileRequest = { requestId, action: 'list', path };
  const msg: NatsMessage = {
    serverId: id,
    type: 'file_req',
    timestamp: Date.now(),
    authToken: BRIDGE_TOKEN,
    payload: fileReq as unknown as Record<string, unknown>,
  };

  publish(subjects.fileReq(id), msg);
  res.json({ requestId, status: 'requested' });
});

/** GET /api/servers/:id/files/read — Request file content from a server */
router.get('/servers/:id/files/read', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const path = req.query.path as string;

  if (!path) {
    res.status(400).json({ error: 'Path is required' });
    return;
  }

  const requestId = uuidv4();
  const fileReq: FileRequest = { requestId, action: 'read', path };
  const msg: NatsMessage = {
    serverId: id,
    type: 'file_req',
    timestamp: Date.now(),
    authToken: BRIDGE_TOKEN,
    payload: fileReq as unknown as Record<string, unknown>,
  };

  publish(subjects.fileReq(id), msg);
  res.json({ requestId, status: 'requested' });
});

/** POST /api/servers/:id/files/write — Write file content */
router.post('/servers/:id/files/write', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const { path, content } = req.body;

  if (!path || typeof path !== 'string') {
    res.status(400).json({ error: 'Path is required' });
    return;
  }
  if (typeof content !== 'string') {
    res.status(400).json({ error: 'Content is required' });
    return;
  }

  const requestId = uuidv4();
  const fileReq: FileRequest = { requestId, action: 'write', path, content };
  const msg: NatsMessage = {
    serverId: id,
    type: 'file_req',
    timestamp: Date.now(),
    authToken: BRIDGE_TOKEN,
    payload: fileReq as unknown as Record<string, unknown>,
  };

  publish(subjects.fileReq(id), msg);
  res.json({ requestId, status: 'requested' });
});

/** POST /api/servers/:id/files/delete — Delete a file */
router.post('/servers/:id/files/delete', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const { path } = req.body;

  if (!path || typeof path !== 'string') {
    res.status(400).json({ error: 'Path is required' });
    return;
  }

  const requestId = uuidv4();
  const fileReq: FileRequest = { requestId, action: 'delete', path };
  const msg: NatsMessage = {
    serverId: id,
    type: 'file_req',
    timestamp: Date.now(),
    authToken: BRIDGE_TOKEN,
    payload: fileReq as unknown as Record<string, unknown>,
  };

  publish(subjects.fileReq(id), msg);
  res.json({ requestId, status: 'requested' });
});

/** POST /api/servers/:id/players/:name/kick — Kick a player */
router.post(
  '/servers/:id/players/:name/kick',
  authMiddleware,
  commandRateLimiter,
  (req: Request, res: Response) => {
    const { id, name } = req.params;
    const { reason } = req.body;
    const command = reason ? `kick ${name} ${reason}` : `kick ${name}`;
    const requestId = uuidv4();

    const msg: NatsMessage = {
      serverId: id,
      type: 'command_req',
      timestamp: Date.now(),
      authToken: BRIDGE_TOKEN,
      payload: { command, requestId } as unknown as Record<string, unknown>,
    };

    publish(subjects.commandReq(id), msg);
    res.json({ requestId, status: 'sent' });
  }
);

/** POST /api/servers/:id/players/:name/ban — Ban a player */
router.post(
  '/servers/:id/players/:name/ban',
  authMiddleware,
  commandRateLimiter,
  (req: Request, res: Response) => {
    const { id, name } = req.params;
    const { reason } = req.body;
    const command = reason ? `ban ${name} ${reason}` : `ban ${name}`;
    const requestId = uuidv4();

    const msg: NatsMessage = {
      serverId: id,
      type: 'command_req',
      timestamp: Date.now(),
      authToken: BRIDGE_TOKEN,
      payload: { command, requestId } as unknown as Record<string, unknown>,
    };

    publish(subjects.commandReq(id), msg);
    res.json({ requestId, status: 'sent' });
  }
);

/** POST /api/servers/:id/backup — Trigger backup operation */
router.post('/servers/:id/backup', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const { action, backupName } = req.body;
  const requestId = uuidv4();

  const backupReq: BackupRequest = {
    requestId,
    action: action || 'create',
    backupName,
  };

  const msg: NatsMessage = {
    serverId: id,
    type: 'backup_req',
    timestamp: Date.now(),
    authToken: BRIDGE_TOKEN,
    payload: backupReq as unknown as Record<string, unknown>,
  };

  publish(subjects.backupReq(id), msg);
  res.json({ requestId, status: 'sent' });
});

/** Health check endpoint */
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

export default router;
/** GET /api/servers/:id/permissions — Get privileged players list */
router.get('/servers/:id/permissions', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const server = getServer(id);
  if (!server) {
    res.status(404).json({ error: 'Server not found' });
    return;
  }
  const perms = (server as unknown as { permissions?: string[] }).permissions || [];
  res.json({ players: perms });
});

/** POST /api/servers/:id/permissions — Set privileged players list */
router.post('/servers/:id/permissions', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const { players } = req.body as { players?: string[] };

  if (!Array.isArray(players)) {
    res.status(400).json({ error: 'Players list is required' });
    return;
  }

  const server = getServer(id);
  if (!server) {
    res.status(404).json({ error: 'Server not found' });
    return;
  }

  (server as unknown as { permissions?: string[] }).permissions = players;

  const permReq: PermissionRequest = { players };
  const msg: NatsMessage = {
    serverId: id,
    type: 'perm_req',
    timestamp: Date.now(),
    authToken: BRIDGE_TOKEN,
    payload: permReq as unknown as Record<string, unknown>,
  };

  publish(subjects.permReq(id), msg);
  res.json({ status: 'sent' });
});
