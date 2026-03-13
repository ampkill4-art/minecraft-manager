// ============================================================
// NATS Bridge — Main Entry Point
// Boots Express, NATS connection, and WebSocket server
// ============================================================

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';

import { connectNats, closeNats } from './nats/connection';
import { setupHandlers } from './nats/handlers';
import { startPruning } from './registry';
import { initWebSocketServer } from './ws/server';
import apiRouter, { initAdminPassword } from './api/routes';
import { apiRateLimiter } from './api/middleware';

const PORT = parseInt(process.env.PORT || '3001', 10);
const NATS_URL = process.env.NATS_URL || 'nats://shinkansen.proxy.rlwy.net:54149';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   Minecraft NATS Bridge v1.0.0       ║');
  console.log('╚══════════════════════════════════════╝');

  // ── Initialize admin password hash ──
  await initAdminPassword();

  // ── Express setup ──
  const app = express();
  app.use(helmet());
  app.use(cors({
    origin: '*',
    credentials: true,
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', apiRateLimiter);
  app.use('/api', apiRouter);

  // ── Create HTTP server ──
  const server = http.createServer(app);

  // ── WebSocket server ──
  initWebSocketServer(server);

  // ── Connect to NATS ──
  await connectNats(NATS_URL);

  // ── Setup NATS handlers ──
  setupHandlers();

  // ── Start heartbeat pruning ──
  startPruning();

  // ── Start listening ──
  server.listen(PORT, () => {
    console.log(`[HTTP] REST API listening on http://localhost:${PORT}`);
    console.log(`[WS]   WebSocket endpoint: ws://localhost:${PORT}/ws`);
    console.log(`[NATS] Connected to ${NATS_URL}`);
    console.log(`[CORS] Allowing origin: ${FRONTEND_URL}`);
  });

  // ── Graceful shutdown ──
  const shutdown = async () => {
    console.log('\n[SHUTDOWN] Gracefully shutting down...');
    await closeNats();
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[FATAL] Failed to start bridge:', err);
  process.exit(1);
});
