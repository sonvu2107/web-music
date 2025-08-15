// online-search.js - Tìm kiếm & thêm nhạc online (Free Music + YouTube + MongoDB Public)
import { toast } from './utils.js';
import { data, idb } from './storage.js';
import { youtubeAPI } from './youtube-api.js';
import { freemiumMusic } from './freemium-music.js';

let currentUser = null;

// Function để tạo audio blob từ frequency
async function generateAudioBlob(frequency, duration, waveType = 'sine') {
  const sampleRate = 44100;
  const samples = sampleRate * duration;
  const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate });
  
  const audioBuffer = audioContext.createBuffer(1, samples, sampleRate);
  const channelData = audioBuffer.getChannelData(0);
  
  // Generate wave
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    
    switch (waveType) {
      case 'sine':
        sample = Math.sin(2 * Math.PI * frequency * t);
        break;
      case 'square':
        sample = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1;
        break;
      case 'sawtooth':
        sample = 2 * (t * frequency - Math.floor(t * frequency + 0.5));
        break;
      default:
        sample = Math.sin(2 * Math.PI * frequency * t);
    }
    
    // Apply envelope to avoid clicks
    const envelope = Math.min(1, Math.min(i / (sampleRate * 0.1), (samples - i) / (sampleRate * 0.1)));
    channelData[i] = sample * envelope * 0.3; // 30% volume
  }
  
  // Convert to WAV blob
  const wavArrayBuffer = audioBufferToWav(audioBuffer);
  return new Blob([wavArrayBuffer], { type: 'audio/wav' });
}

// Convert AudioBuffer to WAV format
function audioBufferToWav(buffer) {
  const length = buffer.length;
  const arrayBuffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(arrayBuffer);
  
  // WAV header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length * 2, true);
  
  // Convert samples
  const channelData = buffer.getChannelData(0);
  let offset = 44;
  for (let i = 0; i < length; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, sample * 0x7FFF, true);
    offset += 2;
  }
  
  return arrayBuffer;
}

