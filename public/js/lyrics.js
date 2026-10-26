// Synchronized Lyrics Engine for Dhun Music App
const LyricsManager = {
  currentSongId: null,
  lyricsType: 'none', // 'synced' | 'plain' | 'none'
  syncedLines: [],
  activeIndex: -1,
  isUserScrolling: false,
  userScrollTimeout: null,

  async loadLyrics(song) {
    if (!song) return;
    if (this.currentSongId === song.id && this.syncedLines.length > 0) return;

    this.currentSongId = song.id;
    this.lyricsType = 'loading';
    this.syncedLines = [];
    this.activeIndex = -1;
    this.renderLoading();

    try {
      const data = await API.getLyrics(song.title, song.artist, song.duration, song.id);
      if (this.currentSongId !== song.id) return; // Song changed during fetch

      if (data.type === 'synced' && data.synced && data.synced.length > 0) {
        this.lyricsType = 'synced';
        this.syncedLines = data.synced;
        this.renderSyncedLyrics();
      } else if (data.plain && data.plain.trim()) {
        this.lyricsType = 'plain';
        this.renderPlainLyrics(data.plain);
      } else {
        this.lyricsType = 'none';
        this.renderNoLyrics(song);
      }
    } catch (err) {
      console.warn('Lyrics load error:', err);
      this.lyricsType = 'none';
      this.renderNoLyrics(song);
    }
  },

  updateTime(currentTime) {
    if (this.lyricsType !== 'synced' || this.syncedLines.length === 0) return;

    // Find active line: last line where time <= currentTime
    let newIndex = -1;
    for (let i = 0; i < this.syncedLines.length; i++) {
      if (this.syncedLines[i].time <= currentTime) {
        newIndex = i;
      } else {
        break;
      }
    }

    if (newIndex !== this.activeIndex && newIndex >= 0) {
      this.activeIndex = newIndex;
      this.highlightActiveLine(newIndex);
    }
  },

  highlightActiveLine(index) {
    const container = document.getElementById('lyrics-lines-container');
    if (!container) return;

    const lines = container.querySelectorAll('.lyrics-line');
    lines.forEach((line, i) => {
      if (i === index) {
        line.classList.add('active');
        line.classList.remove('passed');
        if (!this.isUserScrolling) {
          line.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else if (i < index) {
        line.classList.remove('active');
        line.classList.add('passed');
      } else {
        line.classList.remove('active', 'passed');
      }
    });
  },

  renderSyncedLyrics() {
    const container = document.getElementById('lyrics-lines-container');
    if (!container) return;

    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'lyrics-scroll-wrapper';

    this.syncedLines.forEach((item, index) => {
      const p = document.createElement('p');
      p.className = 'lyrics-line';
      p.dataset.time = item.time;
      p.textContent = item.text || '♪';

      // Tap line to jump to that timestamp
      p.addEventListener('click', () => {
        player.seek(item.time);
      });

      wrapper.appendChild(p);
    });

    container.appendChild(wrapper);

    // Track user scrolling so we don't snap back aggressively
    container.onscroll = () => {
      this.isUserScrolling = true;
      clearTimeout(this.userScrollTimeout);
      this.userScrollTimeout = setTimeout(() => {
        this.isUserScrolling = false;
      }, 3000);
    };
  },

  renderPlainLyrics(text) {
    const container = document.getElementById('lyrics-lines-container');
    if (!container) return;

    container.innerHTML = `
      <div class="lyrics-plain-wrapper">
        <div class="lyrics-badge">Static Lyrics</div>
        <pre class="lyrics-plain-text">${this.escapeHtml(text)}</pre>
      </div>
    `;
  },

  renderNoLyrics(song) {
    const container = document.getElementById('lyrics-lines-container');
    if (!container) return;

    const query = encodeURIComponent(`${song.title} ${song.artist} lyrics`);
    container.innerHTML = `
      <div class="lyrics-empty-state">
        <div class="lyrics-empty-icon">🎵</div>
        <h3>Synced lyrics not found</h3>
        <p>No synchronized lyrics available yet for "${this.escapeHtml(song.title)}".</p>
        <a href="https://www.google.com/search?q=${query}" target="_blank" rel="noopener" class="lyrics-search-btn">
          Search lyrics on Google ↗
        </a>
      </div>
    `;
  },

  renderLoading() {
    const container = document.getElementById('lyrics-lines-container');
    if (!container) return;

    container.innerHTML = `
      <div class="lyrics-loading-state">
        <div class="lyrics-spinner"></div>
        <p>Fetching synced lyrics...</p>
      </div>
    `;
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

// Listen to player time updates for real-time karaoke scrolling
window.addEventListener('dhun:timeupdate', (e) => {
  LyricsManager.updateTime(e.detail.currentTime);
});

// Listen to song changes to fetch fresh lyrics
window.addEventListener('dhun:songchange', (e) => {
  LyricsManager.loadLyrics(e.detail);
});
