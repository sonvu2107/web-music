const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = 'flowplay'; // ✅ Đổi từ 'test' thành 'flowplay'

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
  console.log('=== MY TRACKS FUNCTION ===');
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
    console.log('Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization token required' })
      };
    }

    const token = authHeader.split(' ')[1];
    console.log('Token extracted:', token.substring(0, 10) + '...');

    // Connect to database
    client = await connectToDatabase();
    const db = client.db(DATABASE_NAME);
    const usersCollection = db.collection('users');
    const tracksCollection = db.collection('tracks');

    // Verify user token
    console.log('Verifying user token...');
    const user = await usersCollection.findOne({ token });
    
    if (!user) {
      console.log('User not found with token');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    console.log('User verified:', user.username);

    // Parse query parameters
    const params = event.queryStringParameters || {};
    const page = parseInt(params.page || '1');
    const limit = parseInt(params.limit || '20');
    const skip = (page - 1) * limit;

    console.log('Getting tracks for user:', user.username, 'Page:', page);

    // Get user's tracks
    const tracks = await tracksCollection
      .find({ userId: user._id })
      .sort({ uploadDate: -1 })
      .skip(skip)
      .limit(limit)
      .project({
        audioData: 0 // Exclude heavy field
      })
      .toArray();

    const total = await tracksCollection.countDocuments({ userId: user._id });

    console.log(`Found ${tracks.length} tracks for user (${total} total)`);

    // Format tracks for response
    const formattedTracks = tracks.map(track => ({
      id: track._id,
      title: track.title,
      artist: track.artist,
      album: track.album || '',
      duration: track.duration || 0,
      genre: track.genre || '',
      fileName: track.fileName || '',
      fileSize: track.fileSize || 0,
      mimeType: track.mimeType || 'audio/mpeg',
      isPublic: track.isPublic || false,
      status: track.status || 'uploaded',
      playCount: track.playCount || 0,
      likeCount: track.likeCount || 0,
      uploadDate: track.uploadDate,
      // Format dates for display
      uploadedAt: track.uploadDate ? 
        new Date(track.uploadDate).toLocaleString('vi-VN') : '',
      // Add duration format (seconds to mm:ss)
      durationFormatted: track.duration ? 
        `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}` : 
        '0:00'
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tracks: formattedTracks,
        user: {
          id: user._id,
          username: user.username,
          displayName: user.displayName || user.username
        },
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalTracks: total,
          limit: limit,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        },
        database: DATABASE_NAME,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('=== MY TRACKS ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch user tracks',
        message: error.message,
        database: DATABASE_NAME,
        timestamp: new Date().toISOString()
      })
    };
  } finally {
    // Keep connection cached for performance
    console.log('My tracks function completed');
  }
};