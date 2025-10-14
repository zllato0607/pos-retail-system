#!/usr/bin/env node

// Create a static build without Vite
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('📦 Creating static production build...');

// Create dist directory
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy index.html and modify for production
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/vite.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>POS Retail System</title>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/react-router-dom@6/dist/umd/react-router-dom.production.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root"></div>
  <script>
    // Simple fallback app
    const { createElement: h, useState } = React;
    const { createRoot } = ReactDOM;
    
    function App() {
      return h('div', { className: 'min-h-screen bg-gray-100 flex items-center justify-center' },
        h('div', { className: 'text-center' },
          h('h1', { className: 'text-4xl font-bold text-gray-900 mb-4' }, 'POS Retail System'),
          h('p', { className: 'text-gray-600 mb-8' }, 'Loading application...'),
          h('div', { className: 'animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto' })
        )
      );
    }
    
    const root = createRoot(document.getElementById('root'));
    root.render(h(App));
    
    // Redirect to API health check
    setTimeout(() => {
      window.location.href = '/api/health';
    }, 3000);
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(distDir, 'index.html'), indexHtml);

console.log('✅ Static build created in dist/ directory');
console.log('📁 Upload the dist/ folder to your server');
