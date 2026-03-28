/**
 * Smart Glasses Web Dashboard - Backend Server
 * Express.js server with JWT auth, media management, and REST API
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'smartglasses-secret-2024';

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve uploaded media
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── In-Memory Database (replace with MongoDB for production) ────────────────
let users = [];
let mediaItems = [];
let shareLinks = {};

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ─── Multer Storage Config ───────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || (file.mimetype.includes('video') ? '.webm' : '.jpg');
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// ─── Auth Middleware ─────────────────────────────────────────────────────────
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ─── Auth Routes ─────────────────────────────────────────────────────────────
app.post('/api/auth/signup', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'All fields required' });
  if (users.find(u => u.email === email))
    return res.status(409).json({ error: 'Email already registered' });

  const hashed = await bcrypt.hash(password, 10);
  const user = { id: uuidv4(), username, email, password: hashed, createdAt: new Date() };
  users.push(user);

  const token = jwt.sign({ id: user.id, username, email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username, email } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, username: user.username, email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, email } });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, username: user.username, email: user.email });
});

// ─── Media Routes ─────────────────────────────────────────────────────────────
// Upload media (photo or video as base64)
app.post('/api/media/upload', authenticate, (req, res) => {
  const { dataUrl, type, tags, location, filename } = req.body;
  if (!dataUrl) return res.status(400).json({ error: 'No data provided' });

  const ext = type === 'video' ? '.webm' : '.jpg';
  const fileId = uuidv4();
  const fname = `${fileId}${ext}`;
  const fpath = path.join(uploadsDir, fname);

  // Strip data URL prefix and save
  const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
  fs.writeFileSync(fpath, Buffer.from(base64, 'base64'));

  const item = {
    id: fileId,
    userId: req.user.id,
    filename: fname,
    originalName: filename || fname,
    type, // 'photo' | 'video'
    url: `/uploads/${fname}`,
    tags: tags || [],
    location: location || '',
    createdAt: new Date(),
    size: fs.statSync(fpath).size
  };
  mediaItems.push(item);
  res.json(item);
});

// Get all media for user
app.get('/api/media', authenticate, (req, res) => {
  const { tag, location, type, search } = req.query;
  let items = mediaItems.filter(m => m.userId === req.user.id);

  if (tag) items = items.filter(m => m.tags.includes(tag));
  if (location) items = items.filter(m => m.location.toLowerCase().includes(location.toLowerCase()));
  if (type) items = items.filter(m => m.type === type);
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(m =>
      m.tags.some(t => t.toLowerCase().includes(q)) ||
      m.location.toLowerCase().includes(q)
    );
  }
  res.json(items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

// Update media tags / location
app.patch('/api/media/:id', authenticate, (req, res) => {
  const item = mediaItems.find(m => m.id === req.params.id && m.userId === req.user.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  if (req.body.tags !== undefined) item.tags = req.body.tags;
  if (req.body.location !== undefined) item.location = req.body.location;
  res.json(item);
});

// Delete media
app.delete('/api/media/:id', authenticate, (req, res) => {
  const idx = mediaItems.findIndex(m => m.id === req.params.id && m.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const [item] = mediaItems.splice(idx, 1);
  const fpath = path.join(uploadsDir, item.filename);
  if (fs.existsSync(fpath)) fs.unlinkSync(fpath);
  res.json({ success: true });
});

// Generate share link
app.post('/api/media/:id/share', authenticate, (req, res) => {
  const item = mediaItems.find(m => m.id === req.params.id && m.userId === req.user.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  const shareId = uuidv4().slice(0, 8);
  shareLinks[shareId] = item.id;
  res.json({ shareUrl: `/share/${shareId}`, shareId });
});

// Access shared media
app.get('/api/share/:shareId', (req, res) => {
  const mediaId = shareLinks[req.params.shareId];
  if (!mediaId) return res.status(404).json({ error: 'Share link not found or expired' });
  const item = mediaItems.find(m => m.id === mediaId);
  if (!item) return res.status(404).json({ error: 'Media not found' });
  res.json(item);
});

// ─── Stats / Dashboard ───────────────────────────────────────────────────────
app.get('/api/stats', authenticate, (req, res) => {
  const userMedia = mediaItems.filter(m => m.userId === req.user.id);
  const photos = userMedia.filter(m => m.type === 'photo');
  const videos = userMedia.filter(m => m.type === 'video');

  // Group by day for daily usage (last 7 days)
  const daily = {};
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    daily[key] = { photos: 0, videos: 0 };
  }
  userMedia.forEach(m => {
    const key = new Date(m.createdAt).toISOString().slice(0, 10);
    if (daily[key]) {
      if (m.type === 'photo') daily[key].photos++;
      else daily[key].videos++;
    }
  });

  // All tags
  const tagCount = {};
  userMedia.forEach(m => m.tags.forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; }));

  res.json({
    total: userMedia.length,
    photos: photos.length,
    videos: videos.length,
    totalSize: userMedia.reduce((s, m) => s + (m.size || 0), 0),
    daily,
    topTags: Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 8)
  });
});

// ─── Catch-all: serve frontend ────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🕶️  Smart Glasses Dashboard running at http://localhost:${PORT}\n`);
});
