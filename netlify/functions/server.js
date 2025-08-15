// netlify/functions/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const serverless = require('serverless-http');

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// MongoDB connection (lazy load for Netlify)
let isConnected = false;
const connectToDatabase = async () => {
  if (isConnected) return;
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is not set');
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    isConnected = true;
    console.log('📊 MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    throw err;
  }
};

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  displayName: { type: String, default: '' },
  avatar: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now },
  preferences: {
    theme: { type: String, default: 'dark' },
    volume: { type: Number, default: 0.8 },
    repeat: { type: String, default: 'none' },
    shuffle: { type: Boolean, default: false }
  }
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

// Track Schema
const trackSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: String, required: true },
  album: { type: String, default: '' },
  duration: { type: Number, required: true },
  genre: { type: String, default: '' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileName: { type: String, required: true },
  audioData: { type: String, required: true }, // base64
  fileSize: { type: Number, required: true },
  mimeType: { type: String, required: true },
  thumbnail: { type: String, default: '' },
  sourceType: { type: String, enum: ['upload', 'url', 'youtube', 'freemium'], default: 'upload' },
  isPublic: { type: Boolean, default: false },
  playCount: { type: Number, default: 0 },
  likeCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const Track = mongoose.models.Track || mongoose.model('Track', trackSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'flowplay_secret_key_2025';

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  if (!token) token = req.query.token;
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Ensure DB connected for each request
app.use(async (req, res, next) => {
  try {
    if (!isConnected) await connectToDatabase();
    next();
  } catch (err) {
    console.error('Database connection failed:', err);
    next();
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'FlowPlay API Server', timestamp: new Date().toISOString(), status: 'running' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    service: 'FlowPlay Express API'
  });
});

// Auth routes
app.post('/auth/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) return res.status(400).json({ error: 'Username or email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword, displayName: displayName || username });
    await user.save();

    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'User created successfully', token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ $or: [{ username }, { email: username }] });
    if (!user) return res.status(400).json({ error: 'Tài khoản không tồn tại' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Mật khẩu không đúng' });

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Đăng nhập thành công!', token, user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Track routes
app.get('/tracks/my-tracks', authenticateToken, async (req, res) => {
  try {
    const tracks = await Track.find({ uploadedBy: req.user.userId }).sort({ createdAt: -1 });
    res.json({ tracks });
  } catch (err) {
    console.error('Get my tracks error:', err);
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
});

app.get('/tracks/public', async (req, res) => {
  try {
    const { page = 1, limit = 20, genre, search } = req.query;
    let query = { isPublic: true };
    if (genre) query.genre = { $regex: genre, $options: 'i' };
    if (search) {
      query.$or = [{ title: { $regex: search, $options: 'i' } }, { artist: { $regex: search, $options: 'i' } }];
    }
    const tracks = await Track.find(query)
      .populate('uploadedBy', 'username displayName')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((page - 1) * limit);

    const total = await Track.countDocuments(query);
    res.json({ tracks, pagination: { current: page, pages: Math.ceil(total / limit), total } });
  } catch (err) {
    console.error('Get public tracks error:', err);
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
});

// Upload route
app.post('/tracks/upload', authenticateToken, async (req, res) => {
  try {
    const { title, artist, album, duration, genre, audioData, fileName, fileSize, mimeType, thumbnail, isPublic } = req.body;
    if (!title || !artist || !audioData) {
      return res.status(400).json({ error: 'Thiếu thông tin hoặc file nhạc' });
    }

    const track = new Track({
      title,
      artist,
      album: album || '',
      duration: duration || 0,
      genre: genre || '',
      uploadedBy: req.user.userId,
      fileName: fileName || 'unknown',
      fileSize: fileSize || 0,
      mimeType: mimeType || 'audio/mpeg',
      audioData,
      thumbnail: thumbnail || '',
      isPublic: isPublic || false,
      sourceType: 'upload',
    });

    await track.save();
    res.status(201).json({ message: 'Upload thành công!', track });
  } catch (err) {
    console.error('Upload track error:', err);
    res.status(500).json({ error: 'Lỗi server', details: err.message });
  }
});

// User routes
app.get('/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.put('/user/profile', authenticateToken, async (req, res) => {
  try {
    const { displayName, preferences } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (displayName) user.displayName = displayName;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };
    await user.save();

    res.json({ message: 'Profile updated successfully', user });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path, method: req.method });
});

module.exports.handler = serverless(app);
