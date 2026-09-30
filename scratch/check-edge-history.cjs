const fs = require('fs');
const path = require('path');
const os = require('os');
const Database = require('better-sqlite3');

const edgeHistory = path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Edge', 'User Data', 'Default', 'History');
const tempPath = path.join(os.tmpdir(), 'EdgeHistory_temp.db');

try {
  fs.copyFileSync(edgeHistory, tempPath);
  const db = new Database(tempPath, { readonly: true });
  const rows = db.prepare("SELECT url, title, last_visit_time FROM urls WHERE url LIKE '%vercel%' OR url LIKE '%sgn%' ORDER BY last_visit_time DESC LIMIT 30").all();
  console.log('Recent Vercel / SGN URLs in Edge:');
  for (const r of rows) {
    console.log('-', r.url, '|', r.title);
  }
} catch (e) {
  console.error('Error:', e.message);
}
