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
  console.log('=== AUTH REGISTER FUNCTION ===');
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
    const { username, email, password, displayName } = requestBody;
    
    console.log('Registration attempt:', { username, email, displayName });

    // Input validation
    if (!username || !email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Username, email và password là bắt buộc' })
      };
    }

    if (password.length < 6) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Mật khẩu phải có ít nhất 6 ký tự' })
      };
    }

    // Email validation (basic)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email không hợp lệ' })
      };
    }

    // Connect to database
    client = await connectToDatabase();
    const db = client.db(DATABASE_NAME);
    const usersCollection = db.collection('users');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({
      $or: [
        { username: username.toLowerCase().trim() },
        { email: email.toLowerCase().trim() }
      ]
    });

    if (existingUser) {
      const field = existingUser.username === username.toLowerCase().trim() ? 'Tên đăng nhập' : 'Email';
      console.log(`${field} already exists:`, existingUser.username || existingUser.email);
      
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `${field} đã được sử dụng` })
      };
    }

    // Hash password with stronger salt rounds
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user object
    const newUser = {
      _id: new ObjectId(),
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      displayName: displayName ? displayName.trim() : username,
      avatar: '',
      createdAt: new Date(),
      lastLogin: new Date(),
      trackCount: 0,
      isActive: true,
      preferences: {
        theme: 'dark',
        volume: 0.8,
        repeat: 'none',
        shuffle: false,
        notifications: true,
        publicProfile: true
      },
      stats: {
        tracksUploaded: 0,
        totalPlays: 0,
        totalLikes: 0
      }
    };

    // Insert user into database
    console.log('Creating user in database...');
    const insertResult = await usersCollection.insertOne(newUser);
    
    if (!insertResult.insertedId) {
      throw new Error('Failed to create user in database');
    }

    console.log('User created successfully with ID:', insertResult.insertedId);

    // Generate authentication token
    const token = `token_${newUser._id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Update user with token
    await usersCollection.updateOne(
      { _id: newUser._id },
      { $set: { token: token, tokenCreatedAt: new Date() } }
    );

    console.log('Token generated and saved for user:', newUser.username);

    // Return success response
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Đăng ký thành công! Chào mừng bạn đến với FlowPlay!',
        token: token,
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          displayName: newUser.displayName,
          avatar: newUser.avatar,
          preferences: newUser.preferences,
          createdAt: newUser.createdAt
        },
        database: DATABASE_NAME,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('=== REGISTER ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    // Handle specific MongoDB errors
    let errorMessage = 'Lỗi server khi đăng ký';
    
    if (error.code === 11000) {
      errorMessage = 'Username hoặc email đã tồn tại';
    } else if (error.name === 'MongoNetworkError') {
      errorMessage = 'Lỗi kết nối database';
    } else if (error.message.includes('MONGODB_URI')) {
      errorMessage = 'Cấu hình database không đúng';
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: errorMessage,
        message: error.message,
        database: DATABASE_NAME,
        timestamp: new Date().toISOString()
      })
    };
  } finally {
    // Keep connection cached for better performance
    console.log('Register function completed');
  }
};