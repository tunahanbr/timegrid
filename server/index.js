import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import bcrypt from 'bcryptjs';

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
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    
    const query = `
      INSERT INTO users (email, password_hash, full_name)
      VALUES ($1, $2, $3)
      RETURNING id, email, full_name, avatar_url, created_at
    `;
    const result = await client.query(query, [email, password_hash, full_name || null]);
    
    res.json({ user: result.rows[0], error: null });
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
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const query = `SELECT * FROM users WHERE email = $1`;
    const result = await client.query(query, [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const { password_hash, ...userData } = user;
    res.json({ user: userData, error: null });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.post('/api/auth/signout', (req, res) => {
  res.json({ error: null });
});

app.get('/api/auth/user', async (req, res) => {
  // This would normally use session/JWT token
  // For now, return null (implement session management as needed)
  res.json({ user: null, error: null });
});

// ============================================================================
// GENERIC CRUD ROUTES
// ============================================================================

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

// SELECT - Get all records from a table
app.get('/api/:table', async (req, res) => {
  let query = '';
  const client = await pool.connect(); // Use a dedicated client for this query
  
  try {
    const { table } = req.params;
    const { columns = '*', order, limit, offset, ...filters } = req.query;
    
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
    if (limit) {
      query += ` LIMIT ${parseInt(limit)}`;
    }
    
    // Add OFFSET clause if specified
    if (offset) {
      query += ` OFFSET ${parseInt(offset)}`;
    }
    
    const result = await client.query(query, values);
    
    // Cache user settings
    if (table === 'users' && columns === 'settings' && filters.id && result.rows[0]) {
      setCachedSettings(filters.id, result.rows[0].settings);
    }
    
    res.json({ data: result.rows, error: null, count: result.rowCount });
  } catch (error) {
    console.error(`Select error for table "${req.params.table}":`, error.message);
    res.status(500).json({ data: null, error: error.message });
  } finally {
    client.release();
  }
});

// INSERT - Create new record(s)
app.post('/api/:table', async (req, res) => {
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
app.patch('/api/:table', async (req, res) => {
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
app.delete('/api/:table', async (req, res) => {
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
