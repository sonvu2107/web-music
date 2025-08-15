// netlify/functions/upload-track.js
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

let isConnected = false;

const connectToDatabase = async () => {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  isConnected = true;
};

const trackSchema = new mongoose.Schema({
  title: String,
  artist: String,
  album: String,
  duration: Number,
  genre: String,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileName: String,
  audioData: String,
  fileSize: Number,
  mimeType: String,
  thumbnail: String,
  sourceType: { type: String, default: 'upload' },
  isPublic: { type: Boolean, default: false },
  playCount: Number,
  likeCount: Number
});
const Track = mongoose.models.Track || mongoose.model('Track', trackSchema);

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    await connectToDatabase();

    const authHeader = event.headers.authorization;
    if (!authHeader) return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'No token' }) };
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'flowplay_secret_key_2025');

    const data = JSON.parse(event.body);
    if (!data.title || !data.artist) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Title and artist required' }) };
    }

    const track = new Track({
      ...data,
      uploadedBy: decoded.userId,
      createdAt: new Date()
    });

    await track.save();

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Upload thành công', track })
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: err.message }) };
  }
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
