// API Client for Dhun Music App
const API = {
  BASE_URL: '',

  async fetchJson(endpoint, params = {}) {
    const url = new URL(this.BASE_URL + endpoint, window.location.origin);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    try {
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
  },

  // Homepage data: charts, trending playlists, new albums
  async getHome() {
    return this.fetchJson('/api/home');
  },

  // Search songs, albums, playlists, artists
  async search(query, type = 'all', page = 1, limit = 25) {
    return this.fetchJson('/api/search', { q: query, type, p: page, n: limit });
  },

  // Single song details & streaming URLs
  async getSong(id) {
    return this.fetchJson(`/api/song/${id}`);
  },

  // Playlist with tracklist
  async getPlaylist(id) {
    return this.fetchJson(`/api/playlist/${id}`);
  },

  // Album with tracklist
  async getAlbum(id) {
    return this.fetchJson(`/api/album/${id}`);
  },

  // Synced (karaoke) and plain lyrics
  async getLyrics(title, artist, duration, id) {
    return this.fetchJson('/api/lyrics', { title, artist, duration, id });
  },

  // Local Wi-Fi network info & QR code for playing on any device
  async getNetworkInfo() {
    return this.fetchJson('/api/network-info');
  },

  // Download URL
  getDownloadUrl(songId, quality = '320') {
    return `/api/download?id=${encodeURIComponent(songId)}&quality=${quality}`;
  }
};
