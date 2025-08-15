// netlify/functions/auth-login.js - Dedicated login function
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// MongoDB connection với lazy loading
let isConnected = false;
let cachedClient = null;

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = 'test'; // Thay đổi database name

const connectToDatabase = async () => {
  if (isConnected && cachedClient) {
    return cachedClient;
  }

  try {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    await client.db(DATABASE_NAME).admin().ping();
    
    cachedClient = client;
    isConnected = true;
    console.log(`📊 MongoDB connected to database: ${DATABASE_NAME}`);
    
    return client;
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

    // Only handle POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Connect to database
    const client = await connectToDatabase();
    const db = client.db(test); // Sử dụng database 'test'

    const { username, password } = JSON.parse(event.body);

    // Find user
    const user = await User.findOne({ $or: [{ username }, { email: username }] });
    if (!user) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Tài khoản không tồn tại' })
      };
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Mật khẩu không đúng' })
      };
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT
    const JWT_SECRET = process.env.JWT_SECRET || 'flowplay_secret_key_2025';
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
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
      })
    };

  } catch (error) {
    console.error('Login error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Server error' })
    };
  }
};
