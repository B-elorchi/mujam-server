import prisma from '../config/database';
import { generateSecureToken, hashToken } from '../utils/hash';

export const INVITE_EXPIRY_DAYS = 7;

export type InvitationStatusError =
  | 'MISSING_TOKEN'
  | 'INVALID_TOKEN'
  | 'EXPIRED'
  | 'ALREADY_USED'
  | 'REVOKED'
  | 'EMAIL_MISMATCH';

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function invitationErrorMessage(code: InvitationStatusError): string {
  switch (code) {
    case 'MISSING_TOKEN':
      return 'Invitation token is required';
    case 'INVALID_TOKEN':
      return 'Invalid invitation';
    case 'EXPIRED':
      return 'Invitation has expired';
    case 'ALREADY_USED':
      return 'Invitation has already been used';
    case 'REVOKED':
      return 'Invitation has been revoked';
    case 'EMAIL_MISMATCH':
      return 'Email does not match the invitation';
    default:
      return 'Invalid invitation';
  }
}

type InvitationRow = {
  id: string;
  email: string;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
};

/** Pure status check used by register + preview + tests. */
export function getInvitationStatus(
  invitation: InvitationRow | null | undefined,
  now: Date = new Date(),
  emailToMatch?: string
): { ok: true; invitation: InvitationRow } | { ok: false; code: InvitationStatusError } {
  if (!invitation) {
    return { ok: false, code: 'INVALID_TOKEN' };
  }
  if (invitation.revokedAt) {
    return { ok: false, code: 'REVOKED' };
  }
  if (invitation.usedAt) {
    return { ok: false, code: 'ALREADY_USED' };
  }
  if (invitation.expiresAt.getTime() <= now.getTime()) {
    return { ok: false, code: 'EXPIRED' };
  }
  if (emailToMatch !== undefined) {
    const expected = normalizeInviteEmail(invitation.email);
    const actual = normalizeInviteEmail(emailToMatch);
    if (expected !== actual) {
      return { ok: false, code: 'EMAIL_MISMATCH' };
    }
  }
  return { ok: true, invitation };
}

export async function findInvitationByRawToken(rawToken: string) {
  if (!rawToken || typeof rawToken !== 'string') return null;
  const tokenHash = hashToken(rawToken.trim());
  return prisma.userInvitation.findUnique({ where: { tokenHash } });
}

/**
 * Create a learner invitation. Revokes previous unused invites for the same email.
 * Returns the raw token once (for email / admin copy) — never persisted.
 */
export async function createUserInvitation(email: string, invitedById: string) {
  const normalized = normalizeInviteEmail(email);
  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

  const existingUser = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true },
  });
  if (existingUser) {
    const err = new Error('EMAIL_ALREADY_REGISTERED') as Error & { code: string };
    err.code = 'EMAIL_ALREADY_REGISTERED';
    throw err;
  }

  await prisma.userInvitation.updateMany({
    where: {
      email: normalized,
      usedAt: null,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  const invitation = await prisma.userInvitation.create({
    data: {
      email: normalized,
      tokenHash,
      expiresAt,
      invitedById,
    },
  });

  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const invitationLink = `${frontendUrl}/register?token=${encodeURIComponent(rawToken)}`;

  return {
    invitation,
    rawToken,
    invitationLink,
  };
}

export function publicInvitationView(invitation: InvitationRow) {
  return {
    email: invitation.email,
    expiresAt: invitation.expiresAt.toISOString(),
  };
}
