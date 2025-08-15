// scripts/api-client.js - Frontend API client để connect với MongoDB backend
class ApiClient {
  constructor() {
    this.baseURL = window.location.origin + '/api';
    this.token = localStorage.getItem('flowplay_token');
  }

  // Set auth token
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('flowplay_token', token);
    } else {
      localStorage.removeItem('flowplay_token');
    }
  }

  // Get auth headers
  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  // Generic API call method
  async apiCall(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const config = {
        headers: this.getAuthHeaders(),
        ...options
      };

      const response = await fetch(url, config);
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      
      let data;
      if (isJson) {
        data = await response.json();
      } else {
        // Handle non-JSON responses (like HTML error pages)
        const text = await response.text();
        if (response.status === 413) {
          throw new Error('File quá lớn! Vui lòng chọn file nhỏ hơn.');
        } else if (response.status >= 400) {
          throw new Error(`Server error: ${response.status} - ${text.slice(0, 100)}`);
        }
        data = { message: text };
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }

  // Auth methods
  async register(userData) {
    const response = await this.apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async login(credentials) {
    const response = await this.apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  logout() {
    this.setToken(null);
    // Trigger logout event
    window.dispatchEvent(new CustomEvent('userLogout'));
  }

  // User methods
  async getProfile() {
    return await this.apiCall('/user/profile');
  }

  async updateProfile(profileData) {
    return await this.apiCall('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  // Track methods
  async uploadTrack(formData) {
    try {
      const url = `${this.baseURL}/tracks/upload`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        body: formData // Don't set Content-Type for FormData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Upload failed: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  }

  async getMyTracks() {
    return await this.apiCall('/tracks/my-tracks');
  }

  // Alias for getUserTracks
  async getUserTracks() {
    return await this.getMyTracks();
  }

  async getPublicTracks(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return await this.apiCall(`/tracks/public?${queryString}`);
  }

  async deleteTrack(trackId) {
    try {
      const response = await fetch(`${this.baseURL}/tracks/${trackId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Delete failed: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Delete track failed:', error);
      throw error;
    }
  }

  getStreamUrl(trackId) {
    // Remove mongo_ prefix if exists
    const cleanId = trackId.startsWith('mongo_') ? trackId.substring(6) : trackId;
    const baseUrl = `${this.baseURL}/tracks/${cleanId}/stream`;
    if (this.token) {
      return `${baseUrl}?token=${encodeURIComponent(this.token)}`;
    }
    return baseUrl;
  }

  // Health check
  async healthCheck() {
    return await this.apiCall('/health');
  }

  // Check if user is logged in
  isLoggedIn() {
    return !!this.token;
  }

  // Decode JWT token (simple decode, no verification)
  getUserFromToken() {
    if (!this.token) return null;
    
    try {
      const payload = this.token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded;
    } catch (error) {
      console.error('Token decode error:', error);
      return null;
    }
  }
}

// Global API client instance
window.apiClient = new ApiClient();

// Auto-login check on page load
document.addEventListener('DOMContentLoaded', async () => {
  if (window.apiClient.isLoggedIn()) {
    try {
      // Verify token is still valid
      await window.apiClient.getProfile();
      console.log('✅ User authenticated');
      
      // Trigger login event
      window.dispatchEvent(new CustomEvent('userLogin'));
    } catch (error) {
      console.log('❌ Token expired, logging out');
      window.apiClient.logout();
    }
  }
});

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiClient;
}
