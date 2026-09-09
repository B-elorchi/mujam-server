/**
 * Browser origins for CORS, Socket.IO, SSE, and email links.
 * Public hostnames are attached in Traefik/Dokploy; this file only names them.
 */

export const MEN_ORIGIN = 'https://app.moajam-sa.com';
export const KIDS_ORIGIN = 'https://kids.moajam-sa.com';

const LOCAL_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8080',
  'http://localhost:5173',
];

export function splitOriginList(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((part) => part.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

export function getKidsFrontendBaseUrl(): string {
  const fromEnv = process.env.KIDS_FRONTEND_URL?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  return KIDS_ORIGIN;
}

export function getMenFrontendBaseUrl(): string {
  const listed = splitOriginList(process.env.FRONTEND_URL);
  const firstNonKids = listed.find((origin) => !isKidsFrontendOrigin(origin));
  if (firstNonKids) return firstNonKids;
  return MEN_ORIGIN;
}

export function isKidsFrontendOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname.replace(/^www\./i, '').toLowerCase();
    return host === 'kids.moajam-sa.com' || host.startsWith('kids.');
  } catch {
    return false;
  }
}

export function getAllowedBrowserOrigins(): string[] {
  const set = new Set<string>([
    ...splitOriginList(process.env.FRONTEND_URL),
    ...splitOriginList(process.env.CORS_EXTRA_ORIGINS),
    getKidsFrontendBaseUrl(),
    getMenFrontendBaseUrl(),
    MEN_ORIGIN,
    KIDS_ORIGIN,
    ...LOCAL_ORIGINS,
  ]);
  return [...set];
}

export function pickFrontendOrigin(requestOrigin?: string | string[] | null): string | null {
  const origin = Array.isArray(requestOrigin) ? requestOrigin[0] : requestOrigin;
  if (!origin) return null;
  const normalized = origin.trim().replace(/\/$/, '');
  return getAllowedBrowserOrigins().includes(normalized) ? normalized : null;
}

export function invitationFrontendBaseUrl(access: 'MOAJAM' | 'KIDS' | 'BOTH'): string {
  if (access === 'KIDS') return getKidsFrontendBaseUrl();
  return getMenFrontendBaseUrl();
}

export function buildInvitationLink(rawToken: string, access: 'MOAJAM' | 'KIDS' | 'BOTH'): string {
  return `${invitationFrontendBaseUrl(access)}/register?token=${encodeURIComponent(rawToken)}`;
}
