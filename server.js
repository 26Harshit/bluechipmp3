const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const CryptoJS = require('crypto-js');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Cache map for responses (TTL 10 minutes)
const memoryCache = new Map();
function getCache(key) {
  const item = memoryCache.get(key);
  if (item && Date.now() - item.time < 10 * 60 * 1000) {
    return item.data;
  }
  return null;
}
function setCache(key, data) {
  memoryCache.set(key, { data, time: Date.now() });
}

// Decrypt JioSaavn encrypted_media_url using DES-ECB with key '38346591'
function decryptMediaUrl(encryptedUrl) {
  if (!encryptedUrl) return null;
  try {
    const key = CryptoJS.enc.Utf8.parse('38346591');
    const decrypted = CryptoJS.DES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(encryptedUrl) },
      key,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    );
    const result = decrypted.toString(CryptoJS.enc.Utf8);
    return result || null;
  } catch (err) {
    console.error('DES decryption error:', err.message);
    return null;
  }
}

// Clean text strings (HTML entities & unescaping)
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'");
}

// Transform raw JioSaavn song object into standardized Dhun song format
function formatSong(raw) {
  if (!raw) return null;
  const moreInfo = raw.more_info || {};
  const encryptedUrl = moreInfo.encrypted_media_url || raw.encrypted_media_url;

  let stream96 = null;
  let stream160 = null;
  let stream320 = null;

  if (encryptedUrl) {
    const decrypted = decryptMediaUrl(encryptedUrl);
    if (decrypted) {
      stream96 = decrypted;
      stream160 = decrypted.replace('_96.mp4', '_160.mp4').replace('_96.m4a', '_160.m4a');
      stream320 = decrypted.replace('_96.mp4', '_320.mp4').replace('_96.m4a', '_320.m4a');
    }
  }

  // Generate crisp 500x500 album art
  let image = raw.image || moreInfo.image || '';
  if (image) {
    image = image.replace('150x150', '500x500').replace('50x50', '500x500');
  }

  const title = cleanText(raw.song || raw.title || '');
  const album = cleanText(raw.album || moreInfo.album || '');
  const artists = cleanText(raw.primary_artists || moreInfo.primary_artists || raw.subtitle || '');

  return {
    id: raw.id,
    title,
    album,
    artist: artists,
    singers: cleanText(moreInfo.singers || ''),
    duration: parseInt(raw.duration || moreInfo.duration || 0, 10),
    year: raw.year || moreInfo.year || '',
    language: raw.language || moreInfo.language || '',
    image,
    hasLyrics: moreInfo.has_lyrics === 'true' || raw.has_lyrics === 'true',
    lyricsId: moreInfo.lyrics_id || '',
    stream320,
    stream160,
    stream96,
    streamUrl: stream320 || stream160 || stream96 || moreInfo.vlink || '',
    previewUrl: moreInfo.vlink || moreInfo.media_preview_url || ''
  };
}

// Fetch helper with User-Agent & timeout
async function fetchSaavn(endpoint, params = {}) {
  const query = new URLSearchParams({
    _format: 'json',
    _marker: '0',
    api_version: '4',
    ctx: 'web6dot0',
    ...params
  });
  const url = `https://www.jiosaavn.com/api.php?__call=${endpoint}&${query.toString()}`;

  const cached = getCache(url);
  if (cached) return cached;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Referer': 'https://www.jiosaavn.com/'
    }
  });
  if (!res.ok) throw new Error(`JioSaavn API error: ${res.status}`);
  const data = await res.json();
  setCache(url, data);
  return data;
}

// Get Local IPv4 Address
function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// === ROUTES ===

