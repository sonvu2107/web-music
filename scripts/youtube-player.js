// youtube-player.js - YouTube player simulation với Web Audio API
export class YouTubePlayer {
  constructor() {
    this.audioContext = null;
    this.oscillator = null;
    this.gainNode = null;
    this.isPlaying = false;
    this.currentTime = 0;
    this.duration = 0;
    this.volume = 0.5;
    this.startTime = 0;
    this.pauseTime = 0;
    this.intervalId = null;
    
    // Musical frequencies for different YouTube videos
    this.videoFrequencies = {
      'dQw4w9WgXcQ': [440, 523, 659, 784], // Rick Roll - Happy melody
      'kJQP7kiw5Fk': [392, 440, 523, 587], // Despacito - Latin rhythm
      'JGwWNGJdvx8': [329, 392, 466, 523], // Shape of You - Pop beat
      '2vjPBrBU-TM': [261, 329, 392, 466], // Chandelier - Emotional
      'SlPhMPnQ58k': [349, 392, 440, 523], // Default melody
    };
  }

  async initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  async loadTrack(videoId, duration = 180) {
    try {
      await this.initAudioContext();
      
      this.videoId = videoId;
      this.duration = duration;
      this.currentTime = 0;
      
      // Get frequencies for this video or use default
      this.frequencies = this.videoFrequencies[videoId] || this.videoFrequencies['SlPhMPnQ58k'];
      
      return true;
    } catch (error) {
      console.error('Error loading YouTube track:', error);
      return false;
    }
  }

  play() {
    if (this.isPlaying) return;
    
    try {
      this.createOscillator();
      this.isPlaying = true;
      this.startTime = this.audioContext.currentTime - this.pauseTime;
      
      // Start time tracking
      this.startTimeTracking();
      
      return true;
    } catch (error) {
      console.error('Error playing YouTube track:', error);
      return false;
    }
  }

  pause() {
    if (!this.isPlaying) return;
    
    this.stopOscillator();
    this.isPlaying = false;
    this.pauseTime = this.audioContext.currentTime - this.startTime;
    this.stopTimeTracking();
  }

  stop() {
    this.pause();
    this.currentTime = 0;
    this.pauseTime = 0;
  }

  createOscillator() {
    this.stopOscillator();
    
    // Create main oscillator
    this.oscillator = this.audioContext.createOscillator();
    this.gainNode = this.audioContext.createGain();
    
    // Create a pleasant melody using multiple frequencies
    const baseFreq = this.frequencies[0];
    this.oscillator.type = 'sine';
    this.oscillator.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
    
    // Add melody progression
    this.createMelody();
    
    // Set volume
    this.gainNode.gain.setValueAtTime(this.volume * 0.3, this.audioContext.currentTime);
    
    // Connect nodes
    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);
    
    // Start oscillator
    this.oscillator.start();
  }

  createMelody() {
    const now = this.audioContext.currentTime;
    const noteLength = 0.5; // Each note lasts 0.5 seconds
    
    // Create a simple melody pattern
    this.frequencies.forEach((freq, index) => {
      const time = now + (index * noteLength);
      this.oscillator.frequency.setValueAtTime(freq, time);
      
      // Add some rhythm variation
      if (index % 2 === 0) {
        this.gainNode.gain.setValueAtTime(this.volume * 0.4, time);
      } else {
        this.gainNode.gain.setValueAtTime(this.volume * 0.2, time);
      }
    });
    
    // Repeat the pattern
    const patternLength = this.frequencies.length * noteLength;
    for (let i = 1; i < 10; i++) { // Repeat 10 times
      this.frequencies.forEach((freq, index) => {
        const time = now + (patternLength * i) + (index * noteLength);
        this.oscillator.frequency.setValueAtTime(freq, time);
      });
    }
  }

  stopOscillator() {
    if (this.oscillator) {
      try {
        this.oscillator.stop();
      } catch (e) {
        // Oscillator already stopped
      }
      this.oscillator = null;
    }
    if (this.gainNode) {
      this.gainNode = null;
    }
  }

  startTimeTracking() {
    this.intervalId = setInterval(() => {
      if (this.isPlaying) {
        this.currentTime = this.audioContext.currentTime - this.startTime;
        
        // Auto-stop when duration reached
        if (this.currentTime >= this.duration) {
          this.stop();
          // Trigger ended event
          if (this.onended) {
            this.onended();
          }
        }
        
        // Trigger timeupdate event
        if (this.ontimeupdate) {
          this.ontimeupdate();
        }
      }
    }, 100);
  }

  stopTimeTracking() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  seekTo(time) {
    const wasPlaying = this.isPlaying;
    
    this.pause();
    this.currentTime = Math.max(0, Math.min(time, this.duration));
    this.pauseTime = this.currentTime;
    
    if (wasPlaying) {
      this.play();
    }
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(this.volume * 0.3, this.audioContext.currentTime);
    }
  }

  getCurrentTime() {
    return this.currentTime;
  }

  getDuration() {
    return this.duration;
  }

  // Event handlers
  onended = null;
  ontimeupdate = null;
  onloadedmetadata = null;
  onerror = null;
}

// Create singleton instance
export const youtubePlayer = new YouTubePlayer();
