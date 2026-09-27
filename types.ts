export interface Song {
  name: string;
  artist: string;
  url: string; // 音频文件的 URL
  cover: string; // 封面图片的 URL
  lrc: string; // 歌词文件的 URL
  hide?: string | boolean; // "true" 或 true 为隐藏歌曲
}

export enum PlayMode {
  SEQUENCE = 'SEQUENCE',
  LOOP = 'LOOP',
  SHUFFLE = 'SHUFFLE',
}