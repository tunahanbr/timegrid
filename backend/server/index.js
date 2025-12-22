import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import os from 'os';

const { Pool } = pkg;
dotenv.config();

const app = express();
// Trust first proxy (useful when behind reverse proxy)
app.set('trust proxy', 1);
const port = process.env.PORT || 3000;

// PostgreSQL connection pool with optimized settings
const pool = new Pool({
  host: process.env.PGHOST || process.env.VITE_DB_HOST || 'localhost',
  port: parseInt(process.env.PGPORT || process.env.VITE_DB_PORT || '5432'),
  database: process.env.PGDATABASE || process.env.VITE_DB_NAME || 'timetrack',
  user: process.env.PGUSER || process.env.VITE_DB_USER || 'timetrack',
  password: process.env.PGPASSWORD || process.env.VITE_DB_PASSWORD || 'timetrack_dev_password',
  max: 10, // Reduced from 20 (more efficient for small apps)
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Simple in-memory cache for user settings (TTL: 5 minutes)
const settingsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Only log connection once on startup
let connectionLogged = false;
pool.on('connect', () => {
  if (!connectionLogged) {
    console.log('✅ PostgreSQL connection pool ready');
    connectionLogged = true;
  }
});

pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL error:', err);
  process.exit(-1);
});

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// Security headers
// Helmet: strict in production, relaxed in development
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: [
        "'self'",
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8080',
        'http://localhost:8081',
  'http://localhost:3000',
        'http://localhost:8082',
        'http://localhost:4318',
        // Android emulator host loopback
        'http://10.0.2.2:3000',
        'http://10.0.2.2:5173',
        'http://10.0.2.2:8082',
        'tauri://localhost',
        'https://tauri.localhost'
      ].filter(Boolean),
      imgSrc: ["'self'", 'data:'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
}));

// Compression: enable only in production
if (process.env.NODE_ENV === 'production') {
  app.use(compression());
}

// CORS - Restrict to frontend origin only
// Support multiple frontend origins via env
const envOriginsRaw = process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '';
const envOrigins = envOriginsRaw
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const devOrigins = [
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:8082',
  'http://localhost:5173',
  'http://localhost:4173',
  // Android emulator host loopback for dev servers if needed
  'http://10.0.2.2:8082',
  'http://10.0.2.2:5173',
];

// Dynamically include LAN IP dev server origins (useful for Android physical devices)
function getLanOrigins() {
  try {
    const nets = os.networkInterfaces();
    const addrs = Object.values(nets)
      .flat()
      .filter((iface) => iface && iface.family === 'IPv4' && !iface.internal)
      .map((iface) => iface.address);
    const ports = [8082, 5173, 8081, 8080];
    const origins = [];
    for (const ip of addrs) {
      for (const port of ports) {
        origins.push(`http://${ip}:${port}`);
      }
    }
    return origins;
  } catch (e) {
    console.warn('⚠️  Failed to determine LAN IPs for CORS:', e);
    return [];
  }
}

const allowedOrigins = [
  'tauri://localhost', // Tauri app
  ...(process.env.NODE_ENV === 'production' ? [] : devOrigins),
  ...(process.env.NODE_ENV === 'production' ? [] : getLanOrigins()),
  ...envOrigins,
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Tauri, or curl)
    if (!origin) return callback(null, true);
    
    // Allow any tauri:// protocol
    if (origin && origin.startsWith('tauri://')) {
      return callback(null, true);
    }
    // Allow LAN dev server origins (Android devices over Wi‑Fi) in dev mode
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      try {
        // Match http://10.x.x.x:PORT, http://192.168.x.x:PORT, http://172.16-31.x.x:PORT
        const lanRegex = /^http:\/\/(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1]))[0-9\.]*:(8082|5173|8081|8080)$/;
        if (lanRegex.test(origin)) {
          return callback(null, true);
        }
      } catch (e) {
        console.warn('⚠️  LAN origin test failed:', e);
      }
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn('⚠️  Blocked CORS request from:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
}));

// Parse cookies
app.use(cookieParser());

// Enforce HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const isSecure = req.secure || req.get('x-forwarded-proto') === 'https';
    if (!isSecure) {
      return res.redirect('https://' + req.get('host') + req.url);
    }
    next();
  });
}
// Rate limiting - General API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window (increased to accommodate sync bursts)
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in development for localhost
  skip: (req) => process.env.NODE_ENV !== 'production' && (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1'),
  handler: (req, res) => {
    res.status(429).json({ 
      error: 'Too many requests from this IP, please try again later.',
      message: 'Too many requests from this IP, please try again later.'
    });
  },
});

// Rate limiting - Auth endpoints (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 20 : 100, // 20 in production, 100 in dev (increased from 5)
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in development for localhost
  skip: (req) => process.env.NODE_ENV !== 'production' && (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1'),
  handler: (req, res) => {
    res.status(429).json({ 
      error: 'Too many authentication attempts, please try again later.',
      message: 'Too many authentication attempts, please try again later.'
    });
  },
});

