// ============================================================
// Auth & Rate Limiting Middleware
// ============================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { AuthPayload } from '../types';

/** Extend Express Request to include auth info */
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/** JWT authentication middleware */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback-secret'
    ) as AuthPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

/** Rate limiter for command endpoints — 30 requests per minute */
export const commandRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many commands, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** General API rate limiter — 100 requests per minute */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Simple input sanitization for command strings */
export function sanitizeCommand(command: string): string {
  // Remove any control characters or dangerous patterns
  return command
    .replace(/[^\x20-\x7E]/g, '')  // Only printable ASCII
    .trim()
    .slice(0, 500);                  // Max 500 chars
}
