// netlify/functions/auth-login.js - Dedicated login function
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = 'test';

let isConnected = false;
let cachedClient = null;

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

exports.handler = async (event, context) => {
  console.log('=== AUTH LOGIN FUNCTION ===');
  console.log('Database:', DATABASE_NAME);
  console.log('Method:', event.httpMethod);
  
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

  let client;

  try {
    // Parse request body
    const requestBody = JSON.parse(event.body);
    const { username, password } = requestBody;
    
    console.log('Login attempt for:', username);

    if (!username || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Username và password là bắt buộc' })
      };
    }

    // Connect to database
    client = await connectToDatabase();
    const db = client.db(DATABASE_NAME);
    const usersCollection = db.collection('users');

    // Find user by username or email
    const user = await usersCollection.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: username.toLowerCase() }
      ]
    });

    if (!user) {
      console.log('User not found:', username);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Tài khoản không tồn tại' })
      };
    }

    console.log('User found:', user.username);

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch for user:', username);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Mật khẩu không đúng' })
      };
    }

    // Generate simple token
    const token = `token_${user._id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Update user with token and lastLogin
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          token: token,
          lastLogin: new Date(),
          tokenCreatedAt: new Date()
        }
      }
    );

    console.log('Login successful for:', user.username);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Đăng nhập thành công!',
        token: token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          displayName: user.displayName || user.username,
          avatar: user.avatar || '',
          preferences: user.preferences || {
            theme: 'dark',
            volume: 0.8,
            repeat: 'none',
            shuffle: false
          }
        },
        database: DATABASE_NAME,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('=== LOGIN ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Server error',
        message: error.message,
        database: DATABASE_NAME,
        timestamp: new Date().toISOString()
      })
    };
  } finally {
    console.log('Login function completed');
  }
};
