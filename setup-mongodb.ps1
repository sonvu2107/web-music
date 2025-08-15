# MongoDB Installation Script
# Chạy script này để cài đặt MongoDB trên Windows

Write-Host "🎵 FlowPlay MongoDB Setup Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Check if Node.js is installed
Write-Host "📋 Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first:" -ForegroundColor Red
    Write-Host "   Download from: https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if npm is available
Write-Host "📋 Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✅ npm found: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found. Please reinstall Node.js." -ForegroundColor Red
    exit 1
}

# Install Node.js dependencies
Write-Host "📦 Installing Node.js dependencies..." -ForegroundColor Yellow
try {
    npm install
    Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    Write-Host "   Please run: npm install" -ForegroundColor Red
    exit 1
}

# Check if MongoDB is installed
Write-Host "📋 Checking MongoDB installation..." -ForegroundColor Yellow
$mongoInstalled = $false

try {
    $mongoVersion = mongod --version
    if ($LASTEXITCODE -eq 0) {
        $mongoInstalled = $true
        Write-Host "✅ MongoDB found locally" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  MongoDB not found locally" -ForegroundColor Yellow
}

if (-not $mongoInstalled) {
    Write-Host ""
    Write-Host "📥 MongoDB Installation Options:" -ForegroundColor Cyan
    Write-Host "1. Download MongoDB Community Server:" -ForegroundColor White
    Write-Host "   https://www.mongodb.com/try/download/community" -ForegroundColor Blue
    Write-Host "2. Use MongoDB Atlas (Cloud - Free):" -ForegroundColor White
    Write-Host "   https://cloud.mongodb.com/" -ForegroundColor Blue
    Write-Host ""
    
    $choice = Read-Host "Choose option (1 for local, 2 for cloud, Enter to continue)"
    
    if ($choice -eq "1") {
        Start-Process "https://www.mongodb.com/try/download/community"
        Write-Host "📋 Please install MongoDB and run this script again" -ForegroundColor Yellow
        exit 0
    } elseif ($choice -eq "2") {
        Start-Process "https://cloud.mongodb.com/"
        Write-Host "📋 Create your Atlas cluster and update .env with connection string" -ForegroundColor Yellow
    }
}

# Create .env file if doesn't exist
Write-Host "📄 Setting up environment configuration..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    $envContent = @"
# FlowPlay Environment Configuration
PORT=3000
MONGODB_URI=mongodb://localhost:27017/flowplay
JWT_SECRET=flowplay_secret_key_2025_$(Get-Random)
NODE_ENV=development
"@
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ Created .env file with default settings" -ForegroundColor Green
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

# Create uploads directory
Write-Host "📁 Creating uploads directory..." -ForegroundColor Yellow
if (-not (Test-Path "uploads")) {
    New-Item -ItemType Directory -Name "uploads" | Out-Null
    Write-Host "✅ Created uploads directory" -ForegroundColor Green
} else {
    Write-Host "✅ Uploads directory already exists" -ForegroundColor Green
}

# Final instructions
Write-Host ""
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host "==================" -ForegroundColor Green
Write-Host ""

if ($mongoInstalled) {
    Write-Host "🚀 To start the application:" -ForegroundColor Cyan
    Write-Host "   npm start" -ForegroundColor White
    Write-Host ""
    Write-Host "🔧 For development mode:" -ForegroundColor Cyan
    Write-Host "   npm run dev" -ForegroundColor White
    Write-Host ""
    Write-Host "🌐 Application will be available at:" -ForegroundColor Cyan
    Write-Host "   http://localhost:3000" -ForegroundColor White
    
    # Ask to start now
    $startNow = Read-Host "Do you want to start the server now? (y/N)"
    if ($startNow -eq "y" -or $startNow -eq "Y") {
        Write-Host "🚀 Starting FlowPlay server..." -ForegroundColor Green
        npm start
    }
} else {
    Write-Host "📋 Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Install MongoDB (see links above)" -ForegroundColor White
    Write-Host "2. Start MongoDB service" -ForegroundColor White
    Write-Host "3. Run: npm start" -ForegroundColor White
    Write-Host "4. Open: http://localhost:3000" -ForegroundColor White
}

Write-Host ""
Write-Host "📖 For more details, see README_MONGODB.md" -ForegroundColor Blue
