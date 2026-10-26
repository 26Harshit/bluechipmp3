// Storage Manager for Dhun Music App
const Storage = {
  KEYS: {
    LIKED_SONGS: 'dhun_liked_songs',
    PLAYLISTS: 'dhun_playlists',
    HISTORY: 'dhun_history',
    SETTINGS: 'dhun_settings'
  },

  // === LIKED SONGS ===
  getLikedSongs() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.LIKED_SONGS)) || [];
    } catch {
      return [];
    }
  },

  isLiked(songId) {
    if (!songId) return false;
    const songs = this.getLikedSongs();
    return songs.some(s => s.id === songId);
  },

  toggleLike(song) {
    if (!song || !song.id) return false;
    let songs = this.getLikedSongs();
    const index = songs.findIndex(s => s.id === song.id);
    let isNowLiked = false;

    if (index >= 0) {
      songs.splice(index, 1);
      isNowLiked = false;
    } else {
      songs.unshift({
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album,
        image: song.image,
        duration: song.duration,
        streamUrl: song.streamUrl,
        stream320: song.stream320,
        stream160: song.stream160,
        addedAt: Date.now()
      });
      isNowLiked = true;
    }

    localStorage.setItem(this.KEYS.LIKED_SONGS, JSON.stringify(songs));
    window.dispatchEvent(new CustomEvent('dhun:likedChanged', { detail: { song, isNowLiked, count: songs.length } }));
    return isNowLiked;
  },

  // === RECENTLY PLAYED HISTORY ===
  getHistory() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.HISTORY)) || [];
    } catch {
      return [];
    }
  },

  addToHistory(song) {
    if (!song || !song.id) return;
    let history = this.getHistory();
    history = history.filter(s => s.id !== song.id);
    history.unshift({
      id: song.id,
      title: song.title,
      artist: song.artist,
      album: song.album,
      image: song.image,
      duration: song.duration,
      streamUrl: song.streamUrl,
      stream320: song.stream320,
      stream160: song.stream160,
      playedAt: Date.now()
    });
    // Keep max 50 recent songs
    if (history.length > 50) history.pop();
    localStorage.setItem(this.KEYS.HISTORY, JSON.stringify(history));
    window.dispatchEvent(new CustomEvent('dhun:historyChanged'));
  },

  clearHistory() {
    localStorage.removeItem(this.KEYS.HISTORY);
    window.dispatchEvent(new CustomEvent('dhun:historyChanged'));
  },

  // === USER PLAYLISTS ===
  getPlaylists() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.PLAYLISTS)) || [];
    } catch {
      return [];
    }
  },

  createPlaylist(name, description = '') {
    const playlists = this.getPlaylists();
    const newPlaylist = {
      id: 'pl_' + Date.now(),
      title: name.trim(),
      description: description.trim(),
      songs: [],
      createdAt: Date.now()
    };
    playlists.push(newPlaylist);
    localStorage.setItem(this.KEYS.PLAYLISTS, JSON.stringify(playlists));
    window.dispatchEvent(new CustomEvent('dhun:playlistsChanged'));
    return newPlaylist;
  },

  addSongToPlaylist(playlistId, song) {
    const playlists = this.getPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return false;

    if (!playlist.songs.some(s => s.id === song.id)) {
      playlist.songs.push({
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album,
        image: song.image,
        duration: song.duration,
        streamUrl: song.streamUrl,
        stream320: song.stream320,
        stream160: song.stream160
      });
      localStorage.setItem(this.KEYS.PLAYLISTS, JSON.stringify(playlists));
      window.dispatchEvent(new CustomEvent('dhun:playlistsChanged'));
      return true;
    }
    return false;
  },

  removeSongFromPlaylist(playlistId, songId) {
    const playlists = this.getPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return false;

    playlist.songs = playlist.songs.filter(s => s.id !== songId);
    localStorage.setItem(this.KEYS.PLAYLISTS, JSON.stringify(playlists));
    window.dispatchEvent(new CustomEvent('dhun:playlistsChanged'));
    return true;
  },

  deletePlaylist(playlistId) {
    let playlists = this.getPlaylists();
    playlists = playlists.filter(p => p.id !== playlistId);
    localStorage.setItem(this.KEYS.PLAYLISTS, JSON.stringify(playlists));
    window.dispatchEvent(new CustomEvent('dhun:playlistsChanged'));
  },

  // === SETTINGS (AUDIO QUALITY, EQ, VOLUME) ===
  getSettings() {
    try {
      const defaultSettings = {
        quality: '320', // '320' or '160'
        volume: 0.85,
        muted: false,
        shuffle: false,
        repeat: 'off', // 'off', 'all', 'one'
        eqPreset: 'flat',
        eqBands: [0, 0, 0, 0, 0]
      };
      const stored = JSON.parse(localStorage.getItem(this.KEYS.SETTINGS));
      return Object.assign(defaultSettings, stored || {});
    } catch {
      return {
        quality: '320',
        volume: 0.85,
        muted: false,
        shuffle: false,
        repeat: 'off',
        eqPreset: 'flat',
        eqBands: [0, 0, 0, 0, 0]
      };
    }
  },

  saveSettings(partial) {
    const current = this.getSettings();
    const updated = Object.assign(current, partial);
    localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  }
};
