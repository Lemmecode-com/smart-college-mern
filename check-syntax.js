const fs = require('fs');
const path = require('path');

try {
  const appPath = path.join(__dirname, 'frontend', 'src', 'App.jsx');
  const code = fs.readFileSync(appPath, 'utf8');

  // Basic syntax check - try to parse as JavaScript (will throw if invalid)
  new Function(code);

  console.log('App.jsx syntax: OK');
} catch (e) {
  console.error('Syntax Error:', e.message);
  console.error('Line:', e.lineNumber || 'unknown');
  process.exit(1);
}
