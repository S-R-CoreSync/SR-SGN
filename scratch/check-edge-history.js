const fs = require('fs');
const path = require('path');
const os = require('os');

const edgeHistory = path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Edge', 'User Data', 'Default', 'History');
const tempPath = path.join(os.tmpdir(), 'EdgeHistory_temp.db');

try {
  fs.copyFileSync(edgeHistory, tempPath);
  console.log('Copied successfully, size:', fs.statSync(tempPath).size);
} catch (e) {
  console.error('Copy failed:', e.message);
}
