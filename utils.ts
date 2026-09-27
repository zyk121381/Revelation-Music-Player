export interface LyricLine {
  time: number;
  text: string;
  translation?: string;
}

export const formatTime = (time: number): string => {
  if (!time || isNaN(time)) return '0:00';
  
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export const parseLrc = (lrcString: string): LyricLine[] => {
  const lines = lrcString.split('\n');
  const result: LyricLine[] = [];
  
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;
  
  for (const line of lines) {
    const timeMatches = [...line.matchAll(timeRegex)];
    if (timeMatches.length > 0) {
      const rawContent = line.replace(timeRegex, '').trim();
      if (!rawContent) continue;

      let text = rawContent;
      let translation: string | undefined = undefined;

      // 规则：[时间戳]歌词原文 || 歌词译文
      // 不含 || 的歌词则无翻译，含 || 的则存在翻译
      if (rawContent.includes('||')) {
        const parts = rawContent.split('||');
        text = parts[0].trim();
        const transPart = parts.slice(1).join('||').trim();
        translation = transPart || undefined;
      }

      for (const match of timeMatches) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const fraction = match[3];
        
        // 如果小数部分是 2 位（标准 LRC），则是厘秒（x10 毫秒）。
        // 如果是 3 位，则是毫秒。
        const milliseconds = fraction.length === 2 
          ? parseInt(fraction, 10) * 10 
          : parseInt(fraction, 10);

        const time = minutes * 60 + seconds + milliseconds / 1000;
        result.push({ time, text, translation });
      }
    }
  }
  
  return result.sort((a, b) => a.time - b.time);
};
