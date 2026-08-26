import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  extractInviteApiKey,
  getConfiguredInviteApiKey,
  isValidInviteApiKey,
  INVITE_API_KEY_MIN_LENGTH,
} from '../middleware/inviteApiKey';
import type { Request } from 'express';

function mockReq(headers: Record<string, string | string[] | undefined>): Request {
  return { headers } as Request;
}

describe('invite API key helpers', () => {
  const prevKey = process.env.INVITE_API_KEY;

  beforeEach(() => {
    process.env.INVITE_API_KEY = 'n8n-test-invite-api-key-secret';
  });

  afterEach(() => {
    if (prevKey === undefined) delete process.env.INVITE_API_KEY;
    else process.env.INVITE_API_KEY = prevKey;
  });

  it('requires configured key of minimum length', () => {
    process.env.INVITE_API_KEY = 'short';
    expect(getConfiguredInviteApiKey()).toBeNull();
    process.env.INVITE_API_KEY = 'a'.repeat(INVITE_API_KEY_MIN_LENGTH);
    expect(getConfiguredInviteApiKey()?.length).toBe(INVITE_API_KEY_MIN_LENGTH);
  });

  it('accepts matching key and rejects mismatches', () => {
    expect(isValidInviteApiKey('n8n-test-invite-api-key-secret')).toBe(true);
    expect(isValidInviteApiKey('wrong-key-that-is-long-enough')).toBe(false);
    expect(isValidInviteApiKey('')).toBe(false);
  });

  it('extracts X-API-Key and Authorization: ApiKey', () => {
    expect(extractInviteApiKey(mockReq({ 'x-api-key': 'abc' }))).toBe('abc');
    expect(extractInviteApiKey(mockReq({ authorization: 'ApiKey my-secret' }))).toBe('my-secret');
    expect(extractInviteApiKey(mockReq({ authorization: 'Bearer jwt-token' }))).toBeNull();
    expect(extractInviteApiKey(mockReq({}))).toBeNull();
  });
});