// Apply rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// Request size limit
app.use(express.json({ limit: '1mb' }));

// ============================================================================
// JWT CONFIGURATION & AUTH MIDDLEWARE
// ============================================================================

// JWT secret (use a strong secret in production)
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_production';
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET must be set in production.');
  process.exit(1);
}
const JWT_EXPIRES_IN = '7d'; // Token valid for 7 days
const REFRESH_TOKEN_EXPIRES_DAYS = 30; // Refresh token valid for 30 days

// Generate JWT token
function generateToken(user) {
  const jti = crypto.randomUUID();
  return jwt.sign(
    { 
      id: user.id,
      email: user.email,
      jti,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Refresh token helpers
function generateRefreshToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function storeRefreshToken(client, userId, plainToken) {
  const tokenHash = await bcrypt.hash(plainToken, 10);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
  await client.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );
}

async function verifyRefreshToken(client, userId, plainToken) {
  const result = await client.query(
    `SELECT id, token_hash, expires_at, revoked_at FROM refresh_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [userId]
  );
  const now = new Date();
  for (const row of result.rows) {
    if (row.revoked_at) continue;
    if (new Date(row.expires_at) < now) continue;
    const match = await bcrypt.compare(plainToken, row.token_hash);
    if (match) return row.id;
  }
  return null;
}

async function revokeRefreshToken(client, tokenId) {
  await client.query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`, [tokenId]);
}

// Access token blacklist helpers
const revokedJtiCache = new Map(); // jti -> timestamp cached
async function blacklistAccessToken(client, jti, userId) {
  await client.query(`INSERT INTO revoked_tokens (jti, user_id, revoked_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING`, [jti, userId]);
  revokedJtiCache.set(jti, Date.now());
}

async function isAccessTokenRevoked(client, jti) {
  if (revokedJtiCache.has(jti)) return true;
  const result = await client.query(`SELECT 1 FROM revoked_tokens WHERE jti = $1 LIMIT 1`, [jti]);
  if (result.rowCount > 0) {
    revokedJtiCache.set(jti, Date.now());
    return true;
  }
  return false;
}

// Security audit logging (best-effort)
async function auditEvent(client, req, userId, eventType, meta = {}) {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
    const ua = req.headers['user-agent'] || null;
    await client.query(
      `INSERT INTO security_audit_log (user_id, event_type, ip, user_agent, meta) VALUES ($1, $2, $3, $4, $5)`,
      [userId || null, eventType, typeof ip === 'string' ? ip : null, typeof ua === 'string' ? ua : null, meta ? JSON.stringify(meta) : '{}']
    );
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Audit log insert failed:', e.message);
    }
  }
}

// Verify JWT token middleware
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  // Also support x-api-key for programmatic access
  const apiKey = req.headers['x-api-key'];

  if (!token && !apiKey) {
    return res.status(401).json({ error: 'Access token or API key required' });
  }

  const client = await pool.connect();
  try {
    if (token) {
      const user = jwt.verify(token, JWT_SECRET);
      // Check blacklist
      if (await isAccessTokenRevoked(client, user.jti)) {
        return res.status(403).json({ error: 'Token revoked' });
      }
      req.user = user;
      await auditEvent(client, req, user.id, 'access_token_used', { path: req.path, method: req.method });
      return next();
    }

    if (apiKey) {
      // Expected format: ak_<key_id>_<secret>
      const parts = String(apiKey).split('_');
      if (parts.length < 3 || parts[0] !== 'ak') {
        return res.status(403).json({ error: 'Invalid API key format' });
      }
      const keyId = parts[1];
      const secret = parts.slice(2).join('_');
      const result = await client.query(
        `SELECT user_id, key_hash, revoked_at FROM api_keys WHERE key_id = $1 LIMIT 1`,
        [keyId]
      );
      if (result.rowCount === 0) {
        return res.status(403).json({ error: 'Invalid or revoked API key' });
      }
      const row = result.rows[0];
      if (row.revoked_at) {
        return res.status(403).json({ error: 'Invalid or revoked API key' });
      }
      const ok = await bcrypt.compare(secret, row.key_hash);
      if (!ok) {
        return res.status(403).json({ error: 'Invalid or revoked API key' });
      }
      req.user = { id: row.user_id };
      // Update last_used_at for usage tracking
      try {
        await client.query(`UPDATE api_keys SET last_used_at = NOW() WHERE key_id = $1`, [keyId]);
      } catch (e) {
        // Non-fatal; continue
      }
      await auditEvent(client, req, row.user_id, 'api_key_used', { path: req.path, method: req.method });
      return next();
    }
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  } finally {
    client.release();
  }
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Request logging middleware (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

// Health check
app.get('/health', async (req, res) => {
  try {
    // Quick DB ping
    await pool.query('SELECT 1');
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      connections: pool.totalCount,
      idle: pool.idleCount
    });
  } catch (error) {
    res.status(503).json({ status: 'error', error: error.message });
  }
});

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

