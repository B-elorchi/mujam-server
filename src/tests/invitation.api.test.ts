import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app';

describe('Auth invitation-gated registration (validation)', () => {
  const app = buildApp();
  const prevPublic = process.env.ALLOW_PUBLIC_SIGNUP;

  afterEach(() => {
    if (prevPublic === undefined) delete process.env.ALLOW_PUBLIC_SIGNUP;
    else process.env.ALLOW_PUBLIC_SIGNUP = prevPublic;
  });

  it('POST /api/auth/register rejects missing invitation token when public signup is off', async () => {
    process.env.ALLOW_PUBLIC_SIGNUP = 'false';
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test',
      email: 'valid@example.com',
      password: 'password123',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/auth/registration-options reports publicSignup from env', async () => {
    process.env.ALLOW_PUBLIC_SIGNUP = 'true';
    const on = await request(app).get('/api/auth/registration-options');
    expect(on.status).toBe(200);
    expect(on.body.success).toBe(true);
    expect(on.body.data.publicSignup).toBe(true);

    process.env.ALLOW_PUBLIC_SIGNUP = 'false';
    const off = await request(app).get('/api/auth/registration-options');
    expect(off.status).toBe(200);
    expect(off.body.data.publicSignup).toBe(false);
  });

  it('POST /api/auth/register with public flag still rejects short password (no invite)', async () => {
    process.env.ALLOW_PUBLIC_SIGNUP = 'true';
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test',
      email: 'valid@example.com',
      password: 'short',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/register still rejects short password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test',
      email: 'valid@example.com',
      password: 'short',
      invitationToken: 'some-token-value',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/auth/invitation rejects missing token', async () => {
    const res = await request(app).get('/api/auth/invitation');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/admin/invitations rejects unauthenticated', async () => {
    const res = await request(app).post('/api/admin/invitations').send({
      email: 'invitee@example.com',
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/admin/invitations rejects invalid API key', async () => {
    const prev = process.env.INVITE_API_KEY;
    process.env.INVITE_API_KEY = 'n8n-test-invite-api-key-secret';
    try {
      const res = await request(app)
        .post('/api/admin/invitations')
        .set('X-API-Key', 'definitely-not-the-right-key-value')
        .send({ email: 'invitee@example.com', access: 'MOAJAM' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.INVITE_API_KEY;
      else process.env.INVITE_API_KEY = prev;
    }
  });
});
