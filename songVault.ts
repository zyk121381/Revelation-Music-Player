import { Song } from './types';

// =========================================================================
// 🔐 音乐保险库混淆与解码引擎 (Song Vault Obfuscation Engine)
// 
// 作用：
// 1. 将 constants.ts 中的全部歌曲列表（包括公开与隐藏歌曲）进行可逆异或混淆；
// 2. 源码中彻底清除所有 mp3 / lrc / cover 直链与歌名明文，免疫爬虫与代码搜索；
// 3. 页面加载时由客户端在内存中毫秒级解码还原；
// 4. 提供 window.encryptSongVault 助手，方便未来增删曲目时一键生成混淆密文。
// =========================================================================

const VAULT_SALT = 'Your_Secret_Salt_Value_Here'; // 请替换为你自己的随机盐值，确保安全性

/**
 * 将明文字符串通过加盐动态异或转换为 Base64 密文
 */
export function encodeVault(data: string): string {
  try {
    const bytes = new TextEncoder().encode(data);
    const saltBytes = new TextEncoder().encode(VAULT_SALT);
    const xorBytes = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      xorBytes[i] = bytes[i] ^ saltBytes[i % saltBytes.length];
    }
    let binary = '';
    for (let i = 0; i < xorBytes.length; i++) {
      binary += String.fromCharCode(xorBytes[i]);
    }
    return btoa(binary);
  } catch (err) {
    console.error('encodeVault error', err);
    return '';
  }
}

/**
 * 将 Base64 密文解码还原为明文字符串
 */
export function decodeVault(cipher: string): string {
  try {
    const binary = atob(cipher);
    const xorBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      xorBytes[i] = binary.charCodeAt(i);
    }
    const saltBytes = new TextEncoder().encode(VAULT_SALT);
    const bytes = new Uint8Array(xorBytes.length);
    for (let i = 0; i < xorBytes.length; i++) {
      bytes[i] = xorBytes[i] ^ saltBytes[i % saltBytes.length];
    }
    return new TextDecoder().decode(bytes);
  } catch (err) {
    console.error('decodeVault error', err);
    return '';
  }
}

/**
 * 解码歌曲列表：
 * - 如果输入的是已加密的 Base64 字符串，则在内存中解密为 Song[]
 * - 如果输入本身已经是 Song[] 数组（方便本地调试未加密新歌），则直接返回
 */
export function decodeSongVault(input: string | Song[]): Song[] {
  if (Array.isArray(input)) {
    return input;
  }
  if (!input || typeof input !== 'string') {
    return [];
  }
  try {
    const jsonStr = decodeVault(input.trim());
    const list = JSON.parse(jsonStr);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error('Failed to parse song vault payload', err);
    return [];
  }
}

/**
 * 方便开发者将普通的 Song[] 转换为 constants.ts 中的密文字符串
 */
export function encodeSongVault(songs: Song[]): string {
  return encodeVault(JSON.stringify(songs));
}

// 在浏览器 window 上挂载辅助工具函数，按 F12 在控制台即可随时调用
if (typeof window !== 'undefined') {
  (window as any).encryptSongVault = (songs: Song[]) => {
    const cipher = encodeSongVault(songs);
    console.log('%c[Song Vault] 加密成功！请复制下方密文字符串到 constants.ts 中：', 'color: #4ade80; font-weight: bold;');
    console.log(cipher);
    return cipher;
  };
  (window as any).decryptSongVault = (cipher: string) => {
    const songs = decodeSongVault(cipher);
    console.log('%c[Song Vault] 解码成功：', 'color: #4ade80; font-weight: bold;', songs);
    return songs;
  };
}