// 1. Network Info & QR Code for "Listen on Any Device"
app.get('/api/network-info', async (req, res) => {
  try {
    const localIp = getLocalIp();
    const port = PORT;
    const networkUrl = `http://${localIp}:${port}`;
    const qrCodeDataUrl = await QRCode.toDataURL(networkUrl, {
      margin: 2,
      width: 280,
      color: {
        dark: '#ff6b35',
        light: '#0d0f15'
      }
    });

    res.json({
      localIp,
      port,
      networkUrl,
      localUrl: `http://localhost:${port}`,
      qrCode: qrCodeDataUrl
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Homepage: Trending Playlists, Charts, Quick Picks & Curated Stations
app.get('/api/home', async (req, res) => {
  try {
    const cached = getCache('dhun_homepage_processed');
    if (cached) return res.json(cached);

    const raw = await fetchSaavn('content.getHomepageData');

    const charts = (raw.charts || []).map(c => ({
      id: c.id,
      title: cleanText(c.title),
      subtitle: cleanText(c.subtitle),
      image: (c.image || '').replace('150x150', '500x500'),
      type: 'playlist'
    }));

    const featuredPlaylists = (raw.featured_playlists || []).map(p => ({
      id: p.id,
      title: cleanText(p.title),
      subtitle: cleanText(p.subtitle || `${p.more_info?.song_count || 20} Songs`),
      image: (p.image || '').replace('150x150', '500x500'),
      type: 'playlist'
    }));

    const newAlbums = (raw.new_albums || []).map(a => ({
      id: a.id,
      title: cleanText(a.title),
      subtitle: cleanText(a.subtitle || a.artist || 'Album'),
      image: (a.image || '').replace('150x150', '500x500'),
      type: 'album'
    }));

    // Curated Indian quick pick queries
    const curatedCategories = [
      { id: 'top-bollywood', name: 'Top Bollywood 50', query: 'Top Bollywood', icon: '✨' },
      { id: 'punjabi-hits', name: 'Punjabi Bangers', query: 'Punjabi Top Hits', icon: '🔥' },
      { id: 'south-hits', name: 'South Blockbusters', query: 'Tamil Telugu Hits', icon: '🌴' },
      { id: 'retro-90s', name: '90s Golden Nostalgia', query: '90s Bollywood Hits', icon: '📻' },
      { id: 'desi-lofi', name: 'Desi Lo-Fi Chill', query: 'Bollywood Lofi Chill', icon: '🌙' },
      { id: 'devotional', name: 'Bhakti & Devotional', query: 'Shiv Krishna Bhajans', icon: '🪔' },
      { id: 'sufi-ghazal', name: 'Sufi & Ghazal', query: 'Best Ghazals Nusrat', icon: '🕯️' },
      { id: 'indie-india', name: 'Indie India', query: 'Indian Indie Hits', icon: '🎸' }
    ];

    const result = {
      charts,
      featuredPlaylists,
      newAlbums,
      curatedCategories
    };

    setCache('dhun_homepage_processed', result);
    res.json(result);
  } catch (err) {
    console.error('Home error:', err);
    res.status(500).json({ error: 'Failed to load home page' });
  }
});

// 3. Search: songs, albums, playlists, artists with instant live preview
app.get('/api/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    const type = req.query.type || 'all';
    const page = parseInt(req.query.p || 1, 10);
    const limit = parseInt(req.query.n || 20, 10);

    if (!q.trim()) {
      return res.json({ songs: [], albums: [], playlists: [], artists: [] });
    }

    if (type === 'all') {
      // Use autocomplete + songs search in parallel for maximum relevance
      const [autoRes, songRes] = await Promise.allSettled([
        fetchSaavn('autocomplete.get', { query: q }),
        fetchSaavn('search.getResults', { q, n: limit, p: page })
      ]);

      const songs = [];
      const albums = [];
      const playlists = [];
      const artists = [];

      // Collect detailed songs from search.getResults
      if (songRes.status === 'fulfilled' && songRes.value?.results) {
        for (const item of songRes.value.results) {
          const formatted = formatSong(item);
          if (formatted) songs.push(formatted);
        }
      }

      // Collect albums, playlists, artists from autocomplete
      if (autoRes.status === 'fulfilled' && autoRes.value) {
        const auto = autoRes.value;
        if (auto.albums?.data) {
          for (const item of auto.albums.data) {
            albums.push({
              id: item.id,
              title: cleanText(item.title),
              subtitle: cleanText(item.music || item.description || 'Album'),
              image: (item.image || '').replace('50x50', '500x500'),
              type: 'album'
            });
          }
        }
        if (auto.playlists?.data) {
          for (const item of auto.playlists.data) {
            playlists.push({
              id: item.id,
              title: cleanText(item.title),
              subtitle: cleanText(item.description || 'Playlist'),
              image: (item.image || '').replace('50x50', '500x500'),
              type: 'playlist'
            });
          }
        }
        if (auto.artists?.data) {
          for (const item of auto.artists.data) {
            artists.push({
              id: item.id,
              name: cleanText(item.title),
              subtitle: 'Artist',
              image: (item.image || '').replace('50x50', '500x500'),
              type: 'artist'
            });
          }
        }
      }

      return res.json({ songs, albums, playlists, artists });
    }

    if (type === 'song') {
      const data = await fetchSaavn('search.getResults', { q, n: limit, p: page });
      const songs = (data.results || []).map(formatSong).filter(Boolean);
      return res.json({ songs, total: data.total });
    }

    if (type === 'album') {
      const data = await fetchSaavn('search.getAlbumResults', { q, n: limit, p: page });
      const albums = (data.results || []).map(a => ({
        id: a.id,
        title: cleanText(a.title),
        subtitle: cleanText(a.subtitle || a.music || a.year || 'Album'),
        image: (a.image || '').replace('150x150', '500x500'),
        type: 'album'
      }));
      return res.json({ albums, total: data.total });
    }

    if (type === 'playlist') {
      const data = await fetchSaavn('search.getPlaylistResults', { q, n: limit, p: page });
      const playlists = (data.results || []).map(p => ({
        id: p.id,
        title: cleanText(p.title),
        subtitle: cleanText(p.subtitle || `${p.more_info?.song_count || ''} Songs`),
        image: (p.image || '').replace('150x150', '500x500'),
        type: 'playlist'
      }));
      return res.json({ playlists, total: data.total });
    }

    res.json({ error: 'Unknown search type' });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Single Song Details & Fresh Streams
app.get('/api/song/:id', async (req, res) => {
  try {
    const songId = req.params.id;
    const data = await fetchSaavn('song.getDetails', { pids: songId });
    const raw = data.songs ? data.songs[0] : data[songId];
    if (!raw) return res.status(404).json({ error: 'Song not found' });
    const formatted = formatSong(raw);
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Playlist Details
app.get('/api/playlist/:id', async (req, res) => {
  try {
    const listid = req.params.id;
    const data = await fetchSaavn('playlist.getDetails', { listid });
    const songs = (data.list || []).map(formatSong).filter(Boolean);
    res.json({
      id: data.id,
      title: cleanText(data.title),
      subtitle: cleanText(data.subtitle || `${songs.length} Songs`),
      description: cleanText(data.header_desc || ''),
      image: (data.image || '').replace('150x150', '500x500'),
      songs
    });
  } catch (err) {
    console.error('Playlist error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6. Album Details
app.get('/api/album/:id', async (req, res) => {
  try {
    const albumid = req.params.id;
    const data = await fetchSaavn('content.getAlbumDetails', { albumid });
    const rawList = data.list || data.songs || [];
    const songs = rawList.map(formatSong).filter(Boolean);
    res.json({
      id: data.id,
      title: cleanText(data.title),
      subtitle: cleanText(data.primary_artists || data.subtitle || 'Album'),
      year: data.year,
      image: (data.image || '').replace('150x150', '500x500'),
      songs
    });
  } catch (err) {
    console.error('Album error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 7. Lyrics Endpoint: LRCLIB Synced Karaoke + JioSaavn Fallback
app.get('/api/lyrics', async (req, res) => {
  try {
    const { title, artist, duration, id } = req.query;
    if (!title) return res.status(400).json({ error: 'Title required' });

    // Clean title (remove "From movie", "(Remix)", etc. for best lookup)
    const cleanTitle = title
      .replace(/\(From\s+.*?\)/i, '')
      .replace(/\[From\s+.*?\]/i, '')
      .replace(/\(Original.*?\)/i, '')
      .trim();

    // Clean artist (first primary artist)
    const cleanArtist = (artist || '').split(',')[0].split('&')[0].trim();

    // 1. Try LRCLIB for synchronized karaoke lyrics
    try {
      const lrclibUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;
      const lrcRes = await fetch(lrclibUrl, {
        headers: { 'User-Agent': 'DhunMusicApp/1.0.0 (https://github.com/)' }
      });
      if (lrcRes.ok) {
        const lrcData = await lrcRes.json();
        if (lrcData.syncedLyrics) {
          // Parse LRC into array of { time, text }
          const lines = lrcData.syncedLyrics.split('\n');
          const parsed = [];
          for (const line of lines) {
            const match = line.match(/\[(\d+):(\d+\.?\d*)\](.*)/);
            if (match) {
              const min = parseInt(match[1], 10);
              const sec = parseFloat(match[2]);
              const time = min * 60 + sec;
              parsed.push({ time, text: match[3].trim() });
            }
          }
          return res.json({
            type: 'synced',
            synced: parsed,
            plain: lrcData.plainLyrics || ''
          });
        } else if (lrcData.plainLyrics) {
          return res.json({
            type: 'plain',
            plain: lrcData.plainLyrics
          });
        }
      }
    } catch (e) {
      console.warn('LRCLIB lookup failed:', e.message);
    }

    // 2. Try JioSaavn lyrics if song id / lyrics_id is provided
    if (id) {
      try {
        const jioLyrics = await fetchSaavn('lyrics.getLyrics', { lyrics_id: id });
        if (jioLyrics && jioLyrics.lyrics) {
          return res.json({
            type: 'plain',
            plain: cleanText(jioLyrics.lyrics.replace(/<br\s*\/?>/gi, '\n'))
          });
        }
      } catch (e) {
        // ignore
      }
    }

    res.json({
      type: 'none',
      plain: 'Lyrics not found for this track.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Download Endpoint: Clean MP3 Attachment with Metadata Headers
app.get('/api/download', async (req, res) => {
  try {
    const { id, quality } = req.query;
    if (!id) return res.status(400).send('Song ID required');

    const songData = await fetchSaavn('song.getDetails', { pids: id });
    const raw = songData.songs ? songData.songs[0] : songData[id];
    if (!raw) return res.status(404).send('Song not found');

    const formatted = formatSong(raw);
    const audioUrl = (quality === '160' ? formatted.stream160 : formatted.stream320) || formatted.streamUrl;

    if (!audioUrl) return res.status(404).send('Audio stream not available');

    const cleanFilename = `${formatted.title} - ${formatted.artist}`.replace(/[/\\?%*:|"<>]/g, '_').trim() + '.mp3';

    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) return res.status(500).send('Failed to fetch audio stream');

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(cleanFilename)}"`);
    res.setHeader('Content-Type', 'audio/mpeg');
    if (audioRes.headers.get('content-length')) {
      res.setHeader('Content-Length', audioRes.headers.get('content-length'));
    }

    const { Readable } = require('stream');
    Readable.fromWeb(audioRes.body).pipe(res);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).send('Download failed: ' + err.message);
  }
});

// Fallback all navigation routes to index.html for single-page app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log(`\n🎵 =============================================== 🎵`);
  console.log(`   Dhun - Ad-Free Indian Music App is Running!`);
  console.log(`   Local URL:    http://localhost:${PORT}`);
  console.log(`   Network URL:  http://${localIp}:${PORT}`);
  console.log(`   (Open the Network URL on any phone/tablet/TV!)`);
  console.log(`🎵 =============================================== 🎵\n`);
});
