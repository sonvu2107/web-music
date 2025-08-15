// netlify/functions/api-health.js - Dedicated health endpoint
const { MongoClient } = require('mongodb');

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

    // Check environment variables
    const mongoUri = process.env.MONGODB_URI;
    const jwtSecret = process.env.JWT_SECRET;
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'FlowPlay API',
      version: '3.0.0',
      database: null,
      environment: {
        mongodb: mongoUri ? '✅ configured' : '❌ missing',
        jwt: jwtSecret ? '✅ configured' : '❌ missing',
        nodeVersion: process.version
      }
    };

    // Test MongoDB connection if configured
    if (mongoUri) {
      try {
        const client = new MongoClient(mongoUri);
        const startTime = Date.now();
        
        await client.connect();
        const db = client.db();
        await db.admin().ping();
        await client.close();
        
        health.database = {
          status: '✅ connected',
          responseTime: `${Date.now() - startTime}ms`
        };
      } catch (dbError) {
        health.database = {
          status: '❌ connection failed',
          error: dbError.message
        };
        health.status = 'degraded';
      }
    }

    // Return health status
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(health, null, 2)
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      }, null, 2)
    };
  }
};
