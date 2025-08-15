# 🚀 FlowPlay Deployment Guide

## 📋 Prerequisites

1. **GitHub account**: https://github.com
2. **Netlify account**: https://netlify.com  
3. **MongoDB Atlas**: https://cloud.mongodb.com

## 🔗 Step 1: Push to GitHub

### Initialize Git (if not already done):
```bash
cd d:\Download\flowplay-html-css-js-20250814-170545\music-app

# Initialize git repository
git init

# Add all files
git add .

# First commit
git commit -m "Initial commit: FlowPlay v3.0 with MongoDB integration"

# Add remote repository
git remote add origin https://github.com/sonvu2107/web-music.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### For existing repository:
```bash
# Add changes
git add .

# Commit changes  
git commit -m "Add Netlify deployment configuration and serverless functions"

# Push to GitHub
git push origin main
```

## ☁️ Step 2: Setup MongoDB Atlas

1. **Login to MongoDB Atlas**: https://cloud.mongodb.com
2. **Get Connection String**:
   - Go to your cluster
   - Click "Connect" → "Connect your application"
   - Copy connection string (format: `mongodb+srv://username:password@cluster...`)

## 🌐 Step 3: Deploy on Netlify

### Auto Deploy from GitHub:
1. **Login to Netlify**: https://app.netlify.com
2. **New Site from Git**:
   - Choose "GitHub"
   - Select repository: `sonvu2107/web-music`
   - Branch: `main`
   - Build command: `npm run build`
   - Publish directory: `.`

### Configure Environment Variables:
1. **Go to Site Settings** → **Environment Variables**
2. **Add these variables**:
   ```
   MONGODB_URI = mongodb+srv://your-username:password@cluster0.xxxxx.mongodb.net/flowplay?retryWrites=true&w=majority
   
   JWT_SECRET = your-super-secret-jwt-key-minimum-32-characters-long-123456789
   ```

### Deploy Settings:
- **Build command**: `npm run build`
- **Publish directory**: `.`
- **Functions directory**: `netlify/functions`

## 🔧 Step 4: Configure Domain & Settings

### Custom Domain (Optional):
1. **Site Settings** → **Domain Management**
2. **Add Custom Domain**: your-domain.com
3. **Configure DNS** following Netlify instructions

### Site Settings:
1. **Site name**: Change from random name to `flowplay-music` or preferred name
2. **HTTPS**: Auto-enabled by Netlify
3. **Form handling**: Can be enabled for contact forms

## 📁 Step 5: File Upload Considerations

⚠️ **Important**: Netlify has limitations for file uploads:
- **Function timeout**: 10 seconds (25s for Pro)
- **Function memory**: 1008MB
- **File size**: Consider using external storage

### Recommended Solutions:
1. **Cloudinary**: For audio file storage
2. **AWS S3**: For large file storage
3. **Firebase Storage**: Alternative option

### Update API Client for Production:
```javascript
// In scripts/api-client.js, update baseURL:
const baseURL = 'https://your-netlify-site.netlify.app';
```

## 🧪 Step 6: Testing

### Test Deployment:
1. **Visit your Netlify URL**: `https://your-site-name.netlify.app`
2. **Test basic functionality**:
   - ✅ Site loads
   - ✅ User registration/login
   - ✅ MongoDB connection
   - ✅ API endpoints working

### Debug Issues:
1. **Netlify Functions Log**: Site → Functions tab
2. **Browser Console**: Check for errors
3. **Network Tab**: Check API calls

## 📊 Step 7: Monitoring & Maintenance

### Netlify Dashboard:
- **Deploy logs**: Check build status
- **Function logs**: Debug API issues
- **Analytics**: Monitor site usage
- **Forms**: Handle user feedback

### MongoDB Atlas:
- **Cluster monitoring**: Check database performance
- **Connection limits**: Monitor concurrent users
- **Storage usage**: Track data growth

## 🔄 Step 8: Continuous Deployment

### Auto Deploy Setup:
- ✅ **GitHub Integration**: Automatically deploy on push to main branch
- ✅ **Branch deploys**: Preview changes on feature branches
- ✅ **Deploy notifications**: Get notified of deploy status

### Update Workflow:
```bash
# Make changes locally
git add .
git commit -m "Add new feature"
git push origin main

# Netlify auto-deploys from GitHub
# Check deploy status at: https://app.netlify.com
```

## ⚠️ Important Notes

### Limitations on Netlify:
1. **File uploads**: Need external storage for large audio files
2. **Function timeout**: 10-second limit for free tier
3. **Bandwidth**: 100GB/month on free tier

### MongoDB Atlas:
1. **Free tier**: 512MB storage limit
2. **Connection limit**: 500 concurrent connections
3. **Bandwidth**: No limit on free tier

### Recommended Upgrades:
- **Netlify Pro**: For longer function timeout
- **MongoDB Atlas M10+**: For production workloads
- **CDN**: For faster global access

## 🎯 Final Checklist

- [ ] Code pushed to GitHub: `https://github.com/sonvu2107/web-music`
- [ ] Netlify site deployed and accessible
- [ ] Environment variables configured
- [ ] MongoDB Atlas connected
- [ ] User registration/login working
- [ ] Basic API endpoints functional
- [ ] Site domain configured (if custom)
- [ ] HTTPS enabled (auto by Netlify)

## 📞 Support

If you encounter issues:
1. **Check Netlify deploy logs**
2. **Verify environment variables**
3. **Test MongoDB connection**
4. **Check browser console for errors**

---
🚀 **Your FlowPlay app should now be live at**: `https://your-site-name.netlify.app`
