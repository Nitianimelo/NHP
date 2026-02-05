const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const PORT = process.env.PORT || 3456;
const PAGES_DIR = path.join(__dirname, 'pages');

// Ensure pages directory exists
if (!fs.existsSync(PAGES_DIR)) {
  fs.mkdirSync(PAGES_DIR, { recursive: true });
}

// === Express Setup ===
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// === HTTP Server + WebSocket ===
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[WS] Client connected (${clients.size} total)`);

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WS] Client disconnected (${clients.size} total)`);
  });
});

function broadcast(data) {
  const message = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
}

// === File Scanner ===
function scanPages() {
  const files = [];

  if (!fs.existsSync(PAGES_DIR)) return files;

  const entries = fs.readdirSync(PAGES_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (!['.html', '.htm', '.jsx', '.vue', '.svelte'].includes(ext)) continue;

    const filePath = path.join(PAGES_DIR, entry.name);
    const stats = fs.statSync(filePath);

    files.push({
      name: entry.name,
      path: `/pages/${entry.name}`,
      size: stats.size,
      modified: stats.mtime.toISOString(),
      type: ext.replace('.', ''),
    });
  }

  return files.sort((a, b) => a.name.localeCompare(b.name));
}

// === API Routes ===

// List all pages
app.get('/api/pages', (req, res) => {
  try {
    const pages = scanPages();
    res.json({ pages, total: pages.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get page content
app.get('/api/pages/:filename', (req, res) => {
  const filePath = path.join(PAGES_DIR, req.params.filename);

  // Prevent path traversal
  if (!filePath.startsWith(PAGES_DIR)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Page not found' });
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ filename: req.params.filename, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save/create page
app.post('/api/pages/:filename', (req, res) => {
  const { content } = req.body;
  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'Content must be a string' });
  }

  const filename = req.params.filename.replace(/[^a-zA-Z0-9._-]/g, '');
  const filePath = path.join(PAGES_DIR, filename);

  if (!filePath.startsWith(PAGES_DIR)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    res.json({ success: true, filename, size: Buffer.byteLength(content) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete page
app.delete('/api/pages/:filename', (req, res) => {
  const filePath = path.join(PAGES_DIR, req.params.filename);

  if (!filePath.startsWith(PAGES_DIR)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Page not found' });
  }

  try {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve pages with live-reload script injected
app.get('/preview/:filename', (req, res) => {
  const filePath = path.join(PAGES_DIR, req.params.filename);

  if (!filePath.startsWith(PAGES_DIR)) {
    return res.status(403).send('Forbidden');
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Page not found');
  }

  try {
    let content = fs.readFileSync(filePath, 'utf-8');

    // Inject live-reload script
    const liveReloadScript = `
<script>
(function() {
  const ws = new WebSocket('ws://' + location.host);
  ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.type === 'reload' && data.file === '${req.params.filename}') {
      location.reload();
    }
    if (data.type === 'reload-all') {
      location.reload();
    }
  };
  ws.onclose = function() {
    setTimeout(() => location.reload(), 2000);
  };
})();
</script>`;

    // Inject before </body> or at the end
    if (content.includes('</body>')) {
      content = content.replace('</body>', liveReloadScript + '\n</body>');
    } else {
      content += liveReloadScript;
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(content);
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

// Serve raw pages (no injection)
app.use('/pages', express.static(PAGES_DIR));

// Server status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    port: PORT,
    pages: scanPages().length,
    clients: clients.size,
    uptime: process.uptime(),
  });
});

// === File Watcher ===
const watcher = chokidar.watch(PAGES_DIR, {
  ignored: /(^|[\/\\])\../,
  persistent: true,
  ignoreInitial: true,
});

watcher.on('change', (filePath) => {
  const filename = path.basename(filePath);
  console.log(`[WATCH] File changed: ${filename}`);
  broadcast({ type: 'reload', file: filename, timestamp: Date.now() });
});

watcher.on('add', (filePath) => {
  const filename = path.basename(filePath);
  console.log(`[WATCH] File added: ${filename}`);
  broadcast({ type: 'page-added', file: filename, timestamp: Date.now() });
});

watcher.on('unlink', (filePath) => {
  const filename = path.basename(filePath);
  console.log(`[WATCH] File removed: ${filename}`);
  broadcast({ type: 'page-removed', file: filename, timestamp: Date.now() });
});

// === Start Server ===
server.listen(PORT, () => {
  const pages = scanPages();
  console.log('');
  console.log('  NHP Preview Server');
  console.log(`  http://localhost:${PORT}`);
  console.log(`  ${pages.length} page(s) found`);
  console.log(`  Watching: ${PAGES_DIR}`);
  console.log('');
});
