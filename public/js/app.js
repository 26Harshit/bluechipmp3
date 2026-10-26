// Main Application Controller for Dhun Music App
const App = {
  currentView: 'home',
  currentCollection: null,
  searchDebounceTimer: null,
  installPrompt: null,

  init() {
    this.bindEvents();
    this.loadHomeData();
    this.initPlayerUI();
    this.initModals();
    this.initKeyboardShortcuts();
    this.registerPWA();
    this.checkNetworkInfo();
  },

  // === VIEW MANAGEMENT ===
  switchView(viewName, data = null) {
    this.currentView = viewName;

    // Update bottom nav and sidebar links
    document.querySelectorAll('[data-view-target]').forEach(el => {
      if (el.dataset.viewTarget === viewName) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Hide all view containers
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    // Show target view
    const targetSection = document.getElementById(`view-${viewName}`);
    if (targetSection) {
      targetSection.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // View specific logic
    if (viewName === 'home') {
      // Refresh home if needed
    } else if (viewName === 'search') {
      const input = document.getElementById('search-input');
      if (input && !input.value) {
        setTimeout(() => input.focus(), 100);
      }
    } else if (viewName === 'explore') {
      this.loadExploreCategories();
    } else if (viewName === 'library') {
      this.loadLibraryView();
    } else if (viewName === 'details' && data) {
      this.renderCollectionDetails(data);
    }
  },

  // === DATA LOADERS ===
  async loadHomeData() {
    const homeContent = document.getElementById('home-content');
    if (!homeContent) return;

    try {
      homeContent.innerHTML = `
        <div class="loading-spinner-container">
          <div class="dhun-spinner"></div>
          <p>Tuning into Indian Music...</p>
        </div>
      `;

      const data = await API.getHome();
      this.renderHomePage(data);
    } catch (err) {
      homeContent.innerHTML = `
        <div class="error-container">
          <p>Failed to load music charts. Check your internet connection.</p>
          <button class="dhun-btn primary-btn" onclick="App.loadHomeData()">Retry</button>
        </div>
      `;
    }
  },

  renderHomePage(data) {
    const homeContent = document.getElementById('home-content');
    if (!homeContent) return;

    let html = '';

    // Hero Banner
    html += `
      <div class="hero-banner">
        <div class="hero-text-content">
          <div class="hero-badge">100% Ad-Free • 320kbps High Fidelity</div>
          <h1 class="hero-title">Experience Pure Indian Music</h1>
          <p class="hero-subtitle">Unlimited streaming across Bollywood, Punjabi, South Indian, Sufi, Classical & Indie. Zero interruptions.</p>
          <div class="hero-actions">
            <button class="dhun-btn hero-play-btn" onclick="App.quickPlayCategory('top-bollywood')">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              Play Top Bollywood Hits
            </button>
            <button class="dhun-btn secondary-btn" onclick="App.openConnectModal()">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h7"/></svg>
              Listen on Phone / Any Device
            </button>
          </div>
        </div>
        <div class="hero-visual">
          <div class="vinyl-record">
            <div class="vinyl-inner">
              <img src="/icons/icon.svg" alt="Dhun" class="vinyl-art" />
            </div>
          </div>
        </div>
      </div>
    `;

    // Curated Quick-Picks Genre Chips
    if (data.curatedCategories && data.curatedCategories.length > 0) {
      html += `
        <div class="section-block">
          <div class="section-header">
            <h2 class="section-title">Quick Picks for You</h2>
          </div>
          <div class="chips-scroll-container">
            ${data.curatedCategories.map(cat => `
              <button class="genre-chip" onclick="App.quickPlayCategory('${cat.id}', '${cat.name}')">
                <span class="chip-icon">${cat.icon}</span>
                <span class="chip-label">${cat.name}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Top Indian Charts
    if (data.charts && data.charts.length > 0) {
      html += `
        <div class="section-block">
          <div class="section-header">
            <h2 class="section-title">Trending Top Charts</h2>
          </div>
          <div class="cards-grid">
            ${data.charts.slice(0, 8).map(item => this.createCardHtml(item)).join('')}
          </div>
        </div>
      `;
    }

    // Featured Editorial Playlists
    if (data.featuredPlaylists && data.featuredPlaylists.length > 0) {
      html += `
        <div class="section-block">
          <div class="section-header">
            <h2 class="section-title">Featured Playlists</h2>
          </div>
          <div class="cards-grid">
            ${data.featuredPlaylists.slice(0, 10).map(item => this.createCardHtml(item)).join('')}
          </div>
        </div>
      `;
    }

    // New Bollywood & Regional Albums
    if (data.newAlbums && data.newAlbums.length > 0) {
      html += `
        <div class="section-block">
          <div class="section-header">
            <h2 class="section-title">New Releases & Albums</h2>
          </div>
          <div class="cards-grid">
            ${data.newAlbums.slice(0, 10).map(item => this.createCardHtml(item)).join('')}
          </div>
        </div>
      `;
    }

    homeContent.innerHTML = html;
  },

  createCardHtml(item) {
    const defaultImg = '/icons/icon.svg';
    const imgUrl = item.image || defaultImg;
    const title = this.escapeHtml(item.title);
    const subtitle = this.escapeHtml(item.subtitle || '');

    return `
      <div class="music-card" onclick="App.openItem('${item.type}', '${item.id}')">
        <div class="card-cover-container">
          <img src="${imgUrl}" alt="${title}" loading="lazy" class="card-cover-img" onerror="this.src='${defaultImg}'" />
          <button class="card-play-btn" onclick="event.stopPropagation(); App.playItem('${item.type}', '${item.id}')" title="Play">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>
        </div>
        <div class="card-info">
          <h3 class="card-title" title="${title}">${title}</h3>
          <p class="card-subtitle" title="${subtitle}">${subtitle}</p>
        </div>
      </div>
    `;
  },

  // === QUICK PLAY CATEGORIES ===
  async quickPlayCategory(catId, catName = '') {
    const queries = {
      'top-bollywood': 'Top Bollywood Songs',
      'punjabi-hits': 'Punjabi Top Hits',
      'south-hits': 'Tamil Telugu Hit Songs',
      'retro-90s': '90s Hindi Evergreen',
      'desi-lofi': 'Bollywood Lofi Flip',
      'devotional': 'Morning Bhajans Devotional',
      'sufi-ghazal': 'Best Sufi Ghazals',
      'indie-india': 'Indian Indie Hits'
    };

    const q = queries[catId] || catId;
    this.showToast(`Loading ${catName || 'Music'}...`);

    try {
      const data = await API.search(q, 'song', 1, 30);
      if (data.songs && data.songs.length > 0) {
        player.play(data.songs[0], data.songs);
        this.showToast(`Playing ${catName || 'category'}`);
      }
    } catch (err) {
      this.showToast('Failed to load songs');
    }
  },

  // === SEARCH ===
  handleSearchInput(value) {
    clearTimeout(this.searchDebounceTimer);
    const query = value.trim();

    if (!query) {
      document.getElementById('search-results').innerHTML = `
        <div class="search-placeholder">
          <div class="search-placeholder-icon">🔍</div>
          <h3>Search Indian Music</h3>
          <p>Find your favorite songs, artists, albums, or playlists across all Indian languages.</p>
          <div class="popular-searches">
            <span>Popular searches:</span>
            <button class="popular-search-tag" onclick="App.setSearchTerm('Arijit Singh')">Arijit Singh</button>
            <button class="popular-search-tag" onclick="App.setSearchTerm('Sidhu Moose Wala')">Sidhu Moose Wala</button>
            <button class="popular-search-tag" onclick="App.setSearchTerm('Anirudh Ravichander')">Anirudh</button>
            <button class="popular-search-tag" onclick="App.setSearchTerm('Kesariya')">Kesariya</button>
            <button class="popular-search-tag" onclick="App.setSearchTerm('Diljit Dosanjh')">Diljit Dosanjh</button>
            <button class="popular-search-tag" onclick="App.setSearchTerm('Shreya Ghoshal')">Shreya Ghoshal</button>
            <button class="popular-search-tag" onclick="App.setSearchTerm('KK Hits')">KK Hits</button>
          </div>
        </div>
      `;
      return;
    }

    this.searchDebounceTimer = setTimeout(() => {
      this.performSearch(query);
    }, 350);
  },

  setSearchTerm(term) {
    const input = document.getElementById('search-input');
    if (input) {
      input.value = term;
      this.switchView('search');
      this.performSearch(term);
    }
  },

  async performSearch(query) {
    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = `
      <div class="loading-spinner-container">
        <div class="dhun-spinner"></div>
        <p>Searching for "${this.escapeHtml(query)}"...</p>
      </div>
    `;

    try {
      const data = await API.search(query, 'all', 1, 25);
      this.renderSearchResults(data, query);
    } catch (err) {
      resultsContainer.innerHTML = `
        <div class="error-container">
          <p>Search failed. Please try again.</p>
        </div>
      `;
    }
  },

  renderSearchResults(data, query) {
    const container = document.getElementById('search-results');
    if (!container) return;

    const songs = data.songs || [];
    const albums = data.albums || [];
    const playlists = data.playlists || [];

    if (songs.length === 0 && albums.length === 0 && playlists.length === 0) {
      container.innerHTML = `
        <div class="search-empty-state">
          <h3>No results found for "${this.escapeHtml(query)}"</h3>
          <p>Try searching for a different song, singer, or film name.</p>
        </div>
      `;
      return;
    }

    let html = '';

    // Songs Section
    if (songs.length > 0) {
      html += `
        <div class="section-block">
          <div class="section-header">
            <h2 class="section-title">Songs</h2>
            <button class="dhun-btn text-btn" onclick="player.play(App.currentSearchResults[0], App.currentSearchResults)">Play All</button>
          </div>
          <div class="song-list">
            ${songs.map((song, i) => this.createSongRowHtml(song, i, 'search')).join('')}
          </div>
        </div>
      `;
      this.currentSearchResults = songs;
    }

    // Albums Section
    if (albums.length > 0) {
      html += `
        <div class="section-block">
          <div class="section-header">
            <h2 class="section-title">Albums</h2>
          </div>
          <div class="cards-grid">
            ${albums.slice(0, 6).map(item => this.createCardHtml(item)).join('')}
          </div>
        </div>
      `;
    }

    // Playlists Section
    if (playlists.length > 0) {
      html += `
        <div class="section-block">
          <div class="section-header">
            <h2 class="section-title">Playlists</h2>
          </div>
          <div class="cards-grid">
            ${playlists.slice(0, 6).map(item => this.createCardHtml(item)).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  },

  createSongRowHtml(song, index, context = 'list') {
    const isPlayingCurrent = player.currentSong && player.currentSong.id === song.id;
    const isLiked = Storage.isLiked(song.id);
    const durationStr = this.formatDuration(song.duration);

    return `
      <div class="song-row ${isPlayingCurrent ? 'playing-now' : ''}" data-song-id="${song.id}" onclick="App.handleSongRowClick('${song.id}', '${context}')">
        <div class="song-col-index">
          <span class="index-num">${index + 1}</span>
          <button class="row-play-btn" title="Play">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>
          <div class="row-sound-bars">
            <span></span><span></span><span></span>
          </div>
        </div>
        <div class="song-col-cover">
          <img src="${song.image || '/icons/icon.svg'}" alt="${this.escapeHtml(song.title)}" loading="lazy" />
        </div>
        <div class="song-col-info">
          <div class="song-title-text" title="${this.escapeHtml(song.title)}">${this.escapeHtml(song.title)}</div>
          <div class="song-artist-text" title="${this.escapeHtml(song.artist)}">${this.escapeHtml(song.artist)}</div>
        </div>
        <div class="song-col-album" title="${this.escapeHtml(song.album || '')}">
          ${this.escapeHtml(song.album || '')}
        </div>
        <div class="song-col-actions">
          <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" onclick="event.stopPropagation(); App.toggleLikeSong('${song.id}')" title="${isLiked ? 'Remove from Likes' : 'Like'}">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="${isLiked ? '#ff6b35' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </button>
          <button class="action-btn download-btn" onclick="event.stopPropagation(); App.downloadSong('${song.id}')" title="Download 320kbps MP3">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
          </button>
          <button class="action-btn menu-btn" onclick="event.stopPropagation(); App.openSongContextMenu(event, '${song.id}')" title="More options">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
            </svg>
          </button>
          <span class="song-duration">${durationStr}</span>
        </div>
      </div>
    `;
  },

  handleSongRowClick(songId, context) {
    let sourceQueue = [];
    if (context === 'search') {
      sourceQueue = this.currentSearchResults || [];
    } else if (context === 'details') {
      sourceQueue = this.currentCollection?.songs || [];
    } else if (context === 'library_likes') {
      sourceQueue = Storage.getLikedSongs();
    } else if (context === 'library_history') {
      sourceQueue = Storage.getHistory();
    } else if (context === 'playlist_detail') {
      sourceQueue = this.currentCustomPlaylist?.songs || [];
    }

    const song = sourceQueue.find(s => s.id === songId);
    if (song) {
      player.play(song, sourceQueue);
    }
  },

  // === EXPLORE VIEW: LANGUAGES & INDIAN GENRES ===
  loadExploreCategories() {
    const exploreContainer = document.getElementById('explore-content');
    if (!exploreContainer) return;

    const languages = [
      { id: 'hindi', name: 'Hindi', native: 'हिन्दी', query: 'Latest Hindi Hits', color: 'from-orange-500 to-amber-600' },
      { id: 'punjabi', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', query: 'Top Punjabi Songs', color: 'from-amber-500 to-yellow-600' },
      { id: 'tamil', name: 'Tamil', native: 'தமிழ்', query: 'Top Tamil Hits', color: 'from-rose-500 to-red-600' },
      { id: 'telugu', name: 'Telugu', native: 'తెలుగు', query: 'Top Telugu Songs', color: 'from-emerald-500 to-teal-600' },
      { id: 'malayalam', name: 'Malayalam', native: 'മലയാളം', query: 'Top Malayalam Songs', color: 'from-cyan-500 to-blue-600' },
      { id: 'kannada', name: 'Kannada', native: 'ಕನ್ನಡ', query: 'Top Kannada Hits', color: 'from-indigo-500 to-purple-600' },
      { id: 'bengali', name: 'Bengali', native: 'বাংলা', query: 'Top Bengali Songs', color: 'from-purple-500 to-pink-600' },
      { id: 'bhojpuri', name: 'Bhojpuri', native: 'भोजपुरी', query: 'Top Bhojpuri Hits', color: 'from-pink-500 to-rose-600' },
      { id: 'gujarati', name: 'Gujarati', native: 'ગુજરાતી', query: 'Top Gujarati Hits', color: 'from-yellow-500 to-orange-600' },
      { id: 'marathi', name: 'Marathi', native: 'मराठी', query: 'Top Marathi Hits', color: 'from-red-500 to-amber-600' },
      { id: 'english', name: 'English Pop', native: 'Global', query: 'International Pop Hits', color: 'from-blue-500 to-indigo-600' }
    ];

    const genres = [
      { title: 'Bollywood Romance', query: 'Bollywood Romance Songs', icon: '💖', desc: 'Arijit Singh, Shreya Ghoshal, Atif Aslam' },
      { title: 'Punjabi Bangers', query: 'Punjabi Bangers', icon: '🔥', desc: 'Sidhu Moose Wala, Karan Aujla, AP Dhillon' },
      { title: 'Desi Lo-Fi Study', query: 'Desi Lofi Study Relax', icon: '🌙', desc: 'Slowed, acoustic & calming midnight beats' },
      { title: 'Bhakti & Spiritual', query: 'Shiv Hanuman Krishna Bhajans', icon: '🪔', desc: 'Mantras, Aarti, Shlokas & peaceful prayers' },
      { title: 'Sufi & Ghazal', query: 'Best Sufi Ghazals Nusrat Jagjit', icon: '🕯️', desc: 'Nusrat Fateh Ali Khan, Jagjit Singh, Rahat' },
      { title: 'Indian Classical', query: 'Indian Classical Sitar Bansuri', icon: '🎻', desc: 'Ravi Shankar, Hariprasad Chaurasia, Raagas' },
      { title: 'Desi Hip-Hop & Rap', query: 'Desi Hip Hop Divine KR$NA', icon: '💥', desc: 'DIVINE, KR$NA, Raftaar, MC Stan, Seedhe Maut' },
      { title: 'Party & Bhangra', query: 'Wedding Bhangra Party Dance', icon: '💃', desc: 'Dhol beats, dance anthems & wedding energy' },
      { title: '90s Nostalgia', query: '90s Hindi Romantic Hits', icon: '📻', desc: 'Kumar Sanu, Alka Yagnik, Udit Narayan, Sonu Nigam' }
    ];

    let html = `
      <div class="explore-header-box">
        <h2>Explore Indian Music & Languages</h2>
        <p>Pick your language or genre to dive into curated ad-free stations.</p>
      </div>

      <div class="section-block">
        <h3 class="section-title">Music by Language</h3>
        <div class="languages-grid">
          ${languages.map(l => `
            <div class="lang-card" onclick="App.loadCategorySearch('${this.escapeHtml(l.query)}', '${this.escapeHtml(l.name + ' Hits')}')">
              <span class="lang-native">${l.native}</span>
              <span class="lang-name">${l.name}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="section-block">
        <h3 class="section-title">Featured Moods & Indian Genres</h3>
        <div class="explore-genres-grid">
          ${genres.map(g => `
            <div class="genre-card" onclick="App.loadCategorySearch('${this.escapeHtml(g.query)}', '${this.escapeHtml(g.title)}')">
              <div class="genre-icon">${g.icon}</div>
              <div class="genre-info">
                <h4>${g.title}</h4>
                <p>${g.desc}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    exploreContainer.innerHTML = html;
  },

  async loadCategorySearch(query, title) {
    this.switchView('search');
    const input = document.getElementById('search-input');
    if (input) input.value = query;
    await this.performSearch(query);
  },

  // === LIBRARY VIEW ===
  loadLibraryView() {
    const libraryContainer = document.getElementById('library-content');
    if (!libraryContainer) return;

    const liked = Storage.getLikedSongs();
    const history = Storage.getHistory();
    const playlists = Storage.getPlaylists();

    let html = `
      <div class="library-header">
        <h2>Your Personal Library</h2>
        <div class="library-actions">
          <button class="dhun-btn primary-btn" onclick="App.promptCreatePlaylist()">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            Create Playlist
          </button>
        </div>
      </div>

      <!-- Quick Library Cards -->
      <div class="library-cards-row">
        <div class="library-hero-card likes-hero" onclick="App.openLikedSongs()">
          <div class="likes-icon-circle">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="#fff"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </div>
          <div>
            <h3>Liked Songs</h3>
            <p>${liked.length} Favorite Songs</p>
          </div>
        </div>

        <div class="library-hero-card history-hero" onclick="App.openHistory()">
          <div class="history-icon-circle">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <div>
            <h3>Recently Played</h3>
            <p>${history.length} Songs History</p>
          </div>
        </div>
      </div>

      <!-- User Created Playlists -->
      <div class="section-block">
        <div class="section-header">
          <h3 class="section-title">Your Playlists</h3>
        </div>
        ${playlists.length === 0 ? `
          <div class="empty-playlists-box">
            <p>You haven't created any playlists yet.</p>
            <button class="dhun-btn secondary-btn" onclick="App.promptCreatePlaylist()">Create Your First Playlist</button>
          </div>
        ` : `
          <div class="cards-grid">
            ${playlists.map(p => `
              <div class="music-card" onclick="App.openCustomPlaylist('${p.id}')">
                <div class="card-cover-container">
                  <div class="custom-playlist-cover">
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="#ff6b35"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                  </div>
                </div>
                <div class="card-info">
                  <h4 class="card-title">${this.escapeHtml(p.title)}</h4>
                  <p class="card-subtitle">${p.songs.length} songs</p>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;

    libraryContainer.innerHTML = html;
  },

  openLikedSongs() {
    const liked = Storage.getLikedSongs();
    this.renderCustomCollection('Liked Songs', 'Your personal collection of favorite tracks', liked, 'library_likes');
  },

  openHistory() {
    const history = Storage.getHistory();
    this.renderCustomCollection('Recently Played', 'Tracks you listened to recently', history, 'library_history');
  },

  openCustomPlaylist(playlistId) {
    const playlists = Storage.getPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    this.currentCustomPlaylist = playlist;
    this.renderCustomCollection(playlist.title, playlist.description || `${playlist.songs.length} tracks`, playlist.songs, 'playlist_detail', playlistId);
  },

  renderCustomCollection(title, subtitle, songs, context, playlistId = null) {
    this.switchView('details');
    const container = document.getElementById('details-content');
    if (!container) return;

    let html = `
      <div class="details-hero">
        <div class="details-hero-cover custom-details-cover">
          <svg viewBox="0 0 24 24" width="72" height="72" fill="#ff6b35"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
        </div>
        <div class="details-hero-meta">
          <span class="details-badge">PLAYLIST</span>
          <h1 class="details-title">${this.escapeHtml(title)}</h1>
          <p class="details-desc">${this.escapeHtml(subtitle)}</p>
          <div class="details-stats">${songs.length} songs</div>
          <div class="details-hero-actions">
            ${songs.length > 0 ? `
              <button class="dhun-btn hero-play-btn" onclick="player.play(App.currentDetailsSongs[0], App.currentDetailsSongs)">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                Play All
              </button>
              <button class="dhun-btn secondary-btn" onclick="player.isShuffle = true; player.play(App.currentDetailsSongs[0], App.currentDetailsSongs)">
                Shuffle
              </button>
            ` : ''}
            ${playlistId ? `
              <button class="dhun-btn text-btn delete-btn" onclick="App.deletePlaylist('${playlistId}')">Delete Playlist</button>
            ` : ''}
          </div>
        </div>
      </div>

      <div class="section-block">
        ${songs.length === 0 ? `
          <div class="empty-list-placeholder">
            <p>No songs here yet. Explore Indian music and click the heart or menu icon to add songs!</p>
          </div>
        ` : `
          <div class="song-list">
            ${songs.map((song, i) => this.createSongRowHtml(song, i, context)).join('')}
          </div>
        `}
      </div>
    `;

    this.currentDetailsSongs = songs;
    container.innerHTML = html;
  },

  deletePlaylist(playlistId) {
    if (confirm('Are you sure you want to delete this playlist?')) {
      Storage.deletePlaylist(playlistId);
      this.showToast('Playlist deleted');
      this.switchView('library');
    }
  },

  // === DETAILS VIEW (ALBUMS & PLAYLISTS) ===
  async openItem(type, id) {
    this.switchView('details');
    const container = document.getElementById('details-content');
    if (!container) return;

    container.innerHTML = `
      <div class="loading-spinner-container">
        <div class="dhun-spinner"></div>
        <p>Loading ${type}...</p>
      </div>
    `;

    try {
      let data = null;
      if (type === 'playlist') {
        data = await API.getPlaylist(id);
      } else if (type === 'album') {
        data = await API.getAlbum(id);
      }

      if (!data) throw new Error('Data not found');
      this.renderCollectionDetails(data);
    } catch (err) {
      container.innerHTML = `
        <div class="error-container">
          <p>Failed to load ${type}.</p>
          <button class="dhun-btn secondary-btn" onclick="App.switchView('home')">Go Back</button>
        </div>
      `;
    }
  },

  async playItem(type, id) {
    this.showToast('Loading playback...');
    try {
      let data = null;
      if (type === 'playlist') data = await API.getPlaylist(id);
      else if (type === 'album') data = await API.getAlbum(id);

      if (data && data.songs && data.songs.length > 0) {
        player.play(data.songs[0], data.songs);
        this.showToast(`Playing ${data.title}`);
      }
    } catch (err) {
      this.showToast('Failed to play item');
    }
  },

  renderCollectionDetails(collection) {
    const container = document.getElementById('details-content');
    if (!container) return;

    this.currentCollection = collection;
    const songs = collection.songs || [];
    const defaultImg = '/icons/icon.svg';

    let html = `
      <div class="details-hero">
        <div class="details-hero-cover">
          <img src="${collection.image || defaultImg}" alt="${this.escapeHtml(collection.title)}" onerror="this.src='${defaultImg}'" />
        </div>
        <div class="details-hero-meta">
          <span class="details-badge">COLLECTION</span>
          <h1 class="details-title">${this.escapeHtml(collection.title)}</h1>
          <p class="details-desc">${this.escapeHtml(collection.subtitle || collection.description || '')}</p>
          <div class="details-stats">${songs.length} songs ${collection.year ? `• ${collection.year}` : ''}</div>
          <div class="details-hero-actions">
            ${songs.length > 0 ? `
              <button class="dhun-btn hero-play-btn" onclick="player.play(App.currentCollection.songs[0], App.currentCollection.songs)">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                Play All
              </button>
              <button class="dhun-btn secondary-btn" onclick="player.isShuffle = true; player.play(App.currentCollection.songs[0], App.currentCollection.songs)">
                Shuffle
              </button>
            ` : ''}
          </div>
        </div>
      </div>

      <div class="section-block">
        <div class="song-list">
          ${songs.map((song, i) => this.createSongRowHtml(song, i, 'details')).join('')}
        </div>
      </div>
    `;

    container.innerHTML = html;
  },

  // === PLAYER UI UPDATES ===
  initPlayerUI() {
    // Song Change Listener
    window.addEventListener('dhun:songchange', (e) => {
      const song = e.detail;
      this.updatePlayerInfo(song);
      this.updateActiveRowHighlight(song.id);
    });

    // Play/Pause State Listeners
    window.addEventListener('dhun:play', () => this.updatePlayButtonState(true));
    window.addEventListener('dhun:pause', () => this.updatePlayButtonState(false));

    // Time Progress Listener
    window.addEventListener('dhun:timeupdate', (e) => {
      const { currentTime, duration, progress } = e.detail;
      this.updateProgressBar(currentTime, duration, progress);
    });

    // Volume Listener
    window.addEventListener('dhun:volumechange', (e) => {
      this.updateVolumeUI(e.detail.volume, e.detail.muted);
    });

    // Shuffle & Repeat Listeners
    window.addEventListener('dhun:shufflechange', (e) => {
      const btn = document.getElementById('player-shuffle-btn');
      if (btn) btn.classList.toggle('active', e.detail);
    });
    window.addEventListener('dhun:repeatchange', (e) => {
      const btn = document.getElementById('player-repeat-btn');
      if (btn) {
        btn.classList.toggle('active', e.detail !== 'off');
        btn.setAttribute('data-repeat-mode', e.detail);
      }
    });

    // Sleep Timer Listener
    window.addEventListener('dhun:sleeptimerchange', (e) => {
      const badge = document.getElementById('sleep-timer-badge');
      if (badge) {
        if (e.detail) {
          badge.textContent = `${e.detail.minutes}m`;
          badge.style.display = 'inline-block';
        } else {
          badge.style.display = 'none';
        }
      }
    });

    // Setup Progress Sliders (Desktop bar & Fullscreen modal)
    ['seek-slider', 'full-seek-slider'].forEach(id => {
      const slider = document.getElementById(id);
      if (slider) {
        slider.addEventListener('input', (e) => {
          const percent = parseFloat(e.target.value);
          player.seekPercent(percent);
        });
      }
    });

    // Volume Slider
    const volumeSlider = document.getElementById('volume-slider');
    if (volumeSlider) {
      volumeSlider.value = player.volume * 100;
      volumeSlider.addEventListener('input', (e) => {
        player.setVolume(parseFloat(e.target.value) / 100);
      });
    }

    // Audio Quality Switcher in Player Bar
    const qualitySelect = document.getElementById('quality-select');
    if (qualitySelect) {
      qualitySelect.value = player.quality;
      qualitySelect.addEventListener('change', (e) => {
        player.setQuality(e.target.value);
        this.showToast(`Audio set to ${e.target.value === '320' ? '320kbps High Fidelity' : '160kbps Standard'}`);
      });
    }
  },

  updatePlayerInfo(song) {
    if (!song) return;

    const defaultImg = '/icons/icon.svg';
    const imgUrl = song.image || defaultImg;
    const isLiked = Storage.isLiked(song.id);

    // Desktop Bottom Bar
    const barThumb = document.getElementById('player-thumb');
    const barTitle = document.getElementById('player-title');
    const barArtist = document.getElementById('player-artist');
    const barLikeBtn = document.getElementById('player-like-btn');

    if (barThumb) barThumb.src = imgUrl;
    if (barTitle) barTitle.textContent = song.title;
    if (barArtist) barArtist.textContent = song.artist;
    if (barLikeBtn) {
      barLikeBtn.classList.toggle('liked', isLiked);
      barLikeBtn.querySelector('svg').setAttribute('fill', isLiked ? '#ff6b35' : 'none');
    }

    // Mobile Mini Player
    const miniThumb = document.getElementById('mini-thumb');
    const miniTitle = document.getElementById('mini-title');
    const miniArtist = document.getElementById('mini-artist');

    if (miniThumb) miniThumb.src = imgUrl;
    if (miniTitle) miniTitle.textContent = song.title;
    if (miniArtist) miniArtist.textContent = song.artist;

    // Full-Screen Player Modal
    const fullCover = document.getElementById('full-player-cover');
    const fullTitle = document.getElementById('full-player-title');
    const fullArtist = document.getElementById('full-player-artist');
    const fullAlbum = document.getElementById('full-player-album');
    const fullLikeBtn = document.getElementById('full-player-like-btn');
    const fullBg = document.getElementById('full-player-bg');

    if (fullCover) fullCover.src = imgUrl;
    if (fullTitle) fullTitle.textContent = song.title;
    if (fullArtist) fullArtist.textContent = song.artist;
    if (fullAlbum) fullAlbum.textContent = song.album || '';
    if (fullBg) fullBg.style.backgroundImage = `url(${imgUrl})`;
    if (fullLikeBtn) {
      fullLikeBtn.classList.toggle('liked', isLiked);
      fullLikeBtn.querySelector('svg').setAttribute('fill', isLiked ? '#ff6b35' : 'none');
    }

    // Enable player bars visibility
    const playerBar = document.getElementById('desktop-player-bar');
    const miniPlayer = document.getElementById('mobile-mini-player');
    if (playerBar) playerBar.classList.add('visible');
    if (miniPlayer) miniPlayer.classList.add('visible');
  },

  updatePlayButtonState(isPlaying) {
    const playIcons = document.querySelectorAll('.player-play-icon');
    const pauseIcons = document.querySelectorAll('.player-pause-icon');

    playIcons.forEach(icon => icon.style.display = isPlaying ? 'none' : 'block');
    pauseIcons.forEach(icon => icon.style.display = isPlaying ? 'block' : 'none');

    // Spin animation on vinyl / album art in full player
    const fullArt = document.querySelector('.full-cover-wrapper');
    if (fullArt) {
      fullArt.classList.toggle('spinning', isPlaying);
    }
  },

  updateProgressBar(currentTime, duration, progress) {
    const curTimeStr = this.formatDuration(currentTime);
    const totalTimeStr = this.formatDuration(duration);

    // Desktop Bar
    const curTimeEl = document.getElementById('time-current');
    const totalTimeEl = document.getElementById('time-total');
    const slider = document.getElementById('seek-slider');
    const progressFill = document.getElementById('seek-progress-fill');

    if (curTimeEl) curTimeEl.textContent = curTimeStr;
    if (totalTimeEl) totalTimeEl.textContent = totalTimeStr;
    if (slider) slider.value = progress || 0;
    if (progressFill) progressFill.style.width = `${progress || 0}%`;

    // Mobile Mini-Player progress line
    const miniProgress = document.getElementById('mini-progress-line');
    if (miniProgress) miniProgress.style.width = `${progress || 0}%`;

    // Fullscreen Player
    const fullCurTime = document.getElementById('full-time-current');
    const fullTotalTime = document.getElementById('full-time-total');
    const fullSlider = document.getElementById('full-seek-slider');
    const fullFill = document.getElementById('full-seek-fill');

    if (fullCurTime) fullCurTime.textContent = curTimeStr;
    if (fullTotalTime) fullTotalTime.textContent = totalTimeStr;
    if (fullSlider) fullSlider.value = progress || 0;
    if (fullFill) fullFill.style.width = `${progress || 0}%`;
  },

  updateVolumeUI(volume, muted) {
    const iconHigh = document.querySelector('.vol-icon-high');
    const iconMuted = document.querySelector('.vol-icon-muted');
    const slider = document.getElementById('volume-slider');

    if (slider && !muted) slider.value = volume * 100;
    if (iconHigh) iconHigh.style.display = muted || volume === 0 ? 'none' : 'block';
    if (iconMuted) iconMuted.style.display = muted || volume === 0 ? 'block' : 'none';
  },

  updateActiveRowHighlight(currentSongId) {
    document.querySelectorAll('.song-row').forEach(row => {
      if (row.dataset.songId === currentSongId) {
        row.classList.add('playing-now');
      } else {
        row.classList.remove('playing-now');
      }
    });
  },

  // === ACTIONS: LIKE & DOWNLOAD ===
  toggleLikeSong(songId) {
    let song = null;
    if (player.currentSong && player.currentSong.id === songId) {
      song = player.currentSong;
    } else {
      const row = document.querySelector(`.song-row[data-song-id="${songId}"]`);
      if (row) {
        // find from current sources
        song = (this.currentSearchResults || []).find(s => s.id === songId) ||
               (this.currentCollection?.songs || []).find(s => s.id === songId) ||
               Storage.getLikedSongs().find(s => s.id === songId);
      }
    }

    if (song) {
      const isLiked = Storage.toggleLike(song);
      this.showToast(isLiked ? 'Added to Liked Songs ❤️' : 'Removed from Liked Songs');
      // Update UI buttons
      document.querySelectorAll(`[data-song-id="${songId}"] .like-btn`).forEach(btn => {
        btn.classList.toggle('liked', isLiked);
        btn.querySelector('svg').setAttribute('fill', isLiked ? '#ff6b35' : 'none');
      });
      if (player.currentSong && player.currentSong.id === songId) {
        this.updatePlayerInfo(song);
      }
    }
  },

  downloadSong(songId) {
    const url = API.getDownloadUrl(songId, player.quality);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('Starting 320kbps MP3 download...');
  },

  // === MODALS & DRAWERS ===
  initModals() {
    // Backdrop click closes all modals
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('open');
      });
    });
  },

  openConnectModal() {
    const modal = document.getElementById('connect-device-modal');
    if (modal) {
      modal.classList.add('open');
      this.checkNetworkInfo();
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
  },

  async checkNetworkInfo() {
    try {
      const info = await API.getNetworkInfo();
      const qrImg = document.getElementById('device-qr-image');
      const urlText = document.getElementById('device-network-url');

      if (qrImg) qrImg.src = info.qrCode;
      if (urlText) urlText.textContent = info.networkUrl;
      this.networkUrl = info.networkUrl;
    } catch (e) {
      console.warn('Network info unavailable:', e);
    }
  },

  copyDeviceLink() {
    if (this.networkUrl) {
      navigator.clipboard.writeText(this.networkUrl).then(() => {
        this.showToast('Link copied! Open in your phone or TV browser');
      });
    }
  },

  // Equalizer Modal
  openEqualizerModal() {
    const modal = document.getElementById('equalizer-modal');
    if (modal) {
      modal.classList.add('open');
      player.initAudioContext();
    }
  },

  selectEqPreset(name) {
    player.applyEqPreset(name);
    document.querySelectorAll('.eq-preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === name);
    });
    this.showToast(`Equalizer: ${name.toUpperCase()}`);
  },

  // Sleep Timer Modal
  openSleepTimerModal() {
    const modal = document.getElementById('sleep-timer-modal');
    if (modal) modal.classList.add('open');
  },

  setSleepTimer(minutes) {
    player.setSleepTimer(minutes);
    this.closeModal('sleep-timer-modal');
    if (minutes > 0) {
      this.showToast(`Sleep timer set for ${minutes} minutes 🌙`);
    } else {
      this.showToast('Sleep timer turned off');
    }
  },

  // Full Screen Player Sheet (Mobile & Immersive)
  openFullPlayer() {
    const modal = document.getElementById('full-player-sheet');
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  },

  closeFullPlayer() {
    const modal = document.getElementById('full-player-sheet');
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  },

  // Lyrics Drawer
  toggleLyricsDrawer() {
    const drawer = document.getElementById('lyrics-drawer');
    const btn = document.getElementById('player-lyrics-btn');
    if (drawer) {
      const isOpen = drawer.classList.toggle('open');
      if (btn) btn.classList.toggle('active', isOpen);
      if (isOpen && player.currentSong) {
        LyricsManager.loadLyrics(player.currentSong);
      }
    }
  },

  // Queue Drawer
  toggleQueueDrawer() {
    const drawer = document.getElementById('queue-drawer');
    const btn = document.getElementById('player-queue-btn');
    if (drawer) {
      const isOpen = drawer.classList.toggle('open');
      if (btn) btn.classList.toggle('active', isOpen);
      if (isOpen) this.renderQueueList();
    }
  },

  renderQueueList() {
    const listContainer = document.getElementById('queue-list-container');
    if (!listContainer) return;

    if (player.queue.length === 0) {
      listContainer.innerHTML = '<p class="queue-empty">Queue is empty</p>';
      return;
    }

    listContainer.innerHTML = player.queue.map((song, i) => `
      <div class="queue-item ${i === player.queueIndex ? 'current' : ''}">
        <span class="queue-num">${i + 1}</span>
        <img src="${song.image || '/icons/icon.svg'}" class="queue-thumb" />
        <div class="queue-info" onclick="player.play(player.queue[${i}])">
          <div class="queue-title">${this.escapeHtml(song.title)}</div>
          <div class="queue-artist">${this.escapeHtml(song.artist)}</div>
        </div>
        <button class="queue-remove-btn" onclick="player.removeFromQueue(${i}); App.renderQueueList();" title="Remove">✕</button>
      </div>
    `).join('');
  },

  // Playlist Creation
  promptCreatePlaylist() {
    const name = prompt('Enter a name for your new playlist:');
    if (name && name.trim()) {
      Storage.createPlaylist(name.trim());
      this.showToast(`Playlist "${name.trim()}" created!`);
      if (this.currentView === 'library') this.loadLibraryView();
    }
  },

  openSongContextMenu(event, songId) {
    const playlists = Storage.getPlaylists();
    if (playlists.length === 0) {
      const create = confirm('You have no playlists yet. Create one now?');
      if (create) this.promptCreatePlaylist();
      return;
    }

    const playlistNames = playlists.map((p, i) => `${i + 1}. ${p.title}`).join('\n');
    const choice = prompt(`Select playlist number to add to:\n${playlistNames}`);
    const index = parseInt(choice, 10) - 1;

    if (!isNaN(index) && playlists[index]) {
      const song = (this.currentSearchResults || []).find(s => s.id === songId) ||
                   (this.currentCollection?.songs || []).find(s => s.id === songId) ||
                   player.currentSong;
      if (song) {
        Storage.addSongToPlaylist(playlists[index].id, song);
        this.showToast(`Added to "${playlists[index].title}"`);
      }
    }
  },

  // === KEYBOARD SHORTCUTS ===
  initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Don't trigger when typing in inputs
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        if (e.key === 'Escape') e.target.blur();
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          player.togglePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          player.seek(player.currentTime - 5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          player.seek(player.currentTime + 5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          player.setVolume(player.volume + 0.05);
          break;
        case 'ArrowDown':
          e.preventDefault();
          player.setVolume(player.volume - 0.05);
          break;
        case 'KeyM':
          player.toggleMute();
          break;
        case 'KeyL':
          this.toggleLyricsDrawer();
          break;
        case 'KeyN':
          player.nextTrack();
          break;
        case 'KeyP':
          player.prevTrack();
          break;
        case 'Slash':
          e.preventDefault();
          const searchInput = document.getElementById('search-input');
          if (searchInput) {
            this.switchView('search');
            searchInput.focus();
          }
          break;
        case 'Escape':
          document.querySelectorAll('.modal-backdrop.open').forEach(m => m.classList.remove('open'));
          break;
      }
    });
  },

  // === PWA REGISTRATION & INSTALL PROMPT ===
  registerPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW reg fail:', err));
      });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPrompt = e;
      const banner = document.getElementById('pwa-install-banner');
      if (banner) banner.style.display = 'flex';
    });
  },

  promptPwaInstall() {
    if (this.installPrompt) {
      this.installPrompt.prompt();
      this.installPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          this.showToast('Dhun installed! Enjoy ad-free music on your home screen.');
        }
        this.installPrompt = null;
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.style.display = 'none';
      });
    }
  },

  dismissPwaBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.style.display = 'none';
  },

  // === EVENT BINDINGS ===
  bindEvents() {
    // Navigation items
    document.querySelectorAll('[data-view-target]').forEach(el => {
      el.addEventListener('click', () => {
        this.switchView(el.dataset.viewTarget);
      });
    });

    // Search bar input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.handleSearchInput(e.target.value));
    }
  },

  // === HELPERS ===
  formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  showToast(message) {
    const toast = document.getElementById('dhun-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
