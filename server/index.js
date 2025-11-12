import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pkg;
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.VITE_DB_HOST || 'localhost',
  port: parseInt(process.env.VITE_DB_PORT || '5432'),
  database: process.env.VITE_DB_NAME || 'timetrack',
  user: process.env.VITE_DB_USER || 'timetrack',
  password: process.env.VITE_DB_PASSWORD || 'timetrack_dev_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL error:', err);
  process.exit(-1);
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

app.post('/api/auth/signup', async (req, res) => {
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
    const result = await pool.query(query, [email, password_hash, full_name || null]);
    
    res.json({ user: result.rows[0], error: null });
  } catch (error) {
    console.error('Signup error:', error);
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const query = `SELECT * FROM users WHERE email = $1`;
    const result = await pool.query(query, [email]);
    
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

// SELECT - Get all records from a table
app.get('/api/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const { columns = '*', order, ...filters } = req.query;
    
    let query = `SELECT ${columns} FROM ${table}`;
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
    
    const result = await pool.query(query, values);
    res.json({ data: result.rows, error: null, count: result.rowCount });
  } catch (error) {
    console.error(`Select error for table "${req.params.table}":`, error.message);
    console.error(`Query: ${query}`);
    console.error(`Filters: ${JSON.stringify(req.query)}`);
    res.status(500).json({ data: null, error: error.message });
  }
});

// INSERT - Create new record(s)
app.post('/api/:table', async (req, res) => {
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
    const result = await pool.query(query, flatValues);
    res.json({ data: result.rows, error: null });
  } catch (error) {
    console.error('Insert error:', error);
    res.status(500).json({ data: null, error: error.message });
  }
});

// UPDATE - Update records
app.patch('/api/:table', async (req, res) => {
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
      SET ${setClause}
      WHERE ${whereClauses.join(' AND ')}
      RETURNING *
    `;
    const result = await pool.query(query, values);
    res.json({ data: result.rows, error: null });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ data: null, error: error.message });
  }
});

// DELETE - Delete records
app.delete('/api/:table', async (req, res) => {
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
    const result = await pool.query(query, values);
    res.json({ data: result.rows, error: null });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ data: null, error: error.message });
  }
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(port, () => {
  console.log(`🚀 API Server running on http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
});
