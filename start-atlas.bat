@echo off
echo 🎵 FlowPlay MongoDB Atlas Setup
echo ================================

echo.
echo 📋 MongoDB Atlas Connection String detected!
echo Connection: mongodb+srv://2355010173:***@cluster0.zj231t7.mongodb.net/flowplay
echo.

set /p DB_PASSWORD="🔑 Enter your MongoDB Atlas password: "

if "%DB_PASSWORD%"=="" (
    echo ❌ Password is required!
    pause
    exit /b 1
)

echo.
echo 📝 Updating .env file with your password...

powershell -Command "(Get-Content '.env') -replace '<db_password>', '%DB_PASSWORD%' | Set-Content '.env'"

echo ✅ Configuration updated successfully!
echo.

echo 🚀 Starting FlowPlay server...
echo.
echo 📱 Opening browser to http://localhost:3000
echo 🔧 API available at http://localhost:3000/api
echo 📊 Health check: http://localhost:3000/api/health
echo.

rem Open browser
start "" http://localhost:3000

rem Start the server
npm start
