// netlify/functions/tracks-my-tracks.js - User's tracks endpoint
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = 'test';

// MongoDB connection với lazy loading
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
  console.log('=== MY TRACKS FUNCTION ===');
  console.log('Database:', DATABASE_NAME);

  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only handle GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let client;

  try {
    // Check authorization
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization token required' })
      };
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = authenticateToken(token);

    // Connect to database
    client = await connectToDatabase();
    const db = client.db(DATABASE_NAME);
    const usersCollection = db.collection('users');
    const tracksCollection = db.collection('tracks');

    // Verify user
    const user = await usersCollection.findOne({ token });
    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    console.log('Getting tracks for user:', user.username);

    // Get user's tracks
    const tracks = await tracksCollection
      .find({ userId: user._id })
      .sort({ uploadDate: -1 })
      .toArray();

    const formattedTracks = tracks.map(track => ({
      id: track._id,
      title: track.title,
      artist: track.artist,
      album: track.album || '',
      duration: track.duration || 0,
      genre: track.genre || '',
      fileName: track.fileName || '',
      fileSize: track.fileSize || 0,
      isPublic: track.isPublic || false,
      playCount: track.playCount || 0,
      uploadDate: track.uploadDate,
      status: track.status || 'uploaded'
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tracks: formattedTracks,
        totalTracks: tracks.length,
        database: DATABASE_NAME,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('=== MY TRACKS ERROR ===');
    console.error('Error:', error.message);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch user tracks',
        message: error.message,
        database: DATABASE_NAME
      })
    };
  } finally {
    console.log('My tracks function completed');
  }
};
