const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const busboy = require("busboy");
const streamifier = require("streamifier");

// ====== Kết nối MongoDB ======
let cachedDb = null;
async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI not set");

  console.log("🔍 Connecting to MongoDB:", process.env.MONGODB_URI.replace(/\/\/(.*):(.*)@/, "//***:***@"));
  const client = new MongoClient(process.env.MONGODB_URI, { useUnifiedTopology: true });
  await client.connect();
  cachedDb = client.db("flowplay");
  console.log("✅ MongoDB connected, DB:", cachedDb.databaseName);
  return cachedDb;
}

// ====== Config Cloudinary ======
console.log("📋 Cloudinary ENV check:", {
  CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  API_KEY: process.env.CLOUDINARY_API_KEY ? "✅ Set" : "❌ Not set",
  API_SECRET: process.env.CLOUDINARY_API_SECRET ? "✅ Set" : "❌ Not set",
});
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    console.log("📥 Upload request received");
    console.log("📋 Headers:", event.headers);

    // ====== Xác thực JWT ======
    const token = event.headers.authorization?.split(" ")[1];
    if (!token) {
      console.warn("❌ Missing JWT token");
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Chưa đăng nhập" }),
      };
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "flowplay_secret_key_2025");
      console.log("✅ JWT verified, userId:", decoded.userId);
    } catch (err) {
      console.error("❌ Invalid JWT token:", err.message);
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: "Token không hợp lệ" }),
      };
    }

    // ====== Parse multipart/form-data ======
    if (
      !event.headers["content-type"] ||
      !event.headers["content-type"].includes("multipart/form-data")
    ) {
      console.error("❌ Content-Type not multipart/form-data");
      return {
        statusCode: 415,
        headers,
        body: JSON.stringify({ error: "Content-Type phải là multipart/form-data" }),
      };
    }

    const bb = busboy({
      headers: { "content-type": event.headers["content-type"] },
    });

    let fileBuffer = null;
    let fileInfo = {};
    let fields = {};

    return await new Promise((resolve) => {
      bb.on("file", (name, file, info) => {
        console.log(`📂 Receiving file: ${name}`, info);
        fileInfo = info;
        const buffers = [];
        file.on("data", (data) => buffers.push(data));
        file.on("end", () => {
          fileBuffer = Buffer.concat(buffers);
          console.log(`✅ File received, size: ${fileBuffer.length} bytes`);
        });
      });

      bb.on("field", (name, val) => {
        console.log(`🏷 Field: ${name} = ${val}`);
        fields[name] = val;
      });

      bb.on("finish", async () => {
        if (!fileBuffer) {
          console.error("❌ No file uploaded");
          resolve({
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Thiếu file upload" }),
          });
          return;
        }

        // ====== Upload lên Cloudinary ======
        try {
          console.log("☁ Uploading to Cloudinary...");
          const uploadStream = cloudinary.uploader.upload_stream(
            { resource_type: "auto", folder: "flowplay_tracks" },
            async (error, result) => {
              if (error) {
                console.error("❌ Cloudinary upload error:", error);
                resolve({
                  statusCode: 500,
                  headers,
                  body: JSON.stringify({
                    error: "Upload lên Cloudinary thất bại",
                    details: error.message,
                  }),
                });
                return;
              }

              console.log("✅ Cloudinary upload success:", result.secure_url);

              // ====== Lưu MongoDB ======
              try {
                const db = await connectToDatabase();
                const newTrack = {
                  title: fields.title || result.original_filename,
                  artist: fields.artist || "Unknown",
                  album: fields.album || "",
                  genre: fields.genre || "",
                  uploadedBy: ObjectId(decoded.userId),
                  fileUrl: result.secure_url,
                  publicId: result.public_id,
                  duration: 0,
                  sourceType: "upload",
                  isPublic: fields.isPublic === "true" || false,
                  playCount: 0,
                  likeCount: 0,
                  createdAt: new Date(),
                };

                await db.collection("tracks").insertOne(newTrack);
                console.log("✅ MongoDB insert success");

                resolve({
                  statusCode: 200,
                  headers,
                  body: JSON.stringify({ message: "Upload thành công", track: newTrack }),
                });
              } catch (dbErr) {
                console.error("❌ MongoDB insert error:", dbErr);
                resolve({
                  statusCode: 500,
                  headers,
                  body: JSON.stringify({ error: "Lỗi lưu MongoDB", details: dbErr.message }),
                });
              }
            }
          );
          streamifier.createReadStream(fileBuffer).pipe(uploadStream);
        } catch (err) {
          console.error("❌ Upload file process error:", err);
          resolve({
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Lỗi upload file", details: err.message }),
          });
        }
      });

      bb.on("error", (err) => {
        console.error("❌ Busboy parse error:", err);
        resolve({
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "Lỗi parse multipart", details: err.message }),
        });
      });

      bb.end(Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8"));
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Lỗi server", details: error.message }),
    };
  }
};
