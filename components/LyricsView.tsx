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
    // 仅在桌面视图（ref 存在且可见）时进行滚动处理
    if (activeLineRef.current && containerRef.current && containerRef.current.offsetParent !== null) {
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

  const prevLyric = lyrics[activeIndex - 1];
  const currentLyric = lyrics[activeIndex];
  const nextLyric = lyrics[activeIndex + 1];

  return (
    <>
      {/* 移动端视图：使用绝对定位模拟滚动切换效果 */}
      <div className="md:hidden relative h-24 mt-1 px-1 overflow-hidden pointer-events-none">
         
         {/* 上一句（执行上浮淡出动画） */}
         {prevLyric && (
             <div key={prevLyric.time + '_prev'} className="absolute top-0 left-0 w-full animate-lyric-out origin-left">
                <p className="text-green-400 text-base font-bold leading-relaxed truncate opacity-0">
                    {prevLyric.text}
                </p>
             </div>
         )}

         {/* 当前句（从下方上浮，变色变大） */}
         {currentLyric ? (
             <div key={currentLyric.time + '_curr'} className="absolute top-0 left-0 w-full animate-lyric-current origin-left z-10">
                 <p className="text-green-400 text-base font-bold leading-relaxed drop-shadow-md break-words line-clamp-2">
                     {currentLyric.text}
                 </p>
             </div>
         ) : (
             <p className="text-gray-500/50 text-base mt-2">...</p>
         )}
         
         {/* 下一句（从下方淡入，灰色小字） */}
         {nextLyric && (
              <div key={nextLyric.time + '_next'} className="absolute top-12 left-0 w-full animate-lyric-next origin-left">
                 <p className="text-gray-400 text-xs font-medium leading-relaxed truncate opacity-70">
                     {nextLyric.text}
                 </p>
             </div>
         )}
      </div>

      {/* 桌面端视图：滚动列表 */}
      <div 
        ref={containerRef}
        className="hidden md:block h-full w-full overflow-y-auto px-4 py-8 text-center scroll-smooth no-scrollbar mask-image-linear-gradient relative"
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
                    ? 'text-green-400 text-2xl font-bold scale-110 drop-shadow-[0_0_10px_rgba(74,222,128,0.3)]' 
                    : 'text-gray-400/60 text-lg hover:text-white hover:scale-105'
                  }
                `}
              >
                {line.text}
              </p>
            );
          })}
        </div>
      </div>
    </>
  );
};
