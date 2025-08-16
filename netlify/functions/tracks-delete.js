const { MongoClient, ObjectId } = require('mongodb');

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
  console.log('=== DELETE TRACK FUNCTION ===');
  console.log('Method:', event.httpMethod);
  console.log('Path:', event.path);
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

  if (event.httpMethod !== 'DELETE') {
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

    // Extract track ID from path
    const pathParts = event.path.split('/');
    const trackId = pathParts[pathParts.length - 1];
    
    console.log('Deleting track ID:', trackId);

    if (!trackId || !ObjectId.isValid(trackId)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid track ID' })
      };
    }

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

    console.log('User verified:', user.username);

    // Find and verify track ownership
    const track = await tracksCollection.findOne({ 
      _id: new ObjectId(trackId),
      userId: user._id // Ensure user owns this track
    });

    if (!track) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Track not found or not owned by user' })
      };
    }

    console.log('Found track to delete:', track.title);

    // Delete track
    const deleteResult = await tracksCollection.deleteOne({ 
      _id: new ObjectId(trackId),
      userId: user._id 
    });

    if (deleteResult.deletedCount === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Track not found' })
      };
    }

    // Update user's track count
    await usersCollection.updateOne(
      { _id: user._id },
      { $inc: { trackCount: -1 } }
    );

    console.log('Track deleted successfully:', trackId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Track deleted successfully',
        deletedTrackId: trackId,
        deletedTrackTitle: track.title,
        database: DATABASE_NAME,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('=== DELETE TRACK ERROR ===');
    console.error('Error:', error.message);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to delete track',
        message: error.message,
        database: DATABASE_NAME,
        timestamp: new Date().toISOString()
      })
    };
  } finally {
    console.log('Delete track function completed');
  }
};