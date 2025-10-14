// Clear any cached data and reset the application
import fs from 'fs';
import path from 'path';

console.log('🧹 Clearing application cache...');

// Clear any potential cache files
const cacheFiles = [
  'node_modules/.cache',
  '.vite',
  'dist'
];

cacheFiles.forEach(file => {
  const fullPath = path.resolve(file);
  if (fs.existsSync(fullPath)) {
    console.log(`Removing ${file}...`);
    fs.rmSync(fullPath, { recursive: true, force: true });
  }
});

console.log('✅ Cache cleared!');
console.log('🔄 Please restart your development server with: npm run dev');
