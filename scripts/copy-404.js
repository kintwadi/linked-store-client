const fs = require('fs');
const path = require('path');

const browserDir = path.join(__dirname, '..', 'dist', 'linked-store-frontend', 'browser');
const indexHtml = path.join(browserDir, 'index.html');
const notFoundHtml = path.join(browserDir, '404.html');

if (fs.existsSync(indexHtml)) {
  fs.copyFileSync(indexHtml, notFoundHtml);
  console.log('[copy-404] copied index.html -> 404.html');
} else {
  console.error('[copy-404] index.html not found at', indexHtml);
  process.exit(1);
}
