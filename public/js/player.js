// Audio Player Engine for Dhun Music App
class DhunPlayer {
  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'auto';

    this.currentSong = null;
    this.queue = [];
    this.originalQueue = [];
    this.queueIndex = -1;

    this.isPlaying = false;
    this.isLoading = false;
    this.duration = 0;
    this.currentTime = 0;

    // Settings
    const settings = Storage.getSettings();
    this.quality = settings.quality || '320';
    this.volume = settings.volume !== undefined ? settings.volume : 0.85;
    this.isMuted = !!settings.muted;
    this.isShuffle = !!settings.shuffle;
    this.repeatMode = settings.repeat || 'off'; // 'off' | 'all' | 'one'

    this.audio.volume = this.isMuted ? 0 : this.volume;

    // Sleep Timer
    this.sleepTimerId = null;
    this.sleepTimerEnd = null;

    // Web Audio EQ (lazy initialized on first user interaction)
    this.audioCtx = null;
    this.eqNodes = [];
    this.eqPresets = {
      flat: [0, 0, 0, 0, 0],
      bass: [6, 4, 1, 0, -1],
      vocal: [-2, 2, 5, 3, 1],
      acoustic: [3, 2, 0, 2, 4],
      treble: [-2, -1, 1, 4, 6],
      night: [-3, -1, 2, -2, -4]
    };
    this.currentEqPreset = settings.eqPreset || 'flat';

