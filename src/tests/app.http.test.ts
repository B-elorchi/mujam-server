import request from 'supertest';
import { buildApp } from '../app';

describe('HTTP API (smoke)', () => {
  const app = buildApp();

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('GET /api/nonexistent returns 404 JSON', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(String(res.body.message)).toContain('not found');
  });
});
