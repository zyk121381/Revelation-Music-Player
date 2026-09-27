import React, { useRef, useEffect, useState } from 'react';
import { Song } from '../types';
import { BarChart3, X, Music, Lock, Unlock, EyeOff, FileEdit } from 'lucide-react';

interface SongListProps {
  songs: Song[];
  currentSongIndex: number;
  isPlaying: boolean;
  onSelectSong: (index: number) => void;
  onClose?: () => void;
  isUnlocked?: boolean;
  onOpenUnlockModal?: () => void;
  onToggleLock?: () => void;
  hiddenCount?: number;
  onOpenVaultEditor?: () => void;
}

// 针对大量大图优化的懒加载封面组件
const LazyCover: React.FC<{
  src: string;
  alt: string;
  isActive: boolean;
  isPlaying: boolean;
}> = ({ src, alt, isActive, isPlaying }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '150px 0px', // 提前 150px 预加载，避免滚动露白
        threshold: 0.01,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [src]);

  return (
    <div
      ref={containerRef}
      className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-gray-800 flex items-center justify-center border border-white/5"
    >
      {isVisible && !hasError && (
        <img
          src={src}
          alt={alt}
          decoding="async"
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? (isActive ? 'opacity-50' : 'opacity-100') : 'opacity-0'
          }`}
          draggable={false}
        />
      )}

      {/* 未进入视口、未加载完或加载失败时的轻量暗色占位符 */}
      {(!isVisible || !isLoaded || hasError) && (
        <div className="absolute inset-0 bg-white/5 flex items-center justify-center text-gray-500">
          <Music size={16} className="opacity-40" />
        </div>
      )}

      {/* 激活歌曲播放指示 */}
      {isActive && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          {isPlaying ? (
            <BarChart3 size={16} className="animate-pulse text-green-400 drop-shadow" />
          ) : (
            <div className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
          )}
        </div>
      )}
    </div>
  );
};

export const SongList: React.FC<SongListProps> = ({ 
  songs, 
  currentSongIndex, 
  isPlaying, 
  onSelectSong, 
  onClose,
  isUnlocked,
  onOpenUnlockModal,
  onToggleLock,
  hiddenCount,
  onOpenVaultEditor
}) => {
  const activeItemRef = useRef<HTMLLIElement>(null);

  // 延迟自动滚动到当前播放的歌曲，避免抽屉滑入动画与布局重绘竞争掉帧
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeItemRef.current) {
        activeItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [currentSongIndex]);

  return (
    <div className="flex flex-col h-full bg-gray-900/95 backdrop-blur-xl">
      <div className="p-4 border-b border-white/10 sticky top-0 bg-gray-900/95 z-10 flex items-center justify-between gap-3">
        {/* 左侧：标题与歌曲统计信息 */}
        <div className="flex-1 min-w-0 pr-1">
          <h2 className="text-base sm:text-lg font-bold text-white leading-tight">当前播放列表</h2>
          <div className="text-xs mt-1 space-y-0.5">
            <span className="text-gray-400">{songs.length} 首歌曲</span>
            {hiddenCount !== undefined && hiddenCount > 0 && (
              <div className={`truncate text-[10px] ${isUnlocked ? "text-amber-400/90 font-medium" : "text-gray-400/80"}`}>
                {isUnlocked ? `(含 ${hiddenCount} 首隐藏歌曲)` : `(另含 ${hiddenCount} 首隐藏歌曲)`}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：操作区（解锁/锁定按钮在叉号左边并垂直居中） */}
        <div className="flex items-center gap-2 shrink-0">
          {isUnlocked && onOpenVaultEditor && (
            <button
              onClick={onOpenVaultEditor}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-white/10 text-gray-300 hover:text-white hover:bg-white/15 active:scale-95 transition-all shadow-sm"
              title="打开曲库明文维护与加密助手"
            >
              <FileEdit size={12} className="text-gray-400" />
              <span className="hidden sm:inline">曲库助手</span>
            </button>
          )}

          {onOpenUnlockModal && (
            isUnlocked ? (
              <button
                onClick={onToggleLock}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-500/15 text-green-300 border border-green-500/30 hover:bg-green-500/25 active:scale-95 transition-all shadow-sm"
                title="点击重新锁定并隐藏私密歌曲"
              >
                <Unlock size={13} className="text-green-400" />
                <span>已解锁</span>
              </button>
            ) : (
              <button
                onClick={onOpenUnlockModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 text-gray-300 hover:text-white border border-white/10 hover:bg-white/15 active:scale-95 transition-all shadow-sm"
                title="输入管理员密码显示隐藏歌曲"
              >
                <Lock size={13} className="text-gray-400" />
                <span>显示隐藏</span>
              </button>
            )
          )}

          {onClose && (
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
              title="关闭"
            >
              <X size={22} />
            </button>
          )}
        </div>
      </div>

      <ul className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {songs.map((song, index) => {
          const isActive = index === currentSongIndex;
          const isHidden = song.hide === 'true' || song.hide === true;
          return (
            <li
              key={`${song.name}-${index}`}
              ref={isActive ? activeItemRef : null}
              onClick={() => onSelectSong(index)}
              style={{ contentVisibility: 'auto', containIntrinsicSize: '0 56px' }}
              className={`
                group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
                ${isActive ? 'bg-white/10 text-white shadow-lg shadow-black/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}
              `}
            >
              <LazyCover
                src={song.cover}
                alt={song.name}
                isActive={isActive}
                isPlaying={isPlaying}
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <h3 className={`text-sm font-medium truncate ${isActive ? 'text-green-400' : ''}`}>
                    {song.name}
                  </h3>
                  {isHidden && (
                    <span 
                      className="px-1.5 py-0.2 text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded flex items-center gap-0.5 shrink-0"
                      title="此为管理员隐藏歌曲"
                    >
                      <EyeOff size={10} />
                      隐藏
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate group-hover:text-gray-400">
                  {song.artist}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};