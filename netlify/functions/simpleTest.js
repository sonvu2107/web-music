// netlify/functions/simpleTest.js - Simple MongoDB connection test
const { MongoClient } = require('mongodb');

exports.handler = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      throw new Error("MONGODB_URI environment variable is missing");
    }

    console.log('Testing MongoDB connection...');
    
    const client = new MongoClient(uri, { 
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    
    await client.connect();
    console.log('Connected successfully');
    
    const db = client.db();
    const collections = await db.listCollections().toArray();
    
    await client.close();
    console.log('Connection closed');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: "✅ Kết nối MongoDB thành công!",
        database: db.databaseName,
        collections: collections.map(c => c.name),
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error) {
    console.error('MongoDB connection error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        message: "❌ Kết nối MongoDB thất bại!",
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
