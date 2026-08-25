import {
  accessFlagsFromInvite,
  getInvitationStatus,
  invitationErrorMessage,
  normalizeInviteEmail,
} from '../services/invitation.service';
import { hashToken, generateSecureToken } from '../utils/hash';

describe('Invitation security helpers', () => {
  const base = {
    id: 'inv-1',
    email: 'learner@example.com',
    access: 'MOAJAM' as const,
    parentEmail: null as string | null,
    expiresAt: new Date(Date.now() + 60_000),
    usedAt: null as Date | null,
    revokedAt: null as Date | null,
  };

  it('normalizes invite emails', () => {
    expect(normalizeInviteEmail('  Foo@Example.COM ')).toBe('foo@example.com');
  });

  it('accepts a valid unused invitation', () => {
    const status = getInvitationStatus(base);
    expect(status.ok).toBe(true);
  });

  it('rejects missing invitation as invalid token', () => {
    const status = getInvitationStatus(null);
    expect(status.ok).toBe(false);
    if (!status.ok) expect(status.code).toBe('INVALID_TOKEN');
  });

  it('rejects expired invitation', () => {
    const status = getInvitationStatus({
      ...base,
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(status.ok).toBe(false);
    if (!status.ok) expect(status.code).toBe('EXPIRED');
  });

  it('rejects already-used invitation', () => {
    const status = getInvitationStatus({
      ...base,
      usedAt: new Date(),
    });
    expect(status.ok).toBe(false);
    if (!status.ok) expect(status.code).toBe('ALREADY_USED');
  });

  it('rejects revoked invitation', () => {
    const status = getInvitationStatus({
      ...base,
      revokedAt: new Date(),
    });
    expect(status.ok).toBe(false);
    if (!status.ok) expect(status.code).toBe('REVOKED');
  });

  it('rejects email mismatch (bypass attempt)', () => {
    const status = getInvitationStatus(base, new Date(), 'attacker@evil.com');
    expect(status.ok).toBe(false);
    if (!status.ok) {
      expect(status.code).toBe('EMAIL_MISMATCH');
      expect(invitationErrorMessage(status.code)).toMatch(/match/i);
    }
  });

  it('accepts matching email case-insensitively', () => {
    const status = getInvitationStatus(base, new Date(), 'Learner@Example.COM');
    expect(status.ok).toBe(true);
  });

  it('hashes tokens one-way (raw token not recoverable)', () => {
    const raw = generateSecureToken(32);
    const a = hashToken(raw);
    const b = hashToken(raw);
    expect(a).toBe(b);
    expect(a).not.toBe(raw);
    expect(a).toHaveLength(64);
  });

  it('maps invite access to user flags', () => {
    expect(accessFlagsFromInvite('MOAJAM')).toEqual({ accessMoajam: true, accessKids: false });
    expect(accessFlagsFromInvite('KIDS')).toEqual({ accessMoajam: false, accessKids: true });
    expect(accessFlagsFromInvite('BOTH')).toEqual({ accessMoajam: true, accessKids: true });
  });
});
