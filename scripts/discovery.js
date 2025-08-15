// discovery.js - Load and display public tracks in home view
class DiscoveryManager {
  constructor() {
    this.discoveryContainer = document.getElementById('discovery-tracks');
    this.refreshBtn = document.getElementById('btn-refresh-discovery');
    this.init();
  }

  init() {
    // Load discovery tracks when page loads
    this.loadDiscoveryTracks();
    
    // Bind refresh button
    if (this.refreshBtn) {
      this.refreshBtn.onclick = () => this.loadDiscoveryTracks();
    }
    
    // Auto refresh every 5 minutes
    setInterval(() => this.loadDiscoveryTracks(), 5 * 60 * 1000);
  }

  async loadDiscoveryTracks() {
    if (!this.discoveryContainer) return;
    
    try {
      this.discoveryContainer.innerHTML = '<div class="loading-message">Đang tải nhạc từ cộng đồng...</div>';
      
      // Check if API client is available
      if (!window.apiClient) {
        this.showEmptyState('Cần kết nối MongoDB để xem nhạc từ cộng đồng');
        return;
      }
      
      // Fetch public tracks
      const response = await window.apiClient.getPublicTracks({
        limit: 12,
        page: 1
      });
      
      const tracks = response.tracks || [];
      
      if (tracks.length === 0) {
        this.showEmptyState('Chưa có nhạc công khai nào từ cộng đồng');
        return;
      }
      
      // Display tracks
      this.displayTracks(tracks);
      
    } catch (error) {
      console.error('Failed to load discovery tracks:', error);
      this.showEmptyState('Không thể tải nhạc từ cộng đồng');
    }
  }

  displayTracks(tracks) {
    const tracksHTML = tracks.map(track => `
      <div class="discovery-track">
        <div class="discovery-track-info">
          <div class="discovery-track-title">${track.title}</div>
          <div class="discovery-track-artist">${track.artist}</div>
          <div class="discovery-track-meta">
            <span>${this.formatDuration(track.duration)}</span>
            <span class="discovery-track-plays">🎵 ${track.playCount || 0} lượt phát</span>
            <span class="discovery-track-uploader">
              bởi ${track.uploadedBy?.displayName || track.uploadedBy?.username}
            </span>
          </div>
        </div>
        <div class="discovery-track-actions">
          <button class="btn btn-sm btn-primary" onclick="discoveryManager.playTrack('${track._id}')" title="Phát ngay">
            ▶️ Phát
          </button>
          <button class="btn btn-sm btn-secondary" onclick="discoveryManager.addToLibrary('${track._id}')" title="Thêm vào thư viện">
            ➕ Thêm
          </button>
        </div>
      </div>
    `).join('');
    
    this.discoveryContainer.innerHTML = tracksHTML;
  }

  showEmptyState(message) {
    this.discoveryContainer.innerHTML = `
      <div class="empty-discovery">
        <h3>🎵 ${message}</h3>
        <p>Hãy đăng nhập và tải nhạc public để chia sẻ với cộng đồng!</p>
      </div>
    `;
  }

  async playTrack(trackId) {
    console.log('🎵 Discovery playTrack called with ID:', trackId);
    try {
      // Get track info first
      const response = await window.apiClient.getPublicTracks({
        search: '',
        limit: 100
      });
      
      console.log('📊 Public tracks response:', response);
      
      const track = response.tracks.find(t => t._id === trackId);
      if (!track) {
        throw new Error('Track not found');
      }

      console.log('🎵 Found track:', track);

      // Create track object for player
      const streamUrl = window.apiClient.getStreamUrl(trackId);
      console.log('🔗 Stream URL:', streamUrl);
      
      const playableTrack = {
        id: `mongo_${trackId}`,
        title: track.title,
        artist: track.artist,
        album: track.album || '',
        duration: track.duration,
        sourceType: 'mongodb',
        url: streamUrl,
        mongoId: trackId
      };

      console.log('🎧 Playable track:', playableTrack);

      // Use main player to play track
      if (window.player && window.player.addAndPlayTrack) {
        console.log('🎵 Using main player');
        await window.player.addAndPlayTrack(playableTrack);
        if (window.toast) {
          window.toast(`🎵 Đang phát: ${track.title} - ${track.artist}`);
        }
      } else {
        console.log('⚠️ Main player not available, using fallback');
        // Fallback: direct audio play
        const streamUrl = window.apiClient.getStreamUrl(trackId);
        const audio = new Audio(streamUrl);
        audio.play();
        if (window.toast) {
          window.toast(`🎵 Phát: ${track.title}`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to play track:', error);
      if (window.toast) {
        window.toast('❌ Không thể phát nhạc này');
      }
    }
  }

  async addToLibrary(trackId) {
    console.log('➕ Discovery addToLibrary called with ID:', trackId);
    try {
      // Get track info
      const response = await window.apiClient.getPublicTracks({
        search: '',
        limit: 100
      });
      
      const track = response.tracks.find(t => t._id === trackId);
      if (!track) {
        throw new Error('Track not found');
      }
      
      console.log('📀 Adding track to library:', track);

      // Create local track reference
      const localTrack = {
        id: `mongo_${trackId}`,
        title: track.title,
        artist: track.artist,
        album: track.album || '',
        duration: track.duration,
        createdAt: Date.now(),
        sourceType: 'mongodb',
        source: 'mongodb',
        url: window.apiClient.getStreamUrl(trackId),
        mongoId: trackId,
        uploadedBy: track.uploadedBy?.displayName || track.uploadedBy?.username
      };

      // Add to IndexedDB and user library
      if (window.idb && window.idb.putTrack) {
        await window.idb.putTrack(localTrack);
      } else {
        console.warn('IndexedDB not available, track will only be playable in current session');
      }
      
      if (window.data && window.data.get) {
        const userData = window.data.get(window.currentUser || 'guest');
        if (userData && !userData.library.includes(localTrack.id)) {
          userData.library.push(localTrack.id);
          window.data.set(window.currentUser || 'guest', userData);
        }
      } else {
        console.warn('Data storage not available');
      }
      
      console.log('✅ Track added to library and data updated');

      // Refresh main library
      if (window.currentUI && window.currentUI.renderLibrary) {
        window.currentUI.renderLibrary();
      }

      if (window.toast) {
        window.toast(`✅ Đã thêm "${track.title}" vào thư viện!`);
      }
      
    } catch (error) {
      console.error('❌ Failed to add track to library:', error);
      if (window.toast) {
        window.toast('❌ Không thể thêm nhạc vào thư viện');
      }
    }
  }  formatDuration(seconds) {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

// Initialize discovery manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.discoveryManager = new DiscoveryManager();
});
