import pkg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE || 'timetrack',
  user: process.env.PGUSER || 'timetrack',
  password: process.env.PGPASSWORD || 'timetrack_dev_password',
});

const seedDatabase = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting database seeding...');
    
    // Create dummy user
    const email = 'dummy@example.com';
    const password = 'dummy123456';
    const passwordHash = await bcrypt.hash(password, 10);
    
    let userId;
    
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
      console.log(`✅ User already exists: ${email} (ID: ${userId})`);
      // Delete old data for this user to start fresh
      await client.query('DELETE FROM time_entries WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM projects WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM tags WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM clients WHERE user_id = $1', [userId]);
      console.log('🗑️  Cleared old data for this user');
    } else {
      const userResult = await client.query(
        'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id',
        [email, passwordHash, 'Dummy User']
      );
      userId = userResult.rows[0].id;
      console.log(`✅ Created dummy user: ${email} (ID: ${userId})`);
    }
    
    // Create clients
    console.log('\n📋 Creating clients...');
    const clientsData = [
      { name: 'Acme Corporation', contact_email: 'contact@acme.com' },
      { name: 'Tech Startup Inc', contact_email: 'hello@techstartup.com' },
    ];
    
    const clients = [];
    for (const client_data of clientsData) {
      const result = await client.query(
        'INSERT INTO clients (user_id, name, contact_email) VALUES ($1, $2, $3) RETURNING id',
        [userId, client_data.name, client_data.contact_email]
      );
      clients.push({ id: result.rows[0].id, ...client_data });
    }
    console.log(`✅ Created ${clients.length} clients`);
    
    // Create projects
    console.log('\n🎯 Creating projects...');
    const projectsData = [
      // School Work
      { name: 'Computer Science 101', description: 'Database design assignment', color: '#FF6B6B', hourly_rate: 0 },
      { name: 'Advanced JavaScript Course', description: 'Online learning', color: '#4ECDC4', hourly_rate: 0 },
      { name: 'Web Development Bootcamp', description: 'Full stack development course', color: '#45B7D1', hourly_rate: 0 },
      
      // Personal Projects
      { name: 'Personal Blog', description: 'Building my own blog site', color: '#96CEB4', hourly_rate: 0 },
      { name: 'Fitness Tracker App', description: 'Personal health tracking', color: '#FFEAA7', hourly_rate: 0 },
      { name: 'Photo Gallery', description: 'Digital photo organization', color: '#DDA15E', hourly_rate: 0 },
      
      // Coding Projects
      { name: 'Open Source Contribution', description: 'Contributing to GitHub projects', color: '#BC6C25', hourly_rate: 50 },
      { name: 'Side Gig - Mobile App', description: 'Building a mobile app', color: '#B4A7D6', hourly_rate: 75 },
      { name: 'API Development', description: 'Building REST APIs', color: '#9B59B6', hourly_rate: 60 },
      { name: 'React Components Library', description: 'Reusable UI components', color: '#3498DB', hourly_rate: 65 },
      
      // Work Projects (link to clients)
      { 
        name: 'Client Website Redesign', 
        description: 'Acme Corp new website', 
        color: '#E74C3C', 
        hourly_rate: 125,
        client_id: clients[0]?.id
      },
      { 
        name: 'Tech Startup Dashboard', 
        description: 'Analytics dashboard for Tech Startup', 
        color: '#27AE60', 
        hourly_rate: 150,
        client_id: clients[1]?.id
      },
      { 
        name: 'Internal Tools Development', 
        description: 'Tools for company use', 
        color: '#2980B9', 
        hourly_rate: 0 
      },
      { 
        name: 'Email Campaign System', 
        description: 'Marketing email automation', 
        color: '#F39C12', 
        hourly_rate: 0 
      },
      { 
        name: 'Data Migration Project', 
        description: 'Migrating legacy systems', 
        color: '#C0392B', 
        hourly_rate: 0 
      },
    ];
    
    const projects = [];
    for (const proj of projectsData) {
      const result = await client.query(
        'INSERT INTO projects (user_id, client_id, name, description, color, hourly_rate) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [userId, proj.client_id || null, proj.name, proj.description, proj.color, proj.hourly_rate]
      );
      projects.push({ id: result.rows[0].id, ...proj });
    }
    console.log(`✅ Created ${projects.length} projects`);
    
    // Create tags
    console.log('\n🏷️  Creating tags...');
    const tagsData = [
      'frontend', 'backend', 'database', 'design', 'research', 'documentation',
      'bug-fix', 'feature', 'testing', 'review', 'important', 'learning',
      'urgent', 'follow-up', 'client-meeting', 'brainstorm', 'implementation',
      'debugging', 'optimization', 'deployment'
    ];
    
    const tags = [];
    for (const tagName of tagsData) {
      const result = await client.query(
        'INSERT INTO tags (user_id, name) VALUES ($1, $2) RETURNING id',
        [userId, tagName]
      );
      tags.push({ id: result.rows[0].id, name: tagName });
    }
    console.log(`✅ Created ${tags.length} tags`);
    
    // Create time entries - A LOT of them!
    console.log('\n⏱️  Creating time entries...');
    
    const getRandomDate = (daysAgo) => {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
      date.setHours(Math.floor(Math.random() * 12) + 8);
      date.setMinutes(Math.floor(Math.random() * 60));
      return date;
    };
    
    const getRandomDuration = () => {
      return Math.floor(Math.random() * 7200) + 900; // 15 min to 2 hours
    };
    
    const getRandomTags = () => {
      const count = Math.floor(Math.random() * 3) + 1;
      const selected = [];
      for (let i = 0; i < count; i++) {
        selected.push(tags[Math.floor(Math.random() * tags.length)]);
      }
      return [...new Set(selected)]; // Remove duplicates
    };
    
    let timeEntryCount = 0;
    
    // Create 1000+ time entries spread across a whole year of projects
    for (let i = 0; i < 1000; i++) {
      const project = projects[Math.floor(Math.random() * projects.length)];
      const startTime = getRandomDate(365);
      const duration = getRandomDuration();
      const endTime = new Date(startTime.getTime() + duration * 1000);
      const isBillable = project.hourly_rate > 0 ? Math.random() > 0.3 : false;
      
      const descriptions = [
        'Working on feature implementation',
        'Code review and optimization',
        'Bug fixes and debugging',
        'Documentation update',
        'Testing and quality assurance',
        'Meeting with team',
        'Research and learning',
        'Database optimization',
        'UI/UX improvements',
        'Integration testing',
        'Client communication',
        'Setup and configuration',
        'Performance monitoring',
        'Security audit',
        'Refactoring code',
      ];
      
      const description = descriptions[Math.floor(Math.random() * descriptions.length)];
      
      const result = await client.query(
        'INSERT INTO time_entries (user_id, project_id, client_id, start_time, end_time, duration, description, is_billable) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
        [userId, project.id, project.client_id || null, startTime, endTime, duration, description, isBillable]
      );
      
      const timeEntryId = result.rows[0].id;
      
      // Add random tags to this time entry
      const selectedTags = getRandomTags();
      for (const tag of selectedTags) {
        await client.query(
          'INSERT INTO time_entry_tags (time_entry_id, tag_id) VALUES ($1, $2)',
          [timeEntryId, tag.id]
        );
      }
      
      timeEntryCount++;
      if (timeEntryCount % 100 === 0) {
        console.log(`  ⏳ Created ${timeEntryCount} time entries...`);
      }
    }
    console.log(`✅ Created ${timeEntryCount} time entries with tags`);
    
    console.log('\n✨ Dummy data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   User: ${email} (password: ${password})`);
    console.log(`   Projects: ${projects.length}`);
    console.log(`   Tags: ${tags.length}`);
    console.log(`   Time Entries: ${timeEntryCount}`);
    console.log(`   Clients: ${clients.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

seedDatabase().catch(console.error);
