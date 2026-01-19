import React, { useEffect, useRef } from 'react';

interface LyricLine {
  time: number;
  text: string;
}

interface LyricsViewProps {
  lyrics: LyricLine[];
  currentTime: number;
  onLyricClick?: (time: number) => void;
}

export const LyricsView: React.FC<LyricsViewProps> = ({ lyrics, currentTime, onLyricClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLParagraphElement>(null);

  // 查找当前歌词索引
  const activeIndex = lyrics.findIndex((line, index) => {
    const nextLine = lyrics[index + 1];
    return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
  });

  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      const container = containerRef.current;
      const activeLine = activeLineRef.current;
      
      const containerHeight = container.clientHeight;
      const lineHeight = activeLine.clientHeight;
      const lineOffset = activeLine.offsetTop;
      
      // 计算滚动位置以居中当前行
      const scrollPosition = lineOffset - containerHeight / 2 + lineHeight / 2;
      
      container.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, [activeIndex]);

  if (lyrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        <p>暂无歌词</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-full w-full overflow-y-auto px-2 md:px-4 py-8 text-center scroll-smooth no-scrollbar mask-image-linear-gradient relative"
      style={{
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)'
      }}
    >
      <div className="space-y-6 py-[50%]">
        {lyrics.map((line, index) => {
          const isActive = index === activeIndex;
          return (
            <p
              key={index}
              ref={isActive ? activeLineRef : null}
              onClick={() => onLyricClick && onLyricClick(line.time)}
              className={`
                transition-all duration-500 ease-out cursor-pointer break-words px-4
                ${isActive 
                  ? 'text-green-400 text-xl md:text-2xl font-bold scale-110 drop-shadow-[0_0_10px_rgba(74,222,128,0.3)]' 
                  : 'text-gray-400/60 text-base md:text-lg hover:text-white hover:scale-105'
                }
              `}
            >
              {line.text}
            </p>
          );
        })}
      </div>
    </div>
  );
};