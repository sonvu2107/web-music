const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable not set');
    }
    
    const client = new MongoClient(process.env.MONGODB_URI, {
      useUnifiedTopology: true,
    });
    
    await client.connect();
    cachedDb = client.db('flowplay');
    console.log('MongoDB connected for upload-track');
    return cachedDb;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('Upload track function called');
    
    // Parse authorization
    const token = event.headers.authorization?.split(' ')[1];
    if (!token) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Cần đăng nhập để upload nhạc' })
      };
    }

    // Verify JWT
    const JWT_SECRET = process.env.JWT_SECRET || 'flowplay_secret_key_2025';
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log('JWT verified for user:', decoded.userId);
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Token không hợp lệ' })
      };
    }
    
    // Parse request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (parseError) {
      console.error('Body parsing failed:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid request body' })
      };
    }
    
    console.log('Request body parsed:', Object.keys(requestBody));
    
    // Connect to database
    const db = await connectToDatabase();
    
    // For now, return informative message about upload limitations
    // In production, you would implement file storage (Cloudinary, AWS S3, etc.)
    
    return {
      statusCode: 501,
      headers,
      body: JSON.stringify({ 
        error: 'Upload chưa được hỗ trợ',
        message: 'Tính năng upload nhạc đang được phát triển. Hiện tại bạn có thể nghe nhạc từ Discovery và tạo playlist.',
        suggestion: 'Hãy thử tính năng Discovery để tìm và nghe nhạc miễn phí!',
        debug: {
          userId: decoded.userId,
          bodyKeys: Object.keys(requestBody),
          timestamp: new Date().toISOString()
        }
      })
    };

  } catch (error) {
    console.error('Upload function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Lỗi server',
        message: 'Có lỗi xảy ra khi xử lý upload. Vui lòng thử lại sau.',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      })
    };
  }
};