import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { errorResponse } from '../utils/apiResponse';
import { hashToken } from '../utils/hash';
import { authMiddleware } from './auth';
import { adminMiddleware } from './adminAuth';

const ADMIN_ROLES = ['ADMIN', 'EDITOR', 'AI_MANAGER', 'MARKETER'];

/** Minimum length for INVITE_API_KEY (reject weak keys). */
export const INVITE_API_KEY_MIN_LENGTH = 24;

/**
 * Raw invite automation key from env. Never log or return this value.
 * Rotate by changing INVITE_API_KEY and restarting the server.
 */
export function getConfiguredInviteApiKey(): string | null {
  const key = process.env.INVITE_API_KEY?.trim();
  if (!key || key.length < INVITE_API_KEY_MIN_LENGTH) return null;
  return key;
}

/**
 * Extract automation API key from headers.
 * Supported:
 * - `X-API-Key: <key>`
 * - `Authorization: ApiKey <key>`
 * Bearer JWTs are ignored here (handled by authMiddleware).
 */
export function extractInviteApiKey(req: Request): string | null {
  const xApiKey = req.headers['x-api-key'];
  if (typeof xApiKey === 'string' && xApiKey.trim()) {
    return xApiKey.trim();
  }
  if (Array.isArray(xApiKey) && xApiKey[0]?.trim()) {
    return xApiKey[0].trim();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const match = authHeader.match(/^ApiKey\s+(.+)$/i);
  if (match?.[1]?.trim()) {
    return match[1].trim();
  }

  return null;
}

/** Constant-time compare of provided key against INVITE_API_KEY (via SHA-256 digests). */
export function isValidInviteApiKey(provided: string): boolean {
  const configured = getConfiguredInviteApiKey();
  if (!configured || !provided) return false;

  const a = Buffer.from(hashToken(provided), 'utf8');
  const b = Buffer.from(hashToken(configured), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function resolveInviteApiActor(): Promise<{
  id: string;
  email: string;
  role: string;
} | null> {
  const actorEmail = (
    process.env.INVITE_API_ACTOR_EMAIL ||
    process.env.SUPER_ADMIN_EMAIL ||
    ''
  )
    .trim()
    .toLowerCase();
  if (!actorEmail) return null;

  const actor = await prisma.user.findUnique({
    where: { email: actorEmail },
    select: { id: true, email: true, role: true, isActive: true },
  });

  if (!actor || !actor.isActive) return null;
  if (!ADMIN_ROLES.includes(actor.role)) return null;

  return { id: actor.id, email: actor.email, role: actor.role };
}

/**
 * Auth for learner invitation admin routes:
 * 1) Long-lived `INVITE_API_KEY` via X-API-Key / Authorization: ApiKey … → admin actor
 * 2) Otherwise existing Bearer JWT + adminMiddleware (unchanged for admin panel)
 */
export const inviteRouteAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const apiKey = extractInviteApiKey(req);

  if (apiKey !== null) {
    if (!isValidInviteApiKey(apiKey)) {
      errorResponse(res, 'Invalid API key', 401);
      return;
    }

    try {
      const actor = await resolveInviteApiActor();
      if (!actor) {
        errorResponse(
          res,
          'Invite API key actor is not configured (set SUPER_ADMIN_EMAIL or INVITE_API_ACTOR_EMAIL to an active admin user)',
          503
        );
        return;
      }

      req.userId = actor.id;
      req.user = {
        userId: actor.id,
        email: actor.email,
        role: actor.role,
      };
      next();
    } catch (error) {
      console.error('Invite API key auth error:', error);
      errorResponse(res, 'Server error', 500);
    }
    return;
  }

  await authMiddleware(req, res, () => {
    adminMiddleware(req, res, next);
  });
};
