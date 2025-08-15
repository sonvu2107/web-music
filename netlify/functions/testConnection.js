// netlify/functions/testConnection.js - Test MongoDB connection with detailed logging
const { MongoClient } = require('mongodb');

exports.handler = async (event, context) => {
  const startTime = Date.now();
  const logs = [];
  
  try {
    logs.push(`🚀 Starting MongoDB connection test at ${new Date().toISOString()}`);
    
    // Check environment variables
    const uri = process.env.MONGODB_URI;
    const jwtSecret = process.env.JWT_SECRET;
    
    logs.push(`📋 Environment check:`);
    logs.push(`   - MONGODB_URI: ${uri ? '✅ Set' : '❌ Missing'}`);
    logs.push(`   - JWT_SECRET: ${jwtSecret ? '✅ Set' : '❌ Missing'}`);
    
    if (!uri) {
      throw new Error("MONGODB_URI environment variable is required");
    }
    
    // Parse connection string for debugging
    logs.push(`🔍 Connection string analysis:`);
    try {
      const urlParts = new URL(uri);
      logs.push(`   - Protocol: ${urlParts.protocol}`);
      logs.push(`   - Host: ${urlParts.hostname}`);
      logs.push(`   - Database: ${urlParts.pathname.substring(1) || 'default'}`);
      logs.push(`   - Username: ${urlParts.username || 'not specified'}`);
      logs.push(`   - Password: ${urlParts.password ? '✅ Set' : '❌ Missing'}`);
    } catch (parseError) {
      logs.push(`   - ❌ Invalid URI format: ${parseError.message}`);
    }
    
    // Test connection with timeout
    logs.push(`🔌 Attempting MongoDB connection...`);
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      maxPoolSize: 1, // Minimize connections for test
      retryWrites: true,
      w: 'majority'
    });
    
    const connectStart = Date.now();
    await client.connect();
    const connectTime = Date.now() - connectStart;
    logs.push(`✅ Connected to MongoDB in ${connectTime}ms`);
    
    // Test database access
    logs.push(`📊 Testing database access...`);
    const db = client.db(); // Use default database from connection string
    const dbName = db.databaseName;
    logs.push(`   - Database name: ${dbName}`);
    
    // List collections
    const collectionsStart = Date.now();
    const collections = await db.listCollections().toArray();
    const collectionsTime = Date.now() - collectionsStart;
    logs.push(`📁 Found ${collections.length} collections in ${collectionsTime}ms:`);
    
    if (collections.length > 0) {
      collections.forEach(collection => {
        logs.push(`   - ${collection.name} (type: ${collection.type || 'collection'})`);
      });
    } else {
      logs.push(`   - No collections found (this is normal for new databases)`);
    }
    
    // Test a simple operation
    logs.push(`🧪 Testing basic database operations...`);
    const testCollection = db.collection('connection_test');
    
    // Insert test document
    const insertResult = await testCollection.insertOne({
      test: true,
      timestamp: new Date(),
      netlifyTest: 'FlowPlay connection test'
    });
    logs.push(`   - Insert test: ✅ Document ID ${insertResult.insertedId}`);
    
    // Find test document
    const findResult = await testCollection.findOne({ test: true });
    logs.push(`   - Find test: ${findResult ? '✅ Found' : '❌ Not found'}`);
    
    // Clean up test document
    await testCollection.deleteOne({ _id: insertResult.insertedId });
    logs.push(`   - Cleanup: ✅ Test document removed`);
    
    // Close connection
    await client.close();
    const totalTime = Date.now() - startTime;
    logs.push(`🔐 Connection closed. Total test time: ${totalTime}ms`);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: "✅ MongoDB connection test passed!",
        database: dbName,
        collections: collections.map(c => c.name),
        logs: logs,
        performance: {
          totalTime: `${totalTime}ms`,
          connectionTime: `${connectTime}ms`,
          collectionsTime: `${collectionsTime}ms`
        },
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      }, null, 2)
    };
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    logs.push(`❌ Error after ${totalTime}ms: ${error.message}`);
    
    // Detailed error analysis
    logs.push(`🔍 Error analysis:`);
    if (error.message.includes('ENOTFOUND')) {
      logs.push(`   - DNS resolution failed - check hostname in connection string`);
    } else if (error.message.includes('authentication failed')) {
      logs.push(`   - Authentication failed - check username/password`);
    } else if (error.message.includes('IP not in whitelist')) {
      logs.push(`   - IP whitelist issue - add 0.0.0.0/0 to MongoDB Atlas Network Access`);
    } else if (error.message.includes('timeout')) {
      logs.push(`   - Connection timeout - check MongoDB Atlas status`);
    } else if (error.message.includes('MONGODB_URI')) {
      logs.push(`   - Environment variable missing - check Netlify site settings`);
    }
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        message: "❌ MongoDB connection test failed!",
        error: error.message,
        errorType: error.constructor.name,
        logs: logs,
        troubleshooting: {
          "Check environment variables": "Verify MONGODB_URI is set in Netlify",
          "Check MongoDB Atlas": "Verify cluster is running and accessible",
          "Check network access": "Add 0.0.0.0/0 to IP whitelist",
          "Check credentials": "Verify username/password in connection string",
          "Check database": "Verify database exists and user has permissions"
        }
      }, null, 2)
    };
  }
};
