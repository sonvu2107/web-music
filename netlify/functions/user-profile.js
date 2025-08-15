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
  console.log('=== USER PROFILE FUNCTION ===');
  console.log('Database:', DATABASE_NAME);
  console.log('Method:', event.httpMethod);

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
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

    // Verify token and get user
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

    if (event.httpMethod === 'GET') {
      // Get user profile
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            displayName: user.displayName || user.username,
            avatar: user.avatar || '',
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
            trackCount: user.trackCount || 0,
            preferences: user.preferences || {
              theme: 'dark',
              volume: 0.8,
              repeat: 'none',
              shuffle: false
            }
          }
        })
      };

    } else if (event.httpMethod === 'PUT') {
      // Update user profile
      const requestBody = JSON.parse(event.body);
      const { displayName, preferences, avatar } = requestBody;
      
      console.log('Update request:', { displayName, preferences, avatar });

      const updateFields = {
        updatedAt: new Date()
      };

      if (displayName !== undefined) {
        updateFields.displayName = displayName.trim();
      }

      if (preferences !== undefined) {
        updateFields.preferences = {
          ...user.preferences,
          ...preferences
        };
      }

      if (avatar !== undefined) {
        updateFields.avatar = avatar;
      }

      // Update user in database
      const updateResult = await usersCollection.updateOne(
        { _id: user._id },
        { $set: updateFields }
      );

      if (updateResult.modifiedCount === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No changes made' })
        };
      }

      // Get updated user
      const updatedUser = await usersCollection.findOne({ _id: user._id });

      console.log('Profile updated successfully for:', user.username);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Profile updated successfully',
          user: {
            id: updatedUser._id,
            username: updatedUser.username,
            email: updatedUser.email,
            displayName: updatedUser.displayName,
            avatar: updatedUser.avatar,
            preferences: updatedUser.preferences,
            updatedAt: updatedUser.updatedAt
          }
        })
      };

    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

  } catch (error) {
    console.error('=== USER PROFILE ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process profile request',
        message: error.message,
        database: DATABASE_NAME,
        timestamp: new Date().toISOString()
      })
    };
  } finally {
    console.log('User profile function completed');
  }
};