    this.initEvents();
  }

  initEvents() {
    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.isLoading = false;
      this.emit('play', this.currentSong);
      this.updateMediaSessionState();
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.emit('pause', this.currentSong);
      this.updateMediaSessionState();
    });

    this.audio.addEventListener('waiting', () => {
      this.isLoading = true;
      this.emit('loading', true);
    });

    this.audio.addEventListener('canplay', () => {
      this.isLoading = false;
      this.emit('loading', false);
    });

    this.audio.addEventListener('timeupdate', () => {
      this.currentTime = this.audio.currentTime;
      this.duration = this.audio.duration || this.currentSong?.duration || 0;
      this.emit('timeupdate', {
        currentTime: this.currentTime,
        duration: this.duration,
        progress: this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0
      });

      if ('mediaSession' in navigator && !isNaN(this.duration) && this.duration > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: this.duration,
            playbackRate: this.audio.playbackRate,
            position: Math.min(this.currentTime, this.duration)
          });
        } catch (e) {
          // ignore unsupported position state
        }
      }
    });

    this.audio.addEventListener('ended', () => {
      this.onTrackEnded();
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('Audio playback error, attempting fallback...', e);
      this.handlePlaybackFallback();
    });
  }

  // Setup Web Audio API 5-Band Equalizer (60Hz, 250Hz, 1kHz, 4kHz, 16kHz)
  initAudioContext() {
    if (this.audioCtx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
      const source = this.audioCtx.createMediaElementSource(this.audio);

      const freqs = [60, 250, 1000, 4000, 16000];
      const types = ['lowshelf', 'peaking', 'peaking', 'peaking', 'highshelf'];

      let prevNode = source;
      this.eqNodes = freqs.map((freq, i) => {
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = types[i];
        filter.frequency.value = freq;
        filter.gain.value = 0;
        prevNode.connect(filter);
        prevNode = filter;
        return filter;
      });

      prevNode.connect(this.audioCtx.destination);
      this.applyEqPreset(this.currentEqPreset);
    } catch (err) {
      console.warn('Web Audio EQ not supported in this browser:', err);
    }
  }

  applyEqPreset(name) {
    this.currentEqPreset = name;
    const gains = this.eqPresets[name] || this.eqPresets.flat;
    if (this.eqNodes.length === 5) {
      gains.forEach((g, i) => {
        this.eqNodes[i].gain.value = g;
      });
    }
    Storage.saveSettings({ eqPreset: name, eqBands: gains });
    this.emit('eqchange', { preset: name, gains });
  }

  setCustomEqBand(bandIndex, gainValue) {
    if (this.eqNodes[bandIndex]) {
      this.eqNodes[bandIndex].gain.value = gainValue;
    }
    this.currentEqPreset = 'custom';
    Storage.saveSettings({ eqPreset: 'custom' });
    this.emit('eqchange', { preset: 'custom' });
  }

  // Play a song and optionally replace current queue
  async play(song, newQueue = null) {
    if (!song) return;

    this.initAudioContext();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    if (newQueue && Array.isArray(newQueue) && newQueue.length > 0) {
      this.originalQueue = [...newQueue];
      if (this.isShuffle) {
        this.queue = this.shuffleArray([ ...newQueue ], song);
      } else {
        this.queue = [...newQueue];
      }
      this.queueIndex = this.queue.findIndex(s => s.id === song.id);
      if (this.queueIndex === -1) {
        this.queue.unshift(song);
        this.queueIndex = 0;
      }
    } else if (this.queue.length === 0) {
      this.queue = [song];
      this.originalQueue = [song];
      this.queueIndex = 0;
    } else {
      this.queueIndex = this.queue.findIndex(s => s.id === song.id);
      if (this.queueIndex === -1) {
        this.queue.splice(this.queueIndex + 1, 0, song);
        this.queueIndex = this.queueIndex + 1;
      }
    }

    this.currentSong = song;
    Storage.addToHistory(song);

    // Select audio stream according to quality setting
    let streamUrl = this.getStreamForQuality(song, this.quality);
    if (!streamUrl) streamUrl = song.streamUrl || song.previewUrl;

    this.audio.src = streamUrl;
    this.audio.currentTime = 0;

    try {
      this.isLoading = true;
      this.emit('songchange', this.currentSong);
      this.updateMediaSession(song);
      await this.audio.play();
    } catch (err) {
      console.warn('Playback play() was prevented, user gesture may be required:', err);
    }
  }

  getStreamForQuality(song, quality) {
    if (!song) return '';
    if (quality === '160' && song.stream160) return song.stream160;
    if (quality === '320' && song.stream320) return song.stream320;
    return song.stream320 || song.stream160 || song.stream96 || song.streamUrl || '';
  }

  handlePlaybackFallback() {
    if (!this.currentSong) return;
    // Fallback order: 320 -> 160 -> 96 -> previewUrl
    const cur = this.audio.src;
    if (cur.includes('_320') && this.currentSong.stream160) {
      this.audio.src = this.currentSong.stream160;
      this.audio.play();
    } else if (cur.includes('_160') && this.currentSong.stream96) {
      this.audio.src = this.currentSong.stream96;
      this.audio.play();
    } else if (this.currentSong.previewUrl && cur !== this.currentSong.previewUrl) {
      this.audio.src = this.currentSong.previewUrl;
      this.audio.play();
    } else {
      console.error('All playback fallbacks exhausted for track:', this.currentSong.title);
      this.emit('playbackError', 'Unable to play this track. Streaming server unreachable.');
    }
  }

  togglePlayPause() {
    if (!this.currentSong && this.queue.length > 0) {
      this.play(this.queue[0]);
      return;
    }
    if (this.audio.paused) {
      this.audio.play().catch(e => console.warn(e));
    } else {
      this.audio.pause();
    }
  }

  seek(seconds) {
    if (this.duration > 0) {
      this.audio.currentTime = Math.max(0, Math.min(seconds, this.duration));
    }
  }

  seekPercent(percent) {
    if (this.duration > 0) {
      this.seek((percent / 100) * this.duration);
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (!this.isMuted) {
      this.audio.volume = this.volume;
    }
    Storage.saveSettings({ volume: this.volume });
    this.emit('volumechange', { volume: this.volume, muted: this.isMuted });
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.audio.volume = this.isMuted ? 0 : this.volume;
    Storage.saveSettings({ muted: this.isMuted });
    this.emit('volumechange', { volume: this.volume, muted: this.isMuted });
  }

  setQuality(q) {
    if (q === '160' || q === '320') {
      this.quality = q;
      Storage.saveSettings({ quality: q });
      if (this.currentSong) {
        const curTime = this.audio.currentTime;
        const wasPlaying = !this.audio.paused;
        const newStream = this.getStreamForQuality(this.currentSong, q);
        if (newStream && newStream !== this.audio.src) {
          this.audio.src = newStream;
          this.audio.currentTime = curTime;
          if (wasPlaying) this.audio.play();
        }
      }
      this.emit('qualitychange', q);
    }
  }

  nextTrack() {
    if (this.queue.length === 0) return;
    if (this.repeatMode === 'one') {
      this.audio.currentTime = 0;
      this.audio.play();
      return;
    }
    let nextIndex = this.queueIndex + 1;
    if (nextIndex >= this.queue.length) {
      if (this.repeatMode === 'all') {
        nextIndex = 0;
      } else {
        return; // End of queue reached
      }
    }
    this.play(this.queue[nextIndex]);
  }

  prevTrack() {
    if (this.queue.length === 0) return;
    // If played more than 3 seconds, restart current track
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }
    let prevIndex = this.queueIndex - 1;
    if (prevIndex < 0) {
      prevIndex = this.queue.length - 1;
    }
    this.play(this.queue[prevIndex]);
  }

  onTrackEnded() {
    if (this.repeatMode === 'one') {
      this.audio.currentTime = 0;
      this.audio.play();
      return;
    }
    this.nextTrack();
  }

  toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    Storage.saveSettings({ shuffle: this.isShuffle });

    if (this.isShuffle) {
      this.queue = this.shuffleArray([...this.originalQueue], this.currentSong);
      this.queueIndex = this.queue.findIndex(s => s.id === this.currentSong?.id);
    } else {
      this.queue = [...this.originalQueue];
      this.queueIndex = this.queue.findIndex(s => s.id === this.currentSong?.id);
    }
    this.emit('shufflechange', this.isShuffle);
    this.emit('queuechange', this.queue);
  }

  toggleRepeat() {
    // off -> all -> one -> off
    if (this.repeatMode === 'off') this.repeatMode = 'all';
    else if (this.repeatMode === 'all') this.repeatMode = 'one';
    else this.repeatMode = 'off';

    Storage.saveSettings({ repeat: this.repeatMode });
    this.emit('repeatchange', this.repeatMode);
  }

  shuffleArray(array, keepSong) {
    const list = array.filter(s => s.id !== keepSong?.id);
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    if (keepSong) list.unshift(keepSong);
    return list;
  }

  // Queue Operations
  addToQueue(song) {
    if (!song) return;
    this.queue.push(song);
    this.originalQueue.push(song);
    this.emit('queuechange', this.queue);
  }

  playNextInQueue(song) {
    if (!song) return;
    const insertAt = this.queueIndex + 1;
    this.queue.splice(insertAt, 0, song);
    this.originalQueue.push(song);
    this.emit('queuechange', this.queue);
  }

  removeFromQueue(index) {
    if (index < 0 || index >= this.queue.length) return;
    this.queue.splice(index, 1);
    if (index < this.queueIndex) {
      this.queueIndex--;
    }
    this.emit('queuechange', this.queue);
  }

  clearQueue() {
    if (this.currentSong) {
      this.queue = [this.currentSong];
      this.originalQueue = [this.currentSong];
      this.queueIndex = 0;
    } else {
      this.queue = [];
      this.originalQueue = [];
      this.queueIndex = -1;
    }
    this.emit('queuechange', this.queue);
  }

  // Sleep Timer (15, 30, 45, 60 mins or end of song)
  setSleepTimer(minutes) {
    if (this.sleepTimerId) {
      clearTimeout(this.sleepTimerId);
      this.sleepTimerId = null;
      this.sleepTimerEnd = null;
    }

    if (!minutes || minutes <= 0) {
      this.emit('sleeptimerchange', null);
      return;
    }

    this.sleepTimerEnd = Date.now() + minutes * 60 * 1000;
    this.emit('sleeptimerchange', { minutes, end: this.sleepTimerEnd });

    this.sleepTimerId = setTimeout(() => {
      // Fade out over 4 seconds
      const fadeInterval = setInterval(() => {
        if (this.audio.volume > 0.05) {
          this.audio.volume -= 0.05;
        } else {
          clearInterval(fadeInterval);
          this.audio.pause();
          this.audio.volume = this.volume;
          this.sleepTimerId = null;
          this.sleepTimerEnd = null;
          this.emit('sleeptimerchange', null);
        }
      }, 200);
    }, minutes * 60 * 1000);
  }

  // System MediaSession API for Android / iOS / WearOS / Car controls
  updateMediaSession(song) {
    if (!('mediaSession' in navigator) || !song) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist,
        album: song.album || 'Dhun Ad-Free Music',
        artwork: [
          { src: song.image || '/icons/icon.svg', sizes: '96x96', type: 'image/jpeg' },
          { src: song.image || '/icons/icon.svg', sizes: '128x128', type: 'image/jpeg' },
          { src: song.image || '/icons/icon.svg', sizes: '192x192', type: 'image/jpeg' },
          { src: song.image || '/icons/icon.svg', sizes: '256x256', type: 'image/jpeg' },
          { src: song.image || '/icons/icon.svg', sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => this.togglePlayPause());
      navigator.mediaSession.setActionHandler('pause', () => this.togglePlayPause());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.prevTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.nextTrack());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== null && details.seekTime !== undefined) {
          this.seek(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        this.seek(this.currentTime - (details.seekOffset || 10));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        this.seek(this.currentTime + (details.seekOffset || 10));
      });
    } catch (err) {
      console.warn('MediaSession handler error:', err);
    }
  }

  updateMediaSessionState() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused';
    }
  }

  // Event Dispatcher
  emit(event, data) {
    window.dispatchEvent(new CustomEvent(`dhun:${event}`, { detail: data }));
  }
}

// Global player singleton
const player = new DhunPlayer();
