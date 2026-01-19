export const formatTime = (time: number): string => {
  if (!time || isNaN(time)) return '0:00';
  
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export const parseLrc = (lrcString: string) => {
  const lines = lrcString.split('\n');
  const result: { time: number; text: string }[] = [];
  
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
  
  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const fraction = match[3];
      
      // 如果小数部分是 2 位（标准 LRC），则是厘秒（x10 毫秒）。
      // 如果是 3 位，则是毫秒。
      const milliseconds = fraction.length === 2 
        ? parseInt(fraction, 10) * 10 
        : parseInt(fraction, 10);

      const time = minutes * 60 + seconds + milliseconds / 1000;
      const text = line.replace(timeRegex, '').trim();
      
      if (text) {
        result.push({ time, text });
      }
    }
  }
  
  return result;
};