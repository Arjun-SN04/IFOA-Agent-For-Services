const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const dotenv     = require('dotenv');
const path       = require('path');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');

dotenv.config();

// ── Fail fast if required env vars are missing ────────────────────────────────
if (!process.env.MONGO_URI)   throw new Error('MONGO_URI env var is required');
if (!process.env.JWT_SECRET)  throw new Error('JWT_SECRET env var is required');

const app = express();

// ── Security headers (helmet) ─────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow /assets images from frontend
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow non-browser requests (Postman, server-to-server) only in development
    if (!origin) {
      if (process.env.NODE_ENV === 'production') return callback(new Error('CORS: missing origin'));
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Strict limit on auth endpoints to slow brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // 20 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// General API limit — generous enough for normal use
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

app.use('/api/auth', authLimiter);
app.use('/api',      apiLimiter);

// ── Serve backend assets (logo, etc.) publicly ───────────────────────────────
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// ── Stripe webhook needs raw body — must be registered BEFORE express.json() ──
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// ── JSON body parser ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/authRoutes'));
app.use('/api/individuals',   require('./routes/individualRoutes'));
app.use('/api/airlines',      require('./routes/airlinesRoutes'));
app.use('/api/payments',      require('./routes/paymentRoutes'));
app.use('/api/notifications', require('./routes/notificationsRoutes'));
app.use('/api/chat',          require('./routes/chatRoutes'));
app.use('/api/register',      require('./routes/registerRoute'));
app.use('/api/invoices',      require('./routes/invoiceRoutes'));

// Health check
app.get('/', (_req, res) => res.json({ message: 'Agent for Service API is running' }));

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[GlobalError]', err.message, err.stack);
  const status = err.status || err.statusCode || 500;
  // Never leak stack traces to clients in production
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal server error'
    : (err.message || 'Internal server error');
  res.status(status).json({ success: false, message });
});

// ── Database + Server ─────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 })
  .then(() => {
    console.log('MongoDB connected');
    const { startSubscriptionReminderCron } = require('./cron/subscriptionReminder');
    startSubscriptionReminderCron();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