app.post('/api/auth/signup', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { email, password, full_name } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Sanitize inputs
    const sanitizedEmail = sanitizeString(email).toLowerCase();
    const sanitizedName = sanitizeString(full_name || '');

    const password_hash = await bcrypt.hash(password, 10);
    
    const query = `
      INSERT INTO users (email, password_hash, full_name)
      VALUES ($1, $2, $3)
      RETURNING id, email, full_name, avatar_url, created_at
    `;
    const result = await client.query(query, [sanitizedEmail, password_hash, sanitizedName || null]);
    
    const user = result.rows[0];
    const token = generateToken(user);
    const refreshToken = generateRefreshToken();
    await storeRefreshToken(client, user.id, refreshToken);
    await auditEvent(client, req, user.id, 'signup', { email: user.email });
    
    // In production, prefer httpOnly cookie for refresh token
    if (process.env.NODE_ENV === 'production') {
      res.cookie('refresh_token', refreshToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000 });
    }
    res.json({ user, token, refreshToken: process.env.NODE_ENV === 'production' ? undefined : refreshToken, error: null });
  } catch (error) {
    console.error('Signup error:', error);
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  } finally {
    client.release();
  }
});

app.post('/api/auth/signin', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Sanitize email
    const sanitizedEmail = sanitizeString(email).toLowerCase();

    const query = `SELECT * FROM users WHERE email = $1`;
    const result = await client.query(query, [sanitizedEmail]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const { password_hash, ...userData } = user;
    const token = generateToken(userData);
    const refreshToken = generateRefreshToken();
    await storeRefreshToken(client, userData.id, refreshToken);
    await auditEvent(client, req, userData.id, 'signin', { email });
    if (process.env.NODE_ENV === 'production') {
      res.cookie('refresh_token', refreshToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000 });
    }
    res.json({ user: userData, token, refreshToken: process.env.NODE_ENV === 'production' ? undefined : refreshToken, error: null });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.post('/api/auth/signout', (req, res) => {
  // Blacklist current access token jti and revoke refresh token if provided
  (async () => {
    const client = await pool.connect();
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (token) {
        const payload = jwt.verify(token, JWT_SECRET);
        if (payload?.jti) {
          await blacklistAccessToken(client, payload.jti, payload.id);
          await auditEvent(client, req, payload.id, 'access_token_revoked', {});
        }
      }
      const rt = req.cookies?.refresh_token || req.body?.refreshToken;
      if (rt && req.user?.id) {
        const tokenId = await verifyRefreshToken(client, req.user.id, rt);
        if (tokenId) await revokeRefreshToken(client, tokenId);
        await auditEvent(client, req, req.user.id, 'refresh_token_revoked', {});
        // Clear cookie in production
        if (process.env.NODE_ENV === 'production') {
          res.clearCookie('refresh_token', { httpOnly: true, secure: true, sameSite: 'strict' });
        }
      }
      res.json({ error: null });
    } catch (e) {
      res.json({ error: null });
    } finally {
      client.release();
    }
  })();
});

app.get('/api/auth/user', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    // req.user is set by authenticateToken middleware
    const query = `
      SELECT id, email, full_name, avatar_url, created_at, updated_at
      FROM users 
      WHERE id = $1
    `;
    const result = await client.query(query, [req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user: result.rows[0], error: null });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// ============================================================================
// GENERIC CRUD ROUTES
// ============================================================================

// ============================================================================
// EXTERNAL INTEGRATIONS: iCal Proxy (avoids browser CORS; mitigates SSRF)
// ============================================================================

function isBlockedHost(hostname) {
  if (!hostname) return true;
  const lower = String(hostname).toLowerCase();
  // Obvious local targets
  if (lower === 'localhost' || lower === 'ip6-localhost') return true;
  if (lower === '127.0.0.1' || lower === '::1' || lower === '0.0.0.0') return true;
  // Private IPv4 ranges and link-local
  if (/^(10|192\.168|172\.(1[6-9]|2[0-9]|3[0-1])|169\.254)\./.test(lower)) return true;
  return false;
}

app.get('/api/proxy/ical', authenticateToken, async (req, res) => {
  try {
    const raw = req.query.url;
    if (!raw || typeof raw !== 'string') {
      return res.status(400).json({ error: 'Missing url parameter' });
    }
    let decoded;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      decoded = raw;
    }
    let target;
    try {
      target = new URL(decoded);
    } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    if (!/^https?:$/.test(target.protocol)) {
      return res.status(400).json({ error: 'Only http/https URLs are allowed' });
    }
    if (isBlockedHost(target.hostname)) {
      return res.status(400).json({ error: 'Blocked host' });
    }

    // Fetch with a timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(target.toString(), {
      method: 'GET',
      signal: controller.signal,
      // user-agent helps some providers allow the request
      headers: { 'User-Agent': 'TimeGrid/1.0 (+ical-proxy)' },
    }).catch((e) => {
      clearTimeout(timeout);
      throw e;
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(response.status).json({ error: `Upstream error ${response.status}` });
    }

    const text = await response.text();
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    // Allow caching briefly to reduce load; adjust as needed
    res.setHeader('Cache-Control', 'private, max-age=60');
    return res.status(200).send(text);
  } catch (err) {
    const msg = err && err.name === 'AbortError' ? 'Upstream timeout' : (err?.message || 'Proxy error');
    return res.status(502).json({ error: msg });
  }
});

