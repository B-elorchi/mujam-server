import request from 'supertest';
import { buildApp } from '../app';

describe('Auth invitation-gated registration (validation)', () => {
  const app = buildApp();

  it('POST /api/auth/register rejects missing invitation token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test',
      email: 'valid@example.com',
      password: 'password123',
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
});
