import { Song } from "./types";
import { decodeSongVault } from "./songVault";

// =========================================================================
// 🔐 加密音乐曲库 (Song Vault)
// 
// 本文件中的所有公开与隐藏歌曲均经过加盐混淆加密，避免在代码中暴露明文
// 音频直链（.mp3）、歌词直链（.lrc）和歌名。
// 
// 💡 如何修改歌曲：
// 1. 直接在项目根目录修改明文文件: songs.raw.json
// 2. 运行命令一键同步加密: npm run sync:songs (或 node scripts/syncVault.js)
// =========================================================================

export const ENCRYPTED_SONG_VAULT = "AhRXHD4+AEFIRycwPQZdUyx2Lw0YAH1kRxMXLQYGBn1pRzAdCxNudBJMNS0iCB8BR3NqEAAJe1VXITA9AlJVFlQKAS1OWH01DhoQF31yRyEKNwhEVSxzJgwEAAZ9f0MABjx0W04mCjEvVFUWeSMnMX8GNy9QGFgkcQ8NGTp0W04mCjEvV1UWeSEUHzpxSUETFwA2IBVOTn0FDgISV3g7RTMXLQYGBn1/RxYACVZlcTIDGjhkRh9VMA0ER15HOgADFy1xX0EhCho4YUYfVBw5FwkHR3NqCQAGe1VXITA9AlFVFlQTASJMIQ0aQxEo";

export const SONG_LIST: Song[] = decodeSongVault(ENCRYPTED_SONG_VAULT);
