<div align="right">
  <a title="English" href="README_EN.md"><img src="https://img.shields.io/badge/-English-A31F34?style=for-the-badge" alt="English" /></a>
  <a title="简体中文" href="README.md"><img src="https://img.shields.io/badge/-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-545759?style=for-the-badge" alt="简体中文"></a>
</div>

# ✔ [Revelation Music Player](https://github.com/zyk121381/Revelation-Music-Player)

A modern, responsive music player built with React and Tailwind CSS, featuring playlist management, lyrics support, and an immersive UI design.

## ⭐ Features

- **Lyrics Support:** Automatically synchronized lyrics display for an immersive listening experience.
- **Lyrics Translation:** Bilingual lyrics in the form of `original || translation`, with a toggle to show or hide translations.
- **Responsive Design:** Cross-platform adaptation providing a smooth user experience on any device size.
- **Mobile Dual Views:** A vinyl turntable view and an immersive lyrics view, switchable by swiping left or right.
- **Immersive UI:** Modern and minimalist design focused on the music playback experience.
- **Audio Spectrum:** Real-time audio spectrum visualization on the desktop version, enhancing visual effects.
- **Playlist Management:** Supports adding, deleting, playback speed controllingand sorting songs.
- **Hidden Songs:** Songs can be marked as hidden and only appear after unlocking with the administrator password.
- **Encrypted Vault:** All song links are stored salted and obfuscated, so no plaintext URLs are exposed in the source code.
- **Vault Editor:** After a second-level password check, the plaintext song library can be edited online and re-encrypted in one click.
- **Playback Controls:** Includes play, pause, previous, next, and progress bar control.
- **Volume Control:** Supports volume adjustment (default initial volume is 70%).
- **URL Parameter Playback:** Supports playing custom music and built-in music via URL parameters.
- ~**JSON API:** API interface for fetching real-time music data.~ (removed in version 1.0.3)

## ⚡ Quick Start / 📄 Documentation

### Deployment

**Environment:** Node.js

1. Install dependencies: `npm install`
2. In the `vite.config.ts` file, configure the domain name of the deployed website within the `allowedHosts` field, and modify the port as needed (Note: the port opened when deploying the website on the server must match the port configured in `vite.config.ts`).
3. Complete the "Security Configuration" and "Song Operations" sections below as needed.
4. Run the application: `npm run dev`

### Song Operations

The plaintext song library is maintained in `songs.raw.json` at the project root. After editing it, run the sync script to re-encrypt the data and write it into `constants.ts`.
**Do not edit `constants.ts` manually** — the sync script overwrites the whole file.

1. Add song objects in standard JSON format to `songs.raw.json`.

   - `"name"`: Song name (string)
   - `"artist"`: Artist (string)
   - `"url"`: URL of the audio file (string)
   - `"cover"`: URL of the cover image (string)
   - `"lrc"`: URL of the lyrics file (string)
   - `"hide"`: Whether the song is hidden (optional; `true` or `"true"` hides it from the list until an administrator unlocks it)
2. Run the sync command. The script encrypts all songs and overwrites `constants.ts`:

   ```
   npm run sync:songs
   ```

   (Equivalent to `node scripts/syncVault.js`)
3. ~Access `/list` to get the music details list.~ (removed in version 1.0.3)

### Lyrics and Translation Format

The lyrics file (`.lrc`) supports the following formats, which are parsed and sorted automatically:

- Without translation: `[00:12.50]lyric text`
- With translation: `[00:12.50]original text || translated text` (two vertical bars `||` separate the two parts)
- Multiple timestamps on one line: `[00:12.50][01:20.00]lyric text` (the line is duplicated at every timestamp)

The translation toggle only appears when the current song actually contains translations.

### Security Configuration (Required Before Deployment)

The values shipped in this repository are **placeholders**. Replace them with your own before going live, otherwise the encrypted vault and the admin features will not work.

