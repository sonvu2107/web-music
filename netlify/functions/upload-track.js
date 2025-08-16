const { MongoClient, ObjectId } = require("mongodb");
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

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video", // For audio files
        folder: "flowplay/tracks",
        ...options,
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          reject(error);
        } else {
          console.log("Cloudinary upload success:", result.public_id);
          resolve(result);
        }
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

// Helper function to parse multipart form data
const parseMultipartData = (event) => {
  return new Promise((resolve, reject) => {
    const fields = {};
    const files = {};
    let fileBuffer = null;
    let fileName = "";
    let mimeType = "";

    const bb = busboy({
      headers: {
        "content-type": event.headers["content-type"] || event.headers["Content-Type"],
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
      },
    });

    bb.on("field", (fieldname, val) => {
      console.log(`Field [${fieldname}]: ${val}`);
      fields[fieldname] = val;
    });

    bb.on("file", (fieldname, file, info) => {
      console.log(`File [${fieldname}]: ${info.filename}, type: ${info.mimeType}`);
      fileName = info.filename;
      mimeType = info.mimeType;

      const chunks = [];
      file.on("data", (chunk) => {
        chunks.push(chunk);
      });

      file.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
        console.log(`File ${fileName} received: ${fileBuffer.length} bytes`);
      });
    });

    bb.on("finish", () => {
      console.log("Busboy finished parsing");
      resolve({
        fields,
        file: fileBuffer
          ? {
              buffer: fileBuffer,
              filename: fileName,
              mimeType: mimeType,
            }
          : null,
      });
    });

    bb.on("error", (err) => {
      console.error("Busboy error:", err);
      reject(err);
    });

    // Convert base64 body to buffer if needed
    const body = event.isBase64Encoded
      ? Buffer.from(event.body, "base64")
      : Buffer.from(event.body);

    bb.write(body);
    bb.end();
  });
};

exports.handler = async (event, context) => {
  console.log("=== UPLOAD TRACK FUNCTION ===");
  console.log("Method:", event.httpMethod);
  console.log("Content-Type:", event.headers["content-type"]);
  console.log("Database:", DATABASE_NAME);
  console.log("Body size:", event.body ? event.body.length : 0);

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

    // Check if request contains file upload
    const contentType = event.headers["content-type"] || "";
    
    if (!contentType.includes("multipart/form-data")) {
      // Create test track if no file uploaded
      console.log("No file uploaded, creating test track...");
      
      const trackData = {
        _id: new ObjectId(),
        title: `Test Track ${new Date().toLocaleString("vi-VN")}`,
        artist: user.displayName || user.username,
        album: "",
        duration: 180,
        genre: "Test",
        fileName: "test_track.mp3",
        fileSize: 1024000,
        mimeType: "audio/mpeg",
        userId: user._id,
        uploadDate: new Date(),
        isPublic: false,
        status: "uploaded",
        playCount: 0,
        likeCount: 0,
        sourceType: "test",
        cloudinaryUrl: null,
        cloudinaryId: null,
      };

      const result = await tracksCollection.insertOne(trackData);
      await usersCollection.updateOne(
        { _id: user._id },
        { $inc: { trackCount: 1 } }
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: "Test track created successfully",
          track: {
            id: trackData._id,
            title: trackData.title,
            artist: trackData.artist,
            duration: trackData.duration,
            status: trackData.status,
          },
          database: DATABASE_NAME,
        }),
      };
    }

    // Parse multipart form data
    console.log("Parsing multipart form data...");
    const { fields, file } = await parseMultipartData(event);

    if (!file) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "No audio file provided" }),
      };
    }

    console.log("File parsed:", file.filename, file.mimeType, file.buffer.length, "bytes");

    // Validate file type
    const allowedTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/m4a"];
    if (!allowedTypes.includes(file.mimeType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: "Invalid file type. Only audio files are allowed.",
          allowedTypes 
        }),
      };
    }

    // Upload to Cloudinary
    console.log("Uploading to Cloudinary...");
    const cloudinaryResult = await uploadToCloudinary(file.buffer, {
      public_id: `track_${user.username}_${Date.now()}`,
      format: "mp3", // Convert to mp3
    });

    console.log("Cloudinary upload completed:", cloudinaryResult.secure_url);

    // Create track record in database
    const trackData = {
      _id: new ObjectId(),
      title: fields.title || file.filename.replace(/\.[^/.]+$/, ""), // Remove extension
      artist: fields.artist || user.displayName || user.username,
      album: fields.album || "",
      duration: cloudinaryResult.duration || 0,
      genre: fields.genre || "Unknown",
      fileName: file.filename,
      fileSize: file.buffer.length,
      mimeType: file.mimeType,
      userId: user._id,
      uploadDate: new Date(),
      isPublic: fields.isPublic === "true" || false,
      status: "uploaded",
      playCount: 0,
      likeCount: 0,
      sourceType: "upload",
      // Cloudinary data
      cloudinaryUrl: cloudinaryResult.secure_url,
      cloudinaryId: cloudinaryResult.public_id,
      cloudinaryData: {
        format: cloudinaryResult.format,
        bytes: cloudinaryResult.bytes,
        duration: cloudinaryResult.duration,
        created_at: cloudinaryResult.created_at,
      },
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
        message: "Track uploaded successfully to Cloudinary",
        track: {
          id: trackData._id,
          title: trackData.title,
          artist: trackData.artist,
          duration: trackData.duration,
          fileSize: trackData.fileSize,
          uploadDate: trackData.uploadDate,
          status: trackData.status,
          isPublic: trackData.isPublic,
          cloudinaryUrl: trackData.cloudinaryUrl,
          playUrl: trackData.cloudinaryUrl, // For audio player
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
    console.log("Upload function completed");
  }
};
