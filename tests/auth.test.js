const request = require('supertest');
const app = require('../app');

describe('Authentication', () => {
  it('should redirect to login if not authenticated', async () => {
    const res = await request(app).get('/create');
    expect(res.statusCode).toEqual(302);
    expect(res.headers.location).toBe('/login');
  });

  it('should allow login with correct credentials', async () => {
    const res = await request(app)
      .post('/login')
      .type('form')
      .send({ username: 'admin', password: 'admin' });
    expect(res.statusCode).toEqual(302);
    expect(res.headers.location).toBe('/');
  });

  it('should reject login with wrong credentials', async () => {
    const res = await request(app)
      .post('/login')
      .type('form')
      .send({ username: 'admin', password: 'wrong' });
    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('Invalid credentials');
  });
});
