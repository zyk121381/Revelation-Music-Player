import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VAULT_SALT = 'Your_Secret_Salt_Value_Here'; // 请替换为你自己的随机盐值，确保安全性

function encodeVault(data) {
  const bytes = Buffer.from(data, 'utf8');
  const saltBytes = Buffer.from(VAULT_SALT, 'utf8');
  const xorBytes = Buffer.alloc(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    xorBytes[i] = bytes[i] ^ saltBytes[i % saltBytes.length];
  }
  return xorBytes.toString('base64');
}

const rawPath = path.resolve(__dirname, '../songs.raw.json');
const constantsPath = path.resolve(__dirname, '../constants.ts');

if (!fs.existsSync(rawPath)) {
  console.error('❌ 未找到 songs.raw.json 文件！请确保该文件存在于项目根目录下。');
  process.exit(1);
}

try {
  const rawContent = fs.readFileSync(rawPath, 'utf8');
  const songs = JSON.parse(rawContent);

  if (!Array.isArray(songs)) {
    throw new Error('songs.raw.json 必须是一个歌曲数组 []！');
  }

  const cipher = encodeVault(JSON.stringify(songs));

  const code = `import { Song } from "./types";
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

export const ENCRYPTED_SONG_VAULT = "${cipher}";

export const SONG_LIST: Song[] = decodeSongVault(ENCRYPTED_SONG_VAULT);
`;

  fs.writeFileSync(constantsPath, code, 'utf8');
  console.log(`\n🎉 同步成功！共 ${songs.length} 首歌曲已自动加密写入 constants.ts！\n`);
} catch (err) {
  console.error('❌ 同步失败，请检查 songs.raw.json 格式是否正确：', err.message);
  process.exit(1);
}