// ============================================================================
// ICS EXPORT ROUTES (Subscribe from Google/Apple/Outlook)
// ============================================================================

// Generate or rotate an export token for ICS feeds (per-user). Requires auth.
app.post('/api/export/ics/token', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const token = crypto.randomBytes(24).toString('hex');
    await client.query(
      `UPDATE users
       SET settings = jsonb_set(
         COALESCE(settings, '{}'::jsonb),
         '{exportIcsToken}',
         to_jsonb($2::text),
         true
       )
       WHERE id = $1`,
      [userId, token]
    );
    clearCachedSettings(userId);
    const url = `${req.protocol}://${req.get('host')}/api/export/ics?token=${token}`;
    return res.json({ token, url });
  } catch (e) {
    console.error('Failed to generate ICS token:', e);
    return res.status(500).json({ error: 'Failed to generate token' });
  } finally {
    client.release();
  }
});

// Public ICS endpoint using URL token. Optional query: projectId or calendarId to filter.
// Example: /api/export/ics?token=...&projectId=uuid or &calendarId=uuid
app.get('/api/export/ics', async (req, res) => {
  const { token, projectId, calendarId } = req.query;
  if (!token || typeof token !== 'string') {
    return res.status(400).send('Missing token');
  }
  const client = await pool.connect();
  try {
    const ures = await client.query(
      `SELECT id, settings FROM users WHERE settings->>'exportIcsToken' = $1 LIMIT 1`,
      [token]
    );
    if (ures.rowCount === 0) {
      return res.status(404).send('Not found');
    }
    const userId = ures.rows[0].id;

    // Time window: past 180 days to next 30 days
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - 180);
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + 30);

    const params = [userId, start, end];
    let sql = `
      SELECT te.id, te.start_time, te.end_time, te.duration, te.description,
             p.name AS project_name, p.color AS project_color,
             c.name AS calendar_name, c.color AS calendar_color
      FROM time_entries te
      LEFT JOIN projects p ON p.id = te.project_id
      LEFT JOIN calendars c ON c.id = te.calendar_id
      WHERE te.user_id = $1
        AND te.start_time >= $2
        AND te.end_time <= $3`;
    if (projectId && typeof projectId === 'string') {
      params.push(projectId);
      sql += ' AND te.project_id = $' + params.length;
    }
    if (calendarId && typeof calendarId === 'string') {
      params.push(calendarId);
      sql += ' AND te.calendar_id = $' + params.length;
    }
    sql += ' ORDER BY te.start_time ASC';

    const eres = await client.query(sql, params);
    const events = eres.rows.map((r) => {
      const start = r.start_time ? new Date(r.start_time) : null;
      const end = r.end_time ? new Date(r.end_time) : (start ? new Date(start.getTime() + (r.duration || 0) * 1000) : null);
      return {
        uid: `te-${r.id}@time-brutalist`,
        start: start || new Date(),
        end: end || new Date(),
        summary: r.calendar_name || r.project_name || 'Time Entry',
        description: r.description || undefined,
        location: undefined,
      };
    });

    let calendarName = 'Time Brutalist – My Entries';
    if (projectId && typeof projectId === 'string') {
      calendarName = `Time Brutalist – Project ${projectId}`;
    }
    if (calendarId && typeof calendarId === 'string') {
      calendarName = `Time Brutalist – Calendar ${calendarId}`;
    }
    const ics = buildICSFeed({ calendarName, events });
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).send(ics);
  } catch (e) {
    console.error('ICS export error:', e);
    return res.status(500).send('Server error');
  } finally {
    client.release();
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Input validation helpers
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, 500); // Max 500 chars
}

