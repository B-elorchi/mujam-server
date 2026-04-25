import request from 'supertest';
import { buildApp } from '../app';

describe('Auth validation (no DB)', () => {
  const app = buildApp();

  it('POST /api/auth/login rejects invalid email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'not-an-email',
      password: 'secret12345',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/login rejects short password field when other rules pass', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test',
      email: 'valid@example.com',
      password: 'short',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/refresh rejects empty body', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
