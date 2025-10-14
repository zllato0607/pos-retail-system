// Simple script to create admin user without external dependencies
import fs from 'fs';
import crypto from 'crypto';

// Simple bcrypt-like hash function using Node.js built-in crypto
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Create a simple SQL file to insert admin user
const hashedPassword = hashPassword('admin123');
const adminId = 'admin-' + Date.now();

const sqlCommands = `
-- Create admin user
INSERT OR REPLACE INTO users (id, username, password, full_name, role, created_at, updated_at)
VALUES ('${adminId}', 'admin', '${hashedPassword}', 'Administrator', 'admin', datetime('now'), datetime('now'));

-- Verify user was created
SELECT username, full_name, role FROM users WHERE username = 'admin';
`;

fs.writeFileSync('setup-admin.sql', sqlCommands);
console.log('✅ Admin setup SQL file created: setup-admin.sql');
console.log('📝 Default login credentials:');
console.log('   Username: admin');
console.log('   Password: admin123');
