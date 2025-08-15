// scripts/mongodb-ui.js - UI components for MongoDB features
class MongoDBUI {
  constructor() {
    this.currentUser = null;
    this.uploadQueue = [];
    this.selectedFile = null;
    this.init();
  }

  init() {
    this.createUploadModal();
    this.createUserProfileModal();
    this.createLibraryView();
    this.bindEvents();
  }

  // Create upload modal
  createUploadModal() {
    const modalHTML = `
      <div id="uploadModal" class="modal-overlay" style="display: none;">
        <div class="modal-content upload-modal">
          <div class="modal-header">
            <h3>🎵 Tải Lên Nhạc Mới</h3>
            <button class="close-btn" onclick="mongoUI.closeModal('uploadModal')">&times;</button>
          </div>
          <div class="modal-body">
            <div class="upload-zone" id="uploadZone">
              <div class="upload-icon">🎵</div>
              <p class="upload-text">Kéo thả file nhạc vào đây</p>
              <p class="upload-subtext">hoặc click để chọn file</p>
              <input type="file" id="audioFileInput" multiple accept="audio/*" style="display: none;">
            </div>
            
            <div class="upload-form" id="uploadForm" style="display: none;">
              <div class="form-group">
                <label for="trackTitle">Tên bài hát *</label>
                <input type="text" id="trackTitle" required>
              </div>
              
              <div class="form-group">
                <label for="trackArtist">Nghệ sĩ *</label>
                <input type="text" id="trackArtist" required>
              </div>
              
              <div class="form-group">
                <label for="trackAlbum">Album</label>
                <input type="text" id="trackAlbum">
              </div>
              
              <div class="form-group">
                <label for="trackGenre">Thể loại</label>
                <select id="trackGenre">
                  <option value="">Chọn thể loại...</option>
                  <option value="pop">Pop</option>
                  <option value="rock">Rock</option>
                  <option value="hip-hop">Hip Hop</option>
                  <option value="jazz">Jazz</option>
                  <option value="classical">Nhạc cổ điển</option>
                  <option value="electronic">Electronic</option>
                  <option value="folk">Dân gian</option>
                  <option value="blues">Blues</option>
                  <option value="country">Country</option>
                  <option value="other">Khác</option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="makePublic">
                  <span class="checkmark"></span>
                  Công khai bài hát này
                </label>
              </div>
              
              <div class="upload-progress" id="uploadProgress" style="display: none;">
                <div class="progress-bar">
                  <div class="progress-fill" id="progressFill"></div>
                </div>
                <span class="progress-text" id="progressText">0%</span>
              </div>
              
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="mongoUI.resetUploadForm()">Hủy</button>
                <button type="button" class="btn btn-primary" id="uploadBtn" onclick="mongoUI.uploadTrack()">Tải Lên</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  // Create user profile modal
  createUserProfileModal() {
    const modalHTML = `
      <div id="userProfileModal" class="modal-overlay" style="display: none;">
        <div class="modal-content profile-modal">
          <div class="modal-header">
            <h3>👤 Hồ Sơ Người Dùng</h3>
            <button class="close-btn" onclick="mongoUI.closeModal('userProfileModal')">&times;</button>
          </div>
          <div class="modal-body">
            <div class="profile-section">
              <div class="profile-avatar">
                <div class="avatar-circle" id="profileAvatar">👤</div>
                <button class="change-avatar-btn" id="changeAvatarBtn">Đổi Avatar</button>
                <input type="file" id="avatarUpload" accept="image/*" style="display: none;">
              </div>
              
              <div class="profile-info">
                <div class="form-group">
                  <label for="profileDisplayName">Tên hiển thị</label>
                  <input type="text" id="profileDisplayName">
                </div>
                
                <div class="form-group">
                  <label for="profileUsername">Tên đăng nhập</label>
                  <input type="text" id="profileUsername" readonly>
                </div>
                
                <div class="form-group">
                  <label for="profileEmail">Email</label>
                  <input type="email" id="profileEmail" readonly>
                </div>
              </div>
            </div>

            <div class="stats-section">
              <h4>📊 Thống Kê</h4>
              <div class="stats-grid">
                <div class="stat-item">
                  <span class="stat-number" id="userTrackCount">0</span>
                  <span class="stat-label">Bài hát đã tải</span>
                </div>
                <div class="stat-item">
                  <span class="stat-number" id="userPlayCount">0</span>
                  <span class="stat-label">Tổng lượt phát</span>
                </div>
                <div class="stat-item">
                  <span class="stat-number" id="userJoinDate">-</span>
                  <span class="stat-label">Thành viên từ</span>
                </div>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn btn-danger" onclick="mongoUI.logout()">Đăng Xuất</button>
              <button type="button" class="btn btn-primary" onclick="mongoUI.updateProfile()">Lưu Thay Đổi</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  // Create library view
  createLibraryView() {
    const libraryHTML = `
      <div id="libraryModal" class="modal-overlay" style="display: none;">
        <div class="modal-content library-modal">
          <div class="modal-header">
            <h3>📚 Thư Viện Của Tôi</h3>
            <div class="library-controls">
              <button class="btn btn-primary" onclick="mongoUI.showModal('uploadModal')">+ Tải Lên</button>
              <button class="close-btn" onclick="mongoUI.closeModal('libraryModal')">&times;</button>
            </div>
          </div>
          <div class="modal-body">
            <div class="library-tabs">
              <button class="tab-btn active" data-tab="my-tracks">Nhạc Của Tôi</button>
              <button class="tab-btn" data-tab="public-tracks">Discover</button>
            </div>
            
            <div class="library-content">
              <div class="tab-content active" id="my-tracks-tab">
                <div class="tracks-header">
                  <h4>Nhạc Bạn Đã Tải Lên</h4>
                  <div class="search-box">
                    <input type="text" placeholder="Tìm kiếm nhạc của bạn..." id="myTracksSearch">
                    <span class="search-icon">🔍</span>
                  </div>
                </div>
                <div class="tracks-list" id="myTracksList">
                  <div class="loading-state">Đang tải nhạc của bạn...</div>
                </div>
              </div>
              
              <div class="tab-content" id="public-tracks-tab">
                <div class="tracks-header">
                  <h4>Khám Phá Âm Nhạc</h4>
                  <div class="discover-controls">
                    <select id="genreFilter">
                      <option value="">Tất Cả Thể Loại</option>
                      <option value="pop">Pop</option>
                      <option value="rock">Rock</option>
                      <option value="hip-hop">Hip Hop</option>
                      <option value="jazz">Jazz</option>
                      <option value="classical">Classical</option>
                      <option value="electronic">Electronic</option>
                    </select>
                    <input type="text" placeholder="Tìm kiếm nhạc công khai..." id="publicTracksSearch">
                  </div>
                </div>
                <div class="tracks-list" id="publicTracksList">
                  <div class="loading-state">Đang tải nhạc công khai...</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', libraryHTML);
  }

  // Bind events
  bindEvents() {
    // Upload zone events
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('audioFileInput');

    if (uploadZone && fileInput) {
      uploadZone.addEventListener('click', () => fileInput.click());
      uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
      });
      uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('drag-over');
      });
      uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        this.handleFileSelect(e.dataTransfer.files);
      });

      fileInput.addEventListener('change', (e) => {
        this.handleFileSelect(e.target.files);
      });
    }

    // Avatar upload events
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    const avatarUpload = document.getElementById('avatarUpload');
    
    if (changeAvatarBtn) {
      changeAvatarBtn.addEventListener('click', () => {
        avatarUpload.click();
      });
    }
    
    if (avatarUpload) {
      avatarUpload.addEventListener('change', (e) => {
        this.handleAvatarUpload(e.target.files[0]);
      });
    }

    // Volume control
    const volumeControl = document.getElementById('prefVolume');
    if (volumeControl) {
      volumeControl.addEventListener('input', (e) => {
        const volumePercent = Math.round(e.target.value * 100);
        const volumeDisplay = document.getElementById('volumeDisplay');
        if (volumeDisplay) {
          volumeDisplay.textContent = `${volumePercent}%`;
        }
      });
    }

    // Library tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        this.switchLibraryTab(tabName);
      });
    });

    // Search functionality
    const myTracksSearch = document.getElementById('myTracksSearch');
    if (myTracksSearch) {
      myTracksSearch.addEventListener('input', () => this.searchMyTracks());
    }

    const publicTracksSearch = document.getElementById('publicTracksSearch');
    if (publicTracksSearch) {
      publicTracksSearch.addEventListener('input', () => this.searchPublicTracks());
    }

    // Genre filter
    const genreFilter = document.getElementById('genreFilter');
    if (genreFilter) {
      genreFilter.addEventListener('change', () => this.filterPublicTracks());
    }

    // Auth events
    window.addEventListener('userLogin', () => {
      this.onUserLogin();
    });
    
    window.addEventListener('userLogout', () => {
      this.onUserLogout();
    });
  }

  // Show modal
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'flex';
      
      if (modalId === 'userProfileModal') {
        this.loadUserProfile();
      } else if (modalId === 'libraryModal') {
        this.loadLibrary();
      }
    }
  }

  // Close modal
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
      
      // Reset upload form when closing upload modal
      if (modalId === 'uploadModal') {
        this.resetUploadForm();
      }
    }
  }

  // Handle file selection
  handleFileSelect(files) {
    if (files.length === 0) return;

    const file = files[0]; // Handle single file for now
    
    // Validate file type
    if (!file.type.startsWith('audio/')) {
      this.showNotification('Vui lòng chọn file nhạc hợp lệ', 'error');
      return;
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      this.showNotification('Kích thước file phải nhỏ hơn 50MB', 'error');
      return;
    }

    // Show upload form
    document.getElementById('uploadZone').style.display = 'none';
    document.getElementById('uploadForm').style.display = 'block';

    // Pre-fill form with file info
    const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
    document.getElementById('trackTitle').value = fileName;
    
    // Store file for upload
    this.selectedFile = file;
  }

  // Reset upload form
  resetUploadForm() {
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('uploadForm').style.display = 'none';
    document.getElementById('uploadProgress').style.display = 'none';
    
    // Reset form fields
    document.getElementById('trackTitle').value = '';
    document.getElementById('trackArtist').value = '';
    document.getElementById('trackAlbum').value = '';
    document.getElementById('trackGenre').value = '';
    document.getElementById('makePublic').checked = false;
    
    // Clear file input
    const fileInput = document.getElementById('audioFileInput');
    if (fileInput) {
      fileInput.value = '';
    }
    
    this.selectedFile = null;
  }

  // Handle avatar upload
  async handleAvatarUpload(file) {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.showNotification('Vui lòng chọn file hình ảnh', 'error');
      return;
    }

    // Validate file size (2MB limit for images)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      this.showNotification('Kích thước ảnh phải nhỏ hơn 2MB', 'error');
      return;
    }

    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Image = e.target.result;
        
        try {
          // Update profile with new avatar
          await window.apiClient.updateProfile({
            avatar: base64Image
          });
          
          // Update UI immediately
          this.updateAvatarUI(base64Image);
          
          this.showNotification('Avatar đã được cập nhật!', 'success');
          
        } catch (error) {
          console.error('Avatar update error:', error);
          this.showNotification('Không thể cập nhật avatar', 'error');
        }
      };
      
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error('Avatar upload error:', error);
      this.showNotification('Lỗi khi upload avatar', 'error');
    }
  }

  // Update avatar UI
  updateAvatarUI(imageUrl) {
    const profileAvatar = document.getElementById('profileAvatar');
    const headerAvatar = document.getElementById('avatar');
    
    if (profileAvatar) {
      profileAvatar.style.backgroundImage = `url(${imageUrl})`;
      profileAvatar.style.backgroundSize = 'cover';
      profileAvatar.style.backgroundPosition = 'center';
      profileAvatar.textContent = '';
    }
    
    if (headerAvatar) {
      headerAvatar.style.backgroundImage = `url(${imageUrl})`;
      headerAvatar.style.backgroundSize = 'cover';
      headerAvatar.style.backgroundPosition = 'center';
      headerAvatar.textContent = '';
    }
  }

  // Upload track
  async uploadTrack() {
    if (!this.selectedFile) {
      this.showNotification('Chưa chọn file', 'error');
      return;
    }

    const title = document.getElementById('trackTitle').value.trim();
    const artist = document.getElementById('trackArtist').value.trim();
    
    if (!title || !artist) {
      this.showNotification('Tên bài hát và Nghệ sĩ là bắt buộc', 'error');
      return;
    }

    try {
      // Show progress
      const progressEl = document.getElementById('uploadProgress');
      const uploadBtn = document.getElementById('uploadBtn');
      
      progressEl.style.display = 'block';
      uploadBtn.disabled = true;
      uploadBtn.textContent = 'Đang tải...';

      // Prepare form data
      const formData = new FormData();
      formData.append('audio', this.selectedFile);
      formData.append('title', title);
      formData.append('artist', artist);
      formData.append('album', document.getElementById('trackAlbum').value.trim());
      formData.append('genre', document.getElementById('trackGenre').value);
      formData.append('duration', Math.floor(180)); // Will get actual duration from server
      formData.append('isPublic', document.getElementById('makePublic').checked);

      // Upload to server
      const result = await window.apiClient.uploadTrack(formData, (progress) => {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill) {
          progressFill.style.width = `${progress}%`;
        }
        if (progressText) {
          progressText.textContent = `${Math.round(progress)}%`;
        }
      });
      
      this.showNotification('Tải nhạc thành công!', 'success');
      this.closeModal('uploadModal');
      
      // Refresh library if open
      if (document.getElementById('libraryModal').style.display !== 'none') {
        this.loadLibrary();
      }
      
      // Refresh main library view to show new MongoDB track
      if (window.currentUI && window.currentUI.renderLibrary) {
        window.currentUI.renderLibrary();
      }
      
    } catch (error) {
      console.error('Upload failed:', error);
      this.showNotification(error.message || 'Tải lên thất bại', 'error');
    } finally {
      const uploadBtn = document.getElementById('uploadBtn');
      uploadBtn.disabled = false;
      uploadBtn.textContent = 'Tải Lên';
    }
  }

  // Load user profile
  async loadUserProfile() {
    try {
      const response = await window.apiClient.getProfile();
      const user = response.user;
      
      // Fill profile form
      const displayNameEl = document.getElementById('profileDisplayName');
      const usernameEl = document.getElementById('profileUsername');
      const emailEl = document.getElementById('profileEmail');
      
      if (displayNameEl) displayNameEl.value = user.displayName || '';
      if (usernameEl) usernameEl.value = user.username || '';
      if (emailEl) emailEl.value = user.email || '';
      
      // Fill preferences
      const themeEl = document.getElementById('prefTheme');
      const volumeEl = document.getElementById('prefVolume');
      const shuffleEl = document.getElementById('prefShuffle');
      
      if (themeEl) themeEl.value = user.preferences?.theme || 'dark';
      if (volumeEl) volumeEl.value = user.preferences?.volume || 0.8;
      if (shuffleEl) shuffleEl.checked = user.preferences?.shuffle || false;
      
      // Update volume display
      const volumePercent = Math.round((user.preferences?.volume || 0.8) * 100);
      const volumeDisplayEl = document.getElementById('volumeDisplay');
      if (volumeDisplayEl) volumeDisplayEl.textContent = `${volumePercent}%`;
      
      // Load avatar if exists
      const profileAvatar = document.getElementById('profileAvatar');
      if (user.avatar && profileAvatar) {
        this.updateAvatarUI(user.avatar);
      } else if (profileAvatar) {
        profileAvatar.textContent = user.displayName ? 
          user.displayName.charAt(0).toUpperCase() : 
          user.username.charAt(0).toUpperCase();
      }
      
      // Update stats
      const tracks = await window.apiClient.getMyTracks();
      const trackCount = tracks.tracks?.length || 0;
      const totalPlays = tracks.tracks?.reduce((sum, track) => sum + (track.playCount || 0), 0) || 0;
      
      document.getElementById('userTrackCount').textContent = trackCount;
      document.getElementById('userPlayCount').textContent = totalPlays.toLocaleString('vi-VN');
      
      const joinDate = new Date(user.createdAt).toLocaleDateString('vi-VN');
      document.getElementById('userJoinDate').textContent = joinDate;
      
      this.currentUser = user;
      
    } catch (error) {
      console.error('Failed to load profile:', error);
      this.showNotification('Không thể tải hồ sơ', 'error');
    }
  }

  // Update profile
  async updateProfile() {
    try {
      const displayNameEl = document.getElementById('profileDisplayName');
      const themeEl = document.getElementById('prefTheme');
      const volumeEl = document.getElementById('prefVolume');
      const shuffleEl = document.getElementById('prefShuffle');
      
      if (!displayNameEl || !themeEl || !volumeEl || !shuffleEl) {
        throw new Error('Không tìm thấy form elements');
      }
      
      const profileData = {
        displayName: displayNameEl.value.trim(),
        preferences: {
          theme: themeEl.value,
          volume: parseFloat(volumeEl.value),
          shuffle: shuffleEl.checked
        }
      };

      await window.apiClient.updateProfile(profileData);
      this.showNotification('Hồ sơ đã được cập nhật!', 'success');
      
    } catch (error) {
      console.error('Failed to update profile:', error);
      this.showNotification(error.message || 'Không thể cập nhật hồ sơ', 'error');
    }
  }

  // Load library
  async loadLibrary() {
    await this.loadMyTracks();
    await this.loadPublicTracks();
  }

  // Load user's tracks
  async loadMyTracks() {
    try {
      const response = await window.apiClient.getMyTracks();
      const tracks = response.tracks || [];
      
      const tracksList = document.getElementById('myTracksList');
      
      if (tracks.length === 0) {
        tracksList.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🎵</div>
            <p>Chưa có nhạc nào được tải lên</p>
            <button class="btn btn-primary" onclick="mongoUI.showModal('uploadModal')">Upload Your First Track</button>
          </div>
        `;
        return;
      }

      tracksList.innerHTML = tracks.map(track => `
        <div class="track-item" data-track-id="${track._id}">
          <div class="track-info">
            <div class="track-title">${track.title}</div>
            <div class="track-meta">
              ${track.artist} • ${this.formatDuration(track.duration)}
              ${track.album ? ` • ${track.album}` : ''}
              ${track.genre ? ` • ${track.genre}` : ''}
              <span class="track-plays">🎵 ${track.playCount || 0} lượt phát</span>
            </div>
          </div>
          <div class="track-actions">
            <button class="btn btn-sm" onclick="mongoUI.playTrack('${track._id}')" title="Phát nhạc">▶️</button>
            <button class="btn btn-sm" onclick="mongoUI.editTrack('${track._id}')" title="Chỉnh sửa">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="mongoUI.deleteTrack('${track._id}')" title="Xóa">🗑️</button>
          </div>
        </div>
      `).join('');
      
    } catch (error) {
      console.error('Failed to load tracks:', error);
      document.getElementById('myTracksList').innerHTML = `
        <div class="error-state">
          <p>Không thể tải nhạc của bạn</p>
          <button class="btn btn-secondary" onclick="mongoUI.loadMyTracks()">Thử lại</button>
        </div>
      `;
    }
  }

  // Load public tracks
  async loadPublicTracks() {
    try {
      const response = await window.apiClient.getPublicTracks();
      const tracks = response.tracks || [];
      
      const tracksList = document.getElementById('publicTracksList');
      
      if (tracks.length === 0) {
        tracksList.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🌍</div>
            <p>Chưa có nhạc công khai</p>
          </div>
        `;
        return;
      }

      tracksList.innerHTML = tracks.map(track => `
        <div class="track-item" data-track-id="${track._id}">
          <div class="track-info">
            <div class="track-title">${track.title}</div>
            <div class="track-meta">
              ${track.artist} • ${this.formatDuration(track.duration)}
              ${track.album ? ` • ${track.album}` : ''}
              <span class="track-plays">🎵 ${track.playCount || 0} lượt phát</span>
              <span class="track-uploader">bởi ${track.uploadedBy?.displayName || track.uploadedBy?.username}</span>
            </div>
          </div>
          <div class="track-actions">
            <button class="btn btn-sm" onclick="mongoUI.playPublicTrack('${track._id}')" title="Phát nhạc">▶️</button>
            <button class="btn btn-sm" onclick="mongoUI.addPublicToLibrary('${track._id}')" title="Thêm vào thư viện">➕</button>
          </div>
        </div>
      `).join('');
      
    } catch (error) {
      console.error('Failed to load public tracks:', error);
      document.getElementById('publicTracksList').innerHTML = `
        <div class="error-state">
          <p>Không thể tải nhạc công khai</p>
          <button class="btn btn-secondary" onclick="mongoUI.loadPublicTracks()">Thử lại</button>
        </div>
      `;
    }
  }

  // Search my tracks
  searchMyTracks() {
    const searchTerm = document.getElementById('myTracksSearch').value.toLowerCase();
    const trackItems = document.querySelectorAll('#myTracksList .track-item');
    
    trackItems.forEach(item => {
      const title = item.querySelector('.track-title').textContent.toLowerCase();
      const meta = item.querySelector('.track-meta').textContent.toLowerCase();
      const isVisible = title.includes(searchTerm) || meta.includes(searchTerm);
      
      item.style.display = isVisible ? 'flex' : 'none';
    });
  }

  // Search public tracks
  searchPublicTracks() {
    const searchTerm = document.getElementById('publicTracksSearch').value.toLowerCase();
    const trackItems = document.querySelectorAll('#publicTracksList .track-item');
    
    trackItems.forEach(item => {
      const title = item.querySelector('.track-title').textContent.toLowerCase();
      const meta = item.querySelector('.track-meta').textContent.toLowerCase();
      const isVisible = title.includes(searchTerm) || meta.includes(searchTerm);
      
      item.style.display = isVisible ? 'flex' : 'none';
    });
  }

  // Filter public tracks by genre
  filterPublicTracks() {
    const selectedGenre = document.getElementById('genreFilter').value.toLowerCase();
    const trackItems = document.querySelectorAll('#publicTracksList .track-item');
    
    if (!selectedGenre) {
      trackItems.forEach(item => {
        item.style.display = 'flex';
      });
      return;
    }
    
    trackItems.forEach(item => {
      const meta = item.querySelector('.track-meta').textContent.toLowerCase();
      const isVisible = meta.includes(selectedGenre);
      item.style.display = isVisible ? 'flex' : 'none';
    });
  }

  // Play track
  async playTrack(trackId) {
    try {
      const streamUrl = window.apiClient.getStreamUrl(trackId);
      
      // Integration with existing player
      if (window.musicPlayer) {
        window.musicPlayer.loadTrack({
          id: trackId,
          url: streamUrl,
          source: 'mongodb'
        });
      }
    } catch (error) {
      console.error('Failed to play track:', error);
      this.showNotification('Không thể phát nhạc', 'error');
    }
  }

  // Edit track
  async editTrack(trackId) {
    try {
      // Get track details
      const response = await window.apiClient.getMyTracks();
      const track = response.tracks.find(t => t._id === trackId);
      
      if (!track) {
        this.showNotification('Không tìm thấy bài hát', 'error');
        return;
      }

      // Create edit modal
      const editModal = document.createElement('div');
      editModal.className = 'modal-overlay';
      editModal.style.display = 'flex';
      editModal.innerHTML = `
        <div class="modal-content edit-track-modal">
          <div class="modal-header">
            <h3>✏️ Chỉnh Sửa Bài Hát</h3>
            <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="editTitle">Tên bài hát *</label>
              <input type="text" id="editTitle" value="${track.title}" required>
            </div>
            
            <div class="form-group">
              <label for="editArtist">Nghệ sĩ *</label>
              <input type="text" id="editArtist" value="${track.artist}" required>
            </div>
            
            <div class="form-group">
              <label for="editAlbum">Album</label>
              <input type="text" id="editAlbum" value="${track.album || ''}">
            </div>
            
            <div class="form-group">
              <label for="editGenre">Thể loại</label>
              <select id="editGenre">
                <option value="">Chọn thể loại...</option>
                <option value="pop" ${track.genre === 'pop' ? 'selected' : ''}>Pop</option>
                <option value="rock" ${track.genre === 'rock' ? 'selected' : ''}>Rock</option>
                <option value="hip-hop" ${track.genre === 'hip-hop' ? 'selected' : ''}>Hip Hop</option>
                <option value="jazz" ${track.genre === 'jazz' ? 'selected' : ''}>Jazz</option>
                <option value="classical" ${track.genre === 'classical' ? 'selected' : ''}>Nhạc cổ điển</option>
                <option value="electronic" ${track.genre === 'electronic' ? 'selected' : ''}>Electronic</option>
                <option value="folk" ${track.genre === 'folk' ? 'selected' : ''}>Dân gian</option>
                <option value="blues" ${track.genre === 'blues' ? 'selected' : ''}>Blues</option>
                <option value="country" ${track.genre === 'country' ? 'selected' : ''}>Country</option>
                <option value="other" ${track.genre === 'other' ? 'selected' : ''}>Khác</option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" id="editPublic" ${track.isPublic ? 'checked' : ''}>
                <span class="checkmark"></span>
                Công khai bài hát này
              </label>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Hủy</button>
              <button type="button" class="btn btn-primary" onclick="mongoUI.updateTrack('${trackId}')">Lưu Thay Đổi</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(editModal);
      
    } catch (error) {
      console.error('Failed to load track for editing:', error);
      this.showNotification('Không thể tải thông tin bài hát', 'error');
    }
  }

  // Update track
  async updateTrack(trackId) {
    try {
      const title = document.getElementById('editTitle').value.trim();
      const artist = document.getElementById('editArtist').value.trim();
      
      if (!title || !artist) {
        this.showNotification('Tên bài hát và Nghệ sĩ là bắt buộc', 'error');
        return;
      }

      const updateData = {
        title,
        artist,
        album: document.getElementById('editAlbum').value.trim(),
        genre: document.getElementById('editGenre').value,
        isPublic: document.getElementById('editPublic').checked
      };

      await window.apiClient.updateTrack(trackId, updateData);
      
      this.showNotification('Bài hát đã được cập nhật!', 'success');
      
      // Close edit modal
      const editModal = document.querySelector('.edit-track-modal').closest('.modal-overlay');
      editModal.remove();
      
      // Refresh tracks list
      this.loadMyTracks();
      
    } catch (error) {
      console.error('Failed to update track:', error);
      this.showNotification('Không thể cập nhật bài hát', 'error');
    }
  }

  // Delete track
  async deleteTrack(trackId) {
    if (!confirm('Bạn có chắc chắn muốn xóa bài hát này không?')) {
      return;
    }

    try {
      await window.apiClient.deleteTrack(trackId);
      this.showNotification('Đã xóa bài hát thành công', 'success');
      
      // Refresh tracks list
      this.loadMyTracks();
      
      // Refresh main library if needed
      if (window.currentUI && window.currentUI.renderLibrary) {
        window.currentUI.renderLibrary();
      }
      
    } catch (error) {
      console.error('Failed to delete track:', error);
      this.showNotification('Không thể xóa bài hát', 'error');
    }
  }

  // Switch library tabs
  switchLibraryTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}-tab`);
    });

    // Load content for active tab
    if (tabName === 'my-tracks') {
      this.loadMyTracks();
    } else if (tabName === 'public-tracks') {
      this.loadPublicTracks();
    }
  }

  // User login handler
  onUserLogin() {
    // Update UI to show logged in state
    console.log('User logged in - updating UI');
  }

  // User logout handler
  onUserLogout() {
    this.currentUser = null;
    // Close any open modals
    this.closeModal('userProfileModal');
    this.closeModal('libraryModal');
  }

  // Logout
  logout() {
    if (!confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      return;
    }
    
    window.apiClient.logout();
    this.showNotification('Đã đăng xuất thành công', 'success');
    this.closeModal('userProfileModal');
    
    // Trigger logout event
    window.dispatchEvent(new CustomEvent('userLogout'));
  }

  // Play public track
  async playPublicTrack(trackId) {
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

      // Create playable track object
      const playableTrack = {
        id: `mongo_${trackId}`,
        title: track.title,
        artist: track.artist,
        album: track.album || '',
        duration: track.duration,
        sourceType: 'mongodb',
        url: window.apiClient.getStreamUrl(trackId),
        mongoId: trackId
      };

      // Use main player
      if (window.player && window.player.addAndPlayTrack) {
        await window.player.addAndPlayTrack(playableTrack);
        this.showNotification(`🎵 Đang phát: ${track.title} - ${track.artist}`, 'success');
      } else if (window.musicPlayer) {
        // Fallback to older player
        window.musicPlayer.loadTrack(playableTrack);
        this.showNotification(`🎵 Đang phát: ${track.title} - ${track.artist}`, 'success');
      } else {
        // Direct audio playback as last resort
        const audio = new Audio(window.apiClient.getStreamUrl(trackId));
        await audio.play();
        this.showNotification(`🎵 Phát: ${track.title}`, 'success');
      }
    } catch (error) {
      console.error('Failed to play public track:', error);
      this.showNotification('Không thể phát nhạc này', 'error');
    }
  }

  // Add public track to library
  async addPublicToLibrary(trackId) {
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

      // Create local track reference
      const localTrack = {
        id: `mongo_${trackId}`,
        title: track.title,
        artist: track.artist,
        album: track.album || '',
        duration: track.duration,
        createdAt: Date.now(),
        sourceType: 'mongodb',
        url: window.apiClient.getStreamUrl(trackId),
        mongoId: trackId,
        uploadedBy: track.uploadedBy?.displayName || track.uploadedBy?.username
      };

      // Add to IndexedDB and user library
      if (window.idb && window.idb.putTrack) {
        await window.idb.putTrack(localTrack);
      }
      
      if (window.data && window.currentUser) {
        const userData = window.data.get(window.currentUser) || { library: [] };
        if (!userData.library.includes(localTrack.id)) {
          userData.library.push(localTrack.id);
          window.data.set(window.currentUser, userData);
        }
      }

      // Refresh main library
      if (window.currentUI && window.currentUI.renderLibrary) {
        window.currentUI.renderLibrary();
      }

      this.showNotification(`✅ Đã thêm "${track.title}" vào thư viện!`, 'success');
      
    } catch (error) {
      console.error('Failed to add track to library:', error);
      this.showNotification('Không thể thêm nhạc vào thư viện', 'error');
    }
  }

  // Show notification
  showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(n => n.remove());

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <span class="notification-text">${message}</span>
      <button class="notification-close">&times;</button>
    `;

    // Add styles if not already present
    if (!document.getElementById('notification-styles')) {
      const styles = document.createElement('style');
      styles.id = 'notification-styles';
      styles.textContent = `
        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #333;
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
          z-index: 10000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          animation: slideIn 0.3s ease-out;
        }
        
        .notification-success {
          background: #10b981;
        }
        
        .notification-error {
          background: #ef4444;
        }
        
        .notification-warning {
          background: #f59e0b;
        }
        
        .notification-close {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 18px;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(styles);
    }

    // Add to page
    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, 5000);

    // Manual close
    notification.querySelector('.notification-close').addEventListener('click', () => {
      if (notification.parentNode) {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    });
  }

  // Format duration helper
  formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Utility method to check if user is logged in
  isLoggedIn() {
    return this.currentUser !== null;
  }

  // Utility method to get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Initialize with error handling
  static init() {
    try {
      if (!window.mongoUI) {
        window.mongoUI = new MongoDBUI();
      }
      return window.mongoUI;
    } catch (error) {
      console.error('Failed to initialize MongoDB UI:', error);
      return null;
    }
  }
}

// Initialize MongoDB UI when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    MongoDBUI.init();
  });
} else {
  MongoDBUI.init();
}