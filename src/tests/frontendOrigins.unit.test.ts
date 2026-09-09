import { afterEach, describe, expect, it } from 'vitest';
import {
  buildInvitationLink,
  getAllowedBrowserOrigins,
  getKidsFrontendBaseUrl,
  getMenFrontendBaseUrl,
  invitationFrontendBaseUrl,
  pickFrontendOrigin,
} from '../utils/frontendOrigins';

describe('frontendOrigins', () => {
  const prevFrontend = process.env.FRONTEND_URL;
  const prevKids = process.env.KIDS_FRONTEND_URL;
  const prevExtra = process.env.CORS_EXTRA_ORIGINS;

  afterEach(() => {
    if (prevFrontend === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = prevFrontend;
    if (prevKids === undefined) delete process.env.KIDS_FRONTEND_URL;
    else process.env.KIDS_FRONTEND_URL = prevKids;
    if (prevExtra === undefined) delete process.env.CORS_EXTRA_ORIGINS;
    else process.env.CORS_EXTRA_ORIGINS = prevExtra;
  });

  it('always allows both production SPA origins', () => {
    process.env.FRONTEND_URL = 'https://app.moajam-sa.com';
    delete process.env.KIDS_FRONTEND_URL;
    const origins = getAllowedBrowserOrigins();
    expect(origins).toContain('https://app.moajam-sa.com');
    expect(origins).toContain('https://kids.moajam-sa.com');
  });

  it('picks men vs kids invite hosts from access', () => {
    process.env.FRONTEND_URL = 'https://app.moajam-sa.com,https://kids.moajam-sa.com';
    process.env.KIDS_FRONTEND_URL = 'https://kids.moajam-sa.com';
    expect(getMenFrontendBaseUrl()).toBe('https://app.moajam-sa.com');
    expect(getKidsFrontendBaseUrl()).toBe('https://kids.moajam-sa.com');
    expect(invitationFrontendBaseUrl('KIDS')).toBe('https://kids.moajam-sa.com');
    expect(invitationFrontendBaseUrl('MOAJAM')).toBe('https://app.moajam-sa.com');
    expect(buildInvitationLink('tok', 'KIDS')).toBe(
      'https://kids.moajam-sa.com/register?token=tok'
    );
  });

  it('accepts the kids Origin header when listed', () => {
    process.env.FRONTEND_URL = 'https://app.moajam-sa.com';
    expect(pickFrontendOrigin('https://kids.moajam-sa.com')).toBe('https://kids.moajam-sa.com');
    expect(pickFrontendOrigin('https://evil.example')).toBeNull();
  });
});