function validateRequired(fields, body) {
  const missing = fields.filter(field => !body[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}

// Helper function to check cache
function getCachedSettings(userId) {
  const cached = settingsCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

// Helper function to set cache
function setCachedSettings(userId, data) {
  settingsCache.set(userId, { data, timestamp: Date.now() });
}

// Helper function to clear cache
function clearCachedSettings(userId) {
  settingsCache.delete(userId);
}

// ICS generation helpers (UTC times)
function formatDateToICS(dt) {
  // Ensure Date instance and return YYYYMMDDTHHMMSSZ
  const d = dt instanceof Date ? dt : new Date(dt);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) + 'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) + 'Z'
  );
}

function escapeICSText(text) {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function buildICSFeed({ prodId = '-//Time Brutalist//EN', calendarName = 'Time Brutalist', events = [] }) {
  const lines = [];
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push(`PRODID:${prodId}`);
  lines.push('CALSCALE:GREGORIAN');
  lines.push(`X-WR-CALNAME:${escapeICSText(calendarName)}`);
  // Each event
  const nowStr = formatDateToICS(new Date());
  for (const ev of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.uid}`);
    lines.push(`DTSTAMP:${nowStr}`);
    lines.push(`DTSTART:${formatDateToICS(ev.start)}`);
    lines.push(`DTEND:${formatDateToICS(ev.end)}`);
    if (ev.summary) lines.push(`SUMMARY:${escapeICSText(ev.summary)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escapeICSText(ev.description)}`);
    if (ev.location) lines.push(`LOCATION:${escapeICSText(ev.location)}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// ----------------------------------------------------------------------------
// SAFE QUERY HELPERS
// ----------------------------------------------------------------------------
// Whitelist tables exposed via generic CRUD
const ALLOWED_TABLES = new Set([
  'time_entries',
  'time_entry_tags',
  'projects',
  'clients',
  'tags',
  'users',
  'calendars',
]);

// Tables that are user-owned and include a `user_id` column
const TABLES_WITH_USER_ID = new Set([
  'time_entries',
  'projects',
  'clients',
  'tags',
  'team_members',
  'calendars',
]);

// Basic identifier validation: allow letters, numbers, underscore, dot (for qualified names)
function isSafeIdentifier(name) {
  return typeof name === 'string' && /^[a-zA-Z_][a-zA-Z0-9_\.]*$/.test(name);
}

// Sanitize a comma-separated columns string or `*`
function sanitizeColumns(columns, table) {
  if (!columns || columns === '*') return '*';

  const parts = String(columns)
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  // For users table, restrict selectable columns to a safe subset
  const allowedUserCols = new Set([
    'id',
    'email',
    'full_name',
    'avatar_url',
    'created_at',
    'updated_at',
    'settings',
  ]);

  const sanitized = parts.filter((col) => {
    if (!isSafeIdentifier(col)) return false;
    if (table === 'users') {
      return allowedUserCols.has(col);
    }
    return true;
  });

  if (sanitized.length === 0) {
    // Fall back to safe default
    return table === 'users' ? 'id,email,full_name,avatar_url,created_at,updated_at' : '*';
  }

  return sanitized.join(', ');
}

// SELECT - Get all records from a table with pagination support
app.get('/api/:table', authenticateToken, async (req, res) => {
  let query = '';
  let countQuery = '';
  const client = await pool.connect(); // Use a dedicated client for this query
  
  try {
    const { table } = req.params;
    const { columns = '*', order, limit, offset, page, ...filters } = req.query;

    // Enforce table whitelist
    if (!ALLOWED_TABLES.has(table)) {
      return res.status(400).json({ data: null, error: 'Invalid table' });
    }
    
    // Calculate offset from page if provided
    const pageNum = page ? parseInt(page) : null;
    const limitNum = limit ? parseInt(limit) : (pageNum ? 50 : null); // Default 50 per page
    const offsetNum = pageNum && limitNum ? (pageNum - 1) * limitNum : (offset ? parseInt(offset) : null);
    
    // Check cache for user settings
    if (table === 'users' && columns === 'settings' && filters.id) {
      const cached = getCachedSettings(filters.id);
      if (cached) {
        return res.json({ data: [{ settings: cached }], error: null, count: 1, cached: true });
      }
    }
    const safeColumns = sanitizeColumns(columns, table);
    query = `SELECT ${safeColumns} FROM ${table}`;
    const values = [];
    
    // Add WHERE clauses for filters (excluding 'order')
    const filterKeys = Object.keys(filters);
    const whereClauses = [];
    
    // SECURITY: Auto-add user_id filter for user-scoped tables
    if (TABLES_WITH_USER_ID.has(table) && !filterKeys.includes('user_id')) {
      values.push(req.user.id);
      whereClauses.push(`user_id = $${values.length}`);
    }
    
    if (filterKeys.length > 0) {
      for (const key of filterKeys) {
        // Block unsafe identifiers to prevent SQL injection via column names
        if (!key.endsWith('_in') && !key.endsWith('_is') && !isSafeIdentifier(key)) {
          return res.status(400).json({ data: null, error: `Invalid filter key: ${key}` });
        }
        // Handle _in suffix for IN queries
        if (key.endsWith('_in')) {
          const columnName = key.slice(0, -3);
          if (!isSafeIdentifier(columnName)) {
            return res.status(400).json({ data: null, error: `Invalid filter key: ${key}` });
          }
          const idsString = filters[key];
          
          // Skip if empty
          if (!idsString || idsString.trim() === '') {
            continue;
          }
          
          const ids = idsString.split(',').filter(id => id.trim());
          
          // Skip if no valid IDs
          if (ids.length === 0) {
            continue;
          }
          
          const startIdx = values.length;
          values.push(...ids);
          const placeholders = ids.map((_, i) => `$${startIdx + i + 1}`).join(', ');
          whereClauses.push(`${columnName} IN (${placeholders})`);
        }
        // Handle _is suffix for IS queries (null checks)
        else if (key.endsWith('_is')) {
          const columnName = key.slice(0, -3);
          if (!isSafeIdentifier(columnName)) {
            return res.status(400).json({ data: null, error: `Invalid filter key: ${key}` });
          }
          const raw = String(filters[key]).toUpperCase();
          const isClause = raw === 'NULL' ? 'NULL' : raw === 'NOT NULL' ? 'NOT NULL' : null;
          if (!isClause) {
            return res.status(400).json({ data: null, error: `Invalid _is value for ${columnName}` });
          }
          whereClauses.push(`${columnName} IS ${isClause}`);
        }
        // Regular equality
        else {
          values.push(filters[key]);
          whereClauses.push(`${key} = $${values.length}`);
        }
      }
    }
    
    // Add WHERE clause if we have any conditions
    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    
    // Add ORDER BY clause if specified
    if (order) {
      const [column, direction = 'asc'] = String(order).split(':');
      if (!isSafeIdentifier(column)) {
        return res.status(400).json({ data: null, error: 'Invalid order column' });
      }
      const dir = direction.toLowerCase();
      if (!['asc', 'desc'].includes(dir)) {
        return res.status(400).json({ data: null, error: 'Invalid order direction' });
      }
      query += ` ORDER BY ${column} ${dir.toUpperCase()}`;
    }
    
    // Add LIMIT clause if specified
    if (limitNum) {
      query += ` LIMIT ${limitNum}`;
    }
    
    // Add OFFSET clause if specified
    if (offsetNum) {
      query += ` OFFSET ${offsetNum}`;
    }
    
    // Execute main query
    const result = await client.query(query, values);
    
    // Get total count if pagination is requested
    let totalCount = result.rowCount;
    let pagination = null;
    
    if (pageNum && limitNum) {
      // Build count query (reuse WHERE clause)
      countQuery = `SELECT COUNT(*) as total FROM ${table}`;
      
      if (values.length > 0) {
        // Extract WHERE clause from the original query
        const whereMatch = query.match(/WHERE (.+?)(ORDER BY|LIMIT|$)/);
        if (whereMatch) {
          countQuery += ` WHERE ${whereMatch[1].trim()}`;
        }
      }

      const countResult = await client.query(countQuery, values.slice(0, values.length - (limitNum ? 0 : 0)));
      totalCount = parseInt(countResult.rows[0].total);
      
      pagination = {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum),
        hasMore: pageNum * limitNum < totalCount
      };
    }
    
    // Cache user settings
    if (table === 'users' && columns === 'settings' && filters.id && result.rows[0]) {
      setCachedSettings(filters.id, result.rows[0].settings);
    }
    
    // Convert snake_case to camelCase in response
    const camelCaseRows = result.rows.map(row => {
      const camelRow = {};
      for (const [key, value] of Object.entries(row)) {
        camelRow[snakeToCamel(key)] = value;
      }
      return camelRow;
    });
    
    const response = { 
      data: camelCaseRows, 
      error: null, 
      count: result.rowCount 
    };
    
    if (pagination) {
      response.pagination = pagination;
    }
    
    res.json(response);
  } catch (error) {
    console.error(`Select error for table "${req.params.table}":`, error.message);
    res.status(500).json({ data: null, error: error.message });
  } finally {
    client.release();
  }
});

// Helper to convert camelCase to snake_case
const camelToSnake = (str) => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

// Helper to convert snake_case to camelCase
const snakeToCamel = (str) => {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
};

// INSERT - Create new record(s)
app.post('/api/:table', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { table } = req.params;
    const data = Array.isArray(req.body) ? req.body : [req.body];

    // Enforce table whitelist
    if (!ALLOWED_TABLES.has(table)) {
      return res.status(400).json({ data: null, error: 'Invalid table' });
    }
    
    if (data.length === 0) {
      return res.status(400).json({ error: 'No data provided' });
    }
    
    // If table is user-scoped, ensure user_id is set to current user
    const preparedData = data.map((row) => {
      const copy = { ...row };
      if (TABLES_WITH_USER_ID.has(table) && !('user_id' in copy)) {
        copy.user_id = req.user.id;
      }
      // Remove undefined, null, and empty string values
      const filtered = {};
      for (const [key, value] of Object.entries(copy)) {
        if (value !== undefined && value !== null && value !== '') {
          filtered[key] = value;
        }
      }
      // Convert camelCase to snake_case
      const snakeCaseRow = {};
      for (const [key, value] of Object.entries(filtered)) {
        snakeCaseRow[camelToSnake(key)] = value;
      }
      return snakeCaseRow;
    });

    const columns = Object.keys(preparedData[0]);
    // Validate column identifiers
    if (columns.some((c) => !isSafeIdentifier(c))) {
      return res.status(400).json({ data: null, error: 'Invalid column name' });
    }
    const placeholders = data.map((_, idx) => 
      `(${columns.map((_, colIdx) => `$${idx * columns.length + colIdx + 1}`).join(', ')})`
    ).join(', ');
    const flatValues = preparedData.flatMap(v => columns.map(col => v[col]));
    
    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES ${placeholders}
      RETURNING *
    `;
    const result = await client.query(query, flatValues);
    // Convert snake_case back to camelCase in response
    const camelCaseRows = result.rows.map(row => {
      const camelRow = {};
      for (const [key, value] of Object.entries(row)) {
        camelRow[snakeToCamel(key)] = value;
      }
      return camelRow;
    });
    res.json({ data: camelCaseRows, error: null });
  } catch (error) {
    console.error('Insert error:', error);
    res.status(500).json({ data: null, error: error.message });
  } finally {
    client.release();
  }
});

// UPDATE - Update records
app.patch('/api/:table', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { table } = req.params;
    const { data, filters } = req.body;

    // Enforce table whitelist
    if (!ALLOWED_TABLES.has(table)) {
      return res.status(400).json({ data: null, error: 'Invalid table' });
    }
    
    if (!data || !filters) {
      return res.status(400).json({ error: 'Both data and filters are required' });
    }
    
    // Convert camelCase to snake_case in data and filters
    const snakeCaseData = {};
    for (const [key, value] of Object.entries(data)) {
      snakeCaseData[camelToSnake(key)] = value;
    }
    
    const snakeCaseFilters = {};
    for (const [key, value] of Object.entries(filters)) {
      snakeCaseFilters[camelToSnake(key)] = value;
    }
    
    const columns = Object.keys(snakeCaseData);
    if (columns.some((c) => !isSafeIdentifier(c))) {
      return res.status(400).json({ data: null, error: 'Invalid column name' });
    }
    const setClause = columns.map((col, idx) => `${col} = $${idx + 1}`).join(', ');
    const values = [...columns.map(col => snakeCaseData[col])];
    
    // Add WHERE clause
    const filterKeys = Object.keys(snakeCaseFilters);
    for (const k of filterKeys) {
      if (!isSafeIdentifier(k)) {
        return res.status(400).json({ data: null, error: `Invalid filter key: ${k}` });
      }
    }

    // Enforce user ownership for user-scoped tables
    const whereClauses = [];
    const baseWhere = filterKeys.map((key, idx) => {
      values.push(snakeCaseFilters[key]);
      return `${key} = $${columns.length + idx + 1}`;
    });
    whereClauses.push(...baseWhere);
    if (TABLES_WITH_USER_ID.has(table) && !filterKeys.includes('user_id')) {
      values.push(req.user.id);
      whereClauses.push(`user_id = $${values.length}`);
    }
    
    const query = `
      UPDATE ${table}
      SET ${setClause}, updated_at = NOW()
      WHERE ${whereClauses.join(' AND ')}
      RETURNING *
    `;
    const result = await client.query(query, values);
    
    // Clear cache if updating user settings
    if (table === 'users' && snakeCaseData.settings && snakeCaseFilters.id) {
      clearCachedSettings(snakeCaseFilters.id);
    }
    
    // Convert snake_case back to camelCase in response
    const camelCaseRows = result.rows.map(row => {
      const camelRow = {};
      for (const [key, value] of Object.entries(row)) {
        camelRow[snakeToCamel(key)] = value;
      }
      return camelRow;
    });
    
    res.json({ data: camelCaseRows, error: null });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ data: null, error: error.message });
  } finally {
    client.release();
  }
});

// DELETE - Delete records
app.delete('/api/:table', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { table } = req.params;
    const filters = req.body;

    // Enforce table whitelist
    if (!ALLOWED_TABLES.has(table)) {
      return res.status(400).json({ data: null, error: 'Invalid table' });
    }
    
    if (!filters || Object.keys(filters).length === 0) {
      return res.status(400).json({ error: 'Filters are required for delete' });
    }
    
    const filterKeys = Object.keys(filters);
    const values = Object.values(filters);
    for (const k of filterKeys) {
      if (!isSafeIdentifier(k)) {
        return res.status(400).json({ data: null, error: `Invalid filter key: ${k}` });
      }
    }
    const whereClauses = filterKeys.map((key, idx) => `${key} = $${idx + 1}`);
    // Enforce user ownership for user-scoped tables
    if (TABLES_WITH_USER_ID.has(table) && !filterKeys.includes('user_id')) {
      values.push(req.user.id);
      whereClauses.push(`user_id = $${values.length}`);
    }
    
    const query = `DELETE FROM ${table} WHERE ${whereClauses.join(' AND ')} RETURNING *`;
    const result = await client.query(query, values);
    
    // Clear cache if deleting user
    if (table === 'users' && filters.id) {
      clearCachedSettings(filters.id);
    }
    
    res.json({ data: result.rows, error: null });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ data: null, error: error.message });
  } finally {
    client.release();
  }
});

// ============================================================================
// START SERVER
// ============================================================================

const server = app.listen(port, () => {
  console.log(`🚀 API Server running on http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`⚡ Cache enabled (TTL: ${CACHE_TTL / 1000}s)`);
  console.log(`🔌 Connection pool: max ${pool.options.max} connections`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server gracefully...');
  server.close(async () => {
    console.log('Server closed');
    await pool.end();
    console.log('Database pool closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, closing server gracefully...');
  server.close(async () => {
    console.log('Server closed');
    await pool.end();
    console.log('Database pool closed');
    process.exit(0);
  });
});

// Clear expired cache entries every minute
setInterval(() => {
  const now = Date.now();
  let cleared = 0;
  for (const [key, value] of settingsCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      settingsCache.delete(key);
      cleared++;
    }
  }
  if (cleared > 0) {
    console.log(`🧹 Cleared ${cleared} expired cache entries`);
  }
}, 60000);
// Refresh access token
app.post('/api/auth/refresh', async (req, res) => {
  const client = await pool.connect();
  try {
    const rt = req.cookies?.refresh_token || req.body?.refreshToken;
    const userId = req.body?.userId || req.user?.id;
    if (!rt || !userId) {
      return res.status(400).json({ error: 'Missing refresh token or userId' });
    }
    const tokenId = await verifyRefreshToken(client, userId, rt);
    if (!tokenId) {
      return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }
    const result = await client.query(`SELECT id, email FROM users WHERE id = $1`, [userId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = result.rows[0];
    const token = generateToken(user);
    await auditEvent(client, req, userId, 'access_token_refreshed', {});
    res.json({ token, error: null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// API Key management - DISABLED
/*
app.post('/api/auth/api-keys', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const name = sanitizeString(String(req.body?.name || '')) || null;
    const keyId = crypto.randomBytes(8).toString('hex');
    const secret = crypto.randomBytes(24).toString('hex');
    const keyHash = await bcrypt.hash(secret, 10);
    await client.query(
      `INSERT INTO api_keys (user_id, key_id, key_hash, name) VALUES ($1, $2, $3, $4)`,
      [req.user.id, keyId, keyHash, name]
    );
    await auditEvent(client, req, req.user.id, 'api_key_created', { keyId, name });
    res.json({ apiKey: `ak_${keyId}_${secret}`, keyId, name, error: null });
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.get('/api/auth/api-keys', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, key_id, name, created_at, last_used_at, revoked_at FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ keys: result.rows, error: null });
  } catch (error) {
    console.error('List API keys error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.delete('/api/auth/api-keys/:keyId', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { keyId } = req.params;
    const result = await client.query(
      `UPDATE api_keys SET revoked_at = NOW() WHERE user_id = $1 AND key_id = $2 AND revoked_at IS NULL RETURNING id, key_id, revoked_at`,
      [req.user.id, keyId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'API key not found or already revoked' });
    }
    await auditEvent(client, req, req.user.id, 'api_key_revoked', { keyId });
    res.json({ key: result.rows[0], error: null });
  } catch (error) {
    console.error('Revoke API key error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Toggle API key active state (revoked_at null <-> now)
app.patch('/api/auth/api-keys/:keyId', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { keyId } = req.params;
    const active = Boolean(req.body?.active);
    const result = await client.query(
      active
        ? `UPDATE api_keys SET revoked_at = NULL WHERE user_id = $1 AND key_id = $2 RETURNING id, key_id, name, created_at, last_used_at, revoked_at`
        : `UPDATE api_keys SET revoked_at = NOW() WHERE user_id = $1 AND key_id = $2 RETURNING id, key_id, name, created_at, last_used_at, revoked_at`,
      [req.user.id, keyId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }
    await auditEvent(client, req, req.user.id, 'api_key_toggled', { keyId, active });
    res.json({ key: result.rows[0], error: null });
  } catch (error) {
    console.error('Toggle API key error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});
*/
