import { afterEach, describe, expect, it } from 'vitest';
import { isPublicSignupAllowed } from '../utils/publicSignup';

describe('isPublicSignupAllowed', () => {
  const prev = process.env.ALLOW_PUBLIC_SIGNUP;

  afterEach(() => {
    if (prev === undefined) delete process.env.ALLOW_PUBLIC_SIGNUP;
    else process.env.ALLOW_PUBLIC_SIGNUP = prev;
  });

  it('defaults to false (invite-only) when unset', () => {
    delete process.env.ALLOW_PUBLIC_SIGNUP;
    expect(isPublicSignupAllowed()).toBe(false);
  });

  it('is false for empty / unknown values', () => {
    process.env.ALLOW_PUBLIC_SIGNUP = '';
    expect(isPublicSignupAllowed()).toBe(false);
    process.env.ALLOW_PUBLIC_SIGNUP = 'false';
    expect(isPublicSignupAllowed()).toBe(false);
    process.env.ALLOW_PUBLIC_SIGNUP = 'no';
    expect(isPublicSignupAllowed()).toBe(false);
  });

  it('is true for true / 1 / yes (case-insensitive)', () => {
    process.env.ALLOW_PUBLIC_SIGNUP = 'true';
    expect(isPublicSignupAllowed()).toBe(true);
    process.env.ALLOW_PUBLIC_SIGNUP = 'TRUE';
    expect(isPublicSignupAllowed()).toBe(true);
    process.env.ALLOW_PUBLIC_SIGNUP = '1';
    expect(isPublicSignupAllowed()).toBe(true);
    process.env.ALLOW_PUBLIC_SIGNUP = 'yes';
    expect(isPublicSignupAllowed()).toBe(true);
  });
});
