# 🎵 Dhun (धुन्) — Ad-Free Indian Music For Any Device

**Dhun** is a modern, high-fidelity Indian music streaming progressive web application (PWA) engineered to deliver an **uninterrupted, 100% ad-free listening experience across all your devices** — mobile phones (Android & iPhone), tablets, laptops, desktops, and smart TVs.

![Dhun Music App](/icons/icon.svg)

---

## 🌟 Key Features

### 1. 🚫 100% Completely Ad-Free
- **Zero audio ads**, zero banner ads, zero video interruptions.
- Uninterrupted, non-stop music streaming from start to finish.

### 2. 🎶 Vast Indian Music Catalog
- Access to **30+ million songs, albums, and playlists**.
- **All Indian Languages & Genres**:
  - **Bollywood Hits**: Latest blockbusters, 2000s classics, and 90s nostalgia.
  - **Punjabi Bangers**: Sidhu Moose Wala, AP Dhillon, Diljit Dosanjh, Karan Aujla.
  - **South Cinema**: Tamil, Telugu, Malayalam, Kannada (Anirudh, AR Rahman, Devi Sri Prasad).
  - **Devotional & Bhakti**: Shiv Tandav, Hanuman Chalisa, Krishna Bhajans, Mantras.
  - **Sufi & Ghazals**: Nusrat Fateh Ali Khan, Jagjit Singh, Rahat Fateh Ali Khan.
  - **Indian Classical & Instrumental**: Sitar, Bansuri flute, Sarod, Tabla raagas.
  - **Desi Lo-Fi & Midnight Chill**: Acoustic, slowed & reverb chill beats.
  - **Desi Hip Hop / Rap & Indie**: DIVINE, KR$NA, Prateek Kuhad, Anuv Jain.

### 3. 📱 Play on Any Device (Cross-Platform & PWA)
- **Installable PWA**: Tap **"Install Dhun"** or **"Add to Home Screen"** on Android, iOS Safari, Windows, macOS, or ChromeOS for a full native app experience.
- **Local Wi-Fi Streaming & QR Code**: Built-in network sharing allows you to open Dhun on any phone, tablet, or Smart TV on your home Wi-Fi by simply scanning the on-screen QR code!
- **System MediaSession API**: Lock screen controls, notification drawer playback, and Apple CarPlay / Android Auto support with high-res cover art.
- **Adaptive Layout**: Automatically switches between desktop sidebar layout and mobile bottom navigation with swipeable sheet player.

### 4. 🎤 Real-Time Synchronized Lyrics (Karaoke Mode)
- Full **synchronized karaoke lyrics** with millisecond precision powered by LRCLIB + JioSaavn lyrics.
- Lyrics smoothly scroll and glow as the song plays.
- **Tap-to-Seek**: Tap any lyric line to instantly jump to that point in the song!

### 5. 🎧 320kbps High-Fidelity Audio & Offline Download
- Crystal-clear **320kbps and 160kbps AAC/MP3 streams** directly from high-speed CDNs.
- **1-Click Offline Download**: Download any song as a clean 320kbps MP3 file directly to your device storage.

### 6. 🎛️ 5-Band Equalizer & Sleep Timer
- **Equalizer Presets**: 🔥 Bass Boost, 🎤 Vocal Boost, 🎻 Acoustic, ✨ Treble, and 🌙 Night Mode.
- **Sleep Timer**: Set 15m, 30m, 45m, 60m with gentle fade-out for bedtime listening.

### 7. 📚 Personal Library
- Liked Songs ❤️ (stored in local browser storage).
- Custom Playlists creation and management.
- Recently Played history (last 50 songs).

---

## 🚀 Quick Start Guide

### Launching Dhun

#### Option A: One-Click Windows Launcher
Double-click `start.bat` inside `C:\Users\hj\.gemini\antigravity\scratch\dhun-music\start.bat`.

#### Option B: Terminal Command
```bash
cd C:\Users\hj\.gemini\antigravity\scratch\dhun-music
npm start
```

Once started, open your browser:
- **On this PC**: [http://localhost:5000](http://localhost:5000)
- **On any Phone, Tablet, or TV on your Wi-Fi**: Visit the **Network URL** shown in the terminal (or click the **"Play on Any Device"** button in Dhun to scan the QR code).

---

## 📲 How to Listen on Mobile Devices

### On Android (Chrome / Edge / Samsung Internet):
1. Connect your phone to the same Wi-Fi network as your PC.
2. Open the browser and scan the QR code in Dhun (or visit `http://<YOUR-PC-IP>:5000`).
3. Tap the **"Install"** banner or open the browser menu (⋮) and tap **"Add to Home Screen"** or **"Install App"**.
4. Dhun will install as an independent, fullscreen app with lock screen playback!

### On iPhone & iPad (Safari):
1. Connect your iPhone to the same Wi-Fi.
2. Open Safari and navigate to the Network URL.
3. Tap the **Share** button (box with upward arrow) at the bottom.
4. Scroll down and tap **"Add to Home Screen"**.
5. Tap **Add** — Dhun will appear on your iOS home screen as a native ad-free music app!

### On Smart TV / Fire TV / Android TV:
1. Open the TV web browser (Chrome, Silk, or TV Bro).
2. Enter the Network URL (`http://<YOUR-PC-IP>:5000`).
3. Sit back and enjoy ad-free music on your TV speakers or home theater!

---

## ⌨️ Desktop Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Space` | Play / Pause |
| `Left Arrow` / `Right Arrow` | Rewind / Fast Forward 5 seconds |
| `Up Arrow` / `Down Arrow` | Volume Up / Down 5% |
| `Key M` | Mute / Unmute |
| `Key L` | Toggle Synchronized Lyrics Drawer |
| `Key N` | Next Song |
| `Key P` | Previous Song (or restart current) |
| `/` (Slash) | Quick focus search bar |
| `Escape` | Close any open modal or drawer |

---

## 🛠️ Project Structure

```
dhun-music/
├── package.json              # Express, CORS, QRCode, CryptoJS dependencies
├── server.js                 # Express server, DES decryptor, LRCLIB lyrics, download handler
├── start.bat                 # Windows one-click batch launcher
├── start.ps1                 # Windows PowerShell launcher
├── README.md                 # Documentation & user guide
└── public/
    ├── index.html            # Semantic HTML5, PWA meta tags, views, player bars & modals
    ├── manifest.json         # PWA Web App Manifest (standalone, theme colors)
    ├── sw.js                 # Service worker for offline shell caching
    ├── css/
    │   └── style.css         # Modern dark glassmorphic responsive stylesheet
    ├── icons/
    │   └── icon.svg          # Saffron & gold musical swirl SVG app icon
    └── js/
        ├── api.js            # Frontend API client
        ├── app.js            # Main application UI controller & routing
        ├── lyrics.js         # Synced karaoke lyrics parser & auto-scroll engine
        ├── player.js         # Audio playback engine, Web Audio EQ, MediaSession
        └── storage.js        # LocalStorage manager for likes, playlists & history
```

---

## 💡 Setting as Active Workspace
To work directly on this project in your IDE, recommend setting the active workspace to:
`C:\Users\hj\.gemini\antigravity\scratch\dhun-music`
