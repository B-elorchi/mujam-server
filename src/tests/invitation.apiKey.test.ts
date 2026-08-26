import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import express from 'express';
import { generateAccessToken } from '../utils/jwt';
import {
  inviteRouteAuth,
  isValidInviteApiKey,
} from '../middleware/inviteApiKey';

const TEST_API_KEY = 'n8n-test-invite-api-key-secret';

vi.mock('../config/database', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import prisma from '../config/database';

const findUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;

function mockRes() {
  const res = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & {
    statusCode: number;
    body: { success?: boolean; message?: string };
  };
}

describe('inviteRouteAuth middleware', () => {
  const prevKey = process.env.INVITE_API_KEY;
  const prevActor = process.env.SUPER_ADMIN_EMAIL;

  beforeEach(() => {
    process.env.INVITE_API_KEY = TEST_API_KEY;
    process.env.SUPER_ADMIN_EMAIL = 'admin@mujam.com';
    findUnique.mockReset();
  });

  afterEach(() => {
    if (prevKey === undefined) delete process.env.INVITE_API_KEY;
    else process.env.INVITE_API_KEY = prevKey;
    if (prevActor === undefined) delete process.env.SUPER_ADMIN_EMAIL;
    else process.env.SUPER_ADMIN_EMAIL = prevActor;
  });

  it('rejects invalid API key with 401', async () => {
    const req = {
      headers: { 'x-api-key': 'wrong-key-that-is-long-enough!!' },
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    await inviteRouteAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('accepts valid X-API-Key and sets admin actor (200-path auth)', async () => {
    findUnique.mockResolvedValue({
      id: 'admin-user-id',
      email: 'admin@mujam.com',
      role: 'ADMIN',
      isActive: true,
    });

    const req = {
      headers: { 'x-api-key': TEST_API_KEY },
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    await inviteRouteAuth(req, res, next);

    expect(isValidInviteApiKey(TEST_API_KEY)).toBe(true);
    expect(next).toHaveBeenCalledOnce();
    expect(req.userId).toBe('admin-user-id');
    expect(req.user).toMatchObject({
      userId: 'admin-user-id',
      email: 'admin@mujam.com',
      role: 'ADMIN',
    });
  });

  it('accepts Authorization: ApiKey header', async () => {
    findUnique.mockResolvedValue({
      id: 'admin-user-id',
      email: 'admin@mujam.com',
      role: 'ADMIN',
      isActive: true,
    });

    const req = {
      headers: { authorization: `ApiKey ${TEST_API_KEY}` },
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    await inviteRouteAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.userId).toBe('admin-user-id');
  });

  it('falls through to JWT Bearer auth (admin panel path still works)', async () => {
    findUnique.mockResolvedValue({
      id: 'jwt-admin-id',
      email: 'editor@mujam.com',
      role: 'ADMIN',
      isActive: true,
    });

    const token = generateAccessToken({
      userId: 'jwt-admin-id',
      email: 'editor@mujam.com',
      role: 'ADMIN',
    });

    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    await inviteRouteAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.userId).toBe('jwt-admin-id');
    expect(req.user?.role).toBe('ADMIN');
  });

  it('POST with valid key returns 200 response shape', async () => {
    findUnique.mockResolvedValue({
      id: 'admin-user-id',
      email: 'admin@mujam.com',
      role: 'ADMIN',
      isActive: true,
    });

    const app = express();
    app.use(express.json());
    app.post('/api/admin/invitations', inviteRouteAuth, (_req, res) => {
      res.status(200).json({
        success: true,
        message: 'Invitation created',
        data: {
          id: 'inv-1',
          email: 'invitee@example.com',
          access: 'MOAJAM',
          parentEmail: null,
          expiresAt: new Date().toISOString(),
          invitationLink: 'http://localhost:3000/register?token=raw',
        },
      });
    });

    const res = await request(app)
      .post('/api/admin/invitations')
      .set('X-API-Key', TEST_API_KEY)
      .send({ email: 'invitee@example.com', access: 'MOAJAM' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      data: {
        id: 'inv-1',
        email: 'invitee@example.com',
        access: 'MOAJAM',
        invitationLink: expect.stringContaining('token='),
      },
    });
  });
});
