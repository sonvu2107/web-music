# 🚀 FlowPlay Setup Guide

## 📋 Prerequisites

Before setting up FlowPlay, ensure you have:

- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **MongoDB Atlas** account - [Create free account](https://www.mongodb.com/atlas)
- **Modern web browser** (Chrome, Firefox, Safari, Edge)

## 🔧 Quick Setup

### 1. Download & Install
```bash
# Clone or download the project
cd flowplay-music-app

# Install dependencies
npm install
```

### 2. MongoDB Atlas Setup
1. **Create MongoDB Atlas Cluster**:
   - Go to [MongoDB Atlas](https://cloud.mongodb.com/)
   - Create free cluster
   - Set database name to `flowplay`

2. **Get Connection String**:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy connection string (looks like `mongodb+srv://...`)

### 3. Environment Configuration
Create `.env` file in root directory:
```env
MONGODB_URI=your_mongodb_connection_string_here
JWT_SECRET=your_super_secret_key_here_minimum_32_chars
PORT=3000
```

**Example**:
```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/flowplay?retryWrites=true&w=majority
JWT_SECRET=my-super-secret-jwt-key-that-is-very-long-and-secure-123456789
PORT=3000
```

### 4. Start Application
```bash
# Production mode
npm start

# Development mode (auto-restart)
npm run dev
```

### 5. Access Application
Open browser and go to: **http://localhost:3000**

## 📁 File Structure Overview

```
flowplay-music-app/
├── 📄 server.js              # Express server + MongoDB
├── 📄 index.html             # Main web page
├── 📄 package.json           # Project dependencies
├── 📄 .env                   # Environment variables (create this)
├── 📁 scripts/
│   ├── 🎵 main.js            # App initialization
│   ├── 🎧 player.js          # Audio player core
│   ├── 🎨 ui.js              # Local UI components
│   ├── ☁️  mongodb-ui.js     # Cloud features UI
│   ├── 🌍 discovery.js       # Community discovery
│   ├── 🔐 auth.js            # User authentication
│   └── 💾 storage.js         # Data persistence
├── 📁 styles/                # CSS styling files
├── 📁 assets/                # Icons & demo files
└── 📁 uploads/               # User uploaded files (auto-created)
```

## 🎯 Features Checklist

After setup, you should be able to:

### ✅ Basic Features
- [ ] Load the web app at localhost:3000
- [ ] See the player interface
- [ ] Upload audio files (drag & drop)
- [ ] Play music with visualizer
- [ ] Create playlists

### ✅ User Features
- [ ] Register new account
- [ ] Login/logout
- [ ] Upload profile avatar
- [ ] View user statistics

### ✅ Community Features
- [ ] Upload public tracks
- [ ] Browse Discovery page
- [ ] Play others' music
- [ ] Add community tracks to library
- [ ] See play count statistics

### ✅ Advanced Features
- [ ] Offline mode (Service Worker)
- [ ] Theme switching (light/dark)
- [ ] Keyboard shortcuts
- [ ] Mobile responsive design

## 🐛 Troubleshooting

### Common Issues:

**🔴 "Cannot connect to MongoDB"**
- Check your MongoDB Atlas connection string
- Ensure your IP is whitelisted in Atlas
- Verify credentials in .env file

**🔴 "Port 3000 already in use"**
- Change PORT in .env file to different number
- Or kill process using port 3000

**🔴 "File upload fails"**
- Check uploads/ directory exists and is writable
- Verify file size is under 50MB
- Ensure audio format is supported

**🔴 "Audio won't play"**
- Check browser permissions for audio
- Try different audio file format
- Clear browser cache

### Getting Help:

1. **Check browser console** for error messages
2. **Check server logs** in terminal
3. **Verify all dependencies** are installed
4. **Test with demo audio file** first

## 🎵 First Use Guide

### For New Users:
1. **Register**: Create account or use Guest mode
2. **Upload**: Drag audio files to the upload zone
3. **Play**: Click any track to start playing
4. **Explore**: Check out the Discovery section

### For Developers:
1. **Inspect code**: All source files are well-commented
2. **Modify styling**: Edit CSS files in styles/ directory
3. **Add features**: Follow existing code patterns
4. **Test changes**: Use npm run dev for auto-reload

---
🚀 **Ready to rock? Start with `npm install` and `npm start`!**
