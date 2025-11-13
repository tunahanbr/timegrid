import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';

const { Pool } = pkg;
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// PostgreSQL connection pool with optimized settings
const pool = new Pool({
  host: process.env.VITE_DB_HOST || 'localhost',
  port: parseInt(process.env.VITE_DB_PORT || '5432'),
  database: process.env.VITE_DB_NAME || 'timetrack',
  user: process.env.VITE_DB_USER || 'timetrack',
  password: process.env.VITE_DB_PASSWORD || 'timetrack_dev_password',
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
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for development
  crossOriginEmbedderPolicy: false,
}));

// CORS - Restrict to frontend origin only
const allowedOrigins = [
  'http://localhost:5173', // Vite dev
  'http://localhost:8080', // Tauri dev
  'http://localhost:4173', // Vite preview
  'tauri://localhost', // Tauri production
  'https://tauri.localhost', // Tauri production (alternative)
  process.env.FRONTEND_URL, // Production frontend
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Tauri, or curl)
    if (!origin) return callback(null, true);
    
    // Allow any tauri:// protocol
    if (origin && origin.startsWith('tauri://')) {
      return callback(null, true);
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
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting - General API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting - Auth endpoints (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 100, // 5 in production, 100 in dev
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
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
const JWT_EXPIRES_IN = '7d'; // Token valid for 7 days

// Generate JWT token
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Verify JWT token middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user; // Attach user info to request
    next();
  });
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Middleware
app.use(cors());
app.use(express.json());

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
    
    res.json({ 
      user, 
      token,
      error: null 
    });
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
    
    res.json({ 
      user: userData, 
      token,
      error: null 
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.post('/api/auth/signout', (req, res) => {
  // With JWT, signout is handled client-side by removing the token
  // Optional: implement token blacklist for revocation
  res.json({ error: null });
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

// SELECT - Get all records from a table with pagination support
app.get('/api/:table', authenticateToken, async (req, res) => {
  let query = '';
  let countQuery = '';
  const client = await pool.connect(); // Use a dedicated client for this query
  
  try {
    const { table } = req.params;
    const { columns = '*', order, limit, offset, page, ...filters } = req.query;
    
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
    
    query = `SELECT ${columns} FROM ${table}`;
    const values = [];
    
    // Add WHERE clauses for filters (excluding 'order')
    const filterKeys = Object.keys(filters);
    if (filterKeys.length > 0) {
      const whereClauses = [];
      
      for (const key of filterKeys) {
        // Handle _in suffix for IN queries
        if (key.endsWith('_in')) {
          const columnName = key.slice(0, -3);
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
          whereClauses.push(`${columnName} IS ${filters[key]}`);
        }
        // Regular equality
        else {
          values.push(filters[key]);
          whereClauses.push(`${key} = $${values.length}`);
        }
      }
      
      if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(' AND ')}`;
      }
    }
    
    // Add ORDER BY clause if specified
    if (order) {
      const [column, direction = 'asc'] = order.split(':');
      query += ` ORDER BY ${column} ${direction.toUpperCase()}`;
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
    
    const response = { 
      data: result.rows, 
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

// INSERT - Create new record(s)
app.post('/api/:table', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { table } = req.params;
    const data = Array.isArray(req.body) ? req.body : [req.body];
    
    if (data.length === 0) {
      return res.status(400).json({ error: 'No data provided' });
    }
    
    const columns = Object.keys(data[0]);
    const placeholders = data.map((_, idx) => 
      `(${columns.map((_, colIdx) => `$${idx * columns.length + colIdx + 1}`).join(', ')})`
    ).join(', ');
    const flatValues = data.flatMap(v => columns.map(col => v[col]));
    
    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES ${placeholders}
      RETURNING *
    `;
    const result = await client.query(query, flatValues);
    res.json({ data: result.rows, error: null });
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
    
    if (!data || !filters) {
      return res.status(400).json({ error: 'Both data and filters are required' });
    }
    
    const columns = Object.keys(data);
    const setClause = columns.map((col, idx) => `${col} = $${idx + 1}`).join(', ');
    const values = [...columns.map(col => data[col])];
    
    // Add WHERE clause
    const filterKeys = Object.keys(filters);
    const whereClauses = filterKeys.map((key, idx) => {
      values.push(filters[key]);
      return `${key} = $${columns.length + idx + 1}`;
    });
    
    const query = `
      UPDATE ${table}
      SET ${setClause}, updated_at = NOW()
      WHERE ${whereClauses.join(' AND ')}
      RETURNING *
    `;
    const result = await client.query(query, values);
    
    // Clear cache if updating user settings
    if (table === 'users' && data.settings && filters.id) {
      clearCachedSettings(filters.id);
    }
    
    res.json({ data: result.rows, error: null });
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
    
    if (!filters || Object.keys(filters).length === 0) {
      return res.status(400).json({ error: 'Filters are required for delete' });
    }
    
    const filterKeys = Object.keys(filters);
    const values = Object.values(filters);
    const whereClauses = filterKeys.map((key, idx) => `${key} = $${idx + 1}`);
    
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
