
import { $, $$, formatTime, uid, toast } from './utils.js';
import { idb, data } from './storage.js';
import { youtubePlayer } from './youtube-player.js';
import { freemiumMusic } from './freemium-music.js';

export const Player = () => {
  const audio = $('#audio'); const title = $('#now-title'); const artist = $('#now-artist');
  const playBtn = $('#btn-play'); const playIcon = $('#play-icon');
  const prevBtn = $('#btn-prev'); const nextBtn = $('#btn-next');
  const seek = $('#seek'); const curTimeEl = $('#cur-time'); const durTimeEl = $('#dur-time');
  const volume = $('#volume'); const repeatBtn = $('#btn-repeat'); const shuffleBtn = $('#btn-shuffle');
  let state = { user: null, queue: [], idx: -1, shuffle: false, repeat: 'none', trackURL: null, isYouTube: false };
  
  const loadTrackBlobURL = async (track) => {
    if (track.sourceType === 'builtin' || track.sourceType === 'url' || track.sourceType === 'online') return track.src;
    
    // MongoDB uploaded tracks
    if (track.sourceType === 'mongodb') {
      console.log('Loading MongoDB track:', track);
      if (window.apiClient && track.id) {
        const streamUrl = window.apiClient.getStreamUrl(track.id);
        return streamUrl;
      } else {
        toast('⚠️ Không thể phát nhạc từ database');
        return './assets/demo/demo_440hz.wav';
      }
    }
    
    if (track.sourceType === 'freemium') {
      // Nhạc miễn phí - có thể phát trực tiếp hoặc generate
      console.log('Loading freemium track:', track);
      
      if (track.url && track.url !== 'generated://audio') {
        // URL thật từ free music source
        return track.url;
      } else {
        // Generate audio cho track này
        try {
          const audioBlob = await freemiumMusic.generateAudioForTrack(track);
          if (state.trackURL) URL.revokeObjectURL(state.trackURL);
          state.trackURL = URL.createObjectURL(audioBlob);
          return state.trackURL;
        } catch (error) {
          console.error('Error generating audio:', error);
          toast('⚠️ Không thể tạo nhạc cho track này');
          return './assets/demo/demo_440hz.wav';
        }
      }
    }
    
    if (track.sourceType === 'youtube') {
      // Sử dụng YouTube player simulation
      console.log('Loading YouTube track:', track);
      const success = await youtubePlayer.loadTrack(track.videoId, track.duration);
      if (success) {
        state.isYouTube = true;
        setupYouTubeEvents();
        return 'youtube://loaded'; // Special indicator
      } else {
        toast('⚠️ Không thể phát nhạc YouTube');
        return './assets/demo/demo_440hz.wav'; // Fallback
      }
    }
    
    if (track.sourceType === 'file') { 
      const rec = await idb.getBlob(track.id); 
      if (rec?.blob) { 
        if (state.trackURL) URL.revokeObjectURL(state.trackURL); 
        state.trackURL = URL.createObjectURL(rec.blob); 
        return state.trackURL; 
      } 
    }
    return null;
  };
  
  const setupYouTubeEvents = () => {
    youtubePlayer.ontimeupdate = () => {
      const currentTime = youtubePlayer.getCurrentTime();
      const duration = youtubePlayer.getDuration();
      
      seek.value = (currentTime / (duration || 1)) * 100 || 0;
      curTimeEl.textContent = formatTime(currentTime);
      durTimeEl.textContent = formatTime(duration);
    };
    
    youtubePlayer.onended = () => {
      playIcon.src = 'assets/icons/play.svg';
      if (state.repeat === 'one') {
        youtubePlayer.seekTo(0);
        youtubePlayer.play();
        return;
      }
      next(true);
    };
  };
  const updateNow = (track) => { title.textContent = track?.title || 'Chưa phát'; artist.textContent = track?.artist || '—'; $('#thumb').textContent = (track?.title || '♪').slice(0, 2); };
  const attach = () => {
    playBtn.addEventListener('click', () => { 
      if (state.isYouTube) {
        if (youtubePlayer.isPlaying) {
          youtubePlayer.pause();
          playIcon.src = 'assets/icons/play.svg';
        } else {
          youtubePlayer.play();
          playIcon.src = 'assets/icons/pause.svg';
        }
      } else {
        if (audio.paused) audio.play(); else audio.pause();
      }
    });
    
    prevBtn.addEventListener('click', () => prev()); 
    nextBtn.addEventListener('click', () => next());
    
    repeatBtn.addEventListener('click', () => { 
      state.repeat = state.repeat === 'none' ? 'all' : state.repeat === 'all' ? 'one' : 'none'; 
      toast(`Chế độ lặp: ${state.repeat}`); 
    });
    
    shuffleBtn.addEventListener('click', () => { 
      state.shuffle = !state.shuffle; 
      toast(state.shuffle ? 'Bật trộn' : 'Tắt trộn'); 
    });
    
    // Regular audio events
    audio.addEventListener('play', () => {
      if (!state.isYouTube) playIcon.src = 'assets/icons/pause.svg';
    }); 
    audio.addEventListener('pause', () => {
      if (!state.isYouTube) playIcon.src = 'assets/icons/play.svg';
    });
    
    audio.addEventListener('timeupdate', () => { 
      if (!state.isYouTube) {
        seek.value = (audio.currentTime / (audio.duration || 1)) * 100 || 0; 
        curTimeEl.textContent = formatTime(audio.currentTime); 
        durTimeEl.textContent = formatTime(audio.duration);
      }
    });
    
    audio.addEventListener('ended', () => { 
      if (!state.isYouTube) {
        if (state.repeat === 'one') { 
          audio.currentTime = 0; 
          audio.play(); 
          return; 
        } 
        next(true);
      }
    });
    
    seek.addEventListener('input', () => { 
      const seekValue = parseFloat(seek.value);
      if (state.isYouTube) {
        const duration = youtubePlayer.getDuration();
        const newTime = (seekValue / 100) * duration;
        youtubePlayer.seekTo(newTime);
      } else {
        const t = (seekValue / 100) * (audio.duration || 0); 
        audio.currentTime = t;
      }
    });
    
    volume.addEventListener('input', () => { 
      const vol = parseFloat(volume.value);
      if (state.isYouTube) {
        youtubePlayer.setVolume(vol);
      } else {
        audio.volume = vol;
      }
    });
    
    document.addEventListener('keydown', (e) => { 
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return; 
      if (e.code === 'Space') { 
        e.preventDefault(); 
        if (state.isYouTube) {
          if (youtubePlayer.isPlaying) {
            youtubePlayer.pause();
            playIcon.src = 'assets/icons/play.svg';
          } else {
            youtubePlayer.play();
            playIcon.src = 'assets/icons/pause.svg';
          }
        } else {
          audio.paused ? audio.play() : audio.pause();
        }
      }
      if (e.code === 'ArrowRight') { 
        if (state.isYouTube) {
          const currentTime = youtubePlayer.getCurrentTime();
          const duration = youtubePlayer.getDuration();
          youtubePlayer.seekTo(Math.min(currentTime + 5, duration));
        } else {
          audio.currentTime = Math.min(audio.currentTime + 5, audio.duration || 0);
        }
      } 
      if (e.code === 'ArrowLeft') { 
        if (state.isYouTube) {
          const currentTime = youtubePlayer.getCurrentTime();
          youtubePlayer.seekTo(Math.max(currentTime - 5, 0));
        } else {
          audio.currentTime = Math.max(audio.currentTime - 5, 0);
        }
      } 
      if (e.code === 'KeyM') { 
        if (state.isYouTube) {
          const currentVol = youtubePlayer.volume;
          youtubePlayer.setVolume(currentVol > 0 ? 0 : 0.5);
        } else {
          audio.muted = !audio.muted;
        }
      }
    });
  };
  const setQueue = (tracks, startIndex = 0) => { state.queue = tracks.slice(); state.idx = startIndex; };
  const playIndex = async (idx) => { 
    if (idx < 0 || idx >= state.queue.length) return; 
    
    // Stop any previous YouTube playback
    if (state.isYouTube) {
      youtubePlayer.stop();
      state.isYouTube = false;
    }
    
    state.idx = idx; 
    const track = state.queue[state.idx]; 
    updateNow(track);
    
    try {
      const url = await loadTrackBlobURL(track); 
      if (!url) {
        toast('Không thể tải bài hát này');
        return;
      }
      
      if (url === 'youtube://loaded') {
        // YouTube track loaded successfully
        playIcon.src = 'assets/icons/pause.svg';
        youtubePlayer.play();
        toast(`▶️ Đang phát: ${track.title} (YouTube)`);
      } else {
        // Regular audio file
        console.log('🎵 Setting audio source:', url);
        
        // Add error listener before setting source
        audio.onerror = function(e) {
          console.error('Audio error event:', e);
          console.error('Audio error details:', audio.error);
          console.error('Failed URL:', url);
          if (audio.error) {
            switch(audio.error.code) {
              case 1:
                console.error('MEDIA_ERR_ABORTED: playback aborted');
                break;
              case 2:
                console.error('MEDIA_ERR_NETWORK: network error');
                break;
              case 3:
                console.error('MEDIA_ERR_DECODE: decode error');
                break;
              case 4:
                console.error('MEDIA_ERR_SRC_NOT_SUPPORTED: source not supported');
                break;
            }
          }
          toast('Không thể tải file âm thanh này');
        };
        
        audio.src = url; 
        const playPromise = audio.play();
        if (playPromise) {
          playPromise.catch(err => {
            console.error('Play failed:', err);
            console.error('Failed URL:', url);
            toast('Không thể phát bài này');
          });
        }
      }
    } catch (error) {
      console.error('Error playing track:', error);
      toast('Lỗi khi phát bài hát');
    }
  };
  
  const next = (auto = false) => { 
    if (state.shuffle) { 
      let nextIdx = Math.floor(Math.random() * state.queue.length); 
      if (state.queue.length > 1 && nextIdx === state.idx) nextIdx = (state.idx + 1) % state.queue.length; 
      playIndex(nextIdx); 
      return; 
    } 
    let idx = state.idx + 1; 
    if (idx >= state.queue.length) { 
      if (state.repeat === 'all') { 
        idx = 0; 
      } else { 
        if (state.isYouTube) {
          youtubePlayer.pause();
          playIcon.src = 'assets/icons/play.svg';
        } else {
          audio.pause(); 
        }
        return; 
      } 
    } 
    playIndex(idx); 
  };
  
  const prev = () => { 
    let idx = state.idx - 1; 
    if (idx < 0) idx = 0; 
    playIndex(idx); 
  };
  
  attach();
  
  return {
    state, 
    setUser(u) { state.user = u; }, 
    setQueue, 
    playIndex, 
    next, 
    prev,
    async playTracksByIds(user, ids, startIdx = 0) { 
      const d = data.get(user); 
      const tracks = []; 
      for (const id of ids) { 
        const t = await idb.getTrack(id); 
        if (t) tracks.push(t); 
      } 
      setQueue(tracks, startIdx); 
      playIndex(startIdx); 
    },
    async addAndPlayTrack(track) { 
      setQueue([track], 0); 
      playIndex(0); 
    }
  };
};
