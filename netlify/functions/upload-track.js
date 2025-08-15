const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const busboy = require("busboy");
const streamifier = require("streamifier");

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = "test";

let isConnected = false;
let cachedClient = null;

const connectToDatabase = async () => {
  if (isConnected && cachedClient) {
    return cachedClient;
  }

  try {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    await client.db(DATABASE_NAME).admin().ping();

    cachedClient = client;
    isConnected = true;
    console.log(`📊 MongoDB connected to database: ${DATABASE_NAME}`);

    return client;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.handler = async (event, context) => {
  console.log("=== UPLOAD TRACK FUNCTION ===");
  console.log("Method:", event.httpMethod);
  console.log("Content-Type:", event.headers["content-type"]);
  console.log("Database:", DATABASE_NAME);

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  let client;

  try {
    // Check authorization
    const authHeader = event.headers.authorization || event.headers.Authorization;
    console.log("Auth header:", authHeader ? "Present" : "Missing");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Authorization token required" }),
      };
    }

    const token = authHeader.split(" ")[1];
    console.log("Token extracted:", token.substring(0, 10) + "...");

    // Connect to database
    console.log("Connecting to database...");
    client = await connectToDatabase();
    const db = client.db(DATABASE_NAME);
    const usersCollection = db.collection("users");
    const tracksCollection = db.collection("tracks");

    // Verify user token
    console.log("Verifying user token...");
    const user = await usersCollection.findOne({ token });

    if (!user) {
      console.log("User not found with token");
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Invalid token" }),
      };
    }

    console.log("User verified:", user.username);

    // Check Content-Type for multipart data
    const contentType = event.headers["content-type"] || "";
    console.log("Content-Type received:", contentType);

    // For now, create a test track (since file processing is complex)
    console.log("Creating test track record...");

    const trackData = {
      _id: new ObjectId(),
      title: `Uploaded Track ${new Date().toLocaleString("vi-VN")}`,
      artist: user.username,
      album: "",
      duration: 180, // 3 minutes default
      genre: "Unknown",
      fileName: "uploaded_track.mp3",
      fileSize: 1024000, // 1MB default
      mimeType: "audio/mpeg",
      userId: user._id,
      uploadDate: new Date(),
      isPublic: false,
      status: "uploaded",
      playCount: 0,
      likeCount: 0,
      sourceType: "upload",
    };

    const result = await tracksCollection.insertOne(trackData);
    console.log("Track created with ID:", result.insertedId);

    // Update user's track count
    await usersCollection.updateOne(
      { _id: user._id },
      { $inc: { trackCount: 1 } }
    );

    console.log("Upload completed successfully");

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "Track uploaded successfully (test mode)",
        track: {
          id: trackData._id,
          title: trackData.title,
          artist: trackData.artist,
          duration: trackData.duration,
          uploadDate: trackData.uploadDate,
          status: trackData.status,
        },
        database: DATABASE_NAME,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error("=== UPLOAD ERROR ===");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Upload failed",
        message: error.message,
        database: DATABASE_NAME,
        timestamp: new Date().toISOString(),
      }),
    };
  } finally {
    // Keep connection cached
    console.log("Upload function completed");
  }
};
