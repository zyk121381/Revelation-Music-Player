<div align="right">
  <a title="English" href="README_EN.md"><img src="https://img.shields.io/badge/-English-A31F34?style=for-the-badge" alt="English" /></a>
  <a title="简体中文" href="README.md"><img src="https://img.shields.io/badge/-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-545759?style=for-the-badge" alt="简体中文"></a>
</div>

# ✔ [Revelation Music Player](https://github.com/zyk121381/Revelation-Music-Player)
A modern, responsive music player built with React and Tailwind CSS, featuring playlist management, lyrics support, and an immersive UI design.

## ⭐ Features
- **Lyrics Support:** Automatically synchronized lyrics display for an immersive listening experience.
- **Responsive Design:** Cross-platform adaptation providing a smooth user experience on any device size.
- **Immersive UI:** Modern and minimalist design focused on the music playback experience.
- **Audio Spectrum:** Real-time audio spectrum visualization on the desktop version, enhancing visual effects.
- **Playlist Management:** Supports adding, deleting, and sorting songs.
- **Playback Controls:** Includes play, pause, previous, next, and progress bar control.
- **Volume Control:** Supports volume adjustment (default initial volume is 70%).
- **JSON API:** API interface for fetching real-time music data.
## ⚡ Quick Start / 📄 Documentation
### Deployment
**Environment:** Node.js
1. Install dependencies: `npm install`
2. In the `vite.config.ts` file, configure the domain name of the deployed website within the `allowedHosts` field, and modify the port as needed (Note: the port opened when deploying the website on the server must match the port configured in `vite.config.ts`).
3. Run the application: `npm run dev`

### Song Operations
1. Configure song information directly in `constants.ts` by adding song objects in standard JSON format.
   - `"name"`: Song name (string)
   - `"artist"`: Artist (string)
   - `"url"`: URL of the audio file (string)
   - `"cover"`: URL of the cover image (string)
   - `"lrc"`: URL of the lyrics file (string)
2. Access `/list` to get the music details list.