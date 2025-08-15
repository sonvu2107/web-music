const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const busboy = require("busboy");
const streamifier = require("streamifier");

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;

  if (!process.env.MONGODB_URI) {
    console.error("❌ MONGODB_URI not set");
    throw new Error("MONGODB_URI not set");
  }

  console.log("🔍 Connecting to MongoDB:", process.env.MONGODB_URI.replace(/\/\/(.*):(.*)@/, "//***:***@"));

  const client = new MongoClient(process.env.MONGODB_URI, { useUnifiedTopology: true });
  await client.connect();

  const dbName = process.env.MONGODB_DBNAME || "flowplay"; // Giữ flowplay mặc định
  cachedDb = client.db(dbName);
  console.log("✅ MongoDB connected:", dbName);
  return cachedDb;
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false; // Giữ connection MongoDB

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    // JWT check
    const token = event.headers.authorization?.split(" ")[1];
    if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: "Chưa đăng nhập" }) };

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "flowplay_secret_key_2025");
      console.log("✅ JWT verified:", decoded.userId);
    } catch (err) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: "Token không hợp lệ" }) };
    }

    // Content-Type check
    const contentType = event.headers["content-type"] || event.headers["Content-Type"];
    if (!contentType || !contentType.includes("multipart/form-data")) {
      return { statusCode: 415, headers, body: JSON.stringify({ error: "Content-Type phải là multipart/form-data" }) };
    }

    return await new Promise((resolve) => {
      const bb = busboy({
        headers: { "content-type": contentType },
      });

      let fileBuffer = null;
      let fields = {};

      bb.on("file", (name, file, info) => {
        console.log(`📂 Nhận file: ${name}`, info);
        const buffers = [];
        file.on("data", (data) => buffers.push(data));
        file.on("end", () => {
          fileBuffer = Buffer.concat(buffers);
          console.log(`✅ File size: ${fileBuffer.length} bytes`);
        });
      });

      bb.on("field", (name, val) => {
        fields[name] = val;
        console.log(`🏷 Field: ${name} = ${val}`);
      });

      bb.on("finish", async () => {
        if (!fileBuffer) {
          resolve({ statusCode: 400, headers, body: JSON.stringify({ error: "Thiếu file upload" }) });
          return;
        }

        // Upload to Cloudinary
        const uploadStream = cloudinary.uploader.upload_stream(
          { resource_type: "auto", folder: "flowplay_tracks" },
          async (error, result) => {
            if (error) {
              console.error("❌ Cloudinary error:", error);
              resolve({ statusCode: 500, headers, body: JSON.stringify({ error: error.message }) });
              return;
            }

            console.log("✅ Cloudinary success:", result.secure_url);

            try {
              const db = await connectToDatabase();
              const newTrack = {
                title: fields.title || result.original_filename,
                artist: fields.artist || "Unknown",
                album: fields.album || "",
                genre: fields.genre || "",
                uploadedBy: new ObjectId(decoded.userId),
                fileUrl: result.secure_url,
                publicId: result.public_id,
                duration: 0,
                sourceType: "upload",
                isPublic: fields.isPublic === "true",
                playCount: 0,
                likeCount: 0,
                createdAt: new Date(),
              };

              await db.collection("tracks").insertOne(newTrack);
              console.log("✅ MongoDB insert success");

              resolve({ statusCode: 200, headers, body: JSON.stringify({ message: "Upload thành công", track: newTrack }) });
            } catch (dbErr) {
              console.error("❌ MongoDB error:", dbErr);
              resolve({ statusCode: 500, headers, body: JSON.stringify({ error: dbErr.message }) });
            }
          }
        );

        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
      });

      bb.on("error", (err) => {
        console.error("❌ Busboy error:", err);
        resolve({ statusCode: 500, headers, body: JSON.stringify({ error: err.message }) });
      });

      // Fix base64 decode cho Netlify
      bb.end(Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8"));
    });
  } catch (err) {
    console.error("❌ Server error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
