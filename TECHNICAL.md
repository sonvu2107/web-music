# 📊 FlowPlay - Technical Specifications

## 🏗️ Architecture Overview

**Frontend**: Vanilla JavaScript + HTML5 + CSS3  
**Backend**: Node.js + Express.js  
**Database**: MongoDB Atlas  
**Storage**: IndexedDB + LocalStorage (local), GridFS (cloud)  
**Authentication**: JWT (JSON Web Tokens)  
**Audio**: Web Audio API + HTML5 Audio  

## 📦 Dependencies & Versions

### 🔧 Backend Dependencies
```json
{
  "express": "^4.18.2",           // Web framework
  "mongoose": "^7.5.0",           // MongoDB ODM
  "multer": "^1.4.5-lts.1",       // File upload handling
  "cors": "^2.8.5",               // Cross-origin requests
  "bcryptjs": "^2.4.3",           // Password hashing
  "jsonwebtoken": "^9.0.2",       // JWT authentication
  "dotenv": "^16.3.1"             // Environment variables
}
```

### 🔧 Development Dependencies
```json
{
  "nodemon": "^3.0.1"             // Auto-restart server
}
```

### 🌐 Frontend Technologies
- **HTML5**: Audio element, File API, Drag & Drop API
- **CSS3**: Flexbox, Grid, CSS Variables, Animations
- **JavaScript ES6+**: Modules, Async/Await, Classes, Destructuring
- **Web APIs**: 
  - Web Audio API (for visualizer)
  - IndexedDB API (for local storage)
  - Service Worker API (for PWA)
  - File API (for file uploads)
  - MediaSession API (for media controls)

## 🎵 Audio Format Support

### ✅ Supported Formats
- **MP3** (.mp3) - Most common, good compression
- **WAV** (.wav) - Uncompressed, high quality
- **FLAC** (.flac) - Lossless compression
- **OGG** (.ogg) - Open source format
- **AAC** (.aac, .m4a) - Apple/iTunes format
- **WebM** (.webm) - Web optimized

### 📁 File Constraints
- **Maximum size**: 50MB per audio file
- **Image uploads**: 2MB per image file (avatars)
- **Concurrent uploads**: Limited by browser

## 🗄️ Database Schema

### 👤 User Model
```javascript
{
  _id: ObjectId,
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  displayName: String,
  avatar: String (base64),
  preferences: {
    theme: String,
    volume: Number,
    shuffle: Boolean
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 🎵 Track Model
```javascript
{
  _id: ObjectId,
  title: String,
  artist: String,
  album: String,
  genre: String,
  duration: Number,
  filePath: String,
  isPublic: Boolean,
  playCount: Number,
  uploadedBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

## 🔐 Security Features

### 🛡️ Authentication
- **JWT tokens** with expiration (7 days)
- **Password hashing** with bcryptjs (salt rounds: 10)
- **Token validation** on protected routes
- **Auto-logout** on token expiration

### 🔒 Authorization
- **User isolation**: Users can only access their own data
- **File protection**: Only owners can delete their tracks
- **Stream authentication**: Token-based audio streaming
- **Public/Private**: Granular control over track visibility

### 🚫 Input Validation
- **File type checking** (MIME type validation)
- **File size limits** (50MB audio, 2MB images)
- **SQL injection prevention** (MongoDB native protection)
- **XSS protection** (Input sanitization)

## ⚡ Performance Optimizations

### 🚀 Frontend
- **Lazy loading**: Audio files loaded on demand
- **Caching**: IndexedDB for track metadata
- **Service Worker**: Offline functionality
- **Debounced search**: Reduced API calls
- **Image optimization**: Base64 encoding for avatars

### 🏃 Backend
- **Streaming**: Audio served with range requests
- **Connection pooling**: MongoDB connection reuse
- **File serving**: Express static middleware
- **Error handling**: Graceful degradation

## 📱 Browser Compatibility

### ✅ Fully Supported
- **Chrome** 60+ (recommended)
- **Firefox** 55+
- **Safari** 11+
- **Edge** 79+

### ⚠️ Limited Support
- **Internet Explorer**: Not supported (requires ES6+)
- **Safari** < 11: Limited Web Audio API support
- **Mobile browsers**: Basic functionality only

### 🔧 Required APIs
- **Web Audio API** (for visualizer)
- **IndexedDB** (for local storage)
- **File API** (for drag & drop)
- **Fetch API** (for HTTP requests)

## 🌍 Internationalization

### 🇻🇳 Vietnamese Language
- **Complete UI translation**: All interface text in Vietnamese
- **Date formatting**: Vietnamese locale (DD/MM/YYYY)
- **Number formatting**: Vietnamese thousand separators
- **Time formatting**: 24-hour format

### 🔤 Text Content
- **Static text**: Hardcoded Vietnamese strings
- **Dynamic content**: User-generated (any language)
- **Error messages**: Vietnamese error descriptions
- **Notifications**: Vietnamese success/error messages

## 📊 System Limits

### 👥 Users
- **Concurrent users**: Limited by MongoDB Atlas tier
- **Registration**: Open (no restrictions)
- **Storage per user**: No hard limits (MongoDB dependent)

### 🎵 Content
- **Tracks per user**: No limit
- **Public tracks**: No limit
- **File storage**: MongoDB GridFS + local filesystem
- **Streaming bandwidth**: Server-dependent

### 🔄 API Limits
- **Request rate**: No explicit limits (can be added)
- **Upload frequency**: Limited by client-side validation
- **Download frequency**: Unlimited streaming

## 🔮 Future Roadmap

### 🎯 Planned Features
- **Social features**: Follow users, comments, ratings
- **Advanced search**: Filter by genre, year, duration
- **Playlist sharing**: Public/collaborative playlists
- **Mobile app**: React Native version
- **Analytics**: Detailed listening statistics

### 🛠️ Technical Improvements
- **CDN integration**: Faster file delivery
- **Database optimization**: Indexing, aggregation
- **Real-time features**: WebSocket for live updates
- **Microservices**: Split backend into services
- **Testing**: Unit tests, integration tests

---
📋 **Current Version**: v3.0.0  
📅 **Last Updated**: August 2025  
👨‍💻 **Maintained by**: FlowPlay Team
