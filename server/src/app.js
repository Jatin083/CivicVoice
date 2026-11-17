const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
// On Render (and most hosts) requests arrive through a proxy; trust it so req.ip and the
// rate limiter see the real client address instead of the proxy's.
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json({ limit: '100kb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));
if (process.env.NODE_ENV !== 'test') {
  // Slow down password guessing. Only login/register are limited: /auth/me runs on every
  // page load, and limiting it would log people out while they browse.
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50 });
  app.use(['/api/auth/login', '/api/auth/register'], authLimiter);
}

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', routes);
app.use((req, res) => res.status(404).json({ error: { message: 'Route not found' } }));
app.use(errorHandler);

module.exports = app;
