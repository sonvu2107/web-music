// netlify/functions/server.js - Main API handler 
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// MongoDB connection with caching
let isConnected = false;
let cachedDb = null;

const connectToDatabase = async () => {
  if (isConnected && cachedDb) {
    return cachedDb;
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
    cachedDb = mongoose.connection;
    console.log('📊 MongoDB connected successfully');
    return cachedDb;
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
  avatar: { type: String },
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
  audioData: { type: String, required: true }, // base64 audio
  duration: { type: Number },
  isPublic: { type: Boolean, default: false },
  playCount: { type: Number, default: 0 },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Models
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Track = mongoose.models.Track || mongoose.model('Track', trackSchema);

// JWT verification middleware
const authenticateToken = (token) => {
  if (!token) {
    throw new Error('No token provided');
  }
  
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }
  
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Route handlers
const handlers = {
  // Health check
  'GET /health': async () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'FlowPlay API Server',
    database: isConnected ? 'connected' : 'disconnected'
  }),

  // Auth routes
  'POST /auth/register': async (event) => {
    const { username, email, password, displayName } = JSON.parse(event.body);
    
    if (!username || !email || !password) {
      throw new Error('Username, email và password là bắt buộc');
    }

    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      throw new Error('Email hoặc username đã được sử dụng');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = new User({
      username,
      email,
      password: hashedPassword,
      displayName: displayName || username
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      message: 'Đăng ký thành công!',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName
      }
    };
  },

  'POST /auth/login': async (event) => {
    const { username, password } = JSON.parse(event.body);
    
    if (!username || !password) {
      throw new Error('Username và password là bắt buộc');
    }

    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    });

    if (!user) {
      throw new Error('Tài khoản không tồn tại');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Mật khẩu không đúng');
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
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
    };
  },

  // User routes
  'GET /user/profile': async (event) => {
    const token = event.headers.authorization?.replace('Bearer ', '');
    const decoded = authenticateToken(token);
    
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      throw new Error('User not found');
    }

    return { user };
  },

  'PUT /user/profile': async (event) => {
    const token = event.headers.authorization?.replace('Bearer ', '');
    const decoded = authenticateToken(token);
    const updates = JSON.parse(event.body);

    const user = await User.findByIdAndUpdate(
      decoded.userId, 
      updates, 
      { new: true }
    ).select('-password');

    return { user };
  },

  // Track routes
  'GET /tracks/my': async (event) => {
    const token = event.headers.authorization?.replace('Bearer ', '');
    const decoded = authenticateToken(token);
    
    const tracks = await Track.find({ userId: decoded.userId });
    return { tracks };
  },

  'GET /tracks/public': async () => {
    const tracks = await Track.find({ isPublic: true })
      .populate('userId', 'username displayName')
      .sort({ createdAt: -1 })
      .limit(50);
    return { tracks };
  }
};

// Main handler
exports.handler = async (event, context) => {
  try {
    // Set CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Content-Type': 'application/json'
    };

    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }

    // Connect to database
    await connectToDatabase();

    // Parse path - Netlify passes the splat portion
    const path = event.path || ('/' + (event.pathParameters?.proxy || ''));
    const method = event.httpMethod;
    const route = `${method} ${path}`;

    console.log(`🔍 API Request: ${route}`);

    // Find handler
    const handler = handlers[route];
    if (!handler) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: `Route not found: ${route}` })
      };
    }

    // Execute handler
    const result = await handler(event);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('❌ API Error:', error);
    
    return {
      statusCode: error.message.includes('không tồn tại') ? 400 : 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: error.message 
      })
    };
  }
};
