# FlowPlay Music App - MongoDB Setup

## 📋 Cài đặt và chạy

### 1. Cài đặt MongoDB

**Cách 1: MongoDB Local (Khuyến nghị cho dev)**
```cmd
# Tải MongoDB Community Server từ: https://www.mongodb.com/try/download/community
# Hoặc dùng MongoDB Compass GUI: https://www.mongodb.com/try/download/compass

# Chạy MongoDB service (sau khi cài đặt)
net start MongoDB
```

**Cách 2: MongoDB Cloud (MongoDB Atlas)**
```
1. Đăng ký tại: https://cloud.mongodb.com/
2. Tạo cluster miễn phí
3. Lấy connection string
4. Thêm vào file .env: MONGODB_URI=mongodb+srv://...
```

### 2. Cài đặt dependencies

```cmd
# Vào thư mục project
cd d:\Download\flowplay-html-css-js-20250814-170545\music-app

# Cài đặt Node.js dependencies
npm install

# Hoặc dùng script có sẵn
npm run setup
```

### 3. Cấu hình (Tùy chọn)

Tạo file `.env` để cấu hình:
```env
# .env file
PORT=3000
MONGODB_URI=mongodb://localhost:27017/flowplay
JWT_SECRET=your_super_secret_key_here
NODE_ENV=development
```

### 4. Khởi chạy server

```cmd
# Development mode (auto-reload)
npm run dev

# Production mode
npm start
```

### 5. Truy cập ứng dụng

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3000/api
- **Health check**: http://localhost:3000/api/health

## 🎵 Tính năng mới

### User Authentication
- ✅ Đăng ký/Đăng nhập với JWT
- ✅ Profile management với preferences
- ✅ Secure password hashing với bcrypt

### Music Upload & Storage
- ✅ Upload audio files (MP3, WAV, OGG, M4A)
- ✅ File size limit: 50MB
- ✅ Metadata extraction (title, artist, album, genre)
- ✅ Public/Private track settings

### Music Library
- ✅ My Tracks - Quản lý nhạc đã upload
- ✅ Discover - Tìm nhạc public từ user khác
- ✅ Search & filter by genre
- ✅ Audio streaming với range requests (seeking support)

### User Experience
- ✅ Drag & drop upload
- ✅ Real-time upload progress
- ✅ User statistics (track count, play count)
- ✅ Theme preferences sync
- ✅ Auto-login với token validation

## 📱 UI Components Mới

### Upload Modal
- Drag & drop zone
- Multi-file support (queue)
- Metadata form
- Progress tracking
- Public/private toggle

### Profile Modal
- User info editing
- Preferences sync
- Usage statistics
- Avatar management

### Library Modal
- Tabbed interface (My Tracks / Discover)
- Search functionality
- Genre filtering
- Play/Add actions

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký user
- `POST /api/auth/login` - Đăng nhập
- `GET /api/user/profile` - Lấy profile
- `PUT /api/user/profile` - Cập nhật profile

### Tracks
- `POST /api/tracks/upload` - Upload nhạc
- `GET /api/tracks/my-tracks` - Nhạc của tôi
- `GET /api/tracks/public` - Nhạc public
- `GET /api/tracks/:id/stream` - Stream audio

### System
- `GET /api/health` - Health check

## 🗂️ Database Schema

### Users Collection
```javascript
{
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  displayName: String,
  avatar: String,
  preferences: {
    theme: String,
    volume: Number,
    repeat: String,
    shuffle: Boolean
  },
  createdAt: Date,
  lastLogin: Date
}
```

### Tracks Collection
```javascript
{
  title: String,
  artist: String,
  album: String,
  duration: Number,
  genre: String,
  uploadedBy: ObjectId (ref User),
  fileName: String,
  filePath: String,
  fileSize: Number,
  mimeType: String,
  sourceType: String,
  isPublic: Boolean,
  playCount: Number,
  likeCount: Number,
  createdAt: Date
}
```

## 🚀 Triển khai

### Local Development
```cmd
# Chạy MongoDB local
mongod

# Chạy app
npm run dev
```

### Production Deployment
```cmd
# Build và start
npm start

# Với PM2
pm2 start server.js --name flowplay
```

### Environment Variables
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/flowplay
JWT_SECRET=your_secret_key
NODE_ENV=production
```

## 🛡️ Security Features

- ✅ JWT authentication với expiration
- ✅ Password hashing với bcrypt
- ✅ File type validation
- ✅ File size limits
- ✅ CORS protection
- ✅ Input sanitization
- ✅ Rate limiting ready

## 📊 Performance

- ✅ Audio streaming với range requests
- ✅ Efficient MongoDB queries với indexing
- ✅ File upload progress tracking
- ✅ Client-side caching
- ✅ Lazy loading for large libraries

## 🐛 Troubleshooting

### MongoDB Connection Issues
```cmd
# Kiểm tra MongoDB service
net start | findstr MongoDB

# Test connection
mongosh mongodb://localhost:27017/flowplay
```

### Upload Issues
- Kiểm tra folder permissions cho `uploads/`
- Verify file size < 50MB
- Check supported audio formats

### Authentication Issues
- Clear localStorage: `localStorage.clear()`
- Check JWT token expiration
- Verify API endpoint connectivity

## 🔄 Migration từ LocalStorage

Existing local data sẽ được giữ nguyên và hoạt động bình thường. MongoDB features là bổ sung, không thay thế existing functionality.

## 🎯 Roadmap

- [ ] Playlist management với MongoDB
- [ ] Social features (follow users, likes)
- [ ] Audio transcoding optimization
- [ ] Real-time notifications
- [ ] Mobile app với React Native
- [ ] Advanced audio analysis
