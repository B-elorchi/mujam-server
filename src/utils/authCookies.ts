import { CookieOptions, Request, Response } from 'express';

const REFRESH_COOKIE = 'refreshToken';
const ACCESS_COOKIE = 'accessToken';
const REFRESH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const ACCESS_MAX_AGE_MS = 60 * 60 * 1000;

function cookieBase(maxAge: number): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge,
  };
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (rawKey === name) {
      try {
        return decodeURIComponent(rest.join('='));
      } catch {
        return rest.join('=');
      }
    }
  }
  return undefined;
}

export function readRefreshCookie(req: Request): string | undefined {
  return readCookie(req, REFRESH_COOKIE);
}

export function readAccessCookie(req: Request): string | undefined {
  return readCookie(req, ACCESS_COOKIE);
}

export function setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, cookieBase(ACCESS_MAX_AGE_MS));
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, cookieBase(REFRESH_MAX_AGE_MS));
}

export function clearAuthCookies(res: Response): void {
  const isProd = process.env.NODE_ENV === 'production';
  const clear: CookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 0,
  };
  res.clearCookie(ACCESS_COOKIE, clear);
  res.clearCookie(REFRESH_COOKIE, clear);
}
