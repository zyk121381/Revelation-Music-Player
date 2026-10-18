import React, { useEffect, useRef } from 'react';
import { LyricLine } from '../utils';
import { TranslateBadgeIcon } from './TranslateIcon';

interface LyricsViewProps {
  lyrics: LyricLine[];
  currentTime: number;
  onLyricClick?: (time: number) => void;
  showTranslation?: boolean;
  onToggleTranslation?: () => void;
  hasTranslation?: boolean;
  themeColor?: string;
  accentColor?: string;
  glowColor?: string;
  buttonBg?: string;
  buttonBorder?: string;
}

export const LyricsView: React.FC<LyricsViewProps> = ({ 
  lyrics, 
  currentTime, 
  onLyricClick,
  showTranslation = true,
  onToggleTranslation,
  hasTranslation = false,
  themeColor = '#4ade80',
  accentColor = '#86efac',
  glowColor = 'rgba(74, 222, 128, 0.45)',
  buttonBg,
  buttonBorder
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  // 查找当前歌词索引
  const activeIndex = lyrics.findIndex((line, index) => {
    const nextLine = lyrics[index + 1];
    return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
  });

  useEffect(() => {
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
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        <p>暂无歌词</p>
      </div>
    );
  }

  const activeBtnBg = buttonBg || 'rgba(255, 255, 255, 0.15)';
  const activeBtnBorder = buttonBorder || 'rgba(255, 255, 255, 0.35)';

  return (
    <div className="relative h-full w-full">
      {/* 歌词区右下角独立悬浮翻译按钮 (置于控制栏外部，支持桌面端与移动端，随封面自适应色彩) */}
      {hasTranslation && onToggleTranslation && (
        <div className="absolute bottom-3 right-3 md:bottom-5 md:right-5 z-30 pointer-events-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleTranslation();
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border transition-all active:scale-95 ${
              showTranslation 
                ? 'shadow-md' 
                : 'bg-black/60 text-gray-400 border-white/15 hover:text-white hover:bg-black/80 hover:border-white/30'
            }`}
            style={showTranslation ? {
              backgroundColor: activeBtnBg,
              color: accentColor,
              borderColor: activeBtnBorder,
              boxShadow: `0 0 12px ${glowColor}`
            } : undefined}
            title={showTranslation ? "点击关闭歌词翻译" : "点击开启歌词翻译"}
          >
            <TranslateBadgeIcon active={showTranslation} size={15} />
            <span>{showTranslation ? '译 ON' : '译 OFF'}</span>
          </button>
        </div>
      )}

      <div 
        ref={containerRef}
        className="h-full w-full overflow-y-auto px-6 md:px-6 py-4 text-left md:text-center scroll-smooth no-scrollbar relative"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)'
        }}
      >
        <div className="space-y-6 md:space-y-7 py-[36vh]">
          {lyrics.map((line, index) => {
            const isActive = index === activeIndex;
            return (
              <div
                key={index}
                ref={isActive ? activeLineRef : null}
                onClick={() => onLyricClick && onLyricClick(line.time)}
                className={`
                  transition-all duration-300 ease-out cursor-pointer break-words px-1 md:px-3 text-left md:text-center origin-left md:origin-center
                  ${isActive 
                    ? 'scale-105 md:scale-110' 
                    : 'hover:scale-102'
                  }
                `}
                style={isActive ? {
                  filter: `drop-shadow(0 0 14px ${glowColor})`
                } : undefined}
              >
                {/* 歌词原文 - 随专辑封面自适应色彩 */}
                <p 
                  className={`
                    transition-all duration-300
                    ${isActive 
                      ? 'text-xl md:text-2xl font-bold' 
                      : 'text-gray-400/50 text-base md:text-lg hover:text-white/80'
                    }
                  `}
                  style={isActive ? {
                    color: themeColor,
                    textShadow: `0 0 16px ${glowColor}`
                  } : undefined}
                >
                  {line.text}
                </p>

                {/* 歌词译文 - 随专辑高光色自适应 */}
                {showTranslation && line.translation && (
                  <p 
                    className={`
                      mt-1.5 text-xs sm:text-sm md:text-base font-normal tracking-wide transition-all duration-300
                      ${isActive 
                        ? 'drop-shadow-sm font-medium' 
                        : 'text-gray-400/40 hover:text-gray-300/60'
                      }
                    `}
                    style={isActive ? {
                      color: accentColor,
                      opacity: 0.92
                    } : undefined}
                  >
                    {line.translation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
