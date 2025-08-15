# 🎵 FlowPlay - Ứng Dụng Nghe Nhạc Toàn Diện

FlowPlay là một ứng dụng nghe nhạc web hiện đại với tích hợp MongoDB Cloud và hệ thống chia sẻ nhạc cộng đồng.

## ✨ Tính Năng Chính

### 🎧 Phát Nhạc & Audio
- Phát nhạc từ nhiều nguồn: File local, MongoDB cloud, YouTube
- Visualizer âm thanh động với Web Audio API
- Hỗ trợ đầy đủ các định dạng audio (MP3, WAV, FLAC, v.v.)
- Điều khiển âm lượng, shuffle, repeat
- Phím tắt bàn phím (Space: play/pause, Arrow keys: prev/next)

### 🗂️ Quản Lý Thư Viện
- Kéo & thả file âm thanh để thêm vào thư viện
- Tạo và quản lý playlist tùy chỉnh
- Reorder tracks trong playlist
- Tìm kiếm nhạc theo tên, nghệ sĩ, album
- Lưu trữ local với IndexedDB + LocalStorage

### ☁️ Tích Hợp MongoDB Cloud
- Upload nhạc lên MongoDB Atlas với metadata đầy đủ
- Hệ thống user authentication (đăng ký/đăng nhập)
- Profile cá nhân với avatar upload
- Thống kê chi tiết: số bài đã upload, tổng lượt phát
- Quản lý nhạc đã upload (edit, delete)

### 🌍 Cộng Đồng & Chia Sẻ
- Discover: Khám phá nhạc public từ user khác
- Play count tracking cho mỗi bài nhạc
- Chia sẻ nhạc public với cộng đồng
- Thêm nhạc yêu thích từ cộng đồng vào thư viện cá nhân
- Streaming với authentication token

### 🎨 Giao Diện & Trải Nghiệm
- Theme sáng/tối hoàn chỉnh
- Responsive design cho mobile/desktop
- UI tiếng Việt hoàn chỉnh
- Animations mượt mà
- Progressive Web App (PWA) với Service Worker

### 🔧 Tính Năng Kỹ Thuật
- Offline support với Service Worker
- File upload lớn (lên đến 50MB)
- Streaming âm thanh tối ưu
- Error handling toàn diện
- Real-time notifications

## 🚀 Cài Đặt & Chạy

### 1. Yêu Cầu Hệ Thống
- Node.js (v14 trở lên)
- MongoDB Atlas account (hoặc local MongoDB)
- Browser hỗ trợ Web Audio API

### 2. Setup Backend
```bash
# Cài đặt dependencies
npm install

# Tạo file .env với cấu hình:
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
PORT=3000

# Chạy server
node server.js
```

### 3. Setup Frontend
```bash
# Mở trình duyệt và truy cập:
http://localhost:3000

# Hoặc chạy static server (dev only):
python -m http.server 8080
```

## 📁 Cấu Trúc Project

```
music-app/
├── server.js              # Express backend với MongoDB
├── index.html             # Main HTML file
├── manifest.json          # PWA manifest
├── scripts/
│   ├── main.js           # App initialization & player
│   ├── player.js         # Audio player engine
│   ├── ui.js             # Local UI components
│   ├── mongodb-ui.js     # MongoDB UI components
│   ├── discovery.js      # Community discovery
│   ├── api-client.js     # API communication
│   ├── auth.js           # Authentication logic
│   ├── storage.js        # Data persistence
│   ├── playlists.js      # Playlist management
│   ├── visualizer.js     # Audio visualization
│   └── service-worker.js # PWA service worker
├── styles/
│   ├── main.css          # Main styling
│   ├── mongodb.css       # MongoDB UI styles
│   └── player.css        # Player component styles
└── assets/
    ├── icons/            # SVG icons
    └── demo/             # Demo audio files
```

## 🎯 Hướng Dẫn Sử Dụng

### Lần Đầu Sử Dụng:
1. **Truy cập** http://localhost:3000
2. **Đăng ký** tài khoản mới hoặc dùng Guest mode
3. **Upload nhạc** bằng cách kéo thả file hoặc click "+"
4. **Tạo playlist** và thêm nhạc yêu thích

### Khám Phá Cộng Đồng:
1. **Discovery**: Xem nhạc public từ user khác
2. **Phát nhạc**: Click ▶️ để nghe thử
3. **Thêm vào thư viện**: Click ➕ để lưu nhạc yêu thích
4. **Check play count**: Xem độ phổ biến của từng bài

### Quản Lý Profile:
1. **Mở Profile**: Click avatar góc phải
2. **Upload avatar**: Đổi ảnh đại diện
3. **Xem stats**: Theo dõi số bài đã upload và lượt phát
4. **Cài đặt**: Thay đổi theme, âm lượng mặc định

## 🔐 Bảo Mật & Quyền Riêng Tư

- JWT authentication cho API calls
- File upload với validation strict
- User chỉ có thể delete nhạc của chính mình
- Public/Private mode cho từng track
- Token expiration tự động

## 🎵 Định Dạng Được Hỗ Trợ

**Audio**: MP3, WAV, FLAC, OGG, AAC, M4A
**Image**: JPG, PNG, WebP (cho avatar)
**Upload limit**: 50MB/file audio, 2MB/file image

## 🐛 Troubleshooting

### Lỗi Thường Gặp:
- **"Failed to load"**: Kiểm tra server đang chạy
- **"Authentication failed"**: Đăng nhập lại
- **"File too large"**: Giảm kích thước file < 50MB
- **"No sound"**: Check browser permissions cho audio

### Performance:
- Đóng tabs khác nếu visualizer lag
- Clear browser cache nếu UI không update
- Restart server nếu upload bị stuck

## 📝 Changelog

**v3.0 (Current)**:
- ✅ Full MongoDB integration
- ✅ Community discovery system  
- ✅ Play count tracking
- ✅ Vietnamese localization
- ✅ Enhanced error handling

**v2.0**:
- ✅ User authentication
- ✅ Cloud upload/storage
- ✅ Profile management

**v1.0**:
- ✅ Basic audio player
- ✅ Local file management
- ✅ Playlist features

## 👥 Đóng Góp

FlowPlay là open-source project. Contributions welcome!

---
🎵 **Developed with ❤️ for music lovers**
