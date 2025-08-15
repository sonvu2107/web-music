// Test all API endpoints
const API_BASE = 'https://webmusic-app.netlify.app/api';

async function testEndpoints() {
    console.log('🧪 Testing FlowPlay API endpoints...\n');
    
    try {
        // 1. Test health endpoint
        console.log('1️⃣ Testing health endpoint...');
        const healthResponse = await fetch(`${API_BASE}/health`);
        console.log('Health status:', healthResponse.status);
        const healthData = await healthResponse.text();
        console.log('Health response:', healthData, '\n');

        // 2. Test login
        console.log('2️⃣ Testing login...');
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'testuser',
                password: 'password123'
            })
        });
        console.log('Login status:', loginResponse.status);
        const loginData = await loginResponse.json();
        console.log('Login response:', loginData, '\n');

        // Get token for authenticated requests
        const token = loginData.token;

        if (token) {
            // 3. Test public tracks
            console.log('3️⃣ Testing public tracks...');
            const tracksResponse = await fetch(`${API_BASE}/tracks/public`);
            console.log('Public tracks status:', tracksResponse.status);
            const tracksData = await tracksResponse.json();
            console.log('Public tracks response:', tracksData, '\n');

            // 4. Test user tracks (authenticated)
            console.log('4️⃣ Testing user tracks...');
            const userTracksResponse = await fetch(`${API_BASE}/tracks/my-tracks`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log('User tracks status:', userTracksResponse.status);
            const userTracksData = await userTracksResponse.json();
            console.log('User tracks response:', userTracksData, '\n');

            // 5. Test user profile (authenticated)
            console.log('5️⃣ Testing user profile...');
            const profileResponse = await fetch(`${API_BASE}/user/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log('Profile status:', profileResponse.status);
            const profileData = await profileResponse.json();
            console.log('Profile response:', profileData, '\n');
        }

    } catch (error) {
        console.error('❌ Test error:', error);
    }
}

// Run tests if in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    const fetch = require('node-fetch');
    testEndpoints();
}
