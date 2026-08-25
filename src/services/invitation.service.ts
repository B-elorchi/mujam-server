import { InviteAccess } from '@prisma/client';
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

export type InviteAccessValue = 'MOAJAM' | 'KIDS' | 'BOTH';

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function parseInviteAccess(raw: unknown): InviteAccessValue | null {
  if (raw === 'MOAJAM' || raw === 'KIDS' || raw === 'BOTH') return raw;
  return null;
}

export function accessFlagsFromInvite(access: InviteAccessValue): {
  accessMoajam: boolean;
  accessKids: boolean;
} {
  switch (access) {
    case 'KIDS':
      return { accessMoajam: false, accessKids: true };
    case 'BOTH':
      return { accessMoajam: true, accessKids: true };
    case 'MOAJAM':
    default:
      return { accessMoajam: true, accessKids: false };
  }
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
  access: InviteAccessValue | InviteAccess;
  parentEmail: string | null;
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

export type CreateInvitationInput = {
  email: string;
  invitedById: string;
  access: InviteAccessValue;
  parentEmail?: string | null;
};

/**
 * Create a learner invitation. Revokes previous unused invites for the same email.
 * Returns the raw token once (for email / admin copy) — never persisted.
 */
export async function createUserInvitation(input: CreateInvitationInput) {
  const normalized = normalizeInviteEmail(input.email);
  const access = input.access;
  const includesKids = access === 'KIDS' || access === 'BOTH';

  let parentEmail: string | null = null;
  if (includesKids && input.parentEmail) {
    parentEmail = normalizeInviteEmail(input.parentEmail);
    if (parentEmail === normalized) {
      const err = new Error('PARENT_EMAIL_SAME_AS_LEARNER') as Error & { code: string };
      err.code = 'PARENT_EMAIL_SAME_AS_LEARNER';
      throw err;
    }
  }

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
      access,
      parentEmail,
      expiresAt,
      invitedById: input.invitedById,
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
    access: invitation.access,
    parentEmail: invitation.parentEmail,
    expiresAt: invitation.expiresAt.toISOString(),
  };
}
