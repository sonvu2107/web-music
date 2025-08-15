// netlify/functions/server.js - Express server cho Netlify
require('dotenv').config(); // Load environment variables

const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const serverless = require('serverless-http');

const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// MongoDB connection với lazy loading cho Netlify
let isConnected = false;

const connectToDatabase = async () => {
  if (isConnected) {
    return;
  }

  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    isConnected = true;
    console.log('📊 MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
};

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
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
  audioData: { type: String, required: true }, // base64 cho Netlify
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

// Playlist Schema
const playlistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tracks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Track' }],
  isPublic: { type: Boolean, default: false },
  thumbnail: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Playlist = mongoose.models.Playlist || mongoose.model('Playlist', playlistSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'flowplay_secret_key_2025';

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  
  // If no token in header, check query parameter (for streaming)
  if (!token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Database middleware - connect before each request
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    service: 'FlowPlay Express API'
  });
});

// Auth Routes
app.post('/auth/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      displayName: displayName || username
    });

    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ $or: [{ username }, { email: username }] });
    if (!user) {
      return res.status(400).json({ error: 'Tài khoản không tồn tại' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Mật khẩu không đúng' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Đăng nhập thành công!',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Track Routes
app.get('/tracks/my-tracks', authenticateToken, async (req, res) => {
  try {
    const tracks = await Track.find({ uploadedBy: req.user.userId })
      .sort({ createdAt: -1 });

    res.json({ tracks });
  } catch (error) {
    console.error('Get tracks error:', error);
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
});

// Public tracks endpoint
app.get('/tracks/public', async (req, res) => {
  try {
    const { page = 1, limit = 20, genre, search } = req.query;
    
    let query = { isPublic: true };
    
    if (genre) {
      query.genre = { $regex: genre, $options: 'i' };
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { artist: { $regex: search, $options: 'i' } }
      ];
    }

    const tracks = await Track.find(query)
      .populate('uploadedBy', 'username displayName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Track.countDocuments(query);

    res.json({
      tracks,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get public tracks error:', error);
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
});

// User Routes
app.get('/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.put('/user/profile', authenticateToken, async (req, res) => {
  try {
    const { displayName, preferences } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (displayName) user.displayName = displayName;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };
    user.updatedAt = new Date();

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Export handler for Netlify
module.exports.handler = serverless(app);