export function showOnlineSearchModal(user) {
  currentUser = user;
  const modal = document.getElementById('online-search-modal');
  const searchInput = document.getElementById('online-search-input');
  const searchResults = document.getElementById('online-search-results');
  const searchBtn = document.getElementById('btn-online-search-go');
  const closeBtn = document.getElementById('btn-close-online-search');
  
  modal.classList.add('show');
  searchInput.focus();
  
  closeBtn.onclick = () => {
    modal.classList.remove('show');
    searchResults.innerHTML = '';
    searchInput.value = '';
  };
  
  const performSearch = async () => {
    const query = searchInput.value.trim();
    if (!query) return;
    
    console.log('Starting search for:', query);
    
    // Check if URL is audio file
    const isAudioUrl = (url) => {
      const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
      return audioExtensions.some(ext => url.toLowerCase().includes(ext));
    };
    
    // Kiểm tra nếu input là direct audio URL
    if (isAudioUrl(query)) {
      console.log('Detected audio URL:', query);
      await searchByDirectUrl(query);
      return;
    }
    
    // Kiểm tra nếu input là YouTube URL
    const videoId = youtubeAPI.parseVideoId(query);
    if (videoId) {
      console.log('Detected YouTube URL with ID:', videoId);
      await searchByVideoUrl(query, videoId);
      return;
    }
    
    // Tìm kiếm bình thường
    searchResults.innerHTML = '<p>🎵 Đang tìm nhạc từ nhiều nguồn...</p>';
    
    try {
      console.log('Calling freemiumMusic.advancedSearch...');
      // Tìm nhạc miễn phí với advanced search
      const freeResults = await freemiumMusic.advancedSearch(query, {
        maxResults: 4,
        includeGenerated: true
      });
      console.log('Advanced free music results:', freeResults);
      
      // Search MongoDB public tracks if available
      let mongoResults = [];
      if (window.apiClient) {
        try {
          console.log('Searching MongoDB public tracks...');
          const mongoResponse = await window.apiClient.getPublicTracks({
            search: query,
            limit: 10
          });
          mongoResults = (mongoResponse.tracks || []).map(track => ({
            id: `mongo_${track._id}`,
            title: track.title,
            artist: track.artist,
            album: track.album || '',
            duration: track.duration,
            source: 'mongodb',
            sourceData: {
              trackId: track._id,
              uploadedBy: track.uploadedBy?.displayName || track.uploadedBy?.username
            },
            url: window.apiClient.getStreamUrl(track._id),
            thumbnail: track.thumbnail || ''
          }));
          console.log('MongoDB public results:', mongoResults);
        } catch (mongoError) {
          console.warn('MongoDB search failed:', mongoError);
        }
      }
      
      // Thêm kết quả YouTube nếu có
      let allResults = [...mongoResults, ...freeResults];
      
      try {
        console.log('Also searching YouTube...');
        const youtubeResults = await youtubeAPI.search(query, 2);
        allResults = [...mongoResults, ...freeResults, ...youtubeResults];
        console.log('Combined results:', allResults);
      } catch (ytError) {
        console.warn('YouTube search failed, using only free music:', ytError);
      }
      
      if (!allResults || allResults.length === 0) {
        searchResults.innerHTML = '<p style="text-align:center; color:var(--muted);">Không tìm thấy kết quả nào</p>';
        return;
      }

      displaySearchResults(allResults);
      
    } catch (error) {
      console.error('Music search error:', error);
      searchResults.innerHTML = `
        <div style="text-align:center; padding:20px; color:var(--danger);">
          <p>❌ Lỗi tìm kiếm nhạc</p>
          <p style="font-size:13px; color:var(--muted);">${error.message}</p>
          <p style="font-size:12px; color:var(--muted);">Thử lại hoặc kiểm tra kết nối mạng</p>
        </div>
      `;
    }
  };
  
  // Search by direct audio URL
  const searchByDirectUrl = async (url) => {
    searchResults.innerHTML = '<p>🎵 Đang kiểm tra link nhạc...</p>';
    
    try {
      const results = await freemiumMusic.searchByUrl(url);
      
      if (results && results.length > 0) {
        displaySearchResults(results);
        toast('✅ Tìm thấy nhạc từ link!');
      } else {
        searchResults.innerHTML = `
          <div style="text-align:center; padding:20px; color:var(--danger);">
            <p>❌ Không thể truy cập link nhạc</p>
            <p style="font-size:13px; color:var(--muted);">Kiểm tra URL có đúng và có thể truy cập không</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('Direct URL search error:', error);
      searchResults.innerHTML = `
        <div style="text-align:center; padding:20px; color:var(--danger);">
          <p>❌ Lỗi kiểm tra link</p>
          <p style="font-size:13px; color:var(--muted);">${error.message}</p>
        </div>
      `;
    }
  };
  
  // Thêm isAudioUrl vào window cho dễ truy cập
  window.isAudioUrl = (url) => {
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
    return audioExtensions.some(ext => url.toLowerCase().includes(ext));
  };
  
  // Tìm kiếm bằng YouTube URL trực tiếp
  const searchByVideoUrl = async (url, videoId) => {
    searchResults.innerHTML = '<p>Đang lấy thông tin video từ URL...</p>';
    
    try {
      const videoInfo = await youtubeAPI.getVideoInfo(url);
      const result = {
        id: `yt_${videoId}`,
        videoId: videoId,
        url: url,
        source: 'YouTube',
        ...videoInfo
      };
      
      displaySearchResults([result]);
      
    } catch (error) {
      console.error('Video URL error:', error);
      searchResults.innerHTML = `
        <div style="text-align:center; padding:20px; color:var(--danger);">
          <p>❌ Không thể lấy thông tin video</p>
          <p style="font-size:13px; color:var(--muted);">Kiểm tra URL YouTube có đúng không</p>
        </div>
      `;
    }
  };
  
  // Hiển thị kết quả tìm kiếm
  const displaySearchResults = (results) => {
    searchResults.innerHTML = results.map((result, index) => {
      let sourceIcon, sourceLabel, canPlay;
      
      switch (result.source) {
        case 'mongodb':
          sourceIcon = '☁️';
          sourceLabel = `FlowPlay User (by ${result.sourceData?.uploadedBy})`;
          canPlay = true;
          break;
        case 'freemium':
        case 'generated':
        case 'alternative':
          sourceIcon = '🎵';
          sourceLabel = 'Free Music';
          canPlay = true;
          break;
        case 'jamendo':
          sourceIcon = '🎵';
          sourceLabel = 'Jamendo';
          canPlay = true;
          break;
        case 'archive':
          sourceIcon = '📚';
          sourceLabel = 'Internet Archive';
          canPlay = true;
          break;
        case 'pixabay':
          sourceIcon = '🎵';
          sourceLabel = 'Pixabay Music';
          canPlay = true;
          break;
        case 'url':
          sourceIcon = '🔗';
          sourceLabel = 'Direct Link';
          canPlay = true;
          break;
        case 'youtube':
        default:
          sourceIcon = '📺';
          sourceLabel = 'YouTube';
          canPlay = false;
          break;
      }
      
      const isRealAudio = result.url && result.url !== 'generated://audio' && !result.url.includes('youtube.com');
      if (isRealAudio) canPlay = true;
      
      return `
      <div style="padding:12px; border:1px solid var(--bg-soft); border-radius:12px; margin-bottom:10px; display:flex; gap:12px; align-items:center;">
        <img 
          src="${result.thumbnail || 'https://via.placeholder.com/80x60/6366f1/fff?text=🎵'}" 
          alt="thumbnail" 
          style="width:80px; height:60px; border-radius:8px; object-fit:cover; background:var(--bg-soft);" 
          onerror="this.src='https://via.placeholder.com/80x60/6366f1/fff?text=🎵'"
        />
        <div style="flex:1; min-width:0;">
          <div style="font-weight:600; margin-bottom:4px; line-height:1.2;">${result.title}</div>
          <div style="color:var(--muted); font-size:13px; margin-bottom:4px;">
            ${result.artist} • ${formatDuration(result.duration)} • ${result.viewCount?.toLocaleString() || 'N/A'} plays
          </div>
          <div style="color:var(--brand); font-size:12px; display:flex; align-items:center; gap:4px;">
            ${sourceIcon} ${sourceLabel} ${canPlay ? '• ✅ Có thể phát' : '• ⚠️ Cần xử lý'} ${isRealAudio ? '• 🎧 Real Audio' : ''}
          </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:6px; align-items:end;">
          ${canPlay ? `<button class="btn ghost" onclick="previewTrack(${index})" title="Nghe thử" style="padding:6px 12px; font-size:12px;">▶ Nghe</button>` : ''}
          <button class="btn secondary" onclick="addOnlineTrack(${index})" data-loading="false" style="padding:6px 12px; font-size:12px;">+ Thêm</button>
        </div>
      </div>
    `;
    }).join('');
    
    // Lưu kết quả để dùng sau
    window.currentSearchResults = results;
  };
  
  searchBtn.onclick = performSearch;
  searchInput.onkeypress = (e) => {
    if (e.key === 'Enter') performSearch();
  };
  
  // Global function để nghe thử
  window.previewTrack = async (resultIndex) => {
    const result = window.currentSearchResults[resultIndex];
    
    try {
      let audioUrl = result.url;
      let sourceLabel = '';
      
      if (result.source === 'mongodb') {
        // MongoDB track - use stream URL
        audioUrl = window.apiClient.getStreamUrl(result.sourceData.trackId);
        sourceLabel = `☁️ FlowPlay User (by ${result.sourceData.uploadedBy})`;
      } else if (result.source === 'freemium') {
        // Freemium music
        sourceLabel = '🎵 Free Music Preview';
        
        // Nếu là generated audio, tạo blob
        if (audioUrl === 'generated://audio') {
          const audioBlob = await freemiumMusic.generateAudioForTrack(result);
          audioUrl = URL.createObjectURL(audioBlob);
        }
      } else {
        // Other sources
        sourceLabel = '🎵 Music Preview';
      }
      
      const previewAudio = new Audio(audioUrl);
      previewAudio.volume = 0.7;
      if (result.source !== 'mongodb') {
        previewAudio.currentTime = 30; // Bắt đầu từ 30s cho non-MongoDB
      }
      
      const previewModal = document.createElement('div');
      previewModal.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      `;
      
      previewModal.innerHTML = `
        <div style="background: var(--card); border-radius: 16px; padding: 20px; max-width: 400px; width: 90%;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin: 0; color: var(--text);">🎵 Preview: ${result.title}</h3>
            <button id="close-preview" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text);">×</button>
          </div>
          <div style="text-align: center; padding: 20px;">
            <img src="${result.thumbnail || 'https://via.placeholder.com/120x120/6366f1/fff?text=🎵'}" alt="thumbnail" style="width: 120px; height: 120px; border-radius: 12px; object-fit: cover; margin-bottom: 16px;" />
            <div style="margin-bottom: 16px;">
              <div style="font-weight: 600; margin-bottom: 4px;">${result.title}</div>
              <div style="color: var(--muted); font-size: 14px;">${result.artist}</div>
            </div>
            <div style="display: flex; gap: 12px; justify-content: center;">
              <button id="preview-play" class="btn secondary" style="padding: 8px 16px;">▶ Phát</button>
              <button id="preview-pause" class="btn ghost" style="padding: 8px 16px;">⏸ Tạm dừng</button>
              <button id="add-to-player" class="btn primary" style="padding: 8px 16px;">➕ Thêm vào Player</button>
            </div>
          </div>
          <p style="margin-top: 12px; color: var(--muted); font-size: 13px; text-align: center;">
            ${sourceLabel} • Bấm bên ngoài để đóng
          </p>
        </div>
      `;
      
      document.body.appendChild(previewModal);
        
        // Event handlers
        const closePreview = () => {
          previewAudio.pause();
          document.body.removeChild(previewModal);
          if (audioUrl.startsWith('blob:')) {
            URL.revokeObjectURL(audioUrl);
          }
        };
        
        previewModal.querySelector('#close-preview').onclick = closePreview;
        previewModal.querySelector('#preview-play').onclick = () => previewAudio.play();
        previewModal.querySelector('#preview-pause').onclick = () => previewAudio.pause();
        
        // Add to player functionality
        const addToPlayerBtn = previewModal.querySelector('#add-to-player');
        if (addToPlayerBtn) {
          addToPlayerBtn.onclick = () => {
            // Add to main player
            if (window.player && window.player.addAndPlayTrack) {
              const playableTrack = {
                id: result.id,
                title: result.title,
                artist: result.artist,
                album: result.album || '',
                duration: result.duration,
                sourceType: result.source,
                url: audioUrl,
                mongoId: result.sourceData?.trackId
              };
              window.player.addAndPlayTrack(playableTrack);
              closePreview();
              if (window.toast) {
                window.toast(`🎵 Đã thêm vào player: ${result.title}`);
              }
            }
          };
        }
        
        previewModal.onclick = (e) => {
          if (e.target === previewModal) closePreview();
        };
        
        // Auto-play and auto-close
        previewAudio.play();
        setTimeout(closePreview, result.source === 'mongodb' ? 60000 : 30000);
        
    } catch (error) {
      console.error('Preview error:', error);
      if (window.toast) {
        window.toast('Không thể phát preview');
      }
    }
  };
  
  // Global function để thêm track thực sự vào thư viện
  window.addOnlineTrack = async (resultIndex) => {
    const result = window.currentSearchResults[resultIndex];
    const btn = document.querySelectorAll('#online-search-results button')[resultIndex];
    
    if (btn.dataset.loading === 'true') return;
    
    btn.dataset.loading = 'true';
    btn.textContent = 'Đang thêm...';
    btn.disabled = true;
    
    try {
      // Tạo track object từ search result
      const track = {
        id: result.id,
        title: result.title,
        artist: result.artist,
        album: result.genre || '',
        duration: result.duration,
        thumbnail: result.thumbnail,
        createdAt: Date.now(),
        sourceType: result.source, // 'freemium' hoặc 'youtube'
        source: result.source,
        url: result.url,
        description: result.description,
        viewCount: result.viewCount,
        likeCount: result.likeCount
      };
      
      // Thêm thông tin específic cho từng loại
      if (result.source === 'mongodb') {
        // MongoDB tracks are already uploaded, just add reference
        track.mongoId = result.sourceData.trackId;
        track.uploadedBy = result.sourceData.uploadedBy;
      } else if (result.source === 'freemium') {
        track.genre = result.genre;
        track.searchQuery = result.searchQuery;
      } else if (result.source === 'youtube') {
        track.videoId = result.videoId;
      }
      
      console.log('Adding track:', track); // Debug log
      
      // Lưu track vào IndexedDB
      await idb.putTrack(track);
      console.log('Track saved to IndexedDB'); // Debug log
      
      // Thêm vào thư viện của user
      const userData = data.get(currentUser);
      if (!userData.library.includes(track.id)) {
        userData.library.push(track.id);
        data.set(currentUser, userData);
        console.log('Track added to user library'); // Debug log
      }
      
      // Cập nhật UI
      btn.textContent = '✓ Đã thêm';
      btn.style.background = 'var(--brand)';
      btn.style.color = '#fff';
      
      toast(`✅ Đã thêm "${result.title}" vào thư viện! ${getSourceMessage(result.source)}`);
      
      // Trigger library refresh if possible
      if (window.currentUI && window.currentUI.renderLibrary) {
        setTimeout(() => window.currentUI.renderLibrary(), 500);
      }
      
    } catch (error) {
      console.error('Error adding track:', error);
      btn.textContent = 'Lỗi';
      btn.style.background = 'var(--danger)';
      toast('Có lỗi khi thêm bài hát');
    }
    
    setTimeout(() => {
      btn.disabled = false;
      btn.dataset.loading = 'false';
    }, 1000);
  };
  
  // Get appropriate message for each source
  const getSourceMessage = (source) => {
    const messages = {
      'mongodb': '☁️ Từ FlowPlay Community - Phát được!',
      'freemium': '🎵 Có thể phát ngay!',
      'alternative': '🎵 Audio có thể phát!',
      'jamendo': '🎵 Từ Jamendo - Phát được!',
      'archive': '📚 Từ Internet Archive - Phát được!',
      'pixabay': '🎵 Từ Pixabay - Phát được!',
      'url': '🔗 Từ link trực tiếp - Phát được!',
      'generated': '🎵 Âm thanh được tổng hợp!',
      'youtube': '📺 YouTube - Âm thanh tổng hợp!'
    };
    return messages[source] || '🎵 Âm thanh được xử lý!';
  };
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
