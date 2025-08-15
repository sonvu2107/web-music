// netlify/functions/tracks-public.js - Public tracks endpoint
const { MongoClient } = require('mongodb');

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
  console.log('=== TRACKS PUBLIC FUNCTION ===');
  console.log('Database:', DATABASE_NAME);

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let client;

  try {
    // Connect to database
    client = await connectToDatabase();
    const db = client.db(DATABASE_NAME);
    const tracksCollection = db.collection('tracks');

    // Parse query parameters
    const params = event.queryStringParameters || {};
    const page = parseInt(params.page || '1');
    const limit = parseInt(params.limit || '20');
    const skip = (page - 1) * limit;

    console.log('Query params:', { page, limit });

    // Get public tracks
    const tracks = await tracksCollection
      .find({ isPublic: true })
      .sort({ uploadDate: -1 })
      .skip(skip)
      .limit(limit)
      .project({
        audioData: 0 // Exclude heavy field
      })
      .toArray();

    const total = await tracksCollection.countDocuments({ isPublic: true });

    console.log(`Found ${tracks.length} public tracks (${total} total)`);

    // Format response
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
      isPublic: track.isPublic,
      playCount: track.playCount || 0,
      uploadDate: track.uploadDate,
      userId: track.userId
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tracks: formattedTracks,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalTracks: total,
          limit: limit
        },
        database: DATABASE_NAME,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('=== TRACKS PUBLIC ERROR ===');
    console.error('Error:', error.message);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch public tracks',
        message: error.message,
        database: DATABASE_NAME
      })
    };
  } finally {
    console.log('Tracks public function completed');
  }
};
