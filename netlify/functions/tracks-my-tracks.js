// netlify/functions/tracks-my-tracks.js - User's tracks endpoint
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// MongoDB connection với lazy loading
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

// Track Schema
const trackSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: String, required: true },
  album: { type: String, default: '' },
  duration: { type: Number, required: true },
  genre: { type: String, default: '' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileName: { type: String, required: true },
  audioData: { type: String, required: true },
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

// JWT verification
const authenticateToken = (token) => {
  if (!token) {
    throw new Error('No token provided');
  }
  
  const JWT_SECRET = process.env.JWT_SECRET || 'flowplay_secret_key_2025';
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
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

    // Only handle GET requests
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Check authorization
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const token = authHeader && authHeader.replace('Bearer ', '');
    
    if (!token) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Access token required' })
      };
    }

    // Verify token
    const decoded = authenticateToken(token);

    // Connect to database
    await connectToDatabase();

    // Get user's tracks
    const tracks = await Track.find({ uploadedBy: decoded.userId })
      .sort({ createdAt: -1 });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ tracks })
    };

  } catch (error) {
    console.error('Get my tracks error:', error);
    
    if (error.message.includes('token') || error.message.includes('Token')) {
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: error.message })
      };
    }

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Failed to fetch tracks' })
    };
  }
};
