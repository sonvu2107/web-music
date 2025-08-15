// netlify/functions/server.js - Netlify Function wrapper
const serverless = require('serverless-http');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// MongoDB connection with error handling
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
  displayName: { type: String },
  avatar: { type: String }, // base64 encoded image
  preferences: {
    theme: { type: String, default: 'dark' },
    volume: { type: Number, default: 0.8 },
    shuffle: { type: Boolean, default: false }
  }
}, { timestamps: true });

// Track Schema  
const trackSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: String, required: true },
  album: { type: String },
  genre: { type: String },
  duration: { type: Number },
  filePath: { type: String }, // For Netlify, this might be a cloud URL
  isPublic: { type: Boolean, default: false },
  playCount: { type: Number, default: 0 },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Track = mongoose.model('Track', trackSchema);

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1] || req.query.token;

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Health check with database connection
app.get('/health', async (req, res) => {
  try {
    await connectToDatabase();
    res.json({ 
      status: 'OK', 
      message: 'FlowPlay API is running on Netlify!',
      database: isConnected ? 'Connected' : 'Disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'Error', 
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Auth Routes
app.post('/auth/register', async (req, res) => {
  try {
    await connectToDatabase();
    
    const { username, email, password, displayName } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        error: existingUser.email === email ? 'Email đã được sử dụng' : 'Username đã được sử dụng' 
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

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
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    await connectToDatabase();
    
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Find user
    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    });

    if (!user) {
      return res.status(400).json({ error: 'Tài khoản không tồn tại' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Mật khẩu không đúng' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
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
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// User Routes
app.get('/user/profile', authenticateToken, async (req, res) => {
  try {
    await connectToDatabase();
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

app.put('/user/profile', authenticateToken, async (req, res) => {
  try {
    await connectToDatabase();
    const updates = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Track Routes
app.get('/tracks/my', authenticateToken, async (req, res) => {
  try {
    await connectToDatabase();
    const tracks = await Track.find({ uploadedBy: req.user.userId }).sort({ createdAt: -1 });
    res.json({ tracks });
  } catch (error) {
    console.error('Get my tracks error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

app.get('/tracks/public', async (req, res) => {
  try {
    await connectToDatabase();
    const { search, genre, limit = 20 } = req.query;
    
    const query = { isPublic: true };
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { artist: { $regex: search, $options: 'i' } },
        { album: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (genre) {
      query.genre = genre;
    }
    
    const tracks = await Track.find(query)
      .populate('uploadedBy', 'username displayName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
      
    res.json({ tracks });
  } catch (error) {
    console.error('Get public tracks error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Export handler for Netlify
module.exports.handler = serverless(app);