1. **Encryption salt**

   Change `VAULT_SALT` in `songVault.ts`, and change `VAULT_SALT` in `scripts/syncVault.js` to the **exact same value**.
   If the two values differ, the client cannot decode the cipher and the playlist will be empty.
   After changing the salt, run `npm run sync:songs` again to regenerate the cipher.

   Generate a random salt (then paste it into both files):

   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Administrator password hashes**

   Replace the two hashes in `security.ts` (only irreversible hashes are stored, never plaintext passwords):

   - `LEVEL_1_PASSWORD_HASH`: level 1 password, used to **reveal hidden songs** in the playlist
   - `LEVEL_2_PASSWORD_HASH`: level 2 password, used to enter the **vault plaintext editor**

   Both 64-character SHA-256 and 32-character MD5 hashes are supported (detected by length). Generate a SHA-256 hash:

   ```
   node -e "console.log(require('crypto').createHash('sha256').update('your-password').digest('hex'))"
   ```

3. **Never commit the plaintext library**

   `songs.raw.json` contains every audio and lyrics direct link. Add it to `.gitignore` and commit only placeholder data, otherwise the vault encryption serves no purpose.

### Administrator Features

#### 1. Revealing Hidden Songs

1. Open the playlist and click "显示隐藏" / "Show Hidden" in the top-right corner
2. Enter the **level 1 administrator password**. Verified hidden tracks appear in the list with a "隐藏" / "Hidden" badge and take part in sequential and shuffle playback
3. The button then becomes "已解锁" / "Unlocked"; click it to lock again and hide the private songs
4. The unlocked state is **never cached locally**, so refreshing the page restores the locked state

#### 2. Vault Plaintext Editor

1. Unlock with the **level 1 password** first; a "曲库助手" / "Vault Editor" button then appears in the playlist header
2. Click it and enter the **level 2 administrator password** (the editor exposes every direct link, so it must be verified on each open)
3. Edit the plaintext JSON directly. Available actions:

   - Format / align the JSON
   - Copy the plaintext JSON (paste it into `songs.raw.json`)
   - Download it as `songs.raw.json` into the project root
   - Generate the encrypted cipher and copy it in one click (paste it back into `constants.ts`)
   - Lock and exit, restoring the level 2 protection
4. Two ways to apply your changes, pick either one:

   - **Replace the cipher directly (fastest):** edit the plaintext in the editor → click "一键生成加密密文并复制" (generate and copy the cipher) → replace the whole value of `ENCRYPTED_SONG_VAULT` in `constants.ts` with the copied cipher, i.e. `export const ENCRYPTED_SONG_VAULT = "paste-the-new-cipher-here";`
   - **Sync locally:** edit the plaintext in the editor → click "下载 raw.json" (download raw.json) or "复制明文 JSON" (copy plaintext JSON) and overwrite `songs.raw.json` at the project root → run `npm run sync:songs` locally

   **Note:** the editor encrypts using the salt in `songVault.ts`, while the local script uses the salt in `scripts/syncVault.js`. The two methods are interchangeable only when both salts are identical.

### Toggling Lyrics Translation

- Desktop: the floating "译 OFF / 译 ON" button at the bottom-right of the lyrics area
- Mobile: the "译 OFF / 译 ON" button in the toolbar at the bottom of the turntable view
- Translations are **off** by default for every song and are reset to off whenever the song changes

### URL Parameter Playback

#### 1. Play Custom Music

Play custom music by adding parameters to the URL. The player will automatically add the song to the top of the playlist and enable single-loop mode by default.

**Supported Parameters:**

- `name`: Song name (required)
- `audio`: Direct URL of the audio file (required)
- `artist`: Artist name (optional, defaults to "Unknown Artist")
- `cover`: URL of the cover image (optional, defaults to random placeholder)
- `lrc`: URL of the lyrics file (optional)

**Example URL:**

```
https://your-project-address/?name=SongName&artist=ArtistName&audio=SongUrl&cover=CoverUrl&lrc=LrcUrl
```

#### 2. Play Specific Built-in Music

Play songs configured in the vault (`songs.raw.json` / `constants.ts`) directly using the `player` parameter.

**Usage:**

```
https://your-project-address/?player=SongName
```

The player will automatically:

- Find the song in the built-in music list
- Move the song to the top of the playlist and set it as the current song
- Set the playback mode to single-loop

**Note:**

- If the provided `player` name does not exist in the list, the player will load the first song in the default order.
- Songs marked as hidden (`hide`) cannot be played through the `player` parameter while locked.

**Important:** Due to browser restrictions, neither parameter method will auto-play. A popup reminder will be displayed, requiring users to manually click the play button to start playback.
