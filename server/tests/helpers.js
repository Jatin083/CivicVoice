require('dotenv').config({ path: require('path').join(__dirname, '../.env.test') });
const request = require('supertest');
const app = require('../src/app');

const login = async (email, password = 'Password@123') => {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.data?.token;
};
const auth = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { request, app, login, auth };
