/**
 * Temporary public (open) registration switch.
 * Default: invite-only. Set ALLOW_PUBLIC_SIGNUP=true and restart to open signup briefly.
 */
export function isPublicSignupAllowed(): boolean {
  const raw = (process.env.ALLOW_PUBLIC_SIGNUP || '').trim().toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes';
}

/** Access flags for open registration (no invite). Default: adult Moajam space. */
export function publicSignupAccessFlags(signupSpace?: string): {
  accessMoajam: boolean;
  accessKids: boolean;
} {
  if (typeof signupSpace === 'string' && signupSpace.trim().toLowerCase() === 'kids') {
    return { accessMoajam: false, accessKids: true };
  }
  return { accessMoajam: true, accessKids: false };
}
